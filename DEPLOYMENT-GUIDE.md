# Complete Deployment Guide: sudathisaree.store (100% Your Server, Zero sudathi.com)

This guide tells you **exactly** what to do so your site:
- Fetches **all product data from your server only**
- Never calls sudathi.com
- Works correctly with filters, cart, checkout

---

## What You Have vs What You Need

| Item | You Have | Action |
|------|----------|--------|
| **Backend (Flask)** | app.py with APIs | ✅ Use it – host it |
| **Product data** | products.json, product_attributes_admin.json | ✅ Already local |
| **Your APIs** | /api/products-filter-data, /api/product-price, etc. | ✅ All on your server |
| ** sudathi.com calls** | Shopify scripts in HTML (analytics, trekkie) | ❌ Disable them |
| **Images/CSS** | Some from sudathi.com CDN | Optional: keep (works) or self-host |

---

## Step 1: Where to Host (Choose ONE)

You need a server that runs **Python + Flask**. Your APIs will not work on static-only hosts (Netlify, GitHub Pages).

### Option A: Railway (Recommended – Free Tier)

- **Cost:** Free tier (500 hrs/month), then ~$5/month
- **Setup:** Connect GitHub → deploy
- **URL:** `your-app.railway.app` (or custom domain)

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Sign up (GitHub)
3. New Project → Deploy from GitHub → select your repo
4. Add `Procfile`: `web: gunicorn app:app`
5. Add env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (from .env)
6. Deploy

### Option B: Render

- **Cost:** Free tier (spins down after 15 min idle)
- **URL:** `your-app.onrender.com`

**Steps:**
1. [render.com](https://render.com) → New Web Service
2. Connect repo
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn app:app`
5. Add env vars

### Option C: PythonAnywhere

- **Cost:** Free tier available
- **URL:** `yourusername.pythonanywhere.com`

### Option D: Your Own VPS (DigitalOcean, AWS, etc.)

- **Cost:** ~$5–12/month
- Full control, you manage server

---

## Step 2: What to Purchase (If Anything)

| Item | Cost | Required? |
|------|------|------------|
| **Domain (sudathisaree.store)** | ~₹800–1200/year | Only if you want this domain |
| **Railway/Render** | Free tier or ~$5/mo | Yes – to run Flask |
| **Razorpay** | Free (2% per transaction) | Yes – for payments |

**Minimum:** Use free Railway/Render + free Razorpay. Domain is optional (you can use `*.railway.app`).

---

## Step 3: Remove sudathi.com API Calls (Fix CORS Errors)

The CORS errors come from **Shopify analytics scripts** in your HTML. They try to fetch `sudathi.com/api/collect`. Disable them.

### Quick Fix: Add a Script Blocker

Add this **before** `</body>` in your main layout or in `app.py` when injecting HTML:

```html
<script>
(function(){
  var noop = function(){};
  window.ShopifyAnalytics = window.ShopifyAnalytics || {};
  window.ShopifyAnalytics.lib = { track: noop, page: noop, ready: function(f){ if(typeof f==='function')f(); } };
  window.Shopify = window.Shopify || {};
  window.Shopify.analytics = { replayQueue: [] };
})();
</script>
```

This stubs the analytics so they never try to fetch sudathi.com.

### Better: Remove/Disable the Scripts

The scripts that cause problems are in your HTML:
- `web-pixels-manager-setup`
- `trekkie.storefront` (loads from sudathi.com)
- `data-shs-beacon-endpoint="https://sudathi.com/api/collect"`

You can either:
1. **Remove** those script blocks from the HTML (search for `web-pixels`, `trekkie`, `api/collect`)
2. **Or** add the stub above so they no-op

---

## Step 4: Your Data Flow (Already Correct)

Your site **already** fetches from your server only:

| API | Source | Purpose |
|-----|--------|---------|
| `/api/products-filter-data` | Your Flask app | Filter attributes (color, fabric, etc.) |
| `/api/product-price` | Your Flask app | Cart prices |
| `/api/recommendations` | Your Flask app | Cart drawer suggestions |
| `/api/create-order` | Your Flask app | Checkout |

**Products** come from:
- `products.json` (local file)
- `product_attributes_admin.json` (local file)
- HTML is pre-rendered – no product fetch from sudathi.com

---

## Step 5: Deployment Checklist

- [ ] **1.** Push code to GitHub
- [ ] **2.** Create Railway/Render account
- [ ] **3.** Deploy from GitHub (add Procfile, env vars)
- [ ] **4.** Add stub script to disable Shopify analytics (or remove those scripts)
- [ ] **5.** Point domain sudathisaree.store to your Railway/Render URL (if you have the domain)
- [ ] **6.** Test: visit `https://your-app.railway.app/collections/saree` – filters, cart, checkout should work

---

## Step 6: Procfile (Create This File)

Create `Procfile` in your project root (no extension):

```
web: gunicorn app:app
```

---

## Step 7: runtime.txt (Optional – for Python Version)

Create `runtime.txt`:

```
python-3.11.0
```

---

## Summary: Minimum To Get Live

1. **Host:** Railway (free) or Render (free)
2. **Purchase:** Nothing if you use free tiers
3. **Code change:** Add analytics stub (or remove Shopify scripts)
4. **Deploy:** Connect GitHub → deploy
5. **Domain:** Optional – use `*.railway.app` or connect sudathisaree.store

Your product data, filter API, cart, and checkout **already run from your server**. The only external calls are from leftover Shopify scripts – disable those and you’re done.
