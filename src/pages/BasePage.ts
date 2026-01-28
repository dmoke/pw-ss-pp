import { Page } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly username: string;

  constructor(page: Page, username: string) {
    this.page = page;
    this.username = username;
  }

  async goto(path: string = ''): Promise<void> {
    await this.page.goto(path || '/');
  }

  async waitForNavigation(urlPattern?: string): Promise<void> {
    if (urlPattern) {
      await this.page.waitForURL(urlPattern);
    } else {
      await this.page.waitForLoadState('networkidle');
    }
  }

  async getPageTitle(): Promise<string | null> {
    return this.page.title();
  }

  async getPageUrl(): Promise<string> {
    return this.page.url();
  }

  async getPageContent(): Promise<string> {
    return this.page.content();
  }

  protected async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  protected async fill(selector: string, text: string): Promise<void> {
    await this.page.fill(selector, text);
  }

  protected async getText(selector: string): Promise<string | null> {
    return this.page.textContent(selector);
  }

  protected async isVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    return this.page.locator(selector).isVisible({ timeout }).catch(() => false);
  }

  protected async waitForElement(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }
}
