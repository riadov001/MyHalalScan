---
name: HalalScan SQLite + Offline Architecture
description: Key design decisions for HalalScan's local persistence and offline mode
---

# HalalScan SQLite + Offline Architecture

## The rule
All product history and offline queue stored in `expo-sqlite` (`halalscan_v2.db`), not AsyncStorage. ScanContext is the single source of truth for both.

**Why:** AsyncStorage is slow, unstructured, and not suitable for relational product history. SQLite allows efficient queries, offline queuing, and whitelisting as a DB column.

**How to apply:**
- DB access goes through `lib/db.ts` → `localDb` (exported name — NOT `db` to avoid conflicts)
- ScanContext API: `addProduct`, `queueOfflineScan`, `whitelistProduct`, `clearHistory`, `getProduct`, `isWhitelisted`, `processPendingQueue`
- Old API (`addToCache`, `addToWhitelist`, `getCached`, `cache`) is gone — do not use
- Offline flow: scan fails/no network → `queueOfflineScan(barcode)` → pending_scans table → auto-process on `isOnline` true or AppState 'active' + 15s interval
- Network detection: `expo-network` `getNetworkStateAsync()` + AppState listener + 15s interval. Defaults to online=true on error.
