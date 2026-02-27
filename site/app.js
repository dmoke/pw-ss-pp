// Demo E-commerce Site JavaScript
class DemoShop {
  constructor() {
    this.currentUser = null;
    this.cart = [];
    this.loginCount = 0;
    this.init();
  }

  init() {
    // Load login count from localStorage
    this.loginCount = parseInt(localStorage.getItem("loginCount") || "0");
    this.checkAuthStatus();
    this.setupEventListeners();
    this.updateUI();
    // start sale banner cycle that injects banner every 10 seconds
    this.startSaleBannerCycle();
  }

  checkAuthStatus() {
    // Check if user is logged in via sessionStorage
    const sessionData = sessionStorage.getItem("session");
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const expiresAt = new Date(session.expiresAt);
        const now = new Date();

        // Check if session is still valid (not expired)
        if (expiresAt > now) {
          this.currentUser = session;
          this.showDashboard();
        } else {
          // Session expired
          sessionStorage.removeItem("session");
          this.showLogin();
        }
      } catch (e) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    // Admin login shortcut button
    const adminBtn = document.getElementById("admin-login-btn");
    if (adminBtn) {
      adminBtn.addEventListener("click", () => this.loginAsAdmin());
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Add item button
    const addItemBtn = document.getElementById("add-item-btn");
    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => this.addRandomItem());
    }

    // Clear cart button
    const clearCartBtn = document.getElementById("clear-cart-btn");
    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", () => this.clearCart());
    }

    // swagger docs button (only visible to admin)
    const swaggerBtn = document.getElementById("swagger-btn");
    if (swaggerBtn) {
      swaggerBtn.addEventListener("click", () => {
        window.open("/swagger", "_blank");
      });
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!resp.ok) {
        this.showLoginError("Invalid username or password");
        return;
      }

      const { session } = await resp.json();

      // update login count locally for metrics
      this.loginCount++;
      localStorage.setItem("loginCount", this.loginCount.toString());
      console.log(
        `🔐 LOGIN REQUEST #${this.loginCount}: User ${username} logged in`,
      );

      this.currentUser = session;

      // Store session with token in sessionStorage
      sessionStorage.setItem("session", JSON.stringify(this.currentUser));

      // Store cart in sessionStorage if exists
      const savedCart = sessionStorage.getItem("cart");
      if (savedCart) {
        this.cart = JSON.parse(savedCart);
      }

      this.showDashboard();
      this.clearLoginError();
    } catch (err) {
      console.error("login error", err);
      this.showLoginError("Unable to reach server");
    }
  }

  handleLogout() {
    // Save cart before logout
    sessionStorage.setItem("cart", JSON.stringify(this.cart));

    // Clear user session
    sessionStorage.removeItem("session");
    this.currentUser = null;
    this.cart = [];
    this.showLogin();
  }

  showLogin() {
    document.getElementById("login-page").classList.add("active");
    document.getElementById("dashboard-page").classList.remove("active");
    this.updateNavbar();
  }

  showDashboard() {
    document.getElementById("login-page").classList.remove("active");
    document.getElementById("dashboard-page").classList.add("active");
    this.updateUI();
    this.updateNavbar();
  }

  updateUI() {
    if (!this.currentUser) return;

    // Update greeting
    const greeting = document.getElementById("user-greeting");
    if (greeting) {
      greeting.innerHTML = `<h3>Hello, ${this.currentUser.name}!</h3><p>You are logged in as a ${this.currentUser.role} user.</p>`;
    }

    // Update account info
    document.getElementById("account-type").textContent =
      this.currentUser.role.toUpperCase();
    document.getElementById("last-login").textContent =
      this.currentUser.lastLogin;

    // Update cart
    this.updateCartDisplay();

    // Update order history based on user role
    this.updateOrderHistory();

    // reveal admin section if appropriate
    const adminSection = document.getElementById("admin-section");
    if (adminSection) {
      adminSection.style.display =
        this.currentUser.role === "admin" ? "block" : "none";
    }
  }

  // sale banner cycle implementation
  startSaleBannerCycle() {
    const showBanner = () => {
      if (!document.getElementById("saleBanner")) {
        const banner = document.createElement("div");
        banner.id = "saleBanner";
        banner.className = "sale-banner";
        // include an action button inside, styled with existing .btn classes
        banner.innerHTML = `🎉 Sale ongoing! <button class="btn btn-primary sale-banner-action">Close</button>`;
        // remove itself when the button is clicked (mimics closing)
        banner
          .querySelector(".sale-banner-action")
          ?.addEventListener("click", () => {
            banner.remove();
          });
        document.body.appendChild(banner);
      }
    };
    // show immediately, then every 10 seconds
    showBanner();
    setInterval(showBanner, 10_000);
  }

  updateNavbar() {
    const userInfo = document.getElementById("user-info");
    if (this.currentUser) {
      let text = `Welcome, ${this.currentUser.name} (${this.currentUser.role})`;
      if (this.currentUser.role === "admin") {
        text += " - Admin";
      }
      userInfo.innerHTML = `<span>${text}</span>`;
    } else {
      userInfo.innerHTML = "";
    }
  }

  async addRandomItem() {
    const items = [
      { name: "Laptop", price: 999.99 },
      { name: "Mouse", price: 29.99 },
      { name: "Keyboard", price: 79.99 },
      { name: "Monitor", price: 299.99 },
      { name: "Headphones", price: 149.99 },
      { name: "Webcam", price: 89.99 },
    ];

    const randomItem = items[Math.floor(Math.random() * items.length)];

    if (this.currentUser && this.currentUser.token) {
      try {
        const resp = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.currentUser.token}`,
          },
          body: JSON.stringify(randomItem),
        });
        if (resp.ok) {
          const body = await resp.json();
          this.cart = body.cart;
        }
      } catch (e) {
        console.error("cart api error", e);
      }
    } else {
      this.cart.push({
        id: Date.now(),
        ...randomItem,
      });
    }

    this.updateCartDisplay();
    this.saveCart();
  }

  async updateCartDisplay() {
    const cartContainer = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");

    // fetch latest from api if logged in
    if (this.currentUser && this.currentUser.token) {
      try {
        const resp = await fetch("/api/cart", {
          headers: { Authorization: `Bearer ${this.currentUser.token}` },
        });
        if (resp.ok) {
          const body = await resp.json();
          this.cart = body.cart;
        }
      } catch (e) {
        console.error("cart fetch error", e);
      }
    }

    if (this.cart.length === 0) {
      cartContainer.innerHTML = "<p>Your cart is empty. Add some items!</p>";
      cartTotal.textContent = "Total: $0.00";
      return;
    }

    let total = 0;
    cartContainer.innerHTML = this.cart
      .map((item) => {
        total += item.price;
        return `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span>$${item.price.toFixed(2)}</span>
                    <button class="remove-btn" onclick="app.removeItem(${item.id})">×</button>
                </div>
            `;
      })
      .join("");

    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
  }

  removeItem(itemId) {
    this.cart = this.cart.filter((item) => item.id !== itemId);
    this.updateCartDisplay();
    this.saveCart();
  }

  clearCart() {
    this.cart = [];
    this.updateCartDisplay();
    this.saveCart();
  }

  saveCart() {
    sessionStorage.setItem("cart", JSON.stringify(this.cart));
  }

  updateOrderHistory() {
    const orderHistory = document.getElementById("order-history");

    // Mock order history based on user role
    const mockOrders = {
      student: [
        {
          id: "ORD-001",
          date: "2024-01-15",
          total: 129.99,
          status: "Delivered",
        },
      ],
      premium: [
        { id: "ORD-002", date: "2024-01-20", total: 459.98, status: "Shipped" },
        {
          id: "ORD-003",
          date: "2024-01-10",
          total: 89.99,
          status: "Delivered",
        },
      ],
      vip: [
        {
          id: "ORD-004",
          date: "2024-01-25",
          total: 1299.97,
          status: "Processing",
        },
        { id: "ORD-005", date: "2024-01-18", total: 349.98, status: "Shipped" },
        {
          id: "ORD-006",
          date: "2024-01-05",
          total: 199.99,
          status: "Delivered",
        },
      ],
    };

    const userOrders = mockOrders[this.currentUser.role] || [];

    if (userOrders.length === 0) {
      orderHistory.innerHTML = "<p>No orders yet.</p>";
      return;
    }

    orderHistory.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #ddd;">
                        <th style="text-align: left; padding: 0.5rem;">Order ID</th>
                        <th style="text-align: left; padding: 0.5rem;">Date</th>
                        <th style="text-align: left; padding: 0.5rem;">Total</th>
                        <th style="text-align: left; padding: 0.5rem;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${userOrders
                      .map(
                        (order) => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${order.id}</td>
                            <td style="padding: 0.5rem;">${order.date}</td>
                            <td style="padding: 0.5rem;">$${order.total.toFixed(2)}</td>
                            <td style="padding: 0.5rem;">${order.status}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  }

  showLoginError(message) {
    const errorDiv = document.getElementById("login-error");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
    }
  }

  clearLoginError() {
    const errorDiv = document.getElementById("login-error");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  }

  // convenience method used by the admin login button
  loginAsAdmin() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    if (usernameInput && passwordInput) {
      usernameInput.value = "admin";
      passwordInput.value = "AdminPass";
      const loginForm = document.getElementById("login-form");
      if (loginForm) {
        loginForm.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true }),
        );
      }
    }
  }
}

// Initialize the app
// Initialize the app and expose it globally for testing
window.demoShop = new DemoShop();
