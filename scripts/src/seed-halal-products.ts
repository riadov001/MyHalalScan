/**
 * Seed the halal_products table so the app always has an instant, offline-capable
 * halal/haram product list — this is the "Step 0" internal DB the API server checks
 * before ever calling out to OpenFoodFacts or AI.
 *
 * Run with: pnpm --filter @workspace/scripts run seed-halal
 *
 * Trusted sources (OpenFoodFacts — the only large-scale open, license-free food
 * database with structured halal/pork/alcohol labelling; queried across every
 * regional mirror for maximum coverage, not just fr/world):
 *   1. HALAL — products explicitly labelled "halal" (and halal-certifier variants
 *      like "halal-avs", "halal-lmcc", etc., matched via tag_contains) across all
 *      country mirrors below.
 *   2. HARAM — products in unambiguous pork/alcohol categories across all mirrors,
 *      so obviously-forbidden products also resolve instantly without a network
 *      round-trip to OFF/AI at scan time.
 */
import { db } from "@workspace/db";
import { halalProductsTable, type InsertHalalProduct } from "@workspace/db";
import { sql, count } from "drizzle-orm";

const OFF_FIELDS = "code,product_name,product_name_fr,brands,labels_tags,categories_tags";
const PAGE_SIZE = 500;
const MAX_PAGES = 20; // max 10 000 products per run/tag/mirror

// Every OFF regional mirror worth querying for halal-relevant products —
// mirrors the coverage already used at scan time in the API server (halal.ts).
// Overridable via SEED_MIRRORS="world,fr" so a run can be split into several
// shorter invocations (each pass is idempotent — safe to re-run / resume).
const MIRRORS = process.env.SEED_MIRRORS
  ? process.env.SEED_MIRRORS.split(",").map(s => s.trim()).filter(Boolean)
  : ["world", "fr", "de", "it", "es", "be", "gb", "nl", "at", "ch", "us", "ma", "dz", "tn"];

// Overridable via SEED_SKIP_HARAM=1 to run only the HALAL pass in an invocation.
const SKIP_HARAM = process.env.SEED_SKIP_HARAM === "1";
const SKIP_HALAL = process.env.SEED_SKIP_HALAL === "1";

// Haram categories — mirrors HARAM_CATEGORIES in artifacts/api-server/src/routes/halal.ts
const HARAM_CATEGORY_TAGS = [
  "en:pork", "en:pork-products", "en:pork-meats",
  "en:beers", "en:wines", "en:spirits", "en:alcoholic-beverages",
];

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  labels_tags?: string[];
  categories_tags?: string[];
}

interface OFFSearchResult {
  count: number;
  page: number;
  page_size: number;
  products: OFFProduct[];
}

type TagType = "labels" | "categories";

async function fetchPage(
  page: number,
  tagType: TagType,
  tag: string,
  attempt = 0,
  baseUrl = "https://fr.openfoodfacts.org",
): Promise<OFFSearchResult | null> {
  const url = new URL(`${baseUrl}/cgi/search.pl`);
  url.searchParams.set("action", "process");
  url.searchParams.set("tagtype_0", tagType);
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", tag);
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("fields", OFF_FIELDS);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "HalalScan/1.0 (+https://halalscan.app)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      if (res.status === 503 && attempt < 2) {
        console.error(`[OFF] HTTP 503 for page ${page} — retry ${attempt + 1} in ${(attempt + 1) * 2}s…`);
        await new Promise(r => setTimeout(r, (attempt + 1) * 2_000));
        return fetchPage(page, tagType, tag, attempt + 1, baseUrl);
      }
      console.error(`[OFF] HTTP ${res.status} for page ${page}`);
      return null;
    }
    return (await res.json()) as OFFSearchResult;
  } catch (err) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, (attempt + 1) * 2_000));
      return fetchPage(page, tagType, tag, attempt + 1, baseUrl);
    }
    console.error(`[OFF] Fetch error page ${page}:`, err);
    return null;
  }
}

function extractCertifier(labelsTags: string[] | undefined): string | null {
  if (!labelsTags) return null;
  for (const tag of labelsTags) {
    // Tags like "en:halal-avs", "fr:halal-lmcc", "en:halal-cci-lyon"
    const match = tag.match(/^(?:en|fr):halal-(.+)$/);
    if (match) return match[1].toUpperCase().replace(/-/g, " ");
  }
  return null;
}

