import express from "express";
import swaggerUi from "swagger-ui-express";
import bodyParser from "body-parser";

// simple in-memory state for demo purposes
const validUsers = {
  student: { password: "Password123", role: "student", name: "Student User" },
  testuser1: {
    password: "Password123",
    role: "premium",
    name: "Premium User 1",
  },
  testuser2: {
    password: "Password123",
    role: "premium",
    name: "Premium User 2",
  },
  testuser3: { password: "Password123", role: "vip", name: "VIP User 3" },
  testuser4: { password: "Password123", role: "vip", name: "VIP User 4" },
  admin: { password: "AdminPass", role: "admin", name: "Administrator" },
};

const app = express();
app.use(bodyParser.json());

// login endpoint
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = validUsers[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
  const session = {
    username,
    name: user.name,
    role: user.role,
    token: `token_${username}_${now.getTime()}`,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastLogin: now.toLocaleString(),
  };

  res.json({ session });
});

// simple cart state stored by token (not secure, just for demo)
const carts = {};

app.get("/api/cart", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || "";
  res.json({ cart: carts[token] || [] });
});

app.post("/api/cart", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || "";
  const item = req.body;
  if (!item || !item.name) {
    return res.status(400).json({ error: "Missing item" });
  }
  carts[token] = carts[token] || [];
  carts[token].push({ id: Date.now(), ...item });
  res.json({ success: true, cart: carts[token] });
});

app.get("/api/orders", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "") || "";
  const role = Object.values(validUsers).find(
    (u) => `token_${u}` === token,
  )?.role;
  res.json({ orders: [] });
});

const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "Demo Shop API", version: "1.0.0" },
  paths: {
    "/api/login": {
      post: {
        summary: "Authenticate user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  username: { type: "string" },
                  password: { type: "string" },
                },
                required: ["username", "password"],
              },
            },
          },
        },
        responses: {
          200: { description: "Returns session info" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/cart": {
      get: {
        summary: "Retrieve cart for authenticated user",
        responses: { 200: { description: "Cart contents" } },
      },
      post: {
        summary: "Add an item to cart",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { 200: { description: "Updated cart" } },
      },
    },
    "/api/orders": {
      get: {
        summary: "List orders",
        responses: { 200: { description: "Order list" } },
      },
    },
  },
};

app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// serve the static front-end from site directory
app.use(express.static("site"));

let server;
export async function start(port = 3000) {
  return new Promise((resolve) => {
    server = app.listen(port, () => {
      console.log(`Demo server listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

export async function stop() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

if (process.env.NODE_ENV !== "test") {
  start(3000);
}

export default app;
