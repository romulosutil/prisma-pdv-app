CREATE TABLE "solicitacoes_suporte" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"mensagem" text NOT NULL,
	"diagnostico" jsonb,
	"versao_politicas" text NOT NULL,
	"estado" text DEFAULT 'aberto' NOT NULL,
	"resposta" text,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solicitacoes_suporte" ADD CONSTRAINT "solicitacoes_suporte_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes_suporte" ADD CONSTRAINT "solicitacoes_suporte_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes_suporte" ADD CONSTRAINT "solicitacoes_suporte_operador_id_operadores_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."operadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes_suporte" ADD CONSTRAINT "solicitacoes_suporte_aparelho_id_aparelhos_id_fk" FOREIGN KEY ("aparelho_id") REFERENCES "public"."aparelhos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solicitacoes_suporte_perfil_idx" ON "solicitacoes_suporte" USING btree ("conta_id","loja_id","operador_id");