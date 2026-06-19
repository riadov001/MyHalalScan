import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ScanResult = "halal" | "haram" | "warning" | "unknown";

export interface CachedProduct {
  barcode: string;
  result: ScanResult;
  productName: string;
  timestamp: number;
}

interface ScanContextType {
  cache: Record<string, CachedProduct>;
  whitelist: string[];
  addToCache: (product: CachedProduct) => Promise<void>;
  addToWhitelist: (barcode: string) => Promise<void>;
  clearCache: () => Promise<void>;
  getCached: (barcode: string) => CachedProduct | null;
  isWhitelisted: (barcode: string) => boolean;
}

const ScanContext = createContext<ScanContextType | null>(null);

const CACHE_KEY = "@halalscan_cache";
const WHITELIST_KEY = "@halalscan_whitelist";

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Record<string, CachedProduct>>({});
  const [whitelist, setWhitelist] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [cacheRaw, whitelistRaw] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY),
          AsyncStorage.getItem(WHITELIST_KEY),
        ]);
        if (cacheRaw) setCache(JSON.parse(cacheRaw));
        if (whitelistRaw) setWhitelist(JSON.parse(whitelistRaw));
      } catch {
      }
    })();
  }, []);

  const addToCache = useCallback(async (product: CachedProduct) => {
    setCache((prev) => {
      const next = { ...prev, [product.barcode]: product };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearCache = useCallback(async () => {
    setCache({});
    setWhitelist([]);
    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEY),
      AsyncStorage.removeItem(WHITELIST_KEY),
    ]);
  }, []);

  const addToWhitelist = useCallback(async (barcode: string) => {
    setWhitelist((prev) => {
      if (prev.includes(barcode)) return prev;
      const next = [...prev, barcode];
      AsyncStorage.setItem(WHITELIST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setCache((prev) => {
      if (!prev[barcode]) return prev;
      const next = {
        ...prev,
        [barcode]: { ...prev[barcode], result: "halal" as ScanResult },
      };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const getCached = useCallback(
    (barcode: string): CachedProduct | null => {
      return cache[barcode] ?? null;
    },
    [cache]
  );

  const isWhitelisted = useCallback(
    (barcode: string) => whitelist.includes(barcode),
    [whitelist]
  );

  return (
    <ScanContext.Provider
      value={{ cache, whitelist, addToCache, addToWhitelist, clearCache, getCached, isWhitelisted }}
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
