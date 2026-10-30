ALTER TABLE "vendas" ADD COLUMN "caixa_id" uuid;--> statement-breakpoint
ALTER TABLE "vendas" ADD COLUMN "cancelamento" jsonb;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_caixa_id_caixas_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id") ON DELETE no action ON UPDATE no action;