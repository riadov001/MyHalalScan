import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertHalalProductSchema = createInsertSchema(halalProductsTable).omit({ updatedAt: true });
export type InsertHalalProduct = z.infer<typeof insertHalalProductSchema>;
export type HalalProduct = typeof halalProductsTable.$inferSelect;
