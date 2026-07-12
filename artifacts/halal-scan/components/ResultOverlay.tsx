import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";
import type { ScanResult } from "@/context/ScanContext";

const { height: SH } = Dimensions.get("window");
const DISMISS_SEC = 18;

interface Props {
  result: ScanResult; productName: string; barcode: string;
  reason?: string; ingredientsText?: string; ingredientsList?: string[];
  isOfflineQueued?: boolean;
  source?: "internal_db" | "openfoodfacts" | "unknown" | "ai";
  onDismiss: () => void; onWhitelist: () => void; isWhitelisted: boolean;
}

interface Theme {
  gradients: [string, string, string];
  accent: string; accentBg: string; accentBorder: string;
  icon: string; verdict: string; speech: string;
  btnColors: [string, string, string];
}

const THEMES: Record<string, Theme> = {
  halal: {
    gradients: ["#020D06", "#041208", "#02080404"],
    accent: C.halalLight, accentBg: "rgba(26,175,90,0.10)", accentBorder: "rgba(34,204,106,0.25)",
    icon: "✅", verdict: "HALAL",
    speech: "Ce produit est halal. Vous pouvez le consommer.",
    btnColors: ["#1A9A50", "#137A3E", "#0C5C2E"],
  },
  haram: {
    gradients: ["#0D0202", "#160304", "#090202"],
    accent: C.haramLight, accentBg: "rgba(220,53,69,0.10)", accentBorder: "rgba(240,64,85,0.25)",
    icon: "❌", verdict: "NON HALAL",
    speech: "Attention ! Ce produit contient un ingrédient interdit. Ne le consommez pas.",
    btnColors: ["#C82030", "#A01828", "#781018"],
  },
  warning: {
    gradients: ["#0C0500", "#160900", "#090400"],
    accent: C.warningLight, accentBg: "rgba(232,146,26,0.10)", accentBorder: "rgba(245,168,58,0.25)",
    icon: "⚠️", verdict: "À VÉRIFIER",
    speech: "Attention, vérification recommandée pour ce produit.",
    btnColors: ["#D08000", "#A86400", "#804C00"],
  },
  unknown: {
    gradients: ["#060A07", "#0A0F0B", "#050806"],
    accent: C.textSub, accentBg: "rgba(154,181,165,0.08)", accentBorder: "rgba(154,181,165,0.18)",
    icon: "❓", verdict: "INCONNU",
    speech: "Ce produit n'a pas pu être analysé.",
    btnColors: ["#3A5C44", "#2C4434", "#1E2E24"],
  },
};

const SOURCE_LABELS: Record<string, string> = {
  internal_db: "📁  Base interne",
  openfoodfacts: "🌐  OpenFoodFacts",
  unknown: "❓  Inconnu",
};

