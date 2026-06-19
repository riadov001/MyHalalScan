import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ─── restriction lists ────────────────────────────────────────────────────────

const HARAM_INGREDIENTS: string[] = [
  // ── pork & derivatives (FR) ──
  "porc", "viande de porc", "graisse de porc", "gras de porc",
  "couenne de porc", "couenne", "saindoux", "lard", "lardons",
  "bacon", "jambon", "jambon blanc", "jambon de pays", "prosciutto",
  "pancetta", "coppa", "mortadelle", "saucisson", "saucisson sec",
  "rillettes", "rillons", "chipolata", "boudin noir", "andouille",
  "andouillette", "filet mignon de porc", "côte de porc", "poitrine de porc",
  "jarret de porc", "épaule de porc", "longe de porc",
  "gélatine de porc", "gélatine porcine", "protéines de porc",
  "protéines de peau de porc", "collagène de porc",
  // ── pork & derivatives (EN) ──
  "pork", "pig", "swine", "ham", "pork lard", "fatback", "pork belly",
  "pork rind", "crackling", "pepperoni", "pork gelatin", "pork collagen",
  "pork fat", "pork skin",
  // ── alcohol (FR) ──
  "alcool", "alcool éthylique", "éthanol", "ethanol",
  "alcool de grain", "alcool de vin", "alcool modifié",
  "vin", "vin blanc", "vin rouge", "vin rosé", "vin de cuisine",
  "bière", "biere", "malt de bière", "bière d'orge",
  "rhum", "vodka", "whisky", "whiskey", "cognac", "brandy", "liqueur",
  "gin", "champagne", "crémant", "prosecco", "cava", "porto",
  "vermouth", "sake", "cidre alcoolisé", "calvados", "armagnac",
  "eau-de-vie", "kirsch", "schnapps", "absinthe", "pastis",
  "anisette", "amaretto", "cointreau", "baileys",
  // ── alcohol (EN) ──
  "alcohol", "wine", "beer", "rum", "vodka", "whiskey", "whisky",
  "cognac", "brandy", "liqueur", "gin", "champagne", "sake",
  "mead", "hard cider", "spirits", "bourbon",
  // ── blood (FR/EN) ──
  "sang", "sang de bœuf", "sang de porc", "plasma sanguin",
  "sérum sanguin", "blood", "blood plasma", "blood serum",
  // ── gelatin unspecified (high risk) ──
  "gélatine", "gelatine", "gelatin", "gelatina",
  "gélatine hydrolysée", "protéines de gélatine",
  // ── haram e-numbers ──
  "e441",  // gelatin
  "e542",  // bone phosphate
];

const WARNING_INGREDIENTS: string[] = [
  // ── glycerides / emulsifiers (may be animal-derived) ──
  "e471", "mono et diglycérides d'acides gras",
  "monoglycérides", "diglycérides",
  "mono- and diglycerides", "mono and diglycerides",
  "e472a", "e472b", "e472c", "e472d", "e472e", "e472f",
  "e473", "e474", "e475", "e476", "e477", "e478", "e479b",
  // ── glycerol / glycerine ──
  "e422", "glycérine", "glycérol", "glycerine", "glycerol",
  "monostéarate de glycérine", "distéarate de glycérine",
  "glyceryl", "glyceryl monostearate",
  // ── stearates ──
  "e570", "acide stéarique", "stearic acid", "stéarine",
  "e470a", "e470b", "stearate", "stéarate",
  // ── glyceryl triacetate ──
  "e1518", "triacétine", "triacetin",
  // ── l-cysteine ──
  "e920", "l-cystéine", "l-cysteine", "cystéine",
  // ── rennet / présure ──
  "présure", "rennet", "rennin", "présure animale",
  "enzymes de coagulation",
  // ── insect-derived colorings ──
  "e120", "carmin", "carmine", "cochenille",
  "rouge cochenille", "acide carminique", "carminic acid",
  "e904", "shellac", "laque de gomme",
  // ── natural flavors (source unknown) ──
  "arômes naturels", "arôme naturel", "natural flavors",
  "natural flavour", "natural flavor",
  // ── gelatin bovine / unspecified (if not in haram list already) ──
  "gélatine bovine", "bovine gelatin", "beef gelatin",
  "collagène", "collagen", "peptides de collagène",
  // ── whey / casein ──
  "lactosérum", "whey", "caséine", "casein",
];

