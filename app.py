#!/usr/bin/env python3
"""
My Saree – static site + cart + checkout with your payment gateway.
Serves site, /checkout.html, /order-placed.html, and API for create-order + payment.
Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for Razorpay; or use GATEWAY=manual to skip gateway.
"""
import json
import os
import uuid
import warnings

# Suppress urllib3/OpenSSL warning on macOS (LibreSSL vs OpenSSL)
warnings.filterwarnings("ignore", message=".*urllib3 v2 only supports OpenSSL.*", category=UserWarning)

from flask import Flask, request, send_from_directory, redirect, jsonify, Response

# Load .env if present (pip install python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
CART_SCRIPT = b'<script src="/assets/mysaree-cart.js"></script>'
# Stub Shopify analytics so it never fetches sudathi.com/api/collect (avoids CORS errors on static clone)
ANALYTICS_STUB = b'''<script>(function(){var n=function(){};var noop={track:n,page:n,ready:function(f){if(typeof f==="function")f();}};window.ShopifyAnalytics=window.ShopifyAnalytics||{};try{Object.defineProperty(window.ShopifyAnalytics,"lib",{get:function(){return noop;},set:function(){},configurable:true});}catch(e){window.ShopifyAnalytics.lib=noop;}window.Shopify=window.Shopify||{};window.Shopify.analytics={replayQueue:[]};})();</script>'''
ORDERS_FILE = os.path.join(ROOT, "orders.json")
PRODUCTS_FILE = os.path.join(ROOT, "products.json")
ADMIN_ATTRIBUTES_FILE = os.path.join(ROOT, "product_attributes_admin.json")
app = Flask(__name__, static_folder=ROOT, static_url_path="")


def _product_prices_by_handle():
    """Return dict handle -> price_inr from products.json (fallback when cart sends price 0)."""
    if not os.path.isfile(PRODUCTS_FILE):
        return {}
    try:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
            products = json.load(f)
        return {str(p.get("handle", "")): float(p.get("price_inr") or 0) for p in products if p.get("handle")}
    except Exception:
        return {}

# Filter attribute keywords (match in product title/handle/tags) – aligned with collection facet params
_FABRICS = (
    "Cotton", "Silk", "Linen", "Georgette", "Chiffon", "Crepe", "Satin", "Organza", "Chanderi", "Chinnon",
    "Cotton Blend", "Cotton Linen", "Cotton Silk", "Silk Blend", "Tissue Silk", "Tussar Silk", "Crush Silk",
    "Crepe Silk", "Khadi", "Shimmer", "Net", "Vichitra Silk", "Dola Silk", "Crush Tissue",
)
_COLORS = (
    "Beige", "Black", "Blue", "Brown", "Green", "Grey", "Pink", "Red", "White", "Yellow", "Maroon", "Navy",
    "Cream", "Golden", "Lavender", "Magenta", "Mauve", "Multicoloured", "Mustard", "Orange", "Peach",
    "Purple", "Rust", "Turquoise", "Violet", "Wine", "Copper", "Indigo", "Khaki", "Off-White", "Rani Pink",
    "Teal", "Dusty Pink", "Dusty Purple", "Dusty Rose", "Dusty Wine", "Dusty Beige",
    "Navy Blue", "Light Blue", "Dark Blue", "Baby Pink", "Light Pink", "Dark Pink", "Light Green",
    "Dark Green", "Olive Green", "Teal Green", "Light Brown", "Light Yellow", "Light Beige", "Light Mint",
    "Coral", "Coral Pink", "Terracotta", "Sapphire", "Royal Blue", "Rose", "Rose Pink", "Dusty",
)
_TYPES = (
    "Printed", "Plain", "Woven", "Embroidered", "Banarasi", "Kalamkari", "Kanjivaram", "Paithani",
    "Bandhani", "Ikkat", "Patola", "Sequence", "Solid", "Floral Printed", "Foil Printed", "Geometric Printed",
    "Lace", "Laheriya", "Jamdani", "Baluchari", "Swarovski", "Zari Stripe", "Dyed", "Hand Work",
    "Mirror Work", "Stone Work", "Embroidery", "Warli", "Kalamkari",
)
_CATEGORIES = ("Sarees", "Handsfree Sarees", "Ready To Wear Sarees", "Ready To Wear Sarees With Pocket", "Blouse", "Shapewear", "Daily Wear", "Office Wear", "Party Wear", "Festive")


