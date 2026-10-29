CREATE TABLE "entregas_codigo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ordem_fila" bigserial NOT NULL,
	"conta_id" uuid NOT NULL,
	"codigo_id" uuid NOT NULL,
	"dominio_remetente" text NOT NULL,
	"estado" text NOT NULL,
	"chave_id" text,
	"envelope" jsonb,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"proxima_tentativa_em" timestamp with time zone NOT NULL,
	"lease_token" uuid,
	"lease_expira_em" timestamp with time zone,
	"encerrado_em" timestamp with time zone,
	"motivo" text,
	CONSTRAINT "entregas_codigo_codigo_id_unique" UNIQUE("codigo_id")
);
--> statement-breakpoint
ALTER TABLE "entregas_codigo" ADD CONSTRAINT "entregas_codigo_conta_id_contas_id_fk" FOREIGN KEY ("conta_id") REFERENCES "public"."contas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregas_codigo" ADD CONSTRAINT "entregas_codigo_codigo_id_codigos_login_id_fk" FOREIGN KEY ("codigo_id") REFERENCES "public"."codigos_login"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entregas_codigo_estado_proxima_idx" ON "entregas_codigo" USING btree ("estado","proxima_tentativa_em");--> statement-breakpoint
CREATE INDEX "entregas_codigo_estado_ordem_idx" ON "entregas_codigo" USING btree ("estado","ordem_fila");--> statement-breakpoint
CREATE INDEX "entregas_codigo_conta_idx" ON "entregas_codigo" USING btree ("conta_id");