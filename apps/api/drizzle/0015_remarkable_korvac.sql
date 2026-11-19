CREATE TABLE "assinaturas_play" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"assinatura_id" uuid NOT NULL,
	"package_name" text NOT NULL,
	"product_id" text NOT NULL,
	"purchase_token_hash" text NOT NULL,
	"order_id" text,
	"estado_play" text NOT NULL,
	"acknowledged_em" timestamp with time zone,
	"em_teste_gratis" boolean DEFAULT false NOT NULL,
	"auto_renew_enabled" boolean DEFAULT true NOT NULL,
	"inicio_em" timestamp with time zone,
	"expira_em" timestamp with time zone NOT NULL,
	"ultima_notificacao_em" timestamp with time zone,
	"ultimo_evento_ordem" bigint DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "assinaturas_play_purchase_token_hash_unique" UNIQUE("purchase_token_hash")
);
--> statement-breakpoint
CREATE TABLE "detalhes_pagamentos_venda" (
	"pagamento_id" uuid PRIMARY KEY NOT NULL,
	"loja_id" uuid NOT NULL,
	"confirmacao" text NOT NULL,
	"identificador_externo" text,
	"maquininha" text,
	"criado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cobrancas_pagamento" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "cobrancas_pagamento" ADD COLUMN "transacao_provedor_id" text;--> statement-breakpoint
ALTER TABLE "cobrancas_pagamento" ADD COLUMN "slug_provedor" text;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "assinaturas_play" ADD CONSTRAINT "assinaturas_play_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas_play" ADD CONSTRAINT "assinaturas_play_assinatura_id_assinaturas_id_fk" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalhes_pagamentos_venda" ADD CONSTRAINT "detalhes_pagamentos_venda_pagamento_id_pagamentos_venda_id_fk" FOREIGN KEY ("pagamento_id") REFERENCES "public"."pagamentos_venda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalhes_pagamentos_venda" ADD CONSTRAINT "detalhes_pagamentos_venda_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assinaturas_play_conta_idx" ON "assinaturas_play" USING btree ("conta_id");--> statement-breakpoint
CREATE INDEX "assinaturas_play_assinatura_idx" ON "assinaturas_play" USING btree ("assinatura_id");--> statement-breakpoint
CREATE INDEX "detalhes_pagamentos_venda_loja_idx" ON "detalhes_pagamentos_venda" USING btree ("loja_id");