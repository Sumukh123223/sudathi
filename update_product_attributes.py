#!/usr/bin/env python3
"""
Update product_attributes_admin.json from a CSV file.
Run: python3 update_product_attributes.py product-categories.csv

CSV columns: handle, category (optional: color, fabric, type).
- handle = product handle (e.g. baby-pink-cotton-floral-printed-saree-4957s7148)
- category = one or more categories separated by | (e.g. Sarees|Office Wear)
- color, fabric, type = same, pipe-separated if multiple

Example product-categories.csv:
  handle,category,color,fabric,type
  baby-pink-cotton-floral-printed-saree-4957s7148,Sarees|Office Wear,Baby Pink,Cotton,Printed
"""
import csv
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
ADMIN_ATTRIBUTES_FILE = os.path.join(ROOT, "product_attributes_admin.json")


def load_existing():
    if not os.path.isfile(ADMIN_ATTRIBUTES_FILE):
        return {}
    with open(ADMIN_ATTRIBUTES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(ADMIN_ATTRIBUTES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def main():
    import sys
    path = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if not path or not os.path.isfile(path):
        print("Usage: python3 update_product_attributes.py <csv-file>")
        print("CSV columns: handle, category [, color, fabric, type]")
        print("Use | to separate multiple values (e.g. Sarees|Office Wear)")
        sys.exit(1)
    data = load_existing()
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            handle = (row.get("handle") or "").strip()
            if not handle:
                continue
            att = {}
            for key in ("category", "color", "fabric", "type"):
                val = (row.get(key) or "").strip()
                if not val:
                    continue
                parts = [p.strip() for p in val.split("|") if p.strip()]
                if parts:
                    att[key] = parts
            if att:
                data[handle] = att
    save(data)
    print("Updated", len(data), "products in", ADMIN_ATTRIBUTES_FILE)


if __name__ == "__main__":
    main()
