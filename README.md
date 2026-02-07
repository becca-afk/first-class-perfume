# First Class Perfume 💎

A luxury e-commerce experience for premium fragrances.

## ✨ Features
- **Luxury Aesthetic**: Modern, dark-themed UI designed for a premium feel.
- **Intro Animation**: Elegant brand entrance.
- **Product Catalog**: Browsable categories (Men/Women) with real-time stock status.
- **Wishlist & Cart**: Full shopping experience with local persistence.
- **M-Pesa Integration**: Seamless STK Push payment integration for Kenyan customers.
- **Admin Dashboard**: backend management for stock updates and product additions.

## 🚀 Live Demo
Once deployed, your live link will appear here! (e.g., `https://first-class-perfume.onrender.com`)

## 🛠️ Local Setup
To run this project on your machine:

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd full-site
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your M-Pesa credentials:
   ```env
   MPESA_CONSUMER_KEY=your_key
   MPESA_CONSUMER_SECRET=your_secret
   MPESA_SHORTCODE=your_shortcode
   MPESA_PASSKEY=your_passkey
   ```

4. **Start the server**:
   ```bash
   npm start
   ```
   The site will be available at `http://localhost:3000`.

---

## 📂 Project Structure
- `/public`: Frontend assets (HTML, CSS, JS).
- `/data`: Product database (JSON).
- `server.js`: Node.js/Express backend logic.
- `.gitignore`: Configured to keep your private keys safe.

---
*Created with ❤️ for First Class Perfume.*
