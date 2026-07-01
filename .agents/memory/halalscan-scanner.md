---
name: HalalScan Barcode Scanner API
description: Camera scanning, web ZXing fallback, and EAS build workaround for expo-camera 17
---

## expo-camera 17 scanning

- `onBarcodeScanned` is the correct prop (NOT `onModernBarcodeScanned` — doesn't exist in v17 types)
- `Camera.scanFromURLAsync(uri, types)` — static native-only; works iOS/Android, NOT on web
- `useCameraPermissions()` returns `[permission, requestPermission]`

**Why `onBarcodeScanned` only:** The `launchScanner`/`onModernBarcodeScanned` API from earlier memory is for older SDK versions. In expo-camera 17 (SDK 54), use `onBarcodeScanned` prop directly on `CameraView`.

**Auto-start scanning:** Camera only processes barcodes when `scanningRef.current = true`. Add auto-start useEffect:
```ts
useEffect(() => {
  if (permission?.granted && !autoStartedRef.current && !scanResult) {
    autoStartedRef.current = true;
    scanningRef.current = true;
    setScanning(true);
  }
}, [permission?.granted, scanResult]);
```

## Web gallery scan — ZXing

`Camera.scanFromURLAsync` is native-only. Web fix: use `@zxing/browser` with dynamic import:
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
