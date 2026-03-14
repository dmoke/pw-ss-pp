import express from "express";
import { spawn, execSync } from "child_process";
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

// ============ RUN QUEUE ============
const runQueue = new Map(); // runId → { runId, spec, specPath, status, stdout, stderr, exitCode, startedAt, completedAt, envVars, k8sJobName?, podPhase?, podName? }
let k8sAvailable = false;

function checkK8sAvailable() {
  try {
    execSync("kubectl version --client", { encoding: "utf-8", stdio: "pipe" });
    k8sAvailable = true;
    console.log("[DASHBOARD] Kubernetes available");
  } catch (err) {
    k8sAvailable = false;
  }
}

checkK8sAvailable();

function generateJobYaml(runId, specPath, envVars = {}) {
  const spec = path.basename(specPath, ".spec.ts");
  const jobName = `pw-${spec}-${runId.split("-").pop()}`
    .toLowerCase()
    .slice(0, 63);

  // Build env vars section for the Job
  const envLines = Object.entries(envVars)
    .filter(([k]) => k !== "NODE_OPTIONS") // Skip NODE_OPTIONS, add it separately
    .map(([k, v]) => `        - name: ${k}\n          value: "${v}"`)
    .join("\n");

  return `apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  labels:
    test-suite: ${spec}
spec:
  template:
    metadata:
      labels:
        job-name: ${jobName}
    spec:
      containers:
      - name: playwright
        image: pw-ss-pp:latest
        command: ["npm", "run", "test", "--", "${specPath}"]
        env:
${envLines}
        - name: HEADLESS
          value: "true"
        - name: NODE_OPTIONS
          value: "--import tsx/esm"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc`;
}

// ============ TEST DASHBOARD UTILITIES ============

async function getAvailableSpecs() {
  try {
    // __dirname = /app in Docker, or path/to/dashboard locally
    // Check both /app/tests (Docker) and __dirname/../tests (local)
    let testsDir = path.join(__dirname, "tests");
    try {
      await fs.readdir(testsDir);
    } catch {
      testsDir = path.join(__dirname, "..", "tests");
    }

    const files = await fs.readdir(testsDir);
    return files
      .filter((f) => f.endsWith(".spec.ts"))
      .map((f) => ({
        name: f,
        path: `tests/${f}`,
        id: f.replace(".spec.ts", ""),
      }));
  } catch (err) {
    console.error("Error reading test specs:", err);
    return [];
  }
}

