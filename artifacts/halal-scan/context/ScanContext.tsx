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

import { localDb, type AlwaysHalalIngredient, type CustomIngredient, type Product, type ScanResult } from "@/lib/db";

export type { ScanResult };
export type CachedProduct = Product;
export type { CustomIngredient, AlwaysHalalIngredient };

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const MAX_RETRIES = 3;

interface ScanContextType {
  products: Record<string, Product>;
  pendingBarcodes: string[];
  isOnline: boolean;
  isDbReady: boolean;
  soundEnabled: boolean;
  customIngredients: CustomIngredient[];
  alwaysHalalIngredients: AlwaysHalalIngredient[];
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
  addAlwaysHalal: (term: string) => Promise<void>;
  removeAlwaysHalal: (id: number) => Promise<void>;
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
  alwaysHalalIngredients: AlwaysHalalIngredient[] = [],
): string | null {
  if (!ingredientsText || customIngredients.length === 0) return null;
  const norm = ingredientsText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
  for (const ci of customIngredients) {
    if (containsTerm(norm, ci.term)) {
      // If this ingredient is in the always-halal list, skip it
      if (alwaysHalalIngredients.some(ah => containsTerm(norm, ah.term) && ah.term.toLowerCase() === ci.term.toLowerCase())) {
        continue;
      }
      return ci.term;
    }
  }
  return null;
}

/** Returns true if the server's reason/result should be overridden to halal because the offending ingredient is in the always-halal list */
export function checkAlwaysHalalOverride(
  reason: string | undefined,
  ingredientsText: string | undefined,
  alwaysHalal: AlwaysHalalIngredient[],
): boolean {
  if (!alwaysHalal.length) return false;
  const haystack = `${reason ?? ""} ${ingredientsText ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
  return alwaysHalal.some(ah => containsTerm(haystack, ah.term));
}

/**
 * Recomputes the effective result/reason from the server's RAW result (before any user-list
 * override) plus the user's current custom/always-halal ingredient lists. This must be re-run
 * every time those lists change or a cached/history product is displayed -- never trust a
 * previously-stored `result`/`reason`, since those are frozen at scan time and go stale the
 * moment the user edits their lists.
 */
export function applyIngredientOverrides(
  rawResult: ScanResult,
  rawReason: string | undefined,
  ingredientsText: string | undefined,
  ingredientsList: string[] | undefined,
  customIngredients: CustomIngredient[],
  alwaysHalalIngredients: AlwaysHalalIngredient[],
): { result: ScanResult; reason: string | undefined } {
  const fullIngredientsText = [
    ingredientsText ?? "",
    (ingredientsList ?? []).join(", "),
  ].filter(Boolean).join(", ");

  let result = rawResult;
  let reason = rawReason;

  // 1. Always-halal override: if the server flagged an ingredient the user marked as always-halal, revert to halal
  if (result !== "halal" && checkAlwaysHalalOverride(rawReason, fullIngredientsText, alwaysHalalIngredients)) {
    result = "halal";
    reason = "Ingrédient dans votre liste « toujours halal »";
    return { result, reason };
  }

  // 2. Custom-ingredient override: if any personal haram term found → HARAM
  if (result !== "haram" && fullIngredientsText) {
    const customHit = checkCustomIngredients(fullIngredientsText, customIngredients, alwaysHalalIngredients);
    if (customHit) {
      result = "haram";
      reason = `Ingrédient personnalisé détecté : "${customHit}"`;
    }
  }

  return { result, reason };
}

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [pendingBarcodes, setPendingBarcodes] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [customIngredients, setCustomIngredients] = useState<CustomIngredient[]>([]);
  const [alwaysHalalIngredients, setAlwaysHalalIngredients] = useState<AlwaysHalalIngredient[]>([]);
  const processingRef = useRef(false);

  // Kept in sync so processPendingQueue (a stable callback) always reads the
  // latest ingredient lists instead of a stale closure.
  const customIngredientsRef = useRef(customIngredients);
  useEffect(() => { customIngredientsRef.current = customIngredients; }, [customIngredients]);
  const alwaysHalalRef = useRef(alwaysHalalIngredients);
  useEffect(() => { alwaysHalalRef.current = alwaysHalalIngredients; }, [alwaysHalalIngredients]);

  useEffect(() => {
    (async () => {
      try {
        const [allProducts, allPending, soundVal, customs, alwaysHalals] = await Promise.all([
          localDb.getAllProducts(),
          localDb.getAllPending(),
          localDb.getSetting("sound_enabled"),
          localDb.getAllCustomIngredients(),
          localDb.getAllAlwaysHalal(),
        ]);
        const map: Record<string, Product> = {};
        for (const p of allProducts) map[p.barcode] = p;
        setProducts(map);
        setPendingBarcodes(allPending.map((p) => p.barcode));
        setSoundEnabledState(soundVal === null ? true : soundVal === "1");
        setCustomIngredients(customs);
        setAlwaysHalalIngredients(alwaysHalals);
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
          const ctrl = new AbortController();
          const tId = setTimeout(() => ctrl.abort(), 12_000);
          let res: Response;
          try {
            res = await fetch(`${API_BASE}/api/halal/analyze/${scan.barcode}`, { signal: ctrl.signal });
          } finally {
            clearTimeout(tId);
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as {
            result: ScanResult;
            productName: string;
            reason?: string;
            foundInDatabase: boolean;
            hasIngredients: boolean;
            ingredientsText?: string;
            ingredientsList?: string[];
            source?: "internal_db" | "openfoodfacts" | "ai" | "unknown";
          };
          // Apply the user's custom/always-halal ingredient lists to the raw server
          // result -- otherwise scans queued while offline would skip personal overrides.
          const { result: finalResult, reason: finalReason } = applyIngredientOverrides(
            json.result,
            json.reason,
            json.ingredientsText,
            json.ingredientsList,
            customIngredientsRef.current,
            alwaysHalalRef.current,
          );
          const product: Product = {
            barcode: scan.barcode,
            result: finalResult,
            productName: json.productName,
            timestamp: scan.timestamp,
            reason: finalReason,
            ingredientsText: json.ingredientsText,
            ingredientsList: json.ingredientsList,
            isWhitelisted: false,
            source: json.source,
            rawResult: json.result,
            rawReason: json.reason,
          };
          await localDb.upsertProduct(product);
          await localDb.removePending(scan.barcode);
          setProducts((prev) => ({ ...prev, [scan.barcode]: product }));
          setPendingBarcodes((prev) => prev.filter((b) => b !== scan.barcode));
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isAbort  = err instanceof Error && err.name === "AbortError";
          const isNetwork = err instanceof TypeError;
          console.error(`[HalalScan] Queue retry failed barcode=${scan.barcode} type=${isAbort ? "timeout" : isNetwork ? "network" : "http"} msg=${errMsg}`);
          if (scan.retryCount >= MAX_RETRIES) {
            console.warn(`[HalalScan] Max retries reached for barcode=${scan.barcode}, dropping`);
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

  const addAlwaysHalal = useCallback(async (term: string) => {
    const trimmed = term.trim().slice(0, 60);
    if (!trimmed) return;
    const created = await localDb.addAlwaysHalal(trimmed);
    setAlwaysHalalIngredients((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev;
      return [...prev, created];
    });
  }, []);

  const removeAlwaysHalal = useCallback(async (id: number) => {
    await localDb.removeAlwaysHalal(id);
    setAlwaysHalalIngredients((prev) => prev.filter((c) => c.id !== id));
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
        alwaysHalalIngredients,
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
        addAlwaysHalal,
        removeAlwaysHalal,
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
