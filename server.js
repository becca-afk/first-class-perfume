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
  const { customer, items, total, paymentMethod, phone, shippingAddress } = req.body || {};

  if (!customer || !items || !total || !paymentMethod) {
    return res.status(400).json({ success: false, message: "Missing required order information" });
  }

  try {
    // Load existing orders
    const ordersFile = path.join(__dirname, "data", "orders.json");
    let ordersData = { orders: [], nextOrderId: 1 };
    if (fs.existsSync(ordersFile)) {
      ordersData = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
    }

    // Create new order
    const newOrder = {
      id: ordersData.nextOrderId++,
      customer,
      items,
      total,
      paymentMethod,
      phone,
      shippingAddress,
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

// ==========================================
// M-PESA DARAJA API (CLEAN RESTART)
// ==========================================

const getMpesaConfig = () => {
  const env = process.env.MPESA_ENV || "sandbox";
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY || "7Zus5jaGgRDF9csIAcT8THhA2aeT73gdColM6Xjyu07DGIAt",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "cENbJBAKXqvO7sflcN1VNy2ZLb4EaxmwGczOlaziRGNJjiK77er3LkggNEKG2xRs",
    shortCode: process.env.MPESA_SHORTCODE || "174379",
    passkey: process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    env: env,
    baseUrl: env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"
  };
};

// 1. Get Access Token
const getMpesaToken = async () => {
  const config = getMpesaConfig();
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");

  console.log(`[M-Pesa] Fetching token from ${config.env} environment...`);

  try {
    const response = await axios.get(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    return response.data.access_token;
  } catch (error) {
    const detail = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("[M-Pesa] Auth Error:", detail);
    throw new Error(`Authentication Failed: ${detail}`);
  }
};

// 2. STK Push Route
app.post("/api/mpesa/request", async (req, res) => {
  const { phone, amount } = req.body || {};
  if (!phone || !amount) return res.status(400).json({ success: false, message: "Phone and amount required" });

  try {
    const config = getMpesaConfig();
    const token = await getMpesaToken();

    // Generate Timestamp (YYYYMMDDHHmmss)
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(config.shortCode + config.passkey + timestamp).toString("base64");

    // Phone Normalization (0712... -> 254712...)
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "254" + cleanPhone.substring(1);
    if (cleanPhone.length === 9) cleanPhone = "254" + cleanPhone;
    if (!cleanPhone.startsWith("254")) cleanPhone = "254" + cleanPhone;

    // Callback URL (Must be HTTPS for Safaricom)
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    let callbackUrl = `${protocol}://${host}/api/mpesa/callback`;

    // Fallback for local testing (Safaricom can't see localhost)
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      callbackUrl = "https://first-class-perfume.onrender.com/api/mpesa/callback";
    }

    console.log(`[M-Pesa] Sending Push to ${cleanPhone} (KES ${amount})`);

    const data = {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: cleanPhone,
      PartyB: config.shortCode,
      PhoneNumber: cleanPhone,
      CallBackURL: callbackUrl,
      AccountReference: "FirstClassPerfume",
      TransactionDesc: "Order Payment"
    };

    const response = await axios.post(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("[M-Pesa] Push Status:", response.data.ResponseDescription);
    res.json({ Success: true, message: response.data.CustomerMessage, data: response.data });

  } catch (error) {
    const detail = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("[M-Pesa] Flow Error:", detail);

    let msg = "Request failed.";
    if (error.message.includes("Authentication Failed")) msg = "Invalid API Credentials.";
    else if (error.response && error.response.data) msg = error.response.data.errorMessage || error.response.data.ResponseDescription;

    res.status(500).json({ Success: false, errorMessage: `Safaricom says: ${msg}` });
  }
});

// 3. Callback Route
app.post("/api/mpesa/callback", (req, res) => {
  console.log("[M-Pesa] Callback Received:", JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// 4. Test Configuration Route
app.get("/api/mpesa/test", async (req, res) => {
  const config = getMpesaConfig();
  try {
    const token = await getMpesaToken();
    res.json({
      status: "STK_READY",
      environment: config.env,
      shortcode: config.shortCode,
      token_check: "Token successfully generated",
      callback_prediction: `https://${req.get('host')}/api/mpesa/callback`
    });
  } catch (err) {
    res.status(500).json({
      status: "CONFIG_ERROR",
      error: err.message,
      hint: "Check your Consumer Key and Secret in .env"
    });
  }
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

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
