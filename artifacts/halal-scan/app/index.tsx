import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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
import { SPIFooter } from "@/components/SPIFooter";
import C from "@/constants/colors";
import { applyIngredientOverrides, type ScanResult, useScanContext } from "@/context/ScanContext";
import type { Product } from "@/lib/db";

const { width: W } = Dimensions.get("window");
const FRAME_W = Math.min(W * 0.82, 300);
const FRAME_H = 172;
const CORNER = 38;
const CT = 4;

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
if (!process.env.EXPO_PUBLIC_DOMAIN) {
  console.error("[HalalScan] ⚠️ EXPO_PUBLIC_DOMAIN manquant — les requêtes API échoueront");
}
console.log("[HalalScan] EXPO_PUBLIC_DOMAIN =", process.env.EXPO_PUBLIC_DOMAIN ?? "(undefined)");
console.log("[HalalScan] API_BASE =", API_BASE);

interface ScanState {
  result: ScanResult; productName: string; barcode: string;
  reason?: string; ingredientsText?: string; ingredientsList?: string[];
  isOfflineQueued?: boolean;
  source?: "internal_db" | "openfoodfacts" | "unknown" | "ai";
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
  const [manualError, setManualError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const lastBarcode = useRef<string | null>(null);
  const cooldown = useRef(false);
  const loadingRef = useRef(false);
  const scanningRef = useRef(false);
  const autoStartedRef = useRef(false);
  const cameraViewRef = useRef<CameraView>(null);
  const {
    addProduct, queueOfflineScan, whitelistProduct,
    getProduct, isWhitelisted, isOnline, pendingBarcodes,
    processPendingQueue, products, soundEnabled, setSoundEnabled,
    customIngredients, alwaysHalalIngredients,
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

  // Request camera permission automatically on first load (web + native)
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.status]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const customIngredientsRef = useRef(customIngredients);
  useEffect(() => { customIngredientsRef.current = customIngredients; }, [customIngredients]);

  const alwaysHalalRef = useRef(alwaysHalalIngredients);
  useEffect(() => { alwaysHalalRef.current = alwaysHalalIngredients; }, [alwaysHalalIngredients]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const processBarcode = useCallback(async (barcode: string) => {
    if (cooldown.current || loadingRef.current || lastBarcode.current === barcode) return;
    cooldown.current = true;
    lastBarcode.current = barcode;
    scanningRef.current = false;
    setScanning(false);
    setTorch(false);
    loadingRef.current = true;
    setLoading(true);
    if (Platform.OS !== "web" && soundEnabledRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const cached = getProduct(barcode);
    if (cached && !pendingBarcodes.includes(barcode)) {
      loadingRef.current = false; setLoading(false);
      // Always recompute from the RAW server result against the user's CURRENT ingredient
      // lists — a cached product must never display a stale override from before the user
      // added/removed a custom or always-halal ingredient.
      const { result: recomputedResult, reason: recomputedReason } = applyIngredientOverrides(
        cached.rawResult ?? cached.result,
        cached.rawReason ?? cached.reason,
        cached.ingredientsText,
        cached.ingredientsList,
        customIngredientsRef.current,
        alwaysHalalRef.current,
      );
      if (recomputedResult !== cached.result || recomputedReason !== cached.reason) {
        const updated: Product = {
          ...cached,
          rawResult: cached.rawResult ?? cached.result,
          rawReason: cached.rawReason ?? cached.reason,
          result: recomputedResult,
          reason: recomputedReason,
        };
        await addProduct(updated);
      }
      setScanResult({
        result: isWhitelisted(barcode) ? "halal" : recomputedResult,
        productName: cached.productName, barcode,
        reason: recomputedReason, ingredientsText: cached.ingredientsText,
        ingredientsList: cached.ingredientsList,
        source: cached.source,
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
      const requestUrl = `${API_BASE}/api/halal/analyze/${barcode}`;
      console.log("[HalalScan] Request URL =", requestUrl);

      const ctrl = new AbortController();
      const tId = setTimeout(() => ctrl.abort(), 15_000);
      let res: Response;
      try {
        res = await fetch(requestUrl, { signal: ctrl.signal });
      } finally {
        clearTimeout(tId);
      }
      console.log(`[HalalScan] HTTP ${res.status} ← /api/halal/analyze/${barcode}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        result: ScanResult; productName: string; reason?: string;
        ingredientsText?: string; ingredientsList?: string[];
        source?: "internal_db" | "openfoodfacts" | "ai" | "unknown";
      };
      console.log(`[HalalScan] Response: result=${json.result} name="${json.productName}" source=${json.source} foundInDb=${(json as Record<string,unknown>).foundInDatabase}`);

      const { result: finalResult, reason: finalReason } = applyIngredientOverrides(
        json.result,
        json.reason,
        json.ingredientsText,
        json.ingredientsList,
        customIngredientsRef.current,
        alwaysHalalRef.current,
      );

      const product: Product = {
        barcode, result: finalResult, productName: json.productName, timestamp: Date.now(),
        reason: finalReason, ingredientsText: json.ingredientsText,
        ingredientsList: json.ingredientsList, isWhitelisted: false,
        source: json.source,
        rawResult: json.result, rawReason: json.reason,
      };
      await addProduct(product);
      setScanResult({
        result: isWhitelisted(barcode) ? "halal" : finalResult,
        productName: json.productName, barcode, reason: finalReason,
        ingredientsText: json.ingredientsText, ingredientsList: json.ingredientsList,
        source: json.source,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isAbort  = err instanceof Error && err.name === "AbortError";
      const isNetwork = err instanceof TypeError; // "Failed to fetch" / réseau inaccessible
      const isHttpErr = !isAbort && !isNetwork;   // throw new Error(`HTTP ${status}`)

      console.error(`[HalalScan] Erreur fetch barcode=${barcode} type=${isAbort ? "timeout" : isNetwork ? "network" : "http"} msg=${errMsg}`);

      if (isHttpErr) {
        // Le serveur est joignable mais a renvoyé une erreur (5xx, etc.)
        setScanResult({
          result: "unknown",
          productName: "Erreur serveur",
          barcode,
          reason: `Le serveur a retourné une erreur (${errMsg}). Réessayez dans quelques instants.`,
        });
      } else {
        // Timeout ou panne réseau → file d'attente offline
        await queueOfflineScan(barcode);
        setScanResult({
          result: "unknown",
          productName: isAbort ? "Délai dépassé" : "Connexion impossible",
          barcode,
          reason: isAbort
            ? "La requête a expiré. Analysé automatiquement dès le retour de la connexion."
            : "Impossible de joindre le serveur. Analysé automatiquement dès le retour de la connexion.",
          isOfflineQueued: true,
        });
      }
    } finally { loadingRef.current = false; setLoading(false); }
  }, [getProduct, isWhitelisted, addProduct, queueOfflineScan, isOnline, pendingBarcodes]);

  // ── Stable camera callback — CameraView gets the same function ref every render ──
  // This prevents the native barcode scanner from resetting when component state changes.
  const latestBarcodeHandler = useRef<(e: { data: string }) => void>(() => {});
  latestBarcodeHandler.current = useCallback(({ data }: { data: string }) => {
    if (!scanningRef.current) return;
    processBarcode(data);
  }, [processBarcode]);

  const stableOnBarcodeScanned = useMemo(
    () => (e: { data: string }) => latestBarcodeHandler.current(e),
    [],
  );

  // ── Scan barcode from a static image URI (gallery / web capture) ─────────
  const tryScanFromImage = useCallback(async (uri: string): Promise<void> => {
    try {
      const codes = await Camera.scanFromURLAsync(uri, [
        "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr",
      ]);
      if (codes[0]?.data) {
        loadingRef.current = false;
        setLoading(false);
        cooldown.current = false;
        lastBarcode.current = null;
        await processBarcode(codes[0].data);
        return;
      }
    } catch (err) {
      console.warn("[HalalScan] Camera.scanFromURLAsync error:", err instanceof Error ? err.message : String(err));
      /* scan API failed — fall through to "no barcode" message */
    }
    // No barcode found in image
    loadingRef.current = false;
    setLoading(false);
    Alert.alert(
      "Aucun code-barres détecté",
      "Impossible de lire un code-barres dans cette image.\n\nConseils :\n• Assurez-vous que le code-barres est net et bien éclairé\n• Évitez les reflets et le flou\n• Essayez de scanner directement avec la caméra",
    );
  }, [processBarcode]);

  // ── Web: capture depuis CameraView → scan code-barres ────────────────────
  const handleWebCaptureScan = useCallback(async () => {
    if (loadingRef.current) return;

    // ── Priorité 1 : BarcodeDetector API (Chrome 83+, Edge 83+) ──
    // Detects barcodes directly from the live video stream — no snapshot needed.
    const video = Platform.OS === "web"
      ? (document.querySelector("video") as HTMLVideoElement | null)
      : null;

    if (video && "BarcodeDetector" in window) {
      try {
        loadingRef.current = true;
        setLoading(true);
        // @ts-ignore — BarcodeDetector is not yet in TS DOM types
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        const codes: Array<{ rawValue: string }> = await detector.detect(video);
        loadingRef.current = false;
        setLoading(false);
        if (codes[0]?.rawValue) {
          cooldown.current = false;
          lastBarcode.current = null;
          await processBarcode(codes[0].rawValue);
          return;
        }
        // No barcode detected from live frame — fall through to canvas capture
      } catch {
        loadingRef.current = false;
        setLoading(false);
      }
    }

    // ── Priorité 2 : Canvas snapshot → Camera.scanFromURLAsync ──
    // Works when BarcodeDetector is unavailable (Firefox, Safari).
    if (video && video.readyState >= 2) {
      try {
        loadingRef.current = true;
        setLoading(true);
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          loadingRef.current = false;
          setLoading(false);
          await tryScanFromImage(dataUrl);
          return;
        }
        loadingRef.current = false;
        setLoading(false);
      } catch {
        loadingRef.current = false;
        setLoading(false);
      }
    }

    // ── Priorité 3 : Sélection de fichier (universel) ──
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Ouvre la caméra sur mobile
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      loadingRef.current = true;
      setLoading(true);
      const url = URL.createObjectURL(file);
      await tryScanFromImage(url);
      URL.revokeObjectURL(url);
    };
    input.click();
  }, [tryScanFromImage, processBarcode]);

  // ── Galerie photo (toutes plateformes) → scan code-barres ────────────────
  const pickFromGallery = useCallback(async () => {
    if (loadingRef.current) return;

    // Web : sélection de fichier
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        loadingRef.current = true;
        setLoading(true);
        const url = URL.createObjectURL(file);
        await tryScanFromImage(url);
        URL.revokeObjectURL(url);
      };
      input.click();
      return;
    }

    // Native (iOS + Android) : demande permission galerie, puis ImagePicker
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Accès refusé",
          "L'accès à la galerie photo est requis.\nActivez-le dans les réglages de votre appareil.",
        );
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.85,
        allowsEditing: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      // Use the URI as-is — ImagePicker already gives a valid scheme (file:// on iOS, content:// on Android).
      // Do NOT blindly prepend file:// as it corrupts Android content:// URIs.
      const rawUri = asset.uri;
      const uri = rawUri.includes("://") ? rawUri : `file://${rawUri}`;

      loadingRef.current = true;
      setLoading(true);
      // Try barcode on all platforms (iOS and Android)
      await tryScanFromImage(uri);
    } catch (err) {
      loadingRef.current = false;
      setLoading(false);
      console.warn("[HalalScan] Gallery error:", err instanceof Error ? err.message : String(err));
      Alert.alert("Erreur galerie", "Impossible de lire cette image.");
    }
  }, [tryScanFromImage]);

  const dismiss = useCallback(() => {
    setScanResult(null);
    lastBarcode.current = null;
    cooldown.current = false;
    autoStartedRef.current = false;
  }, []);


  const handleManualSubmit = useCallback(() => {
    const code = manualCode.trim();
    if (!code) {
      setManualError("Saisissez un code-barres avant de valider.");
      return;
    }
    if (!BARCODE_RE.test(code)) {
      setManualError("Format invalide — chiffres, lettres et tirets uniquement.");
      return;
    }
    setManualError("");
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
    if (Platform.OS !== "web" && soundEnabledRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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

      {/* ── OFFLINE BANNER ── */}
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
            <Text style={styles.brandSub}>حلال · Vérification alimentaire · <Text style={{ color: C.gold }}>v1.2.07</Text></Text>
          </View>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={12} style={styles.hamburgerBtn}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </Pressable>
      </View>

      {/* ── CAMERA AREA ── */}
      <View style={styles.cameraArea}>
        {cameraGranted ? (
          <CameraView
            ref={cameraViewRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13","ean8","upc_a","upc_e","code128","code39","qr"],
            }}
            onBarcodeScanned={Platform.OS === "web" ? undefined : stableOnBarcodeScanned}
          />
        ) : (
          <View style={styles.noCamBg} />
        )}

        {/* Solid dark mask — only the scan frame window shows the camera */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.scanMaskV, { flex: 1 }]} />
          <View style={{ flexDirection: "row", height: FRAME_H }}>
            <View style={styles.scanMaskH} />
            <View style={{ width: FRAME_W }} />
            <View style={styles.scanMaskH} />
          </View>
          <View style={[styles.scanMaskV, { flex: 1 }]} />
        </View>

        {/* Scan frame */}
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
                ? "● Scan actif — approchez le code-barres"
                : "Pointez la caméra vers le code-barres"}
            </Text>
          )}
        </View>
      </View>

      {/* ── BOTTOM PANEL ── */}
      <View style={[styles.bottomPanel, { paddingBottom: botPad + 16 }]}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={C.gold} />
            <Text style={styles.loadingTxt}>Analyse en cours…</Text>
            <Text style={styles.loadingSub}>Interrogation de la base de données</Text>
          </View>
        ) : (
          <>
            {cameraGranted && (
              <Animated.View style={[{ width: "100%" }, btnStyle]}>
                {Platform.OS === "web" ? (
                  /* Web: single-frame capture button (works in all browsers) */
                  <Pressable
                    onPress={handleWebCaptureScan}
                    android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                    style={({ pressed }) => [styles.mainBtn, { opacity: pressed ? 0.9 : 1 }]}
                  >
                    <LinearGradient
                      colors={[C.goldLight, C.gold, "#A07828"]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.mainBtnGrad}
                    >
                      <Text style={styles.mainBtnIcon}>📸</Text>
                      <Text style={styles.mainBtnTxt}>CAPTURER &amp; ANALYSER</Text>
                    </LinearGradient>
                  </Pressable>
                ) : (
                  /* Mobile: live scan toggle */
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
                )}
              </Animated.View>
            )}

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

            <View style={styles.manualRow}>
              <TextInput
                style={[styles.manualInput, !!manualError && styles.manualInputErr]}
                value={manualCode}
                onChangeText={(t) => { setManualCode(t); if (manualError) setManualError(""); }}
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
            {!!manualError && (
              <Text style={styles.manualErrorTxt}>{manualError}</Text>
            )}

            <View style={styles.trustRow}>
              <View style={styles.trustDot} />
              <Text style={styles.trustTxt}>
                Open Food Facts · +2 000 000 produits analysés
              </Text>
            </View>
          </>
        )}
      </View>

      {/* SPI Footer */}
      <SPIFooter />

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
          source={scanResult.source}
          isWhitelisted={isWhitelisted(scanResult.barcode)}
        />
      )}

