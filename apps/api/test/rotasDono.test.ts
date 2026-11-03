import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { and, eq, getTableName, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { gerarId } from '@pdv/shared';
import * as schema from '../src/db/schema';
import { sha256 } from '../src/auth';
import type { Conexao } from '../src/db/conexao';
import { criarApp } from '../src/servidor';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, criarConta, INICIO, NUMEROS, reautenticar, tokenDoCartao, type Ambiente } from './ajuda';

const EAN = '7891000100103';
const ROTAS = ['criar', 'upgrade', 'cartao', 'cancelar', 'reativar', 'catalogo', 'aparelho'] as const;
type Rota = typeof ROTAS[number];
type Conta = Awaited<ReturnType<typeof criarConta>>;
interface Pedido { metodo: 'POST' | 'PUT' | 'DELETE'; url: string; corpo?: object }
const TABELAS = [schema.assinaturas, schema.faturas, schema.eventosCobranca, schema.testesUsados,
  schema.catalogoEan, schema.catalogoEanConfirmacoes, schema.aparelhos, schema.sessoes, schema.operadores,
  schema.produtos, schema.vendas, schema.itensVenda, schema.pagamentosVenda, schema.caixas,
  schema.movimentosCaixa, schema.mudancas, schema.mutacoesAplicadas];
let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { vi.restoreAllMocks(); await amb.fechar(); });

async function snapshot() {
  return Promise.all(TABELAS.map(async tabela => (await amb.db.select().from(tabela)).map(row => JSON.stringify(row)).sort()));
}
function comAlteracao(antes: string[][], tabela: string, id: string, campos: object) {
  const indice = TABELAS.findIndex(t => getTableName(t) === tabela);
  return antes.map((linhas, i) => i !== indice ? linhas : linhas.map(texto => {
    const linha = JSON.parse(texto);
    return linha.id === id ? JSON.stringify({ ...linha, ...campos }) : texto;
  }).sort());
}
function vigiarProvider() {
  const antes = structuredClone(amb.mock.transacoes);
  const verificar = vi.spyOn(amb.billing, 'verificarCartao');
  const cobrar = vi.spyOn(amb.billing, 'cobrar');
  const estornar = vi.spyOn(amb.billing, 'estornar');
  return { verificar, cobrar, estornar, intacto() {
    expect(verificar).not.toHaveBeenCalled();
    expect(cobrar).not.toHaveBeenCalled();
    expect(estornar).not.toHaveBeenCalled();
    expect(amb.mock.transacoes).toEqual(antes);
  } };
}
async function executar(conta: Conta, pedido: Pedido, app = amb.app) {
  return app.inject({ method: pedido.metodo, url: pedido.url,
    headers: { authorization: `Bearer ${conta.token}` },
    ...(pedido.corpo === undefined ? {} : { payload: pedido.corpo }) });
}
async function preparar(rota: Rota): Promise<{ conta: Conta; pedido: Pedido; alvo?: string }> {
  const conta = rota === 'criar' ? await criarConta(amb) : await contaEmTeste(amb);
  if (rota === 'criar') return { conta, pedido: { metodo: 'POST', url: '/assinatura', corpo: { planoId: 'negocio', tokenCartao: tokenDoCartao(NUMEROS.aprova) } } };
  if (rota === 'upgrade') {
    amb.relogio.avancarDias(8);
    expect((await chamar(amb, 'POST', '/dev/jobs/cobranca')).status).toBe(200);
    expect((await amb.db.select().from(schema.assinaturas))[0]?.status).toBe('ativa');
    return { conta, pedido: { metodo: 'POST', url: '/assinatura/trocar-plano', corpo: { planoId: 'pro' } } };
  }
  if (rota === 'cartao') return { conta, pedido: { metodo: 'PUT', url: '/assinatura/cartao', corpo: { tokenCartao: tokenDoCartao(NUMEROS.outroAprova) } } };
  if (rota === 'cancelar') return { conta, pedido: { metodo: 'POST', url: '/assinatura/cancelar' } };
  if (rota === 'reativar') {
    expect((await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token })).status).toBe(200);
    amb.relogio.avancarDias(8);
    return { conta, pedido: { metodo: 'POST', url: '/assinatura/reativar', corpo: { planoId: 'negocio' } } };
  }
  if (rota === 'catalogo') return { conta, pedido: { metodo: 'POST', url: `/catalogo/ean/${EAN}/confirmacao`, corpo: { nome: 'Produto autorizado' } } };
  const alvo = gerarId();
  await reautenticar(amb, { email: conta.email, aparelhoId: alvo });
  return { conta, alvo, pedido: { metodo: 'DELETE', url: `/aparelhos/${alvo}` } };
}

