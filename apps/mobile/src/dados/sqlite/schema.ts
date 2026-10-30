import type { BancoSqlite } from './driver';

export const VERSAO_SCHEMA = 2;

// IDs são fornecidos pelo domínio; o banco nunca gera IDs de entidades ou mutações.
// JSON preserva o contrato completo; colunas de relacionamento impõem a partição.
const MIGRACAO_1 = `
CREATE TABLE produtos (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, id)
);
CREATE TABLE caixas (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, id TEXT NOT NULL, payload_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, id)
);
CREATE TABLE vendas (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, id TEXT NOT NULL, caixa_id TEXT, payload_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, id),
  FOREIGN KEY (conta_id, loja_id, caixa_id) REFERENCES caixas (conta_id, loja_id, id)
);
CREATE TABLE itens_venda (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, venda_id TEXT NOT NULL, id TEXT NOT NULL,
  posicao INTEGER NOT NULL CHECK (posicao >= 0), payload_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, venda_id, id),
  UNIQUE (conta_id, loja_id, venda_id, posicao),
  FOREIGN KEY (conta_id, loja_id, venda_id) REFERENCES vendas (conta_id, loja_id, id) ON DELETE CASCADE
);
CREATE TABLE pagamentos_venda (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, venda_id TEXT NOT NULL, id TEXT NOT NULL,
  posicao INTEGER NOT NULL CHECK (posicao >= 0), payload_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, venda_id, id),
  UNIQUE (conta_id, loja_id, venda_id, posicao),
  FOREIGN KEY (conta_id, loja_id, venda_id) REFERENCES vendas (conta_id, loja_id, id) ON DELETE CASCADE
);
CREATE TABLE rascunhos (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, venda_id TEXT NOT NULL, payload_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, venda_id)
);
CREATE TABLE outbox (
  sequencia INTEGER PRIMARY KEY AUTOINCREMENT, conta_id TEXT NOT NULL, loja_id TEXT NOT NULL,
  id TEXT NOT NULL UNIQUE, payload_json TEXT NOT NULL
);
CREATE INDEX outbox_particao_ordem ON outbox (conta_id, loja_id, sequencia);
-- Metadados globais não devem conter credenciais.
CREATE TABLE estado_local (chave TEXT PRIMARY KEY NOT NULL, valor_json TEXT NOT NULL);
-- Marcador gravado somente após validação da migração; origem permanece intacta.
CREATE TABLE migracoes_legado (
  conta_id TEXT NOT NULL, loja_id TEXT NOT NULL, chave TEXT NOT NULL, resumo_json TEXT NOT NULL,
  PRIMARY KEY (conta_id, loja_id, chave)
);
`;

/** Ativa FKs por conexão e aplica cada versão atomicamente, sem aceitar downgrade. */
export async function inicializarSchema(db: BancoSqlite): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.withExclusiveTransactionAsync(async (tx) => {
    const atual = await tx.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (!atual || !Number.isInteger(atual.user_version) || atual.user_version < 0) {
      throw new Error('Versão do schema SQLite inválida');
    }
    if (atual.user_version > VERSAO_SCHEMA) {
      throw new Error('Schema SQLite mais recente que esta versão do aplicativo');
    }
    if (atual.user_version < 1) {
      await tx.execAsync(MIGRACAO_1);
      await tx.execAsync('PRAGMA user_version = 1');
    }
    if (atual.user_version < 2) {
      await tx.execAsync('PRAGMA user_version = 2');
    }
  });
}
