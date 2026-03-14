import express from "express";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import Docker from "dockerode";
import { WebSocketServer } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Docker client for monitoring containers
let docker;
try {
  docker = new Docker();
} catch (err) {
  console.warn("Docker not available - monitoring disabled");
}

// Enable CORS for dashboard UI
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ============ TEST DASHBOARD UTILITIES ============

/**
 * Get list of available test specs
 */
async function getAvailableSpecs() {
  try {
    const testsDir = path.join(__dirname, "tests");
    const files = await fs.readdir(testsDir);
    return files
      .filter((f) => f.endsWith(".spec.ts"))
      .map((f) => ({ name: f, path: `tests/${f}`, id: f.replace(".spec.ts", "") }));
  } catch (err) {
    console.error("Error reading test specs:", err);
    return [];
  }
}

/**
 * Execute Playwright test and capture results
 */
async function runPlaywrightTest(specPath, envVars = {}) {
  return new Promise((resolve) => {
    const timestamp = new Date().toISOString().split("T")[0];
    const timeOnly = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
    const runId = `${path.basename(specPath, ".spec.ts")}-${timestamp}-${timeOnly}`;

    console.log(`[DASHBOARD] Starting test run: ${runId}`);
    console.log(`[DASHBOARD] Environment: ${JSON.stringify(envVars)}`);

    // Use npm run test with spec path argument and tsx for TypeScript resolution
    const playwrightProcess = spawn("npm", [
      "run",
      "test",
      "--",
      specPath,
    ], {
      env: {
        ...process.env,
        ...envVars,
        HEADLESS: envVars.HEADLESS ?? "true",
        NODE_OPTIONS: "--import tsx/esm",
      }
    });

    let stdout = "";
    let stderr = "";

    playwrightProcess.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    playwrightProcess.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    playwrightProcess.on("close", (code) => {
      if (stderr) {
        console.error(`[DASHBOARD] Test stderr:\n${stderr}`);
      }
      const result = {
        runId,
        specPath,
        spec: path.basename(specPath, ".spec.ts"),
        status: code === 0 ? "passed" : "failed",
        exitCode: code,
        timestamp: new Date().toISOString(),
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
        error: stderr || undefined,
      };
      console.log(`[DASHBOARD] Test run completed: ${JSON.stringify(result)}`);
      resolve(result);
    });
  });
}

/**
 * Read test results from pw-report-json/results.json
 */
async function readTestResults(limit = 100) {
  try {
    const resultsFile = path.join(__dirname, "pw-report-json", "results.json");
    const content = await fs.readFile(resultsFile, "utf-8");
    const data = JSON.parse(content);

    if (!data.suites) return [];

    const results = [];

    function collectTests(suite, parentTitle = "") {
      const suiteName = parentTitle ? `${parentTitle} > ${suite.title}` : suite.title;

      // Playwright JSON format: specs are test groups
      if (suite.specs && Array.isArray(suite.specs)) {
        for (const spec of suite.specs) {
          results.push({
            id: `${suiteName}-${spec.title}`,
            suite: suiteName,
            title: spec.title,
            status: spec.tests?.[0]?.status === "expected" ? "passed" : "failed",
            duration: spec.tests?.[0]?.results?.[0]?.duration || 0,
            error: spec.tests?.[0]?.results?.[0]?.error?.message || null,
          });
        }
      }

      // Recursively check nested suites
      if (suite.suites && Array.isArray(suite.suites)) {
        for (const nestedSuite of suite.suites) {
          collectTests(nestedSuite, suiteName);
        }
      }
    }

    for (const suite of data.suites) {
      collectTests(suite);
    }

    return results.slice(0, limit);
  } catch (err) {
    console.warn("Could not read test results (file may not exist yet):", err.message);
    return [];
  }
}

/**
 * Get HTML report content
 */
async function getHtmlReport() {
  try {
    const reportFile = path.join(__dirname, "pw-report-html", "index.html");
    const content = await fs.readFile(reportFile, "utf-8");
    return content;
  } catch (err) {
    console.warn("Could not read HTML report:", err.message);
    return null;
  }
}

/**
 * Get test run history from test-results folder
 */
async function getTestRunHistory() {
  try {
    const resultsDir = path.join(__dirname, "test-results");
    const folders = await fs.readdir(resultsDir);

    const history = [];
    for (const folder of folders) {
      try {
        const folderPath = path.join(resultsDir, folder);
        const stats = await fs.stat(folderPath);
        if (stats.isDirectory()) {
          history.push({
            id: folder,
            timestamp: stats.mtime,
            name: folder,
          });
        }
      } catch (e) {
        // skip files or inaccessible folders
      }
    }

    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  } catch (err) {
    console.warn("Could not read test history:", err.message);
    return [];
  }
}

