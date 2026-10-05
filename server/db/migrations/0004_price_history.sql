CREATE TABLE "station_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"price_per_liter_xof" integer NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "station_prices" ADD CONSTRAINT "station_prices_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "station_prices_station_effective_idx" ON "station_prices" USING btree ("station_id","effective_from");--> statement-breakpoint
-- Start the history with the price each station charges today.
INSERT INTO "station_prices" ("station_id", "fuel_type", "price_per_liter_xof", "effective_from")
SELECT "station_id", "fuel_type", "price_per_liter_xof", "updated_at" FROM "fuel_stocks";