const HARAM_CATEGORIES: string[] = [
  "en:beers", "en:wines", "en:spirits", "en:alcoholic-beverages",
  "en:alcohol", "en:alcohols", "en:hard-ciders", "en:ciders",
  "en:champagnes", "en:sparkling-wines", "en:red-wines", "en:white-wines",
  "en:rosé-wines", "en:whiskies", "en:vodkas", "en:rums", "en:gins",
  "en:brandies", "en:liqueurs", "en:aperitifs", "en:sake",
  "en:bourbons", "en:meads", "en:malt-beverages",
  "fr:bieres", "fr:biere", "fr:vins", "fr:alcools",
  "fr:spiritueux", "fr:cidres-alcoolises",
  "en:pork", "en:pork-products", "en:pork-meats",
  "fr:porc", "fr:charcuteries", "fr:saucissons",
];

const HARAM_LABELS: string[] = [
  "pork", "alcohol", "wine", "beer", "en:non-halal",
  "en:contains-alcohol", "en:contains-pork",
];

const HALAL_LABELS: string[] = [
  "halal", "en:halal", "sans porc", "no pork",
  "certifié halal", "certified halal", "halal certified",
  "halal certified by", "fr:halal",
];

const HARAM_NAME_KEYWORDS: string[] = [
  "bière", "biere", "beer", "lager", "ale", "stout", "pilsner", "pilsen",
  "vin blanc", "vin rouge", "vin rosé", "champagne", "prosecco", "cava",
  "vodka", "whisky", "whiskey", "rhum", "rum", "gin", "cognac", "brandy",
  "liqueur", "calvados", "armagnac", "porto", "vermouth", "sake",
  "hard cider", "cidre alcool",
  "jambon", "lardons", "saucisson", "bacon", "prosciutto",
  "porc", "pork", "chorizo",
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
  return pattern.test(haystack);
}

function toTagsString(val: unknown): string {
  if (Array.isArray(val)) return (val as string[]).join(",").toLowerCase();
  if (typeof val === "string") return val.toLowerCase();
  return "";
}

function collectIngredientTexts(product: Record<string, unknown>): string {
  const texts: string[] = [];

  const textFields = [
    "ingredients_text_fr", "ingredients_text",
    "ingredients_text_en", "ingredients_text_de",
    "ingredients_text_es", "ingredients_text_it",
    "ingredients_text_nl", "ingredients_text_ar",
  ];
  for (const field of textFields) {
    const v = product[field];
    if (typeof v === "string" && v.trim()) {
      texts.push(v.trim());
    }
  }

  const ingredientsArr = product["ingredients"];
  if (Array.isArray(ingredientsArr)) {
    for (const ing of ingredientsArr) {
      if (ing && typeof ing === "object") {
        const obj = ing as Record<string, unknown>;
        const t = obj["text"] ?? obj["id"] ?? "";
        if (typeof t === "string" && t.trim()) texts.push(t.trim());
        const subIngs = obj["ingredients"];
        if (Array.isArray(subIngs)) {
          for (const sub of subIngs) {
            if (sub && typeof sub === "object") {
              const s = (sub as Record<string, unknown>)["text"];
              if (typeof s === "string" && s.trim()) texts.push(s.trim());
            }
          }
        }
      }
    }
  }

  return texts.join(" , ");
}

type HalalResult = "halal" | "haram" | "warning" | "unknown";

interface AnalysisResult {
  result: HalalResult;
  productName: string;
  reason: string;
  foundInDatabase: boolean;
  hasIngredients: boolean;
}

