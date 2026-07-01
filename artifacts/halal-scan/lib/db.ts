import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

export type ScanResult = "halal" | "haram" | "warning" | "unknown";

export interface Product {
  barcode: string;
  result: ScanResult;
  productName: string;
  timestamp: number;
  reason?: string;
  ingredientsText?: string;
  ingredientsList?: string[];
  isWhitelisted: boolean;
}

export interface PendingScan {
  barcode: string;
  timestamp: number;
  retryCount: number;
}

// ─── In-memory fallback (web / test environments) ────────────────────────────

let _memProducts: Record<string, Product> = {};
let _memPending: Record<string, PendingScan> = {};

const memDb = {
  async getAllProducts(): Promise<Product[]> {
    return Object.values(_memProducts).sort((a, b) => b.timestamp - a.timestamp);
  },
  async upsertProduct(p: Product): Promise<void> {
    _memProducts[p.barcode] = p;
  },
  async whitelistProduct(barcode: string): Promise<void> {
    if (_memProducts[barcode]) {
      _memProducts[barcode].isWhitelisted = true;
      _memProducts[barcode].result = "halal";
    }
  },
  async clearAllProducts(): Promise<void> {
    _memProducts = {};
  },
  async addPending(barcode: string): Promise<void> {
    if (!_memPending[barcode]) {
      _memPending[barcode] = { barcode, timestamp: Date.now(), retryCount: 0 };
    }
  },
  async getAllPending(): Promise<PendingScan[]> {
    return Object.values(_memPending).sort((a, b) => a.timestamp - b.timestamp);
  },
  async removePending(barcode: string): Promise<void> {
    delete _memPending[barcode];
  },
  async incrementPendingRetry(barcode: string): Promise<void> {
    if (_memPending[barcode]) _memPending[barcode].retryCount++;
  },
};

// ─── SQLite implementation (native only) ─────────────────────────────────────

const DB_NAME = "halalscan_v2.db";

let _db: SQLite.SQLiteDatabase | null = null;
let _dbReady = false;
let _initPromise: Promise<void> | null = null;

async function initDb(): Promise<void> {
  if (_dbReady) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      _db = await SQLite.openDatabaseAsync(DB_NAME);
      await _db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS products (
          barcode TEXT PRIMARY KEY,
          result TEXT NOT NULL,
          productName TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          reason TEXT,
          ingredientsText TEXT,
          ingredientsList TEXT,
          isWhitelisted INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS pending_scans (
          barcode TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          retryCount INTEGER NOT NULL DEFAULT 0
        );
      `);
      _dbReady = true;
    } catch (e) {
      // SQLite unavailable (e.g. web) — fall back to in-memory
      _db = null;
    }
  })();

  return _initPromise;
}

async function getDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (!_dbReady && !_db) await initDb();
  return _db;
}

const sqliteDb = {
  async getAllProducts(): Promise<Product[]> {
    const db = await getDb();
    if (!db) return memDb.getAllProducts();
    try {
      const rows = await db.getAllAsync<{
        barcode: string; result: string; productName: string;
        timestamp: number; reason: string | null;
        ingredientsText: string | null; ingredientsList: string | null;
        isWhitelisted: number;
      }>("SELECT * FROM products ORDER BY timestamp DESC");
      return rows.map((r) => ({
        barcode: r.barcode,
        result: r.result as ScanResult,
        productName: r.productName,
        timestamp: r.timestamp,
        reason: r.reason ?? undefined,
        ingredientsText: r.ingredientsText ?? undefined,
        ingredientsList: r.ingredientsList ? JSON.parse(r.ingredientsList) as string[] : undefined,
        isWhitelisted: r.isWhitelisted === 1,
      }));
    } catch {
      return memDb.getAllProducts();
    }
  },

  async upsertProduct(p: Product): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.upsertProduct(p); return; }
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO products
          (barcode, result, productName, timestamp, reason, ingredientsText, ingredientsList, isWhitelisted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        p.barcode, p.result, p.productName, p.timestamp,
        p.reason ?? null,
        p.ingredientsText ?? null,
        p.ingredientsList ? JSON.stringify(p.ingredientsList) : null,
        p.isWhitelisted ? 1 : 0,
      );
    } catch {
      await memDb.upsertProduct(p);
    }
  },

  async whitelistProduct(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.whitelistProduct(barcode); return; }
    try {
      await db.runAsync(
        "UPDATE products SET isWhitelisted = 1, result = 'halal' WHERE barcode = ?",
        barcode,
      );
    } catch {
      await memDb.whitelistProduct(barcode);
    }
  },

  async clearAllProducts(): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.clearAllProducts(); return; }
    try {
      await db.runAsync("DELETE FROM products");
    } catch {
      await memDb.clearAllProducts();
    }
  },

  async addPending(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.addPending(barcode); return; }
    try {
      await db.runAsync(
        "INSERT OR IGNORE INTO pending_scans (barcode, timestamp, retryCount) VALUES (?, ?, 0)",
        barcode, Date.now(),
      );
    } catch {
      await memDb.addPending(barcode);
    }
  },

  async getAllPending(): Promise<PendingScan[]> {
    const db = await getDb();
    if (!db) return memDb.getAllPending();
    try {
      const rows = await db.getAllAsync<{
        barcode: string; timestamp: number; retryCount: number;
      }>("SELECT * FROM pending_scans ORDER BY timestamp ASC");
      return rows;
    } catch {
      return memDb.getAllPending();
    }
  },

  async removePending(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.removePending(barcode); return; }
    try {
      await db.runAsync("DELETE FROM pending_scans WHERE barcode = ?", barcode);
    } catch {
      await memDb.removePending(barcode);
    }
  },

  async incrementPendingRetry(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.incrementPendingRetry(barcode); return; }
    try {
      await db.runAsync(
        "UPDATE pending_scans SET retryCount = retryCount + 1 WHERE barcode = ?",
        barcode,
      );
    } catch {
      await memDb.incrementPendingRetry(barcode);
    }
  },
};

// ─── exported singleton ────────────────────────────────────────────────────────
// Use SQLite on native, in-memory fallback on web

export const localDb = Platform.OS === "web" ? memDb : sqliteDb;

// Kick off DB init immediately (non-blocking, best-effort)
if (Platform.OS !== "web") {
  initDb().catch(() => {});
}
