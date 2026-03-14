# Docker & Kubernetes Deployment

Complete guide for containerizing and orchestrating the Playwright test suite.

## Architecture: 3 Layers

### Layer 1: Test Target (App Being Tested)
- **Port 3000**: Demo App (`pw-app` container)
- **Purpose**: The e-commerce app you're testing
- **Dependency**: None (starts first)

### Layer 2: Test Orchestration (Runs Tests + Monitors)
- **Port 4000**: Dashboard API (`pw-dashboard-api` container)
- **Purpose**: Orchestrates test execution, streams results, monitors containers
- **Capability**: Can spawn local Playwright processes OR create K8s Jobs
- **Docker Integration**: Accesses docker.sock to monitor running containers
- **Depends on**: Layer 1 (app healthy)

### Layer 3: UI (Visualization)
- **Port 3001**: Dashboard UI (`pw-dashboard-ui` container)
- **Purpose**: Beautiful interface to select tests, view results, see container status
- **Depends on**: Layer 2 (API healthy)

**Startup Order** (automatic in Docker Compose): Layer 1 → Layer 2 → Layer 3

---

## Docker Compose (Recommended for Learning)

Start all services with one command:

```bash
npm run dev:docker
```

Services on:
- Dashboard UI: http://localhost:3001 (main entry point)
- Demo App: http://localhost:3000 (being tested)
- Dashboard API: http://localhost:4000 (orchestrator)

**What happens**:
1. Compose starts `pw-app` (layer 1)
2. Waits for app health check to pass
3. Starts `pw-dashboard-api` (layer 2) with docker.sock access
4. Waits for API health check to pass
5. Starts `pw-dashboard-ui` (layer 3)
6. UI connects to API at `http://localhost:4000`

**Real-Time Monitoring** (WebSocket):
- Dashboard API streams container/K8s data via `ws://localhost:4000/api/dashboard/stream`
- **Zero polling**: Single persistent WebSocket connection (not 5+ HTTP requests)
- Shows: container names, states, ports, images (every 3 seconds)
- K8s pod/job status (every 3 seconds)
- Test results and history (every 5 seconds)
- Click container → stream last 100 lines of logs

### Common Commands

```bash
npm run dev:docker              # Start all
npm run dev:docker:stop         # Stop all
npm run dev:docker:logs         # View all logs
docker-compose logs -f dashboard-api    # View specific service logs
```

---

## Local Development (No Docker)

For fastest iteration:

```bash
# Terminal 1
npm run app:start

# Terminal 2
npm run dashboard:api:start

# Terminal 3
npm run dashboard:ui:start
```

All services run on host machine. API can't access docker.sock (no container monitoring).

## Kubernetes Deployment (Scaling)

### Hybrid Setup: Docker Compose + Kubernetes

Dashboard runs in Docker locally, but can spawn test pods in Kubernetes for horizontal scaling.

**Setup**:
```bash
# Terminal 1: Start Minikube cluster
npm run k8s:minikube:start

# Terminal 2: Start Dashboard via Docker Compose
npm run dev:docker

# Terminal 3: Deploy K8s manifests (optional)
npm run k8s:deploy
```

**What happens**:
1. Minikube runs local Kubernetes cluster
2. Docker Compose runs baseline dashboard + app locally
3. When user clicks "Run Tests" in dashboard:
   - Option A: API spawns Playwright process locally (in `pw-dashboard-api` container)
   - Option B: API creates K8s Job manifest and sends to `kubectl apply`
4. Kubernetes schedules test pods on available nodes
5. Each test pod runs: `npx playwright test tests/auth.spec.ts`
6. Pods write results to PersistentVolume (shared storage)
7. API reads results from PV, sends to UI
8. Dashboard shows: test status, container status, K8s pod status all in one place

### How to Test Multi-Pod Scaling

```bash
# Start dashboard UI
npm run dev:docker

# Open http://localhost:3001

# In dashboard, select "auth.spec.ts"
# Click "Run 10x" or queue 10 tests

# Watch 10 test pods spawn in Kubernetes:
kubectl get pods -w

# Dashboard shows: running container (API) + 10 running test pods + logs from all
```

### Kubernetes Resources

```bash
kubectl get pods          # See all test pods
kubectl get jobs          # See all test jobs
kubectl get pv            # See persistent volumes
kubectl logs -f deployment/dashboard-api        # API logs
kubectl logs -f pod/pw-test-job-1-abcd          # Test pod logs
```

### Cleanup

