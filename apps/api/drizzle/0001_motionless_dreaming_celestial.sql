CREATE TABLE "catalogo_ean" (
	"ean" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"marca" text,
	"conteudo" text,
	"imagem_url" text,
	"fonte" text NOT NULL,
	"confianca" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogo_ean_confirmacoes" (
	"ean" text NOT NULL,
	"loja_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "catalogo_ean_confirmacoes_ean_loja_id_pk" PRIMARY KEY("ean","loja_id")
);
--> statement-breakpoint
ALTER TABLE "catalogo_ean_confirmacoes" ADD CONSTRAINT "catalogo_ean_confirmacoes_loja_id_lojas_id_fk" FOREIGN KEY ("loja_id") REFERENCES "public"."lojas"("id") ON DELETE no action ON UPDATE no action;