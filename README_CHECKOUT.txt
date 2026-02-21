CART + CHECKOUT + YOUR GATEWAY (My Saree static site)
=====================================================

1) Add to cart
   - Users click "Add to cart" on home or product/collection pages.
   - Cart is stored in the browser (localStorage). Cart count shows in header.
   - "Cart" link in header goes to checkout.

2) Checkout
   - User goes to /checkout.html (or clicks Cart).
   - Fills: Email, Name, Phone, Address, City, State, Pincode.
   - Clicks "Pay & place order".

3) Payment (your gateway)
   - By default we use Razorpay. Set your keys and run with Flask:

     export RAZORPAY_KEY_ID="your_key_id"
     export RAZORPAY_KEY_SECRET="your_key_secret"
     pip install -r requirements.txt
     python3 app.py 8080

   - If you use a different gateway (e.g. CCAvenue, Paytm), you can:
     - Keep Razorpay and add a second gateway in app.py, or
     - Replace the Razorpay block in app.py with your gateway’s API (create order → return payment_url or client token).

4) After payment
   - User is redirected to /order-placed.html?order_id=ORD-XXX.
   - Orders are saved in orders.json (order_id, customer, cart, total, status).

5) Run without gateway (test only)
   - Don’t set RAZORPAY_KEY_*. Run: python3 app.py 8080
   - Checkout will create an order and redirect to "Order placed" (no real payment).

6) Run with static server only (no checkout API)
   - python3 serve.py 8080  → cart and checkout page work, but "Pay & place order" will fail (no backend).
   - Use python3 app.py 8080 when you want real orders and payment.
