import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";
import { useScanContext, type AlwaysHalalIngredient } from "@/context/ScanContext";

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
    emoji: "🦴", title: "Gélatine & graisse bovine",
    items: [
      "Gélatine bovine / beef gelatin — abattage non certifié",
      "Suif / Tallow (graisse de bœuf) — abattage non certifié",
    ],
  },
];

const HALAL_OK: { emoji: string; title: string; items: string[] }[] = [
  {
    emoji: "✅", title: "Ingrédients toujours halal",
    items: [
      "Vinaigre (toutes formes) — alcool converti en acide acétique",
      "Levure de bière — levure, pas de l'alcool",
      "Gélatine végétale · Gélatine de fruits",
      "Gélatine de poisson — majorité des savants l'acceptent",
      "Agar-agar — gélifiant végétal",
      "Extraits de plantes · Épices naturelles",
    ],
  },
];

const HALAL_ALLOWED: { emoji: string; title: string; items: string[] }[] = [
  {
    emoji: "✅", title: "Autorisés par défaut",
    items: [
      "Arômes naturels",
      "E920 — L-Cystéine",
      "E120 — Carmin / Cochenille",
      "E904 — Shellac / Laque de gomme",
      "Présure / Rennet / Chymosin",
      "Whey / Lactosérum / Caséine",
      "Esters d'acides gras / Stéarates",
    ],
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

function CustomIngredientGroup({
  accent,
  emoji,
  title,
  hint,
  items,
  onAdd,
  onDelete,
}: {
  accent: string;
  emoji: string;
  title: string;
  hint: string;
  items: { id: number; term: string }[];
  onAdd: (term: string) => Promise<void>;
  onDelete: (id: number, term: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [inputVal, setInputVal] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const term = inputVal.trim();
    if (!term) return;
    if (term.length > 60) {
      Alert.alert("Terme trop long", "Maximum 60 caractères.");
      return;
    }
    await onAdd(term);
    setInputVal("");
    setAdding(false);
  };

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
        <View style={{ flex: 1 }}>
          <Text style={styles.groupTitle}>{title}</Text>
          {items.length > 0 && (
            <Text style={[styles.customCount, { color: accent }]}>{items.length} terme{items.length > 1 ? "s" : ""}</Text>
          )}
        </View>
        <View style={[styles.chevWrap, { backgroundColor: accent + "15" }]}>
          <Text style={[styles.chev, { color: accent }]}>{open ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      {open && (
        <View style={[styles.groupItems, { borderTopColor: accent + "20", gap: 0 }]}>
          <Text style={styles.customHint}>{hint}</Text>

          {items.length === 0 && !adding && (
            <Text style={styles.customEmpty}>Aucun ingrédient ajouté</Text>
          )}

          {items.filter((ci, idx, arr) => arr.findIndex(x => x.term === ci.term) === idx).map((ci) => (
            <View key={ci.id} style={styles.customItemRow}>
              <View style={[styles.itemDot, { backgroundColor: accent, marginTop: 10 }]} />
              <Text style={[styles.itemText, { flex: 1 }]}>{ci.term}</Text>
              <Pressable
                onPress={() => onDelete(ci.id, ci.term)}
                hitSlop={10}
                style={styles.customDeleteBtn}
              >
                <Text style={styles.customDeleteTxt}>✕</Text>
              </Pressable>
            </View>
          ))}

          {adding ? (
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={inputVal}
                onChangeText={setInputVal}
                placeholder="ex: vinaigre de cidre…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
              <Pressable onPress={handleAdd} style={[styles.customConfirmBtn, { backgroundColor: accent }]}>
                <Text style={styles.customConfirmTxt}>OK</Text>
              </Pressable>
              <Pressable onPress={() => { setAdding(false); setInputVal(""); }} hitSlop={8} style={styles.customCancelBtn}>
                <Text style={styles.customCancelTxt}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setAdding(true)}
              style={({ pressed }) => [styles.customAddBtn, { opacity: pressed ? 0.75 : 1, borderColor: accent + "50" }]}
            >
              <Text style={[styles.customAddTxt, { color: accent }]}>＋  Ajouter un ingrédient</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function CustomGroup() {
  const { customIngredients, addCustomIngredient, removeCustomIngredient } = useScanContext();

  const handleDelete = (id: number, term: string) => {
    Alert.alert(
      "Supprimer cet ingrédient ?",
      `"${term}" ne sera plus surveillé.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => removeCustomIngredient(id) },
      ],
    );
  };

  return (
    <CustomIngredientGroup
      accent={C.haramLight}
      emoji="✏️"
      title="Mes ingrédients personnalisés"
      hint="Ajoutez ici vos propres termes. Ils déclencheront automatiquement NON HALAL lors d'un scan."
      items={customIngredients}
      onAdd={addCustomIngredient}
      onDelete={handleDelete}
    />
  );
}

function AlwaysHalalGroup() {
  const { alwaysHalalIngredients, addAlwaysHalal, removeAlwaysHalal } = useScanContext();

  const handleDelete = (id: number, term: string) => {
    Alert.alert(
      "Retirer cet ingrédient ?",
      `"${term}" sera à nouveau analysé normalement.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Retirer", style: "destructive", onPress: () => removeAlwaysHalal(id) },
      ],
    );
  };

  return (
    <CustomIngredientGroup
      accent={C.halalLight}
      emoji="✅"
      title="Mes ingrédients toujours halal"
      hint="Ces ingrédients seront toujours ignorés par l'algorithme et ne déclencheront jamais NON HALAL."
      items={alwaysHalalIngredients}
      onAdd={addAlwaysHalal}
      onDelete={handleDelete}
    />
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
        <View style={styles.infoCard}>
          <View style={[styles.infoIconWrap, { backgroundColor: C.gold + "18", borderColor: C.gold + "40" }]}>
            <Text style={styles.infoIcon}>🔬</Text>
          </View>
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>Comment ça fonctionne</Text>
            <Text style={styles.infoText}>
              L'algorithme compare les ingrédients de chaque produit à cette liste.
              Ajoutez vos propres termes dans "Mes ingrédients personnalisés".
            </Text>
          </View>
        </View>

        <SectionTitle label="INGRÉDIENTS INTERDITS" color={C.haramLight} />
        <CustomGroup />
        {HARAM.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent={C.haramLight} />)}

        <SectionTitle label="À VÉRIFIER" color={C.warningLight} />
        {WARNING.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent={C.warningLight} />)}

        <SectionTitle label="TOUJOURS HALAL (MES EXCEPTIONS)" color={C.halalLight} />
        <AlwaysHalalGroup />
        {HALAL_OK.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent={C.halalLight} />)}
        <SectionTitle label="AUTORISÉS PAR DÉFAUT" color="#1A9A50" />
        {HALAL_ALLOWED.map(g => <Group key={g.title} emoji={g.emoji} title={g.title} items={g.items} accent="#1A9A50" />)}       

        <View style={styles.explainCard}>
          <Text style={styles.explainTitle}>📌  Comprendre les résultats</Text>
          <View style={styles.explainRows}>
            {[
              { color: C.halalLight,   dot: "●", bold: "HALAL",      txt: "Aucun ingrédient interdit détecté. Produit conforme." },
              { color: C.warningLight, dot: "●", bold: "À VÉRIFIER", txt: "Un ingrédient d'origine incertaine est présent. Contactez le fabricant." },
              { color: C.haramLight,   dot: "●", bold: "NON HALAL",  txt: "Un ingrédient interdit a été détecté avec certitude." },
              { color: C.textSub,      dot: "●", bold: "INCONNU",    txt: "Produit non trouvé ou ingrédients non disponibles." },
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

        <View style={styles.sourceCard}>
          <Text style={styles.sourceTxt}>
            🌐  Source des données : Open Food Facts{"\n"}
            Base ouverte et collaborative · +2 000 000 produits
          </Text>
        </View>

        {/* ── PRIVACY ── */}
        <View style={[styles.explainCard, { marginTop: 8 }]}>
          <Text style={styles.explainTitle}>🔒  Confidentialité</Text>
          <View style={styles.explainRows}>
            {[
              { dot: "✅", color: C.halalLight,   bold: "Aucune donnée personnelle",  txt: "Votre historique de scans est stocké uniquement sur cet appareil. Rien n'est envoyé à nos serveurs." },
              { dot: "📷", color: "rgba(255,255,255,0.55)", bold: "Caméra & photos",   txt: "Utilisées uniquement pour scanner les codes-barres. Aucune image n'est conservée ni transmise." },
              { dot: "🌐", color: "rgba(255,255,255,0.55)", bold: "Open Food Facts",   txt: "Le code-barres scanné est envoyé à Open Food Facts pour récupérer les informations du produit. Voir openfoodfacts.org/privacy." },
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

        <View style={[styles.sourceCard, { marginTop: 4, marginBottom: 8 }]}>
          <Text style={styles.sourceTxt}>
            HalalScan v1.0 · Fait avec ❤️ pour la communauté musulmane{"\n"}
            Ce guide ne remplace pas l'avis d'un imam ou d'une autorité halal certifiée.
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

  customCount: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  customHint: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginBottom: 8 },
  customEmpty: { fontSize: 13, color: C.textMuted, fontStyle: "italic", marginBottom: 4 },

  customItemRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
  customDeleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "rgba(200,48,32,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  customDeleteTxt: { fontSize: 12, color: "#C83020", fontWeight: "700" },

  customInputRow: { flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" },
  customInput: {
    flex: 1, height: 40, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    paddingHorizontal: 10, fontSize: 13, color: C.text,
  },
  customConfirmBtn: {
    height: 40, paddingHorizontal: 14, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  customConfirmTxt: { fontSize: 13, fontWeight: "800", color: C.bg },
  customCancelBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  customCancelTxt: { fontSize: 13, color: C.textSub },

  customAddBtn: {
    marginTop: 6, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderStyle: "dashed",
    alignItems: "center",
  },
  customAddTxt: { fontSize: 13, fontWeight: "700" },

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