/**
 * Fetch + upsert one (tagType, tag, mirror) combination.
 *
 * `protectExisting` guards against a broad category match (e.g. HARAM via
 * "en:pork-products") ever downgrading a product that a stronger, explicit
 * halal certification label already marked HALAL — explicit certification is
 * the more authoritative signal, so it always wins on conflict.
 */
async function seedFromTag(
  tagType: TagType,
  tag: string,
  status: "HALAL" | "HARAM",
  mirror: string,
  protectExisting: boolean,
): Promise<number> {
  const baseUrl = `https://${mirror}.openfoodfacts.org`;
  let total = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    const data = await fetchPage(page, tagType, tag, 0, baseUrl);
    if (!data || data.products.length === 0) break;

    const rows: InsertHalalProduct[] = [];
    for (const p of data.products) {
      const barcode = p.code?.trim();
      if (!barcode || !/^\d{8,14}$/.test(barcode)) continue;

      const name = (p.product_name_fr || p.product_name || "").trim();
      if (!name) continue;

      rows.push({
        barcode,
        name,
        brand: p.brands?.split(",")[0]?.trim() || null,
        halalStatus: status,
        certifier: status === "HALAL" ? extractCertifier(p.labels_tags) : null,
        source: "openfoodfacts",
        country: mirror === "world" ? null : mirror,
      });
    }

    if (rows.length > 0) {
      const halalStatusSet = protectExisting
        // Never let a category-based HARAM match overwrite an existing HALAL certification
        ? sql`CASE WHEN ${halalProductsTable.halalStatus} = 'HALAL' THEN ${halalProductsTable.halalStatus} ELSE excluded.halal_status END`
        : sql`excluded.halal_status`;

      await db
        .insert(halalProductsTable)
        .values(rows)
        .onConflictDoUpdate({
          target: halalProductsTable.barcode,
          set: {
            name: sql`excluded.name`,
            brand: sql`excluded.brand`,
            halalStatus: halalStatusSet,
            certifier: sql`COALESCE(excluded.certifier, ${halalProductsTable.certifier})`,
            source: sql`excluded.source`,
            updatedAt: sql`NOW()`,
          },
        });
      total += rows.length;
    }

    if (data.products.length < PAGE_SIZE) break;
    page++;

    // Small delay to be polite to OFF servers
    await new Promise(r => setTimeout(r, 300));
  }

  return total;
}

async function main() {
  console.log("=== HalalScan DB Seed ===");
  console.log(`Mirrors: ${MIRRORS.join(", ")}`);

  // ── HALAL: explicit "halal" label (and certifier variants like halal-avs,
  // halal-lmcc, …) across every regional mirror. Explicit certification is
  // the strongest signal, so it always overwrites on conflict.
  let halalCount = 0;
  if (!SKIP_HALAL) {
    for (const mirror of MIRRORS) {
      console.log(`\nSeeding HALAL products from ${mirror}.openfoodfacts.org…`);
      const n = await seedFromTag("labels", "en:halal", "HALAL", mirror, false);
      halalCount += n;
      console.log(`  → ${n} products (running total: ${halalCount})`);
    }
  }

  // ── HARAM: unambiguous pork/alcohol categories across every mirror, so
  // clearly-forbidden products also resolve instantly at scan time.
  let haramCount = 0;
  if (!SKIP_HARAM) {
    for (const mirror of MIRRORS) {
      for (const cat of HARAM_CATEGORY_TAGS) {
        const n = await seedFromTag("categories", cat, "HARAM", mirror, true);
        if (n > 0) {
          haramCount += n;
          console.log(`Seeded ${n} HARAM products from ${mirror} / ${cat} (running total: ${haramCount})`);
        }
      }
    }
  }

  console.log(`\nDone! Seeded ${halalCount} HALAL + ${haramCount} HARAM products this run.`);

  // Check DB count
  const [{ value: totalCount }] = await db.select({ value: count() }).from(halalProductsTable);
  console.log(`\n✅ Total products in halal_products table: ${totalCount}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
