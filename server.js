const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple authentication middleware
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }

  const [type, credentials] = auth.split(' ');
  if (type !== 'Basic') {
    return res.status(401).send('Basic authentication required');
  }

  const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');

  // Multiple admin users
  const validUsers = [
    { username: 'family', password: 'perfume2026' },
    { username: 'admin', password: 'admin123' },
    { username: 'friend', password: 'friend2026' }
  ];

  const isValidUser = validUsers.some(user =>
    user.username === username && user.password === password
  );

  if (!isValidUser) {
    return res.status(401).send('Invalid credentials');
  }

  next();
};

// Protect admin routes only
app.use("/api/admin", authMiddleware);

// Protect admin.html page
app.get("/admin.html", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// Simple admin page - no authentication required for easy access
app.get("/simple-admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple-admin.html"));
});

// Business dashboard - requires authentication
app.get("/business-dashboard.html", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "business-dashboard.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let orders = [];

app.get("/api/products", (req, res) => {
  const file = path.join(__dirname, "data", "products.json");
  if (!fs.existsSync(file)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(file, "utf-8")));
});

app.post("/api/order", async (req, res) => {
  const { customer, items, total, paymentMethod, phone, shippingAddress, transactionId } = req.body || {};

  if (!items || !total || !paymentMethod) {
    return res.status(400).json({ success: false, message: "Missing required order information" });
  }

  try {
    // Load existing orders
    const ordersFile = path.join(__dirname, "data", "orders.json");
    let ordersData = { orders: [], nextOrderId: 1 };
    if (fs.existsSync(ordersFile)) {
      ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    }

    // Create unique random order ID
    let orderId;
    let isUnique = false;
    while (!isUnique) {
      orderId = Math.floor(100000 + Math.random() * 900000); // 6-digit random
      if (!ordersData.orders.some(o => o.id == orderId)) {
        isUnique = true;
      }
    }

    // Create new order
    const newOrder = {
      id: orderId,
      customer: customer || { name: "Guest", email: "guest@example.com" },
      items,
      total,
      paymentMethod,
      phone,
      shippingAddress,
      transactionId: transactionId || null,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save order
    ordersData.orders.push(newOrder);
    fs.writeFileSync(ordersFile, JSON.stringify(ordersData, null, 2));

    console.log("New order created:", newOrder);
    res.json({ success: true, orderId: newOrder.id, order: newOrder });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
});

// Get all orders (admin only)
app.get("/api/admin/orders", authMiddleware, (req, res) => {
  try {
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.json({ orders: [] });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    res.json(ordersData);
  } catch (error) {
    console.error("Error loading orders:", error);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Update order status (admin only)
app.put("/api/admin/orders/:orderId", authMiddleware, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!["pending", "processing", "shipped", "delivered", "cancelled"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  try {
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.status(404).json({ success: false, message: "Orders file not found" });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    const orderIndex = ordersData.orders.findIndex(o => o.id == orderId);

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    ordersData.orders[orderIndex].status = status;
    ordersData.orders[orderIndex].updatedAt = new Date().toISOString();

    fs.writeFileSync(ordersFile, JSON.stringify(ordersData, null, 2));

    console.log(`Order ${orderId} updated to status: ${status}`);
    res.json({ success: true, order: ordersData.orders[orderIndex] });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
});

// Update order transaction code (User side)
app.post("/api/order/:orderId/transaction", (req, res) => {
  const { orderId } = req.params;
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ success: false, message: "Transaction ID is required" });
  }

  try {
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.status(404).json({ success: false, message: "Orders file not found" });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    const orderIndex = ordersData.orders.findIndex(o => String(o.id) === String(orderId));

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    ordersData.orders[orderIndex].transactionId = transactionId;
    ordersData.orders[orderIndex].updatedAt = new Date().toISOString();

    fs.writeFileSync(ordersFile, JSON.stringify(ordersData, null, 2));

    console.log(`Transaction ID updated for Order ${orderId}: ${transactionId}`);
    res.json({ success: true, message: "Transaction ID saved" });
  } catch (error) {
    console.error("Error updating transaction ID:", error);
    res.status(500).json({ success: false, message: "Failed to save transaction ID" });
  }
});

// User Registration
app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, password } = req.body || {};

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  try {
    const usersFile = path.join(__dirname, "data", "users.json");
    let usersData = { users: [], nextUserId: 1 };
    if (fs.existsSync(usersFile)) {
      usersData = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
    }

    // Check if user already exists
    const existingUser = usersData.users.find(u => u.email === email || u.phone === phone);
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email or phone already exists" });
    }

    // Create new user
    const newUser = {
      id: usersData.nextUserId++,
      name,
      email,
      phone,
      password, // In production, hash this password
      wishlist: [],
      createdAt: new Date().toISOString()
    };

    usersData.users.push(newUser);
    fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

// Create endpoint for checking status
app.get("/api/order/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.json({ status: 'pending' });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    const order = ordersData.orders.find(o => String(o.id) === String(id));

    if (order) {
      res.json({ status: order.status });
    } else {
      res.json({ status: 'pending' });
    }
  } catch (err) {
    res.json({ status: 'pending' });
  }
});