/**
 * Delete test results folder
 */
async function deleteTestRun(runId) {
  try {
    const resultsDir = path.join(__dirname, "test-results");
    const runPath = path.join(resultsDir, runId);
    await fs.rm(runPath, { recursive: true, force: true });
    return true;
  } catch (err) {
    console.error("Error deleting test run:", err);
    return false;
  }
}

// ============ API ENDPOINTS ============

/**
 * GET /api/dashboard/specs - List available test specs
 */
app.get("/api/dashboard/specs", async (req, res) => {
  const specs = await getAvailableSpecs();
  res.json({ specs });
});

/**
 * POST /api/dashboard/run - Trigger a test run
 * Body: { specPath, env: { ENVIRONMENT: "prod", HEADLESS: "false", ... } }
 */
app.post("/api/dashboard/run", async (req, res) => {
  const { specPath, env: envVars } = req.body;

  if (!specPath || typeof specPath !== "string") {
    return res.status(400).json({ error: "Invalid specPath" });
  }

  // Validate spec exists
  const specs = await getAvailableSpecs();
  if (!specs.some((s) => s.path === specPath)) {
    return res.status(400).json({ error: "Spec not found" });
  }

  try {
    const result = await runPlaywrightTest(specPath, envVars);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/results - Get latest test results
 */
app.get("/api/dashboard/results", async (req, res) => {
  const results = await readTestResults(100);
  console.log(`[DASHBOARD] Results endpoint called: ${results.length} results found`);
  res.json({ results });
});

/**
 * GET /api/dashboard/report - Get HTML report
 */
app.get("/api/dashboard/report", async (req, res) => {
  const html = await getHtmlReport();
  if (!html) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

/**
 * GET /api/dashboard/history - Get test run history
 */
app.get("/api/dashboard/history", async (req, res) => {
  const history = await getTestRunHistory();
  res.json({ history });
});

/**
 * DELETE /api/dashboard/history/:runId - Delete a test run
 */
app.delete("/api/dashboard/history/:runId", async (req, res) => {
  const { runId } = req.params;
  const success = await deleteTestRun(runId);
  res.json({ success });
});

/**
 * GET /api/dashboard/docker/status - Docker container status
 */
app.get("/api/dashboard/docker/status", async (req, res) => {
  if (!docker) {
    return res.json({ available: false, containers: [] });
  }

  try {
    const containers = await docker.listContainers({ all: true });
    const status = containers.map((c) => ({
      id: c.Id.substring(0, 12),
      name: c.Names[0]?.replace("/", ""),
      state: c.State,
      status: c.Status,
      image: c.Image,
      ports: c.Ports.map((p) => `${p.PrivatePort}:${p.PublicPort || ""}`),
    }));
    res.json({ available: true, containers: status });
  } catch (err) {
    console.error("Docker error:", err.message);
    res.json({ available: false, error: err.message, containers: [] });
  }
});

/**
 * GET /api/dashboard/docker/logs/:container - Container logs (stream)
 */
app.get("/api/dashboard/docker/logs/:container", async (req, res) => {
  if (!docker) {
    return res.status(404).json({ error: "Docker not available" });
  }

  try {
    const container = docker.getContainer(req.params.container);
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: false,
      tail: 100,
    });

    res.setHeader("Content-Type", "text/plain");
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/k8s/pods - K8s pod status (if kubectl available)
 */
app.get("/api/dashboard/k8s/pods", async (req, res) => {
  try {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("kubectl get pods -o json 2>/dev/null", {
        encoding: "utf-8",
      });
      const data = JSON.parse(output);
      const pods = (data.items || []).map((pod) => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        phase: pod.status.phase,
        containers: pod.spec.containers.length,
        image: pod.spec.containers[0]?.image || "unknown",
        createdAt: pod.metadata.creationTimestamp,
      }));
      res.json({ available: true, pods });
    } catch (err) {
      res.json({ available: false, error: "kubectl not available", pods: [] });
    }
  } catch (err) {
    res.json({ available: false, error: err.message, pods: [] });
  }
});

/**
 * GET /api/dashboard/k8s/jobs - K8s job status
 */
app.get("/api/dashboard/k8s/jobs", async (req, res) => {
  try {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("kubectl get jobs -o json 2>/dev/null", {
        encoding: "utf-8",
      });
      const data = JSON.parse(output);
      const jobs = (data.items || []).map((job) => ({
        name: job.metadata.name,
        namespace: job.metadata.namespace,
        completions: job.spec.completions,
        succeeded: job.status.succeeded || 0,
        failed: job.status.failed || 0,
        active: job.status.active || 0,
        createdAt: job.metadata.creationTimestamp,
      }));
      res.json({ available: true, jobs });
    } catch (err) {
      res.json({ available: false, error: "kubectl not available", jobs: [] });
    }
  } catch (err) {
    res.json({ available: false, error: err.message, jobs: [] });
  }
});

/**
 * GET /api/dashboard/health - Health check
 */
app.get("/api/dashboard/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============ WEBSOCKET STREAMING ============

let wss;
const clients = new Set();

function broadcastStatusUpdate() {
  const message = JSON.stringify({
    type: "status",
    timestamp: new Date().toISOString(),
  });
  clients.forEach((client) => {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(message);
    }
  });
}

async function streamContainerUpdates(interval = 3000) {
  setInterval(async () => {
    if (clients.size === 0) return;

    try {
      if (!docker) return;
      const containers = await docker.listContainers({ all: true });
      const status = containers.map((c) => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0]?.replace("/", ""),
        state: c.State,
        status: c.Status,
        image: c.Image,
        ports: c.Ports.map((p) => `${p.PrivatePort}:${p.PublicPort || ""}`),
      }));

      const message = JSON.stringify({
        type: "containers",
        containers: status,
        timestamp: new Date().toISOString(),
      });

      clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(message);
        }
      });
    } catch (err) {
      console.error("WebSocket container streaming error:", err.message);
    }
  }, interval);
}

