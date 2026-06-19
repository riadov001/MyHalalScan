import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ResultOverlay from "@/components/ResultOverlay";
import colors from "@/constants/colors";
import { type ScanResult, useScanContext } from "@/context/ScanContext";

const { width: SCREEN_W } = Dimensions.get("window");
const SCAN_W = Math.min(SCREEN_W * 0.78, 300);
const SCAN_H = 190;

// ─── ingredient / product analysis ───────────────────────────────────────────

const FORBIDDEN_INGREDIENTS = {
  ko: [
    "porc", "graisse de porc", "saindoux", "lard", "bacon", "gélatine porcine",
    "éthanol", "ethanol", "alcool éthylique", "alcohol", "vin", "rhum",
    "cognac", "brandy", "liqueur", "bière",
    "gélatine", "e441", "collagène", "peptides de collagène", "gélatine hydrolysée",
  ],
  warning: [
    "e471", "mono et diglycérides", "monoglycérides", "diglycérides",
    "e472a", "e472b", "e472c", "e472d", "e472e", "e472f",
    "e473", "e474", "e475", "e476", "e477", "e478", "e479b",
    "e422", "glycérine", "glycérol", "monostéarate de glycérine",
    "distéarate de glycérine", "triacétine", "e1518",
    "e570", "acide stéarique", "e470a", "e470b",
  ],
};

// Categories on OpenFoodFacts that are definitively haram
const HARAM_CATEGORIES = [
  "en:beers", "en:wines", "en:spirits", "en:alcoholic-beverages",
  "en:alcohol", "en:alcohols", "en:hard-ciders", "en:ciders",
  "en:champagnes", "en:sparkling-wines", "en:red-wines", "en:white-wines",
  "en:rosé-wines", "en:whiskies", "en:vodkas", "en:rums", "en:gins",
  "en:brandies", "en:liqueurs", "en:aperitifs",
  "fr:bieres", "fr:biere", "fr:vins", "fr:alcools", "fr:spiritueux",
  "en:pork", "en:pork-products", "en:pork-meats",
  "fr:porc", "fr:charcuteries",
];

// Keywords in product name / generic name that signal haram
const HARAM_NAME_KEYWORDS = [
  "bière", "biere", "beer", "lager", "ale", "stout", "pilsner", "pilsen",
  "vin blanc", "vin rouge", "vin rosé", "champagne", "prosecco", "cava",
  "vodka", "whisky", "whiskey", "rhum", "rum", "gin", "cognac", "brandy",
  "liqueur", "calvados", "armagnac", "porto", "vermouth", "sake",
  "hard cider", "cidre alcool",
  "jambon", "lardons", "saucisson", "chorizo pork", "bacon",
];

const HALAL_LABELS = [
  "halal", "en:halal", "sans porc", "no pork",
  "certifié halal", "certified halal", "halal certified",
];

const HARAM_LABELS = [
  "pork", "alcohol", "wine", "beer", "en:non-halal",
  "en:contains-alcohol",
];

function toTagsString(val: unknown): string {
  if (Array.isArray(val)) return (val as string[]).join(",").toLowerCase();
  if (typeof val === "string") return val.toLowerCase();
  return "";
}

function analyzeProduct(data: Record<string, unknown>): {
  result: ScanResult;
  productName: string;
} {
  const productName =
    (data["product_name_fr"] as string) ||
    (data["product_name"] as string) ||
    (data["product_name_en"] as string) ||
    (data["generic_name_fr"] as string) ||
    (data["generic_name"] as string) ||
    "Produit sans nom";

  // 1. Explicit halal / haram labels
  const labels =
    toTagsString(data["labels_tags"]) + "," +
    toTagsString(data["labels"]);

  for (const l of HARAM_LABELS) {
    if (labels.includes(l)) return { result: "haram", productName };
  }
  for (const l of HALAL_LABELS) {
    if (labels.includes(l)) return { result: "halal", productName };
  }

  // 2. Categories (catches beers/wines with no ingredients listed)
  const categories = toTagsString(data["categories_tags"]);
  for (const cat of HARAM_CATEGORIES) {
    if (categories.includes(cat)) return { result: "haram", productName };
  }

  // 3. Alcohol content in nutriments (any non-zero value = alcohol)
  const nutriments = data["nutriments"] as Record<string, unknown> | undefined;
  if (nutriments) {
    const alcoholPer100g = Number(nutriments["alcohol_100g"] ?? nutriments["alcohol"]);
    if (alcoholPer100g > 0) return { result: "haram", productName };
  }

  // 4. Product name contains obvious haram keyword
  const nameLower = productName.toLowerCase();
  const genericName = (
    (data["generic_name_fr"] as string) ||
    (data["generic_name"] as string) ||
    ""
  ).toLowerCase();
  for (const kw of HARAM_NAME_KEYWORDS) {
    if (nameLower.includes(kw) || genericName.includes(kw)) {
      return { result: "haram", productName };
    }
  }

  // 5. Allergens (pork gelatin triggers haram)
  const allergens = toTagsString(data["allergens_tags"]);
  if (allergens.includes("en:pork") || allergens.includes("fr:porc")) {
    return { result: "haram", productName };
  }

  // 6. Ingredients text analysis
  const ingredients = (
    (data["ingredients_text_fr"] as string) ||
    (data["ingredients_text"] as string) ||
    (data["ingredients_text_en"] as string) ||
    ""
  ).toLowerCase();

  if (!ingredients) return { result: "unknown", productName };

  for (const ing of FORBIDDEN_INGREDIENTS.ko) {
    if (ingredients.includes(ing)) return { result: "haram", productName };
  }
  for (const ing of FORBIDDEN_INGREDIENTS.warning) {
    if (ingredients.includes(ing)) return { result: "warning", productName };
  }

  return { result: "halal", productName };
}

