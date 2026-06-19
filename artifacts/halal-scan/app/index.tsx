import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ResultOverlay from "@/components/ResultOverlay";
import colors from "@/constants/colors";
import { ScanResult, useScanContext } from "@/context/ScanContext";

const FORBIDDEN_INGREDIENTS = {
  ko: [
    "porc",
    "graisse de porc",
    "saindoux",
    "lard",
    "bacon",
    "gélatine porcine",
    "éthanol",
    "ethanol",
    "alcool éthylique",
    "alcohol",
    "vin",
    "rhum",
    "cognac",
    "brandy",
    "liqueur",
    "bière",
    "gélatine",
    "e441",
    "collagène",
    "peptides de collagène",
    "gélatine hydrolysée",
  ],
  warning: [
    "e471",
    "mono et diglycérides",
    "monoglycérides",
    "diglycérides",
    "e472a",
    "e472b",
    "e472c",
    "e472d",
    "e472e",
    "e472f",
    "e473",
    "e474",
    "e475",
    "e476",
    "e477",
    "e478",
    "e479b",
    "e422",
    "glycérine",
    "glycérol",
    "monostéarate de glycérine",
    "distéarate de glycérine",
    "triacétine",
    "e1518",
    "e570",
    "acide stéarique",
    "e470a",
    "e470b",
  ],
};

