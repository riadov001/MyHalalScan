import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import type { Product } from "@/lib/db";

const { width: SCREEN_W } = Dimensions.get("window");
const SCAN_W = Math.min(SCREEN_W * 0.82, 320);
const SCAN_H = 200;

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface ScanState {
  result: ScanResult;
  productName: string;
  barcode: string;
  reason?: string;
  ingredientsText?: string;
  ingredientsList?: string[];
  isOfflineQueued?: boolean;
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanState | null>(null);

  const lastScanned = useRef<string | null>(null);
  const scanCooldown = useRef(false);
  const isLoadingRef = useRef(false);

  const {
    addProduct,
    queueOfflineScan,
    whitelistProduct,
    getProduct,
    isWhitelisted,
    isOnline,
    pendingBarcodes,
    processPendingQueue,
    products,
  } = useScanContext();

  const historyCount = Object.keys(products).length;

  const scanLineY = useSharedValue(0);
  const buttonPulse = useSharedValue(1);
  const offlinePulse = useSharedValue(1);

  useEffect(() => {
    offlinePulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
    );
  }, []);

  useEffect(() => {
    if (isScanning) {
      scanLineY.value = withRepeat(
        withTiming(SCAN_H - 4, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
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
            withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        );
      } else {
        cancelAnimation(buttonPulse);
        buttonPulse.value = withTiming(1);
      }
    }
  }, [isScanning, isLoading]);

  const scanLineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanLineY.value }] }));
  const buttonAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonPulse.value }] }));
  const offlineStyle = useAnimatedStyle(() => ({ opacity: offlinePulse.value }));

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

      const cached = getProduct(barcode);
      if (cached && !pendingBarcodes.includes(barcode)) {
        isLoadingRef.current = false;
        setIsLoading(false);
        setScanResult({
          result: isWhitelisted(barcode) ? "halal" : cached.result,
          productName: cached.productName,
          barcode,
          reason: cached.reason,
          ingredientsText: cached.ingredientsText,
          ingredientsList: cached.ingredientsList,
        });
        return;
      }

      if (!isOnline) {
        await queueOfflineScan(barcode);
        isLoadingRef.current = false;
        setIsLoading(false);
        setScanResult({
          result: "unknown",
          productName: "En attente de réseau",
          barcode,
          reason: "Ce produit sera analysé automatiquement dès le retour de la connexion.",
          isOfflineQueued: true,
        });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/halal/analyze/${barcode}`, {
          signal: AbortSignal.timeout(15_000),
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
          barcode,
          result: json.result,
          productName: json.productName,
          timestamp: Date.now(),
          reason: json.reason,
          ingredientsText: json.ingredientsText,
          ingredientsList: json.ingredientsList,
          isWhitelisted: false,
        };
        await addProduct(product);
        const finalResult = isWhitelisted(barcode) ? "halal" : json.result;
        setScanResult({
          result: finalResult,
          productName: json.productName,
          barcode,
          reason: json.reason,
          ingredientsText: json.ingredientsText,
          ingredientsList: json.ingredientsList,
        });
      } catch {
        await queueOfflineScan(barcode);
        setScanResult({
          result: "unknown",
          productName: "Connexion impossible",
          barcode,
          reason: "Ce produit sera analysé automatiquement dès le retour de la connexion.",
          isOfflineQueued: true,
        });
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [getProduct, isWhitelisted, addProduct, queueOfflineScan, isOnline, pendingBarcodes],
  );

  const handleDismiss = useCallback(() => {
    setScanResult(null);
    lastScanned.current = null;
    scanCooldown.current = false;
  }, []);

  const handleWhitelist = useCallback(() => {
    if (!scanResult) return;
    whitelistProduct(scanResult.barcode);
    setScanResult((prev) => (prev ? { ...prev, result: "halal" } : null));
  }, [scanResult, whitelistProduct]);

  const toggleScan = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsScanning((v) => {
      if (v) {
        lastScanned.current = null;
        scanCooldown.current = false;
      }
      return !v;
    });
  }, []);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={["#050908", "#0C1510"]} style={[styles.center, { paddingTop: topPad + 20 }]}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Accès Caméra</Text>
        <Text style={styles.permText}>
          HalalScan a besoin de la caméra pour scanner les codes-barres des produits.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permBtnText}>AUTORISER LA CAMÉRA</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

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

      {/* dark vignette */}
      <View style={styles.vignetteContainer} pointerEvents="none">
        <LinearGradient colors={["rgba(5,9,8,0.82)", "rgba(5,9,8,0.45)"]} style={styles.vigTop} />
        <View style={styles.vigRow}>
          <View style={styles.vigSide} />
          <View style={[styles.vigHole, { width: SCAN_W, height: SCAN_H }]} />
          <View style={styles.vigSide} />
        </View>
        <LinearGradient colors={["rgba(5,9,8,0.45)", "rgba(5,9,8,0.88)"]} style={styles.vigBottom} />
      </View>

      <View style={styles.overlay} pointerEvents="box-none">

        {/* ── offline banner ── */}
        {(!isOnline || pendingBarcodes.length > 0) && (
          <Animated.View style={[styles.offlineBanner, offlineStyle, { paddingTop: topPad + 6 }]}>
            <Text style={styles.offlineIcon}>{isOnline ? "🔄" : "📡"}</Text>
            <Text style={styles.offlineText}>
              {isOnline
                ? `Synchronisation de ${pendingBarcodes.length} scan(s)…`
                : `Hors ligne — ${pendingBarcodes.length} scan(s) en attente`}
            </Text>
            {isOnline && pendingBarcodes.length > 0 && (
              <TouchableOpacity onPress={processPendingQueue}>
                <Text style={styles.offlineRetry}>↻</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ── header ── */}
        <View style={[styles.header, { paddingTop: (!isOnline || pendingBarcodes.length > 0) ? 0 : topPad + 10 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitle}>
              <Text style={styles.appArabic}>حلال</Text>
              <Text style={styles.appName}>
                <Text style={styles.appNameGreen}>Halal</Text>
                <Text style={styles.appNameGold}>Scan</Text>
              </Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/settings")} activeOpacity={0.75}>
                <Text style={styles.headerBtnIcon}>⚙️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/history")} activeOpacity={0.75}>
                <Text style={styles.headerBtnIcon}>📋</Text>
                {historyCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{historyCount > 99 ? "99+" : historyCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerSub}>
            {isScanning ? "Pointez le code-barres vers le cadre" : "Appuyez sur SCANNER pour commencer"}
          </Text>
        </View>

        {/* ── scan frame ── */}
        <View style={styles.scanFrameWrapper} pointerEvents="none">
          <View style={[styles.scanFrame, { width: SCAN_W, height: SCAN_H }]}>
            {/* corners */}
            <View style={[styles.corner, styles.tl, isScanning && styles.cornerActive]} />
            <View style={[styles.corner, styles.tr, isScanning && styles.cornerActive]} />
            <View style={[styles.corner, styles.bl, isScanning && styles.cornerActive]} />
            <View style={[styles.corner, styles.br, isScanning && styles.cornerActive]} />
            {isScanning && (
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            )}
          </View>
          {isScanning && (
            <Text style={styles.scanHint}>EAN-13 · EAN-8 · UPC · QR</Text>
          )}
        </View>

        {/* ── bottom ── */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) }]}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.loadingText}>ANALYSE EN COURS…</Text>
            </View>
          ) : (
            <Animated.View style={buttonAnimStyle}>
              <TouchableOpacity
                onPress={toggleScan}
                activeOpacity={0.88}
                style={styles.scanBtnOuter}
              >
                <LinearGradient
                  colors={isScanning ? ["#C03020", "#8B1A10"] : [colors.gold, colors.goldLight, "#A07820"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scanBtn}
                >
                  <Text style={styles.scanBtnIcon}>{isScanning ? "⏹" : "📷"}</Text>
                  <Text style={styles.scanBtnText}>{isScanning ? "ARRÊTER" : "SCANNER"}</Text>
                </LinearGradient>
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
          reason={scanResult.reason}
          ingredientsText={scanResult.ingredientsText}
          ingredientsList={scanResult.ingredientsList}
          isOfflineQueued={scanResult.isOfflineQueued}
          onDismiss={handleDismiss}
          onWhitelist={handleWhitelist}
          isWhitelisted={isWhitelisted(scanResult.barcode)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.background, paddingHorizontal: 36, gap: 24,
  },

  // vignette
  vignetteContainer: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
  vigTop: { maxHeight: "38%", flex: 1 },
  vigRow: { flexDirection: "row", height: SCAN_H },
  vigSide: { flex: 1, backgroundColor: "rgba(5,9,8,0.72)" },
  vigHole: {},
  vigBottom: { flex: 1 },

  overlay: { flex: 1, justifyContent: "space-between" },

  // offline banner
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: "rgba(240,165,0,0.15)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240,165,0,0.3)",
  },
  offlineIcon: { fontSize: 16 },
  offlineText: { flex: 1, fontSize: 13, color: colors.warningAmber, fontWeight: "600" },
  offlineRetry: { fontSize: 20, color: colors.warningAmber, fontWeight: "700" },

  // header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "rgba(5,9,8,0.70)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  appArabic: { fontSize: 30, color: colors.halalGreen, lineHeight: 38 },
  appName: { fontSize: 32, fontWeight: "900", letterSpacing: 1 },
  appNameGreen: { color: colors.halalGreen },
  appNameGold: { color: colors.gold },
  headerButtons: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 10, position: "relative" },
  headerBtnIcon: { fontSize: 28 },
  badge: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: colors.haramRed,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "900", color: "#FFF" },
  headerSub: {
    fontSize: 17,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    textAlign: "center",
  },

  // scan frame
  scanFrameWrapper: {
    position: "absolute",
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  scanFrame: { position: "relative" },
  corner: {
    position: "absolute",
    width: 40, height: 40,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 3,
  },
  cornerActive: { borderColor: colors.gold },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: "absolute", top: 0, left: 8, right: 8,
    height: 3, borderRadius: 2, backgroundColor: colors.gold,
    shadowColor: colors.gold, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  scanHint: {
    fontSize: 12, color: "rgba(255,255,255,0.45)",
    fontWeight: "600", letterSpacing: 1.5, textAlign: "center",
  },

  // bottom
  bottom: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 32,
    backgroundColor: "rgba(5,9,8,0.75)",
  },
  loadingBox: { alignItems: "center", gap: 16, paddingVertical: 38 },
  loadingText: {
    color: colors.gold, fontSize: 18, fontWeight: "800", letterSpacing: 2,
  },
  scanBtnOuter: {
    borderRadius: 110,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 18,
  },
  scanBtn: {
    width: 200, height: 200,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  scanBtnIcon: { fontSize: 58, lineHeight: 68 },
  scanBtnText: {
    fontSize: 26, fontWeight: "900",
    color: colors.scannerButtonText, letterSpacing: 2.5,
  },

  // permission
  permIcon: { fontSize: 90, textAlign: "center" },
  permTitle: { fontSize: 30, fontWeight: "900", color: colors.foreground, textAlign: "center" },
  permText: { fontSize: 19, color: colors.foregroundDim, textAlign: "center", lineHeight: 30 },
  permBtn: {
    backgroundColor: colors.gold, borderRadius: colors.radius,
    paddingVertical: 22, paddingHorizontal: 44, marginTop: 10,
  },
  permBtnText: { fontSize: 20, fontWeight: "900", color: colors.scannerButtonText, letterSpacing: 1.5 },
});
