/**
 * Seed the halal_products table from halal-labelled products.
 * Run with: pnpm --filter @workspace/scripts run seed-halal
 *
 * Sources (in priority order):
 *   1. fr.openfoodfacts.org — French halal products (same dataset as
 *      halalopenfoodfacts.org/fr which is a filtered view of OFF France)
 *   2. world.openfoodfacts.org — global halal-tagged products fallback
 */
import { db } from "@workspace/db";
import { halalProductsTable, type InsertHalalProduct } from "@workspace/db";
import { sql, count } from "drizzle-orm";

const OFF_FIELDS = "code,product_name,product_name_fr,brands,labels_tags,categories_tags";
const PAGE_SIZE = 500;
const MAX_PAGES = 20; // max 10 000 products per run

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

async function fetchPage(page: number, tag: string, attempt = 0, baseUrl = "https://fr.openfoodfacts.org"): Promise<OFFSearchResult | null> {
  const url = new URL(`${baseUrl}/cgi/search.pl`);
  url.searchParams.set("action", "process");
  url.searchParams.set("tagtype_0", "labels");
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
        return fetchPage(page, tag, attempt + 1, baseUrl);
      }
      console.error(`[OFF] HTTP ${res.status} for page ${page}`);
      return null;
    }
    return (await res.json()) as OFFSearchResult;
  } catch (err) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, (attempt + 1) * 2_000));
      return fetchPage(page, tag, attempt + 1, baseUrl);
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

function isHaramCategory(categoriesTags: string[] | undefined): boolean {
  if (!categoriesTags) return false;
  const haramCats = [
    "en:beers", "en:wines", "en:spirits", "en:alcoholic-beverages",
    "en:pork", "en:pork-products",
  ];
  return categoriesTags.some(c => haramCats.includes(c));
}

async function seedFromTag(tag: string, status: "HALAL" | "HARAM", baseUrl = "https://fr.openfoodfacts.org"): Promise<number> {
  let total = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    console.log(`[SEED] Fetching page ${page} for tag: ${tag} (${baseUrl})…`);
    const data = await fetchPage(page, tag, 0, baseUrl);
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
        country: "fr",
      });
    }

    if (rows.length > 0) {
      // Upsert: ignore conflicts (keep existing certifier if more specific)
      await db
        .insert(halalProductsTable)
        .values(rows)
        .onConflictDoUpdate({
          target: halalProductsTable.barcode,
          set: {
            name: sql`excluded.name`,
            brand: sql`excluded.brand`,
            halalStatus: sql`excluded.halal_status`,
            certifier: sql`COALESCE(excluded.certifier, ${halalProductsTable.certifier})`,
            source: sql`excluded.source`,
            updatedAt: sql`NOW()`,
          },
        });
      total += rows.length;
      console.log(`[SEED] Upserted ${rows.length} products (page ${page}, total ${total})`);
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

  // Source 1: French OpenFoodFacts (same dataset as halalopenfoodfacts.org/fr)
  console.log("Seeding HALAL products from fr.openfoodfacts.org…");
  const frCount = await seedFromTag("en:halal", "HALAL", "https://fr.openfoodfacts.org");

  // Source 2: Global OpenFoodFacts (supplements with non-French products)
  console.log("\nSeeding HALAL products from world.openfoodfacts.org…");
  const worldCount = await seedFromTag("en:halal", "HALAL", "https://world.openfoodfacts.org");

  const halalCount = frCount + worldCount;
  console.log(`\nDone! Seeded ${halalCount} HALAL products total (fr: ${frCount}, world: ${worldCount}).`);

  // Check DB count
  const [{ value: totalCount }] = await db.select({ value: count() }).from(halalProductsTable);
  console.log(`\n✅ Total products in halal_products table: ${totalCount}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
