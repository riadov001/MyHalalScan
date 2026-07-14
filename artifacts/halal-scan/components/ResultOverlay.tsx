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
  isOfflineLocal?: boolean; // analysed from local seed DB while offline
  source?: "internal_db" | "openfoodfacts" | "unknown" | "ai";
  onDismiss: () => void; onWhitelist: () => void; isWhitelisted: boolean;
}

interface Theme {
  gradients: [string, string, string];
  accent: string; accentBg: string; accentBorder: string;
  icon: string; verdict: string;
  btnColors: [string, string, string];
}

const THEMES: Record<string, Theme> = {
  halal: {
    gradients: ["#020D06", "#041208", "#02080404"],
    accent: C.halalLight, accentBg: "rgba(26,175,90,0.10)", accentBorder: "rgba(34,204,106,0.25)",
    icon: "✅", verdict: "HALAL",
    btnColors: ["#1A9A50", "#137A3E", "#0C5C2E"],
  },
  haram: {
    gradients: ["#0D0202", "#160304", "#090202"],
    accent: C.haramLight, accentBg: "rgba(220,53,69,0.10)", accentBorder: "rgba(240,64,85,0.25)",
    icon: "❌", verdict: "NON HALAL",
    btnColors: ["#C82030", "#A01828", "#781018"],
  },
  warning: {
    gradients: ["#0C0500", "#160900", "#090400"],
    accent: C.warningLight, accentBg: "rgba(232,146,26,0.10)", accentBorder: "rgba(245,168,58,0.25)",
    icon: "⚠️", verdict: "À VÉRIFIER",
    btnColors: ["#D08000", "#A86400", "#804C00"],
  },
  unknown: {
    gradients: ["#060A07", "#0A0F0B", "#050806"],
    accent: C.textSub, accentBg: "rgba(154,181,165,0.08)", accentBorder: "rgba(154,181,165,0.18)",
    icon: "❓", verdict: "INCONNU",
    btnColors: ["#3A5C44", "#2C4434", "#1E2E24"],
  },
};

const SOURCE_LABELS: Record<string, string> = {
  internal_db: "📁  Base interne",
  internal_db_offline: "📦  Base locale · hors connexion",
  openfoodfacts: "🌐  OpenFoodFacts",
  unknown: "❓  Inconnu",
};

