# Playwright TypeScript Test Suite with Session Storage Auth

A comprehensive Playwright test automation project with **565 tests** using **session storage-based authentication**. Tests run in parallel with up to 10 workers using a round-robin account assignment strategy.

## Features

✅ **10 Test Accounts** - Pre-configured with session persistence  
✅ **565 Test Cases** - Mixed guest and authenticated scenarios  
✅ **Session Storage Auth** - No login/logout overhead, uses Playwright's session storage  
✅ **Round-Robin Assignment** - Worker ID determines which account to use  
✅ **Parallel Execution** - Full support for 1-10 workers without conflicts  
✅ **TypeScript Ready** - Fully typed with modern TypeScript config  
✅ **Real Login Testing** - Uses practicetestautomation.com as test website  

## Project Structure

```
pw-ss-pp/
├── src/
│   ├── fixtures/
│   │   └── auth.ts                # Test fixtures (guest, authenticated)
│   └── test-data/
│       └── accounts.ts            # Test account definitions
├── tests/
│   ├── guest.spec.ts              # 5 guest tests (no auth required)
│   ├── auth.spec.ts               # 550 authenticated tests
│   ├── worker-sessions.spec.ts    # 5 worker session tests
│   └── concurrency.spec.ts        # 5 session storage integration tests
├── .auth/                         # Session storage files (git-ignored)
├── playwright.config.ts           # Playwright configuration
├── tsconfig.json                  # TypeScript configuration
├── README.md                      # Full documentation
└── package.json                   # Dependencies & scripts
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run only guest tests
npm run test:guest

# Run only auth tests (550+ tests)
npm run test:auth

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# View HTML report
npm run test:report
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
test('guest test', async ({ guestPage }) => {
  const { page } = guestPage;
  await page.goto('/login');
});

// Auth test - auto-loads session from cache
test('auth test', async ({ authenticatedPage }) => {
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

| Suite | Tests | Purpose |
|-------|-------|---------|
| Login Validation | 5 | Verify successful login |
| Session Validation | 5 | Validate session persistence |
| Content Verification | 10 | Check page content |
| User Info Validation | 10 | Validate user data |
| Bulk Test Suite | 120 | Load testing |
| Load Scenario | 150 | Performance baseline |
| Stress Test Suite | 200 | High concurrency |
| Extended Suite | 50 | Extended scenarios |

### Session Storage Tests (10 tests)
- Worker session assignment (5 tests)
- Session storage integration (5 tests)

## Configuration

### Workers

Edit `playwright.config.ts` to adjust worker count:

```typescript
workers: process.env.CI ? 1 : 10,
```

Max workers = number of accounts (10)

### Adding More Accounts

1. Edit `src/test-data/accounts.ts`:
```typescript
export const TEST_ACCOUNTS = [
  // ... existing 10 accounts
  { username: 'testuser10', password: 'Test@1234' },
  { username: 'testuser11', password: 'Test@1234' },
];
```

2. Update `playwright.config.ts`:
```typescript
workers: 12,  // Max workers = account count
```

### Browser

Currently configured for Chromium. To add more browsers:

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

## Session Storage Format

`.auth/auth-0.json` (example for account 0):
```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": "practicetestautomation.com",
      "path": "/",
      "expires": 1706...,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://practicetestautomation.com",
      "localStorage": [
        {
          "name": "user_pref",
          "value": "..."
        }
      ]
    }
  ]
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests can't login | Check credentials in `src/test-data/accounts.ts` |
| Session expired | Delete `.auth/` folder to force re-login |
| Worker conflicts | Ensure workers ≤ account count |
| Session not loading | Check `.auth/` files exist and are readable |

## Performance Tips

1. **Parallel Execution**: Use 8-10 workers for optimal throughput
2. **Session Reuse**: Sessions persist across test runs for speed
3. **Skip Headless**: Run with `--headed` for debugging only
4. **CI/CD**: Use workers=1 for deterministic CI runs

## CI/CD Integration

```bash
# CI environment
PLAYWRIGHT_WORKERS=1 npm test
```

Or in CI, `playwright.config.ts` uses 1 worker by default when `CI=true`.

## Dependencies

- **@playwright/test** - End-to-end testing framework
- **typescript** - Language & type safety
- **@types/node** - Node.js type definitions

## Best Practices

1. ✅ Use `authenticatedPage` fixture for auth-required tests
2. ✅ Use `guestPage` fixture for unauthenticated scenarios
3. ✅ Let fixtures handle session loading/saving automatically
4. ✅ Don't manually manage sessions in tests
5. ✅ Review `.auth/` folder if tests fail to authenticate

## Architecture Comparison

### Old Approach (Removed)
- ❌ Manual login/logout per test
- ❌ File-based account locking
- ❌ Queue waiting for available accounts
- ❌ Overhead on every test run

### New Approach (Current)
- ✅ Session storage-based authentication
- ✅ Round-robin worker → account mapping
- ✅ One login per account per session
- ✅ Instant test execution
- ✅ Scales to N accounts and N workers

## Future Enhancements

- [ ] Multi-browser session storage
- [ ] Session refresh on expiry
- [ ] Account rotation strategy
- [ ] Parallel test isolation per account
- [ ] Failed session recovery

---

**Created**: January 2026  
**Framework**: Playwright + TypeScript  
**Auth Model**: Session Storage (Cookies + LocalStorage)  
**Max Workers**: 10 (= number of test accounts)  
**Total Tests**: 565 (5 guest + 550 auth + 5 worker + 5 concurrency)

