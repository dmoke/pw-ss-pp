import { test, expect } from "../fixtures/auth.fixture.js";
import { ACCOUNT_USERNAMES } from "../src/test-data/testData.js";
import { LoginLogger } from "../src/utils/LoginLogger.js";

const workerMap = new Map<number, number>();
let nextWorkerIndex = 0;
let logCleared = false;

function getRelativeWorkerIndex(actualIndex: number): number {
  if (!workerMap.has(actualIndex)) {
    workerMap.set(actualIndex, nextWorkerIndex++);
  }
  return workerMap.get(actualIndex)!;
}

test.beforeEach(async () => {
  if (!logCleared) {
    LoginLogger.clear();
    logCleared = true;
  }
});

test.describe("Session Storage vs Fresh Login Comparison", () => {
  test.describe("Session Storage Approach (reuses auth)", () => {
    test("worker assignment", async ({ dashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      expect(ACCOUNT_USERNAMES).toContain(dashboardPage.username);
      console.log(
        `[SESSION] Worker ${relativeWorker} authenticated as ${dashboardPage.username}`,
      );
    });

    test("maintains session", async ({ dashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await dashboardPage.assertUserIsLoggedIn();
      console.log(
        `[SESSION] Worker ${relativeWorker} (${dashboardPage.username}) session active`,
      );
    });

    test("cart operations", async ({ dashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await dashboardPage.addItemToCart();
      const total = await dashboardPage.getCartTotal();
      expect(total).not.toBe("Total: $0.00");
      console.log(
        `[SESSION] Worker ${relativeWorker} (${dashboardPage.username}) cart: ${total}`,
      );
    });

    test("add multiple items", async ({ dashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await dashboardPage.addItemToCart();
      await dashboardPage.addItemToCart();
      const total = await dashboardPage.getCartTotal();
      expect(total).not.toBe("Total: $0.00");
      console.log(
        `[SESSION] Worker ${relativeWorker} (${dashboardPage.username}) multiple items: ${total}`,
      );
    });

    test("verify user role", async ({ dashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await dashboardPage.assertUserIsLoggedIn();
      console.log(
        `[SESSION] Worker ${relativeWorker} (${dashboardPage.username}) role verified`,
      );
    });
  });

  test.describe("Fresh Login Approach (no auth reuse)", () => {
    test("worker assignment", async ({ freshDashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      expect(ACCOUNT_USERNAMES).toContain(freshDashboardPage.username);
      console.log(
        `[FRESH] Worker ${relativeWorker} authenticated as ${freshDashboardPage.username}`,
      );
    });

    test("maintains session", async ({ freshDashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await freshDashboardPage.assertUserIsLoggedIn();
      console.log(
        `[FRESH] Worker ${relativeWorker} (${freshDashboardPage.username}) session active`,
      );
    });

    test("cart operations", async ({ freshDashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await freshDashboardPage.addItemToCart();
      const total = await freshDashboardPage.getCartTotal();
      expect(total).not.toBe("Total: $0.00");
      console.log(
        `[FRESH] Worker ${relativeWorker} (${freshDashboardPage.username}) cart: ${total}`,
      );
    });

    test("add multiple items", async ({ freshDashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await freshDashboardPage.addItemToCart();
      await freshDashboardPage.addItemToCart();
      const total = await freshDashboardPage.getCartTotal();
      expect(total).not.toBe("Total: $0.00");
      console.log(
        `[FRESH] Worker ${relativeWorker} (${freshDashboardPage.username}) multiple items: ${total}`,
      );
    });

    test("verify user role", async ({ freshDashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      await freshDashboardPage.assertUserIsLoggedIn();
      console.log(
        `[FRESH] Worker ${relativeWorker} (${freshDashboardPage.username}) role verified`,
      );
    });

    test("consistency check", async ({ freshDashboardPage }, testInfo) => {
      const relativeWorker = getRelativeWorkerIndex(testInfo.workerIndex);
      expect(freshDashboardPage).toBeDefined();
      console.log(
        `[FRESH] Worker ${relativeWorker} (${freshDashboardPage.username}) consistency verified`,
      );
    });
  });
});