def _extract_filter_attributes(product):
    """From one product dict return { fabric: [], color: [], type: [], category: [] } for filtering."""
    title = (product.get("title") or "").strip()
    handle = (product.get("handle") or "").replace("-", " ")
    tags = product.get("tags") or []
    prod_type = (product.get("type") or "").strip()
    text = " ".join([title, handle] + [str(t) for t in tags]).replace("-", " ")
    text_lower = text.lower()

    def find_words(word_list, allow_multi_word=True):
        found = []
        padded = " " + text_lower + " "
        for w in word_list:
            w_clean = w.replace("-", " ").strip()
            w_low = w_clean.lower()
            if not w_low:
                continue
            if allow_multi_word and " " in w_low:
                if " " + w_low + " " in padded or text_lower.startswith(w_low + " ") or text_lower.endswith(" " + w_low):
                    found.append(w)
            else:
                if " " + w_low + " " in padded or padded.startswith(" " + w_low + " ") or padded.endswith(" " + w_low + " "):
                    found.append(w)
        return list(dict.fromkeys(found))

    fabric = find_words(_FABRICS)
    color = find_words(_COLORS)
    type_vals = find_words(_TYPES)
    category = []
    if prod_type:
        if prod_type in _CATEGORIES and prod_type not in category:
            category.append(prod_type)
        elif prod_type not in category:
            category.append(prod_type)
    for c in _CATEGORIES:
        c_low = c.lower().replace(" ", " ")
        if c in title or c_low in text_lower or any(c.lower() in str(t).lower() for t in tags):
            if c not in category:
                category.append(c)
    handle_raw = product.get("handle") or ""
    if "Ready To Wear" in title or "ready to wear" in text_lower or "ready-to-wear" in handle_raw or "ready to wear" in " ".join(str(t) for t in tags):
        for c in ("Ready To Wear Sarees", "Ready To Wear Sarees With Pocket"):
            if c not in category:
                category.append(c)
    if "handsfree" in text_lower or "handsfree" in handle_raw:
        if "Handsfree Sarees" not in category:
            category.append("Handsfree Sarees")
    if "pocket" in text_lower or "pocket" in handle_raw:
        if "Ready To Wear Sarees With Pocket" not in category:
            category.append("Ready To Wear Sarees With Pocket")
    if not category and prod_type:
        category = [prod_type]

    return {"fabric": fabric, "color": color, "type": type_vals, "category": category}


