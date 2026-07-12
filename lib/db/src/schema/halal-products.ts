import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const halalProductsTable = pgTable("halal_products", {
  barcode: text("barcode").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand"),
  halalStatus: text("halal_status").notNull().$type<"HALAL" | "HARAM" | "DOUBTFUL">(),
  certifier: text("certifier"),
  source: text("source").notNull().default("manual"),
  country: text("country"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type InsertHalalProduct = {
  barcode: string;
  name: string;
  brand?: string | null;
  halalStatus: "HALAL" | "HARAM" | "DOUBTFUL";
  certifier?: string | null;
  source?: string;
  country?: string | null;
};

export type HalalProduct = typeof halalProductsTable.$inferSelect;
