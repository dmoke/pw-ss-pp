# Quick Start Guide

## What Was Created

A complete Playwright TypeScript test suite with **565 tests** using session storage-based authentication:

- **5 Guest Tests** - No authentication required
- **550 Authenticated Tests** - Uses session storage auth (auth-001 to auth-550)
- **10 Session/Worker Tests** - Validates round-robin account assignment

## Key Features

✅ **10 Test Accounts** with session storage persistence  
✅ **No Login Overhead** - Session reuse eliminates repeated auth calls  
✅ **No Conflicts** - Round-robin assignment (worker ID → account)  
✅ **Parallel Execution** - Supports 1-10 workers seamlessly  
✅ **Smart Session Management** - Auto-save/load credentials  

## Running Tests

```bash
# Run all tests (565 tests across 4 files)
npm test

# Run only guest tests (5 tests)
npm run test:guest

# Run only auth tests (550 tests)
npm run test:auth

# Run worker session tests (10 tests)
# (included in main test run)

# Run with UI (interactive mode)
npm run test:ui

# Run in headed mode (visible browser)
npm run test:headed

# Debug mode (step through tests)
npm test -- --debug
```

## How Session Storage Works

1. **First Test Run**: 
   - Account credentials loaded from `src/test-data/accounts.ts`
   - Login performed
   - Session saved to `.auth/auth-{index}.json`

2. **Subsequent Runs**:
   - Session loaded from `.auth/auth-{index}.json`
   - No login needed
   - Tests run instantly

3. **Worker Assignment**:
   - Worker 0 → Account 0 (student)
   - Worker 1 → Account 1 (testuser1)
   - Worker N → Account (N % 10)

## File Structure

```
pw-ss-pp/
├── src/
│   ├── fixtures/
│   │   └── auth.ts           - Test fixtures (session management)
│   └── test-data/
│       └── accounts.ts       - Account definitions
├── tests/
│   ├── guest.spec.ts         - 5 guest tests
│   ├── auth.spec.ts          - 550 authenticated tests
│   ├── worker-sessions.spec.ts - 5 worker tests
│   └── concurrency.spec.ts   - 5 session integration tests
├── .auth/                    - Session files (auto-generated)
├── playwright.config.ts      - Configuration (10 workers max)
└── package.json              - Dependencies & scripts
```

## Test Accounts

All accounts are valid on https://practicetestautomation.com:

```
student       / Password123
testuser1-9   / Test@1234
```

## Configuration Examples

### Reduce Worker Count
Edit `playwright.config.ts`:
```typescript
workers: 3,  // Instead of 10
```

### Add More Accounts
Edit `src/test-data/accounts.ts`:
```typescript
export const TEST_ACCOUNTS = [
  // ... existing 10 accounts
  { username: 'testuser10', password: 'Test@1234' },
];
```

Then update `playwright.config.ts`:
```typescript
workers: 11,  // Max workers = account count
```

## Session Storage

- **Location**: `.auth/auth-{index}.json` (git-ignored)
- **Format**: Cookies + LocalStorage
- **Auto-Refresh**: Delete `.auth/` folder to force re-login
- **Persistence**: Sessions saved after first login

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Session not loading | Delete `.auth/` folder and re-run tests |
| Login failures | Check internet to practicetestautomation.com |
| Worker conflicts | Ensure workers ≤ account count |
| Tests too slow | Increase worker count (max 10) |

## Architecture Overview

```
Test Worker 0 ──→ Account 0 (session-0.json)
Test Worker 1 ──→ Account 1 (session-1.json)
Test Worker 2 ──→ Account 2 (session-2.json)
...
Test Worker 9 ──→ Account 9 (session-9.json)

Each worker has exclusive session/account - no conflicts!
```

## Next Steps

1. Run `npm test` to verify setup
2. Check `playwright-report/` after test runs
3. Modify tests in `tests/auth.spec.ts` for your scenarios
4. Adjust worker count based on performance
5. Sessions auto-persist in `.auth/` folder

## Performance Notes

- **First run**: All 10 accounts login (~1-2 sec each)
- **Subsequent runs**: Sessions load instantly (~0.1 sec each)
- **555+ tests**: Run in ~2-5 minutes with 10 workers
- **No overhead**: Session reuse eliminates login bottleneck

## Support

- Full API docs in [README.md](README.md)
- Playwright docs: https://playwright.dev
- Test website: https://practicetestautomation.com

---

**Version**: 2.0.0 (Session Storage Edition)  
**Created**: January 2026  
**Framework**: Playwright + TypeScript  
**Total Tests**: 565 (5 guest + 550 auth + 10 worker)  
**Auth Strategy**: Session Storage (Cookies + LocalStorage)
