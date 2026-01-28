import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { TEST_ACCOUNTS, AUTH_FILE } from '../test-data/accounts';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

const authStorageDir = path.join(__dirname, '../../.auth');
const sessionStorageFile = (accountIndex: number) => 
  path.join(authStorageDir, `session-storage-${accountIndex}.json`);

function getAuthFile(accountIndex: number): string {
  return path.join(authStorageDir, `${AUTH_FILE.replace('.json', '')}-${accountIndex}.json`);
}

async function loadSessionStorage(page: Page, accountIndex: number): Promise<void> {
  const sessionFile = sessionStorageFile(accountIndex);
  
  if (fs.existsSync(sessionFile)) {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    await page.context().addInitScript((storage: Record<string, string>) => {
      if (window.location.hostname === new URL(page.url()).hostname) {
        for (const [key, value] of Object.entries(storage)) {
          window.sessionStorage.setItem(key, value);
        }
      }
    }, sessionData);
  }
}

async function saveSessionStorage(page: Page, accountIndex: number): Promise<void> {
  if (!fs.existsSync(authStorageDir)) {
    fs.mkdirSync(authStorageDir, { recursive: true });
  }

  const sessionData = await page.evaluate(() => {
    const storage: Record<string, string> = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key) {
        storage[key] = window.sessionStorage.getItem(key) || '';
      }
    }
    return storage;
  });

  fs.writeFileSync(sessionStorageFile(accountIndex), JSON.stringify(sessionData, null, 2));
}

async function setupAuthStorage(page: Page, accountIndex: number): Promise<void> {
  const authFile = getAuthFile(accountIndex);
  
  if (fs.existsSync(authFile)) {
    const storageState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    await page.context().addCookies(storageState.cookies || []);
    await page.evaluate((state: any) => {
      const localStorage = state.localStorage || [];
      localStorage.forEach((item: any) => {
        window.localStorage.setItem(item.name, item.value);
      });
    }, storageState);
  }

  await loadSessionStorage(page, accountIndex);
}

async function saveAuthStorage(page: Page, accountIndex: number): Promise<void> {
  if (!fs.existsSync(authStorageDir)) {
    fs.mkdirSync(authStorageDir, { recursive: true });
  }

  const storageState = await page.context().storageState();
  fs.writeFileSync(getAuthFile(accountIndex), JSON.stringify(storageState, null, 2));
  
  await saveSessionStorage(page, accountIndex);
}

interface AuthFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const accountIndex = (test as any).info?.workerIndex ?? 0 % TEST_ACCOUNTS.length;
    const account = TEST_ACCOUNTS[accountIndex];

    await setupAuthStorage(page, accountIndex);
    
    const loginPage = new LoginPage(page, account.username);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use, testInfo) => {
    const accountIndex = testInfo.workerIndex % TEST_ACCOUNTS.length;
    const account = TEST_ACCOUNTS[accountIndex];
    const authFile = getAuthFile(accountIndex);

    if (fs.existsSync(authFile)) {
      await setupAuthStorage(page, accountIndex);
      await page.goto('/');
      
      const isLoggedIn = await page.evaluate(() => {
        return document.body.textContent?.includes('Hello') ?? false;
      }).catch(() => false);

      if (isLoggedIn) {
        const dashboardPage = new DashboardPage(page, account.username);
        await use(dashboardPage);
        return;
      }
    }

    const loginPage = new LoginPage(page, account.username);
    await loginPage.navigateToLogin();
    await loginPage.login(account.username, account.password);
    await loginPage.waitForLoginSuccess();
    await loginPage.assertLoggedIn();

    await saveAuthStorage(page, accountIndex);

    const dashboardPage = new DashboardPage(page, account.username);
    await use(dashboardPage);
  },
});

export { expect };
export { LoginPage } from '../pages/LoginPage';
export { DashboardPage } from '../pages/DashboardPage';
export { BasePage } from '../pages/BasePage';
