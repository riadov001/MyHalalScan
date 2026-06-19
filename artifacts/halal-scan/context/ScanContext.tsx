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

import { localDb, type Product, type ScanResult } from "@/lib/db";

export type { ScanResult };
export type CachedProduct = Product;

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const MAX_RETRIES = 3;

interface ScanContextType {
  products: Record<string, Product>;
  pendingBarcodes: string[];
  isOnline: boolean;
  isDbReady: boolean;
  addProduct: (p: Product) => Promise<void>;
  queueOfflineScan: (barcode: string) => Promise<void>;
  whitelistProduct: (barcode: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getProduct: (barcode: string) => Product | null;
  isWhitelisted: (barcode: string) => boolean;
  processPendingQueue: () => Promise<void>;
}

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [pendingBarcodes, setPendingBarcodes] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [allProducts, allPending] = await Promise.all([
          localDb.getAllProducts(),
          localDb.getAllPending(),
        ]);
        const map: Record<string, Product> = {};
        for (const p of allProducts) map[p.barcode] = p;
        setProducts(map);
        setPendingBarcodes(allPending.map((p) => p.barcode));
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
    [products]
  );

  const isWhitelisted = useCallback(
    (barcode: string): boolean => products[barcode]?.isWhitelisted ?? false,
    [products]
  );

  return (
    <ScanContext.Provider
      value={{
        products,
        pendingBarcodes,
        isOnline,
        isDbReady,
        addProduct,
        queueOfflineScan,
        whitelistProduct,
        clearHistory,
        getProduct,
        isWhitelisted,
        processPendingQueue,
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
