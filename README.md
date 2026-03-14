# 🧪 Playwright Test Suite + Test Dashboard

A comprehensive Playwright test automation project with **session storage-based authentication** + a **production-ready test dashboard** for manual testers.

## Quick Start (Choose One)

### 🏃 Local Development (Fastest)
```bash
npm run dev:local
# Opens: http://localhost:3001
```
3 local processes, no Docker overhead. Best for active development.

### 🐳 Docker Compose (Recommended)
```bash
npm run dev:docker
# Opens: http://localhost:3001
```
3 Docker containers, production-like setup, container monitoring in dashboard.

### ☸️ Kubernetes + Docker (Advanced)
```bash
npm run k8s:minikube:start
npm run dev:docker
npm run k8s:deploy              # optional, for scaling demo
```
See [k8s/README.md](k8s/README.md) for complete guide.

**All open dashboard at http://localhost:3001**

## Running Tests

### Via Dashboard (Recommended)
1. Start dashboard: `npm run dev:docker`
2. Open **http://localhost:3001**
3. Select test specs from sidebar
4. Click "▶️ Run Tests"
5. Watch in real-time:
   - 📊 Execution logs (with timestamps)
   - 🐳 Container status + logs (Docker Compose)
   - ☸️ K8s pods/jobs (if using Kubernetes)
   - 📊 Test results table
   - 📈 Run history

### Dashboard Tabs
- **Execution Logs** - Real-time test output
- **Test Results** - Pass/fail breakdown
- **🐳 Containers** - Docker container status + logs
- **☸️ Kubernetes** - K8s pods and jobs (when scaling)
- **Run History** - Past test runs
- **HTML Report** - Full Playwright analytics

### Via Command Line
```bash
npm test                 # All tests, all workers
npm run test:auth       # Auth tests only
npm run test:api        # API tests only
npm run test:ui         # UI mode (interactive)
npm run test:headed     # Visible browser
npm run test:report     # View previous results
```

## Authentication System

### How Session Storage Works

1. **First Run**: Test calls `authenticatedPage` fixture
2. **Login**: Credentials are used to login if session doesn't exist
3. **Session Save**: After successful login, session (cookies + localStorage) is saved to `.auth/auth-{accountIndex}.json`
4. **Subsequent Runs**: Session is loaded from file, no login needed
5. **Worker Assignment**: Account index = `workerIndex % 10`

### Key Benefits

- **No Login Overhead**: Session reuse eliminates repeated login calls
- **No Conflicts**: Each worker gets a unique account via round-robin
- **Faster Tests**: Auth tests run immediately with pre-authenticated session
- **Scalable**: Works from 1 to 10+ workers seamlessly

### Code Example

```typescript
// Guest test - no authentication
test("guest test", async ({ guestPage }) => {
  const { page } = guestPage;
  await page.goto("/login");
});

// Auth test - auto-loads session from cache
test("auth test", async ({ authenticatedPage }) => {
  const { page, username } = authenticatedPage;
  // Already logged in via session storage
  expect(username).toBeTruthy();
});
```

## Account Assignment Strategy

With 10 accounts and up to 10 workers:

```
Worker 0 → Account 0 (student)
Worker 1 → Account 1 (testuser1)
Worker 2 → Account 2 (testuser2)
...
Worker 9 → Account 9 (testuser9)
Worker 10 → Account 0 (student) - wraps around
```

**No conflicts** because each account is mapped to a unique worker ID.

## Test Website

**Base URL**: https://practicetestautomation.com  
**Login Page**: `/practice-test-login/`  
**Success Page**: `/logged-in-successfully/`

### Test Credentials

All test accounts have valid credentials:

- `student` / `Password123`
- `testuser1-9` / `Test@1234`

## Test Coverage

### Guest Tests (5 tests)

- Page structure validation
- Login form visibility
- Error handling for invalid credentials

### Authenticated Tests (550 tests)

| Suite                | Tests | Purpose                      |
| -------------------- | ----- | ---------------------------- |
| Login Validation     | 5     | Verify successful login      |
| Session Validation   | 5     | Validate session persistence |
| Content Verification | 10    | Check page content           |
| User Info Validation | 10    | Validate user data           |
| Bulk Test Suite      | 120   | Load testing                 |
| Load Scenario        | 150   | Performance baseline         |
| Stress Test Suite    | 200   | High concurrency             |
| Extended Suite       | 50    | Extended scenarios           |

