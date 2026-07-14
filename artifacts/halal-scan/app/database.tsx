import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { type ScanResult, type SeedProduct, useScanContext } from "@/context/ScanContext";

const RESULT_LABELS: Record<ScanResult, { label: string; color: string }> = {
  halal: { label: "Halal", color: "#2A9D4E" },
  haram: { label: "Haram", color: "#C83020" },
  warning: { label: "Avertissement", color: "#D97706" },
  unknown: { label: "Inconnu", color: "#6B7280" },
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface EditState {
  barcode: string;
  productName: string;
  result: ScanResult;
  ingredientsText: string;
  origin: string;
  isEditing: boolean; // true = edit mode, false = add mode
  originalBarcode?: string;
}

const EMPTY_EDIT: EditState = {
  barcode: "", productName: "", result: "halal",
  ingredientsText: "", origin: "", isEditing: false,
};

export default function DatabaseScreen() {
  const insets = useSafeAreaInsets();
  const { seedProducts, addSeedProduct, updateSeedProduct, removeSeedProduct } = useScanContext();

  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<EditState>(EMPTY_EDIT);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const listRef = useRef<FlatList>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seedProducts;
    return seedProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        (p.origin ?? "").toLowerCase().includes(q),
    );
  }, [seedProducts, query]);

  const userCount = useMemo(() => seedProducts.filter((p) => p.isUserAdded).length, [seedProducts]);

  const openAdd = useCallback(() => {
    setForm(EMPTY_EDIT);
    setFormError("");
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((p: SeedProduct) => {
    setForm({
      barcode: p.barcode,
      productName: p.productName,
      result: p.result,
      ingredientsText: p.ingredientsText ?? "",
      origin: p.origin ?? "",
      isEditing: true,
      originalBarcode: p.barcode,
    });
    setFormError("");
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback((p: SeedProduct) => {
    Alert.alert(
      "Supprimer ce produit ?",
      `"${p.productName}" sera retiré de la base de données locale.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await removeSeedProduct(p.barcode);
          },
        },
      ],
    );
  }, [removeSeedProduct]);

  const handleSave = useCallback(async () => {
    const barcode = form.barcode.trim();
    const name = form.productName.trim();
    if (!barcode) { setFormError("Le code-barres est requis."); return; }
    if (!name) { setFormError("Le nom du produit est requis."); return; }

    setSaving(true);
    setFormError("");
    try {
      if (form.isEditing) {
        const updated: SeedProduct = {
          barcode,
          productName: name,
          result: form.result,
          ingredientsText: form.ingredientsText.trim() || undefined,
          origin: form.origin.trim() || undefined,
          addedAt: Date.now(),
          isUserAdded: true,
        };
        await updateSeedProduct(updated);
      } else {
        await addSeedProduct(
          barcode, name, form.result,
          form.ingredientsText.trim() || undefined,
          form.origin.trim() || undefined,
        );
      }
      setModalVisible(false);
    } catch {
      setFormError("Une erreur est survenue. Vérifiez le code-barres.");
    } finally {
      setSaving(false);
    }
  }, [form, addSeedProduct, updateSeedProduct]);

  const renderItem = useCallback(({ item }: { item: SeedProduct }) => {
    const rb = RESULT_LABELS[item.result];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={2}>{item.productName}</Text>
            <Text style={styles.cardBarcode}>{item.barcode}</Text>
          </View>
          <View style={[styles.resultBadge, { backgroundColor: rb.color + "22", borderColor: rb.color + "55" }]}>
            <Text style={[styles.resultBadgeTxt, { color: rb.color }]}>{rb.label}</Text>
          </View>
        </View>

        {!!item.origin && (
          <Text style={styles.cardMeta}>🌍 {item.origin}</Text>
        )}
        {!!item.ingredientsText && (
          <Text style={styles.cardIngredients} numberOfLines={2}>
            {item.ingredientsText}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {item.isUserAdded ? "✏️ Ajouté manuellement · " : "📦 Base intégrée · "}
            {formatDate(item.addedAt)}
          </Text>
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => openEdit(item)}
            >
              <Text style={styles.actionBtnTxt}>Modifier</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => handleDelete(item)}
            >
              <Text style={[styles.actionBtnTxt, { color: "#E85444" }]}>Supprimer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }, [openEdit, handleDelete]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backBtnTxt}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Base de données halal</Text>
          <Text style={styles.subtitle}>
            {seedProducts.length} produit{seedProducts.length !== 1 ? "s" : ""}
            {userCount > 0 ? ` · ${userCount} manuel${userCount !== 1 ? "s" : ""}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={openAdd}
          style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.addBtnTxt}>+ Ajouter</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher par nom, code-barres ou pays…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && Platform.OS !== "ios" && (
          <Pressable onPress={() => setQuery("")} hitSlop={12}>
            <Text style={styles.clearTxt}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoDot} />
        <Text style={styles.infoTxt}>
          {query
            ? `${filtered.length} résultat${filtered.length !== 1 ? "s" : ""} pour « ${query} »`
            : "Utilisé automatiquement pour l'analyse hors connexion"}
        </Text>
      </View>

      {/* List */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.barcode}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{query ? "🔍" : "📦"}</Text>
            <Text style={styles.emptyTxt}>
              {query ? "Aucun produit trouvé" : "Base de données vide"}
            </Text>
            {!query && (
              <Text style={styles.emptySub}>Ajoutez des produits halal pour les retrouver hors connexion.</Text>
            )}
          </View>
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalRoot}
        >
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {form.isEditing ? "Modifier le produit" : "Ajouter un produit"}
            </Text>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.modalSave, { opacity: pressed || saving ? 0.6 : 1 }]}
            >
              <Text style={styles.modalSaveTxt}>{saving ? "…" : "Enregistrer"}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {!!formError && (
              <View style={styles.formError}>
                <Text style={styles.formErrorTxt}>{formError}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Code-barres *</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.barcode}
              onChangeText={(t) => setForm((f) => ({ ...f, barcode: t }))}
              placeholder="ex: 3760094310000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              keyboardType="default"
              editable={!form.isEditing}
            />

            <Text style={styles.fieldLabel}>Nom du produit *</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.productName}
              onChangeText={(t) => setForm((f) => ({ ...f, productName: t }))}
              placeholder="ex: Poulet rôti halal"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.fieldLabel}>Statut halal</Text>
            <View style={styles.resultRow}>
              {(["halal", "haram", "warning", "unknown"] as ScanResult[]).map((r) => {
                const rb = RESULT_LABELS[r];
                const active = form.result === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setForm((f) => ({ ...f, result: r }))}
                    style={[
                      styles.resultOption,
                      active && { backgroundColor: rb.color + "22", borderColor: rb.color },
                    ]}
                  >
                    <Text style={[styles.resultOptionTxt, active && { color: rb.color }]}>
                      {rb.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Ingrédients</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              value={form.ingredientsText}
              onChangeText={(t) => setForm((f) => ({ ...f, ingredientsText: t }))}
              placeholder="Sucre, farine de blé, sel…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.fieldLabel}>Origine / Pays</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.origin}
              onChangeText={(t) => setForm((f) => ({ ...f, origin: t }))}
              placeholder="ex: france, maroc"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  backBtnTxt: { fontSize: 20, color: C.text, fontWeight: "700" },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  addBtn: {
    backgroundColor: C.gold, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnTxt: { fontSize: 13, fontWeight: "800", color: C.bg },

  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, height: 44,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  clearTxt: { fontSize: 14, color: C.textMuted },

  infoBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  infoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.halalLight, opacity: 0.7 },
  infoTxt: { fontSize: 11, color: C.textMuted },

  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  separator: { height: 10 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: "700", color: C.text, lineHeight: 20 },
  cardBarcode: { fontSize: 12, color: C.textMuted, marginTop: 2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  resultBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1,
  },
  resultBadgeTxt: { fontSize: 11, fontWeight: "700" },
  cardMeta: { fontSize: 12, color: C.textSub, marginBottom: 4 },
  cardIngredients: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginBottom: 6 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  cardDate: { fontSize: 11, color: C.textMuted, flex: 1 },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  actionBtnDanger: { borderColor: "rgba(232,84,68,0.3)", backgroundColor: "rgba(232,84,68,0.07)" },
  actionBtnTxt: { fontSize: 12, fontWeight: "600", color: C.textSub },

  emptyBox: { alignItems: "center", paddingTop: 64, gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyTxt: { fontSize: 17, fontWeight: "700", color: C.textSub },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: "center", maxWidth: 260 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  modalCancel: { fontSize: 15, color: C.textSub, minWidth: 60 },
  modalTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: C.text },
  modalSave: { minWidth: 60, alignItems: "flex-end" },
  modalSaveTxt: { fontSize: 15, fontWeight: "700", color: C.gold },

  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  formError: {
    backgroundColor: "rgba(232,84,68,0.12)", borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(232,84,68,0.3)",
  },
  formErrorTxt: { fontSize: 13, color: "#E85444", fontWeight: "600" },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 6, marginTop: 16, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    paddingHorizontal: 12, height: 44, fontSize: 15, color: C.text,
  },
  fieldInputMulti: { height: 100, paddingTop: 10, textAlignVertical: "top" },

  resultRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resultOption: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  resultOptionTxt: { fontSize: 13, fontWeight: "600", color: C.textSub },
});
