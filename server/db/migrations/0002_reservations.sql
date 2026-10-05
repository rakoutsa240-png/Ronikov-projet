CREATE TYPE "public"."notification_type" AS ENUM('RESERVATION', 'STOCK', 'SYSTEM', 'PREMIUM');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('MIXX_BY_YAS', 'MOOV_MONEY', 'CARD', 'TMONEY', 'FLOOZ');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('PENDING', 'VALIDATED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"station_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"station_id" text NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"liters" integer NOT NULL,
	"price_per_liter_xof" integer NOT NULL,
	"fuel_amount_xof" integer NOT NULL,
	"service_fee_xof" integer NOT NULL,
	"total_xof" integer NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_phone" text NOT NULL,
	"payment_status" text DEFAULT 'PAID' NOT NULL,
	"code_hash" text NOT NULL,
	"code_last4" text NOT NULL,
	"code_encrypted" text NOT NULL,
	"status" "reservation_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"validated_at" timestamp with time zone,
	"validated_by" uuid,
	CONSTRAINT "reservations_liters_check" CHECK ("reservations"."liters" > 0)
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_code_hash_idx" ON "reservations" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "reservations_user_idx" ON "reservations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reservations_station_idx" ON "reservations" USING btree ("station_id","created_at");--> statement-breakpoint
CREATE INDEX "reservations_pending_expiry_idx" ON "reservations" USING btree ("status","expires_at");