```bash
npm run k8s:minikube:stop   # Stop Minikube
npm run dev:docker:stop     # Stop Docker Compose
```

## Data Flow

### Local Development

```
Browser (3001)
  ├─ GET /api/dashboard/specs
  │  ↓ API reads ./tests/*.spec.ts
  │  ↑ returns list
  │
  ├─ POST /api/dashboard/run {specPath}
  │  ↓ API spawns Playwright process
  │  ↓ Playwright hits app (3000)
  │  ↓ writes results to ./pw-report-json/
  │  ↑ returns {status, duration}
  │
  ├─ polls GET /api/dashboard/results
  │  ↓ API reads ./pw-report-json/results.json
  │  ↑ parsed test results
  │
  └─ displays results table + HTML report
```

### Docker Compose (With Container Monitoring)

```
Same as above, PLUS:

Browser: GET /api/dashboard/docker/status
  ↓ API queries docker.sock
  ↓ docker.listContainers() returns all running containers
  ├─ pw-app (running, 3000)
  ├─ pw-dashboard-api (running, 4000)
  └─ pw-dashboard-ui (running, 3001)
  ↑ JSON with container details

Browser: click container → GET /api/dashboard/docker/logs/pw-app
  ↓ API streams last 100 lines from container log
  ↑ text/plain stream

Dashboard displays:
  ├─ Running Tests + Results
  ├─ Container Status (3 boxes)
  ├─ Container Logs (click to expand)
  └─ HTML Report iframe
```

### Kubernetes Job Scaling

```
Browser: POST /api/dashboard/run?target=kubernetes {specPath}
  ↓ API creates Job manifest (1 pod per test)
  ↓ kubectl apply -f job.yaml
  ↓ Kubernetes scheduler places pod
  ├─ pod: pw-test-job-auth-1
  ├─ pod: pw-test-job-auth-2
  └─ pod: pw-test-job-auth-3
  │
  ↓ pods run Playwright tests
  ↓ write results to /mnt/pw-results (PV)
  │
  ↓ API polls kubectl get jobs + pods
  ├─ returns pod states: pending→running→succeeded
  │
  ↓ API reads results from PersistentVolume
  ↑ aggregates all results

Dashboard displays:
  ├─ Pod Status (3 boxes showing running/passed/failed)
  ├─ Pod Logs (kubectl logs -f)
  ├─ Resource Usage (CPU/Memory)
  └─ Results Table (aggregated)
```

## Dashboard Features

### 🐳 Container Monitoring (Docker Compose)
When running `npm run dev:docker`, the dashboard shows:
- **Real-time container list** - All running containers with status
- **Container cards** - Name, image, ports, running state
- **Live logs** - Click any container to stream last 100 lines of logs
- **Auto-refresh** - Updates every 3 seconds

**Access**: Open http://localhost:3001 → Click "🐳 Containers" tab

### ☸️ Kubernetes Scaling (K8s Deployments)
When running K8s, the dashboard shows:
- **Jobs table** - All test jobs: name, completions, succeeded/failed/active
- **Pods grid** - All test pods: name, namespace, phase, containers
- **Real-time status** - See pods spin up as tests run
- **Auto-refresh** - Updates every 3 seconds

**Access**: Open http://localhost:3001 → Click "☸️ Kubernetes" tab

### Test Results & History
- **Execution Logs** - Real-time logs with timestamps and color coding
- **Test Results** - Pass/fail breakdown table with duration
- **Run History** - Past test runs, delete to clean up
- **HTML Report** - Full Playwright report inline

## API Endpoints

### Test Management
- `GET /api/dashboard/specs` - List test files
- `POST /api/dashboard/run` - Execute tests (locally or K8s)
- `GET /api/dashboard/results` - Get test results
- `GET /api/dashboard/history` - Get past run history
- `DELETE /api/dashboard/history/:runId` - Delete results

### Docker Monitoring (Docker Compose only)
- `GET /api/dashboard/docker/status` - List all running containers with status
- `GET /api/dashboard/docker/logs/:container` - Stream last 100 lines of logs

**Example**:
```bash
curl http://localhost:4000/api/dashboard/docker/status
# Returns: {available: true, containers: [{name, state, status, ports, image}]}
```

### Kubernetes Monitoring (kubectl available in container)
- `GET /api/dashboard/k8s/pods` - List all K8s pods with phase/namespace
- `GET /api/dashboard/k8s/jobs` - List all K8s jobs with completion status

