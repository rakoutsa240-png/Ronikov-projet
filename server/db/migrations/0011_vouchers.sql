CREATE TYPE "public"."voucher_source" AS ENUM('GIFT', 'CONTEST', 'LOYALTY');--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"amount_xof" integer NOT NULL,
	"source" "voucher_source" NOT NULL,
	"label" text,
	"station_id" text,
	"owner_id" uuid,
	"claimed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"reservation_id" uuid,
	"used_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_amount_check" CHECK ("vouchers"."amount_xof" > 0)
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "voucher_discount_xof" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "vouchers_reservation_idx" ON "vouchers" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "vouchers_owner_idx" ON "vouchers" USING btree ("owner_id","expires_at");--> statement-breakpoint
CREATE INDEX "vouchers_created_idx" ON "vouchers" USING btree ("created_at");