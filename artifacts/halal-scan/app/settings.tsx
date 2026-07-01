import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";

const HARAM: { emoji: string; title: string; items: string[] }[] = [
  {
    emoji: "🐷", title: "Porc & dérivés",
    items: [
      "Porc · Pork · Schwein · Cerdo · Maiale",
      "Lard · Saindoux · Graisse de porc",
      "Bacon · Lardons · Jambon · Prosciutto",
      "Pancetta · Coppa · Mortadelle · Saucisson",
      "Boudin noir · Andouille · Rillettes",
      "Gélatine de porc / porcine",
      "Collagène de porc · Protéines de porc",
      "Enzymes porcines · Extrait de porc",
      "Couenne · Pork rind · Crackling · Speck",
    ],
  },
  {
    emoji: "🍷", title: "Alcool",
    items: [
      "Alcool éthylique · Éthanol · Ethyl alcohol",
      "Alcohol · Spirit",
      "Vin blanc · Vin rouge · Vin rosé",
      "Bière · Beer",
      "Rhum · Rum · Vodka · Whisky · Cognac · Gin",
      "Champagne · Prosecco · Crémant · Cava",
      "Liqueur · Brandy · Calvados · Porto",
      "Saké · Vermouth · Absinthe · Pastis · Cidre alcoolisé",
    ],
  },
  {
    emoji: "🩸", title: "Sang",
    items: [
      "Sang (bœuf, porc, non spécifié)",
      "Plasma sanguin · Sérum sanguin",
      "Blood plasma · Blood serum",
      "Albumine de sang",
    ],
  },
  {
    emoji: "🦴", title: "Gélatine, Collagène & dérivés",
    items: [
      "Gélatine (sans précision d'origine)",
      "Gelatin · Gelatine · Gelatina",
      "E441 — Gélatine",
      "E542 — Phosphate d'os",
      "Gélatine hydrolysée · Gélatine partiellement hydrolysée",
      "Hydrolyzed gelatin",
      "Collagène · Collagen",
      "Peptides de collagène · Collagen peptides",
    ],
  },
  {
    emoji: "⚗️", title: "Émulsifiants — esters d'acides gras",
    items: [
      "E471 — Mono- et diglycérides d'acides gras",
      "E472a — Esters acétiques de mono/diglycérides",
      "E472b — Esters lactiques de mono/diglycérides",
      "E472c — Esters citriques de mono/diglycérides",
      "E472d — Esters tartriques de mono/diglycérides",
      "E472e — Esters diacétyltartriques (DATEM)",
      "E472f — Esters mixtes acétiques/tartriques",
      "E473 — Esters de saccharose",
      "E474 — Sucroglycérides",
      "E475 — Esters polyglycériques d'acides gras",
      "E476 — Polyricinoléate de polyglycérol",
      "E477 — Esters de propylène glycol",
      "E478 · E479b",
    ],
  },
  {
    emoji: "🧴", title: "Glycérine, Glycérol & acides gras",
    items: [
      "E422 — Glycérine / Glycérol",
      "Monostéarate de glycérine",
      "Distéarate de glycérine",
      "Glyceryl monostearate",
      "E1518 — Triacétine",
      "E570 — Acide stéarique / Stéarine",
      "E470a · E470b — Sels d'acides gras",
      "Esters d'acides gras",
      "Stéarate",
    ],
  },
];

const WARNING: { emoji: string; title: string; items: string[] }[] = [
  {
    emoji: "🧪", title: "Additifs à vérifier",
    items: [
      "E920 — L-Cystéine (souvent d'origine animale)",
      "E120 — Carmin / Cochenille (insecte)",
      "E904 — Shellac / Laque de gomme (insecte)",
    ],
  },
  {
    emoji: "🧫", title: "Enzymes & présure",
    items: [
      "Présure animale · Rennet · Rennin",
      "Enzymes de coagulation",
      "Chymosin (peut être d'origine animale)",
    ],
  },
  {
    emoji: "🥛", title: "Arômes & dérivés (origine incertaine)",
    items: [
      "Arômes naturels (source inconnue)",
      "Gélatine bovine / beef gelatin — abattage non certifié",
      "Gélatine de poisson — avis divergents entre savants",
      "Lactosérum / Whey · Caséine / Casein",
      "Suif / Tallow (graisse de bœuf)",
    ],
  },
];

const HALAL_OK: { emoji: string; title: string; items: string[] }[] = [
  {
    emoji: "✅", title: "Ingrédients toujours halal",
    items: ["Vinaigre (toutes formes) — alcool converti en acide acétique", "Levure de bière — levure, pas de l'alcool", "Gélatine végétale · Gélatine de fruits", "Agar-agar — gélifiant végétal", "Extraits de plantes · Épices naturelles"],
  },
];

