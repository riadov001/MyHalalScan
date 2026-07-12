import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import C from "@/constants/colors";

const SPI_URL = "https://www.straight-path.eu";

export function SPIFooter() {
  return (
    <Pressable
      onPress={() => Linking.openURL(SPI_URL).catch(() => {})}
      style={({ pressed }) => [styles.footer, { opacity: pressed ? 0.72 : 1 }]}
      android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: false }}
      accessibilityRole="link"
      accessibilityLabel="Straight Path Intelligence website"
    >
      <View style={styles.inner}>
        <Image
          source={require("@/assets/images/spi-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.textBlock}>
          <Text style={styles.powered}>Powered by</Text>
          <Text style={styles.brand}>Straight Path Intelligence</Text>
          <Text style={styles.url}>www.straight-path.eu</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(6,13,9,0.96)",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 8,
    opacity: 0.88,
  },
  textBlock: {
    gap: 1,
  },
  powered: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  brand: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 0.2,
  },
  url: {
    fontSize: 10,
    color: C.gold,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
