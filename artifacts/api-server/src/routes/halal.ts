import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ─── restriction & classification lists ──────────────────────────────────────

const HARAM_INGREDIENTS: string[] = [
  // ── pork & derivatives (FR) ──
  "porc", "viande de porc", "graisse de porc", "gras de porc",
  "couenne de porc", "couenne", "saindoux", "lard", "lardons",
  "bacon", "jambon", "jambon blanc", "jambon de pays", "prosciutto",
  "pancetta", "coppa", "mortadelle", "saucisson", "saucisson sec",
  "rillettes", "rillons", "chipolata", "boudin noir", "andouille",
  "andouillette", "filet mignon de porc", "cote de porc", "poitrine de porc",
  "jarret de porc", "epaule de porc", "longe de porc",
  "gelatine de porc", "gelatine porcine", "proteines de porc",
  "proteines de peau de porc", "collagene de porc",
  "enzymes porcines", "extrait de porc", "graisse animale de porc",
  // ── pork (EN) ──
  "pork", "pig", "swine", "ham", "pork lard", "fatback", "pork belly",
  "pork rind", "crackling", "pepperoni", "pork gelatin", "pork collagen",
  "pork fat", "pork skin", "lard", "pork rinds",
  // ── pork (DE) ──
  "schwein", "schweinefleisch", "speck", "schinken", "schweineschmalz",
  "schweinebauch", "schweinefett", "schmalz",
  // ── pork (IT) ──
  "maiale", "carne di maiale", "grasso di maiale", "strutto",
  // ── pork (ES) ──
  "cerdo", "carne de cerdo", "grasa de cerdo", "jamon", "tocino",
  "chicharron", "chorizo", "morcilla", "manteca de cerdo",
  // ── pork (NL) ──
  "varken", "varkensvlees", "varkensspek", "varkensvet",
  // ── pork (PL) ──
  "wieprzowina", "slonina", "szynka wieprzowa",
  // ── pork (PT) ──
  "porco", "toucinho", "linguica", "chourico",
  // ── pork (AR transliteration) ──
  "khinzir", "lahm khinzir",
  // ── alcohol — FR (standalone + compounds) ──
  "alcool",           // standalone — catch-all for ANY alcohol listing
  "alcool ethylique", "ethanol",
  "alcool de grain", "alcool de vin", "alcool modifie",
  "vin",              // standalone wine
  "vin blanc", "vin rouge", "vin rose", "vin de cuisine",
  "biere", "malt de biere", "biere d orge",
  "rhum", "vodka", "whisky", "whiskey", "cognac", "brandy", "liqueur",
  "gin", "champagne", "cremant", "prosecco", "cava", "porto",
  "vermouth", "sake", "cidre alcoolise", "calvados", "armagnac",
  "kirsch", "schnapps", "absinthe", "pastis",
  "anisette", "amaretto", "schnaps",
  // ── alcohol (EN) ──
  "alcohol", "ethyl alcohol", "rum", "bourbon", "mead",
  "hard cider", "spirits", "spirit", "wine spirits", "beer extract",
  "wine", "beer", "cider",
  // ── alcohol (DE) ──
  "alkohol", "wein", "weinbrand", "bier",
  // ── alcohol (IT) ──
  "alcol", "vino", "birra", "grappa",
  // ── alcohol (ES) ──
  "aguardiente", "vino", "cerveza",
  // ── blood (FR/EN/DE) ──
  "sang de boeuf", "sang de porc", "sang", "plasma sanguin",
  "serum sanguin", "blood plasma", "blood serum", "albumine de sang",
  "blutplasma", "blut",
  // ── gelatin — pork/unspecified + collagen ──
  "gelatine de porc", "pork gelatin", "gelatine porcine",
  "collagene", "collagen", "peptides de collagene", "collagen peptides",
  "gelatine hydrolysee", "gelatine hydrolyse", "hydrolyzed gelatin",
  "hydrolysed gelatin", "gelatine partiellement hydrolysee",
  // ── emulsifiers — animal-derived fatty acid esters (E471–E479b) ──
  "e471", "mono et diglycerides d acides gras",
  "monoglycerides", "diglycerides", "mono and diglycerides",
  "e472a", "e472b", "e472c", "e472d", "e472e", "e472f",
  "e473", "e474", "e475", "e476", "e477", "e478", "e479b",
  // ── glycerine / glycerol & derivatives ──
  "e422", "glycerine", "glycerol",
  "monostearate de glycerine", "distearate de glycerine",
  "glyceryl monostearate",
  // ── triacetine ──
  "e1518", "triacetin", "triacetine",
  // ── fatty acids & stearates ──
  "e570", "acide stearique", "stearic acid", "stearine",
  "e470a", "e470b", "stearate", "esters d acides gras",
  // ── haram e-numbers ──
  "e441",   // gelatin (pork/bovine, unspecified)
  "e542",   // bone phosphate (from animal bone)
];

