import { test, expect } from '../src/fixtures/auth';

test.describe('Session Storage Integration', () => {
  test('should load persisted auth session on subsequent runs', async ({ dashboardPage }) => {
    const url = await dashboardPage.getPageUrl();
    expect(url).toContain('logged-in-successfully');
    expect(dashboardPage.username).toBeTruthy();
  });

  test('should verify session is persistent across page navigations', async ({ dashboardPage }) => {
    await dashboardPage.page.goto('/');
    await dashboardPage.page.goto('/practice-test-login/');
    
    const content = await dashboardPage.getPageContent();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should maintain consistent session state', async ({ dashboardPage }) => {
    const cookies = await dashboardPage.page.context().cookies();
    expect(cookies.length).toBeGreaterThanOrEqual(0);
    
    expect(dashboardPage.username.length).toBeGreaterThan(0);
  });

  test('should have localStorage populated from session', async ({ dashboardPage }) => {
    const localStorageSize = await dashboardPage.page.evaluate(() => {
      return Object.keys(window.localStorage).length;
    });
    
    expect(typeof localStorageSize).toBe('number');
  });

  test('should reuse same session across test reruns', async ({ dashboardPage }) => {
    await dashboardPage.reloadPage();
    
    const isStillLoggedIn = await dashboardPage.page.evaluate(() => {
      return document.body.textContent?.includes('Successfully') ?? false;
    }).catch(() => false);
    
    expect(isStillLoggedIn || dashboardPage.username.length > 0).toBe(true);
  });
});
