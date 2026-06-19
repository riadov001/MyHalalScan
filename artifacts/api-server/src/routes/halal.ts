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
  "pork fat", "pork skin", "lard",
  // ── pork (DE) ──
  "schwein", "schweinefleisch", "speck", "schinken", "schweineschmalz",
  "schweinebauch", "schweinefett",
  // ── pork (IT) ──
  "maiale", "carne di maiale", "grasso di maiale", "pancetta di maiale",
  // ── pork (ES) ──
  "cerdo", "carne de cerdo", "grasa de cerdo", "jamón", "tocino",
  "chicharrón", "chorizo", "morcilla",
  // ── pork (NL) ──
  "varken", "varkensvlees", "varkensspek", "varkensvet",
  // ── pork (PL) ──
  "wieprzowina", "słonina", "szynka wieprzowa",
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
  "alcohol", "ethyl alcohol", "wine", "beer", "rum", "vodka", "whiskey",
  "whisky", "cognac", "brandy", "liqueur", "gin", "champagne", "sake",
  "mead", "hard cider", "spirits", "bourbon", "cider",
  // ── alcohol (DE) ──
  "alkohol", "ethanol", "wein", "bier", "weinbrand",
  // ── alcohol (IT) ──
  "alcol", "vino", "birra", "rum", "grappa",
  // ── alcohol (ES) ──
  "alcohol", "vino", "cerveza", "ron", "aguardiente",
  // ── blood (FR/EN) ──
  "sang", "sang de bœuf", "sang de porc", "plasma sanguin",
  "sérum sanguin", "blood", "blood plasma", "blood serum", "albumine de sang",
  // ── blood (DE) ──
  "blut", "blutplasma",
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
  "enzymes de coagulation", "lab-ferment", "chymosin",
  // ── insect-derived colorings ──
  "e120", "carmin", "carmine", "cochenille",
  "rouge cochenille", "acide carminique", "carminic acid",
  "e904", "shellac", "laque de gomme",
  // ── natural flavors (source unknown) ──
  "arômes naturels", "arôme naturel", "natural flavors",
  "natural flavour", "natural flavor", "natürliche aromen",
  "aroma naturale", "aromas naturales",
  // ── gelatin bovine / unspecified (if not in haram list already) ──
  "gélatine bovine", "bovine gelatin", "beef gelatin",
  "collagène", "collagen", "peptides de collagène",
  // ── whey / casein ──
  "lactosérum", "whey", "caséine", "casein",
  // ── tallow / suif ──
  "suif", "tallow", "beef tallow",
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
  "schwein", "speck", "schinken",
];

// All language ingredient fields to check
const INGREDIENT_TEXT_FIELDS = [
  "ingredients_text_fr", "ingredients_text",
  "ingredients_text_en", "ingredients_text_de",
  "ingredients_text_it", "ingredients_text_es",
  "ingredients_text_nl", "ingredients_text_ar",
  "ingredients_text_pt", "ingredients_text_pl",
  "ingredients_text_ro", "ingredients_text_cs",
  "ingredients_text_sk", "ingredients_text_hu",
  "ingredients_text_da", "ingredients_text_sv",
  "ingredients_text_fi", "ingredients_text_no",
];

// Fields to request from OpenFoodFacts API
const OFF_FIELDS = [
  "product_name", "product_name_fr", "product_name_en", "product_name_de",
  "product_name_it", "product_name_es", "product_name_nl",
  "generic_name", "generic_name_fr", "generic_name_en",
  ...INGREDIENT_TEXT_FIELDS,
  "ingredients",
  "labels_tags", "labels",
  "categories_tags",
  "nutriments",
  "allergens_tags",
].join(",");

