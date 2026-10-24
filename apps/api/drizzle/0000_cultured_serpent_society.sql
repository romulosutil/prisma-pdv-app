CREATE TABLE "aparelhos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"ultimo_acesso_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"plano_id" text NOT NULL,
	"status" text NOT NULL,
	"criada_em" timestamp with time zone NOT NULL,
	"teste_termina_em" timestamp with time zone NOT NULL,
	"periodo_atual_inicio" timestamp with time zone NOT NULL,
	"periodo_atual_fim" timestamp with time zone NOT NULL,
	"acesso_ate" timestamp with time zone,
	"inadimplente_desde" timestamp with time zone,
	"tentativas_falhas" integer NOT NULL,
	"proxima_tentativa_em" timestamp with time zone,
	"cancelada_em" timestamp with time zone,
	"plano_agendado" text,
	"cartao_bandeira" text,
	"cartao_ultimos4" text,
	"cartao_fingerprint" text,
	"cliente_ref" text,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "assinaturas_conta_id_unique" UNIQUE("conta_id")
);
--> statement-breakpoint
CREATE TABLE "caixas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"aberto_em" timestamp with time zone NOT NULL,
	"troco_inicial_centavos" bigint NOT NULL,
	"fechado_em" timestamp with time zone,
	"esperado_centavos" bigint,
	"contado_centavos" bigint,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"excluido_em" timestamp with time zone,
	"versao" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "codigos_login" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"codigo_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"documento" text NOT NULL,
	"nome_responsavel" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "contas_email_unique" UNIQUE("email"),
	CONSTRAINT "contas_documento_unique" UNIQUE("documento")
);
--> statement-breakpoint
CREATE TABLE "eventos_cobranca" (
	"id" uuid PRIMARY KEY NOT NULL,
	"assinatura_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"dados" jsonb NOT NULL,
	"chave_unica" text,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "eventos_cobranca_chave_unica_unique" UNIQUE("chave_unica")
);
--> statement-breakpoint
CREATE TABLE "faturas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"assinatura_id" uuid NOT NULL,
	"conta_id" uuid NOT NULL,
	"valor_centavos" bigint NOT NULL,
	"tipo" text NOT NULL,
	"status" text NOT NULL,
	"transacao_id" text,
	"motivo_recusa" text,
	"chave_idempotencia" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_venda" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venda_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"posicao" integer NOT NULL,
	"produto_id" uuid,
	"descricao" text NOT NULL,
	"preco_unitario_centavos" bigint NOT NULL,
	"quantidade_milesimos" bigint NOT NULL,
	"total_centavos" bigint NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lojas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentos_caixa" (
	"id" uuid PRIMARY KEY NOT NULL,
	"caixa_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"valor_centavos" bigint NOT NULL,
	"motivo" text,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mudancas" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutacoes_aplicadas" (
	"id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "mutacoes_aplicadas_loja_id_id_pk" PRIMARY KEY("loja_id","id")
);
--> statement-breakpoint
CREATE TABLE "operadores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"papel" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagamentos_venda" (
	"id" uuid PRIMARY KEY NOT NULL,
	"venda_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"posicao" integer NOT NULL,
	"meio" text NOT NULL,
	"provedor" text,
	"valor_centavos" bigint NOT NULL,
	"troco_centavos" bigint NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ean" text,
	"preco_centavos" bigint NOT NULL,
	"unidade" text NOT NULL,
	"estoque" bigint,
	"estoque_minimo" bigint,
	"atalho" boolean NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"excluido_em" timestamp with time zone,
	"versao" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "sessoes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "testes_usados" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"documento" text NOT NULL,
	"fingerprint" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "testes_usados_documento_unique" UNIQUE("documento"),
	CONSTRAINT "testes_usados_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "vendas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"total_centavos" bigint NOT NULL,
	"status" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"excluido_em" timestamp with time zone,
	"versao" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aparelhos" ADD CONSTRAINT "aparelhos_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aparelhos" ADD CONSTRAINT "aparelhos_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caixas" ADD CONSTRAINT "caixas_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_cobranca" ADD CONSTRAINT "eventos_cobranca_assinatura_id_assinaturas_id_fk" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_cobranca" ADD CONSTRAINT "eventos_cobranca_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_assinatura_id_assinaturas_id_fk" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lojas" ADD CONSTRAINT "lojas_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_caixa_id_caixas_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mudancas" ADD CONSTRAINT "mudancas_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutacoes_aplicadas" ADD CONSTRAINT "mutacoes_aplicadas_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operadores" ADD CONSTRAINT "operadores_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operadores" ADD CONSTRAINT "operadores_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos_venda" ADD CONSTRAINT "pagamentos_venda_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos_venda" ADD CONSTRAINT "pagamentos_venda_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_operador_id_operadores_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."operadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_aparelho_id_aparelhos_id_fk" FOREIGN KEY ("aparelho_id") REFERENCES "public"."aparelhos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testes_usados" ADD CONSTRAINT "testes_usados_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "caixas_loja_idx" ON "caixas" USING btree ("loja_id");--> statement-breakpoint
CREATE INDEX "codigos_login_email_idx" ON "codigos_login" USING btree ("email");--> statement-breakpoint
CREATE INDEX "eventos_cobranca_assinatura_idx" ON "eventos_cobranca" USING btree ("assinatura_id");--> statement-breakpoint
CREATE UNIQUE INDEX "faturas_chave_idempotencia_idx" ON "faturas" USING btree ("chave_idempotencia");--> statement-breakpoint
CREATE INDEX "faturas_assinatura_idx" ON "faturas" USING btree ("assinatura_id");--> statement-breakpoint
CREATE INDEX "mudancas_loja_seq_idx" ON "mudancas" USING btree ("loja_id","seq");--> statement-breakpoint
CREATE INDEX "produtos_loja_idx" ON "produtos" USING btree ("loja_id");--> statement-breakpoint
CREATE INDEX "vendas_loja_idx" ON "vendas" USING btree ("loja_id");