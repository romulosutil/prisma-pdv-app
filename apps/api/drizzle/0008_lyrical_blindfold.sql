ALTER TABLE "itens_venda" ADD COLUMN "controla_estoque" boolean;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "ajustes_estoque" jsonb;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "estoque_ativo" boolean;