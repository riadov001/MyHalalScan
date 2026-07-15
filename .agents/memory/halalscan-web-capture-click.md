---
name: HalalScan web capture button click handling
description: Why the web "Capturer & Analyser" button could silently do nothing, and the rule to keep any file-input fallback synchronous with the click.
---

The web camera-capture flow falls back to a hidden `<input type="file">` + `.click()` when no usable video frame is available. Browsers only honor a programmatic `.click()` on a file input as user-initiated while the click's transient-activation window is still open; once the handler has crossed an `await` boundary (e.g. an async `BarcodeDetector.detect()` call) before reaching `input.click()`, some browsers silently refuse to open the dialog — no error, no dialog, button appears completely dead.

**Why:** This caused the "Capturer & Analyser" button to look unresponsive: the handler tried live-video `BarcodeDetector` detection (async) first, and only reached the file-picker fallback afterward.

**How to apply:** In any click/press handler that might fall back to opening a native file picker, make sure `input.click()` is reachable without any prior `await` in that code path. Do image analysis (e.g. via canvas snapshot + a shared analyze-image helper) only after deciding not to use the file picker, or restructure so the picker-opening branch runs before any awaited work.
