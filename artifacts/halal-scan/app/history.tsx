import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import { useScanContext } from "@/context/ScanContext";
import type { Product } from "@/lib/db";

const RESULT_CFG: Record<string, { border: string; bg: string; icon: string; label: string; labelColor: string }> = {
  halal:   { border: colors.halalGreen,  bg: "rgba(29,177,99,0.08)",  icon: "✅", label: "HALAL",       labelColor: colors.halalGreen },
  haram:   { border: colors.haramRed,    bg: "rgba(229,57,53,0.08)",  icon: "❌", label: "NON HALAL",   labelColor: colors.haramRed },
  warning: { border: colors.warningAmber,bg: "rgba(240,165,0,0.08)",  icon: "⚠️", label: "À VÉRIFIER",  labelColor: colors.warningAmber },
  unknown: { border: "#677A70",          bg: "rgba(103,122,112,0.06)",icon: "❓", label: "INCONNU",     labelColor: "#677A70" },
};

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

function ProductCard({ item, isWhitelisted }: { item: Product; isWhitelisted: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const effectiveResult = isWhitelisted ? "halal" : item.result;
  const cfg = RESULT_CFG[effectiveResult] ?? RESULT_CFG.unknown;
  const hasIngredients = (item.ingredientsList?.length ?? 0) > 0 || !!item.ingredientsText;

  return (
    <View style={[styles.card, { borderLeftColor: cfg.border, backgroundColor: cfg.bg }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => hasIngredients && setExpanded((v) => !v)}
        activeOpacity={hasIngredients ? 0.75 : 1}
      >
        <Text style={styles.cardIcon}>{cfg.icon}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{item.productName}</Text>
          {!!item.reason && (
            <Text style={[styles.cardReason, { color: cfg.border }]} numberOfLines={1}>
              {item.reason}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.cardBarcode}>{item.barcode}</Text>
            <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.cardBadge, { backgroundColor: cfg.border }]}>
            <Text style={[styles.cardBadgeText, { color: "#FFF" }]}>{cfg.label}</Text>
          </View>
          {hasIngredients && (
            <Text style={[styles.cardChevron, { color: cfg.border }]}>
              {expanded ? "▲" : "▼"}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {expanded && hasIngredients && (
        <View style={[styles.cardIngredients, { borderTopColor: cfg.border + "30" }]}>
          {(item.ingredientsList ?? item.ingredientsText?.split(/[,;]\s*/).filter(Boolean) ?? [])
            .slice(0, 40)
            .map((ing, i) => (
              <Text key={i} style={styles.ingItem} numberOfLines={1}>
                {ing.startsWith("  •") ? ing : `• ${ing}`}
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { products, pendingBarcodes, clearHistory, isWhitelisted } = useScanContext();

  const items = Object.values(products).sort((a, b) => b.timestamp - a.timestamp);
  const pending = pendingBarcodes.length;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const handleClear = () => {
    if (Platform.OS === "web") { clearHistory(); return; }
    Alert.alert("Effacer l'historique", "Supprimer tous les produits scannés ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: () => {
        clearHistory();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  };

  let halal = 0, haram = 0, warning = 0, unknown = 0;
  for (const item of items) {
    const r = isWhitelisted(item.barcode) ? "halal" : item.result;
    if (r === "halal") halal++;
    else if (r === "haram") haram++;
    else if (r === "warning") warning++;
    else unknown++;
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient colors={["#0C1510", "#050908"]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Historique</Text>
          <Text style={styles.headerSub}>
            {items.length} produit{items.length !== 1 ? "s" : ""}
            {pending > 0 ? ` · ${pending} en attente` : ""}
          </Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Text style={styles.clearText}>🗑</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* stats */}
      {items.length > 0 && (
        <View style={styles.statsBar}>
          {halal > 0   && <StatChip n={halal}   label="Halal"      color={colors.halalGreen}  />}
          {haram > 0   && <StatChip n={haram}   label="Haram"      color={colors.haramRed}    />}
          {warning > 0 && <StatChip n={warning} label="À vérifier" color={colors.warningAmber}/>}
          {unknown > 0 && <StatChip n={unknown} label="Inconnu"    color={colors.mutedForeground}/>}
          {pending > 0 && <StatChip n={pending} label="En attente" color={colors.gold}        />}
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>Aucun produit scanné</Text>
          <Text style={styles.emptyText}>Scannez votre premier produit pour le voir apparaître ici.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>📷 SCANNER UN PRODUIT</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.barcode}
          renderItem={({ item }) => (
            <ProductCard item={item} isWhitelisted={isWhitelisted(item.barcode)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 16 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

function StatChip({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={[styles.statChip, { borderColor: color + "60", backgroundColor: color + "12" }]}>
      <Text style={[styles.statNum, { color }]}>{n}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  backBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
  },
  backIcon: { fontSize: 22, color: colors.foreground, fontWeight: "700" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 26, fontWeight: "900", color: colors.foreground, letterSpacing: 0.5 },
  headerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  clearBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
  },
  clearText: { fontSize: 22 },

  statsBar: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  statNum: { fontSize: 18, fontWeight: "900" },
  statLabel: { fontSize: 13, fontWeight: "600" },

  list: { paddingHorizontal: 14, paddingTop: 12 },

  card: {
    borderRadius: 16, borderLeftWidth: 5, overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 16, gap: 12,
  },
  cardIcon: { fontSize: 34, lineHeight: 42 },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: 17, fontWeight: "700", color: colors.foreground, lineHeight: 24 },
  cardReason: { fontSize: 12, fontWeight: "600", opacity: 0.9 },
  cardMeta: { flexDirection: "row", gap: 10, marginTop: 2 },
  cardBarcode: { fontSize: 11, color: colors.mutedForeground, letterSpacing: 1.5, fontWeight: "500" },
  cardTime: { fontSize: 11, color: colors.mutedForeground },
  cardRight: { alignItems: "center", gap: 6 },
  cardBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  cardBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  cardChevron: { fontSize: 10, fontWeight: "700" },

  cardIngredients: {
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 4,
  },
  ingItem: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 18 },
  emptyIcon: { fontSize: 90 },
  emptyTitle: { fontSize: 26, fontWeight: "900", color: colors.foreground, textAlign: "center" },
  emptyText: { fontSize: 18, color: colors.mutedForeground, textAlign: "center", lineHeight: 28 },
  emptyBtn: {
    backgroundColor: colors.gold, borderRadius: colors.radius,
    paddingVertical: 20, paddingHorizontal: 40, marginTop: 8,
  },
  emptyBtnText: { fontSize: 19, fontWeight: "900", color: colors.background, letterSpacing: 1 },
});
