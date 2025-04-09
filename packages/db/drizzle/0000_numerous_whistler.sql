CREATE TYPE "public"."job_phase" AS ENUM('REQUEST', 'NEGOTIATION', 'TRANSACTION', 'EVALUATION', 'COMPLETE', 'REJECTED');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"client_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_by" text
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_items" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"inventory_item_id" text,
	"item_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price_per_unit" numeric(20, 2) NOT NULL,
	"requirements" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"budget_amount" numeric(20, 2),
	"job_phase" "job_phase" DEFAULT 'REQUEST' NOT NULL,
	"expired_at" timestamp with time zone,
	"transaction_hash" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"author_id" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"description" text NOT NULL,
	"catalog" jsonb NOT NULL,
	"total_approved_jobs" integer DEFAULT 0,
	"total_rejected_jobs" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"address" text NOT NULL,
	"balance" numeric(20, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_client_id_agents_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_provider_id_agents_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_last_read_by_agents_id_fk" FOREIGN KEY ("last_read_by") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_agents_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_provider_id_agents_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_agents_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chats_job_id" ON "chats" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_chats_agents" ON "chats" USING btree ("client_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_agent_item_idx" ON "inventory_items" USING btree ("agent_id","item_id");--> statement-breakpoint
CREATE INDEX "idx_job_items_job_id" ON "job_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_job_items_inventory_item" ON "job_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_phase" ON "jobs" USING btree ("job_phase");--> statement-breakpoint
CREATE INDEX "idx_jobs_client_id" ON "jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_provider_id" ON "jobs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_messages_chat_created" ON "messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "providers_agent_id_idx" ON "providers" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_agent_id_idx" ON "wallets" USING btree ("agent_id");