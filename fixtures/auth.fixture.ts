import { test as base, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { TEST_ACCOUNTS } from "../src/test-data/testData.js";
import { LoginPage } from "../src/pages/LoginPage.js";
import { DashboardPage } from "../src/pages/DashboardPage.js";
import { LoginLogger } from "../src/utils/LoginLogger.js";

// use hidden .auth directory for both snapshots and login log
const authStorageDir = path.join(".", ".auth");
const getSessionStorageFile = (username: string) =>
  path.join(authStorageDir, `${username}.json`);

// round-robin assignment of accounts to unique test identifiers
const workerAccountMap = new Map<number, (typeof TEST_ACCOUNTS)[0]>();

function accountForWorker(testInfo: any) {
  const workerIndex = testInfo.workerIndex;

  if (!workerAccountMap.has(workerIndex)) {
    const acct =
      TEST_ACCOUNTS[workerIndex % TEST_ACCOUNTS.length];

    workerAccountMap.set(workerIndex, acct);

    console.log(
      `[ACCOUNT ASSIGNMENT] Worker ${workerIndex} assigned to ${acct.username}`,
    );
  }

  return workerAccountMap.get(workerIndex)!;
}
async function loadSessionStorage(page: Page, username: string): Promise<void> {
  const sessionFile = getSessionStorageFile(username);

  if (fs.existsSync(sessionFile)) {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
    await page.context().addInitScript((storage: Record<string, string>) => {
      for (const [key, value] of Object.entries(storage)) {
        window.sessionStorage.setItem(key, value);
      }
    }, sessionData);
  }
}

async function saveSessionStorage(page: Page, username: string): Promise<void> {
  if (!fs.existsSync(authStorageDir)) {
    fs.mkdirSync(authStorageDir, { recursive: true });
    console.log(`[auth fixture] created directory ${authStorageDir}`);
    // if an old non‑dot auth folder exists, move its contents
    const legacy = path.join(".", "auth");
    if (fs.existsSync(legacy)) {
      console.log(
        `[auth fixture] migrating session files from ${legacy} to ${authStorageDir}`,
      );
      fs.readdirSync(legacy).forEach((f) => {
        const src = path.join(legacy, f);
        const dst = path.join(authStorageDir, f);
        fs.renameSync(src, dst);
      });
      try {
        fs.rmdirSync(legacy);
      } catch {} // ignore
    }
  }

  const sessionData = await page.evaluate(() => {
    const storage: Record<string, string> = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key) {
        storage[key] = window.sessionStorage.getItem(key) || "";
      }
    }
    return storage;
  });

  fs.writeFileSync(
    getSessionStorageFile(username),
    JSON.stringify(sessionData, null, 2),
  );
}

interface AuthFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  freshLoginPage: LoginPage;
  freshDashboardPage: DashboardPage;
}

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use, testInfo) => {
    const account = accountForWorker(testInfo);

    const loginPage = new LoginPage(page, account.username);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use, testInfo) => {
    const account = accountForWorker(testInfo);
    const sessionFile = getSessionStorageFile(account.username);

    if (fs.existsSync(sessionFile)) {
      console.log(
        `[SESSION STORAGE] Worker ${testInfo.workerIndex}: Found existing session file for ${account.username}, attempting session reuse`,
      );
      await loadSessionStorage(page, account.username);
      await page.goto("/");

      const isLoggedIn = await page
        .evaluate((username) => {
          try {
            const sessionData = sessionStorage.getItem("session");
            if (sessionData) {
              const session = JSON.parse(sessionData);
              const expiresAt = new Date(session.expiresAt);
              const now = new Date();

              if (
                session.username === username &&
                expiresAt > now &&
                session.token
              ) {
                return true;
              }
            }
            return false;
          } catch {
            return false;
          }
        }, account.username)
        .catch(() => false);

      if (isLoggedIn) {
        console.log(
          `[SESSION STORAGE] Worker ${testInfo.workerIndex}: Session reuse successful for ${account.username}`,
        );
        const dashboardPage = new DashboardPage(page, account.username);
        LoginLogger.log({
          username: account.username,
          approach: "session-storage",
          testName: testInfo.titlePath.join(" › "),
          workerIndex: testInfo.workerIndex,
          action: "reuse",
        });
        await use(dashboardPage);
        return;
      } else {
        console.log(
          `[SESSION STORAGE] Worker ${testInfo.workerIndex}: Session reuse failed for ${account.username}, will perform fresh login`,
        );
      }
    }

    console.log(
      `[SESSION STORAGE] Worker ${testInfo.workerIndex}: Performing fresh login for ${account.username}`,
    );
    const loginPage = new LoginPage(page, account.username);
    await loginPage.navigate();
    await loginPage.login(account.username, account.password);
    await loginPage.waitForLoginSuccess();
    await loginPage.assertLoggedIn();
    await saveSessionStorage(page, account.username);

    LoginLogger.log({
      username: account.username,
      approach: "session-storage",
      testName: testInfo.titlePath.join(" › "),
      workerIndex: testInfo.workerIndex,
      action: "login",
    });

    const dashboardPage = new DashboardPage(page, account.username);
    await use(dashboardPage);
  },

  freshLoginPage: async ({ page }, use, testInfo) => {
    const account = accountForWorker(testInfo);

    const loginPage = new LoginPage(page, account.username);
    await use(loginPage);
  },

  freshDashboardPage: async ({ page }, use, testInfo) => {
    const account = accountForWorker(testInfo);

    console.log(
      `[FRESH LOGIN] Worker ${testInfo.workerIndex}: Performing fresh login for ${account.username} (no session reuse)`,
    );
    const loginPage = new LoginPage(page, account.username);
    await loginPage.navigate();

    const loginCountBefore = await page
      .evaluate(() => (window as any).demoShop?.loginCount || 0)
      .catch(() => 0);

    await loginPage.login(account.username, account.password);
    await loginPage.waitForLoginSuccess();
    await loginPage.assertLoggedIn();

    const loginCountAfter = await page
      .evaluate(() => (window as any).demoShop?.loginCount || 0)
      .catch(() => 0);

    await saveSessionStorage(page, account.username);

    LoginLogger.log({
      username: account.username,
      approach: "fresh-login",
      testName: testInfo.titlePath.join(" › "),
      workerIndex: testInfo.workerIndex,
      action: "login",
    });

    const dashboardPage = new DashboardPage(page, account.username);
    (dashboardPage as any).loginsInThisTest =
      loginCountAfter - loginCountBefore;

    await use(dashboardPage);
  },
});

export { expect };
export { LoginPage } from "../src/pages/LoginPage.js";
export { DashboardPage } from "../src/pages/DashboardPage.js";
export { BasePage } from "../src/pages/BasePage.js";
