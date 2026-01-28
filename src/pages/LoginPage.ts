import { BasePage } from './BasePage';
import { expect } from '@playwright/test';

export class LoginPage extends BasePage {
  async navigateToLogin(): Promise<void> {
    await this.goto('/');
  }

  async login(username: string, password: string): Promise<void> {
    await this.fill('#username', username);
    await this.fill('#password', password);
    await this.click('button[type="submit"]');
  }

  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForSelector('#dashboard-page.active', { timeout: 10000 });
  }

  async assertLoggedIn(): Promise<void> {
    const greeting = this.page.locator('#user-greeting h3');
    await expect(greeting).toContainText('Hello');
  }

  async assertLoginError(): Promise<boolean> {
    return this.waitForElement('#login-error', 5000);
  }

  async getErrorMessage(): Promise<string | null> {
    return this.getText('#login-error');
  }

  async isLoginPageVisible(): Promise<boolean> {
    return this.isVisible('#login-form');
  }

  async isPasswordFieldVisible(): Promise<boolean> {
    return this.isVisible('#password');
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return this.isVisible('button[type="submit"]');
  }
}
