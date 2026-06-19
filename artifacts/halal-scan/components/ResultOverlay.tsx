import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import type { ScanResult } from "@/context/ScanContext";

interface ResultOverlayProps {
  result: ScanResult;
  productName: string;
  barcode: string;
  onDismiss: () => void;
  onWhitelist: () => void;
  isWhitelisted: boolean;
}

const RESULT_CONFIG: Record<
  ScanResult,
  { bg: string; icon: string; message: string; speech: string }
> = {
  halal: {
    bg: colors.halalGreen,
    icon: "✅",
    message: "CE PRODUIT EST HALAL",
    speech: "Ce produit est halal",
  },
  haram: {
    bg: colors.haramRed,
    icon: "❌",
    message: "CE PRODUIT N'EST PAS HALAL",
    speech: "Attention, ce produit n'est pas halal",
  },
  warning: {
    bg: colors.warningYellow,
    icon: "⚠️",
    message: "VÉRIFICATION NÉCESSAIRE",
    speech: "Vérification nécessaire",
  },
  unknown: {
    bg: colors.warningYellow,
    icon: "❓",
    message: "PRODUIT INCONNU",
    speech: "Produit inconnu, vérification nécessaire",
  },
};

export default function ResultOverlay({
  result,
  productName,
  barcode,
  onDismiss,
  onWhitelist,
  isWhitelisted,
}: ResultOverlayProps) {
  const insets = useSafeAreaInsets();
  const config = RESULT_CONFIG[result];

  useEffect(() => {
    Speech.speak(config.speech, { language: "fr-FR", rate: 0.9 });

    if (Platform.OS !== "web") {
      if (result === "halal") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result === "haram") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }, 500);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }

    return () => {
      Speech.stop();
    };
  }, []);

  const textColor =
    result === "warning" || result === "unknown" ? "#0D0D0D" : "#FFFFFF";

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.icon}>{config.icon}</Text>

        <Text style={[styles.message, { color: textColor }]}>
          {config.message}
        </Text>

        {!!productName && (
          <Text style={[styles.productName, { color: textColor }]} numberOfLines={3}>
            {productName}
          </Text>
        )}

        <Text style={[styles.barcode, { color: textColor, opacity: 0.6 }]}>
          {barcode}
        </Text>

        {(result === "warning" || result === "unknown" || result === "haram") && !isWhitelisted && (
          <TouchableOpacity
            style={[styles.whitelistBtn, { borderColor: textColor }]}
            onPress={() => {
              onWhitelist();
              Speech.speak("Produit ajouté à votre liste approuvée", { language: "fr-FR" });
            }}
            activeOpacity={0.7}
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

        <TouchableOpacity
          style={[styles.dismissBtn, { backgroundColor: textColor }]}
          onPress={onDismiss}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.dismissText,
              { color: config.bg },
            ]}
          >
            SCANNER UN AUTRE PRODUIT
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  icon: {
    fontSize: 120,
    textAlign: "center",
    lineHeight: 140,
  },
  message: {
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    lineHeight: 38,
  },
  productName: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 30,
    opacity: 0.9,
  },
  barcode: {
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  whitelistBtn: {
    borderWidth: 2,
    borderRadius: colors.radius,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  whitelistBadge: {
    borderWidth: 2,
    borderRadius: colors.radius,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  whitelistText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  dismissBtn: {
    borderRadius: colors.radius,
    paddingVertical: 20,
    paddingHorizontal: 36,
    marginTop: 16,
    minWidth: 280,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
  },
});
