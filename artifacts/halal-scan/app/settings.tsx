import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";

const HARAM_GROUPS: { title: string; emoji: string; items: string[] }[] = [
  {
    emoji: "🐷",
    title: "Porc & dérivés",
    items: [
      "Porc / Pork / Schwein / Cerdo / Maiale",
      "Lard, saindoux, graisse de porc",
      "Bacon, lardons, jambon, prosciutto",
      "Pancetta, coppa, mortadelle, saucisson",
      "Boudin noir, andouille, rillettes",
      "Gélatine de porc / porcine",
      "Collagène de porc, protéines de porc",
      "Couenne, pork rind, crackling, speck",
      "Strutto (IT), Schmalz (DE), Manteca (ES)",
    ],
  },
  {
    emoji: "🍺",
    title: "Alcool",
    items: [
      "Alcool éthylique, éthanol",
      "Vin blanc, vin rouge, vin rosé, vin de cuisine",
      "Bière, malt de bière",
      "Rhum, vodka, whisky, cognac, gin",
      "Champagne, prosecco, crémant, cava",
      "Liqueur, brandy, calvados, porto",
      "Sake, vermouth, absinthe, pastis",
      "Cidre alcoolisé, hard cider",
    ],
  },
  {
    emoji: "🩸",
    title: "Sang",
    items: [
      "Sang (bœuf, porc, non spécifié)",
      "Plasma sanguin, sérum sanguin",
      "Blood, blood plasma, blood serum",
      "Albumine de sang",
    ],
  },
  {
    emoji: "🦴",
    title: "Gélatine non spécifiée",
    items: [
      "Gélatine (sans précision d'origine)",
      "Gelatin, gelatine, gelatina",
      "E441 — Gélatine",
      "E542 — Phosphate d'os",
    ],
  },
];

const WARNING_GROUPS: { title: string; emoji: string; items: string[] }[] = [
  {
    emoji: "⚗️",
    title: "Émulsifiants (origine inconnue)",
    items: [
      "E471 — Mono et diglycérides d'acides gras",
      "E472a-f — Esters d'acides gras",
      "E473, E474, E475, E476, E477, E478, E479b",
      "E422 — Glycérine / Glycérol",
      "E570 — Acide stéarique / Stéarine",
      "E470a, E470b — Sels d'acides gras",
    ],
  },
  {
    emoji: "🧪",
    title: "Additifs à vérifier",
    items: [
      "E920 — L-Cystéine (souvent d'origine animale)",
      "E120 — Carmin / Cochenille (insecte)",
      "E904 — Shellac / Laque de gomme (insecte)",
      "E1518 — Triacétine (glycéryle triacétate)",
    ],
  },
  {
    emoji: "🧀",
    title: "Enzymes & présure",
    items: [
      "Présure animale, rennet, rennin",
      "Enzymes de coagulation",
      "Chymosin (peut être d'origine animale)",
    ],
  },
  {
    emoji: "🌿",
    title: "Arômes & dérivés animaux",
    items: [
      "Arômes naturels (source inconnue)",
      "Gélatine bovine / beef gelatin (→ warning)",
      "Gélatine de poisson (→ warning)",
      "Collagène non spécifié",
      "Lactosérum / whey, caséine / casein",
      "Suif / tallow (graisse de bœuf)",
    ],
  },
];

const SAFE_GROUPS: { title: string; emoji: string; items: string[] }[] = [
  {
    emoji: "✅",
    title: "Ingrédients toujours HALAL",
    items: [
      "Vinaigre (toutes formes) — alcool converti en acide acétique",
      "Levure de bière — c'est une levure, pas de l'alcool",
      "Gélatine végétale, gélatine de fruits",
      "Agar-agar — gélifiant d'origine végétale",
      "Extraits de plantes, épices naturelles",
    ],
  },
];

