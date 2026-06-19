import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import type { ScanResult } from "@/context/ScanContext";

const { height: SCREEN_H } = Dimensions.get("window");
const AUTO_DISMISS = 18;

interface ResultOverlayProps {
  result: ScanResult;
  productName: string;
  barcode: string;
  reason?: string;
  ingredientsText?: string;
  ingredientsList?: string[];
  isOfflineQueued?: boolean;
  onDismiss: () => void;
  onWhitelist: () => void;
  isWhitelisted: boolean;
}

interface Cfg {
  bgColors: [string, string, string];
  accentColor: string;
  badgeBg: string;
  icon: string;
  verdict: string;
  speech: string;
}

const CFGS: Record<string, Cfg> = {
  halal: {
    bgColors: ["#030F07", "#061508", "#030A05"],
    accentColor: colors.halalGreen,
    badgeBg: "rgba(29,177,99,0.14)",
    icon: "✅",
    verdict: "HALAL",
    speech: "Ce produit est halal. Vous pouvez le consommer.",
  },
  haram: {
    bgColors: ["#120303", "#1A0404", "#0C0202"],
    accentColor: colors.haramRed,
    badgeBg: "rgba(229,57,53,0.14)",
    icon: "❌",
    verdict: "NON HALAL",
    speech: "Attention ! Ce produit contient un ingrédient interdit.",
  },
  warning: {
    bgColors: ["#110800", "#1A0E00", "#0A0600"],
    accentColor: colors.warningAmber,
    badgeBg: "rgba(240,165,0,0.14)",
    icon: "⚠️",
    verdict: "À VÉRIFIER",
    speech: "Attention, vérification nécessaire pour ce produit.",
  },
  unknown: {
    bgColors: ["#080A08", "#0C0F0C", "#060806"],
    accentColor: colors.mutedForeground,
    badgeBg: "rgba(103,122,112,0.14)",
    icon: "❓",
    verdict: "INCONNU",
    speech: "Produit non trouvé dans la base de données.",
  },
};

