import AsyncStorage from "@react-native-async-storage/async-storage";

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

const PRODUCTS_KEY = "@halalscan/products_v2";
const PENDING_KEY = "@halalscan/pending_v2";

let _products: Record<string, Product> | null = null;
let _pending: Record<string, PendingScan> | null = null;

async function loadProducts(): Promise<Record<string, Product>> {
  if (_products) return _products;
  try {
    const raw = await AsyncStorage.getItem(PRODUCTS_KEY);
    _products = raw ? (JSON.parse(raw) as Record<string, Product>) : {};
  } catch { _products = {}; }
  return _products;
}

async function saveProducts(): Promise<void> {
  if (_products) await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(_products));
}

async function loadPending(): Promise<Record<string, PendingScan>> {
  if (_pending) return _pending;
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    _pending = raw ? (JSON.parse(raw) as Record<string, PendingScan>) : {};
  } catch { _pending = {}; }
  return _pending;
}

async function savePending(): Promise<void> {
  if (_pending) await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(_pending));
}

export const localDb = {
  async getAllProducts(): Promise<Product[]> {
    const m = await loadProducts();
    return Object.values(m).sort((a, b) => b.timestamp - a.timestamp);
  },
  async upsertProduct(p: Product): Promise<void> {
    const m = await loadProducts();
    m[p.barcode] = p;
    await saveProducts();
  },
  async whitelistProduct(barcode: string): Promise<void> {
    const m = await loadProducts();
    if (m[barcode]) { m[barcode].isWhitelisted = true; m[barcode].result = "halal"; }
    await saveProducts();
  },
  async clearAllProducts(): Promise<void> {
    _products = {};
    await AsyncStorage.removeItem(PRODUCTS_KEY);
  },
  async addPending(barcode: string): Promise<void> {
    const m = await loadPending();
    if (!m[barcode]) m[barcode] = { barcode, timestamp: Date.now(), retryCount: 0 };
    await savePending();
  },
  async getAllPending(): Promise<PendingScan[]> {
    const m = await loadPending();
    return Object.values(m).sort((a, b) => a.timestamp - b.timestamp);
  },
  async removePending(barcode: string): Promise<void> {
    const m = await loadPending();
    delete m[barcode];
    await savePending();
  },
  async incrementPendingRetry(barcode: string): Promise<void> {
    const m = await loadPending();
    if (m[barcode]) m[barcode].retryCount++;
    await savePending();
  },
};
