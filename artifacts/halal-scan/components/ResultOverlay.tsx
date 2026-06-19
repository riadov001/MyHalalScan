import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import React, { useEffect, useRef, useState } from "react";
import {
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

interface ResultConfig {
  gradientColors: [string, string, string];
  iconBg: string;
  icon: string;
  title: string;
  speech: string;
  textColor: string;
  dimColor: string;
  accentColor: string;
}

const CONFIGS: Record<ScanResult, ResultConfig> = {
  halal: {
    gradientColors: ["#051A0D", "#071F10", "#040D08"],
    iconBg: "rgba(29,177,99,0.15)",
    icon: "✅",
    title: "CE PRODUIT EST HALAL",
    speech: "Ce produit est halal.",
    textColor: "#FFFFFF",
    dimColor: "rgba(255,255,255,0.55)",
    accentColor: colors.halalGreen,
  },
  haram: {
    gradientColors: ["#1A0505", "#200707", "#0F0303"],
    iconBg: "rgba(229,57,53,0.15)",
    icon: "❌",
    title: "CE PRODUIT N'EST PAS HALAL",
    speech: "Attention ! Ce produit n'est pas halal.",
    textColor: "#FFFFFF",
    dimColor: "rgba(255,255,255,0.55)",
    accentColor: colors.haramRed,
  },
  warning: {
    gradientColors: ["#180E00", "#1F1300", "#0F0900"],
    iconBg: "rgba(240,165,0,0.15)",
    icon: "⚠️",
    title: "VÉRIFICATION NÉCESSAIRE",
    speech: "Vérification nécessaire pour ce produit.",
    textColor: "#FFFFFF",
    dimColor: "rgba(255,255,255,0.55)",
    accentColor: colors.warningAmber,
  },
  unknown: {
    gradientColors: ["#0A0A0A", "#111111", "#080808"],
    iconBg: "rgba(103,122,112,0.15)",
    icon: "❓",
    title: "PRODUIT INCONNU",
    speech: "Produit inconnu. Vérifiez les ingrédients.",
    textColor: "#FFFFFF",
    dimColor: "rgba(255,255,255,0.5)",
    accentColor: colors.mutedForeground,
  },
};

const AUTO_DISMISS_SEC = 16;

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
  const cfg = isOfflineQueued
    ? { ...CONFIGS.unknown, icon: "📡", title: "EN ATTENTE DE RÉSEAU" }
    : CONFIGS[result];

  const [countdown, setCountdown] = useState(AUTO_DISMISS_SEC);
  const [showIngredients, setShowIngredients] = useState(false);
  const countdownRef = useRef(AUTO_DISMISS_SEC);
  const dismissed = useRef(false);

  const hasIngredients =
    !isOfflineQueued &&
    ((ingredientsList && ingredientsList.length > 0) ||
      (ingredientsText && ingredientsText.trim().length > 0));

  const displayIngredients =
    ingredientsList && ingredientsList.length > 0
      ? ingredientsList
      : ingredientsText
          ?.split(/[,;]\s*/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0) ?? [];

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(80);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, { damping: 24, stiffness: 180 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const speakResult = () => {
    if (!isOfflineQueued) {
      Speech.speak(cfg.speech, { language: "fr-FR", rate: 0.84, pitch: 1.0 });
    }
  };

  useEffect(() => {
    if (!isOfflineQueued) {
      speakResult();
      if (Platform.OS !== "web") {
        if (result === "halal") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (result === "haram") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 700);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    }
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        clearInterval(interval);
        if (!dismissed.current) {
          dismissed.current = true;
          opacity.value = withTiming(0, { duration: 300 }, (done) => {
            if (done) runOnJS(onDismiss)();
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onDismiss, opacity]);

  const handleDismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Speech.stop();
    opacity.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 20);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 24);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 100 }, animStyle]}>
      <LinearGradient
        colors={cfg.gradientColors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleDismiss}
        activeOpacity={1}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* countdown */}
        <View style={styles.countdownRow}>
          <View style={[styles.countdownBadge, { borderColor: cfg.accentColor }]}>
            <Text style={[styles.countdownNum, { color: cfg.accentColor }]}>{countdown}</Text>
          </View>
          <Text style={[styles.countdownHint, { color: cfg.dimColor }]}>
            Appuyez n'importe où pour continuer
          </Text>
        </View>

        {/* icon with glow background */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg, borderColor: cfg.accentColor + "40" }]}>
          <Text style={styles.icon}>{cfg.icon}</Text>
        </View>

        {/* result title */}
        <Text style={[styles.title, { color: cfg.textColor }]}>{cfg.title}</Text>

        {/* accent line */}
        <View style={[styles.accentLine, { backgroundColor: cfg.accentColor }]} />

        {/* product name */}
        {!!productName && productName !== "Produit sans nom" && (
          <Text style={[styles.productName, { color: cfg.textColor }]} numberOfLines={3}>
            {productName}
          </Text>
        )}

        {/* barcode */}
        <Text style={[styles.barcode, { color: cfg.dimColor }]}>{barcode}</Text>

        {/* reason */}
        {!!reason && (
          <View style={[styles.reasonCard, { borderColor: cfg.accentColor + "50", backgroundColor: cfg.accentColor + "12" }]}>
            <Text style={[styles.reasonLabel, { color: cfg.accentColor }]}>
              {isOfflineQueued ? "📡 HORS LIGNE" : result === "halal" ? "✓ MOTIF" : result === "haram" ? "✕ MOTIF" : "! MOTIF"}
            </Text>
            <Text style={[styles.reasonText, { color: cfg.textColor }]}>{reason}</Text>
          </View>
        )}

        {/* ingredients toggle */}
        {hasIngredients && (
          <TouchableOpacity
            style={[styles.ingToggle, { borderColor: cfg.accentColor + "60" }]}
            onPress={() => setShowIngredients((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.ingToggleText, { color: cfg.textColor }]}>
              🧪 {showIngredients ? "Masquer" : "Voir"} les ingrédients
              {displayIngredients.length > 0 ? ` (${displayIngredients.length})` : ""}
            </Text>
            <Text style={[styles.chevron, { color: cfg.accentColor }]}>
              {showIngredients ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
        )}

        {showIngredients && displayIngredients.length > 0 && (
          <View style={[styles.ingList, { borderColor: cfg.accentColor + "40" }]}>
            {displayIngredients.slice(0, 50).map((ing, i) => (
              <Text key={i} style={[styles.ingItem, { color: cfg.dimColor }]} numberOfLines={2}>
                {ing.startsWith("  •") ? ing : `• ${ing}`}
              </Text>
            ))}
            {displayIngredients.length > 50 && (
              <Text style={[styles.ingMore, { color: cfg.dimColor }]}>
                +{displayIngredients.length - 50} autres…
              </Text>
            )}
          </View>
        )}

        {/* actions */}
        <View style={styles.actions}>
          {!isOfflineQueued && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: cfg.accentColor + "70" }]}
              onPress={speakResult}
              activeOpacity={0.75}
            >
              <Text style={[styles.actionBtnText, { color: cfg.textColor }]}>🔊 RÉPÉTER</Text>
            </TouchableOpacity>
          )}

          {!isOfflineQueued && (result === "warning" || result === "unknown" || result === "haram") && !isWhitelisted && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.whitelistBtn, { borderColor: cfg.accentColor }]}
              onPress={() => {
                onWhitelist();
                Speech.speak("Produit ajouté à votre liste approuvée.", { language: "fr-FR" });
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.actionBtnText, { color: cfg.accentColor }]}>✓ MARQUER COMME OK</Text>
            </TouchableOpacity>
          )}

          {isWhitelisted && (
            <View style={[styles.actionBtn, { borderColor: colors.halalGreen + "80" }]}>
              <Text style={[styles.actionBtnText, { color: colors.halalGreen }]}>✓ DANS VOTRE LISTE APPROUVÉE</Text>
            </View>
          )}
        </View>

        {/* dismiss */}
        <TouchableOpacity
          style={[styles.dismissBtn, { backgroundColor: cfg.accentColor }]}
          onPress={handleDismiss}
          activeOpacity={0.85}
        >
          <Text style={[styles.dismissText, { color: colors.background }]}>
            📷 SCANNER UN AUTRE PRODUIT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
    flexGrow: 1,
    justifyContent: "center",
  },

  countdownRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  countdownBadge: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
  },
  countdownNum: { fontSize: 19, fontWeight: "900" },
  countdownHint: { fontSize: 14, fontWeight: "500", flexShrink: 1 },

  iconWrap: {
    width: 150, height: 150, borderRadius: 75,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },
  icon: { fontSize: 90, textAlign: "center", lineHeight: 110 },

  title: {
    fontSize: 28, fontWeight: "900",
    textAlign: "center", letterSpacing: 0.5, lineHeight: 36,
  },
  accentLine: { width: 60, height: 3, borderRadius: 2, marginVertical: -4 },

  productName: {
    fontSize: 22, fontWeight: "700",
    textAlign: "center", lineHeight: 32, opacity: 0.95,
  },
  barcode: {
    fontSize: 14, fontWeight: "500",
    letterSpacing: 2.5, textAlign: "center",
  },

  reasonCard: {
    width: "100%", borderWidth: 1.5,
    borderRadius: 14, padding: 14, gap: 6,
  },
  reasonLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  reasonText: { fontSize: 15, fontWeight: "500", lineHeight: 22 },

  ingToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", borderWidth: 1, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  ingToggleText: { fontSize: 15, fontWeight: "700", flex: 1 },
  chevron: { fontSize: 11, fontWeight: "700", marginLeft: 8 },

  ingList: {
    width: "100%", borderWidth: 1,
    borderRadius: 14, padding: 14, gap: 6, maxHeight: 240,
  },
  ingItem: { fontSize: 13, lineHeight: 20, fontWeight: "400" },
  ingMore: { fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 4 },

  actions: { gap: 10, width: "100%", alignItems: "center" },
  actionBtn: {
    borderWidth: 1.5, borderRadius: colors.radius,
    paddingVertical: 14, paddingHorizontal: 28, width: "100%", alignItems: "center",
  },
  whitelistBtn: { marginTop: 2 },
  actionBtnText: { fontSize: 17, fontWeight: "700", letterSpacing: 0.5 },

  dismissBtn: {
    width: "100%", borderRadius: colors.radius,
    paddingVertical: 22, alignItems: "center", marginTop: 4,
  },
  dismissText: { fontSize: 19, fontWeight: "900", letterSpacing: 1 },
});