def _load_admin_attributes():
    """Load admin-assigned filter attributes { handle: { category: [], color: [], fabric: [], type: [] } }."""
    if not os.path.isfile(ADMIN_ATTRIBUTES_FILE):
        return {}
    try:
        with open(ADMIN_ATTRIBUTES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_admin_attributes(data):
    """Save admin-assigned filter attributes."""
    with open(ADMIN_ATTRIBUTES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _product_filter_data():
    """Return dict handle -> filter attributes. Admin overrides (when set) replace auto-extracted values."""
    if not os.path.isfile(PRODUCTS_FILE):
        return {}
    try:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
            products = json.load(f)
    except Exception:
        return {}
    admin = _load_admin_attributes()
    out = {}
    for p in products:
        handle = p.get("handle")
        if not handle:
            continue
        base = _extract_filter_attributes(p)
        over = admin.get(str(handle)) or {}
        out[str(handle)] = {
            "category": over.get("category") if over.get("category") is not None else base["category"],
            "color": over.get("color") if over.get("color") is not None else base["color"],
            "fabric": over.get("fabric") if over.get("fabric") is not None else base["fabric"],
            "type": over.get("type") if over.get("type") is not None else base["type"],
        }
    return out

# Gateway: .env or RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
GATEWAY_KEY = (os.environ.get("RAZORPAY_KEY_ID") or "").strip()
GATEWAY_SECRET = (os.environ.get("RAZORPAY_KEY_SECRET") or "").strip()
USE_RAZORPAY = bool(GATEWAY_KEY and GATEWAY_SECRET)


def load_orders():
    if os.path.isfile(ORDERS_FILE):
        with open(ORDERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_orders(orders):
    with open(ORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(orders, f, indent=2)


def _html_with_cart(file_path):
    """Read HTML file and inject cart script before </body> if not present."""
    with open(file_path, "rb") as f:
        body = f.read()
    if b"mysaree-cart.js" not in body and b"</body>" in body:
        body = body.replace(b"</body>", CART_SCRIPT + b"\n</body>")
    return body


def _send_html_with_cart(file_path, mimetype="text/html"):
    body = _html_with_cart(file_path)
    return Response(body, mimetype=mimetype)


def _send_html_file(directory, filename):
    # Stream file as-is (no inject) to avoid loading large collection/product HTML into memory
    return send_from_directory(directory, filename)


def _find_product_html(handle):
    """Return (directory_abspath, filename) for first collections/<cat>/products/<handle>.html found, else (None, None)."""
    if not handle or handle.endswith(".html"):
        return None, None
    base = os.path.join(ROOT, "collections")
    if not os.path.isdir(base):
        return None, None
    for cat in os.listdir(base):
        prod_dir = os.path.join(base, cat, "products")
        if os.path.isdir(prod_dir):
            f = handle + ".html" if not handle.endswith(".html") else handle
            if os.path.isfile(os.path.join(prod_dir, f)):
                return prod_dir, f
    return None, None


def _html_with_cart_from_path(file_path):
    """Read HTML file and inject cart script + analytics stub. file_path is absolute."""
    if not os.path.isfile(file_path):
        return None
    with open(file_path, "rb") as f:
        body = f.read()
    if b"mysaree-cart.js" not in body and b"</body>" in body:
        body = body.replace(b"</body>", CART_SCRIPT + b"\n</body>")
    if b"</head>" in body and ANALYTICS_STUB not in body:
        body = body.replace(b"</head>", ANALYTICS_STUB + b"\n</head>", 1)
    return Response(body, mimetype="text/html")


def _send_product_html(dir_path, filename):
    """Serve product HTML with cart script injected so add-to-cart and pincode check work."""
    path = os.path.join(dir_path, filename)
    resp = _html_with_cart_from_path(path)
    return resp


def _send_html_from_root(filename):
    path = os.path.join(ROOT, filename)
    if not os.path.isfile(path):
        return send_from_directory(ROOT, filename)
    # Only inject cart script into small root pages (index, checkout, order-placed)
    if filename in ("index.html", "checkout.html", "order-placed.html"):
        return Response(_html_with_cart(path), mimetype="text/html")
    return send_from_directory(ROOT, filename)


def _send_cart_stub():
    stub = {
        "token": "", "note": None, "attributes": {}, "original_total_price": 0,
        "total_price": 0, "total_discount": 0, "total_weight": 0.0, "item_count": 0,
        "items": [], "requires_shipping": False, "currency": "INR",
        "items_subtotal_price": 0, "cart_level_discount_applications": [], "checkout_charge_amount": 0,
    }
    return jsonify(stub)


@app.route("/cart.js")
@app.route("/cart.json")
def cart_js():
    return _send_cart_stub()


# Stub theme/Shopify URLs so browser stops retrying (stops terminal flood and lag)
@app.before_request
def stub_noisy_requests():
    path = request.path
    if path.startswith("/checkouts/internal/") or path.startswith("/apps/") or "/web-pixels" in path:
        return Response(";(function(){});", mimetype="application/javascript")
    if path.startswith("/.well-known/shopify/"):
        return Response("{}", mimetype="application/json")


@app.route("/cart/update.json", methods=["POST"])
@app.route("/cart/update.js", methods=["POST"])
@app.route("/cart/add.js", methods=["POST"])
@app.route("/cart/add.json", methods=["POST"])
def cart_update_stub():
    return _send_cart_stub()


@app.route("/api/recommendations")
def recommendations():
    """Return product recommendations for cart drawer (exclude cart handles, random sample)."""
    try:
        exclude = request.args.get("exclude", "")
        exclude_handles = {h.strip() for h in exclude.split(",") if h.strip()}
        limit = min(20, max(1, int(request.args.get("limit", 4))))
    except (ValueError, TypeError):
        exclude_handles = set()
        limit = 4
    if not os.path.isfile(PRODUCTS_FILE):
        return jsonify([])
    try:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
            products = json.load(f)
    except Exception:
        return jsonify([])
    candidates = [p for p in products if p.get("handle") and p.get("handle") not in exclude_handles]
    import random
    random.shuffle(candidates)
    out = []
    for p in candidates[:limit]:
        out.append({
            "id": p.get("id"),
            "handle": p.get("handle"),
            "title": p.get("title"),
            "price_inr": float(p.get("price_inr") or 0),
            "image": p.get("image") or "",
        })
    return jsonify(out)


@app.route("/api/product-price")
def product_price():
    """Return price_inr for a product by handle (for cart when DOM price is missing)."""
    handle = (request.args.get("handle") or "").strip()
    if not handle:
        return jsonify({"price_inr": 0}), 200
    prices = _product_prices_by_handle()
    return jsonify({"price_inr": prices.get(handle, 0)}), 200


@app.route("/api/products-filter-data")
def products_filter_data():
    """Return { handle: { fabric: [], color: [], type: [], category: [] } } for collection filtering."""
    return jsonify(_product_filter_data())


@app.route("/api/create-order", methods=["POST"])
def create_order():
    try:
        data = request.get_json() or {}
        cart = data.get("cart") or []
        customer = data.get("customer") or {}
    except Exception:
        return jsonify({"error": "Invalid request"}), 400

    if not cart:
        return jsonify({"error": "Cart is empty"}), 400

    email = (customer.get("email") or "").strip()
    name = (customer.get("name") or "").strip()
    phone = (customer.get("phone") or "").strip()
    address = (customer.get("address") or "").strip()
    city = (customer.get("city") or "").strip()
    state = (customer.get("state") or "").strip()
    pincode = (customer.get("pincode") or "").strip()
    if not all([email, name, phone, address, city, state, pincode]):
        return jsonify({"error": "Please fill all required fields"}), 400

    prices_by_handle = _product_prices_by_handle()
    for i in cart:
        p = float(i.get("price") or 0)
        if p <= 0 and i.get("handle"):
            p = prices_by_handle.get(i.get("handle"), 0)
            i["price"] = p
    # Buy 2 Get 1 Free: for every 3 units, cheapest is free. Expand to units, sort ascending, pay for units[free_count:]
    units = []
    for i in cart:
        price = float(i.get("price") or 0)
        qty = int(i.get("quantity") or 1)
        for _ in range(qty):
            units.append(price)
    units.sort()
    free_count = len(units) // 3
    total = sum(units[free_count:]) if units else 0
    total_paise = int(round(total * 100))

    order_id = "ORD-" + uuid.uuid4().hex[:10].upper()
    order = {
        "order_id": order_id,
        "customer": {"email": email, "name": name, "phone": phone, "address": address, "address2": customer.get("address2"), "city": city, "state": state, "pincode": pincode},
        "cart": cart,
        "total": total,
        "status": "pending",
    }

    orders = load_orders()
    orders[order_id] = order
    save_orders(orders)

    if USE_RAZORPAY and total_paise > 0:
        try:
            import razorpay
            client = razorpay.Client(auth=(GATEWAY_KEY, GATEWAY_SECRET))
            rz_order = client.order.create({"amount": total_paise, "currency": "INR", "receipt": order_id})
            razorpay_order_id = rz_order.get("id")
            return jsonify({
                "order_id": order_id,
                "razorpay_order_id": razorpay_order_id,
                "key": GATEWAY_KEY,
                "amount": total_paise,
                "currency": "INR",
            })
        except Exception as e:
            return jsonify({"error": "Payment setup failed: " + str(e)}), 500

    # No gateway: redirect to order-placed (for testing or custom gateway)
    return jsonify({"order_id": order_id, "payment_url": None})


@app.route("/api/payment-success")
def payment_success():
    order_id = request.args.get("order_id")
    if order_id:
        orders = load_orders()
        if order_id in orders:
            orders[order_id]["status"] = "paid"
            save_orders(orders)
    return redirect("/order-placed.html" + ("?order_id=" + order_id if order_id else ""))


@app.route("/api/confirm-payment", methods=["POST"])
def confirm_payment():
    """Optional: Razorpay success handler can POST here to mark paid."""
    try:
        data = request.get_json() or {}
        order_id = (data.get("order_id") or "").strip()
        if order_id:
            orders = load_orders()
            if order_id in orders:
                orders[order_id]["status"] = "paid"
                save_orders(orders)
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"ok": False}), 400


# Static and HTML with URL rewriting (same logic as serve.py)
@app.route("/")
def home():
    return _send_html_from_root("index.html")


@app.route("/checkout.html")
def checkout():
    return _send_html_from_root("checkout.html")


@app.route("/order-placed.html")
def order_placed():
    return _send_html_from_root("order-placed.html")


@app.route("/collections/<path:subpath>")
def collections(subpath):
    if "/products/" in subpath:
        parts = subpath.split("/products/", 1)
        if len(parts) == 2:
            cat, file_part = parts[0].strip("/"), parts[1].strip("/").split("?")[0]
            name = file_part[:-5] if file_part.endswith(".html") else file_part
            fname = name + ".html"
            dir_path = os.path.join(ROOT, "collections", cat, "products")
            if os.path.isfile(os.path.join(dir_path, fname)):
                resp = _send_product_html(dir_path, fname)
                return resp if resp is not None else send_from_directory(dir_path, fname)
            # Home page links use product.html?handle=XXX – resolve to actual product file
            if file_part == "product.html":
                q = request.args.get("handle", "").strip()
                if q:
                    d, f = _find_product_html(q)
                    if d and f:
                        resp = _send_product_html(d, f)
                        if resp is not None:
                            return resp
                        return send_from_directory(d, f)
            # Product in another collection – find and serve
            d, f = _find_product_html(name)
            if d and f:
                resp = _send_product_html(d, f)
                if resp is not None:
                    return resp
                return send_from_directory(d, f)
    # Collection list page (e.g. /collections/saree) – serve with cart script so card "Add to cart" works
    path = os.path.join(ROOT, "collections", subpath.rstrip("/") + ".html")
    if os.path.isfile(path):
        resp = _html_with_cart_from_path(path)
        return resp if resp is not None else send_from_directory(os.path.join(ROOT, "collections"), subpath.rstrip("/") + ".html")
    return _send_html_from_root("index.html"), 404


# Cache headers so reload/refresh is faster (browser can reuse cached assets and short-cache HTML)
@app.after_request
def add_cache_headers(response):
    path = (request.path or "").lower()
    if path.startswith("/assets/") or path.startswith("/cdn/") or path.endswith(".js") or path.endswith(".css"):
        if response.status_code == 200:
            response.cache_control.max_age = 86400 * 7  # 1 week for static assets
            response.cache_control.public = True
    elif path.endswith(".html") and response.status_code == 200:
        response.cache_control.max_age = 60   # 1 min for HTML so refresh feels faster
        response.cache_control.public = True
    return response


# Optional: redirect /cdn/* to external CDN (e.g. Cloudflare R2) when cdn folder not in deploy
CDN_BASE_URL = os.environ.get("CDN_BASE_URL", "").rstrip("/")


@app.route("/cdn/<path:subpath>")
def cdn_redirect(subpath):
    if CDN_BASE_URL:
        return redirect(f"{CDN_BASE_URL}/cdn/{subpath}", code=302)
    return send_from_directory(os.path.join(ROOT, "cdn"), subpath)


@app.route("/<path:path>")
def static_file(path):
    if path == "index.html":
        return send_from_directory(ROOT, "index.html")
    return send_from_directory(ROOT, path)


if __name__ == "__main__":
    import logging
    # Silence terminal completely to reduce lag (no per-request logs)
    logging.getLogger("werkzeug").setLevel(logging.CRITICAL)
    log = logging.getLogger("flask.app")
    if log: log.setLevel(logging.CRITICAL)
    port = int(os.environ.get("PORT", 8080))
    print("My Saree: http://localhost:%s" % port)
    if USE_RAZORPAY:
        print("Gateway: Razorpay (test keys from .env)")
    else:
        print("Gateway: not set – add keys to .env for payments")
    app.run(host="127.0.0.1", port=port, debug=False)