// Country-specific OpenFoodFacts mirrors to try as fallbacks
const OFF_COUNTRY_MIRRORS = [
  "fr", "de", "it", "es", "be", "uk", "nl", "at", "ch",
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

  for (const field of INGREDIENT_TEXT_FIELDS) {
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

function parseIngredientsList(product: Record<string, unknown>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  // Try structured ingredients array first (best quality)
  const ingredientsArr = product["ingredients"];
  if (Array.isArray(ingredientsArr) && ingredientsArr.length > 0) {
    for (const ing of ingredientsArr) {
      if (ing && typeof ing === "object") {
        const obj = ing as Record<string, unknown>;
        const text = (obj["text"] as string) ?? "";
        if (text && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          result.push(text);
          const subIngs = obj["ingredients"];
          if (Array.isArray(subIngs)) {
            for (const sub of subIngs) {
              if (sub && typeof sub === "object") {
                const s = (sub as Record<string, unknown>)["text"] as string;
                if (s && !seen.has(s.toLowerCase())) {
                  seen.add(s.toLowerCase());
                  result.push(`  • ${s}`);
                }
              }
            }
          }
        }
      }
    }
    if (result.length > 0) return result;
  }

  // Fall back to best available text field
  for (const field of INGREDIENT_TEXT_FIELDS) {
    const v = product[field];
    if (typeof v === "string" && v.trim()) {
      return v
        .split(/[,;]\s*/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 60);
    }
  }

  return result;
}

type HalalResult = "halal" | "haram" | "warning" | "unknown";

interface AnalysisResult {
  result: HalalResult;
  productName: string;
  reason: string;
  foundInDatabase: boolean;
  hasIngredients: boolean;
  ingredientsText?: string;
  ingredientsList?: string[];
}

function analyzeProduct(product: Record<string, unknown>): AnalysisResult {
  const productName =
    (product["product_name_fr"] as string) ||
    (product["product_name"] as string) ||
    (product["product_name_en"] as string) ||
    (product["product_name_de"] as string) ||
    (product["product_name_it"] as string) ||
    (product["product_name_es"] as string) ||
    (product["generic_name_fr"] as string) ||
    (product["generic_name"] as string) ||
    "Produit sans nom";

  const ingredientsText = collectIngredientTexts(product);
  const ingredientsList = parseIngredientsList(product);

  // 1. Explicit labels
  const labels =
    toTagsString(product["labels_tags"]) + "," +
    toTagsString(product["labels"]);

  for (const l of HARAM_LABELS) {
    if (labels.includes(l)) {
      return {
        result: "haram", productName,
        reason: `Label: ${l}`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }
  for (const l of HALAL_LABELS) {
    if (labels.includes(l)) {
      return {
        result: "halal", productName,
        reason: "Certifié halal",
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 2. Categories
  const categories = toTagsString(product["categories_tags"]);
  for (const cat of HARAM_CATEGORIES) {
    if (categories.includes(cat)) {
      return {
        result: "haram", productName,
        reason: `Catégorie: ${cat.replace(/^(en|fr):/, "")}`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 3. Alcohol content
  const nutriments = product["nutriments"] as Record<string, unknown> | undefined;
  if (nutriments) {
    const alc = Number(nutriments["alcohol_100g"] ?? nutriments["alcohol"] ?? 0);
    if (alc > 0) {
      return {
        result: "haram", productName,
        reason: `Contient de l'alcool (${alc}%)`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 4. Product name keywords
  const nameLower = normalise(productName);
  const genericName = normalise(
    ((product["generic_name_fr"] as string) || (product["generic_name"] as string) || "")
  );
  for (const kw of HARAM_NAME_KEYWORDS) {
    if (nameLower.includes(normalise(kw)) || genericName.includes(normalise(kw))) {
      return {
        result: "haram", productName,
        reason: `Nom du produit: "${kw}"`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 5. Allergens
  const allergens = toTagsString(product["allergens_tags"]);
  if (allergens.includes("en:pork") || allergens.includes("fr:porc")) {
    return {
      result: "haram", productName,
      reason: "Allergène: porc",
      foundInDatabase: true, hasIngredients: true,
      ingredientsText, ingredientsList,
    };
  }

  // 6. Full ingredient text (all languages + structured array)
  const hasIngredients = ingredientsText.trim().length > 0;

  if (!hasIngredients) {
    return {
      result: "unknown", productName,
      reason: "Aucun ingrédient renseigné dans la base de données",
      foundInDatabase: true, hasIngredients: false,
    };
  }

  const ingredients = normalise(ingredientsText);

  for (const ing of HARAM_INGREDIENTS) {
    if (containsTerm(ingredients, normalise(ing))) {
      return {
        result: "haram", productName,
        reason: `Ingrédient interdit: "${ing}"`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  const detectedWarnings: string[] = [];
  for (const ing of WARNING_INGREDIENTS) {
    if (containsTerm(ingredients, normalise(ing))) {
      detectedWarnings.push(ing);
    }
  }
  if (detectedWarnings.length > 0) {
    return {
      result: "warning", productName,
      reason: `Ingrédient(s) à vérifier: ${detectedWarnings.slice(0, 3).join(", ")}`,
      foundInDatabase: true, hasIngredients: true,
      ingredientsText, ingredientsList,
    };
  }

  return {
    result: "halal", productName,
    reason: "Aucun ingrédient interdit détecté",
    foundInDatabase: true, hasIngredients: true,
    ingredientsText, ingredientsList,
  };
}

// ─── fetch helpers ────────────────────────────────────────────────────────────

async function fetchFromOFF(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "HalalScan/1.0 (contact@halalscan.app)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      status: number;
      product?: Record<string, unknown>;
    };
    if (json.status === 1 && json.product) return json.product;
    return null;
  } catch {
    return null;
  }
}

function hasUsableIngredients(product: Record<string, unknown>): boolean {
  for (const field of INGREDIENT_TEXT_FIELDS) {
    const v = product[field];
    if (typeof v === "string" && v.trim().length > 5) return true;
  }
  const arr = product["ingredients"];
  if (Array.isArray(arr) && arr.length > 0) return true;
  return false;
}

// ─── route ────────────────────────────────────────────────────────────────────

router.get("/halal/analyze/:barcode", async (req, res) => {
  const { barcode } = req.params;

  if (!barcode || !/^[\d]+$/.test(barcode)) {
    res.status(400).json({ error: "Code-barres invalide" });
    return;
  }

  let product: Record<string, unknown> | null = null;

  // Step 1: try world endpoint with explicit fields
  const worldUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
  product = await fetchFromOFF(worldUrl);

  // Step 2: if found but no ingredients, try country-specific mirrors
  if (product && !hasUsableIngredients(product)) {
    req.log.info({ barcode }, "No ingredients from world endpoint, trying country mirrors");
    for (const country of OFF_COUNTRY_MIRRORS) {
      const countryUrl = `https://${country}.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
      const countryProduct = await fetchFromOFF(countryUrl);
      if (countryProduct && hasUsableIngredients(countryProduct)) {
        // Merge: keep world data but replace empty ingredient fields with country data
        for (const field of INGREDIENT_TEXT_FIELDS) {
          if (!product[field] && countryProduct[field]) {
            product[field] = countryProduct[field];
          }
        }
        if (!hasUsableIngredients(product) && countryProduct["ingredients"]) {
          product["ingredients"] = countryProduct["ingredients"];
        }
        req.log.info({ barcode, country }, "Found ingredients from country mirror");
        break;
      }
    }
  }

  // Step 3: if still not found, try world endpoint without fields restriction (v0)
  if (!product) {
    const v0Url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    product = await fetchFromOFF(v0Url);
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
