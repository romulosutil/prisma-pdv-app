CREATE TABLE "auditoria_caixa" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"caixa_id" uuid NOT NULL,
	"autor_operador_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"dados" jsonb NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caixas" ADD COLUMN "reservado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "caixas" ADD COLUMN "detalhes" jsonb;--> statement-breakpoint
ALTER TABLE "movimentos_caixa" ADD COLUMN "detalhes" jsonb;--> statement-breakpoint
ALTER TABLE "auditoria_caixa" ADD CONSTRAINT "auditoria_caixa_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria_caixa" ADD CONSTRAINT "auditoria_caixa_caixa_id_caixas_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_caixa_loja_idx" ON "auditoria_caixa" USING btree ("loja_id","caixa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "caixas_reserva_ativa_idx" ON "caixas" USING btree ("loja_id","operador_id") WHERE "caixas"."reservado" = true and "caixas"."fechado_em" is null;