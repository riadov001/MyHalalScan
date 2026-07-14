---
name: HalalScan Offline Seed Database
description: Offline halal product seed DB — architecture, loading, and management screen
---

## Architecture
- **`seed_products` table** in `halalscan_v2.db` SQLite (separate from `products` table which holds scanned history)
- **`seed_meta` table** tracks whether seed was loaded (`seed_version` key = `"v1-2026-07"`)
- Seed JSON at `artifacts/halal-scan/assets/seed/halal_products.json` — 336 products, ~117KB, format `{ v, t, p: [{b, n, i?, o?}] }`
- Loaded via `require()` at bundle time (Metro bundles JSON automatically — no asset registration needed)

## Seed loading flow
In `ScanContext.tsx`, on mount: check `localDb.getSeedMeta("seed_version")`. If not matching `SEED_VERSION` constant, call `localDb.bulkInsertSeed(SEED_RAW.p, Date.now())` inside a SQLite transaction, then `markSeedLoaded`.

**Why:** Ensures seed is only imported once per version bump. Change `SEED_VERSION` in `ScanContext.tsx` to force re-import.

## Offline analysis flow
In `processBarcode` (`app/index.tsx`): when `!isOnline` and barcode not in scan history cache, call `getSeedRef.current(barcode)` (sync, from in-memory map). If found: return result with `isOfflineLocal: true`, `source: "internal_db"`. Apply custom ingredient overrides before returning.

**Why:** Users get immediate offline results for known halal products instead of queuing everything.

## Fast lookup
`ScanContext` maintains `seedMap: Record<string, SeedProduct>` (derived via `useMemo` from `seedProducts[]`). Exposed as `getSeedByBarcode(barcode): SeedProduct | undefined`. In `index.tsx`, wrapped in `getSeedRef` ref to avoid rebuilding `processBarcode` useCallback on every seedProducts change.

## Database management screen
`app/database.tsx` — FlatList of all seed products with search, add/edit/delete via modal. Accessible from hamburger menu → "Base de données halal". Changes immediately reflected in analysis (React state update via context).

## ResultOverlay offline indicator
When `isOfflineLocal: true` and `source: "internal_db"`, ResultOverlay shows `"📦 Base locale · hors connexion"` instead of `"📁 Base interne"`. `isOfflineLocal` prop added to ResultOverlay Props interface.
