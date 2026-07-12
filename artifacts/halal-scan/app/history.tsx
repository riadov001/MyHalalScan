import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";
import { useScanContext } from "@/context/ScanContext";
import type { Product } from "@/lib/db";
import * as Haptics from "expo-haptics";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type Filter = "all" | "halal" | "haram" | "warning" | "unknown";

const RESULT_STYLE: Record<string, { border: string; badgeBg: string; badgeFg: string; icon: string; label: string }> = {
  halal:   { border: C.halalLight,   badgeBg: "rgba(26,175,90,0.18)",   badgeFg: C.halalLight,   icon: "✅", label: "HALAL" },
  haram:   { border: C.haramLight,   badgeBg: "rgba(220,53,69,0.18)",   badgeFg: C.haramLight,   icon: "❌", label: "NON HALAL" },
  warning: { border: C.warningLight, badgeBg: "rgba(232,146,26,0.18)",  badgeFg: C.warningLight, icon: "⚠️", label: "À VÉRIFIER" },
  unknown: { border: C.textSub,      badgeBg: "rgba(154,181,165,0.12)", badgeFg: C.textSub,      icon: "❓", label: "INCONNU" },
};

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const days = Math.floor(h / 24);
  return days === 1 ? "Hier" : `Il y a ${days} j`;
}

function ProductCard({ item, isWL, onWhitelist }: { item: Product; isWL: boolean; onWhitelist: (barcode: string) => void }) {
  const [open, setOpen] = useState(false);
  const r = isWL ? "halal" : item.result;
  const s = RESULT_STYLE[r] ?? RESULT_STYLE.unknown;
  const ingList = useMemo(() => {
    const raw = item.ingredientsList?.length
      ? item.ingredientsList
      : (item.ingredientsText ?? "").split(/[,;]\s*/).map(x => x.trim()).filter(Boolean);
    // Deduplicate and sort
    return [...new Set(raw)].filter(Boolean).sort((a, b) => a.localeCompare(b, "fr"));
  }, [item.ingredientsList, item.ingredientsText]);
  const hasIng = ingList.length > 0;
  const canWhitelist = !isWL && (item.result === "haram" || item.result === "warning" || item.result === "unknown");

  return (
    <View style={[styles.card, { borderLeftColor: s.border }]}>
      <Pressable
        onPress={() => hasIng && setOpen(v => !v)}
        android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        style={styles.cardBody}
      >
        {item.photoPath && API_BASE ? (
          <Image
            source={{ uri: `${API_BASE}/api/storage${item.photoPath}` }}
            style={[styles.cardThumbnail, { borderColor: s.border + "40" }]}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.cardIcon}>{s.icon}</Text>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{item.productName}</Text>
          {!!item.reason && <Text style={[styles.cardReason, { color: s.border }]} numberOfLines={1}>{item.reason}</Text>}
          <View style={styles.cardMeta}>
            <Text style={styles.cardBarcode}>{item.barcode.startsWith("IA-OCR") ? "IA · Analyse visuelle" : item.barcode}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.cardBadge, { backgroundColor: s.badgeBg, borderColor: s.border + "40" }]}>
            <Text style={[styles.cardBadgeTxt, { color: s.badgeFg }]}>{s.label}</Text>
          </View>
          {hasIng && <Text style={[styles.cardChev, { color: s.border }]}>{open ? "▲" : "▼"}</Text>}
        </View>
      </Pressable>

      {open && ingList.length > 0 && (
        <View style={[styles.ingSection, { borderTopColor: s.border + "20" }]}>
          {ingList.map((ing, i) => (
            <View key={i} style={styles.ingRow}>
              <View style={[styles.ingDot, { backgroundColor: s.border }]} />
              <Text style={styles.ingTxt}>{ing}</Text>
            </View>
          ))}
        </View>
      )}

      {canWhitelist && (
        <Pressable
          onPress={() => {
            Alert.alert(
              "Marquer comme halal pour moi ?",
              `"${item.productName}" sera considéré comme halal dans votre historique.`,
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Confirmer",
                  onPress: () => {
                    onWhitelist(item.barcode);
                    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  },
                },
              ],
            );
          }}
          style={({ pressed }) => [styles.whitelistBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Text style={styles.whitelistTxt}>✓  Marquer comme halal pour moi</Text>
        </Pressable>
      )}

      {isWL && (
        <View style={styles.whitelistedBadge}>
          <Text style={styles.whitelistedTxt}>✓  Dans votre liste approuvée</Text>
        </View>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { products, pendingBarcodes, clearHistory, isWhitelisted, whitelistProduct } = useScanContext();
  const [filter, setFilter] = useState<Filter>("all");

  const allItems = useMemo(
    () => Object.values(products).sort((a, b) => b.timestamp - a.timestamp),
    [products]
  );

  const filtered = useMemo(
    () => filter === "all" ? allItems : allItems.filter(i => (isWhitelisted(i.barcode) ? "halal" : i.result) === filter),
    [allItems, filter, isWhitelisted]
  );

  let halal = 0, haram = 0, warn = 0, unk = 0;
  for (const i of allItems) {
    const r = isWhitelisted(i.barcode) ? "halal" : i.result;
    if (r === "halal") halal++; else if (r === "haram") haram++;
    else if (r === "warning") warn++; else unk++;
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const handleClear = () => {
    if (Platform.OS === "web") { clearHistory(); return; }
    Alert.alert("Effacer l'historique", "Supprimer tous les produits scannés ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer tout", style: "destructive", onPress: () => {
        clearHistory();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }},
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* ── Header ── */}
      <LinearGradient colors={[C.surface, C.bg]} style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false, radius: 20 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Historique</Text>
          <Text style={styles.headerSub}>
            {allItems.length} produit{allItems.length !== 1 ? "s" : ""}
            {pendingBarcodes.length > 0 ? `  ·  ${pendingBarcodes.length} en attente` : ""}
          </Text>
        </View>

        {allItems.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.clearBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleClear}
            android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false, radius: 20 }}
          >
            <Text style={styles.clearIcon}>🗑</Text>
          </Pressable>
        ) : <View style={{ width: 44 }} />}
      </LinearGradient>

      {/* ── Stats row ── */}
      {allItems.length > 0 && (
        <View style={styles.statsRow}>
          <StatChip n={halal} label="Halal" color={C.halalLight} active={filter === "halal"} onPress={() => setFilter(f => f === "halal" ? "all" : "halal")} />
          {haram > 0 && <StatChip n={haram} label="Non halal" color={C.haramLight} active={filter === "haram"} onPress={() => setFilter(f => f === "haram" ? "all" : "haram")} />}
          {warn > 0 && <StatChip n={warn} label="À vérifier" color={C.warningLight} active={filter === "warning"} onPress={() => setFilter(f => f === "warning" ? "all" : "warning")} />}
          {unk > 0 && <StatChip n={unk} label="Inconnu" color={C.textSub} active={filter === "unknown"} onPress={() => setFilter(f => f === "unknown" ? "all" : "unknown")} />}
        </View>
      )}

      {/* ── List ── */}
      {allItems.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyEmoji}>📭</Text>
          </View>
          <Text style={styles.emptyTitle}>Aucun produit scanné</Text>
          <Text style={styles.emptyDesc}>
            Vos scans apparaîtront ici. Scannez un code-barres pour commencer.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => router.back()}
          >
            <LinearGradient colors={[C.goldLight, C.gold, C.goldDark]} style={styles.emptyBtnGrad}>
              <Text style={styles.emptyBtnTxt}>📷  SCANNER UN PRODUIT</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.barcode}
          renderItem={({ item }) => <ProductCard item={item} isWL={isWhitelisted(item.barcode)} onWhitelist={whitelistProduct} />}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListEmptyComponent={
            <View style={styles.filterEmpty}>
              <Text style={styles.filterEmptyTxt}>Aucun produit dans cette catégorie</Text>
              <Pressable onPress={() => setFilter("all")}>
                <Text style={styles.filterReset}>Voir tout →</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
}