export default function ResultOverlay({
  result, productName, barcode, reason, ingredientsText, ingredientsList,
  isOfflineQueued, source, onDismiss, onWhitelist, isWhitelisted,
}: Props) {
  const insets = useSafeAreaInsets();
  const key = isOfflineQueued ? "unknown" : result;
  const t = THEMES[key] ?? THEMES.unknown;

  const [cd, setCd] = useState(DISMISS_SEC);
  const [showIng, setShowIng] = useState(false);
  const dismissed = useRef(false);
  const cdRef = useRef(DISMISS_SEC);

  const ingList = ingredientsList?.length
    ? ingredientsList
    : (ingredientsText ?? "").split(/[,;]\s*/).map(s => s.trim()).filter(Boolean);
  const hasIng = !isOfflineQueued && ingList.length > 0;

  // Animations
  const overlay = useSharedValue(0);
  const sheet = useSharedValue(SH * 0.15);
  const badge = useSharedValue(0.4);
  const badgeA = useSharedValue(0);

  useEffect(() => {
    overlay.value = withTiming(1, { duration: 280 });
    sheet.value = withSpring(0, { damping: 28, stiffness: 200 });
    badge.value = withDelay(220, withSpring(1, { damping: 14, stiffness: 180 }));
    badgeA.value = withDelay(220, withTiming(1, { duration: 240 }));
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value, transform: [{ translateY: sheet.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: badge.value }], opacity: badgeA.value }));

  // Haptics
  useEffect(() => {
    if (!isOfflineQueued && Platform.OS !== "web") {
      setTimeout(() => {
        if (result === "halal") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (result === "haram") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 550);
        } else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 250);
    }
  }, []);

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      cdRef.current--;
      setCd(cdRef.current);
      if (cdRef.current <= 0) { clearInterval(id); dismiss(); }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    overlay.value = withTiming(0, { duration: 240 }, (done) => { if (done) runOnJS(onDismiss)(); });
  };

  const progress = Math.min(100, ((DISMISS_SEC - cd) / DISMISS_SEC) * 100);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.root, overlayStyle]}>
      {/* Background gradient */}
      <LinearGradient colors={t.gradients} style={StyleSheet.absoluteFill} />

      {/* Subtle texture overlay */}
      <View style={[StyleSheet.absoluteFill, styles.textureOverlay]} pointerEvents="none" />

      {/* Tap anywhere to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />

      {/* Progress bar */}
      <View style={[styles.progressTrack, { marginTop: topPad }]}>
        <View style={[styles.progressFill, { width: `${progress}%` as `${number}%`, backgroundColor: t.accent }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad + 12 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hint */}
        <Text style={styles.tapHint}>Appuyez n'importe où · ferme dans {cd}s</Text>

        {/* ── VERDICT BADGE ── */}
        <Animated.View style={[styles.badgeWrap, badgeStyle]}>
          <View style={[styles.badgeOuter, { borderColor: t.accentBorder }]}>
            <View style={[styles.badgeInner, { backgroundColor: t.accentBg, borderColor: t.accent + "40" }]}>
              <Text style={styles.badgeIcon}>{isOfflineQueued ? "📡" : t.icon}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── VERDICT TEXT ── */}
        <Text style={[styles.verdict, { color: t.accent }]}>
          {isOfflineQueued ? "EN ATTENTE" : t.verdict}
        </Text>
        <View style={[styles.verdictUnderline, { backgroundColor: t.accent }]} />

        {/* ── PRODUCT CARD ── */}
        {!!productName && (
          <View style={[styles.productCard, { borderColor: t.accentBorder, backgroundColor: t.accentBg }]}>
            <Text style={styles.productName} numberOfLines={3}>{productName}</Text>
            <View style={styles.barcodeRow}>
              <View style={[styles.barcodePill, { borderColor: t.accentBorder }]}>
                <Text style={[styles.barcodeNum, { color: t.accent }]}>{barcode}</Text>
              </View>
              {!!source && (
                <View style={[styles.sourcePill, { borderColor: t.accentBorder, backgroundColor: t.accentBg }]}>
                  <Text style={[styles.sourceTxt, { color: t.accent }]}>{SOURCE_LABELS[source] ?? source}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── REASON CARD ── */}
        {!!reason && (
          <View style={[styles.reasonCard, { borderLeftColor: t.accent }]}>
            <Text style={[styles.reasonBadge, { color: t.accent, borderColor: t.accentBorder, backgroundColor: t.accentBg }]}>
              {isOfflineQueued ? "HORS LIGNE" : result === "halal" ? "✓ CONFORME" : result === "haram" ? "✕ INTERDIT" : "! ATTENTION"}
            </Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        {/* ── INGREDIENTS ── */}
        {hasIng && (
          <Pressable
            style={[styles.ingToggle, { borderColor: "rgba(255,255,255,0.1)" }]}
            onPress={() => setShowIng(v => !v)}
          >
            <Text style={styles.ingToggleTxt}>🧪  Ingrédients analysés ({ingList.length})</Text>
            <Text style={[styles.ingChevron, { color: t.accent }]}>{showIng ? "▲" : "▼"}</Text>
          </Pressable>
        )}

        {showIng && (
          <View style={[styles.ingBox, { borderColor: "rgba(255,255,255,0.07)" }]}>
            {ingList.slice(0, 60).map((ing, i) => (
              <View key={i} style={styles.ingRow}>
                <View style={[styles.ingDot, { backgroundColor: t.accent }]} />
                <Text style={styles.ingTxt} numberOfLines={2}>{ing}</Text>
              </View>
            ))}
            {ingList.length > 60 && (
              <Text style={styles.ingMore}>+{ingList.length - 60} autres</Text>
            )}
          </View>
        )}

        {/* ── ACTIONS ── */}
        <View style={styles.actions}>
          {isWhitelisted && (
            <View style={[styles.actionSec, { borderColor: "rgba(26,175,90,0.35)" }]}>
              <Text style={[styles.actionSecTxt, { color: C.halalLight }]}>✓  Dans votre liste approuvée</Text>
            </View>
          )}
        </View>

        {/* ── MAIN CTA ── */}
        <Pressable
          onPress={dismiss}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          style={({ pressed }) => [styles.ctaWrap, { opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient colors={t.btnColors} style={styles.ctaBtn}>
            <Text style={styles.ctaTxt}>📷  SCANNER UN AUTRE PRODUIT</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100 },
  textureOverlay: {
    backgroundImage: undefined,
    opacity: 0.015,
  },

  progressTrack: {
    position: "absolute", left: 0, right: 0, top: 0, height: 2.5,
    backgroundColor: "rgba(255,255,255,0.06)", zIndex: 10,
  },
  progressFill: { height: 2.5, borderRadius: 1.5 },

  scroll: {
    alignItems: "center", paddingHorizontal: 24, gap: 16, flexGrow: 1,
  },
  tapHint: { fontSize: 13, color: "rgba(255,255,255,0.30)", fontWeight: "400", textAlign: "center" },

  // badge
  badgeWrap: { alignItems: "center", justifyContent: "center" },
  badgeOuter: {
    width: 168, height: 168, borderRadius: 84,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  badgeInner: {
    width: 136, height: 136, borderRadius: 68,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  badgeIcon: { fontSize: 76, textAlign: "center", lineHeight: 92 },

  // verdict
  verdict: { fontSize: 40, fontWeight: "900", letterSpacing: 2.5, textAlign: "center" },
  verdictUnderline: { width: 50, height: 3, borderRadius: 2, marginTop: -6 },

  // product card
  productCard: {
    width: "100%", borderWidth: 1, borderRadius: 18,
    padding: 18, gap: 10,
  },
  productName: { fontSize: 22, fontWeight: "700", color: C.text, lineHeight: 30, textAlign: "center" },
  barcodeRow: { alignItems: "center", gap: 8, flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  barcodePill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  barcodeNum: { fontSize: 13, fontWeight: "600", letterSpacing: 2.5 },
  sourcePill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  sourceTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

  // reason
  reasonCard: {
    width: "100%", borderLeftWidth: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12, padding: 16, gap: 8,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
  },
  reasonBadge: {
    fontSize: 10, fontWeight: "900", letterSpacing: 1.5,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-start",
  },
  reasonText: { fontSize: 16, color: "rgba(255,255,255,0.82)", lineHeight: 24, fontWeight: "500" },

  // ingredients
  ingToggle: {
    width: "100%", borderWidth: 1, borderRadius: 14,
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
  },
  ingToggleTxt: { flex: 1, fontSize: 16, color: "rgba(255,255,255,0.75)", fontWeight: "600" },
  ingChevron: { fontSize: 11, fontWeight: "700" },
  ingBox: {
    width: "100%", borderWidth: 1, borderRadius: 14,
    padding: 14, gap: 7,
  },
  ingRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  ingDot: { width: 5, height: 5, borderRadius: 3, marginTop: 9, flexShrink: 0 },
  ingTxt: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.50)", lineHeight: 20 },
  ingMore: { fontSize: 12, color: "rgba(255,255,255,0.30)", textAlign: "center", fontWeight: "600", marginTop: 4 },

  // actions
  actions: { width: "100%", gap: 8 },
  actionSec: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 18,
    width: "100%", alignItems: "center",
  },
  actionSecTxt: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.72)", textAlign: "center" },

  // CTA
  ctaWrap: {
    width: "100%", borderRadius: 18, overflow: "hidden", marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 14,
    elevation: 12,
  },
  ctaBtn: { paddingVertical: 22, alignItems: "center" },
  ctaTxt: { fontSize: 18, fontWeight: "900", color: "#FFF", letterSpacing: 0.8 },

});