export default function ResultOverlay({
  result, productName, barcode, reason, ingredientsText, ingredientsList,
  isOfflineQueued, isOfflineLocal, source, onDismiss, onWhitelist, isWhitelisted,
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
                  <Text style={[styles.sourceTxt, { color: t.accent }]}>
                    {isOfflineLocal && source === "internal_db"
                      ? SOURCE_LABELS.internal_db_offline
                      : (SOURCE_LABELS[source] ?? source)}
                  </Text>
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
          <View style={styles.ingSection}>
            {/* Header row */}
            <Pressable style={styles.ingHeader} onPress={() => setShowIng(v => !v)}>
              <View style={styles.ingHeaderLeft}>
                <View style={[styles.ingHeaderDot, { backgroundColor: t.accent }]} />
                <Text style={styles.ingHeaderTxt}>Ingrédients analysés</Text>
                <View style={[styles.ingCountPill, { backgroundColor: t.accentBg, borderColor: t.accentBorder }]}>
                  <Text style={[styles.ingCountTxt, { color: t.accent }]}>{ingList.length}</Text>
                </View>
              </View>
              <View style={[styles.ingChevronWrap, { borderColor: t.accentBorder }]}>
                <Text style={[styles.ingChevron, { color: t.accent }]}>{showIng ? "▲" : "▼"}</Text>
              </View>
            </Pressable>

            {/* Pills grid */}
            {showIng && (
              <View style={styles.ingPillsWrap}>
                {ingList.slice(0, 72).map((ing, i) => (
                  <View key={i} style={[styles.ingPill, { backgroundColor: "#111C15", borderColor: "#1E3025" }]}>
                    <Text style={styles.ingPillTxt} numberOfLines={1}>{ing}</Text>
                  </View>
                ))}
                {ingList.length > 72 && (
                  <View style={[styles.ingPill, { backgroundColor: t.accentBg, borderColor: t.accentBorder }]}>
                    <Text style={[styles.ingPillTxt, { color: t.accent, fontWeight: "700" }]}>
                      +{ingList.length - 72}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── WHITELISTED BADGE ── */}
        {isWhitelisted && (
          <View style={styles.wlBadge}>
            <View style={styles.wlBadgeIcon}>
              <Text style={styles.wlBadgeIconTxt}>✓</Text>
            </View>
            <Text style={styles.wlBadgeTxt}>Dans votre liste approuvée</Text>
          </View>
        )}

        {/* ── MAIN CTA ── */}
        <Pressable
          onPress={dismiss}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          style={({ pressed }) => [styles.ctaWrap, { opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient colors={t.btnColors} style={styles.ctaBtn}>
            <Text style={styles.ctaTxt}>📷  Fermer &amp; Scanner</Text>
          </LinearGradient>
        </Pressable>

        {/* ── SPI ATTRIBUTION ── */}
        <Text style={styles.spiAttr}>Powered by Straight Path Intelligence · straight-path.eu</Text>
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

  // reason card — solid, no transparency
  reasonCard: {
    width: "100%",
    backgroundColor: "#0D1A10",
    borderRadius: 16, borderWidth: 1, borderColor: "#1A2E1E",
    borderLeftWidth: 4,
    padding: 18, gap: 10,
  },
  reasonBadge: {
    fontSize: 10, fontWeight: "900", letterSpacing: 1.5,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-start",
  },
  reasonText: { fontSize: 16, color: "#D4E8D9", lineHeight: 26, fontWeight: "500" },

  // ingredient section — premium solid card
  ingSection: {
    width: "100%",
    backgroundColor: "#0A1610",
    borderRadius: 18, borderWidth: 1, borderColor: "#182416",
    overflow: "hidden",
  },
  ingHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 15, paddingHorizontal: 18,
    backgroundColor: "#0D1B12",
  },
  ingHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  ingHeaderDot: { width: 7, height: 7, borderRadius: 4 },
  ingHeaderTxt: {
    fontSize: 15, fontWeight: "700", color: "#C8DED0", letterSpacing: 0.2,
  },
  ingCountPill: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 2,
  },
  ingCountTxt: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  ingChevronWrap: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  ingChevron: { fontSize: 10, fontWeight: "800" },

  // pills grid
  ingPillsWrap: {
    flexDirection: "row", flexWrap: "wrap", gap: 7,
    paddingHorizontal: 14, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#182416",
  },
  ingPill: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    maxWidth: "100%",
  },
  ingPillTxt: {
    fontSize: 12, fontWeight: "600", color: "#8CB09A", letterSpacing: 0.1,
  },

  // whitelisted badge
  wlBadge: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#041209",
    borderRadius: 14, borderWidth: 1, borderColor: "#1A5C35",
    paddingVertical: 14, paddingHorizontal: 16,
  },
  wlBadgeIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1A5C35",
    alignItems: "center", justifyContent: "center",
  },
  wlBadgeIconTxt: { fontSize: 14, color: "#22CC6A", fontWeight: "900" },
  wlBadgeTxt: { fontSize: 15, fontWeight: "600", color: "#22CC6A" },

  // CTA
  ctaWrap: {
    width: "100%", borderRadius: 18, overflow: "hidden", marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 14,
    elevation: 12,
  },
  ctaBtn: { paddingVertical: 22, alignItems: "center" },
  ctaTxt: { fontSize: 18, fontWeight: "900", color: "#FFF", letterSpacing: 0.8 },

  // SPI attribution
  spiAttr: {
    fontSize: 11, color: "rgba(255,255,255,0.22)",
    textAlign: "center", fontWeight: "400", letterSpacing: 0.3, marginTop: 4,
  },

});
