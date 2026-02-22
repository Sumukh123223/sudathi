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

  function clearOldProductSections() {
    var path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
    if (path.indexOf('/collections/') === 0 && path.indexOf('/products/') === -1) return;
    document.querySelectorAll('section .product-grid, section .slider, ul.product-grid').forEach(function (el) {
      if (!el.querySelector('.card--product, .card-wrapper')) return;
      var section = el.closest('section');
      if (section) section.style.display = 'none';
      else el.innerHTML = '';
    });
  }

  function init() {
    clearOldProductSections();
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

  // Manual product catalog – loads from /api/products-catalog, no URL/fetch for filters
  var PRODUCTS = [];
  var activeFilters = { category: null, color: null, fabric: null, type: null, work: null };

  function addProduct(product) {
    PRODUCTS.push(product);
    applyFilters();
  }

  function normalize(v) { return (v == null ? '' : String(v)).toLowerCase().trim(); }

  function productMatchesFilters(p) {
    if (!activeFilters.category && !activeFilters.color && !activeFilters.fabric && !activeFilters.type && !activeFilters.work) return true;
    var cat = normalize(p.category);
    var col = normalize(p.color);
    var fab = normalize(p.fabric);
    var typ = normalize(p.type);
    var wrk = normalize(p.work);
    if (activeFilters.category && !cat.includes(normalize(activeFilters.category))) return false;
    if (activeFilters.color && !col.includes(normalize(activeFilters.color))) return false;
    if (activeFilters.fabric && !fab.includes(normalize(activeFilters.fabric))) return false;
    if (activeFilters.type && !typ.includes(normalize(activeFilters.type))) return false;
    if (activeFilters.work && !wrk.includes(normalize(activeFilters.work))) return false;
    return true;
  }

  function showLoader() {
    var c = document.getElementById('ProductGridContainer');
    if (c) { var col = c.querySelector('.collection'); if (col) col.classList.add('loading'); }
    document.querySelectorAll('.product-count__text').forEach(function (el) { el.classList.add('loading'); });
  }

  function hideLoader() {
    var c = document.getElementById('ProductGridContainer');
    if (c) { var col = c.querySelector('.collection'); if (col) col.classList.remove('loading'); }
    document.querySelectorAll('.product-count__text').forEach(function (el) { el.classList.remove('loading'); });
    document.querySelectorAll('#ProductGridContainer .loading-overlay, .product-grid-container .loading-overlay').forEach(function (el) { el.style.display = 'none'; });
    document.querySelectorAll('.loading-overlay__spinner, .icon-spinner').forEach(function (el) { el.style.display = 'none'; });
  }

  function getCollectionSlug() {
    var path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
    var m = path.match(/\/collections\/([^/]+)/);
    return m ? m[1] : 'saree';
  }

  function buildProductCard(p) {
    var handle = p.handle || (p.id || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    var slug = getCollectionSlug();
    var productUrl = '/collections/' + slug + '/products/' + handle;
    var price = Number(p.price) || 0;
    var pricePaise = Math.round(price * 100);
    var imgSrc = ((p.images && p.images[0]) || p.image || '').replace(/&amp;/g, '&');
    var title = (p.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<li class="grid__item"><div class="card-wrapper" data-product-id="' + (p.id || '') + '">' +
      '<div class="card card--product">' +
      '<a href="' + productUrl + '" class="card__media media-wrapper">' +
      '<div class="media media--adapt"><img src="' + imgSrc + '" alt="' + title + '" loading="lazy" width="400" height="500"></div></a>' +
      '<div class="card-information__button"><add-to-cart class="button button--small" data-variant-id="' + (p.id || '') + '" data-product-url="' + productUrl + '">Add to cart</add-to-cart></div>' +
      '<div class="card-information"><a href="' + productUrl + '" class="card-information__text h4">' + title + '</a>' +
      '<div class="price"><span class="price-item price-item--sale" data-price="' + pricePaise + '"><price-money><bdi>₹ ' + (price > 0 ? Math.round(price) : '0') + '</bdi></price-money></span></div></div></div></li>';
  }

  function renderProducts(products) {
    showLoader();
    var grid = document.getElementById('product-grid');
    var container = document.getElementById('ProductGridContainer');
    if (!grid && container) grid = container.querySelector('.product-grid, ul[role="list"]');
    if (!grid) { hideLoader(); return; }
    var keep = grid.querySelectorAll('.multicolumn-list__item');
    var keepHtml = '';
    keep.forEach(function (el) { keepHtml += el.outerHTML; });
    grid.innerHTML = '';
    if (products.length === 0) {
      grid.insertAdjacentHTML('beforeend', '<li class="grid__item" style="grid-column:1/-1;text-align:center;padding:3rem;color:#64748b;"><p>No products yet. Add products via <a href="/admin/add-product.html">Admin</a>.</p></li>');
    } else {
      products.forEach(function (p) {
        grid.insertAdjacentHTML('beforeend', buildProductCard(p));
      });
    }
    if (keepHtml) grid.insertAdjacentHTML('beforeend', keepHtml);
    var countEl = document.getElementById('ProductCount');
    var countMobile = document.getElementById('ProductCountMobile');
    var n = products.length;
    var countStr = n === 1 ? '1 product' : n + ' products';
    if (countEl) countEl.textContent = countStr;
    if (countMobile) countMobile.textContent = countStr;
    var noResults = document.getElementById('collection-no-results-message');
    if (noResults) noResults.style.display = 'none';
    hideLoader();
  }

  function getActiveFiltersFromForm(form) {
    var f = { category: null, color: null, fabric: null, type: null, work: null };
    if (!form) return f;
    form.querySelectorAll('input[name^="filter.p.m.global"]:checked').forEach(function (inp) {
      var n = inp.getAttribute('name');
      var v = (inp.value || '').trim();
      if (!n || !v) return;
      if (n.indexOf('filter.p.m.global.color') !== -1) f.color = v;
      else if (n.indexOf('filter.p.m.global.fabric') !== -1) f.fabric = v;
      else if (n.indexOf('filter.p.m.global.type') !== -1) f.type = v;
      else if (n.indexOf('filter.p.m.global.work') !== -1) f.work = v;
      else if (n.indexOf('filter.p.m.global.category') !== -1) f.category = v;
    });
    return f;
  }

  function syncFormToFilters(form) {
    if (!form) return;
    form.querySelectorAll('input[name^="filter.p.m.global"]').forEach(function (inp) {
      var n = inp.getAttribute('name');
      var v = (inp.value || '').trim().toLowerCase();
      var match = false;
      if (n.indexOf('filter.p.m.global.color') !== -1) match = activeFilters.color && normalize(activeFilters.color) === v;
      else if (n.indexOf('filter.p.m.global.fabric') !== -1) match = activeFilters.fabric && normalize(activeFilters.fabric) === v;
      else if (n.indexOf('filter.p.m.global.type') !== -1) match = activeFilters.type && normalize(activeFilters.type) === v;
      else if (n.indexOf('filter.p.m.global.work') !== -1) match = activeFilters.work && normalize(activeFilters.work) === v;
      else if (n.indexOf('filter.p.m.global.category') !== -1) match = activeFilters.category && normalize(activeFilters.category) === v;
      inp.checked = !!match;
    });
  }

  function applyFilters() {
    var path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
    if (path.indexOf('/collections/') !== 0 || path.indexOf('/products/') !== -1) return;
    var filtered = PRODUCTS.filter(productMatchesFilters);
    renderProducts(filtered);
    syncFormToFilters(document.getElementById('FacetFiltersForm'));
    syncFormToFilters(document.getElementById('FacetFiltersFormMobile'));
  }

  function loadProductsCatalog(cb) {
    fetch('/api/products-catalog')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        if (Array.isArray(list)) list.forEach(function (p) { PRODUCTS.push(p); });
        if (typeof cb === 'function') cb();
      })
      .catch(function () { if (typeof cb === 'function') cb(); });
  }

  function initCollectionFilters() {
    var path = (typeof window !== 'undefined' && window.location && window.location.pathname) || '';
    if (path.indexOf('/collections/') !== 0 || path.indexOf('/products/') !== -1) return;
    var grid = document.getElementById('product-grid') || (document.getElementById('ProductGridContainer') && document.getElementById('ProductGridContainer').querySelector('.product-grid, ul[role="list"]'));
    if (grid) grid.innerHTML = '';
    loadProductsCatalog(function () { applyFilters(); });
    var style = document.getElementById('mysaree-hide-loading');
    if (!style) {
      style = document.createElement('style');
      style.id = 'mysaree-hide-loading';
      style.textContent = '#ProductGridContainer .loading-overlay,.product-grid-container .loading-overlay,.product-count .loading-overlay__spinner,.collection.loading .loading-overlay{display:none!important}';
      (document.head || document.documentElement).appendChild(style);
    }
    applyFilters();
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.form) return;
      var name = (t.getAttribute && t.getAttribute('name')) || '';
      if (name.indexOf('filter.p.m.global') === 0) {
        e.preventDefault();
        e.stopPropagation();
        activeFilters = getActiveFiltersFromForm(t.form);
        applyFilters();
      }
    }, true);
    [document.getElementById('FacetFiltersForm'), document.getElementById('FacetFiltersFormMobile')].forEach(function (form) {
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        activeFilters = getActiveFiltersFromForm(form);
        applyFilters();
        return false;
      }, true);
    });
    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!link || link.tagName !== 'A') return;
      if (path.indexOf('/collections/') !== 0 || path.indexOf('/products/') !== -1) return;
      var href = (link.getAttribute('href') || '').split('?')[0];
      if ((link.classList.contains('facets__reset') || link.closest('.facet-remove')) && (href === path || href.indexOf('/collections/') === 0)) {
        e.preventDefault();
        e.stopPropagation();
        activeFilters = { category: null, color: null, fabric: null, type: null, work: null };
        applyFilters();
      }
    }, true);
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
    closeCartDrawer: closeCartDrawer,
    addProduct: addProduct,
    PRODUCTS: PRODUCTS
  };
})();
