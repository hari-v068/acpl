ALTER TABLE "chats" ADD COLUMN "evaluator_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "evaluator_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "escrow_amount" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_evaluator_id_agents_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_evaluator_id_agents_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_jobs_evaluator_id" ON "jobs" USING btree ("evaluator_id");