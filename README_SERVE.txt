Run the site so home and all clicks work like the original (clean URLs):

  cd my-saree-store
  python3 serve.py 8080

Then open: http://localhost:8080

- Home: / (serves index.html)
- Collections: /collections/saree, /collections/paithani-sarees, etc.
- Products: /collections/<category>/products/<handle>

All nav and product links use the same URLs as the original; the server serves the correct .html files.
