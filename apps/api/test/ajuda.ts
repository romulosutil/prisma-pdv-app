import type { FastifyInstance } from 'fastify';
import {
  gerarId,
  MockBillingProvider,
  RelogioFalso,
  tokenizarCartaoMock,
  type BillingProvider,
  type Caixa,
  type CriarContaRes,
  type Mutacao,
  type PlanoId,
  type Produto,
  type Venda,
} from '@pdv/shared';
import { asc, eq, getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { abrirPglite, abrirPostgres, type Conexao, type Db } from '../src/db/conexao';
import type { FonteEan } from '../src/fontes/fonte';
import * as schema from '../src/db/schema';
import { criarApp } from '../src/servidor';

export const INICIO = new Date('2026-03-10T12:00:00.000Z');

export const NUMEROS = {
  aprova: '4242 4242 4242 4242',
  recusaVerificacao: '4000 0000 0000 0002',
  recusaCobranca: '4000 0000 0000 0341',
  outroAprova: '5555 5555 5555 4444',
} as const;

export interface Ambiente {
  app: FastifyInstance;
  db: Db;
  relogio: RelogioFalso;
  billing: BillingProvider;
  mock: MockBillingProvider;
  fechar(): Promise<void>;
}

const TABELAS = Object.values(schema)
  .filter((t) => is(t, PgTable))
  .map((t) => `"${getTableName(t)}"`)
  .join(', ');

/** Um PGlite por arquivo de teste (a partida custa ~1s); cada teste começa com as tabelas vazias. */
export const abrirBanco = async (): Promise<Conexao> => {
  const endereco = process.env.PDV_TEST_POSTGRES_URL;
  if (!endereco) return abrirPglite();
  const url = new URL(endereco);
  // O helper faz TRUNCATE: somente um banco local dedicado pode ser usado por este comando.
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/pdv_test') {
    throw new Error('PDV_TEST_POSTGRES_URL deve apontar para o banco local dedicado pdv_test.');
  }
  const conexao = await abrirPostgres(endereco);
  try {
    // Em PGlite cada arquivo recebe um banco novo; PostgreSQL também começa isolado por arquivo.
    await conexao.db.execute(sql.raw(`truncate table ${TABELAS} restart identity cascade`));
    return conexao;
  } catch (erro) { await conexao.fechar(); throw erro; }
};

export async function criarAmbiente(
  conexao: Conexao,
  billing?: (mock: MockBillingProvider) => BillingProvider,
  fontesEan: FonteEan[] = [],
  orcamentoEanMs?: number,
): Promise<Ambiente> {
  await conexao.db.execute(sql.raw(`truncate table ${TABELAS} restart identity cascade`));
  const relogio = new RelogioFalso(INICIO);
  const mock = new MockBillingProvider();
  const provider = billing ? billing(mock) : mock;
  const app = await criarApp({ db: conexao.db, relogio, billing: provider, fontesEan, orcamentoEanMs });
  return { app, db: conexao.db, relogio, billing: provider, mock, fechar: () => app.close() };
}

export function tokenDoCartao(numero: string): string {
  const r = tokenizarCartaoMock({ numero, validade: '12/30', cvv: '123', nome: 'Maria Souza' }, INICIO);
  if (!r.ok) throw new Error(`Cartão de teste inválido: ${r.motivo}`);
  return r.token;
}

export interface Resposta<T = any> {
  status: number;
  corpo: T;
}

export async function chamar<T = any>(
  amb: Ambiente,
  metodo: 'GET' | 'POST' | 'PUT',
  url: string,
  opcoes: { token?: string; corpo?: unknown } = {},
): Promise<Resposta<T>> {
  const res = await amb.app.inject({
    method: metodo,
    url,
    headers: opcoes.token ? { authorization: `Bearer ${opcoes.token}` } : {},
    ...(opcoes.corpo === undefined ? {} : { payload: opcoes.corpo as object }),
  });
  return { status: res.statusCode, corpo: res.body ? (res.json() as T) : (undefined as T) };
}

let contador = 0;

/** Cria conta + loja + dono + aparelho; cada chamada usa e-mail e documento novos. */
export async function criarConta(amb: Ambiente, sobrescrever: Partial<{ email: string; documento: string; aparelhoId: string }> = {}) {
  contador += 1;
  const dados = {
    email: `lojista${contador}@exemplo.com.br`,
    nomeResponsavel: 'Maria Souza',
    nomeLoja: 'Mercadinho da Maria',
    documento: String(10_000_000_000 + contador),
    aparelhoId: gerarId(),
    aparelhoNome: 'Celular da Maria',
    ...sobrescrever,
  };
  const res = await chamar<CriarContaRes>(amb, 'POST', '/contas', { corpo: dados });
  if (res.status !== 201) throw new Error(`Falha ao criar conta: ${JSON.stringify(res.corpo)}`);
  return { ...res.corpo, email: dados.email, documento: dados.documento };
}

