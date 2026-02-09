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

app.post("/api/order", (req, res) => {
  const order = { id: orders.length + 1, ...req.body };
  orders.push(order);
  res.json({ success: true, orderId: order.id });
});

app.post("/api/contact", (req, res) => {
  console.log("Contact submitted:", req.body);
  res.json({ success: true });
});

// M-Pesa Configuration Test
app.get("/api/mpesa/test", (req, res) => {
  res.json({
    configured: {
      consumer_key: !!process.env.MPESA_CONSUMER_KEY,
      consumer_secret: !!process.env.MPESA_CONSUMER_SECRET,
      shortcode: !!process.env.MPESA_SHORTCODE,
      passkey: !!process.env.MPESA_PASSKEY,
      env: process.env.MPESA_ENV || "sandbox"
    },
    message: process.env.MPESA_CONSUMER_KEY ? 
      "M-Pesa is configured" : 
      "M-Pesa credentials missing - check .env file"
  });
});

// M-Pesa Daraja API Implementation
const getAccessToken = async () => {
  // Use hardcoded sandbox credentials for testing
  const consumer_key = process.env.MPESA_CONSUMER_KEY || "3nYb7Q2R0lWg4G4J9Gh8mHj3Zv6k7D1";
  const consumer_secret = process.env.MPESA_CONSUMER_SECRET || "0pL8vN2kR9mW7G4J9Gh8mHj3Zv6k7D1";
  const mpesa_env = process.env.MPESA_ENV || "sandbox";
  const url = mpesa_env === "production"
    ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = "Basic " + Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");
  try {
    const response = await axios.get(url, { headers: { Authorization: auth } });
    return response.data.access_token;
  } catch (error) {
    console.error("Access Token Error:", error.response ? error.response.data : error.message);
    throw error;
  }
};

app.post("/api/mpesa/request", async (req, res) => {
  const { phone, amount } = req.body || {};
  if (!phone || !amount) return res.status(400).json({ success: false, message: "Missing phone or amount" });

  // Use hardcoded sandbox credentials for testing
  const consumer_key = process.env.MPESA_CONSUMER_KEY || "3nYb7Q2R0lWg4G4J9Gh8mHj3Zv6k7D1";
  const consumer_secret = process.env.MPESA_CONSUMER_SECRET || "0pL8vN2kR9mW7G4J9Gh8mHj3Zv6k7D1";
  const shortCode = process.env.MPESA_SHORTCODE || "174379";
  const passkey = process.env.MPESA_PASSKEY || "bfb279c9769943b5f91a68735e1c7c";

  // Debug logging
  console.log("M-Pesa Request:", { phone, amount });
  console.log("Using credentials:", {
    consumer_key: consumer_key.substring(0, 10) + "...",
    consumer_secret: consumer_secret.substring(0, 10) + "...",
    shortcode: shortCode,
    passkey: passkey.substring(0, 10) + "...",
    env: process.env.MPESA_ENV || "sandbox"
  });

  try {
    const token = await getAccessToken();
    const date = new Date();
    const timestamp = date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

    const mpesa_env = process.env.MPESA_ENV || "sandbox";
    const transaction_type = process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";
    const stk_url = mpesa_env === "production"
      ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
      : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const host = req.get('host');
    const callbackUrl = `https://${host}/api/mpesa/callback`;

    const data = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: transaction_type,
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: "FirstClassPerfume",
      TransactionDesc: "Payment for Perfume"
    };

    console.log("Sending to M-Pesa:", { stk_url, data: { ...data, Password: "***" } });

    const response = await axios.post(stk_url, data, { headers: { Authorization: "Bearer " + token } });
    console.log("STK Push Response:", response.data);

    if (response.data.ResponseCode === "0") {
      res.json({ Success: true, message: "Prompt sent to your phone!", data: response.data });
    } else {
      res.status(500).json({ Success: false, errorMessage: `Safaricom Error: ${response.data.ResponseDescription}` });
    }
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error("STK Push Error:", errorData);

    let userMessage = "M-Pesa request failed.";
    if (error.response && error.response.data) {
      userMessage = `Safaricom says: ${error.response.data.errorMessage || error.response.data.ResponseDescription || "Invalid request"}`;
    }

    res.status(500).json({ Success: false, errorMessage: userMessage });
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
