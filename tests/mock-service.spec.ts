import { test, expect } from "@fixtures/common.fixture.js";

test.describe("DemoShop + MockService Web Tests", () => {
  
  test("mock login API and verify dashboard renders", async ({ page, mockService, baseURL }) => {
    mockService.addRule({
      id: "mock-login",
      description: "Intercept login API",
      condition: (url) => url.includes("/api/login"),
      action: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: { name: "Alice123", role: "student", token: "abc123", lastLogin: "2026-03-09" }
          }),
        });
      },
      priority: 10,
    });

    await mockService.applyMocks();
    await page.goto(baseURL || "/");

    // Fill login form
    await page.fill("#username", "alice");
    await page.fill("#password", "password");
    await page.click("#login-form button[type='submit']");

    // Wait for dashboard to show user greeting
    const greeting = await page.textContent("#user-greeting");
    expect(greeting).toContain("Alice");
    expect(greeting).toContain("student");
  });

  test("mock cart API and verify cart updates in DOM", async ({ page, mockService, baseURL }) => {
    mockService.addRule({
      id: "mock-cart",
      description: "Mock cart endpoint",
      condition: (url) => url.includes("/api/cart"),
      action: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ cart: [{ id: 1, name: "Laptop", price: 999.99 }] }),
        });
      },
      priority: 10,
    });

    await mockService.applyMocks();
    await page.goto(baseURL || "/");

    // Simulate logged-in user
    await page.evaluate(() => {
      sessionStorage.setItem(
        "session",
        JSON.stringify({ name: "Alice", role: "student", token: "abc123", lastLogin: "2026-03-09" })
      );
    });

    await page.reload();

    // Add item to cart triggers fetch -> mocked
    await page.click("#add-item-btn");

    const cartText = await page.textContent("#cart-items");
    expect(cartText).toContain("Laptop");
    const total = await page.textContent("#cart-total");
    expect(total).toContain("999.99");
  });

  test("sale banner appears and can be closed", async ({ page, baseURL }) => {
    await page.goto(baseURL || "/");

    // Check initial sale banner exists
    const banner = await page.locator("#saleBanner");
    await expect(banner).toBeVisible();

    // Click close button
    await page.click("#saleBanner .sale-banner-action");
    await expect(banner).toHaveCount(0);
  });

  test("admin login button fills and submits form", async ({ page, baseURL }) => {
    await page.goto(baseURL || "/");

    await page.click("#admin-login-btn");

    const greeting = await page.textContent("#user-greeting");
    expect(greeting).toContain("admin");
  });

});

test.describe("BasePage.getPageContent", () => {
  test("returns HTML content of login page before authentication", async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL || "/");

    const content = await page.content();

    expect(content).toContain("login-form");
    expect(content).toContain("username");
    expect(content).toContain("password");
    expect(content).toContain("login-page");
  });

  test("returns HTML with dashboard content after login", async ({
    page,
    mockService,
    baseURL,
  }) => {
    mockService.addRule({
      id: "mock-login",
      description: "Mock login endpoint",
      condition: (url) => url.includes("/api/login"),
      action: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: {
              name: "Alice",
              role: "student",
              token: "test_token",
              lastLogin: "2026-03-09",
            },
          }),
        });
      },
      priority: 10,
    });

    await mockService.applyMocks();
    await page.goto(baseURL || "/");

    await page.fill("#username", "alice");
    await page.fill("#password", "password");
    await page.click("#login-form button[type='submit']");

    await page.waitForSelector("#dashboard-page.active");

    const content = await page.content();

    expect(content).toContain("user-greeting");
    expect(content).toContain("dashboard-page");
    expect(content).toContain("cart-items");
  });

  test("contains sale banner HTML after page load", async ({
    page,
    baseURL,
  }) => {
    await page.goto(baseURL || "/");

    await page.waitForTimeout(500);

    const content = await page.content();

    expect(content).toContain("saleBanner");
    expect(content).toContain("sale-banner");
  });

  test("contains admin section in HTML for admin user", async ({
    page,
    mockService,
    baseURL,
  }) => {
    mockService.addRule({
      id: "mock-admin-login",
      description: "Mock admin login",
      condition: (url) => url.includes("/api/login"),
      action: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: {
              name: "Administrator",
              role: "admin",
              token: "admin_token",
              lastLogin: "2026-03-09",
            },
          }),
        });
      },
      priority: 10,
    });

    await mockService.applyMocks();
    await page.goto(baseURL || "/");

    await page.fill("#username", "admin");
    await page.fill("#password", "AdminPass");
    await page.click("#login-form button[type='submit']");

    await page.waitForSelector("#admin-section");

    const content = await page.content();

    expect(content).toContain("admin-section");
    expect(content).toContain("swagger-btn");
  });

  test("includes order history table for premium user", async ({
    page,
    mockService,
    baseURL,
  }) => {
    mockService.addRule({
      id: "mock-premium-login",
      description: "Mock premium user login",
      condition: (url) => url.includes("/api/login"),
      action: async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: {
              name: "Premium User",
              role: "premium",
              token: "premium_token",
              lastLogin: "2026-03-09",
            },
          }),
        });
      },
      priority: 10,
    });

    await mockService.applyMocks();
    await page.goto(baseURL || "/");

    await page.fill("#username", "testuser1");
    await page.fill("#password", "Password123");
    await page.click("#login-form button[type='submit']");

    await page.waitForSelector("#order-history");

    const content = await page.content();

    expect(content).toContain("order-history");
    expect(content).toContain("ORD-");
  });
});