import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { type CachedProduct, useScanContext } from "@/context/ScanContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

const RESULT_STYLE: Record<
  string,
  { bg: string; border: string; icon: string; label: string }
> = {
  halal:   { bg: "#0A2E15", border: colors.halalGreen,   icon: "✅", label: "HALAL" },
  haram:   { bg: "#2E0A0A", border: colors.haramRed,     icon: "❌", label: "NON HALAL" },
  warning: { bg: "#2E2500", border: colors.warningYellow, icon: "⚠️", label: "À VÉRIFIER" },
  unknown: { bg: "#1A1A00", border: colors.warningYellow, icon: "❓", label: "INCONNU" },
};

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD}j`;
}

// ─── row component ────────────────────────────────────────────────────────────

function HistoryRow({
  item,
  isWhitelisted,
}: {
  item: CachedProduct;
  isWhitelisted: boolean;
}) {
  const effectiveResult = isWhitelisted ? "halal" : item.result;
  const s = RESULT_STYLE[effectiveResult] ?? RESULT_STYLE.unknown;

  return (
    <View style={[styles.row, { backgroundColor: s.bg, borderLeftColor: s.border }]}>
      <Text style={styles.rowIcon}>{s.icon}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={2}>
          {item.productName}
        </Text>
        <Text style={styles.rowBarcode}>{item.barcode}</Text>
        <Text style={styles.rowTime}>{timeAgo(item.timestamp)}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: s.border }]}>
        <Text
          style={[
            styles.badgeText,
            {
              color:
                effectiveResult === "warning" || effectiveResult === "unknown"
                  ? "#1A1A00"
                  : "#FFF",
            },
          ]}
        >
          {s.label}
        </Text>
      </View>
    </View>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { cache, clearCache, isWhitelisted } = useScanContext();

  const items = Object.values(cache).sort((a, b) => b.timestamp - a.timestamp);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 10);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const handleClear = () => {
    if (Platform.OS === "web") {
      clearCache();
      return;
    }
    Alert.alert(
      "Effacer l'historique",
      "Voulez-vous supprimer tous les produits scannés ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Effacer",
          style: "destructive",
          onPress: () => {
            clearCache();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📋 Historique</Text>
          <Text style={styles.headerSub}>
            {items.length} produit{items.length !== 1 ? "s" : ""} scanné{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Text style={styles.clearText}>🗑 Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* stats bar */}
      {items.length > 0 && (
        <StatsBar items={items} isWhitelistedFn={isWhitelisted} />
      )}

      {/* list */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Aucun produit scanné</Text>
          <Text style={styles.emptyText}>
            Scannez votre premier produit pour le voir apparaître ici.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>📷 SCANNER UN PRODUIT</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.barcode}
          renderItem={({ item }) => (
            <HistoryRow item={item} isWhitelisted={isWhitelisted(item.barcode)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 16 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ─── stats bar ────────────────────────────────────────────────────────────────

function StatsBar({
  items,
  isWhitelistedFn,
}: {
  items: CachedProduct[];
  isWhitelistedFn: (b: string) => boolean;
}) {
  let halal = 0, haram = 0, warning = 0, unknown = 0;
  for (const item of items) {
    const r = isWhitelistedFn(item.barcode) ? "halal" : item.result;
    if (r === "halal") halal++;
    else if (r === "haram") haram++;
    else if (r === "warning") warning++;
    else unknown++;
  }

  return (
    <View style={styles.statsBar}>
      {halal > 0 && (
        <View style={[styles.statChip, { backgroundColor: "#0A2E15", borderColor: colors.halalGreen }]}>
          <Text style={[styles.statNum, { color: colors.halalGreen }]}>{halal}</Text>
          <Text style={[styles.statLabel, { color: colors.halalGreen }]}>Halal</Text>
        </View>
      )}
      {haram > 0 && (
        <View style={[styles.statChip, { backgroundColor: "#2E0A0A", borderColor: colors.haramRed }]}>
          <Text style={[styles.statNum, { color: colors.haramRed }]}>{haram}</Text>
          <Text style={[styles.statLabel, { color: colors.haramRed }]}>Non halal</Text>
        </View>
      )}
      {warning > 0 && (
        <View style={[styles.statChip, { backgroundColor: "#2E2500", borderColor: colors.warningYellow }]}>
          <Text style={[styles.statNum, { color: colors.warningYellow }]}>{warning}</Text>
          <Text style={[styles.statLabel, { color: colors.warningYellow }]}>À vérifier</Text>
        </View>
      )}
      {unknown > 0 && (
        <View style={[styles.statChip, { backgroundColor: "#1A1A1A", borderColor: "#666" }]}>
          <Text style={[styles.statNum, { color: "#999" }]}>{unknown}</Text>
          <Text style={[styles.statLabel, { color: "#999" }]}>Inconnu</Text>
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
  backIcon: { fontSize: 22, color: colors.foreground, fontWeight: "700", lineHeight: 26 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  clearBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.muted,
  },
  clearText: { fontSize: 13, color: colors.mutedForeground, fontWeight: "600" },

  // stats
  statsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statNum: { fontSize: 18, fontWeight: "900" },
  statLabel: { fontSize: 13, fontWeight: "600" },

  // list
  list: { paddingHorizontal: 16, paddingTop: 12 },
  separator: { height: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderLeftWidth: 5,
    padding: 14,
    gap: 12,
  },
  rowIcon: { fontSize: 32, lineHeight: 40 },
  rowBody: { flex: 1, gap: 3 },
  rowName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 22,
  },
  rowBarcode: {
    fontSize: 12,
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    fontWeight: "500",
  },
  rowTime: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "400",
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // empty
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
  },
  emptyIcon: { fontSize: 80 },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 17,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 26,
  },
  emptyBtn: {
    backgroundColor: colors.scannerButton,
    borderRadius: colors.radius,
    paddingVertical: 18,
    paddingHorizontal: 36,
    marginTop: 8,
  },
  emptyBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.scannerButtonText,
    letterSpacing: 1,
  },
});
