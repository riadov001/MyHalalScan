---
name: HalalScan Analysis Reliability Fixes
description: Critical bugs fixed in halal analysis engine (July 2026)
---

## E-number space normalisation (critical bug)
The `normalise()` function converts `E 471` → `e 471` (space preserved) but HARAM/WARNING lists use `e471` (no space). Added a regex step after normalisation:
```ts
s = s.replace(/\be\s+(\d+[a-z]?)\b/g, "e$1");
```
**Why:** Without this, all E-codes with a space between letter and number were silently skipped.

## Missing standalone alcohol terms
Added `"alcool"` and `"vin"` as standalone entries in HARAM_INGREDIENTS. Previously only compounds like `"alcool ethylique"` and `"vin blanc"` were caught.
**Why:** Many French product labels list just `"alcool"` or `"vin"` without a qualifier.
**How to apply:** Masking runs before these checks so `"vinaigre"` is already replaced with `__SAFE__` — no false positives.

## Alphanumeric barcode validation
Changed `!/^[\d]+$/.test(barcode)` → `/^[a-zA-Z0-9-]{1,50}$/.test(barcode)`.
**Why:** Code128/Code39 barcodes can be alphanumeric; old code returned 400 for them.

## Parallel OpenFoodFacts queries
Now queries `world.openfoodfacts.org` AND `fr.openfoodfacts.org` simultaneously (Step 1), then ALL country mirrors in parallel (Step 2) when ingredients are missing. Previously sequential — slow and missed many products.
**Why:** Parallel queries reduce latency from ~30s (worst case sequential) to ~8s, and `fr` mirror often has better ingredient data for French products.

## UPCitemdb fallback
Added `fetchProductNameFromUPCItemDB()` as a last-resort fallback (numeric codes only, free trial endpoint). Returns at least a product name when OFF has no record.

## db.ts: AsyncStorage → expo-sqlite
Rewrote `lib/db.ts` to use `expo-sqlite` 16.x (`openDatabaseAsync`, WAL mode) on native, with in-memory fallback for web. AsyncStorage had a 6 MB limit and no WAL performance.
