/**
 * In-app animated splash shown right after the native splash dismisses.
 * Displays both HalalScan branding and the SPI "Powered by" logo.
 * Auto-dismisses after DURATION_MS.
 */
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";

const DURATION_MS = 2_400;
const FADE_IN = 380;
const FADE_OUT = 350;

interface Props { onDone: () => void }

export function AppSplash({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const logoScale = useSharedValue(0.88);
  const spiOpacity = useSharedValue(0);

  useEffect(() => {
    // fade in
    opacity.value = withTiming(1, { duration: FADE_IN });
    logoScale.value = withTiming(1, { duration: FADE_IN + 80 });
    spiOpacity.value = withDelay(600, withTiming(1, { duration: 420 }));
    // fade out → call onDone
    opacity.value = withDelay(
      DURATION_MS - FADE_OUT,
      withTiming(0, { duration: FADE_OUT }, (done) => {
        if (done) runOnJS(onDone)();
      }),
    );
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: opacity.value,
  }));
  const spiStyle = useAnimatedStyle(() => ({ opacity: spiOpacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.root, rootStyle]}>
      <LinearGradient
        colors={["#020D06", "#060D09", "#030B07"]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── App branding ── */}
      <Animated.View style={[styles.centerBlock, logoStyle]}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconLetters}>HS</Text>
        </View>
        <Text style={styles.appName}>
          <Text style={{ color: C.halalLight }}>Halal</Text>
          <Text style={{ color: C.gold }}>Scan</Text>
        </Text>
        <Text style={styles.appTagline}>حلال · Vérification alimentaire</Text>
        <View style={styles.versionPill}>
          <Text style={styles.versionTxt}>V 1.2.07</Text>
        </View>
      </Animated.View>

      {/* ── SPI branding ── */}
      <Animated.View style={[styles.spiBlock, spiStyle, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.divider} />
        <Text style={styles.poweredTxt}>Powered by</Text>
        <View style={styles.spiRow}>
          <Image
            source={require("@/assets/images/spi-logo.png")}
            style={styles.spiLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.spiName}>Straight Path Intelligence</Text>
            <Text style={styles.spiUrl}>www.straight-path.eu</Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBlock: {
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.gold,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 16,
  },
  iconLetters: { fontSize: 28, fontWeight: "900", color: C.bg, letterSpacing: -0.5 },
  appName: { fontSize: 42, fontWeight: "900", letterSpacing: -0.5 },
  appTagline: { fontSize: 13, color: C.textMuted, fontWeight: "500", letterSpacing: 0.4, marginTop: 2 },
  versionPill: {
    marginTop: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  versionTxt: { fontSize: 11, color: C.textMuted, fontWeight: "600", letterSpacing: 1.2 },

  spiBlock: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  divider: {
    width: 40, height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  poweredTxt: {
    fontSize: 11, color: "rgba(255,255,255,0.28)",
    fontWeight: "500", letterSpacing: 0.6,
  },
  spiRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  spiLogo: { width: 44, height: 44, borderRadius: 10, opacity: 0.9 },
  spiName: { fontSize: 14, color: "rgba(255,255,255,0.65)", fontWeight: "700", letterSpacing: 0.2 },
  spiUrl: { fontSize: 11, color: C.gold, fontWeight: "500", marginTop: 1, letterSpacing: 0.2 },
});
