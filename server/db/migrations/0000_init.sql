CREATE TYPE "public"."fuel_type" AS ENUM('SUPER', 'GAZOLE', 'MELANGE', 'KEROSENE');--> statement-breakpoint
CREATE TABLE "fuel_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"official_price_xof" integer NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fuel_stocks" (
	"station_id" text NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"available_liters" integer NOT NULL,
	"reserved_liters" integer DEFAULT 0 NOT NULL,
	"max_capacity_liters" integer NOT NULL,
	"price_per_liter_xof" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fuel_stocks_station_id_fuel_type_pk" PRIMARY KEY("station_id","fuel_type"),
	CONSTRAINT "fuel_stocks_liters_check" CHECK ("fuel_stocks"."available_liters" >= 0 AND "fuel_stocks"."reserved_liters" >= 0 AND "fuel_stocks"."max_capacity_liters" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"district" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"phone" text NOT NULL,
	"operating_hours" text NOT NULL,
	"amenities" text[] DEFAULT '{}'::text[] NOT NULL,
	"queue_time_minutes" integer DEFAULT 0 NOT NULL,
	"is_partner" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fuel_stocks" ADD CONSTRAINT "fuel_stocks_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fuel_prices_fuel_effective_idx" ON "fuel_prices" USING btree ("fuel_type","effective_from");