(function () {
  "use strict";

  const API = { products: "/api/products", order: "/api/order", ratings: "/api/ratings" };
  const STORAGE_KEYS = { wishlist: "firstclass_wishlist", cart: "firstclass_cart", ratings: "firstclass_ratings" };

  let products = [];
  let currentFilter = "all";

  // Auto-hiding navigation
  let lastScrollY = window.scrollY;
  let ticking = false;

  function updateHeaderVisibility() {
    const header = document.querySelector('.header');
    if (!header) return;

    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      // Scrolling down - hide header
      header.classList.add('hidden');
    } else {
      // Scrolling up or at top - show header
      header.classList.remove('hidden');
    }

    lastScrollY = currentScrollY;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateHeaderVisibility();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  function getRatings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ratings) || "{}");
    } catch {
      return {};
    }
  }
  function getRating(productId) {
    return getRatings()[productId] || null;
  }
  function setRating(productId, stars, review) {
    var r = getRatings();
    r[productId] = { stars: stars, review: review || "" };
    localStorage.setItem(STORAGE_KEYS.ratings, JSON.stringify(r));
  }
  function renderStarsDisplay(avg) {
    var a = avg || 0;
    var filled = Math.round(a);
    var out = "";
    for (var i = 1; i <= 5; i++) out += "<span class=\"star" + (i <= filled ? " filled" : "") + "\" aria-hidden=\"true\">★</span>";
    return "<div class=\"stars-wrap display-only\">" + out + "<span class=\"rating-text\">" + (a > 0 ? a.toFixed(1) : "—") + "</span></div>";
  }
  function renderStarsInteractive(productId, current) {
    var cur = (current && current.stars) || 0;
    var out = "";
    for (var i = 1; i <= 5; i++) out += "<button type=\"button\" class=\"star" + (i <= cur ? " filled" : "") + "\" data-stars=\"" + i + "\" aria-label=\"" + i + " star" + (i > 1 ? "s" : "") + "\">★</button>";
    return "<div class=\"stars-wrap\" data-product-id=\"" + escapeHtml(productId) + "\">" + out + "<span class=\"rating-text\">Rate</span></div>";
  }

  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.wishlist) || "[]");
    } catch {
      return [];
    }
  }

  function setWishlist(ids) {
    localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(ids));
    updateWishlistUI();
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "[]");
    } catch {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(items));
    updateCartUI();
  }

  function imageUrl(p) {
    // Use the mapping if available, otherwise fallback to default
    if (PERFUME_IMAGE_MAP && PERFUME_IMAGE_MAP[p.id]) {
      return PERFUME_IMAGE_MAP[p.id];
    }
    return "/images/products/" + p.id + ".jpg";
  }

  function perfumeBottleSvg(name, w, h) {
    w = w || 400;
    h = h || 400;
    var safeName = (name || "Perfume").substring(0, 28);
    var lines = safeName.length > 18 ? [safeName.substring(0, 18), safeName.substring(18)] : [safeName];
    var t1 = escapeHtml(lines[0]);
    var t2 = lines[1] ? escapeHtml(lines[1]) : "";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 400 400">' +
      '<rect fill="#121214" width="400" height="400"/>' +
      '<defs><linearGradient id="bottleG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1e1e22"/><stop offset="100%" stop-color="#0c0c0e"/></linearGradient></defs>' +
      '<path d="M165 70 L185 70 L190 300 L182 370 L218 370 L210 300 L215 70 L235 70 L238 55 L162 55 Z" fill="url(#bottleG)" stroke="#2a2a28" stroke-width="1.5"/>' +
      '<ellipse cx="200" cy="375" rx="22" ry="6" fill="#18181b" stroke="#2a2a28"/>' +
      '<rect x="192" y="52" width="16" height="22" rx="2" fill="#c9a86c" opacity="0.9"/>' +
      '<text x="200" y="215" text-anchor="middle" fill="#c9a86c" font-family="Georgia,serif" font-size="21" font-weight="600">' + t1 + '</text>';
    if (t2) svg += '<text x="200" y="248" text-anchor="middle" fill="#a89870" font-family="Georgia,serif" font-size="19">' + t2 + '</text>';
    svg += '</svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function placeholderSvg(name, w, h) {
    return perfumeBottleSvg(name, w || 400, h || 400);
  }

  function renderProductCard(p) {
    const inWishlist = getWishlist().includes(p.id);
    var imgSrc = imageUrl(p);
    var fallback = perfumeBottleSvg(p.name, 400, 400);
    var card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = p.id;

    var stockMsg = "";
    var btnState = "";
    var btnText = "Add to cart";
    if (p.stock === 0) {
      btnState = "disabled";
      btnText = "Out of Stock";
    }

    card.innerHTML =
      '<div class="thumb">' +
      '<img loading="lazy" src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '" onerror="this.onerror=null;this.src=\'' + fallback + '\'">' +
      "</div>" +
      '<div class="info">' +
      '<div class="name-row"><h3 class="name">' + escapeHtml(p.name) + "</h3>" + stockMsg + "</div>" +
      '<p class="desc">' + escapeHtml(p.desc) + "</p>" +
      '<p class="price">KES ' + formatNumber(p.price) + "</p>" +
      '<div class="actions">' +
      '<button type="button" class="btn btn-outline btn-icon" data-action="wishlist" aria-label="Wishlist">' + (inWishlist ? "♥" : "♡") + "</button>" +
      '<button type="button" class="btn btn-outline" data-action="detail">View</button>' +
      '<button type="button" class="btn btn-primary" data-action="cart" ' + btnState + '>' + btnText + '</button>' +
      "</div></div>";
    return card;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatNumber(n) {
    return Number(n).toLocaleString();
  }

  function filterProducts() {
    if (currentFilter === "all") return products;
    return products.filter(function (p) { return p.category === currentFilter; });
  }

  function renderGrid() {
    const grid = document.getElementById("products-grid");
    const empty = document.getElementById("empty-state");
    const list = filterProducts();
    grid.innerHTML = "";
    if (list.length === 0) {
      empty.hidden = false;
      empty.textContent = "No products in this category.";
      return;
    }
    empty.hidden = true;
    list.forEach(function (p) {
      grid.appendChild(renderProductCard(p));
    });
    bindCardActions(grid);
  }

  function bindCardActions(container) {
    if (!container) container = document.getElementById("products-grid");
    container.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.onclick = function () {
        const card = btn.closest(".product-card");
        const id = card && card.dataset.id;
        const p = products.find(function (x) { return x.id === id; });
        if (!p) return;
        const action = btn.dataset.action;
        if (action === "detail") openModal(p);
        else if (action === "wishlist") toggleWishlist(p.id);
        else if (action === "cart") addToCart(p);
      };
    });
  }

  function openModal(p) {
    const modal = document.getElementById("product-modal");
    const body = document.getElementById("modal-body");
    var imgSrc = imageUrl(p);
    var imgFallback = perfumeBottleSvg(p.name, 600, 600);
    const rating = getRating(p.id);
    const avg = rating ? rating.stars : 0;

    var btnState = "";
    var btnText = "Add to cart";
    var stockDisplay = "";
    if (p.stock === 0) {
      btnState = "disabled";
      btnText = "Out of Stock";
      stockDisplay = '<p class="stock-status out">Out of Stock</p>';
    } else {
      stockDisplay = ''; // Hide "In Stock" messages
    }

    body.innerHTML =
      '<div class="thumb">' +
      '<img src="' + imgSrc + '" alt="' + escapeHtml(p.name) + '" onerror="this.onerror=null;this.src=\'' + imgFallback + '\'">' +
      "</div>" +
      '<h2 class="name" id="modal-title">' + escapeHtml(p.name) + "</h2>" +
      renderStarsDisplay(avg) +
      '<p class="desc">' + escapeHtml(p.desc) + "</p>" +
      stockDisplay +
      '<p class="price">KES ' + formatNumber(p.price) + "</p>" +
      '<div class="modal-rate"><p class="rating-label">Rate this fragrance</p>' +
      renderStarsInteractive(p.id, rating) +
      '<textarea class="review-textarea" id="modal-review" placeholder="Optional review (e.g. long-lasting, great for evening)">' + (rating && rating.review ? escapeHtml(rating.review) : "") + '</textarea>' +
      '<button type="button" class="btn btn-outline" id="modal-submit-rating">Submit rating</button></div>' +
      '<div class="actions">' +
      '<button type="button" class="btn btn-outline" id="modal-wishlist">' + (getWishlist().includes(p.id) ? "Remove from wishlist" : "Add to wishlist") + "</button>" +
      '<button type="button" class="btn btn-primary" id="modal-cart" ' + btnState + '>' + btnText + '</button>' +
      "</div>";
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    var wrap = body.querySelector(".stars-wrap[data-product-id]");
    if (wrap) {
      wrap.querySelectorAll(".star").forEach(function (btn) {
        btn.onclick = function () {
          var stars = parseInt(btn.dataset.stars, 10);
          wrap.querySelectorAll(".star").forEach(function (b) {
            b.classList.toggle("filled", parseInt(b.dataset.stars, 10) <= stars);
          });
        };
      });
    }
    document.getElementById("modal-submit-rating").onclick = function () {
      var starsWrap = body.querySelector(".stars-wrap[data-product-id]");
      var filled = starsWrap && starsWrap.querySelector(".star.filled");
      var stars = filled ? Math.max.apply(null, [].map.call(starsWrap.querySelectorAll(".star.filled"), function (b) { return parseInt(b.dataset.stars, 10); })) : 0;
      if (stars === 0) stars = 5;
      var review = (document.getElementById("modal-review") && document.getElementById("modal-review").value) || "";
      setRating(p.id, stars, review);
      showToast("Thanks for your rating!");
      renderGrid();
      openModal(p);
    };

    document.getElementById("modal-wishlist").onclick = function () {
      toggleWishlist(p.id);
      openModal(p);
    };
    document.getElementById("modal-cart").onclick = function () {
      addToCart(p);
      showToast("Added to cart");
    };
  }

  function closeModal() {
    document.getElementById("product-modal").hidden = true;
    document.body.style.overflow = "";
  }

  function toggleWishlist(id) {
    let list = getWishlist();
    const i = list.indexOf(id);
    if (i >= 0) list = list.filter(function (x) { return x !== id; });
    else list = list.concat(id);
    setWishlist(list);
    showToast(i >= 0 ? "Removed from wishlist" : "Added to wishlist");
    renderGrid();
  }

  function addToCart(p) {
    if (p.stock === 0) {
      showToast("Sorry, this item is out of stock.");
      return;
    }
    const cart = getCart();
    const existing = cart.find(function (x) { return x.id === p.id; });
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    setCart(cart);
    showToast("Added to cart");
  }

  function updateWishlistUI() {
    const list = getWishlist();
    document.getElementById("wishlist-count").textContent = list.length;
  }

  function updateCartUI() {
    const cart = getCart();
    const count = cart.reduce(function (sum, x) { return sum + (x.qty || 1); }, 0);
    const total = cart.reduce(function (sum, x) { return sum + (x.price || 0) * (x.qty || 1); }, 0);
    document.getElementById("cart-count").textContent = count;
    document.getElementById("cart-total").textContent = "KES " + formatNumber(total);
    const listContainer = document.getElementById("cart-items-list");
    listContainer.innerHTML = "";
    if (cart.length === 0) {
      listContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty.</div>';
      document.getElementById("checkout-btn").disabled = true;
    } else {
      document.getElementById("checkout-btn").disabled = false;
    }
    cart.forEach(function (item) {
      var imgSrc = imageUrl(item);
      var fallback = perfumeBottleSvg(item.name, 56, 56);
      const el = document.createElement("div");
      el.className = "drawer-item";
      el.innerHTML =
        '<div class="thumb"><img src="' + imgSrc + '" alt="" onerror="this.onerror=null;this.src=\'' + fallback + '\'"></div>' +
        '<div><div class="name">' + escapeHtml(item.name) + "</div><div class=\"price\">KES " + formatNumber(item.price) + " \u00D7 " + (item.qty || 1) + "</div></div>" +
        '<button type="button" class="remove" data-cart-id="' + escapeHtml(item.id) + '">&times;</button>';
      listContainer.appendChild(el);
    });
    listContainer.querySelectorAll(".remove").forEach(function (btn) {
      btn.onclick = function () {
        const id = btn.dataset.cartId;
        let cart = getCart().filter(function (x) { return x.id !== id; });
        setCart(cart);
      };
    });
  }

  function renderWishlistDrawer() {
    const list = getWishlist();
    const body = document.getElementById("wishlist-body");
    body.innerHTML = "";
    list.forEach(function (id) {
      const p = products.find(function (x) { return x.id === id; });
      if (!p) return;
      const el = document.createElement("div");
      el.className = "drawer-item";
      el.innerHTML =
        '<div class="thumb"><img src="' + imageUrl(p) + '" alt="" onerror="this.onerror=null;this.src=\'' + perfumeBottleSvg(p.name, 56, 56) + '\'"></div>' +
        '<div><div class="name">' + escapeHtml(p.name) + "</div><div class=\"price\">KES " + formatNumber(p.price) + "</div></div>" +
        '<button type="button" class="remove" data-wishlist-id="' + escapeHtml(p.id) + '">&times;</button>';
      body.appendChild(el);
    });
    body.querySelectorAll(".remove").forEach(function (btn) {
      btn.onclick = function () {
        toggleWishlist(btn.dataset.wishlistId);
        renderWishlistDrawer();
      };
    });
  }

  function showToast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2500);
  }

  function openDrawer(id) {
    var drawer = document.getElementById(id);
    if (id === "wishlist-drawer") renderWishlistDrawer();
    if (id === "cart-drawer") updateCartUI();
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer(id) {
    document.getElementById(id).setAttribute("aria-hidden", "true");
  }

  function checkout() {
    document.getElementById("cart-items-list").hidden = true;
    document.getElementById("checkout-form-view").hidden = false;
    document.getElementById("checkout-btn").hidden = true;
    document.getElementById("confirm-order-btn").hidden = false;
  }

  function backToCart() {
    document.getElementById("cart-items-list").hidden = false;
    document.getElementById("checkout-form-view").hidden = true;
    document.getElementById("checkout-btn").hidden = false;
    document.getElementById("confirm-order-btn").hidden = true;
  }

  function confirmOrder() {
    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const location = document.getElementById("customer-location").value.trim();
    const cart = getCart();

    if (!name || !phone || !location) {
      showToast("Please fill in all details");
      return;
    }

    const total = cart.reduce(function (s, x) { return s + (x.price || 0) * (x.qty || 1); }, 0);

    showToast("Generating Order ID...");

    fetch(API.order, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: name, email: "manual@example.com" },
        items: cart,
        total: total,
        paymentMethod: "WhatsApp (Manual)",
        phone: phone,
        shippingAddress: location
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const orderId = res.orderId;
          const adminPhone = "254729072269"; // Owner's WhatsApp number

          let message = "Hello First Class Perfume! I'd like to complete my order #" + orderId + ".\n\n";
          message += "Product Details:\n";
          cart.forEach(item => {
            message += "- " + item.name + " (x" + item.qty + ") - KES " + formatNumber(item.price * item.qty) + "\n";
          });
          message += "\nTotal: KES " + formatNumber(total) + "\n";
          message += "\nDelivery to:\n" + location + "\n";
          message += "\nRecipient: " + name + " (" + phone + ")\n";
          message += "\nPlease let me know how to pay via M-Pesa.";

          const whatsappUrl = "https://wa.me/" + adminPhone + "?text=" + encodeURIComponent(message);

          showToast("Order Created! Redirecting to WhatsApp...");
          setCart([]);
          backToCart();
          closeDrawer("cart-drawer");

          setTimeout(() => {
            window.location.href = whatsappUrl;
          }, 1500);
        } else {
          showToast("Order failed. Please try again.");
        }
      })
      .catch(err => {
        console.error("Order error:", err);
        showToast("Error connecting to server.");
      });
  }


  function init() {
    var intro = document.getElementById("intro");
    var introBrand = document.getElementById("intro-brand-text");
    var introEnter = document.getElementById("intro-enter-btn");
    var siteMain = document.getElementById("site-main");
    if (intro && introBrand && introEnter && siteMain) {
      introBrand.classList.add("pop");
      introEnter.onclick = function () {
        intro.classList.add("done");
        document.body.classList.add("body-intro-done");
        siteMain.setAttribute("aria-hidden", "false");
        setTimeout(function () {
          intro.setAttribute("aria-hidden", "true");
        }, 900);
      };
      setTimeout(function () { introEnter.focus(); }, 8000);
    } else {
      document.body.classList.add("body-intro-done");
      if (siteMain) siteMain.setAttribute("aria-hidden", "false");
    }

    document.querySelectorAll(".nav-link").forEach(function (link) {
      link.onclick = function () {
        document.querySelectorAll(".nav-link").forEach(function (l) { l.classList.remove("active"); });
        link.classList.add("active");
        currentFilter = link.dataset.filter || "all";
        renderGrid();
      };
    });

    document.getElementById("wishlist-btn").onclick = function () { openDrawer("wishlist-drawer"); };
    document.getElementById("cart-btn").onclick = function () { openDrawer("cart-drawer"); };
    document.getElementById("wishlist-close").onclick = function () { closeDrawer("wishlist-drawer"); };
    document.getElementById("wishlist-backdrop").onclick = function () { closeDrawer("wishlist-drawer"); };
    document.getElementById("cart-close").onclick = function () { closeDrawer("cart-drawer"); };
    document.getElementById("cart-backdrop").onclick = function () { closeDrawer("cart-drawer"); };
    document.getElementById("checkout-btn").onclick = checkout;
    document.getElementById("back-to-cart").onclick = backToCart;
    document.getElementById("confirm-order-btn").onclick = confirmOrder;

    document.getElementById("modal-close").onclick = closeModal;
    document.getElementById("modal-backdrop").onclick = closeModal;


    fetch(API.products)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        renderGrid();
        updateWishlistUI();
        updateCartUI();
      })
      .catch(function () {
        products = [];
        renderGrid();
        showToast("Could not load products.");
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
