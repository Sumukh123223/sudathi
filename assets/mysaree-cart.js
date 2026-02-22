/**
 * My Saree – cart in localStorage, cart drawer (desktop sidebar / mobile full), checkout link
 */
(function () {
  var CART_KEY = 'mysaree_cart';

  function getCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartCount();
    if (window.mysareeRenderDrawer) window.mysareeRenderDrawer();
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('mysaree:cartUpdated', { detail: { cart: items } }));
    }
  }

  function addItem(item) {
    var cart = getCart();
    var id = item.variant_id || item.product_id + '';
    var existing = cart.find(function (x) { return (x.variant_id || x.product_id + '') === id; });
    if (existing) {
      existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    } else {
      cart.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        handle: item.handle,
        title: item.title,
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
        image: item.image || ''
      });
    }
    setCart(cart);
  }

  function updateCartCount() {
    var cart = getCart();
    var count = cart.reduce(function (sum, i) { return sum + (i.quantity || 1); }, 0);
    var badgeStyle = 'position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:50%;background:#093174;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;z-index:2;';
    function ensureBadge(el) {
      if (!el) return;
      var badge = el.querySelector('.mysaree-cart-count');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'mysaree-cart-count';
        badge.setAttribute('aria-hidden', 'true');
        badge.style.cssText = badgeStyle;
        el.style.position = 'relative';
        el.style.display = 'inline-flex';
        el.appendChild(badge);
      }
      badge.textContent = count;
      badge.style.display = count ? '' : 'none';
    }
    ensureBadge(document.getElementById('cart-icon-bubble'));
    document.querySelectorAll('.header__icon--cart, a[href="/cart"]').forEach(ensureBadge);
    var fallback = document.getElementById('mysaree-cart-fallback');
    if (fallback) {
      fallback.innerHTML = count ? 'Cart (' + count + ')' : 'Cart';
      fallback.style.display = '';
    }
  }

  function ensureCartFallback() {
    var cartDrawer = document.querySelector('cart-drawer');
    if (!cartDrawer) return;
    var hasCartIcon = document.querySelector('cart-drawer details.cart-drawer-container summary') || document.getElementById('cart-icon-bubble');
    var fallbackEl = document.getElementById('mysaree-cart-fallback');
    if (hasCartIcon && fallbackEl) {
      fallbackEl.remove();
      return;
    }
    if (fallbackEl) return;
    if (hasCartIcon) return;
    var link = document.createElement('a');
    link.id = 'mysaree-cart-fallback';
    link.href = '#';
    link.textContent = 'Cart';
    link.style.cssText = 'margin-left:12px;font-size:14px;color:#093174;text-decoration:none;font-weight:500;cursor:pointer;';
    link.addEventListener('click', function (e) { e.preventDefault(); openCartDrawer(); });
    cartDrawer.parentNode.insertBefore(link, cartDrawer);
    updateCartCount();
  }

  function openCartDrawer() {
    ensureDrawerInjected();
    var details = document.querySelector('cart-drawer details.cart-drawer-container');
    if (details) details.removeAttribute('open');
    var back = document.getElementById('mysaree-cart-backdrop');
    var drawer = document.getElementById('mysaree-cart-drawer');
    if (back && drawer) {
      renderDrawerContent();
      back.classList.add('is-open');
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }

  function addToCartButtonAnimation(btn) {
    if (!btn) return;
    var text = btn.textContent.replace(/\s+/g, ' ').trim();
    var addedText = 'Added ✓';
    if (text === addedText) return;
    btn.classList.add('mysaree-add-animate');
    btn.setAttribute('data-mysaree-original-text', text);
    btn.textContent = addedText;
    setTimeout(function () {
      btn.classList.remove('mysaree-add-animate');
      btn.textContent = btn.getAttribute('data-mysaree-original-text') || text;
    }, 2000);
  }

  function closeCartDrawer() {
    var back = document.getElementById('mysaree-cart-backdrop');
    var drawer = document.getElementById('mysaree-cart-drawer');
    if (back && drawer) {
      back.classList.remove('is-open');
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  function ensureDrawerInjected() {
    if (document.getElementById('mysaree-cart-drawer')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/mysaree-cart-drawer.css';
    document.head.appendChild(link);
    var back = document.createElement('div');
    back.id = 'mysaree-cart-backdrop';
    back.setAttribute('aria-hidden', 'true');
    back.addEventListener('click', closeCartDrawer);
    var drawer = document.createElement('div');
    drawer.id = 'mysaree-cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Cart');
    drawer.innerHTML = '<div class="mysaree-cart-header"><h2 class="mysaree-cart-title">CART</h2><button type="button" class="mysaree-cart-close" aria-label="Close cart" title="Close cart">&times;</button></div>' +
      '<div class="mysaree-cart-scroll" id="mysaree-cart-scroll">' +
      '<div class="mysaree-cart-offer" id="mysaree-cart-offer-bar">Buy 2, Get 1 Free Offer<div class="mysaree-cart-progress" id="mysaree-cart-progress"></div></div>' +
      '<div class="mysaree-cart-items" id="mysaree-cart-items"></div>' +
      '<div class="mysaree-cart-summary" id="mysaree-cart-summary"><div class="mysaree-cart-subtotal">Subtotal <span id="mysaree-cart-subtotal">₹0</span></div>' +
      '<p class="mysaree-cart-note">Taxes included. Discounts and shipping calculated at checkout.</p>' +
      '<button type="button" class="mysaree-cart-place-order" id="mysaree-place-order-btn">PLACE ORDER</button>' +
      '<p class="mysaree-cart-payment-note">Up to 10% off on Prepaid.</p></div>' +
      '<div class="mysaree-cart-recommendations" id="mysaree-cart-recommendations"></div></div>';
    document.body.appendChild(back);
    document.body.appendChild(drawer);
    var closeBtn = drawer.querySelector('.mysaree-cart-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
    var placeBtn = drawer.querySelector('#mysaree-place-order-btn');
    if (placeBtn) placeBtn.addEventListener('click', openCheckoutPopup);
  }

  function renderRecommendations() {
    var container = document.getElementById('mysaree-cart-recommendations');
    if (!container) return;
    var cart = getCart();
    if (!cart.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    var exclude = cart.map(function (i) { return i.handle || ''; }).filter(Boolean).join(',');
    fetch('/api/recommendations?limit=4&exclude=' + encodeURIComponent(exclude))
      .then(function (r) { return r.json(); })
      .then(function (list) {
        if (!list || !list.length) {
          container.innerHTML = '';
          container.style.display = 'none';
          return;
        }
        container.style.display = 'block';
        var html = '<h3 class="mysaree-recs-heading">YOU MAY ALSO LIKE</h3><div class="mysaree-recs-inner">';
        list.forEach(function (p) {
          var productUrl = '/collections/all-products/products/product.html?handle=' + encodeURIComponent(p.handle);
          var imgSrc = (p.image && p.image.indexOf('http') !== 0) ? (window.location.origin + (p.image.charAt(0) === '/' ? p.image : '/' + p.image)) : (p.image || '');
          var img = imgSrc ? '<img src="' + escapeAttr(imgSrc) + '" alt="">' : '<div class="mysaree-rec-noimg"></div>';
          html += '<div class="mysaree-rec-card" data-handle="' + escapeAttr(p.handle) + '" data-title="' + escapeAttr(p.title) + '" data-price="' + (p.price_inr || 0) + '" data-image="' + escapeAttr(imgSrc) + '" data-id="' + (p.id || '') + '">' +
            '<a href="' + escapeAttr(productUrl) + '" class="mysaree-rec-link">' + img + '<span class="mysaree-rec-name">' + escapeHtml(p.title) + '</span><span class="mysaree-rec-price">₹' + formatPrice(p.price_inr || 0) + '</span></a>' +
            '<button type="button" class="mysaree-rec-add">ADD TO CART →</button></div>';
        });
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.mysaree-rec-add').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var card = btn.closest('.mysaree-rec-card');
            if (!card) return;
            var handle = card.getAttribute('data-handle');
            var title = card.getAttribute('data-title');
            var price = parseFloat(card.getAttribute('data-price'), 10) || 0;
            var image = card.getAttribute('data-image') || '';
            var id = card.getAttribute('data-id') || '';
            addItem({ product_id: id, variant_id: id, handle: handle, title: title, price: price, quantity: 1, image: image });
            renderDrawerContent();
          });
        });
      })
      .catch(function () {
        container.innerHTML = '';
        container.style.display = 'none';
      });
  }

  function renderDrawerContent() {
    var cart = getCart();
    var itemsEl = document.getElementById('mysaree-cart-items');
    var progressEl = document.getElementById('mysaree-cart-progress');
    var subtotalEl = document.getElementById('mysaree-cart-subtotal');
    var offerBar = document.getElementById('mysaree-cart-offer-bar');
    var summaryEl = document.getElementById('mysaree-cart-summary');
    var placeBtn = document.getElementById('mysaree-place-order-btn');
    var recsEl = document.getElementById('mysaree-cart-recommendations');
    if (!itemsEl) return;
    if (!cart.length) {
      itemsEl.innerHTML = '<p class="mysaree-cart-empty">Your cart is currently empty.</p>' +
        '<div class="mysaree-cart-empty-buttons">' +
        '<a href="/collections/saree" class="mysaree-cart-empty-btn">SAREE</a>' +
        '<a href="/collections/blouse" class="mysaree-cart-empty-btn">BLOUSE</a>' +
        '<a href="/collections/pre-drapped-saree" class="mysaree-cart-empty-btn">SHAPEWEAR</a>' +
        '<a href="/collections/sarees-saturday" class="mysaree-cart-empty-btn">SAREES SATURDAY</a>' +
        '<a href="/collections/ready-to-wear-sarees" class="mysaree-cart-empty-btn">READY TO WEAR SAREE</a>' +
        '</div>';
      if (progressEl) progressEl.innerHTML = '';
      if (subtotalEl) subtotalEl.textContent = '₹0';
      if (offerBar) offerBar.style.display = 'none';
      if (summaryEl) summaryEl.style.display = 'none';
      if (recsEl) { recsEl.innerHTML = ''; recsEl.style.display = 'none'; }
      return;
    }
    renderRecommendations();
    if (offerBar) offerBar.style.display = '';
    if (summaryEl) summaryEl.style.display = '';
    var b2g1 = computeB2G1(cart);
    var itemCount = b2g1.unitCount;
    var freePerItem = b2g1.freePerItem || [];
    var html = '';
    cart.forEach(function (item, index) {
      var qty = item.quantity || 1;
      var freeForThis = freePerItem[index] || 0;
      var paidQty = qty - freeForThis;
      var unitPrice = Number(item.price) || 0;
      var lineTotal = paidQty * unitPrice;
      var priceHtml = '₹' + formatPrice(lineTotal);
      if (freeForThis > 0) {
        priceHtml += ' <span class="mysaree-cart-item-free">+ ' + freeForThis + ' free</span>';
      }
      var img = item.image ? '<img class="mysaree-cart-item-img" src="' + escapeAttr(item.image) + '" alt="">' : '<div class="mysaree-cart-item-img"></div>';
      html += '<div class="mysaree-cart-item" data-index="' + index + '">' + img +
        '<div class="mysaree-cart-item-details"><h3 class="mysaree-cart-item-name">' + escapeHtml(item.title || 'Item') + '</h3>' +
        '<p class="mysaree-cart-item-tag">Buy 2 Get 1 Free</p><div class="mysaree-cart-item-row">' +
        '<div class="mysaree-cart-qty"><button type="button" data-action="minus" aria-label="Decrease">−</button><span>' + qty + '</span><button type="button" data-action="plus" aria-label="Increase">+</button></div>' +
        '<span class="mysaree-cart-item-price">' + priceHtml + '</span>' +
        '<button type="button" class="mysaree-cart-remove" data-action="remove" aria-label="Remove">🗑</button></div></div></div>';
    });
    itemsEl.innerHTML = html;
    itemsEl.querySelectorAll('.mysaree-cart-qty button, .mysaree-cart-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var itemEl = btn.closest('.mysaree-cart-item');
        var idx = parseInt(itemEl.getAttribute('data-index'), 10);
        var cart2 = getCart();
        var it = cart2[idx];
        if (!it) return;
        if (btn.getAttribute('data-action') === 'remove') {
          cart2.splice(idx, 1);
        } else if (btn.getAttribute('data-action') === 'plus') {
          it.quantity = (it.quantity || 1) + 1;
        } else {
          it.quantity = Math.max(1, (it.quantity || 1) - 1);
        }
        setCart(cart2);
        renderDrawerContent();
      });
    });
    if (progressEl) {
      var filled = Math.min(3, itemCount);
      progressEl.innerHTML = '<span class="mysaree-cart-progress-dot' + (filled >= 1 ? ' filled' : '') + '"></span><span class="mysaree-cart-progress-dot' + (filled >= 2 ? ' filled' : '') + '"></span><span class="mysaree-cart-progress-dot' + (filled >= 3 ? ' filled' : '') + '"></span>';
    }
    if (subtotalEl) subtotalEl.textContent = '₹' + formatPrice(b2g1.total);
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function formatPrice(n) {
    return (Math.round(n * 100) / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // Buy 2 Get 1 Free: for every 3 units, cheapest is free. Returns { total, freeCount, unitCount, freePerItem }
  // freePerItem[itemIndex] = number of units that are free for that cart line
  function computeB2G1(cart) {
    var units = []; // { price, itemIndex }
    (cart || []).forEach(function (item, itemIndex) {
      var price = Number(item.price) || 0;
      var qty = item.quantity || 1;
      for (var i = 0; i < qty; i++) units.push({ price: price, itemIndex: itemIndex });
    });
    units.sort(function (a, b) { return a.price - b.price; });
    var freeCount = Math.floor(units.length / 3);
    var freePerItem = (cart || []).map(function () { return 0; });
    for (var f = 0; f < freeCount; f++) freePerItem[units[f].itemIndex]++;
    var total = 0;
    for (var j = freeCount; j < units.length; j++) total += units[j].price;
    return { total: total, freeCount: freeCount, unitCount: units.length, freePerItem: freePerItem };
  }

  function getProductUrl(handle) {
    if (!handle) return '';
    return '/collections/all-products/products/' + handle + '.html';
  }

  // Intercept product form submit (product page)
  function onProductFormSubmit(e) {
    var form = e.target;
    if (!form || form.getAttribute('data-mysaree-cart') === 'true') return;
    var productId = (form.querySelector('input[name="product-id"]') || form.querySelector('input[name="id"]'))?.value;
    var variantInput = form.querySelector('input[name="id"]:not([name="product-id"])') || form.querySelector('.product-variant-id');
    var variantId = variantInput ? variantInput.value : productId;
    var qtyInput = form.querySelector('input[name="quantity"]');
    var quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    var titleEl = document.querySelector('h1, .product__title, [class*="product-title"]');
    var title = titleEl ? titleEl.textContent.trim() : '';
    var price = 0;
    var priceSale = document.querySelector('.price-item--sale[data-price]');
    if (priceSale && priceSale.getAttribute('data-price')) {
      price = parseInt(priceSale.getAttribute('data-price'), 10) / 100;
    }
    if (!price) {
      var priceEl = document.querySelector('.price__sale .price-item, .price__regular .price-item, [class*="price-item"]');
      if (priceEl) {
        var match = priceEl.textContent.replace(/[^0-9.]/g, '');
        if (match) price = parseFloat(match);
      }
    }
    var handle = '';
    var link = document.querySelector('link[rel="canonical"]');
    if (link && link.href) {
      var m = link.href.match(/\/products\/([^/?]+)/);
      if (m) handle = m[1];
    }
    if (!handle && typeof window.location !== 'undefined') {
      var q = window.location.search.match(/[?&]handle=([^&]+)/);
      if (q && q[1]) handle = decodeURIComponent(q[1]).trim();
      if (!handle) {
        var pathMatch = window.location.pathname.match(/\/products\/([^/]+?)(?:\.html)?$/);
        if (pathMatch) handle = pathMatch[1];
      }
      if (!handle) {
        var segs = window.location.pathname.split('/');
        var last = segs[segs.length - 1];
        if (last && last.indexOf('.html') === -1) handle = last;
        else if (last) handle = last.replace(/\.html$/, '');
      }
    }
    var img = document.querySelector('.product__media img, [class*="product__media"] img');
    addItem({
      product_id: productId,
      variant_id: variantId,
      handle: handle,
      title: title,
      price: price,
      quantity: quantity,
      image: img ? (img.src || img.getAttribute('src')) : ''
    });
    e.preventDefault();
    e.stopPropagation();
    var submitBtn = form.querySelector('button[type="submit"], .product-form__submit, [type="submit"]');
    addToCartButtonAnimation(submitBtn);
    updateCartCount();
    requestAnimationFrame(function () { requestAnimationFrame(openCartDrawer); });
    return false;
  }

  function ensureCheckoutPopupInjected() {
    if (document.getElementById('mysaree-checkout-backdrop')) return;
    var back = document.createElement('div');
    back.id = 'mysaree-checkout-backdrop';
    back.className = 'mysaree-checkout-backdrop';
    var popup = document.createElement('div');
    popup.id = 'mysaree-checkout-popup';
    popup.className = 'mysaree-checkout-popup';
    popup.innerHTML = '<div class="mysaree-checkout-head">' +
      '<span class="mysaree-checkout-brand">My Saree</span>' +
      '<button type="button" class="mysaree-checkout-close" aria-label="Close">&times;</button>' +
      '</div>' +
      '<div class="mysaree-checkout-body" id="mysaree-checkout-body">' +
      '<p class="mysaree-checkout-trust">Over 20,00,000+ Happy Customers</p>' +
      '<div class="mysaree-checkout-section">' +
      '<h3 class="mysaree-checkout-section-title">Delivery details</h3>' +
      '<form id="mysaree-checkout-form" class="mysaree-checkout-form">' +
      '<div class="mysaree-checkout-row">' +
      '<div class="mysaree-checkout-field"><label for="mysaree-name">Full name <span class="req">*</span></label><input id="mysaree-name" type="text" name="name" required placeholder="Your name"></div>' +
      '<div class="mysaree-checkout-field"><label for="mysaree-email">Email <span class="req">*</span></label><input id="mysaree-email" type="email" name="email" required placeholder="your@email.com"></div>' +
      '</div>' +
      '<div class="mysaree-checkout-field"><label for="mysaree-phone">Phone <span class="req">*</span></label><input id="mysaree-phone" type="tel" name="phone" required placeholder="10-digit mobile number"></div>' +
      '<div class="mysaree-checkout-field"><label for="mysaree-address">Address (line 1) <span class="req">*</span></label><input id="mysaree-address" type="text" name="address" required placeholder="Street, building, landmark"></div>' +
      '<div class="mysaree-checkout-field"><label for="mysaree-address2">Address (line 2) <span class="opt">Optional</span></label><input id="mysaree-address2" type="text" name="address2" placeholder="Apartment, floor, etc."></div>' +
      '<div class="mysaree-checkout-row">' +
      '<div class="mysaree-checkout-field"><label for="mysaree-city">City <span class="req">*</span></label><input id="mysaree-city" type="text" name="city" required placeholder="City"></div>' +
      '<div class="mysaree-checkout-field"><label for="mysaree-state">State <span class="req">*</span></label><input id="mysaree-state" type="text" name="state" required placeholder="State"></div>' +
      '</div>' +
      '<div class="mysaree-checkout-field mysaree-checkout-field--pincode"><label for="mysaree-pincode">Pincode <span class="req">*</span></label><input id="mysaree-pincode" type="text" name="pincode" required pattern="[0-9]{6}" maxlength="6" placeholder="6 digits"></div>' +
      '<p id="mysaree-checkout-error" class="mysaree-checkout-error" style="display:none;"></p>' +
      '</form></div>' +
      '<div class="mysaree-checkout-section">' +
      '<h3 class="mysaree-checkout-section-title">Offers & rewards</h3>' +
      '<p class="mysaree-checkout-offers-note">Save more with payment offers applied at payment.</p>' +
      '<p class="mysaree-checkout-offers-note">Up to 10% off on Prepaid.</p>' +
      '</div>' +
      '<button type="button" class="mysaree-checkout-pay" id="mysaree-checkout-pay-btn">Pay & place order</button>' +
      '</div>' +
      '<div class="mysaree-checkout-success" id="mysaree-checkout-success" style="display:none;">' +
      '<div class="mysaree-checkout-success-icon">✓</div>' +
      '<h3>Order placed successfully</h3>' +
      '<p id="mysaree-checkout-order-id"></p>' +
      '<button type="button" class="mysaree-checkout-close-btn" id="mysaree-checkout-close-after">Close</button>' +
      '</div>';
    back.appendChild(popup);
    document.body.appendChild(back);
    back.addEventListener('click', function (e) { if (e.target === back) closeCheckoutPopup(); });
    popup.querySelector('.mysaree-checkout-close').addEventListener('click', closeCheckoutPopup);
    document.getElementById('mysaree-checkout-close-after').addEventListener('click', closeCheckoutPopup);
    document.getElementById('mysaree-checkout-pay-btn').addEventListener('click', submitCheckoutFromPopup);
  }

  function openCheckoutPopup() {
    var cart = getCart();
    if (!cart.length) return;
    closeCartDrawer();
    ensureCheckoutPopupInjected();
    document.getElementById('mysaree-checkout-body').style.display = 'block';
    document.getElementById('mysaree-checkout-success').style.display = 'none';
    document.getElementById('mysaree-checkout-popup').classList.add('is-open');
    document.getElementById('mysaree-checkout-backdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutPopup() {
    var back = document.getElementById('mysaree-checkout-backdrop');
    var popup = document.getElementById('mysaree-checkout-popup');
    if (back && popup) {
      back.classList.remove('is-open');
      popup.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  function submitCheckoutFromPopup() {
    var form = document.getElementById('mysaree-checkout-form');
    if (!form || !form.checkValidity()) { form.reportValidity(); return; }
    var cart = getCart();
    if (!cart.length) { closeCheckoutPopup(); return; }
    var errEl = document.getElementById('mysaree-checkout-error');
    var payBtn = document.getElementById('mysaree-checkout-pay-btn');
    errEl.style.display = 'none';
    payBtn.disabled = true;
    var customer = {
      name: form.querySelector('[name="name"]').value.trim(),
      email: form.querySelector('[name="email"]').value.trim(),
      phone: form.querySelector('[name="phone"]').value.trim(),
      address: form.querySelector('[name="address"]').value.trim(),
      address2: (function () { var e = form.querySelector('[name="address2"]'); return e ? e.value.trim() : ''; })(),
      city: form.querySelector('[name="city"]').value.trim(),
      state: form.querySelector('[name="state"]').value.trim(),
      pincode: form.querySelector('[name="pincode"]').value.trim()
    };
    fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cart, customer: customer })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          errEl.textContent = data.error;
          errEl.style.display = 'block';
          payBtn.disabled = false;
          return;
        }
        if (data.razorpay_order_id && data.key) {
          var script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = function () {
            var options = {
              key: data.key,
              amount: data.amount,
              currency: data.currency || 'INR',
              order_id: data.razorpay_order_id,
              name: 'My Saree',
              description: 'Order #' + data.order_id,
              handler: function (res) {
                fetch('/api/confirm-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: data.order_id }) })
                  .then(function () {})
                  .catch(function () {});
                setCart([]);
                renderDrawerContent();
                document.getElementById('mysaree-checkout-body').style.display = 'none';
                document.getElementById('mysaree-checkout-success').style.display = 'block';
                document.getElementById('mysaree-checkout-order-id').textContent = 'Order ID: ' + data.order_id;
                payBtn.disabled = false;
              },
              prefill: { name: customer.name, email: customer.email, contact: customer.phone }
            };
            var rzp = new Razorpay(options);
            rzp.on('payment.failed', function () {
              errEl.textContent = 'Payment failed. Please try again.';
              errEl.style.display = 'block';
              payBtn.disabled = false;
            });
            rzp.open();
          };
          document.head.appendChild(script);
          return;
        }
        setCart([]);
        renderDrawerContent();
        document.getElementById('mysaree-checkout-body').style.display = 'none';
        document.getElementById('mysaree-checkout-success').style.display = 'block';
        document.getElementById('mysaree-checkout-order-id').textContent = 'Order ID: ' + (data.order_id || '');
        payBtn.disabled = false;
      })
      .catch(function () {
        errEl.textContent = 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
        payBtn.disabled = false;
      });
  }

  // Card "Add to cart" → add product directly and open cart drawer
  function onAddToCartClick(e) {
    var btn = e.target.closest('add-to-cart');
    if (!btn || btn.getAttribute('data-mysaree-cart') === 'true') return;
    var variantId = btn.getAttribute('data-variant-id');
    var productUrl = btn.getAttribute('data-product-url') || '';
    var handle = '';
    var m = productUrl.match(/handle=([^&]+)/);
    if (m) handle = m[1];
    if (!handle) {
      var pathMatch = productUrl.match(/\/products\/([^/?]+)/);
      if (pathMatch) handle = pathMatch[1].replace(/\.html$/, '');
    }
    // Prefer .card-wrapper so we search the full card (price is often in sibling .card-information)
    var card = btn.closest('.card-wrapper') || btn.closest('.card') || btn.closest('[class*="card"]');
    var title = '';
    var price = 0;
    var image = '';
    if (card) {
      var t = card.querySelector('.card-information__text, .card__title, [class*="title"]');
      if (t) title = t.textContent.trim();
      var pSale = card.querySelector('.price-item--sale[data-price]');
      if (pSale && pSale.getAttribute('data-price')) {
        price = parseInt(pSale.getAttribute('data-price'), 10) / 100;
      }
      if (!price) {
        var p = card.querySelector('.price-item--sale, .price .price-item, [class*="price-item"]');
        if (p) {
          var match = p.textContent.replace(/[^0-9.]/g, '');
          if (match) price = parseFloat(match);
        }
      }
      var img = card.querySelector('img');
      if (img) image = img.src || img.getAttribute('src') || '';
    }
    if (!title && handle) title = handle.replace(/-/g, ' ');
    e.preventDefault();
    e.stopPropagation();
    addToCartButtonAnimation(btn);

    function doAdd(p) {
      addItem({
        product_id: variantId,
        variant_id: variantId,
        handle: handle,
        title: title,
        price: p,
        quantity: 1,
        image: image
      });
      requestAnimationFrame(function () { requestAnimationFrame(openCartDrawer); });
    }

    if (price > 0) {
      doAdd(price);
    } else if (handle) {
      fetch('/api/product-price?handle=' + encodeURIComponent(handle))
        .then(function (r) { return r.json(); })
        .then(function (data) { doAdd(Number(data.price_inr) || 0); })
        .catch(function () { doAdd(0); });
    } else {
      doAdd(0);
    }
    return false;
  }

  var DELIVERY_MESSAGE = "You'll receive delivery updates by email.";
  var DELIVERY_GREEN = '#0a7c42';

  function applyDeliveryMessage() {
    document.querySelectorAll('.clickpost-edd__container').forEach(function (container) {
      var errEl = container.querySelector('#response-error, .response-error');
      if (errEl) {
        errEl.textContent = DELIVERY_MESSAGE;
        errEl.style.color = DELIVERY_GREEN;
        errEl.style.display = 'block';
      }
    });
  }

  function removeAppDownloadBanners() {
    var r = document.getElementById('appbrew-download-banner-root');
    var d = document.getElementById('appbrew-download-banner-desktop-root');
    if (r) r.remove();
    if (d) d.remove();
  }

  function init() {
    ensureCartFallback();
    updateCartCount();
    setTimeout(updateCartCount, 500);
    setTimeout(updateCartCount, 1500);

    removeAppDownloadBanners();
    setTimeout(removeAppDownloadBanners, 500);
    setTimeout(removeAppDownloadBanners, 1500);

    applyDeliveryMessage();
    setTimeout(applyDeliveryMessage, 500);
    setTimeout(applyDeliveryMessage, 2000);
    setTimeout(applyDeliveryMessage, 4000);
    var deliveryTries = 0;
    var deliveryInterval = setInterval(function () {
      applyDeliveryMessage();
      if (++deliveryTries >= 5) clearInterval(deliveryInterval);
    }, 1000);

    document.addEventListener('submit', function (e) {
      if (e.target && (e.target.matches('.product-form form, .shopify-product-form form, form[action*="/cart/add"]'))) {
        onProductFormSubmit(e);
      }
    }, true);

    document.addEventListener('click', function (e) {
      if (e.target.closest('add-to-cart')) {
        onAddToCartClick(e);
      }
      // Pincode delivery check: show "Deliverable" for any 6-digit pincode (no live API)
      var checkBtn = e.target.closest('.clickpost-edd__submit-button');
      if (checkBtn) {
        var container = checkBtn.closest('.clickpost-edd__container');
        if (container) {
          var input = container.querySelector('.clickpost-edd__drop_pincode-input');
          var pin = input && input.value ? input.value.trim() : '';
          if (/^\d{6}$/.test(pin)) {
            e.preventDefault();
            e.stopPropagation();
            var errEl = container.querySelector('#response-error, .response-error');
            var successEl = container.querySelector('#response-success');
            var eddEl = container.querySelector('#response-edd');
            if (errEl) errEl.style.display = 'none';
            if (errEl && errEl.textContent) errEl.textContent = '';
            if (successEl) successEl.style.display = 'flex';
            if (successEl) successEl.style.visibility = 'visible';
            if (eddEl) eddEl.textContent = '3–5 business days';
            var eddText = container.querySelector('#response-edd-text');
            if (eddText) { eddText.style.display = 'block'; eddText.textContent = 'Delivery in '; }
            return false;
          }
        }
      }
    }, true);

    // Cart: any click on cart icon/link/summary opens our drawer (use composedPath for shadow DOM)
    document.addEventListener('click', function (e) {
      var path = e.composedPath && e.composedPath();
      if (!path || !path.length) path = [e.target];
      var isCartClick = false;
      for (var i = 0; i < path.length; i++) {
        var el = path[i];
        if (!el || !el.nodeName) continue;
        if (el.id === 'cart-icon-bubble') { isCartClick = true; break; }
        if (el.tagName === 'SUMMARY' && el.closest && el.closest('cart-drawer')) { isCartClick = true; break; }
        if (el.tagName === 'A' && el.getAttribute && el.getAttribute('href') === '/cart') { isCartClick = true; break; }
        if (el.classList && el.classList.contains('header__icon--cart')) { isCartClick = true; break; }
        if (el.closest && (el.closest('#cart-icon-bubble') || el.closest('cart-drawer summary') || el.closest('a[href="/cart"]'))) { isCartClick = true; break; }
      }
      if (isCartClick) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openCartDrawer();
      }
    }, true);

    // Close cart when user taps/clicks outside the drawer (backdrop or any area not inside the cart)
    function isCartOpener(target) {
      if (!target || !target.closest) return false;
      return !!(target.closest('#cart-icon-bubble') || target.closest('cart-drawer summary') || target.closest('a[href="/cart"]') || target.closest('.header__icon--cart'));
    }
    document.addEventListener('click', function (e) {
      var drawer = document.getElementById('mysaree-cart-drawer');
      if (!drawer || !drawer.classList.contains('is-open')) return;
      if (drawer.contains(e.target)) return;
      if (isCartOpener(e.target)) return;
      closeCartDrawer();
    });
    document.addEventListener('touchend', function (e) {
      var drawer = document.getElementById('mysaree-cart-drawer');
      if (!drawer || !drawer.classList.contains('is-open')) return;
      var target = e.target;
      if (drawer.contains(target)) return;
      if (isCartOpener(target)) return;
      closeCartDrawer();
    }, { passive: true });

    document.querySelectorAll('a[href="/cart"]').forEach(function (a) { a.setAttribute('href', '#'); });

    initCollectionFilters();
  }

  // Category / colour / fabric / type filters on collection pages – use /api/products-filter-data for real attributes
  var collectionFilterData = null;

  function getCollectionFilterParams() {
    var params = {};
    var search = typeof window.location !== 'undefined' && window.location.search ? window.location.search.slice(1) : '';
    if (!search) return params;
    search.split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i === -1) return;
      var key = decodeURIComponent(pair.slice(0, i)).trim();
      var val = decodeURIComponent(pair.slice(i + 1)).trim();
      if (key.indexOf('filter.p.m.global.') !== 0 || !val) return;
      if (params[key] === undefined) params[key] = val;
      else {
        if (!Array.isArray(params[key])) params[key] = [params[key]];
        if (params[key].indexOf(val) === -1) params[key].push(val);
      }
    });
    return params;
  }

  function getCollectionUrlState() {
    var state = { filterParams: getCollectionFilterParams(), priceGte: null, priceLte: null, sortBy: '' };
    var search = typeof window.location !== 'undefined' && window.location.search ? window.location.search.slice(1) : '';
    if (!search) return state;
    search.split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i === -1) return;
      var key = decodeURIComponent(pair.slice(0, i)).trim();
      var val = decodeURIComponent(pair.slice(i + 1)).trim();
      if (key === 'filter.v.price.gte') state.priceGte = (val !== '' && !isNaN(parseInt(val, 10))) ? parseInt(val, 10) : null;
      else if (key === 'filter.v.price.lte') state.priceLte = (val !== '' && !isNaN(parseInt(val, 10))) ? parseInt(val, 10) : null;
      else if (key === 'sort_by') state.sortBy = val || '';
    });
    return state;
  }

  function getPriceFromCard(card) {
    var sale = card.querySelector('.price-item--sale[data-price]');
    if (sale) return parseInt(sale.getAttribute('data-price'), 10) || 0;
    var money = card.querySelector('.price-item .price-item--sale price-money bdi, .price-item--sale price-money bdi, [data-price]');
    if (money && money.getAttribute('data-price')) return parseInt(money.getAttribute('data-price'), 10) || 0;
    var bdi = card.querySelector('.price-item--sale bdi, .price-item bdi');
    if (bdi) {
      var text = bdi.textContent.replace(/[^\d]/g, '');
      return parseInt(text, 10) * 100 || 0;
    }
    return 0;
  }

  function getTitleFromCard(card) {
    var flits = card.querySelector('[data-flits-product-title]');
    if (flits) return (flits.getAttribute('data-flits-product-title') || '').trim();
    var el = card.querySelector('.card-information__text, .card__title');
    return el ? el.textContent.trim() : '';
  }

  function getHandleFromCard(card) {
    var flits = card.querySelector('[data-flits-product-handle]');
    if (flits) return (flits.getAttribute('data-flits-product-handle') || '').trim();
    var link = card.querySelector('a[href*="/products/"]');
    if (link && link.href) {
      var m = link.href.match(/\/products\/([^/?]+)/);
      if (m) return m[1].trim();
    }
    return '';
  }

  function productCardMatchesFilters(card, filterParams, filterData) {
    var handle = getHandleFromCard(card);
    if (!handle) return Object.keys(filterParams).length === 0;
    var title = getTitleFromCard(card) || '';
    var startText = (title + ' ' + (handle || '')).replace(/-/g, ' ').toLowerCase().trim();
    var vals = function (v) { return Array.isArray(v) ? v : (v ? [String(v).trim()] : []); };
    function colorStartsWith(productStartText, selectedColor) {
      var c = (selectedColor || '').toLowerCase().trim();
      if (!c) return true;
      return productStartText === c || productStartText.startsWith(c + ' ') || productStartText.startsWith(c + '-');
    }
    if (filterData && filterData[handle]) {
      var att = filterData[handle];
      for (var key in filterParams) {
        var filterVals = vals(filterParams[key]).filter(Boolean);
        if (!filterVals.length) continue;
        var match = false;
        if (key.indexOf('filter.p.m.global.fabric') !== -1) {
          if (!att.fabric || !att.fabric.length) return false;
          match = filterVals.some(function (val) {
            return att.fabric.some(function (f) { return f.toLowerCase() === val.toLowerCase(); });
          });
        } else if (key.indexOf('filter.p.m.global.color') !== -1) {
          if (att.color && att.color.length) {
            match = filterVals.some(function (val) {
              return att.color.some(function (c) { return c.toLowerCase() === (val || '').toLowerCase(); });
            });
          } else {
            match = filterVals.some(function (val) { return colorStartsWith(startText, val); });
          }
        } else if (key.indexOf('filter.p.m.global.type') !== -1 || key.indexOf('filter.p.m.global.work') !== -1) {
          if (!att.type || !att.type.length) return false;
          match = filterVals.some(function (val) {
            return att.type.some(function (t) { return t.toLowerCase() === val.toLowerCase(); });
          });
        } else if (key.indexOf('filter.p.m.global.category') !== -1) {
          if (!att.category || !att.category.length) return false;
          match = filterVals.some(function (val) {
            return att.category.some(function (c) { return c.toLowerCase() === val.toLowerCase(); });
          });
        }
        if (!match) return false;
      }
      return true;
    }
    var flits = card.querySelector('[data-flits-product-handle]');
    if (flits) title = (flits.getAttribute('data-flits-product-title') || '').toLowerCase();
    var titleEl = card.querySelector('.card-information__text, .card__title, .card-information__text h4');
    if (titleEl && !title) title = titleEl.textContent.trim().toLowerCase();
    var extra = card.querySelector('.card-information .full-unstyled-link [class*="visually-hidden"]');
    if (extra && extra.textContent) title = title + ' ' + extra.textContent.trim().toLowerCase();
    startText = (title + ' ' + (handle || '')).replace(/-/g, ' ').toLowerCase().trim();
    var text = (handle + ' ' + title).toLowerCase().replace(/-/g, ' ');
    for (var key in filterParams) {
      var filterVals = Array.isArray(filterParams[key]) ? filterParams[key] : [filterParams[key]];
      var anyMatch;
      if (key.indexOf('filter.p.m.global.color') !== -1) {
        anyMatch = filterVals.some(function (val) { return colorStartsWith(startText, val); });
      } else {
        anyMatch = filterVals.some(function (val) {
          val = (val || '').toLowerCase().replace(/\s+/g, ' ').trim();
          if (!val) return true;
          if (val.indexOf(' ') !== -1) return text.indexOf(val) !== -1;
          var escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp('(^|\\s)' + escaped + '(\\s|$)', 'i').test(text);
        });
      }
      if (!anyMatch) return false;
    }
    return true;
  }

  function applyCollectionFilters() {
    var path = typeof window.location !== 'undefined' ? window.location.pathname || '' : '';
    if (path.indexOf('/collections/') !== 0 || path.indexOf('/products/') !== -1) return;
    var urlState = getCollectionUrlState();
    var filterParams = urlState.filterParams;
    var priceGte = urlState.priceGte;
    var priceLte = urlState.priceLte;
    var sortBy = (urlState.sortBy || '').toLowerCase();
    function syncFacetFormToUrl(form) {
      if (!form) return;
      form.querySelectorAll('input[name^="filter.p.m.global"]').forEach(function (inp) {
        var key = inp.getAttribute('name');
        var val = (inp.value || '').trim().toLowerCase();
        var paramVal = filterParams[key];
        var match = key && paramVal && (Array.isArray(paramVal)
          ? paramVal.some(function (v) { return (v || '').toLowerCase() === val; })
          : (paramVal || '').toLowerCase() === val);
        inp.checked = !!match;
      });
      var gteInp = form.querySelector('input[name="filter.v.price.gte"]');
      var lteInp = form.querySelector('input[name="filter.v.price.lte"]');
      if (gteInp) gteInp.value = priceGte != null ? (priceGte / 100) : '';
      if (lteInp) lteInp.value = priceLte != null ? (priceLte / 100) : '';
      var sortSelect = form.querySelector('select[name="sort_by"]');
      if (sortSelect) sortSelect.value = urlState.sortBy || (sortSelect.options[0] && sortSelect.options[0].value) || '';
    }
    syncFacetFormToUrl(document.getElementById('FacetFiltersForm'));
    syncFacetFormToUrl(document.getElementById('FacetFiltersFormMobile'));
    var gridEl = document.getElementById('product-grid') || document.querySelector('#ProductGridContainer .product-grid');
    var cards = gridEl ? gridEl.querySelectorAll('.grid__item') : [];
    if (!cards.length) cards = document.querySelectorAll('#product-grid .grid__item, #ProductGridContainer .grid__item');
    if (!cards.length) cards = document.querySelectorAll('.product-grid .grid__item');
    if (!cards.length) cards = document.querySelectorAll('.grid__item');
    var visible = [];
    cards.forEach(function (el) {
      var card = el.classList && el.classList.contains('grid__item') ? el : (el.closest && el.closest('.grid__item')) || el;
      if (!card) return;
      var show = (Object.keys(filterParams).length === 0 || productCardMatchesFilters(card, filterParams, collectionFilterData));
      if (show && (priceGte != null || priceLte != null)) {
        var price = getPriceFromCard(card);
        if (priceGte != null && price < priceGte) show = false;
        if (priceLte != null && price > priceLte) show = false;
      }
      card.style.display = show ? '' : 'none';
      if (show) visible.push(card);
    });
    if (sortBy && visible.length) {
      var grid = visible[0].parentNode;
      if (grid) {
        visible.sort(function (a, b) {
          var priceA = getPriceFromCard(a);
          var priceB = getPriceFromCard(b);
          var titleA = getTitleFromCard(a).toLowerCase();
          var titleB = getTitleFromCard(b).toLowerCase();
          if (sortBy === 'price-ascending') return priceA - priceB;
          if (sortBy === 'price-descending') return priceB - priceA;
          if (sortBy === 'title-ascending') return titleA < titleB ? -1 : titleA > titleB ? 1 : 0;
          if (sortBy === 'title-descending') return titleB < titleA ? -1 : titleB > titleA ? 1 : 0;
          if (sortBy === 'created-descending' || sortBy === 'created-ascending') {
            var idxA = Array.prototype.indexOf.call(cards, a);
            var idxB = Array.prototype.indexOf.call(cards, b);
            return sortBy === 'created-descending' ? idxA - idxB : idxB - idxA;
          }
          return 0;
        });
        visible.forEach(function (node) { grid.appendChild(node); });
      }
    }
    var countEl = document.getElementById('ProductCount');
    var countMobile = document.getElementById('ProductCountMobile');
    var countStr = visible.length === 1 ? '1 product' : visible.length + ' products';
    if (countEl) countEl.textContent = countStr;
    if (countMobile) countMobile.textContent = countStr;
    var container = document.getElementById('ProductGridContainer') || gridEl && gridEl.parentElement;
    var noResultsId = 'collection-no-results-message';
    var noResults = document.getElementById(noResultsId);
    if (visible.length === 0 && Object.keys(filterParams).length > 0 && container) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.id = noResultsId;
        noResults.className = 'collection-no-results';
        noResults.style.cssText = 'grid-column: 1 / -1; padding: 2rem; text-align: center;';
        noResults.innerHTML = '<p>No products match your filters. Try changing filters or <a href="' + (path.split('?')[0]) + '">clear all</a>.</p>';
        if (gridEl && gridEl.parentNode) gridEl.parentNode.insertBefore(noResults, gridEl.nextSibling);
        else container.appendChild(noResults);
      }
      noResults.style.display = '';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  }

  var quickFilterMap = {
    'silk sarees': { param: 'filter.p.m.global.fabric', value: 'Silk' },
    'cotton sarees': { param: 'filter.p.m.global.fabric', value: 'Cotton' },
    'linen sarees': { param: 'filter.p.m.global.fabric', value: 'Linen' },
    'green sarees': { param: 'filter.p.m.global.color', value: 'Green' },
    'blue sarees': { param: 'filter.p.m.global.color', value: 'Blue' },
    'pink sarees': { param: 'filter.p.m.global.color', value: 'Pink' },
    'plain sarees': { param: 'filter.p.m.global.type', value: 'Plain' },
    'printed sarees': { param: 'filter.p.m.global.type', value: 'Printed' }
  };

  function initCollectionFilters() {
    var path = typeof window.location !== 'undefined' ? window.location.pathname || '' : '';
    if (path.indexOf('/collections/') !== 0 || path.indexOf('/products/') !== -1) return;
    applyCollectionFilters();
    setTimeout(applyCollectionFilters, 50);
    fetch('/api/products-filter-data')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        collectionFilterData = data && typeof data === 'object' ? data : null;
        applyCollectionFilters();
      })
      .catch(function () { collectionFilterData = {}; applyCollectionFilters(); });
    document.addEventListener('click', function (e) {
      var path = window.location.pathname || '';
      var link = e.target && (e.target.closest ? e.target.closest('a') : null);
      if (link && link.tagName === 'A') {
        var href = (link.getAttribute('href') || '').split('?')[0];
        if (path.indexOf('/collections/') === 0 && path.indexOf('/products/') === -1 && (link.classList.contains('facets__reset') || link.closest('.facet-remove') || (href === path && window.location.search))) {
          e.preventDefault();
          e.stopPropagation();
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', path);
          }
          applyCollectionFilters();
          return;
        }
        var dataParam = link.getAttribute('data-filter-param');
        var dataValue = link.getAttribute('data-filter-value');
        var dataFilter = link.getAttribute('data-collection-filter');
        if (dataParam && dataValue) {
          e.preventDefault();
          e.stopPropagation();
          var basePath = path.split('?')[0];
          var current = getCollectionFilterParams();
          current[dataParam] = dataValue;
          var parts = [];
          for (var k in current) { if (current[k]) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(current[k])); }
          var q = parts.join('&');
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', basePath + (q ? '?' + q : ''));
          }
          applyCollectionFilters();
          return;
        }
        if (dataFilter && typeof dataFilter === 'string') {
          var eq = dataFilter.indexOf('=');
          if (eq !== -1) {
            var p = 'filter.p.m.global.' + dataFilter.slice(0, eq).trim();
            var v = dataFilter.slice(eq + 1).trim();
            if (p && v) {
              e.preventDefault();
              e.stopPropagation();
              var current = getCollectionFilterParams();
              current[p] = v;
              var parts = [];
              for (var k in current) { if (current[k]) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(current[k])); }
              var q = parts.join('&');
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, '', path.split('?')[0] + (q ? '?' + q : ''));
              }
              applyCollectionFilters();
              return;
            }
          }
        }
        if (path.indexOf('/collections/') === 0 && path.indexOf('/products/') === -1) {
          var label = (link.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');
          var mapped = quickFilterMap[label];
          if (mapped) {
            e.preventDefault();
            e.stopPropagation();
            var current = getCollectionFilterParams();
            current[mapped.param] = mapped.value;
            var parts = [];
            for (var k in current) { if (current[k]) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(current[k])); }
            var query = parts.join('&');
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, '', path.split('?')[0] + (query ? '?' + query : ''));
            }
            applyCollectionFilters();
            return;
          }
        }
      }
      var a = e.target && (e.target.closest ? e.target.closest('a[href*="filter."]') : null) || e.target.closest('a[href*="sort_by="]');
      if (!a || a.tagName !== 'A') return;
      var href = a.getAttribute('href');
      if (!href) return;
      var isFilter = href.indexOf('filter.p.m.global') !== -1 || href.indexOf('filter.v.price') !== -1 || href.indexOf('sort_by=') !== -1;
      if (!isFilter) return;
      e.preventDefault();
      e.stopPropagation();
      var base = (href.split('?')[0] || window.location.pathname).trim() || window.location.pathname;
      var linkQuery = href.indexOf('?') !== -1 ? href.slice(href.indexOf('?') + 1) : '';
      var isColorLink = linkQuery.indexOf('filter.p.m.global.color=') !== -1;
      var query = linkQuery;
      if (isColorLink && window.location.search) {
        var currentParts = window.location.search.slice(1).split('&');
        var out = [];
        var colorVal = null;
        var linkParams = linkQuery.split('&');
        for (var qi = 0; qi < linkParams.length; qi++) {
          if (linkParams[qi].indexOf('filter.p.m.global.color=') === 0) {
            colorVal = linkParams[qi];
            break;
          }
        }
        for (var pi = 0; pi < currentParts.length; pi++) {
          if (currentParts[pi].indexOf('filter.p.m.global.color=') === 0) continue;
          out.push(currentParts[pi]);
        }
        if (colorVal) out.push(colorVal);
        query = out.join('&');
      }
      if (typeof window.history !== 'undefined' && window.history.replaceState) {
        window.history.replaceState({}, '', base + (query ? '?' + query : ''));
      }
      applyCollectionFilters();
    }, true);
    function buildCollectionQueryFromForm(form) {
      if (!form) return '';
      var parts = [];
      var colorAdded = false;
      form.querySelectorAll('input[name^="filter.p.m.global"]:checked').forEach(function (inp) {
        var n = inp.getAttribute('name');
        var v = inp.value;
        if (!n || !v) return;
        if (n.indexOf('filter.p.m.global.color') !== -1) {
          if (colorAdded) return;
          colorAdded = true;
        }
        parts.push(encodeURIComponent(n) + '=' + encodeURIComponent(v));
      });
      var gteInp = form.querySelector('input[name="filter.v.price.gte"]');
      var lteInp = form.querySelector('input[name="filter.v.price.lte"]');
      if (gteInp && gteInp.value) {
        var gte = Math.round(parseFloat(gteInp.value) * 100);
        if (!isNaN(gte)) parts.push('filter.v.price.gte=' + gte);
      }
      if (lteInp && lteInp.value) {
        var lte = Math.round(parseFloat(lteInp.value) * 100);
        if (!isNaN(lte)) parts.push('filter.v.price.lte=' + lte);
      }
      var sortSelect = form.querySelector('select[name="sort_by"]');
      if (sortSelect && sortSelect.value) parts.push('sort_by=' + encodeURIComponent(sortSelect.value));
      return parts.join('&');
    }
    function onFacetFormChange(updatedForm) {
      var path = window.location.pathname || '';
      if (path.indexOf('/collections/') !== 0 || path.indexOf('/products/') !== -1) return;
      var form = updatedForm || document.getElementById('FacetFiltersForm') || document.getElementById('FacetFiltersFormMobile');
      var query = form ? buildCollectionQueryFromForm(form) : '';
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', path.split('?')[0] + (query ? '?' + query : ''));
      }
      applyCollectionFilters();
    }
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.form) return;
      var name = (t.getAttribute && t.getAttribute('name')) || '';
      if (name.indexOf('filter.p.m.global') === 0 || name === 'filter.v.price.gte' || name === 'filter.v.price.lte' || name === 'sort_by') {
        var path = window.location.pathname || '';
        if (path.indexOf('/collections/') === 0 && path.indexOf('/products/') === -1) onFacetFormChange(t.form);
      }
    }, true);
    var facetForm = document.getElementById('FacetFiltersForm');
    var mobileForm = document.getElementById('FacetFiltersFormMobile');
    if (facetForm) {
      var applyBtn = facetForm.querySelector('button[type="submit"], .facets__form button, [name="filter-apply"]');
      if (applyBtn) {
        applyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          onFacetFormChange(facetForm);
        });
      }
    }
    if (mobileForm) {
      var mobileApply = mobileForm.querySelector('button[type="submit"], .facets__form button, [name="filter-apply"]');
      if (mobileApply) {
        mobileApply.addEventListener('click', function (e) {
          e.preventDefault();
          onFacetFormChange(mobileForm);
        });
      }
    }
    window.addEventListener('popstate', applyCollectionFilters);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.mysareeCart = {
    getCart: getCart,
    setCart: setCart,
    addItem: addItem,
    updateCartCount: updateCartCount,
    openCartDrawer: openCartDrawer,
    closeCartDrawer: closeCartDrawer
  };
})();