function StatChip({ n, label, color, active, onPress }: { n: number; label: string; color: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.statChip, { borderColor: color + (active ? "80" : "35"), backgroundColor: active ? color + "20" : color + "0C" }]}
    >
      <Text style={[styles.statN, { color }]}>{n}</Text>
      <Text style={[styles.statLabel, { color: active ? color : C.textSub }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, gap: 8,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  backIcon: { fontSize: 20, color: C.text, fontWeight: "700" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  clearBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  clearIcon: { fontSize: 20 },

  statsRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 7,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  statN: { fontSize: 16, fontWeight: "900" },
  statLabel: { fontSize: 12, fontWeight: "600" },

  list: { paddingHorizontal: 12, paddingTop: 10 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, borderLeftWidth: 4, overflow: "hidden",
    elevation: 2,
  },
  cardBody: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  cardIcon: { fontSize: 32, lineHeight: 40 },
  cardThumbnail: {
    width: 44, height: 44, borderRadius: 8,
    borderWidth: 1, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 16, fontWeight: "700", color: C.text, lineHeight: 22 },
  cardReason: { fontSize: 12, fontWeight: "600", opacity: 0.9 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardBarcode: { fontSize: 11, color: C.textMuted, letterSpacing: 1.5, fontWeight: "500" },
  cardDot: { fontSize: 11, color: C.textMuted },
  cardTime: { fontSize: 11, color: C.textMuted },
  cardRight: { alignItems: "flex-end", gap: 5 },
  cardBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cardBadgeTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  cardChev: { fontSize: 10, fontWeight: "700" },

  ingSection: { borderTopWidth: 1, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 5 },
  ingRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  ingDot: { width: 4, height: 4, borderRadius: 2, marginTop: 9, flexShrink: 0 },
  ingTxt: { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  ingMore: { fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 4, fontWeight: "600" },

  whitelistBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(26,175,90,0.25)",
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "rgba(26,175,90,0.07)",
  },
  whitelistTxt: { fontSize: 14, fontWeight: "700", color: C.halalLight },
  whitelistedBadge: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(26,175,90,0.20)",
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "rgba(26,175,90,0.05)",
  },
  whitelistedTxt: { fontSize: 13, fontWeight: "600", color: C.halalLight, opacity: 0.8 },

  filterEmpty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  filterEmptyTxt: { fontSize: 16, color: C.textSub },
  filterReset: { fontSize: 15, color: C.gold, fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 18 },
  emptyCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 26, fontWeight: "900", color: C.text, textAlign: "center" },
  emptyDesc: { fontSize: 17, color: C.textSub, textAlign: "center", lineHeight: 26 },
  emptyBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  emptyBtnGrad: { paddingVertical: 20, alignItems: "center" },
  emptyBtnTxt: { fontSize: 18, fontWeight: "900", color: C.bg, letterSpacing: 0.8 },
});