**Example**:
```bash
curl http://localhost:4000/api/dashboard/k8s/pods
# Returns: {available: true, pods: [{name, namespace, phase, containers}]}
```

### Health Check
- `GET /api/dashboard/health` - API ready check

## Dockerfiles & Images

### Dockerfile.demo-app
```
FROM node:20-alpine
- Runs site/server.js (the app being tested)
- Exposes port 3000
- Health check: HTTP to /
```

### Dockerfile.dashboard
```
FROM node:20-alpine
- Runs dashboard-server.js (test orchestrator)
- Has Playwright + all test files
- Exposes port 4000
- Mounts docker.sock for container monitoring
- Health check: HTTP to /api/dashboard/health
```

### Dockerfile.dashboard-ui
```
FROM node:20-alpine (or could be nginx)
- Serves React dashboard
- Exposes port 3001
- Calls API at http://dashboard-api:4000
```

## Configuration

### docker-compose.yml

```yaml
services:
  app:                    # Layer 1 - app under test
    ports: 3000
    healthcheck: enabled
    networks: pw-network

  dashboard-api:          # Layer 2 - test orchestrator
    ports: 4000
    volumes:
      - docker.sock       # can monitor containers
      - shared volumes    # test results
    depends_on: app
    healthcheck: enabled
    networks: pw-network

  dashboard-ui:           # Layer 3 - visualization
    ports: 3001
    depends_on: dashboard-api
    networks: pw-network
```

### K8s Manifests (in k8s/ folder)

```
deployment-api.yaml       # Dashboard API deployment
deployment-ui.yaml        # Dashboard UI deployment
service-api.yaml          # Expose API
service-ui.yaml           # Expose UI
persistent-volume.yaml    # Shared storage for test results
job-template.yaml         # Template for test jobs (created dynamically)
```

## Persistent Storage

### Docker Compose
```yaml
volumes:
  test-results:           # Named Docker volume
  pw-report-json:
  pw-report-html:
```

### Kubernetes
```yaml
PersistentVolume:         # Storage pool (hostPath for Minikube, NFS/EBS for prod)
PersistentVolumeClaim:    # Storage request (mounted at /app/pw-report-json)
```

Results are written here by both local Playwright and K8s pods, so API can read them.

## Commands Reference

### Local Development
```bash
npm run dev:local              # 3 local processes (terminals)
npm run app:start              # Just app (port 3000)
npm run dashboard:api:start    # Just API (port 4000)
npm run dashboard:ui:start     # Just UI (port 3001)
```

### Docker Compose
```bash
npm run dev:docker             # Start all
npm run dev:docker:stop        # Stop all
npm run dev:docker:logs        # View logs
```

### Kubernetes
```bash
npm run k8s:minikube:start     # Start Minikube cluster
npm run k8s:minikube:stop      # Stop Minikube
npm run k8s:build              # Build Docker images
npm run k8s:deploy             # Deploy to cluster
npm run k8s:deploy:status      # Check pod status
npm run k8s:logs               # View API logs
npm run k8s:cleanup            # Delete all K8s resources
```

### Port Management
```bash
npm run port:kill:all          # Clear ports 3000, 3001, 4000
npm run port:kill:3000         # Clear port 3000
npm run port:kill:3001         # Clear port 3001
npm run port:kill:4000         # Clear port 4000
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot connect to API | Check health: `curl http://localhost:4000/api/dashboard/health` |
| Port already in use | Kill: `lsof -ti:4000 \| xargs kill -9` or use different port |
| Pod stuck pending | Check resources: `kubectl describe pod [pod-name]` |
| Images not found | Rebuild: `docker build -t pw-ss-pp:latest .` |
| PV not mounting | Ensure PersistentVolume exists: `kubectl get pv` |

## Performance Tips

1. **CPU/Memory**: Allocate 2+ CPU cores and 4GB+ RAM per container
2. **Workers**: Scale Playwright workers 1-10 based on available resources
3. **Volumes**: Use fast storage backend for `.auth/` and test results
4. **Networking**: Use host network mode in Docker Compose for faster communication

## Production Checklist

- [ ] Use private image registry (not Docker Hub)
- [ ] Set resource limits/requests in K8s manifests
- [ ] Configure liveness/readiness probes
- [ ] Use secrets for sensitive data (credentials, API keys)
- [ ] Enable RBAC and network policies
- [ ] Set up persistent volume snapshots for backup
- [ ] Configure monitoring/logging (Prometheus, ELK, etc.)
