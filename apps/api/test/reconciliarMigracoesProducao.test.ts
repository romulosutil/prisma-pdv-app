import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { drizzle as drizzleLite } from 'drizzle-orm/pglite';
import { migrate as migrateLite } from 'drizzle-orm/pglite/migrator';
import { abrirPostgres } from '../src/db/conexao';

/**
 * Reproduz o estado do banco de produção (migrado pela branch main: 0000-0007 + 0008_lyrical_blindfold
 * + 0009_vengeful_champions) e valida scripts/reconciliar-migracoes-producao.sql.
 * Com PDV_TEST_POSTGRES_URL (CI) usa bancos PostgreSQL descartáveis (inclusive um chamado `pdv`, exigido
 * pela trava do script) e a rota real `abrirPostgres`. Sem ela, usa PGlite em memória (a trava do nome do
 * banco é ajustada para `postgres`) e o mesmo migrator do drizzle.
 */
const AQUI = dirname(fileURLToPath(import.meta.url));
const PASTA_DRIZZLE = resolve(AQUI, '../drizzle');
const PASTA_FIXTURE = join(AQUI, 'fixtures/migracoes-main');
const ARQUIVO_SCRIPT = resolve(AQUI, '../../../scripts/reconciliar-migracoes-producao.sql');
const URL_ADMIN = process.env.PDV_TEST_POSTGRES_URL;
const HASH_0008_MAIN = '3385f917edfb2b96d85cd0ccd724c1577baf40aa8d26fc9bd13d0b4ca650b25b';
const HASH_0009_MAIN = 'c4e8c2a3333a8e3bc48044dd5f846306f5467cab5cbd503b1c88ed60f75b2039';
const lf = (texto: string) => texto.replace(/\r\n/g, '\n');

type Linha = Record<string, unknown>;
interface Banco {
  exec(comandos: string): Promise<void>;
  linhas(consulta: string): Promise<Linha[]>;
  migrarPasta(pasta: string): Promise<void>;
  migrarBranch(): Promise<void>;
  fechar(): Promise<void>;
}

function urlDoBanco(nome: string): string {
  const url = new URL(URL_ADMIN!);
  // Mesmo cuidado do helper dos demais testes: só banco local dedicado.
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/pdv_test') {
    throw new Error('PDV_TEST_POSTGRES_URL deve apontar para o banco local dedicado pdv_test.');
  }
  url.pathname = `/${nome}`;
  return url.toString();
}

