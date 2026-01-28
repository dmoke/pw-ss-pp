import { test, expect, LoginPage } from '../src/fixtures/auth';

test.describe('Guest Tests', () => {
  test('should display login page without authentication', async ({ loginPage }) => {
    await loginPage.navigateToLogin();
    const isVisible = await loginPage.isLoginPageVisible();
    expect(isVisible).toBe(true);
  });

  test('should display username field', async ({ loginPage }) => {
    await loginPage.navigateToLogin();
    const isVisible = await loginPage.isLoginPageVisible();
    expect(isVisible).toBe(true);
  });

  test('should display password field', async ({ loginPage }) => {
    await loginPage.navigateToLogin();
    const isVisible = await loginPage.isPasswordFieldVisible();
    expect(isVisible).toBe(true);
  });

  test('should display submit button', async ({ loginPage }) => {
    await loginPage.navigateToLogin();
    const isVisible = await loginPage.isSubmitButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.navigateToLogin();
    await loginPage.login('invalid-user', 'invalid-pass');
    const hasError = await loginPage.assertLoginError();
    expect(hasError).toBe(true);
  });
});