// These are the haram terms that include "gelatine" / "gelatin" without a safe qualifier.
// They are checked AFTER the masking step removes safe compounds.
const HARAM_GELATIN_TERMS: string[] = [
  "gelatine", "gelatine hydrolyse", "proteines de gelatine",
  "gelatin", "gelatina",
];

const WARNING_INGREDIENTS: string[] = [
  // ── l-cysteine ──
  "e920", "l cysteine", "cysteine",
  // ── rennet / présure ──
  "presure", "rennet", "rennin", "presure animale",
  "enzymes de coagulation", "chymosin",
  // ── insect-derived colorings ──
  "e120", "carmin", "carmine", "cochenille",
  "rouge cochenille", "acide carminique", "carminic acid",
  "e904", "shellac", "laque de gomme",
  // ── nucleotides (may be from meat/yeast) ──
  "e627", "disodium guanylate", "guanylate disodique",
  "e631", "disodium inosinate", "inosinate disodique",
  "e635", "disodium ribonucleotides", "ribonucleotides disodiques",
  // ── natural flavors (source unknown) ──
  "aromes naturels", "arome naturel", "natural flavors",
  "natural flavour", "naturliche aromen",
  "aroma naturale", "aromas naturales",
  // ── whey / casein (animal origin, may contain rennet) ──
  "lactoserum", "whey", "caseine", "casein",
  // ── tallow / suif ──
  "suif", "tallow", "beef tallow", "graisse animale",
  // ── malt extract ──
  "extrait de malt",
  // ── carmine variants ──
  "e124",
];

const HARAM_CATEGORIES: string[] = [
  "en:beers", "en:wines", "en:spirits", "en:alcoholic-beverages",
  "en:alcohol", "en:alcohols", "en:hard-ciders", "en:ciders",
  "en:champagnes", "en:sparkling-wines", "en:red-wines", "en:white-wines",
  "en:rose-wines", "en:whiskies", "en:vodkas", "en:rums", "en:gins",
  "en:brandies", "en:liqueurs", "en:aperitifs", "en:sake",
  "en:bourbons", "en:meads", "en:malt-beverages", "en:cocktails",
  "fr:bieres", "fr:biere", "fr:vins", "fr:alcools",
  "fr:spiritueux", "fr:cidres-alcoolises", "fr:cocktails",
  "en:pork", "en:pork-products", "en:pork-meats",
  "fr:porc", "fr:charcuteries", "fr:saucissons",
];

const HARAM_LABELS: string[] = [
  "pork", "alcohol", "wine", "beer", "en:non-halal",
  "en:contains-alcohol", "en:contains-pork",
];

const HALAL_LABELS: string[] = [
  "halal", "en:halal", "sans porc", "no pork",
  "certifie halal", "certified halal", "halal certified",
  "halal certified by", "fr:halal",
  "fr:certifie-halal", "en:halal-certified",
];

const HARAM_NAME_KEYWORDS: string[] = [
  "biere", "beer", "lager", "ale", "stout", "pilsner", "pilsen",
  "vin blanc", "vin rouge", "vin rose", "champagne", "prosecco", "cava",
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
  "brands",
  "quantity",
].join(",");

