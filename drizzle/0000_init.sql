CREATE TYPE "public"."client_eligibility" AS ENUM('any', 'new', 'existing');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('new', 'existing');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed', 'not_configured', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."discount_scope" AS ENUM('eligible_services', 'order_total');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."inquiry_service_kind" AS ENUM('requested', 'additional');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'in_review', 'contacted', 'proposal_sent', 'won', 'lost', 'archived', 'spam');--> statement-breakpoint
CREATE TYPE "public"."inquiry_type" AS ENUM('project', 'existing_client', 'collaboration', 'general');--> statement-breakpoint
CREATE TYPE "public"."offer_service_role" AS ENUM('required', 'eligible');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('project', 'month', 'hour');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(254) DEFAULT '' NOT NULL,
	"action" varchar(60) NOT NULL,
	"entity_type" varchar(40) DEFAULT '' NOT NULL,
	"entity_id" varchar(64) DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" varchar(64) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_tier_services" (
	"tier_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "budget_tier_services_tier_id_service_id_pk" PRIMARY KEY("tier_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "budget_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(600) DEFAULT '' NOT NULL,
	"min_amount" integer,
	"max_amount" integer,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"show_amounts" boolean DEFAULT false NOT NULL,
	"starting_price" integer,
	"typical_features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suitable_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timeline" varchar(120) DEFAULT '' NOT NULL,
	"cta_label" varchar(60) DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_tiers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "budget_tiers_min_nonneg" CHECK ("budget_tiers"."min_amount" IS NULL OR "budget_tiers"."min_amount" >= 0),
	CONSTRAINT "budget_tiers_range" CHECK ("budget_tiers"."max_amount" IS NULL OR "budget_tiers"."min_amount" IS NULL OR "budget_tiers"."max_amount" >= "budget_tiers"."min_amount"),
	CONSTRAINT "budget_tiers_currency_iso" CHECK ("budget_tiers"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "collaboration_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"summary" varchar(300) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collaboration_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(24) NOT NULL,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"inquiry_type" "inquiry_type" NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"company" varchar(160) DEFAULT '' NOT NULL,
	"phone" varchar(40) DEFAULT '' NOT NULL,
	"country" varchar(80) DEFAULT '' NOT NULL,
	"budget_tier_id" uuid,
	"budget_label" varchar(200) DEFAULT '' NOT NULL,
	"timeline" varchar(80) DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"client_status" "client_status" DEFAULT 'new' NOT NULL,
	"collaboration_type_id" uuid,
	"wants_additional_services" boolean DEFAULT false NOT NULL,
	"website_url" varchar(500) DEFAULT '' NOT NULL,
	"offer_id" uuid,
	"offer_code" varchar(40) DEFAULT '' NOT NULL,
	"estimate" jsonb,
	"source_path" varchar(300) DEFAULT '' NOT NULL,
	"privacy_acknowledged_at" timestamp with time zone,
	"notification_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"acknowledgement_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "inquiry_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"author_id" uuid,
	"author_name" varchar(120) DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_services" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"service_id" uuid,
	"service_name" varchar(120) NOT NULL,
	"kind" "inquiry_service_kind" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" varchar(255) DEFAULT '' NOT NULL,
	"alt_text" varchar(300) DEFAULT '' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"format" varchar(10) NOT NULL,
	"variants" jsonb NOT NULL,
	"storage_driver" varchar(20) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_services" (
	"offer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"role" "offer_service_role" NOT NULL,
	CONSTRAINT "offer_services_offer_id_service_id_role_pk" PRIMARY KEY("offer_id","service_id","role")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"summary" varchar(300) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"discount_scope" "discount_scope" DEFAULT 'eligible_services' NOT NULL,
	"client_eligibility" "client_eligibility" DEFAULT 'any' NOT NULL,
	"min_subtotal" integer,
	"min_service_count" integer,
	"max_discount" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"stackable" boolean DEFAULT false NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"code" varchar(40),
	"priority" integer DEFAULT 0 NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "offers_value_positive" CHECK ("offers"."discount_value" > 0),
	CONSTRAINT "offers_percentage_max" CHECK ("offers"."discount_type" <> 'percentage' OR "offers"."discount_value" <= 10000),
	CONSTRAINT "offers_date_window" CHECK ("offers"."starts_at" IS NULL OR "offers"."ends_at" IS NULL OR "offers"."ends_at" > "offers"."starts_at"),
	CONSTRAINT "offers_currency_iso" CHECK ("offers"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "offers_code_upper" CHECK ("offers"."code" IS NULL OR "offers"."code" = upper("offers"."code"))
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "project_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"project_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"caption" varchar(200) DEFAULT '' NOT NULL,
	CONSTRAINT "project_media_project_id_media_id_pk" PRIMARY KEY("project_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "project_services" (
	"project_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	CONSTRAINT "project_services_project_id_service_id_pk" PRIMARY KEY("project_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(160) NOT NULL,
	"client_name" varchar(160) DEFAULT '' NOT NULL,
	"client_name_approved" boolean DEFAULT false NOT NULL,
	"summary" varchar(300) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"project_url" varchar(500) DEFAULT '' NOT NULL,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_on" date,
	"goals" text DEFAULT '' NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"results" text DEFAULT '' NOT NULL,
	"results_verified" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"cover_media_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(70) DEFAULT '' NOT NULL,
	"seo_description" varchar(170) DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(200) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" varchar(300) NOT NULL,
	"to_path" varchar(300) NOT NULL,
	"permanent" boolean DEFAULT true NOT NULL,
	"note" varchar(200) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_relations" (
	"service_id" uuid NOT NULL,
	"related_service_id" uuid NOT NULL,
	CONSTRAINT "service_relations_service_id_related_service_id_pk" PRIMARY KEY("service_id","related_service_id"),
	CONSTRAINT "service_relations_not_self" CHECK ("service_relations"."service_id" <> "service_relations"."related_service_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"short_description" varchar(300) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_from" integer,
	"price_to" integer,
	"currency" char(3) DEFAULT 'EUR' NOT NULL,
	"price_unit" "price_unit" DEFAULT 'project' NOT NULL,
	"show_price" boolean DEFAULT false NOT NULL,
	"timeline" varchar(120) DEFAULT '' NOT NULL,
	"icon" varchar(40) DEFAULT 'layout' NOT NULL,
	"image_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(70) DEFAULT '' NOT NULL,
	"seo_description" varchar(170) DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug"),
	CONSTRAINT "services_price_from_nonneg" CHECK ("services"."price_from" IS NULL OR "services"."price_from" >= 0),
	CONSTRAINT "services_price_range" CHECK ("services"."price_to" IS NULL OR "services"."price_from" IS NULL OR "services"."price_to" >= "services"."price_from"),
	CONSTRAINT "services_currency_iso" CHECK ("services"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" varchar(64),
	"user_agent" varchar(300)
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120) NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_tier_services" ADD CONSTRAINT "budget_tier_services_tier_id_budget_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."budget_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_tier_services" ADD CONSTRAINT "budget_tier_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_budget_tier_id_budget_tiers_id_fk" FOREIGN KEY ("budget_tier_id") REFERENCES "public"."budget_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_collaboration_type_id_collaboration_types_id_fk" FOREIGN KEY ("collaboration_type_id") REFERENCES "public"."collaboration_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_notes" ADD CONSTRAINT "inquiry_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_services" ADD CONSTRAINT "inquiry_services_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_services" ADD CONSTRAINT "inquiry_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_services" ADD CONSTRAINT "offer_services_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_services" ADD CONSTRAINT "offer_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_project_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."project_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_relations" ADD CONSTRAINT "service_relations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_relations" ADD CONSTRAINT "service_relations_related_service_id_services_id_fk" FOREIGN KEY ("related_service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "inquiries_created_idx" ON "inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inquiries_email_idx" ON "inquiries" USING btree ("email");--> statement-breakpoint
CREATE INDEX "inquiry_notes_inquiry_idx" ON "inquiry_notes" USING btree ("inquiry_id");--> statement-breakpoint
CREATE INDEX "inquiry_services_inquiry_idx" ON "inquiry_services" USING btree ("inquiry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "offers_code_unique" ON "offers" USING btree ("code") WHERE "offers"."code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_status_order_idx" ON "projects" USING btree ("status","display_order");--> statement-breakpoint
CREATE INDEX "projects_category_idx" ON "projects" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "services_status_order_idx" ON "services" USING btree ("status","display_order");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");