function AccordionGroup({
  emoji,
  title,
  items,
  accentColor,
}: {
  emoji: string;
  title: string;
  items: string[];
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.group, { borderLeftColor: accentColor }]}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.groupEmoji}>{emoji}</Text>
        <Text style={[styles.groupTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={[styles.groupChevronWrap, { backgroundColor: accentColor + "20" }]}>
          <Text style={[styles.groupChevron, { color: accentColor }]}>
            {open ? "▲" : "▼"}
          </Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[styles.groupItems, { borderTopColor: accentColor + "25" }]}>
          {items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={[styles.dot, { backgroundColor: accentColor }]} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionLine, { backgroundColor: color }]} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: color }]} />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 24);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient colors={["#0C1510", "#050908"]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Paramètres</Text>
          <Text style={styles.headerSub}>Ingrédients surveillés</Text>
        </View>
        <View style={{ width: 46 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* info card */}
        <LinearGradient
          colors={[colors.gold + "18", colors.gold + "08"]}
          style={styles.infoCard}
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            L'application analyse automatiquement les ingrédients de chaque produit scanné. Appuyez sur une catégorie pour voir la liste complète des termes surveillés.
          </Text>
        </LinearGradient>

        {/* HARAM section */}
        <SectionHeader title="INGRÉDIENTS INTERDITS" color={colors.haramRed} />
        {HARAM_GROUPS.map((g) => (
          <AccordionGroup key={g.title} emoji={g.emoji} title={g.title} items={g.items} accentColor={colors.haramRed} />
        ))}

        {/* WARNING section */}
        <SectionHeader title="À VÉRIFIER" color={colors.warningAmber} />
        {WARNING_GROUPS.map((g) => (
          <AccordionGroup key={g.title} emoji={g.emoji} title={g.title} items={g.items} accentColor={colors.warningAmber} />
        ))}

        {/* SAFE section */}
        <SectionHeader title="TOUJOURS AUTORISÉ" color={colors.halalGreen} />
        {SAFE_GROUPS.map((g) => (
          <AccordionGroup key={g.title} emoji={g.emoji} title={g.title} items={g.items} accentColor={colors.halalGreen} />
        ))}

        {/* note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📌 Comment fonctionne l'analyse</Text>
          <View style={styles.noteRows}>
            <View style={styles.noteRow}>
              <Text style={[styles.noteDot, { color: colors.haramRed }]}>●</Text>
              <Text style={styles.noteText}>
                <Text style={{ color: colors.haramRed, fontWeight: "700" }}>HARAM </Text>
                — Un ingrédient interdit a été détecté avec certitude.
              </Text>
            </View>
            <View style={styles.noteRow}>
              <Text style={[styles.noteDot, { color: colors.warningAmber }]}>●</Text>
              <Text style={styles.noteText}>
                <Text style={{ color: colors.warningAmber, fontWeight: "700" }}>⚠️ VÉRIFIER </Text>
                — Un ingrédient d'origine incertaine est présent. Contactez le fabricant.
              </Text>
            </View>
            <View style={styles.noteRow}>
              <Text style={[styles.noteDot, { color: colors.mutedForeground }]}>●</Text>
              <Text style={styles.noteText}>
                <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>❓ INCONNU </Text>
                — Les ingrédients ne sont pas disponibles dans la base de données.
              </Text>
            </View>
            <View style={styles.noteRow}>
              <Text style={[styles.noteDot, { color: colors.gold }]}>●</Text>
              <Text style={styles.noteText}>
                <Text style={{ color: colors.gold, fontWeight: "700" }}>📡 HORS LIGNE </Text>
                — Le scan sera analysé automatiquement dès le retour de la connexion.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  headerTitle: { fontSize: 26, fontWeight: "900", color: colors.foreground },
  headerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },

  content: { paddingHorizontal: 14, paddingTop: 16, gap: 10 },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start",
    borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: colors.gold + "30", marginBottom: 6,
  },
  infoIcon: { fontSize: 22 },
  infoText: { flex: 1, fontSize: 15, color: colors.foregroundDim, lineHeight: 22 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginTop: 8, marginBottom: 2,
  },
  sectionLine: { flex: 1, height: 1, opacity: 0.4 },
  sectionTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 2 },

  group: {
    backgroundColor: colors.surface,
    borderRadius: 14, borderLeftWidth: 4, overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row", alignItems: "center",
    padding: 15, gap: 12,
  },
  groupEmoji: { fontSize: 22 },
  groupTitle: { flex: 1, fontSize: 16, fontWeight: "700", lineHeight: 22 },
  groupChevronWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  groupChevron: { fontSize: 11, fontWeight: "900" },

  groupItems: {
    borderTopWidth: 1,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 10,
  },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  itemText: { flex: 1, fontSize: 14, color: colors.foregroundDim, lineHeight: 22 },

  noteCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16, padding: 18, gap: 12,
    borderWidth: 1, borderColor: colors.border, marginTop: 6,
  },
  noteTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  noteRows: { gap: 10 },
  noteRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  noteDot: { fontSize: 16, lineHeight: 24 },
  noteText: { flex: 1, fontSize: 14, color: colors.mutedForeground, lineHeight: 22 },
});