### Session Storage Tests (10 tests)

- Worker session assignment (5 tests)
- Session storage integration (5 tests)

## Configuration

**Workers**: Edit `playwright.config.ts` to adjust count (max = account count, default 10)

**Test Accounts**: Edit `src/test-data/accounts.ts` to add/remove credentials

**Browser**: Configure in `playwright.config.ts` (currently Chromium)

## Credentials

| Username | Password |
|----------|----------|
| student | Password123 |
| testuser1-9 | Test@1234 |

## Common Commands

```bash
# Development startup (pick one)
npm run dev:local              # Local: 3 terminals
npm run dev:docker             # Docker: 1 command

# Control Docker Compose
npm run dev:docker:stop        # Stop all services
npm run dev:docker:logs        # View all logs

# Run tests from command line
npm test                       # All tests
npm run test:auth             # Auth tests
npm run test:ui               # Interactive mode
npm run test:report           # View results

# Port management
npm run port:kill:all          # Clear stuck ports
```

**For K8s commands**: See [k8s/README.md](k8s/README.md)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot access http://localhost:3001 | Ensure dashboard running: `npm run dev:docker` or `npm run dev:local` |
| "Port already in use" | Run `npm run port:kill:all` |
| Tests can't login | Check credentials in `src/test-data/accounts.ts` |
| Session expired | Delete `.auth/` folder to force re-login |
| Playwright not found | Run `npx playwright install` |
| Docker won't start | Check logs: `npm run dev:docker:logs` |

## How It Works

**Session Storage Auth**: Each worker gets a unique test account. Sessions (cookies + localStorage) are cached in `.auth/` and reused across runs—no repeated logins.

```
Worker 0 → Account 0 (student)
Worker 1 → Account 1 (testuser1)
...
Worker 10 → Account 0 (wraps around)
```

**Fixtures**: Use `authenticatedPage` (auto-logged-in) or `guestPage` (no auth) in tests. Fixtures handle session loading/saving automatically.

## Project Structure

```
pw-ss-pp/
├── tests/                 # Test specs
├── src/fixtures/          # Test fixtures
├── src/pages/             # Page objects
├── src/api/               # API helpers
├── dashboard-server.js    # Test orchestration API
├── dashboard/             # Dashboard UI
├── playwright.config.ts   # Config
└── site/
    └── server.js          # Demo app
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dashboard/health` | Health check |
| GET | `/api/dashboard/specs` | List test specs |
| POST | `/api/dashboard/run` | Execute tests |
| GET | `/api/dashboard/results` | Get latest results |
| GET | `/api/dashboard/report` | Get HTML report |
| GET | `/api/dashboard/history` | Get run history |

## How It Works: 3 Layers

```
┌──────────────────────────────┐
│   Dashboard UI (3001)        │  ← You interact here
│   Select tests, view results │
└──────────────┬───────────────┘
               │ API calls
┌──────────────▼───────────────┐
│   Dashboard API (4000)       │
│   Orchestrates test runs     │
│   Monitors containers/pods   │
└──────────────┬───────────────┘
               │
      ┌────────┴──────────┐
      ▼                   ▼
   App (3000)       K8s Pods (if scaling)
  being tested      running tests
```

**Startup Order (automatic)**:
1. App (3000) - the target being tested
2. API (4000) - test orchestrator, waits for app healthy
3. UI (3001) - waits for API healthy

### Dashboard Features

- ✅ Run tests with one click
- ✅ View live results + HTML reports
- ✅ Monitor active containers/pods
- ✅ Stream container logs in real-time
- ✅ See test history
- ✅ Watch horizontal scaling in action (K8s mode)

## Learn More

- **Docker & Kubernetes**: [k8s/README.md](k8s/README.md) - Complete deployment guide with data flows
- **Package Scripts**: All npm scripts prefixed for clarity: `npm run` then search for `dev:`, `app:`, `dashboard:`, `k8s:`, `port:`
- **Test Details**: See `playwright.config.ts` and test files in `tests/`
