#!/usr/bin/env python3
"""
Serve my-saree-store so that URLs work like the original site:
- / -> index.html (home)
- /collections/<name> -> collections/<name>.html
- /collections/<name>/products/<handle> -> collections/<name>/products/<handle>.html
- /cart.js, POST /cart/update.json -> stub responses (static clone has no real cart)
Run from my-saree-store: python3 serve.py [port]
Default port: 8080
"""
import http.server
import json
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

# Stub cart so Shopify theme JS doesn't 404/501 (static clone - no real cart)
CART_STUB = {
    "token": "",
    "note": None,
    "attributes": {},
    "original_total_price": 0,
    "total_price": 0,
    "total_discount": 0,
    "total_weight": 0.0,
    "item_count": 0,
    "items": [],
    "requires_shipping": False,
    "currency": "INR",
    "items_subtotal_price": 0,
    "cart_level_discount_applications": [],
    "checkout_charge_amount": 0,
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _send_cart_stub(self):
        body = json.dumps(CART_STUB).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_empty_ok(self, content_type="application/json", body=b"{}"):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        qs = self.path.split("?", 1)[1] if "?" in self.path else ""
        suffix = ("?" + qs) if qs else ""
        # Stub cart (static clone - no real cart)
        if path == "/cart.js" or path == "/cart.json":
            self._send_cart_stub()
            return
        # Shopify/theme stubs (no real backend - avoid 404s)
        if path.startswith("/checkouts/internal/") or path.startswith("/web-pixels@") or path.startswith("/apps/"):
            self._send_empty_ok("application/javascript", b";(function(){});")
            return
        # Home
        # Home
        if path == "/" or path == "":
            self.path = "/index.html" + suffix
            return super().do_GET()
        # /collections/<name> -> collections/<name>.html
        if path.startswith("/collections/") and "/products/" not in path:
            rest = path[len("/collections/"):].rstrip("/")
            if rest and ".." not in rest:
                file_path = os.path.join(ROOT, "collections", rest + ".html")
                if os.path.isfile(file_path):
                    self.path = "/collections/" + rest + ".html" + suffix
                    return super().do_GET()
        # /collections/<name>/products/<handle> -> collections/<name>/products/<handle>.html
        if "/collections/" in path and "/products/" in path:
            prefix = "/collections/"
            idx = path.find("/products/", len(prefix))
            if idx != -1:
                cat = path[len(prefix):idx].strip("/")
                handle = path[idx + len("/products/"):].strip("/").split("?")[0]
                if cat and handle and ".." not in cat and ".." not in handle:
                    file_path = os.path.join(ROOT, "collections", cat, "products", handle + ".html")
                    if os.path.isfile(file_path):
                        self.path = "/collections/" + cat + "/products/" + handle + ".html" + suffix
                        return super().do_GET()
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        # Stub cart update (static clone - no real cart; return empty cart so JS doesn't error)
        if path in ("/cart/update.json", "/cart/update.js", "/cart/add.js", "/cart/add.json"):
            self._send_cart_stub()
            return
        # Shopify analytics/telemetry (accept so no 501)
        if path.startswith("/.well-known/shopify/"):
            self._send_empty_ok()
            return
        self.send_response(501, "Unsupported method ('POST')")
        self.end_headers()


if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), Handler) as httpd:
        print("Serving my-saree-store at http://localhost:%s (home: /, collections: /collections/...)" % PORT)
        httpd.serve_forever()