async function streamK8sUpdates(interval = 3000) {
  setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const { execSync } = await import("child_process");
      try {
        const podsOutput = execSync("kubectl get pods -o json 2>/dev/null", {
          encoding: "utf-8",
        });
        const jobsOutput = execSync("kubectl get jobs -o json 2>/dev/null", {
          encoding: "utf-8",
        });

        const podData = JSON.parse(podsOutput);
        const jobData = JSON.parse(jobsOutput);

        const pods = (podData.items || []).map((pod) => ({
          name: pod.metadata.name,
          namespace: pod.metadata.namespace,
          phase: pod.status.phase,
          containers: pod.spec.containers.length,
          image: pod.spec.containers[0]?.image || "unknown",
          createdAt: pod.metadata.creationTimestamp,
        }));

        const jobs = (jobData.items || []).map((job) => ({
          name: job.metadata.name,
          namespace: job.metadata.namespace,
          completions: job.spec.completions,
          succeeded: job.status.succeeded || 0,
          failed: job.status.failed || 0,
          active: job.status.active || 0,
          createdAt: job.metadata.creationTimestamp,
        }));

        const message = JSON.stringify({
          type: "k8s",
          pods,
          jobs,
          timestamp: new Date().toISOString(),
        });

        clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(message);
          }
        });
      } catch (err) {
        // kubectl not available
      }
    } catch (err) {
      console.error("WebSocket K8s streaming error:", err.message);
    }
  }, interval);
}

async function streamResultsUpdates(interval = 5000) {
  setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const results = await readTestResults(100);
      const history = await getTestRunHistory();

      const message = JSON.stringify({
        type: "results",
        results,
        history,
        timestamp: new Date().toISOString(),
      });

      clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(message);
        }
      });
    } catch (err) {
      console.error("WebSocket results streaming error:", err.message);
    }
  }, interval);
}

let server;
let httpServer;

export async function start(port = 4000) {
  return new Promise((resolve) => {
    httpServer = createServer(app);

    wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws) => {
      clients.add(ws);
      console.log(`[WS] Client connected (${clients.size} total)`);

      // Send initial status
      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Dashboard API connected",
          timestamp: new Date().toISOString(),
        })
      );

      ws.on("close", () => {
        clients.delete(ws);
        console.log(`[WS] Client disconnected (${clients.size} total)`);
      });

      ws.on("error", (err) => {
        console.error("[WS] Error:", err.message);
      });
    });

    // Start streaming
    streamContainerUpdates(3000);
    streamK8sUpdates(3000);
    streamResultsUpdates(5000);

    server = httpServer.listen(port, () => {
      console.log(`🧪 Test Dashboard API listening on http://localhost:${port}`);
      console.log(`   - Specs: GET /api/dashboard/specs`);
      console.log(`   - Run test: POST /api/dashboard/run`);
      console.log(`   - Results: GET /api/dashboard/results`);
      console.log(`   - History: GET /api/dashboard/history`);
      console.log(`   - Report: GET /api/dashboard/report`);
      console.log(`   - WebSocket: ws://localhost:${port}/api/dashboard/stream`);
      resolve(server);
    });
  });
}

export async function stop() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

if (process.env.NODE_ENV !== "test") {
  const port = process.env.DASHBOARD_PORT || 4000;
  start(port);
}

export default app;
