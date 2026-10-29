CREATE TABLE "limites_auth" (
	"chave" text PRIMARY KEY NOT NULL,
	"janela_inicio" timestamp with time zone NOT NULL,
	"usos" integer NOT NULL,
	"ultimo_uso_em" timestamp with time zone
);