for (const papel of ['operador', 'desconhecido']) {
  it.each(ROTAS)(`nega ${papel} antes de efeitos de %s e aceita o mesmo pedido do dono`, async rota => {
    const { conta, pedido, alvo } = await preparar(rota);
    await amb.db.execute(sql`update operadores set papel = ${papel} where id = ${conta.operadorId}`);
    const antes = await snapshot();
    const provider = vigiarProvider();
    const negada = await executar(conta, pedido);
    expect(negada.statusCode).toBe(403);
    expect(negada.json()).toEqual({ erro: 'proibido', mensagem: rota === 'catalogo' ? 'Seu vínculo não permite esta operação.' : 'Operação permitida somente ao dono.' });
    expect(await snapshot()).toEqual(antes);
    provider.intacto();
    await amb.db.update(schema.operadores).set({ papel: 'dono' }).where(eq(schema.operadores.id, conta.operadorId));
    const permitida = await executar(conta, pedido);
    expect(permitida.statusCode).toBe(rota === 'criar' ? 201 : rota === 'catalogo' || rota === 'aparelho' ? 204 : 200);
    if (rota === 'criar') {
      expect((await amb.db.select().from(schema.assinaturas))[0]).toMatchObject({ contaId: conta.contaId, status: 'em_teste', planoId: 'negocio' });
      expect(provider.verificar).toHaveBeenCalledTimes(1);
    } else if (rota === 'upgrade' || rota === 'reativar') {
      expect((await amb.db.select().from(schema.assinaturas))[0]).toMatchObject({ contaId: conta.contaId, status: 'ativa', planoId: rota === 'upgrade' ? 'pro' : 'negocio' });
      expect(provider.cobrar).toHaveBeenCalledTimes(1);
    } else if (rota === 'cartao') {
      expect((await amb.db.select().from(schema.assinaturas))[0]?.cartaoUltimos4).toBe('4444');
      expect(provider.verificar).toHaveBeenCalledTimes(1);
    } else if (rota === 'cancelar') {
      expect((await amb.db.select().from(schema.assinaturas))[0]?.status).toBe('cancelada');
    } else if (rota === 'catalogo') {
      expect(await amb.db.select().from(schema.catalogoEanConfirmacoes).where(and(eq(schema.catalogoEanConfirmacoes.ean, EAN), eq(schema.catalogoEanConfirmacoes.lojaId, conta.lojaId)))).toMatchObject([{ nome: 'Produto autorizado', lojaId: conta.lojaId, ean: EAN }]);
    } else {
      expect((await amb.db.select().from(schema.aparelhos).where(eq(schema.aparelhos.id, alvo!)))[0]?.revogadoEm).toEqual(amb.relogio.agora());
      const sessoesDoAlvo = await amb.db.select().from(schema.sessoes).where(eq(schema.sessoes.aparelhoId, alvo!));
      expect(sessoesDoAlvo).toHaveLength(1);
      expect(sessoesDoAlvo[0]?.revogadaEm).toEqual(amb.relogio.agora());
    }
  });
}