function Group({ emoji, title, items, accent }: { emoji: string; title: string; items: string[]; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.group, { borderLeftColor: accent }]}>
      <Pressable
        onPress={() => setOpen(v => !v)}
        android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        style={styles.groupHead}
      >
        <View style={[styles.groupEmojiWrap, { backgroundColor: accent + "15", borderColor: accent + "30" }]}>
          <Text style={styles.groupEmoji}>{emoji}</Text>
        </View>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={[styles.chevWrap, { backgroundColor: accent + "15" }]}>
          <Text style={[styles.chev, { color: accent }]}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>
      {open && (
        <View style={[styles.groupItems, { borderTopColor: accent + "20" }]}>
          {items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={[styles.itemDot, { backgroundColor: accent }]} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SectionTitle({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={[styles.sectionLine, { backgroundColor: color }]} />
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
      <View style={[styles.sectionLine, { backgroundColor: color }]} />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 24);

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <LinearGradient colors={[C.surface, C.bg]} style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
          android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false, radius: 20 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Paramètres</Text>
          <Text style={styles.headerSub}>Ingrédients surveillés par l'algorithme</Text>
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: C.gold + "18", borderColor: C.gold + "40" }]}>
            <Text style={styles.infoIcon}>🔬</Text>
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Comment ça fonctionne</Text>
            <Text style={styles.infoText}>
              L'algorithme analyse la liste d'ingrédients de chaque produit scanné et la compare à cette base de données.
              Appuyez sur une catégorie pour voir les termes surveillés.
            </Text>
          </View>
        </View>

        {/* HARAM */}
        <SectionTitle label="INGRÉDIENTS INTERDITS" color={C.haramLight} />
        {HARAM.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent={C.haramLight} />)}

        {/* WARNING */}
        <SectionTitle label="À VÉRIFIER" color={C.warningLight} />
        {WARNING.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent={C.warningLight} />)}

        {/* HALAL */}
        <SectionTitle label="TOUJOURS AUTORISÉ" color={C.halalLight} />
        {HALAL_OK.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent={C.halalLight} />)}

        {/* Explanation card */}
        <View style={styles.explainCard}>
          <Text style={styles.explainTitle}>📌  Comprendre les résultats</Text>
          <View style={styles.explainRows}>
            {[
              { color: C.halalLight,   dot: "●", bold: "HALAL", txt: "Aucun ingrédient interdit détecté. Produit conforme." },
              { color: C.warningLight, dot: "●", bold: "À VÉRIFIER", txt: "Un ingrédient d'origine incertaine est présent. Contactez le fabricant." },
              { color: C.haramLight,   dot: "●", bold: "NON HALAL", txt: "Un ingrédient interdit a été détecté avec certitude." },
              { color: C.textSub,      dot: "●", bold: "INCONNU", txt: "Produit non trouvé ou ingrédients non disponibles." },
              { color: C.gold,         dot: "●", bold: "HORS LIGNE", txt: "Analysé automatiquement au retour de la connexion." },
            ].map((r, i) => (
              <View key={i} style={styles.explainRow}>
                <Text style={[styles.explainDot, { color: r.color }]}>{r.dot}</Text>
                <Text style={styles.explainTxt}>
                  <Text style={{ color: r.color, fontWeight: "700" }}>{r.bold}  </Text>
                  {r.txt}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Source */}
        <View style={styles.sourceCard}>
          <Text style={styles.sourceTxt}>
            🌐  Source des données : Open Food Facts{"\n"}
            Base ouverte et collaborative · +2 000 000 produits
          </Text>
        </View>
      </ScrollView>
    </View>
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
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2, textAlign: "center" },

  content: { paddingHorizontal: 14, paddingTop: 16, gap: 8 },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    padding: 16, marginBottom: 4,
  },
  infoIconWrap: {
    width: 46, height: 46, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  infoIcon: { fontSize: 22 },
  infoBody: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  infoText: { fontSize: 13, color: C.textSub, lineHeight: 19 },

  sectionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 0 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth * 2, opacity: 0.5 },
  sectionLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 2 },

  group: {
    backgroundColor: C.surface, borderRadius: 14, borderLeftWidth: 3.5, overflow: "hidden",
  },
  groupHead: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  groupEmojiWrap: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  groupEmoji: { fontSize: 18 },
  groupTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: C.text, lineHeight: 20 },
  chevWrap: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  chev: { fontSize: 10, fontWeight: "900" },

  groupItems: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, gap: 8,
  },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemDot: { width: 5, height: 5, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  itemText: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 20 },

  explainCard: {
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    padding: 18, gap: 12, marginTop: 6,
  },
  explainTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  explainRows: { gap: 9 },
  explainRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  explainDot: { fontSize: 14, lineHeight: 22 },
  explainTxt: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 20 },

  sourceCard: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    padding: 14, alignItems: "center",
  },
  sourceTxt: { fontSize: 12, color: C.textMuted, textAlign: "center", lineHeight: 18 },
});
