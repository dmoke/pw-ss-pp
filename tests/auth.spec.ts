import { test, expect } from '../src/fixtures/auth';

test.describe('E-commerce Authentication & Cart Demo', () => {
  test('user can login and access dashboard', async ({ dashboardPage }) => {
    await dashboardPage.assertUserIsLoggedIn();
    await dashboardPage.assertDashboardLoaded();
  });

  test('user can view their account information', async ({ dashboardPage }) => {
    const role = await dashboardPage.getUserRole();
    expect(['STUDENT', 'PREMIUM', 'VIP']).toContain(role);
  });

  test('user can add items to cart', async ({ dashboardPage }) => {
    const initialTotal = await dashboardPage.getCartTotal();
    await dashboardPage.addItemToCart();
    await dashboardPage.assertCartHasItems();

    // Cart total should change
    const newTotal = await dashboardPage.getCartTotal();
    expect(newTotal).not.toBe(initialTotal);
  });

  test('user can view order history based on role', async ({ dashboardPage }) => {
    await dashboardPage.assertOrderHistoryVisible();
  });

  test('session persists after page reload', async ({ dashboardPage }) => {
    // Add item to cart
    await dashboardPage.addItemToCart();
    await dashboardPage.assertCartHasItems();

    // Reload page
    await dashboardPage.reloadPage();

    // Should still be logged in (session storage works)
    await dashboardPage.assertUserIsLoggedIn();

    // Note: Cart may not persist across reloads in this demo
    // but the user session does persist via sessionStorage
  });

  test('user can clear cart', async ({ dashboardPage }) => {
    await dashboardPage.addItemToCart();
    await dashboardPage.assertCartHasItems();

    await dashboardPage.clearCart();

    // Cart should be empty
    const total = await dashboardPage.getCartTotal();
    expect(total).toBe('Total: $0.00');
  });
});