it.each(['ausente', 'invalida', 'vencida', 'revogada'] as const)('conserva401 para credencial %s sem efeitos nas sete rotas', async estado => {
  const { conta, alvo } = await preparar('aparelho');
  const [sessao] = await amb.db.select().from(schema.sessoes).where(eq(schema.sessoes.tokenHash, sha256(conta.token)));
  if (estado === 'vencida') await amb.db.update(schema.sessoes).set({ expiraEm: amb.relogio.agora() }).where(eq(schema.sessoes.id, sessao!.id));
  if (estado === 'revogada') await amb.db.update(schema.sessoes).set({ revogadaEm: amb.relogio.agora() }).where(eq(schema.sessoes.id, sessao!.id));
  const antes = await snapshot();
  const provider = vigiarProvider();
  const pedidos: Pedido[] = [
    { metodo: 'POST', url: '/assinatura', corpo: { planoId: 'negocio', tokenCartao: tokenDoCartao(NUMEROS.aprova) } },
    { metodo: 'POST', url: '/assinatura/trocar-plano', corpo: { planoId: 'pro' } },
    { metodo: 'PUT', url: '/assinatura/cartao', corpo: { tokenCartao: tokenDoCartao(NUMEROS.outroAprova) } },
    { metodo: 'POST', url: '/assinatura/cancelar' },
    { metodo: 'POST', url: '/assinatura/reativar', corpo: { planoId: 'negocio' } },
    { metodo: 'POST', url: `/catalogo/ean/${EAN}/confirmacao`, corpo: { nome: 'Produto autorizado' } },
    { metodo: 'DELETE', url: `/aparelhos/${alvo}` },
  ];
  for (const pedido of pedidos) {
    const resposta = await amb.app.inject({ method: pedido.metodo, url: pedido.url,
      headers: estado === 'ausente' ? {} : { authorization: `Bearer ${estado === 'invalida' ? 'invalido' : conta.token}` },
      ...(pedido.corpo === undefined ? {} : { payload: pedido.corpo }) });
    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().erro).toBe('nao_autenticado');
    expect(await snapshot()).toEqual(antes);
    provider.intacto();
  }
});

it('distingue DTO inválido do dono, negação do operador e JSON inválido', async () => {
  const conta = await criarConta(amb);
  const provider = vigiarProvider();
  const antes = await snapshot();
  expect((await executar(conta, { metodo: 'POST', url: '/assinatura', corpo: {} })).statusCode).toBe(400);
  const json = await amb.app.inject({ method: 'POST', url: '/assinatura', headers: { authorization: `Bearer ${conta.token}`, 'content-type': 'application/json' }, payload: '{' });
  expect(json.statusCode).toBe(400);
  expect(json.json().erro).toBe('json_invalido');
  expect(await snapshot()).toEqual(antes);
  await amb.db.update(schema.operadores).set({ papel: 'operador' }).where(eq(schema.operadores.id, conta.operadorId));
  const operador = await snapshot();
  const proibida = await executar(conta, { metodo: 'POST', url: '/assinatura', corpo: { papel: 'dono' } });
  expect(proibida.statusCode).toBe(403);
  expect(proibida.json().erro).toBe('proibido');
  expect(await snapshot()).toEqual(operador);
  provider.intacto();
});

