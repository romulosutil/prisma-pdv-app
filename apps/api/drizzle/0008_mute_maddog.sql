CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "operadores" ADD COLUMN "usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "operadores" ADD COLUMN "estado" text DEFAULT 'ativo' NOT NULL;--> statement-breakpoint
ALTER TABLE "operadores" ADD COLUMN "permissoes" jsonb;--> statement-breakpoint
ALTER TABLE "operadores" ADD COLUMN "convite_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "operadores" ADD COLUMN "convidado_por" uuid;--> statement-breakpoint
ALTER TABLE "operadores" ADD COLUMN "aceito_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "operadores" ADD CONSTRAINT "operadores_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "operadores_usuario_loja_idx" ON "operadores" USING btree ("usuario_id","loja_id");
--> statement-breakpoint
INSERT INTO usuarios (id, email, nome, criado_em, atualizado_em)
SELECT id, lower(trim(email)), nome_responsavel, criado_em, atualizado_em FROM contas;
--> statement-breakpoint
UPDATE operadores SET usuario_id = conta_id, aceito_em = criado_em WHERE papel = 'dono';
--> statement-breakpoint
-- Vínculos legados sem identidade comprovada conservam seu histórico, sem acesso.
UPDATE sessoes SET revogada_em = CURRENT_TIMESTAMP WHERE operador_id IN (SELECT id FROM operadores WHERE usuario_id IS NULL) AND revogada_em IS NULL;
