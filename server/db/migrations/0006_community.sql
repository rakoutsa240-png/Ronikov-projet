CREATE TYPE "public"."report_kind" AS ENUM('NO_FUEL', 'LONG_QUEUE', 'WRONG_PRICE', 'CLOSED');--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"station_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_station_id_pk" PRIMARY KEY("user_id","station_id")
);
--> statement-breakpoint
CREATE TABLE "station_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "report_kind" NOT NULL,
	"fuel_type" "fuel_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "checked_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_reports" ADD CONSTRAINT "station_reports_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_reports" ADD CONSTRAINT "station_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_station_idx" ON "favorites" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "station_reports_station_created_idx" ON "station_reports" USING btree ("station_id","created_at");--> statement-breakpoint
-- Until now the only trace of a stock update is the tanks' last change.
UPDATE "stations" SET "checked_at" = s."last" FROM (SELECT "station_id", max("updated_at") AS "last" FROM "fuel_stocks" GROUP BY "station_id") s WHERE s."station_id" = "stations"."id";
