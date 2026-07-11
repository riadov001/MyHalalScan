---
name: HalalScan Photo Storage
description: How photos are uploaded to GCS and displayed as thumbnails in the history screen
---

## Upload flow
1. User takes/picks a photo — `pendingPhotoUpload.current` is set to `uploadPhotoToStorage(base64, "image/jpeg")` immediately (fire-and-forget promise).
2. Before saving to DB in `processBarcode` or `processOCRResult`, `await pendingPhotoUpload.current` resolves to `objectPath | null`.
3. `photoPath` is stored in the `products` table (`photo_path TEXT` column).

## URL convention
- Upload: `POST /api/storage/uploads/request-url` → returns `{ uploadURL, objectPath }`
- `objectPath` format: `/objects/<filename>` (from `normalizeObjectEntityPath`)
- Serve: `GET /api/storage/objects/<path>`
- Thumbnail URL in history: `` `${API_BASE}/api/storage${item.photoPath}` ``

## Migration strategy
`ALTER TABLE products ADD COLUMN photo_path TEXT` is wrapped in try/catch in both `db.ts` and `db.native.ts` so it is safe to run on an existing DB (column-already-exists error is silently ignored).

## pendingPhotoUpload lifecycle
- Set when: gallery pick, camera capture, OCR fallback path
- Awaited before addProduct() in processBarcode and processOCRResult
- Cleared (set to null) on dismiss and after awaiting

**Why:** Starting upload early (before OCR completes) hides the GCS latency behind the 10–30s OCR time, so photos are usually already uploaded by the time we save to DB.