function broadcastQueueUpdate() {
  const queue = Array.from(runQueue.values()).sort(
    (a, b) => (b.startedAt || 0) - (a.startedAt || 0),
  );
  const message = JSON.stringify({
    type: "queue",
    queue,
    timestamp: new Date().toISOString(),
  });
  console.log(
    `[WS] Broadcasting queue update to ${clients.size} clients: ${queue.length} runs`,
  );
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

async function runPlaywrightTestAsync(runId, specPath, envVars = {}) {
  const entry = runQueue.get(runId);
  if (!entry) return;

  entry.status = "running";
  entry.startedAt = new Date().toISOString();
  broadcastQueueUpdate();

  return new Promise(() => {
    // Set per-run report folder so each run has its own report
    const reportFolder = `pw-reports/${runId}`;

    const playwrightProcess = spawn("npm", ["run", "test", "--", specPath], {
      env: {
        ...process.env,
        ...envVars,
        HEADLESS: envVars.HEADLESS ?? "true",
        NODE_OPTIONS: "--import tsx/esm",
        PW_REPORT_FOLDER: reportFolder,
      },
    });

    playwrightProcess.stdout?.on("data", (data) => {
      entry.stdout += data.toString();
      broadcastQueueUpdate();
    });

    playwrightProcess.stderr?.on("data", (data) => {
      entry.stderr += data.toString();
    });

    playwrightProcess.on("close", (code) => {
      entry.status = code === 0 ? "passed" : "failed";
      entry.exitCode = code;
      entry.completedAt = new Date().toISOString();
      broadcastQueueUpdate();
      console.log(`[DASHBOARD] Test run completed: ${runId} - ${entry.status}`);
    });
  });
}

async function runPlaywrightTestK8s(runId, specPath, envVars = {}) {
  const entry = runQueue.get(runId);
  if (!entry) return;

  const spec = path.basename(specPath, ".spec.ts");
  const jobName = `pw-${spec}-${runId.split("-").pop()}`
    .toLowerCase()
    .slice(0, 63);

  try {
    entry.podPhase = "Pending";
    const jobYaml = generateJobYaml(runId, specPath, envVars);
    execSync(`echo '${jobYaml.replace(/'/g, "'\\''")}'  | kubectl apply -f -`, {
      encoding: "utf-8",
    });
    entry.k8sJobName = jobName;
    entry.status = "running";
    entry.startedAt = new Date().toISOString();
    broadcastQueueUpdate();
    console.log(`[DASHBOARD] K8s Job created: ${jobName}`);

    const interval = setInterval(() => {
      try {
        const logs = execSync(
          `kubectl logs -f job/${jobName} --timestamps=false 2>/dev/null || true`,
          { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
        );
        if (logs) {
          entry.stdout = logs;
          broadcastQueueUpdate();
        }
      } catch (err) {
        // Job might not have started yet
      }
    }, 2000);

    const phaseCheckInterval = setInterval(() => {
      try {
        const podsOutput = execSync(
          `kubectl get pods -l job-name=${jobName} -o json 2>/dev/null`,
          { encoding: "utf-8" },
        );
        const pods = JSON.parse(podsOutput);
        if (pods.items && pods.items.length > 0) {
          const pod = pods.items[0];
          entry.podPhase = pod.status?.phase || "Unknown";
          entry.podName = pod.metadata?.name;
          broadcastQueueUpdate();
        }
      } catch (err) {
        // Pod query might fail if not created yet
      }
    }, 1000);

    let maxWait = 600;
    const checkInterval = setInterval(() => {
      try {
        const output = execSync(
          `kubectl get job ${jobName} -o json 2>/dev/null`,
          { encoding: "utf-8" },
        );
        const job = JSON.parse(output);
        if (job.status?.succeeded > 0 || job.status?.failed > 0) {
          clearInterval(checkInterval);
          clearInterval(interval);
          clearInterval(phaseCheckInterval);
          entry.status = job.status.succeeded > 0 ? "passed" : "failed";
          entry.podPhase = job.status.succeeded > 0 ? "Succeeded" : "Failed";
          entry.exitCode = job.status.succeeded > 0 ? 0 : 1;
          entry.completedAt = new Date().toISOString();
          broadcastQueueUpdate();
          console.log(
            `[DASHBOARD] K8s Job completed: ${jobName} - ${entry.status}`,
          );
        }
      } catch (err) {
        // Job query failed
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(checkInterval);
      clearInterval(phaseCheckInterval);
      if (entry.status === "running") {
        entry.status = "failed";
        entry.podPhase = "Failed";
        entry.completedAt = new Date().toISOString();
        broadcastQueueUpdate();
      }
    }, maxWait * 1000);
  } catch (err) {
    console.error(
      `[DASHBOARD] K8s Job creation failed: ${err.message}, falling back to local`,
    );
    await runPlaywrightTestAsync(runId, specPath, envVars);
  }
}

// ============ API ENDPOINTS ============

app.get("/api/dashboard/specs", async (req, res) => {
  const specs = await getAvailableSpecs();
  res.json({ specs });
});

app.post("/api/dashboard/run", async (req, res) => {
  const { specPath, env: envVars = {} } = req.body;

  if (!specPath || typeof specPath !== "string") {
    return res.status(400).json({ error: "Invalid specPath" });
  }

  const specs = await getAvailableSpecs();
  if (!specs.some((s) => s.path === specPath)) {
    return res.status(400).json({ error: "Spec not found" });
  }

  const timestamp = new Date().toISOString().split("T")[0];
  const timeOnly = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const runId = `${path.basename(specPath, ".spec.ts")}-${timestamp}-${timeOnly}`;

  const entry = {
    runId,
    spec: path.basename(specPath, ".spec.ts"),
    specPath,
    status: "queued",
    stdout: "",
    stderr: "",
    exitCode: null,
    startedAt: null,
    completedAt: null,
    envVars,
    podPhase: null,
    podName: null,
  };

  runQueue.set(runId, entry);
  broadcastQueueUpdate();

  // Respond immediately
  res.json({ success: true, result: { runId, status: "queued" } });

  // Run in background
  if (k8sAvailable) {
    runPlaywrightTestK8s(runId, specPath, envVars).catch((err) => {
      console.error("K8s run failed:", err);
      entry.status = "failed";
      entry.completedAt = new Date().toISOString();
      broadcastQueueUpdate();
    });
  } else {
    runPlaywrightTestAsync(runId, specPath, envVars).catch((err) => {
      console.error("Test run failed:", err);
      entry.status = "failed";
      entry.completedAt = new Date().toISOString();
      broadcastQueueUpdate();
    });
  }
});

app.get("/api/dashboard/queue", async (req, res) => {
  const queue = Array.from(runQueue.values()).sort(
    (a, b) => (b.startedAt || 0) - (a.startedAt || 0),
  );
  res.json({ queue });
});

app.get("/api/dashboard/queue/stats", async (req, res) => {
  const queue = Array.from(runQueue.values());
  const stats = {
    total: queue.length,
    queued: queue.filter((q) => q.status === "queued").length,
    running: queue.filter((q) => q.status === "running").length,
    passed: queue.filter((q) => q.status === "passed").length,
    failed: queue.filter((q) => q.status === "failed").length,
    podPhases: {
      pending: queue.filter((q) => q.podPhase === "Pending").length,
      running: queue.filter((q) => q.podPhase === "Running").length,
      succeeded: queue.filter((q) => q.podPhase === "Succeeded").length,
      failed: queue.filter((q) => q.podPhase === "Failed").length,
    },
  };
  res.json(stats);
});

app.get("/api/dashboard/queue/:runId", async (req, res) => {
  const { runId } = req.params;
  const entry = runQueue.get(runId);
  if (!entry) {
    return res.status(404).json({ error: "Run not found" });
  }
  res.json({ run: entry });
});

app.get("/api/dashboard/report", async (req, res) => {
  try {
    const { runId } = req.query;

    let reportFile;
    if (runId) {
      // Per-run report: /app/pw-reports/{runId}/index.html
      reportFile = path.join(__dirname, "pw-reports", runId, "index.html");
      try {
        await fs.stat(reportFile);
      } catch {
        // Fallback to local path
        reportFile = path.join(
          __dirname,
          "..",
          "pw-reports",
          runId,
          "index.html",
        );
      }
    } else {
      // Latest report
      reportFile = path.join(__dirname, "pw-report-html", "index.html");
      try {
        await fs.stat(reportFile);
      } catch {
        reportFile = path.join(__dirname, "..", "pw-report-html", "index.html");
      }
    }

    const content = await fs.readFile(reportFile, "utf-8");
    res.setHeader("Content-Type", "text/html");
    res.send(content);
  } catch (err) {
    console.error("Report not found:", err.message);
    res.status(404).json({ error: "Report not found" });
  }
});

app.get("/api/dashboard/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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
    res.json({ available: false, error: err.message, containers: [] });
  }
});

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

// ============ WEBSOCKET ============
let wss;
const clients = new Set();

async function streamContainerUpdates(interval = 3000) {
  setInterval(async () => {
    if (clients.size === 0 || !docker) return;

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
      console.error("Container streaming error:", err.message);
    }
  }, interval);
}

