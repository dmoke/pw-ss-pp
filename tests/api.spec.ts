import { test, expect } from "@fixtures/common.fixture.js";

test.describe("API demo endpoints", () => {
  test("login succeeds with valid credentials", async ({ apiManager }) => {
    const resp = await apiManager.post("/api/login", {
      data: { username: "student", password: "Password123" },
    });
    expect(resp.status).toBe(200);
    const body = resp.body;
    expect(body.session).toBeTruthy();
    expect(body.session.username).toBe("student");
    expect(body.session.token).toMatch(/token_student_/);
  });

  test("login fails with wrong password", async ({ apiManager }) => {
    const resp = await apiManager.post("/api/login", {
      data: { username: "student", password: "bad" },
    });
    expect(resp.status).toBe(401);
    const body = resp.body;
    expect(body.error).toBe("Invalid credentials");
  });

  test("cart endpoints return expected structure", async ({ apiManager }) => {
    const loginResp = await apiManager.post("/api/login", {
      data: { username: "student", password: "Password123" },
    });
    const session = loginResp.body.session;
    const token = session.token;

    const getCart = await apiManager.get("/api/cart", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getCart.status).toBe(200);
    const cartBody = getCart.body;
    expect(Array.isArray(cartBody.cart)).toBe(true);

    const add = await apiManager.post("/api/cart", {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Gizmo", price: 19.99 },
    });
    expect(add.status).toBe(200);
    const added = add.body;
    expect(added.cart.length).toBeGreaterThan(0);
  });

  test("swagger page is reachable by browser", async ({ page }) => {
    await page.goto("/");
    await page.fill("#username", "admin");
    await page.fill("#password", "AdminPass");
    await page.click('button[type="submit"]');
    await page.waitForSelector("#admin-section");
    const [newPage] = await Promise.all([
      page.context().waitForEvent("page"),
      page.click("#swagger-btn"),
    ]);
    await newPage.waitForURL("**/swagger/");
    await expect(newPage.locator("text=Demo Shop API")).toBeVisible();
  });
});