// ─── scanner screen ───────────────────────────────────────────────────────────

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    result: ScanResult;
    productName: string;
    barcode: string;
  } | null>(null);

  const lastScanned = useRef<string | null>(null);
  const scanCooldown = useRef(false);
  const isLoadingRef = useRef(false);

  const { addToCache, addToWhitelist, getCached, isWhitelisted, cache } = useScanContext();
  const historyCount = Object.keys(cache).length;

  // ── animations ──────────────────────────────────────────────────────────────
  const scanLineY = useSharedValue(0);
  const buttonPulse = useSharedValue(1);

  useEffect(() => {
    if (isScanning) {
      scanLineY.value = withRepeat(
        withTiming(SCAN_H - 4, {
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      );
      cancelAnimation(buttonPulse);
      buttonPulse.value = withTiming(1);
    } else {
      cancelAnimation(scanLineY);
      scanLineY.value = withTiming(SCAN_H / 2);
      if (!isLoading) {
        buttonPulse.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        );
      } else {
        cancelAnimation(buttonPulse);
        buttonPulse.value = withTiming(1);
      }
    }
  }, [isScanning, isLoading]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPulse.value }],
  }));

  // ── barcode handler ──────────────────────────────────────────────────────────
  const handleBarcode = useCallback(
    async ({ data: barcode }: { data: string }) => {
      if (scanCooldown.current || isLoadingRef.current) return;
      if (lastScanned.current === barcode) return;

      scanCooldown.current = true;
      lastScanned.current = barcode;
      setIsScanning(false);
      isLoadingRef.current = true;
      setIsLoading(true);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      const cached = getCached(barcode);
      if (cached) {
        isLoadingRef.current = false;
        setIsLoading(false);
        setScanResult({
          result: isWhitelisted(barcode) ? "halal" : cached.result,
          productName: cached.productName,
          barcode,
        });
        return;
      }

      try {
        const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
        const res = await fetch(url, {
          headers: { "User-Agent": "HalalScan/1.0 (contact@halalscan.app)" },
        });
        const json = (await res.json()) as {
          status: number;
          product?: Record<string, unknown>;
        };

        if (json.status === 1 && json.product) {
          const { result, productName } = analyzeProduct(json.product);
          const finalResult = isWhitelisted(barcode) ? "halal" : result;
          await addToCache({ barcode, result, productName, timestamp: Date.now() });
          setScanResult({ result: finalResult, productName, barcode });
        } else {
          setScanResult({ result: "unknown", productName: "Produit non trouvé", barcode });
        }
      } catch {
        setScanResult({ result: "unknown", productName: "Erreur réseau", barcode });
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [getCached, isWhitelisted, addToCache],
  );

  const handleDismiss = useCallback(() => {
    setScanResult(null);
    lastScanned.current = null;
    scanCooldown.current = false;
  }, []);

  const handleWhitelist = useCallback(() => {
    if (!scanResult) return;
    addToWhitelist(scanResult.barcode);
    setScanResult((prev) => (prev ? { ...prev, result: "halal" } : null));
  }, [scanResult, addToWhitelist]);

  const toggleScan = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsScanning((v) => {
      if (v) {
        lastScanned.current = null;
        scanCooldown.current = false;
      }
      return !v;
    });
  }, []);

  // ── permission screens ───────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.scannerButton} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Accès Caméra</Text>
        <Text style={styles.permText}>
          HalalScan a besoin de la caméra pour scanner les codes-barres des produits.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permBtnText}>AUTORISER LA CAMÉRA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── main UI ──────────────────────────────────────────────────────────────────
  const btnBg = isScanning ? "#FF4500" : colors.scannerButton;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 10);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
        }}
        onBarcodeScanned={isScanning ? handleBarcode : undefined}
      />

      {/* vignette — 4 rectangles framing the scan zone */}
      <View style={styles.vignetteContainer} pointerEvents="none">
        <View style={styles.vigTop} />
        <View style={styles.vigRow}>
          <View style={styles.vigSide} />
          <View style={[styles.vigHole, { width: SCAN_W, height: SCAN_H }]} />
          <View style={styles.vigSide} />
        </View>
        <View style={styles.vigBottom} />
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        {/* header */}
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Text style={styles.appArabic}>حلال</Text>
          <Text style={styles.appTitle}>
            <Text style={styles.appTitleHalal}>Halal</Text>
            <Text style={styles.appTitleScan}>Scan</Text>
          </Text>
          <Text style={styles.appSubtitle}>
            {isScanning ? "Pointez vers un code-barres" : "Appuyez sur SCANNER"}
          </Text>
          {/* history button */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push("/history")}
            activeOpacity={0.8}
          >
            <Text style={styles.historyIcon}>📋</Text>
            {historyCount > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>
                  {historyCount > 99 ? "99+" : historyCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* scan frame corners */}
        <View style={styles.scanFrameWrapper} pointerEvents="none">
          <View style={[styles.scanFrame, { width: SCAN_W, height: SCAN_H }]}>
            <View style={[styles.corner, styles.tl, isScanning && styles.cornerActive]} />
            <View style={[styles.corner, styles.tr, isScanning && styles.cornerActive]} />
            <View style={[styles.corner, styles.bl, isScanning && styles.cornerActive]} />
            <View style={[styles.corner, styles.br, isScanning && styles.cornerActive]} />
            {isScanning && (
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            )}
          </View>
        </View>

        {/* bottom */}
        <View style={[styles.bottom, { paddingBottom: botPad }]}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.scannerButton} />
              <Text style={styles.loadingText}>ANALYSE EN COURS…</Text>
            </View>
          ) : (
            <Animated.View style={buttonAnimStyle}>
              <TouchableOpacity
                style={[styles.scanBtn, { backgroundColor: btnBg, shadowColor: btnBg }]}
                onPress={toggleScan}
                activeOpacity={0.85}
              >
                <Text style={styles.scanBtnIcon}>{isScanning ? "⏹" : "📷"}</Text>
                <Text style={styles.scanBtnText}>
                  {isScanning ? "ARRÊTER" : "SCANNER"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>

      {scanResult && (
        <ResultOverlay
          result={scanResult.result}
          productName={scanResult.productName}
          barcode={scanResult.barcode}
          onDismiss={handleDismiss}
          onWhitelist={handleWhitelist}
          isWhitelisted={isWhitelisted(scanResult.barcode)}
        />
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 32,
    gap: 20,
  },

  // vignette
  vignetteContainer: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
  vigTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", maxHeight: "35%" },
  vigRow: { flexDirection: "row", height: SCAN_H },
  vigSide: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  vigHole: {},
  vigBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },

  // overlay
  overlay: { flex: 1, justifyContent: "space-between" },

  // header
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    position: "relative",
  },
  appArabic: {
    fontSize: 28,
    color: colors.halalGreen,
    textAlign: "center",
    lineHeight: 34,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  appTitleHalal: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.halalGreen,
    letterSpacing: 1.5,
  },
  appTitleScan: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.scannerButton,
    letterSpacing: 1.5,
  },
  appSubtitle: {
    fontSize: 17,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontWeight: "600",
  },
  historyBtn: {
    position: "absolute",
    right: 16,
    bottom: 14,
    padding: 8,
  },
  historyIcon: { fontSize: 28 },
  historyBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: colors.scannerButton,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.scannerButtonText,
  },

  // scan frame
  scanFrameWrapper: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: { position: "relative" },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "rgba(255,255,255,0.45)",
    borderWidth: 3,
  },
  cornerActive: { borderColor: colors.scannerButton },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.scannerButton,
  },

  // bottom
  bottom: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  loadingBox: { alignItems: "center", gap: 14, paddingVertical: 36 },
  loadingText: {
    color: colors.scannerButton,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // scanner button
  scanBtn: {
    borderRadius: 120,
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
  scanBtnIcon: { fontSize: 52, lineHeight: 62 },
  scanBtnText: {
    fontSize: 25,
    fontWeight: "900",
    color: colors.scannerButtonText,
    letterSpacing: 2,
  },

  // permission
  permIcon: { fontSize: 80 },
  permTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.foreground,
    textAlign: "center",
  },
  permText: {
    fontSize: 18,
    color: colors.foregroundDim,
    textAlign: "center",
    lineHeight: 28,
  },
  permBtn: {
    backgroundColor: colors.scannerButton,
    borderRadius: colors.radius,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  permBtnText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.scannerButtonText,
    letterSpacing: 1,
  },
});
