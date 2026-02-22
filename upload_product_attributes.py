#!/usr/bin/env python3
"""
Upload product attributes from a TSV/CSV file with columns:
  category, Colour, Type, Fabric, work

Row order must match product order in products.json (row 1 = first product, etc.).

Run: python3 upload_product_attributes.py product-attributes.tsv

Creates/updates product_attributes_admin.json so the storefront uses these categories.
"""
import csv
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_FILE = os.path.join(ROOT, "products.json")
ADMIN_ATTRIBUTES_FILE = os.path.join(ROOT, "product_attributes_admin.json")


def title_case(s):
    if not s or not s.strip():
        return ""
    s = s.strip()
    return s[0].upper() + s[1:].lower() if len(s) == 1 else s.title()


def normalize_category(val):
    v = (val or "").strip().lower()
    if v == "saree":
        return "Sarees"
    if v == "blouse":
        return "Blouse"
    if v == "shapewear":
        return "Shapewear"
    return title_case(val) if val else ""


def normalize_for_filter(val):
    if not val or not str(val).strip():
        return []
    s = str(val).strip()
    return [title_case(s)] if s else []


def load_products():
    if not os.path.isfile(PRODUCTS_FILE):
        return []
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def load_upload(path):
    """Read TSV or CSV; return list of dicts with keys category, Colour, Type, Fabric, work."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    dialect = "excel-tab" if "\t" in content.split("\n")[0] else "excel"
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, dialect=dialect)
        for row in reader:
            rows.append({k.strip(): (v or "").strip() for k, v in row.items()})
    return rows


def save_attributes(data):
    with open(ADMIN_ATTRIBUTES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def main():
    import sys
    path = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not path or not os.path.isfile(path):
        print("Usage: python3 upload_product_attributes.py <file.tsv>")
        print("File columns (tab or comma): category, Colour, Type, Fabric, work")
        print("Row order = product order in products.json")
        sys.exit(1)

    products = load_products()
    if not products:
        print("No products in products.json")
        sys.exit(1)

    rows = load_upload(path)
    # Normalize header keys (case)
    def row_get(r, *keys):
        for k in keys:
            for rk in r:
                if rk.lower() == k.lower():
                    return (r.get(rk) or "").strip()
        return ""

    data = {}
    for i, row in enumerate(rows):
        if i >= len(products):
            break
        handle = (products[i].get("handle") or "").strip()
        if not handle:
            continue
        cat = normalize_category(row_get(row, "category"))
        colour = row_get(row, "Colour", "colour", "color")
        typ = row_get(row, "Type", "type")
        fabric = row_get(row, "Fabric", "fabric")
        work = row_get(row, "work", "Work")

        att = {}
        if cat:
            att["category"] = [cat]
        if colour:
            att["color"] = [title_case(colour)]
        if fabric:
            att["fabric"] = [title_case(fabric)]
        types = []
        if work:
            types.append(title_case(work))
        if typ and title_case(typ) not in types:
            types.append(title_case(typ))
        if types:
            att["type"] = types
        if att:
            data[handle] = att

    save_attributes(data)
    print("Uploaded attributes for", len(data), "products ->", ADMIN_ATTRIBUTES_FILE)


if __name__ == "__main__":
    main()
