---
name: HalalScan Barcode Scanner API
description: Camera scanning, gallery limitations, and expo-camera 17 usage patterns
---

## expo-camera 17 scanning

**Active approach used:** `onBarcodeScanned` prop on `CameraView` — the passive scanner callback. This is the current implementation.

`useCameraPermissions()` returns `[permission, requestPermission]`.

**Why passive scanner only:** The user confirmed the passive `onBarcodeScanned` approach was working reliably before. A modern scanner experiment (using `CameraView.launchScanner` + `onModernBarcodeScanned`) was attempted but reverted at user request because it changed the UX (system modal overlay replacing the in-app camera preview) without clear benefit.

**Auto-start scanning:** Camera only processes barcodes when `scanningRef.current = true`. The auto-start effect:
```ts
useEffect(() => {
  if (permission?.granted && !autoStartedRef.current && !scanResult) {
    autoStartedRef.current = true;
    scanningRef.current = true;
    setScanning(true);
  }
}, [permission?.granted, scanResult]);
```

**Auto-restart after dismiss:** `dismiss()` sets `autoStartedRef.current = false`, allowing the auto-start effect to re-trigger when `scanResult` goes null.

## Gallery scan platform limitations

- **iOS**: `Camera.scanFromURLAsync` only supports QR codes — EAN-13/8 will never work. Show an explicit Alert instead of silently failing, directing users to camera scan or manual entry.
- **Android**: `Camera.scanFromURLAsync` works for EAN barcodes; ensure `file://` URI prefix (`uri.startsWith("file://") ? uri : \`file://\${uri\}\``) before the call. Include `["ean13","ean8","upc_a","upc_e","code128","code39","qr"]` in barcodeTypes.
- **Web**: Not supported; guarded by `Platform.OS !== "web"`.

## react-native version

Expo SDK 54 ships with `react-native 0.81.5`. The `package.json` declares `0.81.5` (exact pin). Do NOT change this version manually — doing so corrupts pnpm's content-addressable store and causes Metro to fail with `Cannot find module 'metro-runtime/package.json'`.

**How to fix if corrupted:** `git checkout <original-commit> -- pnpm-lock.yaml && rm -rf node_modules/.pnpm/expo@* artifacts/halal-scan/.expo && pnpm install`.

## Web gallery scan — ZXing (not currently used)

`Camera.scanFromURLAsync` is native-only. If web gallery scan is ever needed:
```ts
if (Platform.OS === "web") {
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const result = await reader.decodeFromImageUrl(uri);
  barcodeData = result.getText();
}
```
**Version**: `@zxing/browser@0.2.0` requires `@zxing/library@0.22.0` (NOT 0.23.x — peer dep mismatch).

## EAS Build in Replit (git lock workaround)

Git write ops are blocked on `/home/runner/workspace/.git`. EAS CLI fails writing `.git/index.lock`.
Workaround — redirect index to /tmp:
```bash
cp /home/runner/workspace/.git/index /tmp/eas-git-index
GIT_INDEX_FILE=/tmp/eas-git-index EXPO_TOKEN="$EXPO_TOKEN" pnpm exec eas build \
  --platform android --profile preview --non-interactive
```

**Why:** `GIT_INDEX_FILE` redirects git's lock file to `/tmp/eas-git-index.lock` (writable).
Use `--no-wait` if you don't need to wait inline; builds run async on Expo cloud anyway.

## EAS project config

`app.json` replaced by `app.config.js` reading env vars: `EXPO_OWNER`, `EXPO_PROJECT_ID`, `EXPO_PROJECT_SLUG`.
- Owner: `mytoolsgroup`, project ID: `4cf271e1-184b-40a9-82d4-518829206fff`, slug: `halalscan`
- Build URL: `https://expo.dev/accounts/mytoolsgroup/projects/halalscan/builds/`