it('nega não dono antes de validar DTOs e parâmetros das escritas', async () => {
  const conta = await contaEmTeste(amb);
  const pedidos: Pedido[] = [
    { metodo: 'POST', url: '/assinatura', corpo: {} },
    { metodo: 'POST', url: '/assinatura/trocar-plano', corpo: {} },
    { metodo: 'PUT', url: '/assinatura/cartao', corpo: {} },
    { metodo: 'POST', url: '/assinatura/reativar', corpo: {} },
    { metodo: 'POST', url: '/catalogo/ean/invalido/confirmacao', corpo: { nome: 'Produto autorizado' } },
    { metodo: 'DELETE', url: '/aparelhos/invalido' },
  ];
  const provider = vigiarProvider();
  const dono = await snapshot();
  for (const pedido of pedidos) expect((await executar(conta, pedido)).statusCode).toBe(400);
  expect(await snapshot()).toEqual(dono);
  await amb.db.update(schema.operadores).set({ papel: 'operador' }).where(eq(schema.operadores.id, conta.operadorId));
  const operador = await snapshot();
  for (const pedido of pedidos) {
    const resposta = await executar(conta, pedido);
    expect(resposta.statusCode).toBe(403);
    expect(resposta.json()).toEqual({ erro: 'proibido', mensagem: pedido.url.startsWith('/catalogo/') ? 'Seu vínculo não permite esta operação.' : 'Operação permitida somente ao dono.' });
    expect(await snapshot()).toEqual(operador);
  }
  provider.intacto();
});

it.each(['cancelar', 'catalogo'] as const)('revalida prazo entre hook e guarda de %s', async rota => {
  const { conta, pedido } = await preparar(rota);
  const [sessao] = await amb.db.select().from(schema.sessoes).where(eq(schema.sessoes.tokenHash, sha256(conta.token)));
  let emRequisicao = false;
  const leituras: Date[] = [];
  const relogio = { agora() {
    if (!emRequisicao) return INICIO;
    const instante = leituras.length === 0 ? INICIO : sessao!.expiraEm;
    leituras.push(instante);
    return instante;
  } };
  const app = await criarApp({ db: amb.db, relogio, billing: amb.billing, fontesEan: [] });
  const antes = await snapshot();
  const provider = vigiarProvider();
  try {
    emRequisicao = true;
    const resposta = await executar(conta, pedido, app);
    expect(leituras[0]).toEqual(INICIO);
    expect(leituras[1]).toEqual(sessao!.expiraEm);
    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().erro).toBe('nao_autenticado');
    expect(await snapshot()).toEqual(antes);
    provider.intacto();
  } finally { await app.close(); }
});

