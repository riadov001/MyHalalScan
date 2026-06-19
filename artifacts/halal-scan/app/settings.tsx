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

// ─── data ─────────────────────────────────────────────────────────────────────

const HARAM_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "🐷 Porc & dérivés",
    items: [
      "Porc / Pork / Schwein / Cerdo / Maiale",
      "Lard, saindoux, graisse de porc",
      "Bacon, lardons, jambon, prosciutto",
      "Pancetta, coppa, mortadelle, saucisson",
      "Boudin noir, andouille, rillettes",
      "Gélatine de porc / porcine",
      "Collagène de porc, protéines de porc",
      "Couenne de porc, pork rind, crackling",
    ],
  },
  {
    title: "🍺 Alcool",
    items: [
      "Alcool, alcool éthylique, éthanol",
      "Vin (blanc, rouge, rosé, de cuisine)",
      "Bière, malt de bière",
      "Rhum, vodka, whisky, cognac, gin",
      "Champagne, prosecco, crémant, cava",
      "Liqueur, brandy, calvados, porto",
      "Sake, vermouth, absinthe, pastis",
    ],
  },
  {
    title: "🩸 Sang",
    items: [
      "Sang, sang de bœuf, sang de porc",
      "Plasma sanguin, sérum sanguin",
      "Blood, blood plasma, blood serum",
    ],
  },
  {
    title: "🦴 Gélatine non spécifiée",
    items: [
      "Gélatine (sans précision d'origine)",
      "Gelatine, gelatin, gelatina",
      "E441 (gélatine)",
      "E542 (phosphate d'os)",
    ],
  },
];

const WARNING_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "⚗️ Émulsifiants (origine inconnue)",
    items: [
      "E471 – Mono et diglycérides d'acides gras",
      "E472a-f – Esters d'acides gras",
      "E473, E474, E475, E476, E477, E478, E479b",
      "E422 – Glycérine / Glycérol",
      "E570 – Acide stéarique / Stéarine",
      "E470a, E470b – Sels d'acides gras",
    ],
  },
  {
    title: "🧪 Additifs à vérifier",
    items: [
      "E920 – L-Cystéine (souvent d'origine animale)",
      "E120 – Carmin / Cochenille (insecte)",
      "E904 – Shellac / Laque de gomme (insecte)",
      "E1518 – Triacétine",
    ],
  },
  {
    title: "🧀 Enzymes & présure",
    items: [
      "Présure animale, rennet, rennin",
      "Enzymes de coagulation",
      "Chymosin (peut être d'origine animale)",
    ],
  },
  {
    title: "🌿 Arômes & autres",
    items: [
      "Arômes naturels (source inconnue)",
      "Gélatine bovine / beef gelatin",
      "Collagène, peptides de collagène",
      "Lactosérum / whey, caséine / casein",
      "Suif / tallow (graisse de bœuf)",
    ],
  },
];

// ─── component ────────────────────────────────────────────────────────────────

function Section({
  title,
  groups,
  accentColor,
  tagColor,
}: {
  title: string;
  groups: { title: string; items: string[] }[];
  accentColor: string;
  tagColor: string;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: accentColor }]}>{title}</Text>
      {groups.map((group, i) => (
        <View key={i} style={[styles.group, { borderLeftColor: accentColor }]}>
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => toggle(i)}
            activeOpacity={0.75}
          >
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={[styles.expandIcon, { color: accentColor }]}>
              {expanded[i] ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
          {expanded[i] && (
            <View style={styles.groupItems}>
              {group.items.map((item, j) => (
                <View key={j} style={styles.itemRow}>
                  <View style={[styles.dot, { backgroundColor: tagColor }]} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 10);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>⚙️ Paramètres</Text>
          <Text style={styles.headerSub}>Ingrédients surveillés</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Ces listes définissent les ingrédients analysés lors du scan. Appuyez sur une catégorie pour voir le détail.
          </Text>
        </View>

        <Section
          title="🚫 Ingrédients INTERDITS (Haram)"
          groups={HARAM_GROUPS}
          accentColor={colors.haramRed}
          tagColor={colors.haramRed}
        />

        <Section
          title="⚠️ Ingrédients À VÉRIFIER"
          groups={WARNING_GROUPS}
          accentColor={colors.warningYellow}
          tagColor={colors.warningYellow}
        />

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📌 Note importante</Text>
          <Text style={styles.noteText}>
            Un produit marqué{" "}
            <Text style={{ color: colors.warningYellow, fontWeight: "700" }}>⚠️ À VÉRIFIER</Text>{" "}
            contient des ingrédients dont l'origine animale n'est pas précisée. Vérifiez toujours l'emballage ou contactez le fabricant.
          </Text>
          <Text style={[styles.noteText, { marginTop: 10 }]}>
            Un produit marqué{" "}
            <Text style={{ color: "#999", fontWeight: "700" }}>❓ INCONNU</Text>{" "}
            signifie que ses ingrédients ne sont pas disponibles dans la base de données. Scannez de nouveau après une mise à jour ou vérifiez manuellement.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
    width: 44,
    alignItems: "center",
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

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 20,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: { fontSize: 20 },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },

  section: { gap: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
    paddingLeft: 4,
  },

  group: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
  },
  expandIcon: {
    fontSize: 12,
    fontWeight: "700",
  },
  groupItems: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: colors.foregroundDim ?? colors.mutedForeground,
    lineHeight: 20,
  },

  noteCard: {
    backgroundColor: "#1A1A2E",
    borderRadius: 14,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#2D2D4E",
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.foreground,
    marginBottom: 6,
  },
  noteText: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
});
