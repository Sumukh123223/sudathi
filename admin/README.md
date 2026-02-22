# Product Upload Guide

## How to add products

1. **Start your server** – use `python app.py` (Flask) for image upload; `python serve.py` is static-only and won't support uploads
2. **Open the admin page:** [http://localhost:8080/admin/add-product.html](http://localhost:8080/admin/add-product.html)
3. **Fill the form** with product details
4. **Click "Add Product"** – the product is saved to `products-catalog.json` and appears on the collection page

## Images

- **Drag & drop** images onto the form (or click to browse)
- Images upload automatically to `cdn/shop/files/`
- They appear in order **1, 2, 3, 4** – drag to reorder
- At least one image is required

## Categories (all included in the form)

- **Category:** Sarees, Handsfree Sarees, Ready To Wear Sarees, Ready To Wear Sarees With Pocket, Blouse, Shapewear, Daily Wear, Office Wear, Party Wear, Festive
- **Color:** Beige, Black, Blue, Brown, Copper, Cream, Golden, Green, Grey, Indigo, Khaki, Lavender, Magenta, Maroon, Mauve, Multicoloured, Mustard, Orange, Peach, Pink, Purple, Red, Rust, Turquoise, Violet, White, Wine, Yellow
- **Fabric:** Chanderi, Chiffon, Chinnon, Cotton, Cotton Blend, Cotton Linen, Cotton Silk, Crepe, Georgette, Khadi, Linen, Net, Organza, Satin, Silk, Silk Blend, and more
- **Type:** Baluchari, Banarasi, Bandhani, Plain, Printed, Woven, and more
- **Work:** Bandhani, Embroidery, Printed, Plain, Woven, Zari, and more

## Push to Git

After adding products:

```bash
git add products-catalog.json admin/
git commit -m "Add products via admin"
git push origin main
```