      {/* Menu overlay */}
      {menuOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuPanel, { top: topPad + 6, right: 10 }]}>
            <Pressable
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); router.push("/settings"); }}
            >
              <Text style={styles.menuEmoji}>⚙️</Text>
              <Text style={styles.menuTxt}>Paramètres</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => { setMenuOpen(false); router.push("/history"); }}
            >
              <Text style={styles.menuEmoji}>📋</Text>
              <Text style={styles.menuTxt}>Historique</Text>
              {histCount > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeTxt}>{histCount > 99 ? "99+" : histCount}</Text>
                </View>
              )}
            </Pressable>
            <View style={styles.menuDivider} />
            <View style={styles.menuSoundRow}>
              <Text style={styles.menuEmoji}>🔔</Text>
              <Text style={[styles.menuTxt, { flex: 1 }]}>Vibrations</Text>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: "rgba(255,255,255,0.12)", true: C.gold + "80" }}
                thumbColor={soundEnabled ? C.gold : "rgba(255,255,255,0.5)"}
                ios_backgroundColor="rgba(255,255,255,0.12)"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  offlineBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
    backgroundColor: "rgba(17,8,0,0.90)",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(232,146,26,0.3)",
  },
  offlineDot: { width: 7, height: 7, borderRadius: 4 },
  offlineLabel: { flex: 1, fontSize: 12, fontWeight: "600" },
  offlineSync: { fontSize: 18, fontWeight: "700" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: C.gold,
    alignItems: "center", justifyContent: "center",
  },
  brandMarkTxt: { fontSize: 14, fontWeight: "900", color: C.bg },
  brandName: { fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },
  brandSub: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  hamburgerBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  hamburgerIcon: { fontSize: 17, color: C.text, fontWeight: "700" },

  cameraArea: { flex: 1, backgroundColor: "#050D08" },
  noCamBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,13,9,0.95)" },

  // Scan mask — solid dark zones surrounding the scan window
  scanMaskV: { width: "100%", backgroundColor: "rgba(4,10,6,0.88)" },
  scanMaskH: { flex: 1, backgroundColor: "rgba(4,10,6,0.88)" },

  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: C.gold, borderRadius: 12,
  },
  corner: {
    position: "absolute", width: CORNER, height: CORNER,
    borderColor: C.gold,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6,
  },
  cTL: { top: 0, left: 0, borderTopWidth: CT, borderLeftWidth: CT, borderTopLeftRadius: 12 },
  cTR: { top: 0, right: 0, borderTopWidth: CT, borderRightWidth: CT, borderTopRightRadius: 12 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CT, borderLeftWidth: CT, borderBottomLeftRadius: 12 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CT, borderRightWidth: CT, borderBottomRightRadius: 12 },
  centerDot: {
    position: "absolute", width: 5, height: 5, borderRadius: 3,
    backgroundColor: C.gold, opacity: 0.7,
    top: "50%", left: "50%", marginTop: -2.5, marginLeft: -2.5,
  },
  scanLine: { height: 2.5, borderRadius: 2 },
  frameStatus: {
    position: "absolute", bottom: -32,
    fontSize: 12, color: "rgba(255,255,255,0.72)",
    fontWeight: "600", textAlign: "center",
  },
  noCamMsg: { alignItems: "center", gap: 10 },
  noCamIcon: { fontSize: 44 },
  noCamTxt: { fontSize: 18, fontWeight: "800", color: C.text },
  noCamSub: { fontSize: 13, color: C.textSub, textAlign: "center", maxWidth: 260 },
  noCamBtn: {
    marginTop: 8, paddingHorizontal: 22, paddingVertical: 12,
    backgroundColor: C.gold, borderRadius: 12,
  },
  noCamBtnTxt: { fontSize: 15, fontWeight: "700", color: C.bg },

  bottomPanel: {
    backgroundColor: C.surface,
    paddingHorizontal: 16, paddingTop: 18, gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
  },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 12 },
  loadingTxt: { fontSize: 17, fontWeight: "700", color: C.text },
  loadingSub: { fontSize: 13, color: C.textMuted },

  mainBtn: { width: "100%", borderRadius: 14, overflow: "hidden" },
  mainBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 10 },
  mainBtnIcon: { fontSize: 20 },
  mainBtnTxt: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 0.8 },

  secondaryRow: { flexDirection: "row", gap: 0 },
  secBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
  },
  secBtnActive: { borderColor: C.gold + "50", backgroundColor: C.gold + "12" },
  secBtnEmoji: { fontSize: 16 },
  secBtnTxt: { fontSize: 13, fontWeight: "600", color: C.textSub },
  secDivider: { width: 8 },

  manualRow: { flexDirection: "row", gap: 8 },
  manualInput: {
    flex: 1, height: 44, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    paddingHorizontal: 12,
    fontSize: 14, color: C.text,
  },
  manualInputErr: {
    borderColor: "#E85444",
    borderWidth: 1,
    backgroundColor: "rgba(232,84,68,0.08)",
  },
  manualErrorTxt: {
    fontSize: 12, color: "#E85444", fontWeight: "600", marginTop: -4,
  },
  manualBtn: {
    width: 52, height: 44, borderRadius: 10,
    backgroundColor: C.gold, alignItems: "center", justifyContent: "center",
  },
  manualBtnTxt: { fontSize: 14, fontWeight: "800", color: C.bg },

  trustRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  trustDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.halalLight, opacity: 0.7 },
  trustTxt: { fontSize: 11, color: C.textMuted },

  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  menuPanel: {
    position: "absolute",
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    minWidth: 200, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 10,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 13, paddingHorizontal: 16,
  },
  menuEmoji: { fontSize: 18 },
  menuTxt: { fontSize: 15, fontWeight: "600", color: C.text },
  menuBadge: {
    backgroundColor: C.gold, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: "auto",
  },
  menuBadgeTxt: { fontSize: 11, fontWeight: "800", color: C.bg },
  menuDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginHorizontal: 12,
  },
  menuSoundRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
});
