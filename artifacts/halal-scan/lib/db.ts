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
  photoPath?: string;
  source?: "internal_db" | "openfoodfacts" | "unknown" | "ai";
}

export interface SeedProduct {
  barcode: string;
  productName: string;
  result: ScanResult;
  ingredientsText?: string;
  origin?: string;
  addedAt: number;
  isUserAdded: boolean;
}

export interface PendingScan {
  barcode: string;
  timestamp: number;
  retryCount: number;
}

export interface CustomIngredient {
  id: number;
  term: string;
}

export interface AlwaysHalalIngredient {
  id: number;
  term: string;
}

// ─── In-memory fallback (web / test environments) ────────────────────────────

let _memProducts: Record<string, Product> = {};
let _memPending: Record<string, PendingScan> = {};
let _memSettings: Record<string, string> = {};
let _memCustom: CustomIngredient[] = [];
let _memCustomNextId = 1;
let _memAlwaysHalal: AlwaysHalalIngredient[] = [];
let _memAlwaysHalalNextId = 1;
let _memSeed: Record<string, SeedProduct> = {};
let _memSeedMeta: Record<string, string> = {};

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
  async getSetting(key: string): Promise<string | null> {
    return _memSettings[key] ?? null;
  },
  async setSetting(key: string, value: string): Promise<void> {
    _memSettings[key] = value;
  },
  async getAllCustomIngredients(): Promise<CustomIngredient[]> {
    return [..._memCustom];
  },
  async addCustomIngredient(term: string): Promise<CustomIngredient> {
    const item: CustomIngredient = { id: _memCustomNextId++, term };
    _memCustom.push(item);
    return item;
  },
  async removeCustomIngredient(id: number): Promise<void> {
    _memCustom = _memCustom.filter((c) => c.id !== id);
  },
  async getAllAlwaysHalal(): Promise<AlwaysHalalIngredient[]> {
    return [..._memAlwaysHalal];
  },
  async addAlwaysHalal(term: string): Promise<AlwaysHalalIngredient> {
    const item: AlwaysHalalIngredient = { id: _memAlwaysHalalNextId++, term };
    _memAlwaysHalal.push(item);
    return item;
  },
  async removeAlwaysHalal(id: number): Promise<void> {
    _memAlwaysHalal = _memAlwaysHalal.filter((c) => c.id !== id);
  },
  // Seed methods
  async getSeedMeta(key: string): Promise<string | null> {
    return _memSeedMeta[key] ?? null;
  },
  async setSeedMeta(key: string, value: string): Promise<void> {
    _memSeedMeta[key] = value;
  },
  async bulkInsertSeed(rows: Array<{ b: string; n: string; i?: string; o?: string }>, addedAt: number): Promise<void> {
    for (const r of rows) {
      if (!r.b || !r.n || _memSeed[r.b]) continue;
      _memSeed[r.b] = {
        barcode: r.b,
        productName: r.n.slice(0, 150),
        result: "halal",
        ingredientsText: r.i?.slice(0, 1000),
        origin: r.o?.slice(0, 120),
        addedAt,
        isUserAdded: false,
      };
    }
  },
  async getAllSeedProducts(): Promise<SeedProduct[]> {
    return Object.values(_memSeed).sort((a, b) => +b.isUserAdded - +a.isUserAdded || b.addedAt - a.addedAt);
  },
  async getSeedProduct(barcode: string): Promise<SeedProduct | null> {
    return _memSeed[barcode] ?? null;
  },
  async upsertSeedProduct(p: SeedProduct): Promise<void> {
    _memSeed[p.barcode] = p;
  },
  async deleteSeedProduct(barcode: string): Promise<void> {
    delete _memSeed[barcode];
  },
  async clearAllData(): Promise<void> {
    _products = {};
    _pending = [];
    _customIngredients = [];
    _alwaysHalal = [];
    _nextCustomId = 1;
    _nextHalalId = 1;
  },
};

