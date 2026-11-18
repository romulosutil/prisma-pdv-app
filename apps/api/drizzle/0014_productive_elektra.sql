CREATE TABLE "estados_oauth_pagamento" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conta_id" uuid NOT NULL,
	"loja_id" uuid NOT NULL,
	"operador_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"estado_hash" text NOT NULL,
	"verificador_envelope" jsonb,
	"criado_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"invalidado_em" timestamp with time zone,
	"resultado" text,
	CONSTRAINT "estados_oauth_pagamento_estado_hash_unique" UNIQUE("estado_hash")
);
--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "modo" text DEFAULT 'token' NOT NULL;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "refresh_token_envelope" jsonb;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "token_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "live_mode" boolean;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "versao_token" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "renovando_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "reautorizar_desde" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "reautorizar_motivo" text;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "token_renovado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "refresh_sem_resposta_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "revisar_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "proxima_renovacao_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conexoes_pagamento" ADD COLUMN "falhas_renovacao" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "estados_oauth_pagamento" ADD CONSTRAINT "estados_oauth_pagamento_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estados_oauth_pagamento" ADD CONSTRAINT "estados_oauth_pagamento_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estados_oauth_pagamento" ADD CONSTRAINT "estados_oauth_pagamento_operador_id_operadores_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."operadores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "estados_oauth_pagamento_loja_idx" ON "estados_oauth_pagamento" USING btree ("loja_id");--> statement-breakpoint
CREATE INDEX "cobrancas_pagamento_pedido_lower_idx" ON "cobrancas_pagamento" USING btree (lower("pedido_provedor_id"));--> statement-breakpoint
CREATE INDEX "conexoes_pagamento_renovacao_idx" ON "conexoes_pagamento" USING btree ("token_expira_em") WHERE "conexoes_pagamento"."ativa" = true and "conexoes_pagamento"."modo" = 'oauth';