async function abrirBancoPostgres(nome: string): Promise<Banco> {
  const admin = postgres(URL_ADMIN!, { max: 1, onnotice: () => {} });
  urlDoBanco(nome);
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${nome}`);
  } finally { await admin.end(); }
  const url = urlDoBanco(nome);
  const cliente = postgres(url, { max: 1, onnotice: () => {} });
  return {
    exec: async (c) => { await cliente.unsafe(c); },
    linhas: async (c) => [...(await cliente.unsafe(c))] as Linha[],
    migrarPasta: (pasta) => migratePg(drizzlePg(cliente), { migrationsFolder: pasta }),
    migrarBranch: async () => { await (await abrirPostgres(url)).fechar(); },
    fechar: () => cliente.end(),
  };
}

async function abrirBancoPglite(): Promise<Banco> {
  const cliente = new PGlite();
  return {
    exec: async (c) => { await cliente.exec(c); },
    linhas: async (c) => (await cliente.query(c)).rows as Linha[],
    migrarPasta: (pasta) => migrateLite(drizzleLite(cliente), { migrationsFolder: pasta }),
    migrarBranch: () => migrateLite(drizzleLite(cliente), { migrationsFolder: PASTA_DRIZZLE }),
    fechar: () => cliente.close(),
  };
}

const abrirBanco = (nome: string) => (URL_ADMIN ? abrirBancoPostgres(nome) : abrirBancoPglite());

let pastaEstadoMain: string;
let scriptSql: string;

/** Pasta de migrações idêntica à da main no deploy: 0000-0007 + os dois SQL da main (fim de linha LF, como no hash). */
async function montarPastaMain(): Promise<string> {
  const raiz = await mkdtemp(join(tmpdir(), 'pdv-migracoes-main-'));
  await mkdir(join(raiz, 'meta'));
  type Jornal = { entries: { tag: string }[] };
  const jornalBranch = JSON.parse(await readFile(join(PASTA_DRIZZLE, 'meta/_journal.json'), 'utf8')) as Jornal;
  const jornalMain = JSON.parse(await readFile(join(PASTA_FIXTURE, 'meta/_journal.json'), 'utf8')) as Jornal;
  expect(jornalMain.entries).toHaveLength(10);
  expect(jornalMain.entries.slice(0, 8)).toEqual(jornalBranch.entries.slice(0, 8));
  await writeFile(join(raiz, 'meta/_journal.json'), JSON.stringify(jornalMain));
  for (const [i, e] of jornalMain.entries.entries()) {
    const origem = join(i < 8 ? PASTA_DRIZZLE : PASTA_FIXTURE, `${e.tag}.sql`);
    await writeFile(join(raiz, `${e.tag}.sql`), lf(await readFile(origem, 'utf8')));
  }
  return raiz;
}

async function bancoNoEstadoDaMain(nome: string): Promise<Banco> {
  const banco = await abrirBanco(nome);
  await banco.migrarPasta(pastaEstadoMain);
  return banco;
}

async function rodarScript(banco: Banco): Promise<void> {
  try { await banco.exec(scriptSql); } catch (erro) {
    try { await banco.exec('ROLLBACK'); } catch { /* sessão já fora da transação */ }
    throw erro;
  }
}

const existe = async (banco: Banco, tabela: string) =>
  (await banco.linhas(`SELECT to_regclass('public.${tabela}') IS NOT NULL AS ok`))[0]!.ok as boolean;
const historico = (banco: Banco) =>
  banco.linhas('SELECT hash, created_at::text AS created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, hash');

async function fotoSchema(banco: Banco) {
  return {
    colunas: await banco.linhas(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
        character_maximum_length, numeric_precision, datetime_precision
      FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, column_name`),
    indices: await banco.linhas(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname`),
    restricoes: await banco.linhas(`SELECT conrelid::regclass::text AS tabela, conname, contype, pg_get_constraintdef(oid) AS definicao
      FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY 1, conname`),
  };
}

const criadoEm = (linhas: Linha[]) => linhas.map((l) => l.created_at);
const hashDe = (texto: string) => createHash('sha256').update(lf(texto)).digest('hex');
const COLUNAS_MAIN = `SELECT table_name || '.' || column_name AS c FROM information_schema.columns WHERE table_schema = 'public'
  AND (table_name, column_name) IN (('itens_venda','controla_estoque'),('produtos','ajustes_estoque'),('produtos','estoque_ativo')) ORDER BY 1`;

beforeAll(async () => {
  pastaEstadoMain = await montarPastaMain();
  const original = await readFile(ARQUIVO_SCRIPT, 'utf8');
  // O script exige o banco `pdv`; em PGlite o banco se chama `postgres`.
  scriptSql = URL_ADMIN ? original : original.replace("current_database() <> 'pdv'", "current_database() <> 'postgres'");
  if (!URL_ADMIN) expect(scriptSql).not.toBe(original);
});
afterAll(async () => { if (pastaEstadoMain) await rm(pastaEstadoMain, { recursive: true, force: true }); });

describe('reconciliação das migrações de produção (estado deixado pela main)', () => {
  it('os SQL da main guardados como fixture têm os hashes que o script espera', async () => {
    expect(hashDe(await readFile(join(PASTA_FIXTURE, '0008_lyrical_blindfold.sql'), 'utf8'))).toBe(HASH_0008_MAIN);
    expect(hashDe(await readFile(join(PASTA_FIXTURE, '0009_vengeful_champions.sql'), 'utf8'))).toBe(HASH_0009_MAIN);
    expect(scriptSql).toContain(HASH_0008_MAIN);
    expect(scriptSql).toContain(HASH_0009_MAIN);
  });

  it('SEM reconciliação o deploy desta branch deixa o banco sem a tabela usuarios (defeito documentado)', async () => {
    const banco = await bancoNoEstadoDaMain('pdv');
    try {
      expect(await historico(banco)).toHaveLength(10);
      expect(await existe(banco, 'usuarios')).toBe(false);
      // 0008-0011 são puladas em silêncio; 0012-0014 (created_at maior) ainda tentam rodar e podem falhar.
      await banco.migrarBranch().catch(() => undefined);
      expect(await existe(banco, 'usuarios')).toBe(false);
    } finally { await banco.fechar(); }
  }, 120_000);

  it('trava: valor não nulo em produtos.estoque_ativo aborta sem alterar nada', async () => {
    const banco = await bancoNoEstadoDaMain('pdv');
    try {
      const conta = randomUUID(); const loja = randomUUID();
      await banco.exec(`INSERT INTO contas (id, email, documento, nome_responsavel, criado_em, atualizado_em)
        VALUES ('${conta}', 'a@b.c', '1', 'x', now(), now());
        INSERT INTO lojas (id, conta_id, nome, criado_em, atualizado_em) VALUES ('${loja}', '${conta}', 'l', now(), now());
        INSERT INTO produtos (id, loja_id, nome, preco_centavos, unidade, atalho, criado_em, atualizado_em, versao, estoque_ativo)
        VALUES ('${randomUUID()}', '${loja}', 'p', 100, 'un', false, now(), now(), 1, true)`);
      const antes = { h: await historico(banco), s: await fotoSchema(banco) };
      await expect(rodarScript(banco)).rejects.toThrow(/Perda de dado evitada/);
      expect(await historico(banco)).toEqual(antes.h);
      expect(await fotoSchema(banco)).toEqual(antes.s);
      expect(await banco.linhas('SELECT estoque_ativo FROM produtos')).toEqual([{ estoque_ativo: true }]);
    } finally { await banco.fechar(); }
  }, 120_000);

  it('trava: hash fora da lista conhecida aborta sem alterar nada', async () => {
    const banco = await bancoNoEstadoDaMain('pdv');
    try {
      await banco.exec(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('desconhecido', 1793000000000)`);
      const antes = await fotoSchema(banco);
      await expect(rodarScript(banco)).rejects.toThrow(/fora da lista conhecida/);
      expect(await historico(banco)).toHaveLength(11);
      expect(await fotoSchema(banco)).toEqual(antes);
      expect(await banco.linhas(COLUNAS_MAIN)).toHaveLength(3);
    } finally { await banco.fechar(); }
  }, 120_000);

  it('após reconciliar, abrirPostgres/migrate gera schema idêntico ao de um banco novo e o script é idempotente', async () => {
    const referencia = await abrirBanco('pdv_ref_migracoes');
    let esperado: Awaited<ReturnType<typeof fotoSchema>>;
    let historicoEsperado: Linha[];
    try {
      await referencia.migrarBranch();
      esperado = await fotoSchema(referencia);
      historicoEsperado = await historico(referencia);
    } finally { await referencia.fechar(); }
    expect(historicoEsperado).toHaveLength(16); // 0000-0015 (0013: MP; 0014: OAuth; 0015: InfinitePay, Play Billing, detalhes pagamento)

    const banco = await bancoNoEstadoDaMain('pdv');
    try {
      await rodarScript(banco);
      expect(await historico(banco)).toHaveLength(8);
      expect(await banco.linhas(COLUNAS_MAIN)).toEqual([]);
      expect(await banco.linhas(`SELECT indexname FROM pg_indexes WHERE indexname = 'itens_venda_estoque_idx'`)).toEqual([]);

      const aposScript = { h: await historico(banco), s: await fotoSchema(banco) };
      await rodarScript(banco); // segunda execução: já reconciliado, sem erro e sem alteração
      expect({ h: await historico(banco), s: await fotoSchema(banco) }).toEqual(aposScript);

      await banco.migrarBranch();
      expect(await existe(banco, 'usuarios')).toBe(true);
      // O drizzle só usa created_at; os hashes de 0000-0007 já gravados (LF, como no Linux de produção)
      // permanecem e os de um checkout Windows (CRLF) podem divergir do banco de referência.
      expect(criadoEm(await historico(banco))).toEqual(criadoEm(historicoEsperado));
      expect((await historico(banco)).slice(0, 8)).toEqual(aposScript.h);
      expect(await fotoSchema(banco)).toEqual(esperado);

      const aposDeploy = await historico(banco);
      await rodarScript(banco); // depois do deploy também é inofensivo
      expect(await historico(banco)).toEqual(aposDeploy);
      expect(await fotoSchema(banco)).toEqual(esperado);
    } finally { await banco.fechar(); }
  }, 180_000);

  it('trava: banco com outro nome não é alterado (apenas PostgreSQL real)', async () => {
    if (!URL_ADMIN) return; // em PGlite o nome do banco foi ajustado artificialmente
    const banco = await bancoNoEstadoDaMain('pdv_outro');
    try {
      await expect(rodarScript(banco)).rejects.toThrow(/Banco incorreto/);
      expect(await historico(banco)).toHaveLength(10);
    } finally { await banco.fechar(); }
  }, 120_000);
});