function analyzeProduct(data: Record<string, unknown>): {
  result: ScanResult;
  productName: string;
} {
  const productName =
    (data["product_name"] as string) ||
    (data["product_name_fr"] as string) ||
    (data["product_name_en"] as string) ||
    "Produit sans nom";

  const labels = (
    (data["labels"] as string) ||
    (data["labels_tags"] as string) ||
    ""
  ).toLowerCase();

  const haramLabels = ["pork", "alcohol", "wine", "beer"];
  const halalLabels = [
    "halal",
    "sans porc",
    "no pork",
    "certifié halal",
    "certified halal",
    "halal certified",
  ];

  for (const label of haramLabels) {
    if (labels.includes(label)) return { result: "haram", productName };
  }

  for (const label of halalLabels) {
    if (labels.includes(label)) return { result: "halal", productName };
  }

  const ingredients = (
    (data["ingredients_text"] as string) ||
    (data["ingredients_text_fr"] as string) ||
    (data["ingredients_text_en"] as string) ||
    ""
  ).toLowerCase();

  if (!ingredients) return { result: "unknown", productName };

  for (const ingredient of FORBIDDEN_INGREDIENTS.ko) {
    if (ingredients.includes(ingredient)) return { result: "haram", productName };
  }

  for (const ingredient of FORBIDDEN_INGREDIENTS.warning) {
    if (ingredients.includes(ingredient)) return { result: "warning", productName };
  }

  return { result: "halal", productName };
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{
    result: ScanResult;
    productName: string;
    barcode: string;
  } | null>(null);

  const lastScanned = useRef<string | null>(null);
  const scanCooldown = useRef(false);

  const { addToCache, addToWhitelist, getCached, isWhitelisted } = useScanContext();

  const handleBarcode = useCallback(
    async ({ data: barcode }: { data: string }) => {
      if (scanCooldown.current || isLoading) return;
      if (lastScanned.current === barcode) return;

      scanCooldown.current = true;
      lastScanned.current = barcode;
      setIsScanning(false);
      setIsLoading(true);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      const cached = getCached(barcode);
      if (cached) {
        setIsLoading(false);
        setScanResult({
          result: isWhitelisted(barcode) ? "halal" : cached.result,
          productName: cached.productName,
          barcode,
        });
        return;
      }

      try {
        const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
        const response = await fetch(url);
        const json = (await response.json()) as {
          status: number;
          product?: Record<string, unknown>;
        };

        if (json.status === 1 && json.product) {
          const { result, productName } = analyzeProduct(json.product);
          const finalResult = isWhitelisted(barcode) ? "halal" : result;

          await addToCache({
            barcode,
            result,
            productName,
            timestamp: Date.now(),
          });

          setScanResult({ result: finalResult, productName, barcode });
        } else {
          setScanResult({
            result: "unknown",
            productName: "Produit non trouvé",
            barcode,
          });
        }
      } catch {
        setScanResult({
          result: "unknown",
          productName: "Erreur de connexion",
          barcode,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, getCached, isWhitelisted, addToCache]
  );

  const handleDismiss = useCallback(() => {
    setScanResult(null);
    lastScanned.current = null;
    scanCooldown.current = false;
  }, []);

  const handleWhitelist = useCallback(() => {
    if (scanResult) {
      addToWhitelist(scanResult.barcode);
      setScanResult((prev) =>
        prev ? { ...prev, result: "halal" } : null
      );
    }
  }, [scanResult, addToWhitelist]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.scannerButton} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Accès Caméra</Text>
        <Text style={styles.permissionText}>
          HalalScan a besoin de la caméra pour scanner les codes-barres.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionBtnText}>AUTORISER LA CAMÉRA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "qr",
          ],
        }}
        onBarcodeScanned={isScanning ? handleBarcode : undefined}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View
          style={[
            styles.header,
            {
              paddingTop:
                insets.top + (Platform.OS === "web" ? 67 : 10),
            },
          ]}
        >
          <Text style={styles.appTitle}>HalalScan</Text>
          <Text style={styles.appSubtitle}>Scannez un code-barres</Text>
        </View>

        {!isScanning && !isLoading && (
          <View style={styles.scanFrame} pointerEvents="none">
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        )}

        {isScanning && (
          <View style={styles.scanFrame} pointerEvents="none">
            <View style={[styles.cornerActive, styles.topLeft]} />
            <View style={[styles.cornerActive, styles.topRight]} />
            <View style={[styles.cornerActive, styles.bottomLeft]} />
            <View style={[styles.cornerActive, styles.bottomRight]} />
            <View style={styles.scanLine} />
          </View>
        )}

        <View
          style={[
            styles.bottom,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 20),
            },
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.scannerButton} />
              <Text style={styles.loadingText}>ANALYSE EN COURS...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.scannerBtn,
                isScanning && styles.scannerBtnActive,
              ]}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                setIsScanning(!isScanning);
                if (isScanning) {
                  lastScanned.current = null;
                  scanCooldown.current = false;
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.scannerBtnIcon}>
                {isScanning ? "⏹" : "▶"}
              </Text>
              <Text style={styles.scannerBtnText}>
                {isScanning ? "ARRÊTER" : "SCANNER"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {scanResult && (
        <ResultOverlay
          result={scanResult.result}
          productName={scanResult.productName}
          barcode={scanResult.barcode}
          onDismiss={handleDismiss}
          onWhitelist={handleWhitelist}
          isWhitelisted={isWhitelisted(scanResult.barcode)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 32,
    gap: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  appTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.scannerButton,
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    opacity: 0.8,
    marginTop: 4,
  },
  scanFrame: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 260,
    height: 180,
    marginTop: -90,
    marginLeft: -130,
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "rgba(255,255,255,0.5)",
    borderWidth: 3,
  },
  cornerActive: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: colors.scannerButton,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.scannerButton,
    opacity: 0.8,
  },
  bottom: {
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingTop: 24,
  },
  scannerBtn: {
    backgroundColor: colors.scannerButton,
    borderRadius: 60,
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.scannerButton,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
  },
  scannerBtnActive: {
    backgroundColor: "#FF6600",
    shadowColor: "#FF6600",
  },
  scannerBtnIcon: {
    fontSize: 48,
    lineHeight: 56,
  },
  scannerBtnText: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.scannerButtonText,
    letterSpacing: 2,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.scannerButton,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  permissionIcon: {
    fontSize: 80,
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.foreground,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 18,
    color: colors.foregroundDim,
    textAlign: "center",
    lineHeight: 28,
  },
  permissionBtn: {
    backgroundColor: colors.scannerButton,
    borderRadius: colors.radius,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginTop: 16,
  },
  permissionBtnText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.scannerButtonText,
    letterSpacing: 1,
  },
});
