CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"contato" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos_fiado" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"venda_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"valor_centavos" bigint NOT NULL,
	"meio" text NOT NULL,
	"caixa_id" uuid,
	"original_id" uuid,
	"motivo" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentos_estoque" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"quantidade_milesimos" bigint NOT NULL,
	"motivo" text NOT NULL,
	"item_venda_id" uuid,
	"operador_id" uuid,
	"aparelho_id" uuid,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendas" ADD COLUMN "fiado" jsonb;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_fiado" ADD CONSTRAINT "eventos_fiado_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_fiado" ADD CONSTRAINT "eventos_fiado_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_fiado" ADD CONSTRAINT "eventos_fiado_caixa_id_caixas_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clientes_loja_idx" ON "clientes" USING btree ("loja_id");--> statement-breakpoint
CREATE INDEX "eventos_fiado_venda_idx" ON "eventos_fiado" USING btree ("loja_id","venda_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eventos_fiado_estorno_idx" ON "eventos_fiado" USING btree ("original_id");--> statement-breakpoint
CREATE INDEX "movimentos_estoque_produto_idx" ON "movimentos_estoque" USING btree ("loja_id","produto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movimentos_estoque_baixa_item_idx" ON "movimentos_estoque" USING btree ("item_venda_id") WHERE "movimentos_estoque"."tipo" = 'venda';
--> statement-breakpoint
-- O saldo existente é a abertura da trilha. Vendas anteriores não são baixadas outra vez.
INSERT INTO movimentos_estoque (id, loja_id, produto_id, tipo, quantidade_milesimos, motivo, criado_em)
SELECT id, loja_id, id, 'inicial', estoque, 'Saldo legado na migração R4; autoria não disponível', CURRENT_TIMESTAMP
FROM produtos WHERE estoque IS NOT NULL;
