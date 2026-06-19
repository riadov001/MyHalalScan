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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ResultOverlay from "@/components/ResultOverlay";
import colors from "@/constants/colors";
import { type ScanResult, useScanContext } from "@/context/ScanContext";
import type { Product } from "@/lib/db";

const { width: SCREEN_W } = Dimensions.get("window");
const SCAN_W = Math.min(SCREEN_W * 0.82, 310);
const SCAN_H = 190;
const CORNER = 44;
const CORNER_THICKNESS = 4;

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

  // Animations
  const scanLineY = useSharedValue(0);
  const scanLineOpacity = useSharedValue(0);
  const ringScale1 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(0.6);
  const ringScale2 = useSharedValue(1);
  const ringOpacity2 = useSharedValue(0.35);
  const btnScale = useSharedValue(1);
  const cornerBrightness = useSharedValue(0.4);
  const offlineBlink = useSharedValue(1);

  // Offline banner blink
  useEffect(() => {
    offlineBlink.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1100 }),
        withTiming(1, { duration: 1100 }),
      ),
      -1,
    );
  }, []);

  // Ring pulse animation (idle)
  const startIdlePulse = useCallback(() => {
    ringScale1.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    ringOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 1400 }),
        withTiming(0.55, { duration: 1400 }),
      ),
      -1,
    );
    ringScale2.value = withRepeat(
      withSequence(
        withTiming(1.28, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    ringOpacity2.value = withRepeat(
      withSequence(
        withTiming(0.06, { duration: 1800 }),
        withTiming(0.25, { duration: 1800 }),
      ),
      -1,
    );
  }, []);

  useEffect(() => {
    if (isScanning) {
      cancelAnimation(ringScale1);
      cancelAnimation(ringScale2);
      cancelAnimation(ringOpacity1);
      cancelAnimation(ringOpacity2);
      ringScale1.value = withTiming(1);
      ringOpacity1.value = withTiming(0.8);
      ringScale2.value = withTiming(1);
      ringOpacity2.value = withTiming(0.4);
      cornerBrightness.value = withTiming(1, { duration: 400 });
      scanLineOpacity.value = withTiming(1, { duration: 400 });
      scanLineY.value = withRepeat(
        withTiming(SCAN_H - 4, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else if (!isLoading) {
      cancelAnimation(scanLineY);
      scanLineOpacity.value = withTiming(0, { duration: 300 });
      cornerBrightness.value = withTiming(0.4, { duration: 600 });
      startIdlePulse();
    }
  }, [isScanning, isLoading]);

  useEffect(() => {
    if (!isLoading && !isScanning) startIdlePulse();
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: scanLineOpacity.value,
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity1.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity2.value,
  }));
  const cornerStyle = useAnimatedStyle(() => ({ opacity: cornerBrightness.value }));
  const cornerActiveStyle = useAnimatedStyle(() => ({ opacity: cornerBrightness.value, shadowOpacity: cornerBrightness.value * 0.9 }));
  const offlineStyle = useAnimatedStyle(() => ({ opacity: offlineBlink.value }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const handleBarcode = useCallback(
    async ({ data: barcode }: { data: string }) => {
      if (scanCooldown.current || isLoadingRef.current) return;
      if (lastScanned.current === barcode) return;

      scanCooldown.current = true;
      lastScanned.current = barcode;
      setIsScanning(false);
      isLoadingRef.current = true;
      setIsLoading(true);

      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

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
        setScanResult({
          result: isWhitelisted(barcode) ? "halal" : json.result,
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
    setScanResult((p) => (p ? { ...p, result: "halal" } : null));
  }, [scanResult, whitelistProduct]);

  const toggleScan = useCallback(() => {
    if (isLoading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    btnScale.value = withSequence(withTiming(0.93, { duration: 90 }), withSpring(1, { damping: 12 }));
    setIsScanning((v) => {
      if (v) { lastScanned.current = null; scanCooldown.current = false; }
      return !v;
    });
  }, [isLoading]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  if (!permission) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={["#0C1510", "#050908", "#050908"]} style={[styles.flex, styles.permScreen]}>
        <View style={[styles.permIconCircle]}>
          <Text style={styles.permIcon}>📷</Text>
        </View>
        <Text style={styles.permTitle}>Accès Caméra{"\n"}Requis</Text>
        <Text style={styles.permText}>
          HalalScan utilise la caméra pour scanner les codes-barres des produits alimentaires.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
          <LinearGradient colors={[colors.goldLight, colors.gold, "#A07820"]} style={styles.permBtnGrad}>
            <Text style={styles.permBtnText}>AUTORISER LA CAMÉRA</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.permNote}>Votre caméra n'est jamais enregistrée.</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"],
        }}
        onBarcodeScanned={isScanning ? handleBarcode : undefined}
      />

      {/* vignette overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={["rgba(5,9,8,0.88)", "rgba(5,9,8,0.55)", "transparent"]}
          style={styles.vigTop}
        />
        <LinearGradient
          colors={["transparent", "rgba(5,9,8,0.55)", "rgba(5,9,8,0.92)"]}
          style={styles.vigBottom}
        />
        <LinearGradient
          colors={["rgba(5,9,8,0.65)", "transparent", "rgba(5,9,8,0.65)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.flex} pointerEvents="box-none">
        {/* ── offline banner ── */}
        {(!isOnline || pendingBarcodes.length > 0) && (
          <Animated.View style={[styles.offlineBanner, { paddingTop: topPad + 4 }, offlineStyle]}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>
              {isOnline
                ? `Synchronisation en cours — ${pendingBarcodes.length} scan(s)…`
                : `Hors ligne — ${pendingBarcodes.length} scan(s) en attente`}
            </Text>
            {isOnline && pendingBarcodes.length > 0 && (
              <TouchableOpacity onPress={processPendingQueue} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.offlineSync}>↻</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ── HEADER ── */}
        <View
          style={[
            styles.header,
            {
              paddingTop: (!isOnline || pendingBarcodes.length > 0) ? 12 : topPad + 12,
            },
          ]}
        >
          <View style={styles.logoRow}>
            <View style={styles.logoLeft}>
              <Text style={styles.logoArabic}>حلال</Text>
              <View>
                <Text style={styles.logoApp}>
                  <Text style={styles.logoGreen}>Halal</Text>
                  <Text style={styles.logoGold}>Scan</Text>
                </Text>
                <Text style={styles.logoTagline}>Analyse d'ingrédients halal</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <HeaderBtn icon="⚙️" onPress={() => router.push("/settings")} />
              <HeaderBtn icon="📋" onPress={() => router.push("/history")} badge={historyCount} />
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isScanning ? colors.halalGreen : colors.mutedForeground }]} />
            <Text style={styles.statusText}>
              {isScanning
                ? "Pointez le code-barres vers le cadre"
                : "Appuyez sur SCANNER pour commencer"}
            </Text>
          </View>
        </View>

        {/* ── SCAN FRAME ── */}
        <View style={styles.frameContainer} pointerEvents="none">
          <View style={[styles.frame, { width: SCAN_W, height: SCAN_H }]}>
            {/* corners */}
            {isScanning ? (
              <>
                <Animated.View style={[styles.corner, styles.tl, cornerActiveStyle]} />
                <Animated.View style={[styles.corner, styles.tr, cornerActiveStyle]} />
                <Animated.View style={[styles.corner, styles.bl, cornerActiveStyle]} />
                <Animated.View style={[styles.corner, styles.br, cornerActiveStyle]} />
              </>
            ) : (
              <>
                <Animated.View style={[styles.corner, styles.tl, cornerStyle]} />
                <Animated.View style={[styles.corner, styles.tr, cornerStyle]} />
                <Animated.View style={[styles.corner, styles.bl, cornerStyle]} />
                <Animated.View style={[styles.corner, styles.br, cornerStyle]} />
              </>
            )}

            {/* scan line */}
            <Animated.View style={[styles.scanLineWrap, scanLineStyle]} pointerEvents="none">
              <LinearGradient
                colors={["transparent", colors.gold, colors.goldLight, colors.gold, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanLine}
              />
            </Animated.View>
          </View>

          <Text style={styles.frameHint}>
            {isScanning ? "EAN-13 · EAN-8 · UPC · QR Code" : " "}
          </Text>
        </View>

        {/* ── BOTTOM PANEL ── */}
        <View style={[styles.bottom, { paddingBottom: botPad + 16 }]}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.loadingText}>ANALYSE EN COURS…</Text>
              <Text style={styles.loadingSubtext}>Interrogation de la base de données</Text>
            </View>
          ) : (
            <Animated.View style={[styles.btnWrapper, btnStyle]}>
              {/* outer glow rings */}
              <Animated.View style={[styles.ring, styles.ring2, ring2Style]} pointerEvents="none" />
              <Animated.View style={[styles.ring, styles.ring1, ring1Style]} pointerEvents="none" />

              <TouchableOpacity onPress={toggleScan} activeOpacity={0.9}>
                <LinearGradient
                  colors={
                    isScanning
                      ? ["#C03020", "#9B1A10", "#6B0A08"]
                      : [colors.goldLight, colors.gold, "#B08030", colors.gold]
                  }
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

          {!isLoading && (
            <Text style={styles.bottomHint}>
              {isScanning ? "Maintenez l'appareil stable" : "Scannez n'importe quel code-barres alimentaire"}
            </Text>
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

function HeaderBtn({ icon, onPress, badge }: { icon: string; onPress: () => void; badge?: number }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.headerBtn}>
      <View style={styles.headerBtnInner}>
        <Text style={styles.headerBtnIcon}>{icon}</Text>
      </View>
      {!!badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const BTN_SIZE = 192;
const RING1_SIZE = BTN_SIZE + 36;
const RING2_SIZE = BTN_SIZE + 76;

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // vignette
  vigTop: { position: "absolute", top: 0, left: 0, right: 0, height: "42%" },
  vigBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: "50%" },

  // offline
  offlineBanner: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 10, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(240,165,0,0.4)",
    backgroundColor: "rgba(20,12,0,0.75)",
  },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warningAmber },
  offlineText: { flex: 1, fontSize: 13, color: colors.warningAmber, fontWeight: "600" },
  offlineSync: { fontSize: 22, color: colors.warningAmber, fontWeight: "700" },

  // header
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 10,
  },
  logoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logoLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoArabic: { fontSize: 42, color: colors.halalGreen, lineHeight: 52 },
  logoApp: { fontSize: 30, fontWeight: "900", letterSpacing: 0.5, lineHeight: 36 },
  logoGreen: { color: colors.halalGreen },
  logoGold: { color: colors.gold },
  logoTagline: { fontSize: 11, color: colors.mutedForeground, fontWeight: "500", letterSpacing: 1 },

  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { position: "relative" },
  headerBtnInner: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerBtnIcon: { fontSize: 24 },
  badge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: colors.haramRed,
    borderRadius: 9, minWidth: 18, height: 18,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: "#FFF" },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: "500" },

  // scan frame
  frameContainer: {
    position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
    alignItems: "center", justifyContent: "center", gap: 14,
    pointerEvents: "none",
  } as unknown as { [key: string]: unknown },
  frame: { position: "relative", overflow: "visible" },
  corner: {
    position: "absolute",
    width: CORNER, height: CORNER,
    borderColor: colors.gold,
    borderWidth: CORNER_THICKNESS,
  },
  tl: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },

  scanLineWrap: {
    position: "absolute", top: 0, left: 0, right: 0,
  },
  scanLine: {
    height: 3, borderRadius: 2,
    shadowColor: colors.gold, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  frameHint: { fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 2, fontWeight: "600" },

  // bottom
  bottom: {
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 0,
  },
  loadingBox: { alignItems: "center", gap: 14, paddingVertical: 42 },
  loadingText: { fontSize: 20, fontWeight: "900", color: colors.gold, letterSpacing: 2.5 },
  loadingSubtext: { fontSize: 14, color: colors.mutedForeground, fontWeight: "500" },

  btnWrapper: { width: RING2_SIZE, height: RING2_SIZE, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ring1: {
    width: RING1_SIZE, height: RING1_SIZE,
    borderColor: colors.gold,
  },
  ring2: {
    width: RING2_SIZE, height: RING2_SIZE,
    borderColor: colors.gold,
  },
  scanBtn: {
    width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2,
    alignItems: "center", justifyContent: "center", gap: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  scanBtnIcon: { fontSize: 56, lineHeight: 66 },
  scanBtnText: { fontSize: 22, fontWeight: "900", color: "#050908", letterSpacing: 2 },

  bottomHint: {
    fontSize: 14, color: "rgba(255,255,255,0.4)",
    textAlign: "center", fontWeight: "500", marginTop: 16,
  },

  // permission
  permScreen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 22 },
  permIconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(212,168,71,0.12)",
    borderWidth: 2, borderColor: colors.gold + "50",
    alignItems: "center", justifyContent: "center",
  },
  permIcon: { fontSize: 56 },
  permTitle: { fontSize: 32, fontWeight: "900", color: colors.foreground, textAlign: "center", lineHeight: 42 },
  permText: { fontSize: 18, color: colors.foregroundDim, textAlign: "center", lineHeight: 28 },
  permBtn: { borderRadius: 20, overflow: "hidden", width: "100%" },
  permBtnGrad: { paddingVertical: 22, alignItems: "center" },
  permBtnText: { fontSize: 20, fontWeight: "900", color: "#050908", letterSpacing: 1.5 },
  permNote: { fontSize: 13, color: colors.mutedForeground, textAlign: "center" },
});
