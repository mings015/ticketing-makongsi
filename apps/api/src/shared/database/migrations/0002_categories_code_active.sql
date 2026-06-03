ALTER TABLE "categories" ADD COLUMN "code" varchar(20);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_code_unique" ON "categories"("code") WHERE "deleted_at" IS NULL;
