// Demo E-commerce Site JavaScript
class DemoShop {
    constructor() {
        this.currentUser = null;
        this.cart = [];
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
        this.updateUI();
    }

    checkAuthStatus() {
        // Check if user is logged in via sessionStorage
        const userData = sessionStorage.getItem('user');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.showDashboard();
            } catch (e) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Add item button
        const addItemBtn = document.getElementById('add-item-btn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.addRandomItem());
        }

        // Clear cart button
        const clearCartBtn = document.getElementById('clear-cart-btn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => this.clearCart());
        }
    }

    handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Simple authentication - in real app this would be server-side
        const validUsers = {
            'student': { password: 'Password123', role: 'student', name: 'Student User' },
            'testuser1': { password: 'Password123', role: 'premium', name: 'Premium User 1' },
            'testuser2': { password: 'Password123', role: 'premium', name: 'Premium User 2' },
            'testuser3': { password: 'Password123', role: 'vip', name: 'VIP User 3' },
            'testuser4': { password: 'Password123', role: 'vip', name: 'VIP User 4' }
        };

        const user = validUsers[username];
        if (user && user.password === password) {
            this.currentUser = {
                username: username,
                name: user.name,
                role: user.role,
                lastLogin: new Date().toLocaleString()
            };

            // Store in sessionStorage
            sessionStorage.setItem('user', JSON.stringify(this.currentUser));

            // Store cart in sessionStorage if exists
            const savedCart = sessionStorage.getItem('cart');
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
            }

            this.showDashboard();
            this.clearLoginError();
        } else {
            this.showLoginError('Invalid username or password');
        }
    }

    handleLogout() {
        // Save cart before logout
        sessionStorage.setItem('cart', JSON.stringify(this.cart));

        // Clear user session
        sessionStorage.removeItem('user');
        this.currentUser = null;
        this.cart = [];
        this.showLogin();
    }

    showLogin() {
        document.getElementById('login-page').classList.add('active');
        document.getElementById('dashboard-page').classList.remove('active');
        this.updateNavbar();
    }

    showDashboard() {
        document.getElementById('login-page').classList.remove('active');
        document.getElementById('dashboard-page').classList.add('active');
        this.updateUI();
        this.updateNavbar();
    }

    updateUI() {
        if (!this.currentUser) return;

        // Update greeting
        const greeting = document.getElementById('user-greeting');
        if (greeting) {
            greeting.innerHTML = `<h3>Hello, ${this.currentUser.name}!</h3><p>You are logged in as a ${this.currentUser.role} user.</p>`;
        }

        // Update account info
        document.getElementById('account-type').textContent = this.currentUser.role.toUpperCase();
        document.getElementById('last-login').textContent = this.currentUser.lastLogin;

        // Update cart
        this.updateCartDisplay();

        // Update order history based on user role
        this.updateOrderHistory();
    }

    updateNavbar() {
        const userInfo = document.getElementById('user-info');
        if (this.currentUser) {
            userInfo.innerHTML = `<span>Welcome, ${this.currentUser.name} (${this.currentUser.role})</span>`;
        } else {
            userInfo.innerHTML = '';
        }
    }

    addRandomItem() {
        const items = [
            { name: 'Laptop', price: 999.99 },
            { name: 'Mouse', price: 29.99 },
            { name: 'Keyboard', price: 79.99 },
            { name: 'Monitor', price: 299.99 },
            { name: 'Headphones', price: 149.99 },
            { name: 'Webcam', price: 89.99 }
        ];

        const randomItem = items[Math.floor(Math.random() * items.length)];
        this.cart.push({
            id: Date.now(),
            ...randomItem
        });

        this.updateCartDisplay();
        this.saveCart();
    }

    updateCartDisplay() {
        const cartContainer = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');

        if (this.cart.length === 0) {
            cartContainer.innerHTML = '<p>Your cart is empty. Add some items!</p>';
            cartTotal.textContent = 'Total: $0.00';
            return;
        }

        let total = 0;
        cartContainer.innerHTML = this.cart.map(item => {
            total += item.price;
            return `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span>$${item.price.toFixed(2)}</span>
                    <button class="remove-btn" onclick="app.removeItem(${item.id})">×</button>
                </div>
            `;
        }).join('');

        cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    }

    removeItem(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.updateCartDisplay();
        this.saveCart();
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        this.saveCart();
    }

    saveCart() {
        sessionStorage.setItem('cart', JSON.stringify(this.cart));
    }

    updateOrderHistory() {
        const orderHistory = document.getElementById('order-history');

        // Mock order history based on user role
        const mockOrders = {
            'student': [
                { id: 'ORD-001', date: '2024-01-15', total: 129.99, status: 'Delivered' }
            ],
            'premium': [
                { id: 'ORD-002', date: '2024-01-20', total: 459.98, status: 'Shipped' },
                { id: 'ORD-003', date: '2024-01-10', total: 89.99, status: 'Delivered' }
            ],
            'vip': [
                { id: 'ORD-004', date: '2024-01-25', total: 1299.97, status: 'Processing' },
                { id: 'ORD-005', date: '2024-01-18', total: 349.98, status: 'Shipped' },
                { id: 'ORD-006', date: '2024-01-05', total: 199.99, status: 'Delivered' }
            ]
        };

        const userOrders = mockOrders[this.currentUser.role] || [];

        if (userOrders.length === 0) {
            orderHistory.innerHTML = '<p>No orders yet.</p>';
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
                    ${userOrders.map(order => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 0.5rem;">${order.id}</td>
                            <td style="padding: 0.5rem;">${order.date}</td>
                            <td style="padding: 0.5rem;">$${order.total.toFixed(2)}</td>
                            <td style="padding: 0.5rem;">${order.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    clearLoginError() {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
}

// Initialize the app
const app = new DemoShop();