/** Fixture explícita: cenários comerciais que passam de 30 dias exigem nova autenticação. */
export async function reautenticar(amb: Ambiente, conta: { email: string; aparelhoId: string }) {
  const codigo = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } });
  if (codigo.status !== 200) throw new Error('Falha ao emitir código da fixture de autenticação.');
  const login = await chamar<import('@pdv/shared').Sessao>(amb, 'POST', '/auth/login', {
    corpo: { email: conta.email, codigo: codigo.corpo.codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'Celular da Maria' },
  });
  if (login.status !== 200) throw new Error('Falha ao autenticar novamente a fixture.');
  return login.corpo;
}

export async function assinar(amb: Ambiente, token: string, planoId: PlanoId = 'negocio', numero: string = NUMEROS.aprova) {
  return chamar(amb, 'POST', '/assinatura', { token, corpo: { planoId, tokenCartao: tokenDoCartao(numero) } });
}

/** Conta nova já em teste grátis. */
export async function contaEmTeste(amb: Ambiente, planoId: PlanoId = 'negocio', numero: string = NUMEROS.aprova) {
  const conta = await criarConta(amb);
  const res = await assinar(amb, conta.token, planoId, numero);
  if (res.status !== 201) throw new Error(`Falha ao assinar: ${JSON.stringify(res.corpo)}`);
  return conta;
}

export async function avancarEProcessar(amb: Ambiente, dias: number) {
  amb.relogio.avancarDias(dias);
  const res = await chamar(amb, 'POST', '/dev/jobs/cobranca');
  if (res.status !== 200) throw new Error(`Job falhou: ${JSON.stringify(res.corpo)}`);
  return res.corpo;
}

export async function statusDe(amb: Ambiente, token: string): Promise<string> {
  const res = await chamar(amb, 'GET', '/assinatura', { token });
  return res.corpo.assinatura.status;
}

// ---------- Sync ----------

export function produto(lojaId: string, sobrescrever: Partial<Produto> = {}): Produto {
  const agora = INICIO.toISOString();
  return {
    id: gerarId(),
    lojaId,
    nome: 'Arroz 5kg',
    ean: null,
    precoCentavos: 2590,
    unidade: 'un',
    estoque: null,
    estoqueMinimo: null,
    atalho: false,
    criadoEm: agora,
    atualizadoEm: agora,
    excluidoEm: null,
    versao: 0,
    ...sobrescrever,
  };
}

export function venda(conta: { lojaId: string; aparelhoId: string; operadorId: string }, sobrescrever: Partial<Venda> = {}): Venda {
  return {
    id: gerarId(),
    lojaId: conta.lojaId,
    aparelhoId: conta.aparelhoId,
    operadorId: conta.operadorId,
    itens: [
      { id: gerarId(), produtoId: null, descricao: 'Pão', precoUnitarioCentavos: 100, quantidadeMilesimos: 2000, totalCentavos: 200 },
      { id: gerarId(), produtoId: null, descricao: 'Leite', precoUnitarioCentavos: 500, quantidadeMilesimos: 1000, totalCentavos: 500 },
    ],
    pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 1000, trocoCentavos: 300 }],
    totalCentavos: 700,
    status: 'concluida',
    criadaEm: INICIO.toISOString(),
    ...sobrescrever,
  };
}

export function mutacao(entidade: 'produto', dados: Produto): Mutacao;
export function mutacao(entidade: 'venda', dados: Venda): Mutacao;
export function mutacao(entidade: 'caixa', dados: Caixa): Mutacao;
export function mutacao(entidade: 'produto' | 'venda' | 'caixa', dados: Produto | Venda | Caixa): Mutacao {
  return { id: gerarId(), criadaEm: INICIO.toISOString(), entidade, operacao: 'upsert', dados } as Mutacao;
}

export function exclusao(entidade: 'produto' | 'venda' | 'caixa', id: string, criadaEm: Date = INICIO): Mutacao {
  return { id: gerarId(), criadaEm: criadaEm.toISOString(), entidade, operacao: 'delete', dados: { id } };
}

export async function enviar(amb: Ambiente, conta: { token: string; aparelhoId: string }, mutacoes: Mutacao[]) {
  return chamar(amb, 'POST', '/sync/push', { token: conta.token, corpo: { aparelhoId: conta.aparelhoId, mutacoes } });
}

// ---------- Leituras diretas do banco ----------

export async function faturasDe(amb: Ambiente) {
  return amb.db.select().from(schema.faturas).orderBy(asc(schema.faturas.criadoEm), asc(schema.faturas.id));
}

export async function eventosDe(amb: Ambiente, tipo: string) {
  return amb.db.select().from(schema.eventosCobranca).where(eq(schema.eventosCobranca.tipo, tipo));
}
