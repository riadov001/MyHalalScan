import * as SQLite from "expo-sqlite";

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

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("halalscan_v2.db");
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      barcode TEXT PRIMARY KEY,
      result TEXT NOT NULL,
      product_name TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      reason TEXT,
      ingredients_text TEXT,
      ingredients_list TEXT,
      is_whitelisted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS pending_scans (
      barcode TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  return _db;
}

type ProductRow = {
  barcode: string; result: string; product_name: string; timestamp: number;
  reason: string | null; ingredients_text: string | null;
  ingredients_list: string | null; is_whitelisted: number;
};

function rowToProduct(r: ProductRow): Product {
  return {
    barcode: r.barcode, result: r.result as ScanResult,
    productName: r.product_name, timestamp: r.timestamp,
    reason: r.reason ?? undefined, ingredientsText: r.ingredients_text ?? undefined,
    ingredientsList: r.ingredients_list ? (JSON.parse(r.ingredients_list) as string[]) : undefined,
    isWhitelisted: r.is_whitelisted === 1,
  };
}

export const localDb = {
  async getAllProducts(): Promise<Product[]> {
    const db = await getDb();
    return (await db.getAllAsync<ProductRow>("SELECT * FROM products ORDER BY timestamp DESC")).map(rowToProduct);
  },
  async upsertProduct(p: Product): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO products (barcode,result,product_name,timestamp,reason,ingredients_text,ingredients_list,is_whitelisted) VALUES (?,?,?,?,?,?,?,?)`,
      [p.barcode, p.result, p.productName, p.timestamp, p.reason ?? null, p.ingredientsText ?? null,
       p.ingredientsList ? JSON.stringify(p.ingredientsList) : null, p.isWhitelisted ? 1 : 0]
    );
  },
  async whitelistProduct(barcode: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE products SET is_whitelisted=1,result='halal' WHERE barcode=?", [barcode]);
  },
  async clearAllProducts(): Promise<void> {
    const db = await getDb();
    await db.execAsync("DELETE FROM products");
  },
  async addPending(barcode: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("INSERT OR IGNORE INTO pending_scans(barcode,timestamp,retry_count) VALUES(?,?,0)", [barcode, Date.now()]);
  },
  async getAllPending(): Promise<PendingScan[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ barcode: string; timestamp: number; retry_count: number }>(
      "SELECT * FROM pending_scans ORDER BY timestamp ASC"
    );
    return rows.map((r) => ({ barcode: r.barcode, timestamp: r.timestamp, retryCount: r.retry_count }));
  },
  async removePending(barcode: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM pending_scans WHERE barcode=?", [barcode]);
  },
  async incrementPendingRetry(barcode: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE pending_scans SET retry_count=retry_count+1 WHERE barcode=?", [barcode]);
  },
};