// Country-specific OpenFoodFacts mirrors — tried in parallel for maximum coverage
const OFF_COUNTRY_MIRRORS = [
  "fr", "de", "it", "es", "be", "uk", "nl", "at", "ch", "us", "ma", "dz", "tn",
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalise(text: string): string {
  let s = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Compact E-code notation: "e 471" or "e  471" → "e471"
  // This ensures "E 471" in ingredient lists matches "e471" in our check lists
  s = s.replace(/\be\s+(\d+[a-z]?)\b/g, "e$1");
  return s;
}

/** Word-boundary aware containment check */
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

  // Fall back to best available text field (split by comma/semicolon)
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

// ─── compound masking ────────────────────────────────────────────────────────
//
// IMPORTANT: These safe compound phrases are neutralised BEFORE haram/warning
// checks to prevent false positives. Longer/more-specific phrases are listed
// first so they match before their shorter sub-phrases.

interface MaskResult {
  maskedText: string;
  /** Found gelatine from bovine source (→ warning) */
  bovineGelatin: boolean;
  /** Found gelatine from fish source (→ warning) */
  fishGelatin: boolean;
}

/** Replace safe compound phrases with a neutral token, return what was found. */
function maskSafeCompounds(normText: string): MaskResult {
  let text = normText;
  let bovineGelatin = false;
  let fishGelatin = false;

  const replaceAll = (t: string, phrase: string) =>
    t.split(phrase).join(" __SAFE__ ");

  // ── Vinegar (all forms) — alcohol fully converted to acetic acid → halal ──
  // NOTE: must be masked BEFORE bare "vin", "alcool", "biere" checks
  const vinegarPhrases = [
    "vinaigre de vin blanc", "vinaigre de vin rouge", "vinaigre de vin",
    "vinaigre balsamique", "vinaigre de cidre", "vinaigre de biere",
    "vinaigre de malt", "vinaigre de riz", "vinaigre de fruits",
    "vinaigre d alcool", "vinaigre blanc", "vinaigre",
    "vinegar", "aceto balsamico", "aceto di vino",
    "wine vinegar", "cider vinegar", "balsamic vinegar",
    "apfelessig", "weinessig", "weissweinessig", "rotweinessig",
    "apple cider vinegar",
  ];
  for (const p of vinegarPhrases) text = replaceAll(text, p);

  // ── Brewer's yeast — it is yeast, not beer → halal ──
  const brewersYeast = [
    "levure de biere", "levures de biere", "extrait de levure de biere",
    "hefeextrakt", "bierhefe", "brewer s yeast", "brewers yeast",
    "lievito di birra", "levure boulangere", "levure seche",
    "dried yeast", "yeast extract",
  ];
  for (const p of brewersYeast) text = replaceAll(text, p);

  // ── Vegetable / fruit / seaweed gelatin — halal ──
  const vegGelatin = [
    "gelatine vegetale", "gelatine de fruits", "gelatine de fruit",
    "gelatine de riz", "gelatine d algues",
    "vegetable gelatin", "vegetable gelatine",
    "agar agar", "agar-agar", "gelatine agar",
  ];
  for (const p of vegGelatin) text = replaceAll(text, p);

  // ── Fish gelatin — debatable (most scholars allow fish, mark as warning) ──
  const fishGelPhrases = [
    "gelatine de poisson", "fish gelatin", "fish gelatine",
    "collagene de poisson", "fish collagen",
    "gelatine de saumon", "gelatine de thon", "gelatine de cabillaud",
  ];
  for (const p of fishGelPhrases) {
    if (text.includes(p)) { fishGelatin = true; text = replaceAll(text, p); }
  }

  // ── Bovine gelatin — requires halal slaughter, unverifiable → warning ──
  const bovineGelPhrases = [
    "gelatine bovine", "bovine gelatin", "bovine gelatine",
    "beef gelatin", "beef gelatine",
    "gelatine de boeuf", "gelatine de veau",
    "collagene bovin", "collagen bovin",
  ];
  for (const p of bovineGelPhrases) {
    if (text.includes(p)) { bovineGelatin = true; text = replaceAll(text, p); }
  }

  // ── Malt used as flour/starch (non-alcoholic food use) ──
  const malt = [
    "farine de malt", "amidon de malt", "farine d orge maltee",
    "extrait de malt d orge", "germe de malt", "malt d orge",
  ];
  for (const p of malt) text = replaceAll(text, p);

  // ── Alcohol-derived acids that are fully transformed (halal) ──
  const safeAcids = [
    "acide acetique", "acetic acid", // fermentation product
    "acide lactique", "lactic acid",
    "acide citrique", "citric acid",
  ];
  for (const p of safeAcids) text = replaceAll(text, p);

  // ── Vanilla / rum flavouring (non-alcoholic extracts used as aroma) ──
  // These are listed in France as "arôme naturel de vanille" or "arôme rhum"
  // They are already caught by the WARNING_INGREDIENTS "aromes naturels" check
  // so we do NOT mask them here — we want the warning to fire.

  return { maskedText: text, bovineGelatin, fishGelatin };
}

// ─── main analysis ────────────────────────────────────────────────────────────

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

  // 1 ── Explicit labels ───────────────────────────────────────────────────────
  const labels =
    toTagsString(product["labels_tags"]) + "," +
    toTagsString(product["labels"]);
  const normLabels = normalise(labels);

  for (const l of HARAM_LABELS) {
    if (normLabels.includes(normalise(l))) {
      return {
        result: "haram", productName,
        reason: `Label: ${l}`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }
  for (const l of HALAL_LABELS) {
    if (normLabels.includes(normalise(l))) {
      return {
        result: "halal", productName,
        reason: "Certifié halal",
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 2 ── Haram categories ──────────────────────────────────────────────────────
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

  // 3 ── Alcohol content (nutriments) ─────────────────────────────────────────
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

  // 4 ── Product name haram keywords ──────────────────────────────────────────
  const nameLower = normalise(productName);
  const genericName = normalise(
    ((product["generic_name_fr"] as string) || (product["generic_name"] as string) || "")
  );
  // Use word-boundary containsTerm (not .includes) to avoid matching substrings:
  // "ale" inside "minerale/naturale", "vin" inside "ravine", "gin" inside "origine", etc.
  for (const kw of HARAM_NAME_KEYWORDS) {
    const normKw = normalise(kw);
    if (containsTerm(nameLower, normKw) || containsTerm(genericName, normKw)) {
      return {
        result: "haram", productName,
        reason: `Nom du produit: "${kw}"`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 5 ── Allergens ─────────────────────────────────────────────────────────────
  const allergens = toTagsString(product["allergens_tags"]);
  if (allergens.includes("en:pork") || allergens.includes("fr:porc")) {
    return {
      result: "haram", productName,
      reason: "Allergène: porc",
      foundInDatabase: true, hasIngredients: true,
      ingredientsText, ingredientsList,
    };
  }

  // 6 ── Ingredient text analysis ──────────────────────────────────────────────
  const hasIngredients = ingredientsText.trim().length > 0;

  if (!hasIngredients) {
    return {
      result: "unknown", productName,
      reason: "Aucun ingrédient renseigné dans la base de données",
      foundInDatabase: true, hasIngredients: false,
    };
  }

  // Normalise and MASK safe compounds first to prevent false positives
  const normRaw = normalise(ingredientsText);
  const { maskedText: ingredients, bovineGelatin, fishGelatin } = maskSafeCompounds(normRaw);

  // 6a – Haram terms (explicit pork/alcohol/blood/etc.)
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

  // 6b – Unspecified gelatin (not fish/bovine/vegetable — those are masked already)
  for (const g of HARAM_GELATIN_TERMS) {
    if (containsTerm(ingredients, normalise(g))) {
      return {
        result: "haram", productName,
        reason: `Gélatine d'origine non précisée (risque élevé): "${g}"`,
        foundInDatabase: true, hasIngredients: true,
        ingredientsText, ingredientsList,
      };
    }
  }

  // 6c – Warning ingredients
  const detectedWarnings: string[] = [];

  // Fish/bovine gelatin detected during masking → warning
  if (fishGelatin) detectedWarnings.push("gélatine de poisson (origine poisson)");
  if (bovineGelatin) detectedWarnings.push("gélatine bovine (abattage non certifié)");

  for (const ing of WARNING_INGREDIENTS) {
    if (containsTerm(ingredients, normalise(ing))) {
      detectedWarnings.push(ing);
    }
  }

  if (detectedWarnings.length > 0) {
    return {
      result: "warning", productName,
      reason: `À vérifier: ${detectedWarnings.slice(0, 3).join(", ")}`,
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

// ─── fetch helpers ─────────────────────────────────────────────────────────────

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

/** Score a product by richness of ingredient data (higher = better) */
function ingredientScore(product: Record<string, unknown>): number {
  let score = 0;
  for (const field of INGREDIENT_TEXT_FIELDS) {
    const v = product[field];
    if (typeof v === "string" && v.trim().length > 5) score += v.trim().length;
  }
  const arr = product["ingredients"];
  if (Array.isArray(arr)) score += arr.length * 10;
  return score;
}

/** Merge ingredient data from a mirror into a base product */
function mergeIngredients(
  base: Record<string, unknown>,
  source: Record<string, unknown>
): void {
  for (const field of INGREDIENT_TEXT_FIELDS) {
    if (!base[field] && source[field]) base[field] = source[field];
  }
  if (!hasUsableIngredients(base) && source["ingredients"]) {
    base["ingredients"] = source["ingredients"];
  }
  // Also merge labels/categories if missing
  if (!base["labels_tags"] && source["labels_tags"]) base["labels_tags"] = source["labels_tags"];
  if (!base["categories_tags"] && source["categories_tags"]) base["categories_tags"] = source["categories_tags"];
  if (!base["allergens_tags"] && source["allergens_tags"]) base["allergens_tags"] = source["allergens_tags"];
  if (!base["nutriments"] && source["nutriments"]) base["nutriments"] = source["nutriments"];
}

/** Try UPCitemdb as a last-resort fallback to get at least a product name */
async function fetchProductNameFromUPCItemDB(barcode: string): Promise<string | null> {
  // Only valid for numeric (UPC/EAN) codes
  if (!/^\d+$/.test(barcode)) return null;
  try {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "HalalScan/1.0 (contact@halalscan.app)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      code?: string;
      items?: Array<{ title?: string; brand?: string; description?: string }>;
    };
    if (json.code === "OK" && json.items && json.items.length > 0) {
      const item = json.items[0];
      return item.title || item.brand || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── route ─────────────────────────────────────────────────────────────────────

router.get("/halal/analyze/:barcode", async (req, res) => {
  const { barcode } = req.params;

  // Allow numeric EAN/UPC codes and alphanumeric codes (Code128/Code39)
  if (!barcode || !/^[a-zA-Z0-9-]{1,50}$/.test(barcode)) {
    res.status(400).json({ error: "Code-barres invalide" });
    return;
  }

  let product: Record<string, unknown> | null = null;
  const isNumericBarcode = /^\d+$/.test(barcode);

  // Step 1: Query world AND french mirror simultaneously (fastest path)
  const worldUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
  const frUrl = `https://fr.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;

  const [worldProduct, frProduct] = await Promise.all([
    fetchFromOFF(worldUrl),
    fetchFromOFF(frUrl),
  ]);

  // Pick the richest result or merge both
  if (worldProduct && frProduct) {
    const worldScore = ingredientScore(worldProduct);
    const frScore = ingredientScore(frProduct);
    product = worldScore >= frScore ? worldProduct : frProduct;
    // Merge missing fields from the other source
    const other = worldScore >= frScore ? frProduct : worldProduct;
    mergeIngredients(product, other);
  } else {
    product = worldProduct ?? frProduct;
  }

  // Step 2: If found but still missing ingredients, query ALL country mirrors in parallel
  if (product && !hasUsableIngredients(product)) {
    req.log.info({ barcode }, "No ingredients from primary endpoints, querying all country mirrors");

    const mirrorResults = await Promise.all(
      OFF_COUNTRY_MIRRORS
        .filter(c => c !== "fr") // fr already tried
        .map(async (country) => {
          const url = `https://${country}.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
          return fetchFromOFF(url);
        })
    );

    for (const mirror of mirrorResults) {
      if (mirror && hasUsableIngredients(mirror)) {
        mergeIngredients(product, mirror);
        if (hasUsableIngredients(product)) {
          req.log.info({ barcode }, "Ingredients found from country mirror");
          break;
        }
      }
    }
  }

  // Step 3: product not found at all — try v0 API and v2/world simultaneously
  if (!product) {
    const v0Url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const v0Product = await fetchFromOFF(v0Url);
    if (v0Product) product = v0Product;
  }

  // Step 4: Still not found — try UPCitemdb for a product name (numeric codes only)
  if (!product) {
    const externalName = isNumericBarcode
      ? await fetchProductNameFromUPCItemDB(barcode)
      : null;

    res.json({
      result: "unknown",
      productName: externalName || "Produit non référencé",
      reason: externalName
        ? `Produit trouvé (${externalName}) mais ingrédients non disponibles`
        : "Ce produit n'est pas référencé dans les bases de données disponibles",
      foundInDatabase: !!externalName,
      hasIngredients: false,
    } satisfies AnalysisResult);
    return;
  }

  const analysis = analyzeProduct(product);
  res.json(analysis);
});

export default router;
