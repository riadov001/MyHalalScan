import { db, halalProductsTable } from "@workspace/db";

async function main() {
  const testProducts = [
    { barcode: "8000500310427", name: "Sidi Ali Eau Minerale", brand: "Sidi Ali", halalStatus: "HALAL", source: "manual", country: "fr" },
    { barcode: "1234567890123", name: "Saucisson Sec", brand: "TestBrand", halalStatus: "HARAM", source: "manual", country: "fr" },
    { barcode: "3029330003533", name: "Pates Barilla", brand: "Barilla", halalStatus: "HALAL", source: "manual", country: "fr" },
  ];
  for (const p of testProducts) {
    await db.insert(halalProductsTable).values(p).onConflictDoNothing();
  }
  const count = await db.execute({ sql: "SELECT COUNT(*) as count FROM halal_products" });
  console.log("Inserted test products. Total count:", count.rows[0].count);
}

main().catch(console.error);
