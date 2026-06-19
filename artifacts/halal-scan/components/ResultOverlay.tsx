import * as Haptics from "expo-haptics";
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
  onDismiss: () => void;
  onWhitelist: () => void;
  isWhitelisted: boolean;
}

const CONFIG: Record<
  ScanResult,
  { bg: string; icon: string; title: string; speech: string }
> = {
  halal: {
    bg: colors.halalGreen,
    icon: "✅",
    title: "CE PRODUIT EST HALAL",
    speech: "Ce produit est halal",
  },
  haram: {
    bg: colors.haramRed,
    icon: "❌",
    title: "CE PRODUIT N'EST PAS HALAL",
    speech: "Attention ! Ce produit n'est pas halal.",
  },
  warning: {
    bg: colors.warningYellow,
    icon: "⚠️",
    title: "VÉRIFICATION NÉCESSAIRE",
    speech: "Vérification nécessaire pour ce produit.",
  },
  unknown: {
    bg: colors.warningYellow,
    icon: "❓",
    title: "PRODUIT INCONNU",
    speech: "Produit inconnu. Vérifiez les ingrédients.",
  },
};

const AUTO_DISMISS_SEC = 15;

export default function ResultOverlay({
  result,
  productName,
  barcode,
  reason,
  ingredientsText,
  ingredientsList,
  onDismiss,
  onWhitelist,
  isWhitelisted,
}: ResultOverlayProps) {
  const insets = useSafeAreaInsets();
  const cfg = CONFIG[result];
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SEC);
  const [showIngredients, setShowIngredients] = useState(false);
  const countdownRef = useRef(AUTO_DISMISS_SEC);
  const dismissed = useRef(false);

  const textColor =
    result === "warning" || result === "unknown" ? "#1A0F00" : "#FFFFFF";
  const dimTextColor =
    result === "warning" || result === "unknown"
      ? "rgba(26,15,0,0.65)"
      : "rgba(255,255,255,0.65)";

  const hasIngredients =
    (ingredientsList && ingredientsList.length > 0) ||
    (ingredientsText && ingredientsText.trim().length > 0);

  const displayIngredients =
    ingredientsList && ingredientsList.length > 0
      ? ingredientsList
      : ingredientsText
          ?.split(/[,;]\s*/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0) ?? [];

  // ── entrance animation ───────────────────────────────────────────────────────
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(60);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // ── speech ───────────────────────────────────────────────────────────────────
  const speakResult = () => {
    Speech.speak(cfg.speech, {
      language: "fr-FR",
      rate: 0.88,
      pitch: 1.0,
    });
  };

  useEffect(() => {
    speakResult();

    if (Platform.OS !== "web") {
      if (result === "halal") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result === "haram") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 600);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }

    return () => {
      Speech.stop();
    };
  }, []);

  // ── auto-dismiss countdown ────────────────────────────────────────────────────
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
    opacity.value = withTiming(0, { duration: 200 }, (done) => {
      if (done) runOnJS(onDismiss)();
    });
  };

  const handleWhitelistPress = () => {
    onWhitelist();
    Speech.speak("Produit ajouté à votre liste approuvée.", { language: "fr-FR" });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 20);

  return (
    <Animated.View style={[styles.container, { backgroundColor: cfg.bg }, animStyle]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleDismiss}
        activeOpacity={1}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: botPad },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* countdown ring */}
        <View style={styles.countdownRow}>
          <View style={[styles.countdownBadge, { borderColor: textColor }]}>
            <Text style={[styles.countdownNum, { color: textColor }]}>{countdown}</Text>
          </View>
          <Text style={[styles.countdownHint, { color: textColor }]}>
            Appuyez n'importe où pour continuer
          </Text>
        </View>

        {/* main icon */}
        <Text style={styles.icon}>{cfg.icon}</Text>

        {/* title */}
        <Text style={[styles.title, { color: textColor }]}>{cfg.title}</Text>

        {/* product name */}
        {!!productName && productName !== "Produit sans nom" && (
          <Text style={[styles.productName, { color: textColor }]} numberOfLines={3}>
            {productName}
          </Text>
        )}

        {/* barcode */}
        <Text style={[styles.barcode, { color: dimTextColor }]}>{barcode}</Text>

        {/* reason chip */}
        {!!reason && (
          <View style={[styles.reasonChip, { borderColor: textColor }]}>
            <Text style={[styles.reasonText, { color: textColor }]}>
              {result === "halal" ? "✓" : result === "haram" ? "✕" : "!"}{" "}
              {reason}
            </Text>
          </View>
        )}

        {/* ingredients toggle */}
        {hasIngredients && (
          <TouchableOpacity
            style={[styles.ingredientsToggle, { borderColor: textColor }]}
            onPress={() => setShowIngredients((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.ingredientsToggleText, { color: textColor }]}>
              🧪 {showIngredients ? "Masquer" : "Voir"} les ingrédients
              {displayIngredients.length > 0 ? ` (${displayIngredients.length})` : ""}
            </Text>
            <Text style={[styles.chevron, { color: textColor }]}>
              {showIngredients ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
        )}

        {/* ingredients list */}
        {showIngredients && displayIngredients.length > 0 && (
          <View style={[styles.ingredientsList, { borderColor: textColor }]}>
            {displayIngredients.slice(0, 50).map((ing, i) => (
              <Text
                key={i}
                style={[styles.ingredientItem, { color: textColor }]}
                numberOfLines={2}
              >
                {ing.startsWith("  •") ? ing : `• ${ing}`}
              </Text>
            ))}
            {displayIngredients.length > 50 && (
              <Text style={[styles.ingredientMore, { color: dimTextColor }]}>
                +{displayIngredients.length - 50} autres ingrédients…
              </Text>
            )}
          </View>
        )}

        {/* actions */}
        <View style={styles.actions}>
          {/* replay speech */}
          <TouchableOpacity
            style={[styles.replayBtn, { borderColor: textColor }]}
            onPress={speakResult}
            activeOpacity={0.75}
          >
            <Text style={[styles.replayText, { color: textColor }]}>🔊 RÉPÉTER</Text>
          </TouchableOpacity>

          {/* whitelist */}
          {(result === "warning" || result === "unknown" || result === "haram") &&
            !isWhitelisted && (
              <TouchableOpacity
                style={[styles.whitelistBtn, { borderColor: textColor }]}
                onPress={handleWhitelistPress}
                activeOpacity={0.75}
              >
                <Text style={[styles.whitelistText, { color: textColor }]}>
                  ✓ MARQUER COMME OK
                </Text>
              </TouchableOpacity>
            )}

          {isWhitelisted && (
            <View style={[styles.whitelistBadge, { borderColor: textColor }]}>
              <Text style={[styles.whitelistText, { color: textColor }]}>
                ✓ DANS VOTRE LISTE APPROUVÉE
              </Text>
            </View>
          )}
        </View>

        {/* dismiss button */}
        <TouchableOpacity
          style={[styles.dismissBtn, { backgroundColor: textColor }]}
          onPress={handleDismiss}
          activeOpacity={0.85}
        >
          <Text style={[styles.dismissText, { color: cfg.bg }]}>
            📷 SCANNER UN AUTRE PRODUIT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
    flexGrow: 1,
  },

  // countdown
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countdownBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownNum: {
    fontSize: 18,
    fontWeight: "800",
  },
  countdownHint: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.75,
    flexShrink: 1,
  },

  // icon & title
  icon: { fontSize: 100, textAlign: "center", lineHeight: 120 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.8,
    lineHeight: 36,
  },
  productName: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
    opacity: 0.92,
  },
  barcode: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 1.5,
  },

  // reason chip
  reasonChip: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: "100%",
  },
  reasonText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },

  // ingredients
  ingredientsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "100%",
  },
  ingredientsToggleText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  chevron: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 8,
  },
  ingredientsList: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 5,
    maxHeight: 220,
  },
  ingredientItem: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    opacity: 0.85,
  },
  ingredientMore: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  // actions
  actions: { gap: 10, width: "100%", alignItems: "center" },

  replayBtn: {
    borderWidth: 2,
    borderRadius: colors.radius,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  replayText: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  whitelistBtn: {
    borderWidth: 2,
    borderRadius: colors.radius,
    paddingVertical: 15,
    paddingHorizontal: 28,
    width: "100%",
  },
  whitelistBadge: {
    borderWidth: 2,
    borderRadius: colors.radius,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  whitelistText: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // dismiss
  dismissBtn: {
    borderRadius: colors.radius,
    paddingVertical: 20,
    paddingHorizontal: 28,
    marginTop: 4,
    width: "100%",
    alignItems: "center",
  },
  dismissText: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.8,
  },
});