// Admin: Update Order Status
app.post("/api/admin/order/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.status(404).json({ success: false, message: "Orders file not found" });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    const orderIndex = ordersData.orders.findIndex(o => String(o.id) === String(id));

    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    ordersData.orders[orderIndex].status = status;
    ordersData.orders[orderIndex].updatedAt = new Date().toISOString();

    fs.writeFileSync(ordersFile, JSON.stringify(ordersData, null, 2));

    console.log(`Order ${id} status updated to: ${status}`);
    res.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

// User Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  try {
    const usersFile = path.join(__dirname, "data", "users.json");
    if (!fs.existsSync(usersFile)) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const usersData = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
    const user = usersData.users.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// Get user orders
app.get("/api/user/orders/:userId", (req, res) => {
  const { userId } = req.params;

  try {
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.json({ orders: [] });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    const userOrders = ordersData.orders.filter(order =>
      order.customer && order.customer.email === userId
    );

    res.json({ orders: userOrders });
  } catch (error) {
    console.error("Error loading user orders:", error);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// Get order tracking status
app.get("/api/order/track/:id", (req, res) => {
  const { id } = req.params;
  try {
    const ordersFile = path.join(__dirname, "data", "orders.json");
    if (!fs.existsSync(ordersFile)) return res.status(404).json({ success: false, message: "No orders found" });

    const ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    const order = ordersData.orders.find(o => o.id == id);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Return only necessary info for tracking
    res.json({
      id: order.id,
      status: order.status || "pending",
      total: order.total,
      transactionId: order.transactionId || null,
      createdAt: order.createdAt
    });
  } catch (error) {
    console.error("Tracking error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch tracking info" });
  }
});

// Update wishlist
app.post("/api/user/wishlist/:userId", (req, res) => {
  const { userId } = req.params;
  const { productId } = req.body || {};

  if (!productId) {
    return res.status(400).json({ success: false, message: "Product ID is required" });
  }

  try {
    const usersFile = path.join(__dirname, "data", "users.json");
    if (!fs.existsSync(usersFile)) return res.status(404).json({ success: false, message: "User not found" });

    const usersData = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
    const userIndex = usersData.users.findIndex(u => u.email === userId);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = usersData.users[userIndex];
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
    }

    fs.writeFileSync(usersFile, JSON.stringify(usersData, null, 2));
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    console.error("Error updating wishlist:", error);
    res.status(500).json({ success: false, message: "Failed to update wishlist" });
  }
});

app.post("/api/contact", (req, res) => {
  console.log("Contact submitted:", req.body);
  res.json({ success: true });
});


// Admin: Update stock
app.post("/api/admin/update-stock", (req, res) => {
  const { productId, change, stock } = req.body || {};
  const file = path.join(__dirname, "data", "products.json");

  try {
    const products = JSON.parse(fs.readFileSync(file, "utf-8"));
    const product = products.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (typeof stock === 'number') {
      product.stock = Math.max(0, stock);
    } else if (typeof change === 'number') {
      product.stock = Math.max(0, product.stock + change);
    }

    fs.writeFileSync(file, JSON.stringify(products, null, 2));
    res.json({ success: true, stock: product.stock });
  } catch (error) {
    console.error("Stock update error:", error);
    res.status(500).json({ success: false, message: "Failed to update stock" });
  }
});

// Admin: Add new product
app.post("/api/admin/add-product", (req, res) => {
  const { name, category, price, desc, stock } = req.body || {};
  const file = path.join(__dirname, "data", "products.json");

  if (!name || !category || !price || !desc || stock === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const products = JSON.parse(fs.readFileSync(file, "utf-8"));

    // Generate new ID
    const prefix = category === 'women' ? 'w' : 'm';
    const existingIds = products
      .filter(p => p.id.startsWith(prefix))
      .map(p => parseInt(p.id.substring(1)))
      .filter(n => !isNaN(n));
    const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const newId = `${prefix}${nextNum}`;

    const newProduct = {
      id: newId,
      name,
      price: parseInt(price),
      desc,
      category,
      stock: parseInt(stock)
    };

    products.push(newProduct);
    fs.writeFileSync(file, JSON.stringify(products, null, 2));

    res.json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ success: false, message: "Failed to add product" });
  }
});

// Order notifications
app.post("/api/admin/notify-delivery", async (req, res) => {
  const { phone, orderDetails, status } = req.body || {};

  if (!phone || !status) {
    return res.status(400).json({ success: false, message: "Missing phone or status" });
  }

  try {
    // Use Safaricom SMS API (requires additional setup)
    // For now, log the notification
    console.log(`Delivery notification to ${phone}: ${status}`);
    console.log("Order details:", orderDetails);

    // TODO: Integrate with SMS API (Africa's Talking, Twilio, or Safaricom)
    // Example: await sendSMS(phone, `Your order is ${status}. Thank you for shopping with First Class Perfume!`);

    res.json({ success: true, message: "Notification logged (SMS integration pending)" });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ success: false, message: "Failed to send notification" });
  }
});

// Ratings: optional server-side storage (front-end also uses localStorage)
let ratings = {};
app.get("/api/ratings", (req, res) => {
  res.json(ratings);
});
app.post("/api/ratings", (req, res) => {
  const { productId, stars, review } = req.body || {};
  if (productId && stars >= 1 && stars <= 5) {
    ratings[productId] = { stars, review: review || "" };
  }
  res.json({ success: true });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Force rebuild