async function streamK8sUpdates(interval = 3000) {
  setInterval(async () => {
    if (clients.size === 0 || !k8sAvailable) return;

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
      console.error("K8s streaming error:", err.message);
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

      ws.send(
        JSON.stringify({
          type: "connected",
          message: "Dashboard API connected",
          timestamp: new Date().toISOString(),
        }),
      );

      // Send initial queue state
      const queue = Array.from(runQueue.values()).sort(
        (a, b) => (b.startedAt || 0) - (a.startedAt || 0),
      );
      ws.send(
        JSON.stringify({
          type: "queue",
          queue,
          timestamp: new Date().toISOString(),
        }),
      );

      ws.on("close", () => {
        clients.delete(ws);
        console.log(`[WS] Client disconnected (${clients.size} total)`);
      });

      ws.on("error", (err) => {
        console.error("[WS] Error:", err.message);
      });
    });

    streamContainerUpdates(3000);
    streamK8sUpdates(3000);

    server = httpServer.listen(port, () => {
      console.log(
        `🧪 Test Dashboard API listening on http://localhost:${port}`,
      );
      console.log(`   - Specs: GET /api/dashboard/specs`);
      console.log(`   - Run test: POST /api/dashboard/run`);
      console.log(`   - Queue: GET /api/dashboard/queue`);
      console.log(`   - Report: GET /api/dashboard/report`);
      console.log(
        `   - WebSocket: ws://localhost:${port}/api/dashboard/stream`,
      );
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
