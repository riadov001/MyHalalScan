---
name: HalalScan Analysis Reliability Fixes
description: Critical bugs fixed in scan/gallery flow and custom ingredient application
---

## Web scan fix
`Camera.scanFromURLAsync` is **native-only** — it does NOT work on web. On web, use the `BarcodeDetector` API on an `<img>` element loaded from the URI. Fallback message if BarcodeDetector is unavailable (Firefox/Safari). This affects `tryScanFromImage` in `app/index.tsx`.

**Why:** Expo camera's scan API requires native MLKit/Vision — it has no web implementation. Silent failure looked like "loads then nothing."

## Custom ingredients on cached products
Custom ingredient checks (haram/always-halal overrides) must be **re-applied on cached results** too — not just after fresh API calls. The user may have changed their ingredient lists since the product was first scanned.

**How to apply:** In `processBarcode`, after `getProduct(barcode)` returns a cached hit, run `checkAlwaysHalalOverride` and `checkCustomIngredients` on the cached ingredients before calling `setScanResult`.

## Android gallery URI
`asset.uri` from expo-image-picker on Android is `content://...`. Never prepend `file://` blindly. Only prepend `file://` if no scheme (`://`) is present. Previous code `startsWith("file://")` check was wrong.

## processBarcode await in tryScanFromImage
`await processBarcode(...)` in `tryScanFromImage` was missing — caused loading/cooldown state to reset before the API call completed (race condition).

## E-code + ingredient normalisation
E-code space normalisation, alcool/vin standalone detection, parallel OFF queries, alphanumeric barcode validation — all fixed in API server `routes/halal.ts`.
