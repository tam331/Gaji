CREATE TYPE "public"."worker_status" AS ENUM('new', 'registered');--> statement-breakpoint
CREATE TYPE "public"."payroll_run_status" AS ENUM('draft', 'funded', 'disbursing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."disbursement_status" AS ENUM('pending', 'claimed', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"stellar_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stellar_address" text NOT NULL,
	"phone" text,
	"bank_account" text,
	"status" "worker_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"total_usdc" text NOT NULL,
	"worker_count" integer DEFAULT 0 NOT NULL,
	"status" "payroll_run_status" DEFAULT 'draft' NOT NULL,
	"stellar_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"amount_usdc" text NOT NULL,
	"status" "disbursement_status" DEFAULT 'pending' NOT NULL,
	"claimable_balance_id" text,
	"stellar_tx_hash" text,
	"cashed_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sdp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disbursement_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdp_events" ADD CONSTRAINT "sdp_events_disbursement_id_disbursements_id_fk" FOREIGN KEY ("disbursement_id") REFERENCES "public"."disbursements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workers_employer_idx" ON "workers" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "workers_status_idx" ON "workers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payroll_runs_employer_idx" ON "payroll_runs" USING btree ("employer_id");--> statement-breakpoint
CREATE INDEX "payroll_runs_status_idx" ON "payroll_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disbursements_payroll_run_idx" ON "disbursements" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "disbursements_worker_idx" ON "disbursements" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "disbursements_status_idx" ON "disbursements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sdp_events_disbursement_idx" ON "sdp_events" USING btree ("disbursement_id");