it('preserva leitura, logout próprio e restrição já existente da lista de aparelhos', async () => {
  const conta = await contaEmTeste(amb);
  await amb.db.insert(schema.catalogoEan).values({ ean: EAN, nome: 'Produto em cache', marca: null, conteudo: null, imagemUrl: null, fonte: 'proprio', confianca: 'confirmada', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.update(schema.operadores).set({ papel: 'operador' }).where(eq(schema.operadores.id, conta.operadorId));
  const antes = await snapshot();
  const provider = vigiarProvider();
  expect((await chamar(amb, 'GET', '/planos')).status).toBe(200);
  expect((await chamar(amb, 'GET', '/assinatura', { token: conta.token })).status).toBe(200);
  const catalogo = await chamar(amb, 'GET', `/catalogo/ean/${EAN}`, { token: conta.token });
  expect(catalogo.status).toBe(200);
  expect(catalogo.corpo).toMatchObject({ ean: EAN, nome: 'Produto em cache' });
  expect((await chamar(amb, 'GET', '/aparelhos', { token: conta.token })).status).toBe(403);
  expect(await snapshot()).toEqual(antes);
  expect((await chamar(amb, 'POST', '/auth/logout', { token: conta.token })).status).toBe(204);
  const [sessao] = await amb.db.select().from(schema.sessoes).where(eq(schema.sessoes.tokenHash, sha256(conta.token)));
  expect(sessao!.revogadaEm).toEqual(INICIO);
  expect((await chamar(amb, 'GET', '/assinatura', { token: conta.token })).status).toBe(401);
  provider.intacto();
});

it('não revoga alvo de outra conta', async () => {
  const a = await contaEmTeste(amb);
  const b = await criarConta(amb);
  const antes = await snapshot();
  const res = await executar(a, { metodo: 'DELETE', url: `/aparelhos/${b.aparelhoId}` });
  expect(res.statusCode).toBe(404);
  expect(res.json().erro).toBe('aparelho_nao_encontrado');
  expect(await snapshot()).toEqual(antes);
});

if (process.env.PDV_TEST_POSTGRES_URL) {
  for (const caso of ['papel', 'sessao', 'aparelho', 'prazo-conta', 'prazo-sessao'] as const) {
    it(`revalida ${caso} depois da espera ao revogar aparelho`, async () => {
      const { conta, pedido } = await preparar('aparelho');
      const [sessao] = await amb.db.select().from(schema.sessoes).where(eq(schema.sessoes.tokenHash, sha256(conta.token)));
      const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      const segunda = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
      let pendente: ReturnType<typeof executar> | undefined;
      const antes = await snapshot();
      let esperado = antes;
      try {
        await controle`begin`;
        const pid = Number((await controle`select pg_backend_pid() as pid`)[0]!.pid);
        const tabela = caso === 'prazo-sessao' ? 'sessoes' : 'contas';
        await controle.unsafe(`select id from ${tabela} where id = $1 for update`, [tabela === 'sessoes' ? sessao!.id : conta.contaId]);
        pendente = executar(conta, pedido, segunda);
        let bloqueada = false;
        for (let i = 0; i < 200 && !bloqueada; i++) {
          bloqueada = (await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query ilike ${'%' + tabela + '%'} and query ilike '%for update%'`).length > 0;
          if (!bloqueada) await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(bloqueada).toBe(true);
        if (caso === 'papel') {
          await controle`update operadores set papel = 'operador' where id = ${conta.operadorId}`;
          esperado = comAlteracao(antes, 'operadores', conta.operadorId, { papel: 'operador' });
        } else if (caso === 'sessao') {
          await controle`update sessoes set revogada_em = ${INICIO} where id = ${sessao!.id}`;
          esperado = comAlteracao(antes, 'sessoes', sessao!.id, { revogadaEm: INICIO });
        } else if (caso === 'aparelho') {
          await controle`update aparelhos set revogado_em = ${INICIO} where id = ${conta.aparelhoId}`;
          esperado = comAlteracao(antes, 'aparelhos', conta.aparelhoId, { revogadoEm: INICIO });
        } else {
          amb.relogio.definir(sessao!.expiraEm);
        }
        await controle`commit`;
        const resposta = await pendente;
        expect(resposta.statusCode).toBe(caso === 'papel' ? 403 : 401);
        expect(resposta.json().erro).toBe(caso === 'papel' ? 'proibido' : 'nao_autenticado');
        expect(await snapshot()).toEqual(esperado);
      } finally {
        await controle`rollback`.catch(() => undefined);
        await pendente?.catch(() => undefined);
        await segunda.close();
        await controle.end();
        await observador.end();
      }
    });
  }

  it('revoga em Read Committed com default Serializable sem mudar configuração global', async () => {
    const { conta, pedido, alvo } = await preparar('aparelho');
    const cliente = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    await cliente`set default_transaction_isolation = 'serializable'`;
    const app = await criarApp({ db: drizzle(cliente, { schema }), relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
    try {
      await controle`create function dono_teste_isolamento() returns trigger language plpgsql as $$ begin if current_setting('transaction_isolation') <> 'read committed' then raise exception 'isolamento inesperado'; end if; return new; end $$`;
      await controle`create trigger dono_teste_isolamento before update on aparelhos for each row execute function dono_teste_isolamento()`;
      const resposta = await executar(conta, pedido, app);
      expect(resposta.statusCode).toBe(204);
      expect((await amb.db.select().from(schema.aparelhos).where(eq(schema.aparelhos.id, alvo!)))[0]?.revogadoEm).toEqual(INICIO);
    } finally {
      await controle`drop trigger if exists dono_teste_isolamento on aparelhos`;
      await controle`drop function if exists dono_teste_isolamento()`;
      await app.close();
      await cliente.end();
      await controle.end();
    }
  });
}