function analyzeProduct(product: Record<string, unknown>): AnalysisResult {
  const productName =
    (product["product_name_fr"] as string) ||
    (product["product_name"] as string) ||
    (product["product_name_en"] as string) ||
    (product["generic_name_fr"] as string) ||
    (product["generic_name"] as string) ||
    "Produit sans nom";

  // 1. Explicit labels
  const labels =
    toTagsString(product["labels_tags"]) + "," +
    toTagsString(product["labels"]);

  for (const l of HARAM_LABELS) {
    if (labels.includes(l)) {
      return { result: "haram", productName, reason: `Label: ${l}`, foundInDatabase: true, hasIngredients: true };
    }
  }
  for (const l of HALAL_LABELS) {
    if (labels.includes(l)) {
      return { result: "halal", productName, reason: "Certifié halal", foundInDatabase: true, hasIngredients: true };
    }
  }

  // 2. Categories
  const categories = toTagsString(product["categories_tags"]);
  for (const cat of HARAM_CATEGORIES) {
    if (categories.includes(cat)) {
      return { result: "haram", productName, reason: `Catégorie: ${cat}`, foundInDatabase: true, hasIngredients: true };
    }
  }

  // 3. Alcohol content
  const nutriments = product["nutriments"] as Record<string, unknown> | undefined;
  if (nutriments) {
    const alc = Number(nutriments["alcohol_100g"] ?? nutriments["alcohol"] ?? 0);
    if (alc > 0) {
      return { result: "haram", productName, reason: `Contient de l'alcool (${alc}%)`, foundInDatabase: true, hasIngredients: true };
    }
  }

  // 4. Product name keywords
  const nameLower = normalise(productName);
  const genericName = normalise(
    ((product["generic_name_fr"] as string) || (product["generic_name"] as string) || "")
  );
  for (const kw of HARAM_NAME_KEYWORDS) {
    if (nameLower.includes(normalise(kw)) || genericName.includes(normalise(kw))) {
      return { result: "haram", productName, reason: `Nom du produit: "${kw}"`, foundInDatabase: true, hasIngredients: true };
    }
  }

  // 5. Allergens
  const allergens = toTagsString(product["allergens_tags"]);
  if (allergens.includes("en:pork") || allergens.includes("fr:porc")) {
    return { result: "haram", productName, reason: "Allergène: porc", foundInDatabase: true, hasIngredients: true };
  }

  // 6. Full ingredient text (all languages + structured array)
  const rawIngredients = collectIngredientTexts(product);
  const hasIngredients = rawIngredients.trim().length > 0;

  if (!hasIngredients) {
    return { result: "unknown", productName, reason: "Aucun ingrédient renseigné dans la base de données", foundInDatabase: true, hasIngredients: false };
  }

  const ingredients = normalise(rawIngredients);

  for (const ing of HARAM_INGREDIENTS) {
    if (containsTerm(ingredients, normalise(ing))) {
      return { result: "haram", productName, reason: `Ingrédient interdit: "${ing}"`, foundInDatabase: true, hasIngredients: true };
    }
  }
  for (const ing of WARNING_INGREDIENTS) {
    if (containsTerm(ingredients, normalise(ing))) {
      return { result: "warning", productName, reason: `Ingrédient à vérifier: "${ing}"`, foundInDatabase: true, hasIngredients: true };
    }
  }

  return { result: "halal", productName, reason: "Aucun ingrédient interdit détecté", foundInDatabase: true, hasIngredients: true };
}

// ─── route ────────────────────────────────────────────────────────────────────

router.get("/halal/analyze/:barcode", async (req, res) => {
  const { barcode } = req.params;

  if (!barcode || !/^[\d]+$/.test(barcode)) {
    res.status(400).json({ error: "Code-barres invalide" });
    return;
  }

  let product: Record<string, unknown> | null = null;

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    const response = await fetch(url, {
      headers: { "User-Agent": "HalalScan/1.0 (contact@halalscan.app)" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`OpenFoodFacts HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      status: number;
      product?: Record<string, unknown>;
    };

    if (json.status === 1 && json.product) {
      product = json.product;
    }
  } catch (err) {
    req.log.warn({ err, barcode }, "OpenFoodFacts fetch failed");
    res.status(502).json({ error: "Impossible de contacter OpenFoodFacts. Vérifiez votre connexion." });
    return;
  }

  if (!product) {
    res.json({
      result: "unknown",
      productName: "Produit non trouvé",
      reason: "Ce produit n'existe pas dans la base de données OpenFoodFacts",
      foundInDatabase: false,
      hasIngredients: false,
    } satisfies AnalysisResult);
    return;
  }

  const analysis = analyzeProduct(product);
  res.json(analysis);
});

export default router;
