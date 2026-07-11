import * as Network from "expo-network";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { localDb, type CustomIngredient, type Product, type ScanResult } from "@/lib/db";

export type { ScanResult };
export type CachedProduct = Product;
export type { CustomIngredient };

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const MAX_RETRIES = 3;

interface ScanContextType {
  products: Record<string, Product>;
  pendingBarcodes: string[];
  isOnline: boolean;
  isDbReady: boolean;
  soundEnabled: boolean;
  customIngredients: CustomIngredient[];
  addProduct: (p: Product) => Promise<void>;
  queueOfflineScan: (barcode: string) => Promise<void>;
  whitelistProduct: (barcode: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getProduct: (barcode: string) => Product | null;
  isWhitelisted: (barcode: string) => boolean;
  processPendingQueue: () => Promise<void>;
  setSoundEnabled: (v: boolean) => Promise<void>;
  addCustomIngredient: (term: string) => Promise<void>;
  removeCustomIngredient: (id: number) => Promise<void>;
}

const ScanContext = createContext<ScanContextType | null>(null);

/** Word-boundary check (same logic as API server) */
function containsTerm(haystack: string, term: string): boolean {
  const normalised = term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalised) return false;
  const escaped = normalised.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
  return pattern.test(haystack);
}

export function checkCustomIngredients(
  ingredientsText: string,
  customIngredients: CustomIngredient[],
): string | null {
  if (!ingredientsText || customIngredients.length === 0) return null;
  const norm = ingredientsText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
  for (const ci of customIngredients) {
    if (containsTerm(norm, ci.term)) return ci.term;
  }
  return null;
}

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [pendingBarcodes, setPendingBarcodes] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [customIngredients, setCustomIngredients] = useState<CustomIngredient[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [allProducts, allPending, soundVal, customs] = await Promise.all([
          localDb.getAllProducts(),
          localDb.getAllPending(),
          localDb.getSetting("sound_enabled"),
          localDb.getAllCustomIngredients(),
        ]);
        const map: Record<string, Product> = {};
        for (const p of allProducts) map[p.barcode] = p;
        setProducts(map);
        setPendingBarcodes(allPending.map((p) => p.barcode));
        setSoundEnabledState(soundVal === null ? true : soundVal === "1");
        setCustomIngredients(customs);
      } catch {
      } finally {
        setIsDbReady(true);
      }
    })();
  }, []);

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    try {
      const state = await Network.getNetworkStateAsync();
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(true);
      return true;
    }
  }, []);

  useEffect(() => {
    checkNetwork();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkNetwork();
    });
    const interval = setInterval(checkNetwork, 15_000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [checkNetwork]);

  const processPendingQueue = useCallback(async () => {
    if (processingRef.current) return;
    const online = await checkNetwork();
    if (!online) return;
    const pending = await localDb.getAllPending();
    if (pending.length === 0) return;

    processingRef.current = true;
    try {
      for (const scan of pending) {
        try {
          const res = await fetch(`${API_BASE}/api/halal/analyze/${scan.barcode}`, {
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as {
            result: ScanResult;
            productName: string;
            reason?: string;
            foundInDatabase: boolean;
            hasIngredients: boolean;
            ingredientsText?: string;
            ingredientsList?: string[];
            source?: "internal_db" | "openfoodfacts" | "unknown";
          };
          const product: Product = {
            barcode: scan.barcode,
            result: json.result,
            productName: json.productName,
            timestamp: scan.timestamp,
            reason: json.reason,
            ingredientsText: json.ingredientsText,
            ingredientsList: json.ingredientsList,
            isWhitelisted: false,
            source: json.source,
          };
          await localDb.upsertProduct(product);
          await localDb.removePending(scan.barcode);
          setProducts((prev) => ({ ...prev, [scan.barcode]: product }));
          setPendingBarcodes((prev) => prev.filter((b) => b !== scan.barcode));
        } catch {
          if (scan.retryCount >= MAX_RETRIES) {
            await localDb.removePending(scan.barcode);
            setPendingBarcodes((prev) => prev.filter((b) => b !== scan.barcode));
          } else {
            await localDb.incrementPendingRetry(scan.barcode);
          }
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [checkNetwork]);

  useEffect(() => {
    if (isOnline && pendingBarcodes.length > 0) {
      processPendingQueue();
    }
  }, [isOnline, pendingBarcodes.length, processPendingQueue]);

  const addProduct = useCallback(async (p: Product) => {
    await localDb.upsertProduct(p);
    setProducts((prev) => ({ ...prev, [p.barcode]: p }));
  }, []);

  const queueOfflineScan = useCallback(async (barcode: string) => {
    await localDb.addPending(barcode);
    setPendingBarcodes((prev) => (prev.includes(barcode) ? prev : [...prev, barcode]));
  }, []);

  const whitelistProduct = useCallback(async (barcode: string) => {
    await localDb.whitelistProduct(barcode);
    setProducts((prev) => {
      const p = prev[barcode];
      if (!p) return prev;
      return { ...prev, [barcode]: { ...p, isWhitelisted: true, result: "halal" as ScanResult } };
    });
  }, []);

  const clearHistory = useCallback(async () => {
    await localDb.clearAllProducts();
    setProducts({});
  }, []);

  const getProduct = useCallback(
    (barcode: string): Product | null => products[barcode] ?? null,
    [products],
  );

  const isWhitelisted = useCallback(
    (barcode: string): boolean => products[barcode]?.isWhitelisted ?? false,
    [products],
  );

  const setSoundEnabled = useCallback(async (v: boolean) => {
    setSoundEnabledState(v);
    await localDb.setSetting("sound_enabled", v ? "1" : "0");
  }, []);

  const addCustomIngredient = useCallback(async (term: string) => {
    const trimmed = term.trim().slice(0, 60);
    if (!trimmed) return;
    const created = await localDb.addCustomIngredient(trimmed);
    setCustomIngredients((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev;
      return [...prev, created];
    });
  }, []);

  const removeCustomIngredient = useCallback(async (id: number) => {
    await localDb.removeCustomIngredient(id);
    setCustomIngredients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <ScanContext.Provider
      value={{
        products,
        pendingBarcodes,
        isOnline,
        isDbReady,
        soundEnabled,
        customIngredients,
        addProduct,
        queueOfflineScan,
        whitelistProduct,
        clearHistory,
        getProduct,
        isWhitelisted,
        processPendingQueue,
        setSoundEnabled,
        addCustomIngredient,
        removeCustomIngredient,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScanContext must be used within ScanProvider");
  return ctx;
}
