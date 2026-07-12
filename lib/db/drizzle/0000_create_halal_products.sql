CREATE TABLE "halal_products" (
	"barcode" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"halal_status" text NOT NULL,
	"certifier" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"country" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
