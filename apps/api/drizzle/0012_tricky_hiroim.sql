ALTER TABLE "entregas_codigo" ALTER COLUMN "conta_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "codigos_login" ADD COLUMN "finalidade" text DEFAULT 'login' NOT NULL;--> statement-breakpoint
ALTER TABLE "codigos_login" ADD COLUMN "aparelho_cadastro_id" uuid;