// ─── SQLite implementation (native only, dead code on native — Metro resolves db.native.ts first) ─────

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
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS custom_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS always_halal_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS seed_products (
          barcode TEXT PRIMARY KEY,
          product_name TEXT NOT NULL,
          result TEXT NOT NULL DEFAULT 'halal',
          ingredients_text TEXT,
          origin TEXT,
          added_at INTEGER NOT NULL,
          is_user_added INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS seed_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      try { await _db.execAsync("ALTER TABLE products ADD COLUMN photo_path TEXT"); } catch { /* already exists */ }
      try { await _db.execAsync("ALTER TABLE products ADD COLUMN source TEXT"); } catch { /* already exists */ }
      _dbReady = true;
    } catch (e) {
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
        isWhitelisted: number; photo_path: string | null; source: string | null;
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
        photoPath: r.photo_path ?? undefined,
        source: (r.source ?? undefined) as Product["source"],
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
          (barcode, result, productName, timestamp, reason, ingredientsText, ingredientsList, isWhitelisted, photo_path, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.barcode, p.result, p.productName, p.timestamp,
        p.reason ?? null, p.ingredientsText ?? null,
        p.ingredientsList ? JSON.stringify(p.ingredientsList) : null,
        p.isWhitelisted ? 1 : 0, p.photoPath ?? null, p.source ?? null,
      );
    } catch {
      await memDb.upsertProduct(p);
    }
  },

  async whitelistProduct(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.whitelistProduct(barcode); return; }
    try {
      await db.runAsync("UPDATE products SET isWhitelisted = 1, result = 'halal' WHERE barcode = ?", barcode);
    } catch {
      await memDb.whitelistProduct(barcode);
    }
  },

  async clearAllProducts(): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.clearAllProducts(); return; }
    try { await db.runAsync("DELETE FROM products"); } catch { await memDb.clearAllProducts(); }
  },

  async addPending(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.addPending(barcode); return; }
    try {
      await db.runAsync("INSERT OR IGNORE INTO pending_scans (barcode, timestamp, retryCount) VALUES (?, ?, 0)", barcode, Date.now());
    } catch { await memDb.addPending(barcode); }
  },

  async getAllPending(): Promise<PendingScan[]> {
    const db = await getDb();
    if (!db) return memDb.getAllPending();
    try {
      return await db.getAllAsync<{ barcode: string; timestamp: number; retryCount: number }>(
        "SELECT * FROM pending_scans ORDER BY timestamp ASC",
      );
    } catch { return memDb.getAllPending(); }
  },

  async removePending(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.removePending(barcode); return; }
    try { await db.runAsync("DELETE FROM pending_scans WHERE barcode = ?", barcode); }
    catch { await memDb.removePending(barcode); }
  },

  async incrementPendingRetry(barcode: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.incrementPendingRetry(barcode); return; }
    try { await db.runAsync("UPDATE pending_scans SET retryCount = retryCount + 1 WHERE barcode = ?", barcode); }
    catch { await memDb.incrementPendingRetry(barcode); }
  },

  async getSetting(key: string): Promise<string | null> {
    const db = await getDb();
    if (!db) return memDb.getSetting(key);
    try {
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", key);
      return row?.value ?? null;
    } catch { return memDb.getSetting(key); }
  },

  async setSetting(key: string, value: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.setSetting(key, value); return; }
    try { await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", key, value); }
    catch { await memDb.setSetting(key, value); }
  },

  async getAllCustomIngredients(): Promise<CustomIngredient[]> {
    const db = await getDb();
    if (!db) return memDb.getAllCustomIngredients();
    try { return await db.getAllAsync<CustomIngredient>("SELECT id, term FROM custom_ingredients ORDER BY id ASC"); }
    catch { return memDb.getAllCustomIngredients(); }
  },

  async addCustomIngredient(term: string): Promise<CustomIngredient> {
    const db = await getDb();
    if (!db) return memDb.addCustomIngredient(term);
    try {
      const res = await db.runAsync("INSERT OR IGNORE INTO custom_ingredients (term) VALUES (?)", term);
      if (res.lastInsertRowId) return { id: res.lastInsertRowId, term };
      return (await db.getFirstAsync<CustomIngredient>("SELECT id, term FROM custom_ingredients WHERE term = ?", term)) ?? { id: -1, term };
    } catch { return memDb.addCustomIngredient(term); }
  },

  async removeCustomIngredient(id: number): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.removeCustomIngredient(id); return; }
    try { await db.runAsync("DELETE FROM custom_ingredients WHERE id = ?", id); }
    catch { await memDb.removeCustomIngredient(id); }
  },

  async getAllAlwaysHalal(): Promise<AlwaysHalalIngredient[]> {
    const db = await getDb();
    if (!db) return memDb.getAllAlwaysHalal();
    try { return await db.getAllAsync<AlwaysHalalIngredient>("SELECT id, term FROM always_halal_ingredients ORDER BY id ASC"); }
    catch { return memDb.getAllAlwaysHalal(); }
  },

  async addAlwaysHalal(term: string): Promise<AlwaysHalalIngredient> {
    const db = await getDb();
    if (!db) return memDb.addAlwaysHalal(term);
    try {
      const res = await db.runAsync("INSERT OR IGNORE INTO always_halal_ingredients (term) VALUES (?)", term);
      if (res.lastInsertRowId) return { id: res.lastInsertRowId, term };
      return (await db.getFirstAsync<AlwaysHalalIngredient>("SELECT id, term FROM always_halal_ingredients WHERE term = ?", term)) ?? { id: -1, term };
    } catch { return memDb.addAlwaysHalal(term); }
  },

  async removeAlwaysHalal(id: number): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.removeAlwaysHalal(id); return; }
    try { await db.runAsync("DELETE FROM always_halal_ingredients WHERE id = ?", id); }
    catch { await memDb.removeAlwaysHalal(id); }
  },

  // Seed methods
  async getSeedMeta(key: string): Promise<string | null> {
    const db = await getDb();
    if (!db) return memDb.getSeedMeta(key);
    try {
      const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM seed_meta WHERE key=?", key);
      return row?.value ?? null;
    } catch { return memDb.getSeedMeta(key); }
  },
  async setSeedMeta(key: string, value: string): Promise<void> {
    const db = await getDb();
    if (!db) { await memDb.setSeedMeta(key, value); return; }
    try { await db.runAsync("INSERT OR REPLACE INTO seed_meta(key,value) VALUES(?,?)", key, value); }
    catch { await memDb.setSeedMeta(key, value); }
  },
  async bulkInsertSeed(rows: Array<{ b: string; n: string; i?: string; o?: string }>, addedAt: number): Promise<void> {
    await memDb.bulkInsertSeed(rows, addedAt);
  },
  async getAllSeedProducts(): Promise<SeedProduct[]> {
    return memDb.getAllSeedProducts();
  },
  async getSeedProduct(barcode: string): Promise<SeedProduct | null> {
    return memDb.getSeedProduct(barcode);
  },
  async upsertSeedProduct(p: SeedProduct): Promise<void> {
    await memDb.upsertSeedProduct(p);
  },
  async deleteSeedProduct(barcode: string): Promise<void> {
    await memDb.deleteSeedProduct(barcode);
  },
  async clearAllData(): Promise<void> {
    await memDb.clearAllData();
  },
};

// ─── Exported singleton ────────────────────────────────────────────────────────

export const localDb = Platform.OS === "web" ? memDb : sqliteDb;

if (Platform.OS !== "web") {
  initDb().catch(() => {});
}
