#!/usr/bin/env python3
"""
Upload nutrient JSON columns (minerals, vitamins, fatty_acids, amino_acids)
from scraper output to Supabase food_items table.

Usage:
  python3 scraper/upload_nutrient_json.py [--dry-run] [--batch-size 100]

Requires: pip install supabase
"""

import json
import sys
import argparse
from pathlib import Path

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase package not installed. Run: pip install supabase")
    sys.exit(1)

# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────
SUPABASE_URL = "https://lhlaycxdejzxucqthchj.supabase.co"
SUPABASE_SERVICE_KEY = ""  # Set via env or paste here temporarily

DATA_PATH = Path(__file__).parent.parent / "data" / "output" / "food_composition.json"


def camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    import re
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', name)
    return re.sub(r'([a-z\d])([A-Z])', r'\1_\2', s1).lower()


def extract_values(section: dict | None, unit_suffix: bool = True) -> dict | None:
    """Extract {key: value} from NutrientEntry objects, skipping nulls."""
    if section is None:
        return None

    result = {}
    for key, entry in section.items():
        if not isinstance(entry, dict) or "value" not in entry:
            continue
        val = entry.get("value")
        if val is None:
            continue
        unit = entry.get("unit", "")
        snake_key = camel_to_snake(key)
        if unit_suffix and unit:
            snake_key = f"{snake_key}_{unit}"
        result[snake_key] = val

    return result if result else None


# Keys to skip in certain sections (metadata, not actual nutrients)
SKIP_KEYS = {"water", "aminoAcidBasedProtein", "protein",
             "triacylglycerolEquivalent", "totalFat", "fattyAcidTotal"}


def extract_section(section: dict | None) -> dict | None:
    """Extract nutrient values, skipping metadata keys and nulls."""
    if section is None:
        return None

    result = {}
    for key, entry in section.items():
        if key in SKIP_KEYS:
            continue
        if not isinstance(entry, dict) or "value" not in entry:
            continue
        val = entry.get("value")
        if val is None:
            continue
        unit = entry.get("unit", "")
        snake_key = camel_to_snake(key)
        if unit:
            snake_key = f"{snake_key}_{unit}"
        result[snake_key] = val

    return result if result else None


def main():
    parser = argparse.ArgumentParser(description="Upload nutrient JSON to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Print stats without uploading")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for updates")
    parser.add_argument("--service-key", type=str, default="", help="Supabase service role key")
    args = parser.parse_args()

    service_key = args.service_key or SUPABASE_SERVICE_KEY
    if not service_key and not args.dry_run:
        import os
        service_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not service_key:
            print("ERROR: Provide --service-key or set SUPABASE_SERVICE_KEY env var")
            sys.exit(1)

    # Load scraper output
    print(f"Loading {DATA_PATH}...")
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        foods: list[dict] = json.load(f)
    print(f"Loaded {len(foods)} food items")

    # Build update payloads
    updates: list[dict] = []
    stats = {"minerals": 0, "vitamins": 0, "fatty_acids": 0, "amino_acids": 0}

    for food in foods:
        food_code = food.get("foodCode")
        if not food_code:
            continue

        minerals = extract_section(food.get("minerals"))
        vitamins = extract_section(food.get("vitamins"))
        fatty_acids = extract_section(food.get("fattyAcids"))
        amino_acids = extract_section(food.get("aminoAcids"))

        if not any([minerals, vitamins, fatty_acids, amino_acids]):
            continue

        payload: dict = {"food_code": food_code}
        if minerals:
            payload["minerals"] = minerals
            stats["minerals"] += 1
        if vitamins:
            payload["vitamins"] = vitamins
            stats["vitamins"] += 1
        if fatty_acids:
            payload["fatty_acids"] = fatty_acids
            stats["fatty_acids"] += 1
        if amino_acids:
            payload["amino_acids"] = amino_acids
            stats["amino_acids"] += 1

        updates.append(payload)

    print(f"\nUpdate payloads: {len(updates)}")
    print(f"  minerals:    {stats['minerals']} items")
    print(f"  vitamins:    {stats['vitamins']} items")
    print(f"  fatty_acids: {stats['fatty_acids']} items")
    print(f"  amino_acids: {stats['amino_acids']} items")

    # Print sample
    if updates:
        sample = updates[0]
        print(f"\nSample (food_code={sample['food_code']}):")
        for col in ["minerals", "vitamins", "fatty_acids", "amino_acids"]:
            data = sample.get(col)
            if data:
                keys = list(data.keys())[:5]
                print(f"  {col}: {len(data)} keys, e.g. {keys}")

    if args.dry_run:
        print("\n--dry-run: skipping upload")
        return

    # Upload
    print(f"\nConnecting to Supabase...")
    client: Client = create_client(SUPABASE_URL, service_key)

    success = 0
    errors = 0

    for i in range(0, len(updates), args.batch_size):
        batch = updates[i:i + args.batch_size]
        for item in batch:
            food_code = item.pop("food_code")
            update_data = {}
            for col in ["minerals", "vitamins", "fatty_acids", "amino_acids"]:
                if col in item:
                    update_data[col] = item[col]

            try:
                res = client.table("food_items").update(update_data).eq("food_code", food_code).execute()
                if res.data:
                    success += 1
                else:
                    errors += 1
                    print(f"  No match for food_code={food_code}")
            except Exception as e:
                errors += 1
                print(f"  Error updating {food_code}: {e}")

        pct = min(100, int((i + len(batch)) / len(updates) * 100))
        print(f"  Progress: {i + len(batch)}/{len(updates)} ({pct}%) - success={success}, errors={errors}")

    print(f"\nDone! success={success}, errors={errors}")


if __name__ == "__main__":
    main()
