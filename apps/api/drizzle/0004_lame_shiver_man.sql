CREATE TABLE "recuperacoes_aparelho" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"aparelho_novo_id" uuid NOT NULL,
	"aparelho_novo_nome" text NOT NULL,
	"aparelhos_permitidos" jsonb NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"invalidado_em" timestamp with time zone,
	"confirmado_em" timestamp with time zone,
	"aparelho_substituido_id" uuid,
	"sessao_id" uuid,
	CONSTRAINT "recuperacoes_aparelho_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "recuperacoes_aparelho" ADD CONSTRAINT "recuperacoes_aparelho_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recuperacoes_aparelho" ADD CONSTRAINT "recuperacoes_aparelho_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recuperacoes_aparelho" ADD CONSTRAINT "recuperacoes_aparelho_operador_id_operadores_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."operadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recuperacoes_aparelho" ADD CONSTRAINT "recuperacoes_aparelho_aparelho_substituido_id_aparelhos_id_fk" FOREIGN KEY ("aparelho_substituido_id") REFERENCES "public"."aparelhos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recuperacoes_aparelho" ADD CONSTRAINT "recuperacoes_aparelho_sessao_id_sessoes_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recuperacoes_aparelho_conta_idx" ON "recuperacoes_aparelho" USING btree ("conta_id");