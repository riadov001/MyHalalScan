---
name: HalalScan Barcode Scanner API
description: How barcode scanning works in expo-camera 17 and why launchScanner is required
---

## Rule
Use `CameraView.launchScanner()` + `CameraView.onModernBarcodeScanned()` as the primary scanning approach. The legacy in-view `onBarcodeScanned` prop is unreliable on modern Android/iOS.

**Why:** expo-camera 15+ (SDK 52+) introduced a "modern" scanner backed by Google Code Scanner (Android) and DataScannerViewController (iOS 16+). The legacy `onBarcodeScanned` prop still exists but the native pipeline may not initialize correctly on modern devices — specifically, `barcodeScannerEnabled` is derived from `!!props.onBarcodeScanned` in `ensureNativeProps`, and even when set, the legacy MLKit in-view scanner can silently fail.

**How to apply:**
- Check `CameraView.isModernBarcodeScannerAvailable && Platform.OS !== 'web'`
- If true: call `CameraView.launchScanner({ barcodeTypes: [...] })` on button press; listen via `CameraView.onModernBarcodeScanned(listener)` (EventSubscription, set up in useEffect)
- If false: fall back to `onBarcodeScanned` prop on `CameraView` (always pass the callback — never pass `undefined` — otherwise `barcodeScannerEnabled` stays false and scanner never initializes)
- `launchScanner` is async — it resolves when the native modal is dismissed (after scan on Android, after user dismiss on iOS)
- `scanFromURLAsync` (gallery) only supports QR codes on iOS — EAN-13/8 gallery scan won't work on iOS, this is an Apple platform limitation
