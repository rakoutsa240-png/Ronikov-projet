CREATE TABLE "user_photos" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"image" "bytea" NOT NULL,
	"content_type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "photo_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;