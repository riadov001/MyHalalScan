import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import C from "@/constants/colors";
import { type ScanResult, useScanContext } from "@/context/ScanContext";
import type { Product } from "@/lib/db";

const { width: W } = Dimensions.get("window");
const FRAME_W = Math.min(W * 0.82, 300);
const FRAME_H = 172;
const CORNER = 38;
const CT = 4;

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface ScanState {
  result: ScanResult; productName: string; barcode: string;
  reason?: string; ingredientsText?: string; ingredientsList?: string[];
  isOfflineQueued?: boolean;
}

const BARCODE_RE = /^[a-zA-Z0-9-]{1,50}$/;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const [scanResult, setScanResult] = useState<ScanState | null>(null);
  const [manualCode, setManualCode] = useState("");

  const lastBarcode = useRef<string | null>(null);
  const cooldown = useRef(false);
  const loadingRef = useRef(false);
  const scanningRef = useRef(false);
  const autoStartedRef = useRef(false);

  const {
    addProduct, queueOfflineScan, whitelistProduct,
    getProduct, isWhitelisted, isOnline, pendingBarcodes,
    processPendingQueue, products,
  } = useScanContext();

  const histCount = Object.keys(products).length;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // ── Animations ────────────────────────────────────────────────────────────
  const scanLineY = useSharedValue(0);
  const scanLineA = useSharedValue(0);
  const cornerA = useSharedValue(0.4);
  const cornerGlow = useSharedValue(0);
  const btnScale = useSharedValue(1);
  const offlineA = useSharedValue(1);

  useEffect(() => {
    offlineA.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
    );
  }, []);

  // Auto-start scanning as soon as camera permission is confirmed
  useEffect(() => {
    if (permission?.granted && !autoStartedRef.current && !scanResult) {
      autoStartedRef.current = true;
      scanningRef.current = true;
      setScanning(true);
    }
  }, [permission?.granted, scanResult]);

  useEffect(() => {
    if (scanning) {
      cornerA.value = withTiming(1, { duration: 280 });
      cornerGlow.value = withTiming(1, { duration: 380 });
      scanLineA.value = withTiming(1, { duration: 320 });
      scanLineY.value = withRepeat(
        withTiming(FRAME_H - 3, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        -1, true,
      );
    } else {
      cancelAnimation(scanLineY);
      scanLineA.value = withTiming(0, { duration: 220 });
      cornerA.value = withTiming(0.38, { duration: 450 });
      cornerGlow.value = withTiming(0, { duration: 450 });
    }
  }, [scanning]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }], opacity: scanLineA.value,
  }));
  const cornerStyle = useAnimatedStyle(() => ({
    opacity: cornerA.value,
    shadowOpacity: cornerGlow.value * 0.85,
  }));
  const offlineStyle = useAnimatedStyle(() => ({ opacity: offlineA.value }));
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  // ── Core scan logic ───────────────────────────────────────────────────────
  const processBarcode = useCallback(async (barcode: string) => {
    if (cooldown.current || loadingRef.current || lastBarcode.current === barcode) return;
    cooldown.current = true;
    lastBarcode.current = barcode;
    scanningRef.current = false;
    setScanning(false);
    setTorch(false);
    loadingRef.current = true;
    setLoading(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const cached = getProduct(barcode);
    if (cached && !pendingBarcodes.includes(barcode)) {
      loadingRef.current = false; setLoading(false);
      setScanResult({
        result: isWhitelisted(barcode) ? "halal" : cached.result,
        productName: cached.productName, barcode,
        reason: cached.reason, ingredientsText: cached.ingredientsText,
        ingredientsList: cached.ingredientsList,
      });
      return;
    }
    if (!isOnline) {
      await queueOfflineScan(barcode);
      loadingRef.current = false; setLoading(false);
      setScanResult({ result: "unknown", productName: "En attente de réseau", barcode,
        reason: "Analysé automatiquement dès le retour de la connexion.", isOfflineQueued: true });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/halal/analyze/${barcode}`, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        result: ScanResult; productName: string; reason?: string;
        ingredientsText?: string; ingredientsList?: string[];
      };
      const product: Product = {
        barcode, result: json.result, productName: json.productName, timestamp: Date.now(),
        reason: json.reason, ingredientsText: json.ingredientsText,
        ingredientsList: json.ingredientsList, isWhitelisted: false,
      };
      await addProduct(product);
      setScanResult({
        result: isWhitelisted(barcode) ? "halal" : json.result,
        productName: json.productName, barcode, reason: json.reason,
        ingredientsText: json.ingredientsText, ingredientsList: json.ingredientsList,
      });
    } catch {
      await queueOfflineScan(barcode);
      setScanResult({ result: "unknown", productName: "Connexion impossible", barcode,
        reason: "Analysé automatiquement dès le retour de la connexion.", isOfflineQueued: true });
    } finally { loadingRef.current = false; setLoading(false); }
  }, [getProduct, isWhitelisted, addProduct, queueOfflineScan, isOnline, pendingBarcodes]);

  const handleBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (!scanningRef.current) return;
    processBarcode(data);
  }, [processBarcode]);


  // ── Gallery picker ────────────────────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    if (loadingRef.current) return;
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 1,
        allowsEditing: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const uri = picked.assets[0].uri;

      loadingRef.current = true;
      setLoading(true);

      let barcodeData: string | null = null;

      if (Platform.OS !== "web") {
        const codes = await Camera.scanFromURLAsync(uri, [
          "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr",
        ]);
        barcodeData = codes.length > 0 && codes[0].data ? codes[0].data : null;
      }

      loadingRef.current = false;
      setLoading(false);

      if (barcodeData) {
        cooldown.current = false;
        lastBarcode.current = null;
        processBarcode(barcodeData);
      } else {
        Alert.alert(
          "Aucun code-barres trouvé",
          "La photo ne contient pas de code-barres lisible.\n\nConseils :\n• Photo nette et bien éclairée\n• Code-barres entier visible\n• Évitez les reflets",
          [{ text: "OK" }],
        );
      }
    } catch {
      loadingRef.current = false;
      setLoading(false);
      Alert.alert("Erreur galerie", "Impossible de lire cette image.");
    }
  }, [processBarcode]);

  const dismiss = useCallback(() => {
    setScanResult(null); lastBarcode.current = null; cooldown.current = false;
  }, []);

  const handleManualSubmit = useCallback(() => {
    const code = manualCode.trim();
    if (!BARCODE_RE.test(code)) {
      Alert.alert("Code invalide", "Saisissez un code-barres valide (chiffres ou lettres).");
      return;
    }
    Keyboard.dismiss();
    setManualCode("");
    cooldown.current = false;
    lastBarcode.current = null;
    processBarcode(code);
  }, [manualCode, processBarcode]);

  const onWhitelist = useCallback(() => {
    if (!scanResult) return;
    whitelistProduct(scanResult.barcode);
    setScanResult(p => p ? { ...p, result: "halal" } : null);
  }, [scanResult, whitelistProduct]);

  const toggleScan = useCallback(() => {
    if (loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    btnScale.value = withSequence(
      withTiming(0.96, { duration: 75 }),
      withSpring(1, { damping: 14 }),
    );
    setScanning(v => {
      const next = !v;
      scanningRef.current = next;
      if (!next) { lastBarcode.current = null; cooldown.current = false; }
      return next;
    });
  }, [loading]);

  // ── Permission loading ─────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </View>
    );
  }

  const cameraGranted = permission.granted;

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── OFFLINE BANNER (top, before header) ── */}
      {(!isOnline || pendingBarcodes.length > 0) && (
        <Animated.View style={[styles.offlineBanner, { paddingTop: topPad + 6 }, offlineStyle]}>
          <View style={[styles.offlineDot, { backgroundColor: isOnline ? C.gold : C.warning }]} />
          <Text style={[styles.offlineLabel, { color: isOnline ? C.gold : C.warning }]}>
            {isOnline
              ? `Synchronisation — ${pendingBarcodes.length} scan(s) en attente`
              : `Hors ligne — ${pendingBarcodes.length} scan(s) en attente`}
          </Text>
          {isOnline && (
            <Pressable onPress={processPendingQueue} hitSlop={12}>
              <Text style={[styles.offlineSync, { color: C.gold }]}>↻</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* ── HEADER ── */}
      <View style={[
        styles.header,
        { paddingTop: (!isOnline || pendingBarcodes.length > 0) ? 10 : topPad + 10 },
      ]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkTxt}>HS</Text>
          </View>
          <View>
            <Text style={styles.brandName}>
              <Text style={{ color: C.halalLight }}>Halal</Text>
              <Text style={{ color: C.gold }}>Scan</Text>
            </Text>
            <Text style={styles.brandSub}>حلال · Vérification alimentaire</Text>
          </View>
        </View>
        <View style={styles.headerBtns}>
          <NavBtn emoji="⚙️" onPress={() => router.push("/settings")} />
          <NavBtn emoji="📋" onPress={() => router.push("/history")} badge={histCount} />
        </View>
      </View>

      {/* ── CAMERA AREA (flex: 1) ── */}
      <View style={styles.cameraArea}>
        {cameraGranted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13","ean8","upc_a","upc_e","code128","code39","qr"],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          /* No camera permission — show neutral placeholder */
          <View style={styles.noCamBg} />
        )}

        {/* subtle dark vignette */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={["rgba(6,13,9,0.72)", "transparent"]}
            style={{ height: "30%" }}
          />
          <View style={{ flex: 1 }} />
          <LinearGradient
            colors={["transparent", "rgba(6,13,9,0.55)"]}
            style={{ height: "20%" }}
          />
        </View>
        <LinearGradient
          colors={["rgba(6,13,9,0.55)", "transparent", "rgba(6,13,9,0.55)"]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Scan frame — centered in camera area */}
        <View style={styles.frameWrap} pointerEvents="none">
          {cameraGranted ? (
            <View style={{ width: FRAME_W, height: FRAME_H }}>
              <View style={[styles.frameBorder, { opacity: scanning ? 0.35 : 0.15 }]} />
              <Animated.View style={[StyleSheet.absoluteFill, cornerStyle]} pointerEvents="none">
                <View style={[styles.corner, styles.cTL]} />
                <View style={[styles.corner, styles.cTR]} />
                <View style={[styles.corner, styles.cBL]} />
                <View style={[styles.corner, styles.cBR]} />
              </Animated.View>
              <View style={styles.centerDot} />
              <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0 }, lineStyle]} pointerEvents="none">
                <LinearGradient
                  colors={["transparent", C.gold, C.goldLight, C.gold, "transparent"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.scanLine}
                />
              </Animated.View>
            </View>
          ) : (
            <View style={styles.noCamMsg}>
              <Text style={styles.noCamIcon}>🔒</Text>
              <Text style={styles.noCamTxt}>Caméra non autorisée</Text>
              <Text style={styles.noCamSub}>Utilisez la galerie ou la saisie manuelle ci-dessous</Text>
              <Pressable
                onPress={requestPermission}
                style={({ pressed }) => [styles.noCamBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.noCamBtnTxt}>📷  Autoriser la caméra</Text>
              </Pressable>
            </View>
          )}

          {cameraGranted && (
            <Text style={styles.frameStatus}>
              {scanning
                ? "🟢  Scan actif — approchez le code-barres"
                : "Pointez la caméra vers le code-barres"}
            </Text>
          )}
        </View>
      </View>

      {/* ── BOTTOM PANEL (solid background — clearly separate) ── */}
      <View style={[styles.bottomPanel, { paddingBottom: botPad + 16 }]}>
        {loading ? (
          /* Loading state */
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={styles.loadingTxt}>Analyse en cours…</Text>
            <Text style={styles.loadingSub}>Interrogation de la base de données</Text>
          </View>
        ) : (
          <>
            {/* Main CTA — only show camera scan button when camera is granted */}
            {cameraGranted && (
              <Animated.View style={[{ width: "100%" }, btnStyle]}>
                <Pressable
                  onPress={toggleScan}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  style={({ pressed }) => [styles.mainBtn, { opacity: pressed ? 0.9 : 1 }]}
                >
                  <LinearGradient
                    colors={scanning
                      ? ["#C83020", "#9A1E10", "#6E0E08"]
                      : [C.goldLight, C.gold, "#A07828"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.mainBtnGrad}
                  >
                    <Text style={styles.mainBtnIcon}>{scanning ? "⏹" : "📷"}</Text>
                    <Text style={styles.mainBtnTxt}>
                      {scanning ? "ARRÊTER LE SCAN" : "SCANNER UN PRODUIT"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Secondary row: Flash (if camera) + Gallery (always) */}
            <View style={styles.secondaryRow}>
              {cameraGranted && (
                <>
                  <Pressable
                    onPress={() => setTorch(v => !v)}
                    android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false }}
                    style={({ pressed }) => [
                      styles.secBtn,
                      torch && styles.secBtnActive,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.secBtnEmoji}>🔦</Text>
                    <Text style={[styles.secBtnTxt, torch && { color: C.gold }]}>
                      {torch ? "Flash ON" : "Flash"}
                    </Text>
                  </Pressable>
                  <View style={styles.secDivider} />
                </>
              )}

              <Pressable
                onPress={pickFromGallery}
                android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false }}
                style={({ pressed }) => [styles.secBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.secBtnEmoji}>🖼</Text>
                <Text style={styles.secBtnTxt}>Galerie</Text>
              </Pressable>
            </View>

            {/* Manual barcode entry */}
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Saisir un code-barres manuellement"
                placeholderTextColor="rgba(255,255,255,0.28)"
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleManualSubmit}
              />
              <Pressable
                onPress={handleManualSubmit}
                style={({ pressed }) => [styles.manualBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.manualBtnTxt}>OK</Text>
              </Pressable>
            </View>

            {/* Trust line */}
            <View style={styles.trustRow}>
              <View style={styles.trustDot} />
              <Text style={styles.trustTxt}>
                Open Food Facts · +2 000 000 produits analysés
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Result overlay */}
      {scanResult && (
        <ResultOverlay
          result={scanResult.result}
          productName={scanResult.productName}
          barcode={scanResult.barcode}
          reason={scanResult.reason}
          ingredientsText={scanResult.ingredientsText}
          ingredientsList={scanResult.ingredientsList}
          isOfflineQueued={scanResult.isOfflineQueued}
          onDismiss={dismiss}
          onWhitelist={onWhitelist}
          isWhitelisted={isWhitelisted(scanResult.barcode)}
        />
      )}
    </View>
  );
}

function NavBtn({ emoji, onPress, badge }: { emoji: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: true, radius: 24 }}
      style={styles.navBtn}
    >
      <Text style={styles.navBtnEmoji}>{emoji}</Text>
      {!!badge && badge > 0 && (
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeTxt}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  // offline
  offlineBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: "rgba(17,8,0,0.90)",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(232,146,26,0.3)",
  },
  offlineDot: { width: 7, height: 7, borderRadius: 4 },
  offlineLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  offlineSync: { fontSize: 20, fontWeight: "700" },

  // header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: "rgba(6,13,9,0.88)",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: "rgba(26,175,90,0.18)",
    borderWidth: 1, borderColor: "rgba(26,175,90,0.38)",
    alignItems: "center", justifyContent: "center",
  },
  brandMarkTxt: { fontSize: 13, fontWeight: "900", color: C.halalLight, letterSpacing: 0.3 },
  brandName: { fontSize: 24, fontWeight: "900", lineHeight: 28 },
  brandSub: { fontSize: 10.5, color: C.textMuted, fontWeight: "500", marginTop: 1 },
  headerBtns: { flexDirection: "row", gap: 6 },
  navBtn: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  navBtnEmoji: { fontSize: 22 },
  navBadge: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: C.haram, borderRadius: 8,
    minWidth: 17, height: 17,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  navBadgeTxt: { fontSize: 9, fontWeight: "900", color: "#FFF" },

  // camera area
  cameraArea: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  frameWrap: {
    position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
    alignItems: "center", justifyContent: "center", gap: 16,
    pointerEvents: "none",
  } as unknown as object,
  frameBorder: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: C.gold, borderRadius: 8,
  },
  corner: {
    position: "absolute",
    width: CORNER, height: CORNER,
    borderColor: C.gold, borderWidth: CT,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8,
  },
  cTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 7 },
  cTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 7 },
  cBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 7 },
  cBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 7 },
  centerDot: {
    position: "absolute",
    top: "50%", left: "50%",
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: "rgba(200,150,60,0.45)",
    transform: [{ translateX: -2.5 }, { translateY: -2.5 }],
  },
  scanLine: {
    height: 2.5, borderRadius: 1.5,
    shadowColor: C.gold, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  frameStatus: {
    fontSize: 14, color: "rgba(255,255,255,0.55)",
    fontWeight: "600", textAlign: "center", letterSpacing: 0.3,
  },

  // bottom panel
  bottomPanel: {
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: C.border,
    paddingHorizontal: 20, paddingTop: 20, gap: 14,
    alignItems: "center",
  },
  loadingBox: { alignItems: "center", paddingVertical: 26, gap: 12 },
  loadingTxt: { fontSize: 18, fontWeight: "900", color: C.gold, letterSpacing: 2 },
  loadingSub: { fontSize: 13, color: C.textMuted, fontWeight: "500" },

  mainBtn: {
    width: "100%", borderRadius: 20, overflow: "hidden",
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 20,
    elevation: 10,
  },
  mainBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 22, gap: 12, borderRadius: 20,
  },
  mainBtnIcon: { fontSize: 30 },
  mainBtnTxt: { fontSize: 21, fontWeight: "900", color: C.bg, letterSpacing: 1 },

  secondaryRow: {
    flexDirection: "row", alignItems: "center",
    width: "100%", gap: 0,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    borderRadius: 16, overflow: "hidden",
  },
  secBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14,
    backgroundColor: C.surfaceHigh,
  },
  secBtnActive: { backgroundColor: "rgba(200,150,60,0.12)" },
  secDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: C.border },
  secBtnEmoji: { fontSize: 20 },
  secBtnTxt: { fontSize: 15, fontWeight: "700", color: C.textSub },

  trustRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustDot: { width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: C.halalLight },
  trustTxt: { fontSize: 11, color: C.textMuted, fontWeight: "500", textAlign: "center" },

  // no-camera state
  noCamBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#05100A" } as object,
  noCamMsg: { alignItems: "center", gap: 12, paddingHorizontal: 32 },
  noCamIcon: { fontSize: 52 },
  noCamTxt: { fontSize: 20, fontWeight: "800", color: "rgba(255,255,255,0.55)", textAlign: "center" },
  noCamSub: { fontSize: 14, color: "rgba(255,255,255,0.32)", textAlign: "center", lineHeight: 22 },
  noCamBtn: {
    marginTop: 6, borderRadius: 14, overflow: "hidden",
    backgroundColor: "rgba(200,150,60,0.18)",
    borderWidth: 1, borderColor: "rgba(200,150,60,0.35)",
    paddingVertical: 12, paddingHorizontal: 24,
  },
  noCamBtnTxt: { fontSize: 15, fontWeight: "700", color: C.gold },

  // manual barcode entry
  manualRow: {
    flexDirection: "row", width: "100%", gap: 10, alignItems: "center",
  },
  manualInput: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    paddingHorizontal: 16, fontSize: 15,
    color: C.text,
  },
  manualBtn: {
    height: 50, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: "rgba(200,150,60,0.20)",
    borderWidth: 1, borderColor: "rgba(200,150,60,0.40)",
    alignItems: "center", justifyContent: "center",
  },
  manualBtnTxt: { fontSize: 15, fontWeight: "800", color: C.gold },
});
