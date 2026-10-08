CREATE TYPE "public"."manager_request_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "manager_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"station_id" text NOT NULL,
	"message" text,
	"status" "manager_request_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "manager_requests" ADD CONSTRAINT "manager_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_requests" ADD CONSTRAINT "manager_requests_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_requests" ADD CONSTRAINT "manager_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manager_requests_status_idx" ON "manager_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "manager_requests_pending_user_idx" ON "manager_requests" USING btree ("user_id") WHERE "manager_requests"."status" = 'PENDING';