ALTER TABLE "aparelhos" ADD COLUMN "revogado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessoes" ADD COLUMN "expira_em" timestamp with time zone;--> statement-breakpoint
UPDATE "sessoes" SET "expira_em" = "criado_em" + interval '30 days';--> statement-breakpoint
ALTER TABLE "sessoes" ALTER COLUMN "expira_em" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessoes" ADD COLUMN "revogada_em" timestamp with time zone;