export default function ResultOverlay({
  result,
  productName,
  barcode,
  reason,
  ingredientsText,
  ingredientsList,
  isOfflineQueued,
  onDismiss,
  onWhitelist,
  isWhitelisted,
}: ResultOverlayProps) {
  const insets = useSafeAreaInsets();
  const effectiveKey = isOfflineQueued ? "unknown" : result;
  const cfg = CFGS[effectiveKey] ?? CFGS.unknown;

  const [countdown, setCountdown] = useState(AUTO_DISMISS);
  const [showIng, setShowIng] = useState(false);
  const dismissed = useRef(false);
  const countRef = useRef(AUTO_DISMISS);

  // Ingredients list
  const ingList =
    ingredientsList && ingredientsList.length > 0
      ? ingredientsList
      : (ingredientsText ?? "")
          .split(/[,;]\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
  const hasIng = !isOfflineQueued && ingList.length > 0;

  // Animations
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_H * 0.12);
  const badgeScale = useSharedValue(0.6);
  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 320 });
    translateY.value = withSpring(0, { damping: 26, stiffness: 160 });
    badgeScale.value = withSpring(1, { damping: 16, stiffness: 200, delay: 180 } as Parameters<typeof withSpring>[1]);
    badgeOpacity.value = withTiming(1, { duration: 260, delay: 180 } as Parameters<typeof withTiming>[1]);
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  // Voice & haptics
  useEffect(() => {
    if (!isOfflineQueued) {
      setTimeout(() => Speech.speak(cfg.speech, { language: "fr-FR", rate: 0.82 }), 350);
      if (Platform.OS !== "web") {
        setTimeout(() => {
          if (result === "halal") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          else if (result === "haram") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 600);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }, 200);
      }
    }
    return () => { Speech.stop(); };
  }, []);

  // Countdown auto-dismiss
  useEffect(() => {
    const id = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) {
        clearInterval(id);
        dismiss();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Speech.stop();
    opacity.value = withTiming(0, { duration: 260 }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  };

  const progress = ((AUTO_DISMISS - countdown) / AUTO_DISMISS) * 100;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 24);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.container, overlayStyle]}>
      <LinearGradient
        colors={cfg.bgColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* progress bar top */}
      <View style={[styles.progressBar, { marginTop: topPad }]}>
        <View style={[styles.progressFill, { width: `${progress}%` as `${number}%`, backgroundColor: cfg.accentColor }]} />
      </View>

      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 8 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* dismiss hint */}
        <Text style={[styles.dismissHint, { color: "rgba(255,255,255,0.35)" }]}>
          Appuyez n'importe où · disparaît dans {countdown}s
        </Text>

        {/* ── VERDICT BADGE ── */}
        <Animated.View style={badgeStyle}>
          <View style={[styles.badgeRing, { borderColor: cfg.accentColor + "50" }]}>
            <View style={[styles.badgeInner, { backgroundColor: cfg.badgeBg, borderColor: cfg.accentColor + "60" }]}>
              <Text style={styles.badgeIcon}>{isOfflineQueued ? "📡" : cfg.icon}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── VERDICT TEXT ── */}
        <View style={styles.verdictBlock}>
          <Text style={[styles.verdictLabel, { color: cfg.accentColor }]}>
            {isOfflineQueued ? "EN ATTENTE DE RÉSEAU" : cfg.verdict}
          </Text>
          <View style={[styles.verdictLine, { backgroundColor: cfg.accentColor }]} />
        </View>

        {/* ── PRODUCT NAME ── */}
        {!!productName && (
          <Text style={styles.productName} numberOfLines={3}>{productName}</Text>
        )}

        {/* barcode */}
        <View style={[styles.barcodeChip, { borderColor: cfg.accentColor + "30" }]}>
          <Text style={[styles.barcodeText, { color: cfg.accentColor }]}>◈ {barcode}</Text>
        </View>

        {/* ── REASON CARD ── */}
        {!!reason && (
          <View style={[styles.reasonCard, { borderLeftColor: cfg.accentColor, backgroundColor: cfg.accentColor + "0E" }]}>
            <Text style={[styles.reasonIcon]}>
              {isOfflineQueued ? "📡" : result === "halal" ? "✓" : result === "haram" ? "✕" : "!"}
            </Text>
            <Text style={[styles.reasonText, { color: "rgba(255,255,255,0.88)" }]}>{reason}</Text>
          </View>
        )}

        {/* ── INGREDIENTS TOGGLE ── */}
        {hasIng && (
          <>
            <TouchableOpacity
              style={[styles.ingToggle, { borderColor: "rgba(255,255,255,0.1)" }]}
              onPress={() => setShowIng((v) => !v)}
              activeOpacity={0.75}
            >
              <Text style={styles.ingToggleText}>🧪 Voir les ingrédients ({ingList.length})</Text>
              <Text style={[styles.ingChevron, { color: cfg.accentColor }]}>{showIng ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {showIng && (
              <View style={[styles.ingBox, { borderColor: "rgba(255,255,255,0.08)" }]}>
                {ingList.slice(0, 60).map((ing, i) => (
                  <View key={i} style={styles.ingRow}>
                    <View style={[styles.ingDot, { backgroundColor: cfg.accentColor }]} />
                    <Text style={styles.ingItem} numberOfLines={2}>{ing}</Text>
                  </View>
                ))}
                {ingList.length > 60 && (
                  <Text style={styles.ingMore}>+{ingList.length - 60} autres ingrédients</Text>
                )}
              </View>
            )}
          </>
        )}

        {/* ── ACTIONS ── */}
        <View style={styles.actions}>
          {/* repeat audio */}
          {!isOfflineQueued && (
            <TouchableOpacity
              style={[styles.actionSecondary, { borderColor: "rgba(255,255,255,0.15)" }]}
              onPress={() => Speech.speak(cfg.speech, { language: "fr-FR", rate: 0.82 })}
              activeOpacity={0.75}
            >
              <Text style={styles.actionSecText}>🔊  Réécouter le résultat</Text>
            </TouchableOpacity>
          )}

          {/* whitelist */}
          {!isOfflineQueued && !isWhitelisted && (result === "warning" || result === "haram" || result === "unknown") && (
            <TouchableOpacity
              style={[styles.actionSecondary, { borderColor: cfg.accentColor + "60" }]}
              onPress={() => {
                onWhitelist();
                Speech.speak("Produit ajouté à votre liste approuvée.", { language: "fr-FR" });
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.actionSecText, { color: cfg.accentColor }]}>✓  Marquer comme halal (approuvé personnellement)</Text>
            </TouchableOpacity>
          )}

          {isWhitelisted && (
            <View style={[styles.actionSecondary, { borderColor: colors.halalGreen + "50" }]}>
              <Text style={[styles.actionSecText, { color: colors.halalGreen }]}>✓  Dans votre liste approuvée</Text>
            </View>
          )}
        </View>

        {/* ── MAIN DISMISS BUTTON ── */}
        <TouchableOpacity onPress={dismiss} activeOpacity={0.87} style={styles.dismissBtnWrap}>
          <LinearGradient
            colors={
              result === "halal"
                ? [colors.halalGreen, "#16994F", "#0E6635"]
                : result === "haram"
                  ? [colors.haramRed, "#B52E2B", "#7A1A18"]
                  : result === "warning"
                    ? [colors.warningAmber, "#C08000", "#906000"]
                    : ["#677A70", "#4A5C52", "#3A4C42"]
            }
            style={styles.dismissBtn}
          >
            <Text style={styles.dismissText}>📷  SCANNER UN AUTRE PRODUIT</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 100 },

  progressBar: {
    position: "absolute", left: 0, right: 0, top: 0, height: 3,
    backgroundColor: "rgba(255,255,255,0.06)", zIndex: 10,
  },
  progressFill: { height: 3, borderRadius: 1.5 },

  scroll: {
    alignItems: "center",
    paddingHorizontal: 22,
    gap: 16,
    flexGrow: 1,
    justifyContent: "center",
  },

  dismissHint: { fontSize: 13, fontWeight: "400", textAlign: "center" },

  // badge
  badgeRing: {
    width: 176, height: 176, borderRadius: 88,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  badgeInner: {
    width: 146, height: 146, borderRadius: 73,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  badgeIcon: { fontSize: 80, textAlign: "center", lineHeight: 96 },

  // verdict
  verdictBlock: { alignItems: "center", gap: 8 },
  verdictLabel: { fontSize: 36, fontWeight: "900", letterSpacing: 2, textAlign: "center" },
  verdictLine: { width: 56, height: 3.5, borderRadius: 2 },

  // product
  productName: {
    fontSize: 22, fontWeight: "700", color: "#FFFFFF",
    textAlign: "center", lineHeight: 32, opacity: 0.95,
    maxWidth: "100%",
  },

  // barcode chip
  barcodeChip: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  barcodeText: { fontSize: 13, fontWeight: "600", letterSpacing: 2 },

  // reason
  reasonCard: {
    width: "100%", borderLeftWidth: 4,
    borderRadius: 12, padding: 14,
    flexDirection: "row", gap: 12, alignItems: "flex-start",
  },
  reasonIcon: { fontSize: 20, lineHeight: 26 },
  reasonText: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: "500" },

  // ingredients
  ingToggle: {
    width: "100%", borderWidth: 1, borderRadius: 12,
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
  },
  ingToggleText: { flex: 1, fontSize: 16, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  ingChevron: { fontSize: 11, fontWeight: "700" },

  ingBox: {
    width: "100%", borderWidth: 1, borderRadius: 12,
    padding: 14, gap: 8, maxHeight: 220,
  },
  ingRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  ingDot: { width: 5, height: 5, borderRadius: 3, marginTop: 9, flexShrink: 0 },
  ingItem: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 20 },
  ingMore: { fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 4, fontWeight: "600" },

  // actions
  actions: { width: "100%", gap: 10 },
  actionSecondary: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 18,
    width: "100%", alignItems: "center",
  },
  actionSecText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.75)", textAlign: "center" },

  // dismiss main btn
  dismissBtnWrap: {
    width: "100%", borderRadius: 18,
    overflow: "hidden", marginTop: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 10,
  },
  dismissBtn: { paddingVertical: 22, alignItems: "center" },
  dismissText: { fontSize: 19, fontWeight: "900", color: "#FFF", letterSpacing: 1 },
});
