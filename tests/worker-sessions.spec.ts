import { test, expect } from '../src/fixtures/auth';

test.describe('Session Storage Demo with Multiple Workers', () => {
  test('worker gets assigned account round-robin', async ({ dashboardPage }, testInfo) => {
    const accountIndex = testInfo.workerIndex % 4; // We have 4 accounts now
    const expectedUsernames = ['student', 'testuser1', 'testuser2', 'testuser3'];

    expect(dashboardPage.username).toBe(expectedUsernames[accountIndex]);
    console.log(`Worker ${testInfo.workerIndex} assigned to ${dashboardPage.username}`);
  });

  test('each worker maintains independent session', async ({ dashboardPage }, testInfo) => {
    // Add item to cart - this should persist in sessionStorage
    await dashboardPage.addItemToCart();
    await dashboardPage.assertCartHasItems();

    const cartTotal = await dashboardPage.getCartTotal();
    expect(cartTotal).not.toBe('Total: $0.00');

    console.log(`Worker ${testInfo.workerIndex} (${dashboardPage.username}) has cart: ${cartTotal}`);
  });

  test('session storage persists across page reloads', async ({ dashboardPage }, testInfo) => {
    // Add item and reload
    await dashboardPage.addItemToCart();
    await dashboardPage.reloadPage();

    // Should still be logged in
    await dashboardPage.assertUserIsLoggedIn();

    console.log(`Worker ${testInfo.workerIndex} session persisted after reload`);
  });

  test('different user roles show different order history', async ({ dashboardPage }, testInfo) => {
    const role = await dashboardPage.getUserRole();
    await dashboardPage.assertOrderHistoryVisible();

    console.log(`Worker ${testInfo.workerIndex} (${dashboardPage.username}) has role: ${role}`);
  });
});
