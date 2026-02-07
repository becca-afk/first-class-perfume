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

// Family-Only Access Middleware
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Family Access"');
    return res.status(401).send("Authentication required");
  }

  const auth = Buffer.from(authHeader.split(" ")[1], "base64").toString().split(":");
  const user = auth[0];
  const pass = auth[1];

  const expectedUser = process.env.SITE_USER || "family";
  const expectedPass = process.env.SITE_PASSWORD || "perfume2026";

  if (user === expectedUser && pass === expectedPass) {
    next();
  } else {
    res.setHeader("WWW-Authenticate", 'Basic realm="Family Access"');
    return res.status(401).send("Authentication failed");
  }
};

// Protect all routes
app.use(basicAuth);

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

// M-Pesa Daraja API Implementation
const getAccessToken = async () => {
  const consumer_key = process.env.MPESA_CONSUMER_KEY;
  const consumer_secret = process.env.MPESA_CONSUMER_SECRET;
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
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

  try {
    const token = await getAccessToken();
    const date = new Date();
    const timestamp = date.getFullYear() +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      ("0" + date.getDate()).slice(-2) +
      ("0" + date.getHours()).slice(-2) +
      ("0" + date.getMinutes()).slice(-2) +
      ("0" + date.getSeconds()).slice(-2);

    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

    const stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const data = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount), // API requires integer
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: "https://example.com/api/mpesa/callback", // Replace with real callback in prod
      AccountReference: "FirstClassPerfume",
      TransactionDesc: "Payment for Perfume"
    };

    const response = await axios.post(stk_url, data, { headers: { Authorization: "Bearer " + token } });
    console.log("STK Push Response:", response.data);

    // Safaricom returns "ResponseCode": "0" for success
    if (response.data.ResponseCode === "0") {
      res.json({ Success: true, message: "Prompt sent", data: response.data });
    } else {
      res.status(500).json({ Success: false, errorMessage: response.data.CustomerMessage || "Failed" });
    }
  } catch (error) {
    console.error("STK Push Error:", error.response ? error.response.data : error.message);
    // Fallback simulation for when credentials are invalid/missing (so user can still test UI)
    console.log("Falling back to simulation mode due to error...");
    setTimeout(() => {
      res.json({ Success: true, message: "SIMULATION: Prompt Sent (Check Server Logs for Setup)", simulation: true });
    }, 1000);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
