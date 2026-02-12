import { BasePage } from './BasePage.js';
import { expect } from '@playwright/test';

export class DashboardPage extends BasePage {

  async assertDashboardLoaded(): Promise<void> {
    const dashboard = this.page.locator('#dashboard-page');
    await expect(dashboard).toHaveClass(/active/);
  }

  async getGreetingMessage(): Promise<string | null> {
    return this.getText('#user-greeting h3');
  }

  async assertUserIsLoggedIn(): Promise<void> {
    const greeting = this.page.locator('#user-greeting h3');
    await expect(greeting).toContainText('Hello');
  }

  async assertSessionActive(): Promise<void> {
    await this.assertUserIsLoggedIn();
  }

  async reloadPage(): Promise<void> {
    await this.page.reload();
  }

  async assertPageStructureValid(): Promise<void> {
    const dashboard = this.page.locator('#dashboard-page');
    await expect(dashboard).toBeVisible();
  }

  async getPageBody(): Promise<string | null> {
    return this.getText('#dashboard-page');
  }

  async assertBodyNotEmpty(): Promise<void> {
    const content = await this.getPageBody();
    expect(content?.length).toBeGreaterThan(0);
  }

  async getUserRole(): Promise<string | null> {
    return this.getText('#account-type');
  }

  async addItemToCart(): Promise<void> {
    await this.click('#add-item-btn');
  }

  async getCartTotal(): Promise<string | null> {
    return this.getText('#cart-total');
  }

  async clearCart(): Promise<void> {
    await this.click('#clear-cart-btn');
  }

  async logout(): Promise<void> {
    await this.click('#logout-btn');
  }

  async assertCartHasItems(): Promise<void> {
    const cartItems = this.page.locator('.cart-item');
    await expect(cartItems.first()).toBeVisible();
  }

  async assertOrderHistoryVisible(): Promise<void> {
    const orderTable = this.page.locator('#order-history table');
    await expect(orderTable).toBeVisible();
  }
}
