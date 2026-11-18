CREATE TABLE "cobrancas_pagamento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"conexao_id" uuid NOT NULL,
	"venda_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"aparelho_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"meio" text NOT NULL,
	"valor_centavos" bigint NOT NULL,
	"estado" text NOT NULL,
	"chave_idempotencia" text NOT NULL,
	"pedido" jsonb NOT NULL,
	"pedido_provedor_id" text,
	"status_provedor" text,
	"detalhe_provedor" text,
	"valor_pago_centavos" bigint,
	"qr_code" text,
	"qr_code_base64" text,
	"ticket_url" text,
	"expira_em" timestamp with time zone,
	"lease_ate" timestamp with time zone,
	"consultado_em" timestamp with time zone,
	"proxima_consulta_em" timestamp with time zone,
	"falhas_consulta" integer DEFAULT 0 NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"ultimo_erro" text,
	"alerta" text,
	"paga_em" timestamp with time zone,
	"vinculada_em" timestamp with time zone,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "cobrancas_pagamento_chave_idempotencia_unique" UNIQUE("chave_idempotencia"),
	CONSTRAINT "cobrancas_pagamento_pedido_provedor_id_unique" UNIQUE("pedido_provedor_id")
);
--> statement-breakpoint
CREATE TABLE "conexoes_pagamento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"publico_id" text NOT NULL,
	"token_envelope" jsonb,
	"segredo_webhook_envelope" jsonb,
	"conta_provedor_id" text,
	"ativa" boolean NOT NULL,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"desativada_em" timestamp with time zone,
	CONSTRAINT "conexoes_pagamento_publico_id_unique" UNIQUE("publico_id")
);
--> statement-breakpoint
CREATE TABLE "eventos_cobranca_pagamento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cobranca_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"dados" jsonb NOT NULL,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cobrancas_pagamento" ADD CONSTRAINT "cobrancas_pagamento_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas_pagamento" ADD CONSTRAINT "cobrancas_pagamento_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas_pagamento" ADD CONSTRAINT "cobrancas_pagamento_conexao_id_conexoes_pagamento_id_fk" FOREIGN KEY ("conexao_id") REFERENCES "public"."conexoes_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD CONSTRAINT "conexoes_pagamento_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD CONSTRAINT "conexoes_pagamento_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_cobranca_pagamento" ADD CONSTRAINT "eventos_cobranca_pagamento_cobranca_id_cobrancas_pagamento_id_fk" FOREIGN KEY ("cobranca_id") REFERENCES "public"."cobrancas_pagamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_cobranca_pagamento" ADD CONSTRAINT "eventos_cobranca_pagamento_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cobrancas_pagamento_loja_estado_idx" ON "cobrancas_pagamento" USING btree ("loja_id","estado");--> statement-breakpoint
CREATE INDEX "cobrancas_pagamento_proxima_consulta_idx" ON "cobrancas_pagamento" USING btree ("proxima_consulta_em") WHERE "cobrancas_pagamento"."proxima_consulta_em" is not null;--> statement-breakpoint
CREATE INDEX "cobrancas_pagamento_loja_pedido_idx" ON "cobrancas_pagamento" USING btree ("loja_id",lower("pedido_provedor_id"));--> statement-breakpoint
CREATE UNIQUE INDEX "conexoes_pagamento_ativa_idx" ON "conexoes_pagamento" USING btree ("loja_id","provedor") WHERE "conexoes_pagamento"."ativa" = true;--> statement-breakpoint
CREATE INDEX "eventos_cobranca_pagamento_cobranca_idx" ON "eventos_cobranca_pagamento" USING btree ("cobranca_id");