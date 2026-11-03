import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema';
import { sha256 } from '../src/auth';
import { aparelhos, assinaturas, caixas, itensVenda, movimentosCaixa, mudancas, mutacoesAplicadas, pagamentosVenda, sessoes, vendas } from '../src/db/schema';
import { gerarId, type Mutacao } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import { aplicarPush } from '../src/servicos/sync';
import { criarApp } from '../src/servidor';
import { abrirBanco, contaEmTeste, criarAmbiente, criarConta, enviar, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

async function snapshot() {
  const tabelas = [vendas, itensVenda, pagamentosVenda, caixas, movimentosCaixa, mudancas, mutacoesAplicadas, sessoes];
  return Promise.all(tabelas.map(async tabela => (await amb.db.select().from(tabela)).map(row => JSON.stringify(row)).sort()));
}

async function preencher(conta: Awaited<ReturnType<typeof contaEmTeste>>) {
  const m = mutacao('venda', venda(conta));
  const caixa = mutacao('caixa', { id: gerarId(), lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId,
    abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 100 }, fechamento: null,
    movimentos: [{ id: gerarId(), tipo: 'sangria', valorCentavos: 50, motivo: 'Cofre', criadoEm: INICIO.toISOString() }] });
  expect((await enviar(amb, conta, [m, caixa])).status).toBe(200);
  expect((await snapshot()).every(linhas => linhas.length > 0)).toBe(true);
  return m;
}

async function conferirVenda(m: Mutacao, conta: Awaited<ReturnType<typeof contaEmTeste>>, instante: Date) {
  if (m.entidade !== 'venda' || m.operacao !== 'upsert') throw new Error('Fixture exige venda');
  const v = m.dados;
  expect(await amb.db.select().from(vendas).where(eq(vendas.id, v.id))).toEqual([{ id: v.id, lojaId: v.lojaId, aparelhoId: v.aparelhoId, operadorId: v.operadorId, caixaId: v.caixaId ?? null, cancelamento: v.cancelamento ?? null, totalCentavos: v.totalCentavos, status: v.status, criadoEm: instante, atualizadoEm: instante, excluidoEm: null, versao: 1 }]);
  const itens = await amb.db.select().from(itensVenda).where(eq(itensVenda.vendaId, v.id));
  expect(itens.sort((a, b) => a.posicao - b.posicao)).toEqual(v.itens.map((item, posicao) => ({ ...item, controlaEstoque: null, vendaId: v.id, lojaId: conta.lojaId, posicao, criadoEm: instante })));
  const pagamentos = await amb.db.select().from(pagamentosVenda).where(eq(pagamentosVenda.vendaId, v.id));
  expect(pagamentos.sort((a, b) => a.posicao - b.posicao)).toEqual(v.pagamentos.map((p, posicao) => ({ ...p, vendaId: v.id, lojaId: conta.lojaId, posicao, criadoEm: instante })));
  const alteracoes = await amb.db.select().from(mudancas).where(eq(mudancas.entidadeId, v.id));
  expect(alteracoes).toHaveLength(1);
  expect(alteracoes[0]).toMatchObject({ lojaId: conta.lojaId, entidade: 'venda', entidadeId: v.id, criadoEm: instante });
  expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, m.id))).toEqual([{ id: m.id, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, criadoEm: instante }]);
}

function conferirHistorico(antes: string[][], depois: string[][]) {
  for (let i = 0; i < 7; i++) for (const linha of antes[i]!) expect(depois[i]).toContain(linha);
}

it('revalida sessão antes de lote vazio e ACK já aplicado', async () => {
  const conta = await contaEmTeste(amb);
  const m = await preencher(conta);
  const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(conta.token)));
  const identidade = { contaId: conta.contaId, lojaId: conta.lojaId, operadorId: conta.operadorId, aparelhoId: conta.aparelhoId };
  await amb.db.update(sessoes).set({ revogadaEm: amb.relogio.agora() }).where(eq(sessoes.id, sessao!.id));
  const antes = await snapshot();
  expect(antes.every(linhas => linhas.length > 0)).toBe(true);
  for (const mutacoes of [[], [m]]) {
    await expect(aplicarPush(amb.db, sessao!.id, identidade, { aparelhoId: conta.aparelhoId, mutacoes }, amb.relogio)).rejects.toMatchObject({ status: 401, codigo: 'nao_autenticado' });
    expect(await snapshot()).toEqual(antes);
  }
});

it('rejeita sessão inexistente, identidade divergente, prazo exato e aparelho revogado', async () => {
  const conta = await contaEmTeste(amb);
  await preencher(conta);
  const outra = await criarConta(amb);
  const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(conta.token)));
  const identidade = { contaId: conta.contaId, lojaId: conta.lojaId, operadorId: conta.operadorId, aparelhoId: conta.aparelhoId };
  const req = { aparelhoId: conta.aparelhoId, mutacoes: [] };
  const antes = await snapshot();
  for (const [id, dados] of [[gerarId(), identidade], ...(['contaId', 'lojaId', 'operadorId', 'aparelhoId'] as const).map(campo => [sessao!.id, { ...identidade, [campo]: outra[campo] }] as const)] as const) {
    await expect(aplicarPush(amb.db, id, dados, req, amb.relogio)).rejects.toMatchObject({ status: 401, codigo: 'nao_autenticado' });
    expect(await snapshot()).toEqual(antes);
  }
  await amb.db.update(sessoes).set({ expiraEm: amb.relogio.agora() }).where(eq(sessoes.id, sessao!.id));
  const vencida = await snapshot();
  await expect(aplicarPush(amb.db, sessao!.id, identidade, req, amb.relogio)).rejects.toMatchObject({ status: 401, codigo: 'nao_autenticado' });
  expect(await snapshot()).toEqual(vencida);
  await amb.db.update(sessoes).set({ expiraEm: sessao!.expiraEm }).where(eq(sessoes.id, sessao!.id));
  await amb.db.update(aparelhos).set({ revogadoEm: amb.relogio.agora() }).where(eq(aparelhos.id, conta.aparelhoId));
  const revogado = await snapshot();
  await expect(aplicarPush(amb.db, sessao!.id, identidade, req, amb.relogio)).rejects.toMatchObject({ status: 401, codigo: 'nao_autenticado' });
  expect(await snapshot()).toEqual(revogado);
});

if (process.env.PDV_TEST_POSTGRES_URL) {
  it('grava ACK na transação com isolamento read committed', async () => {
    const conta = await contaEmTeste(amb);
    const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    const cliente = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    await cliente`set default_transaction_isolation = 'serializable'`;
    const app = await criarApp({ db: drizzle(cliente, { schema }), relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
    try {
      await controle`create or replace function sync_teste_isolamento() returns trigger language plpgsql as $$ begin if current_setting('transaction_isolation') <> 'read committed' then raise exception 'isolamento inesperado'; end if; return new; end $$`;
      await controle`create trigger sync_teste_isolamento before insert on mutacoes_aplicadas for each row execute function sync_teste_isolamento()`;
      const m = mutacao('venda', venda(conta));
      const resposta = await app.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${conta.token}` }, payload: { aparelhoId: conta.aparelhoId, mutacoes: [m] } });
      expect(resposta.statusCode).toBe(200);
      expect(resposta.json().aceitas).toEqual([m.id]);
      expect((await amb.db.select().from(mutacoesAplicadas)).map(row => row.id)).toEqual([m.id]);
    } finally {
      await controle`drop trigger if exists sync_teste_isolamento on mutacoes_aplicadas`;
      await controle`drop function if exists sync_teste_isolamento()`;
      await app.close();
      await cliente.end();
      await controle.end();
    }
  });
  for (const alvo of ['contas', 'sessoes'] as const) {
    it(`rejeita expiração exata após esperar lock de ${alvo}`, async () => {
      const conta = await contaEmTeste(amb);
      await preencher(conta);
      const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(conta.token)));
      const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      let pendente: Promise<unknown> | undefined;
      try {
        await controle`begin`;
        const pid = Number((await controle`select pg_backend_pid() as pid`)[0]!.pid);
        await controle.unsafe(`select id from ${alvo} where id = $1 for update`, [alvo === 'contas' ? conta.contaId : sessao!.id]);
        const antes = await snapshot();
        pendente = enviar(amb, conta, [mutacao('venda', venda(conta))]);
        let bloqueado = false;
        for (let i = 0; i < 200 && !bloqueado; i++) {
          const linhas = await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query ilike ${'%' + alvo + '%'} and query ilike '%for update%'`;
          bloqueado = linhas.length > 0;
          if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(bloqueado).toBe(true);
        amb.relogio.avancarDias(30);
        expect(amb.relogio.agora()).toEqual(sessao!.expiraEm);
        await controle`commit`;
        const resposta = await pendente as Awaited<ReturnType<typeof enviar>>;
        expect(resposta.status).toBe(401);
        expect(resposta.corpo.erro).toBe('nao_autenticado');
        expect(await snapshot()).toEqual(antes);
      } finally {
        await controle`rollback`.catch(() => undefined);
        await pendente?.catch(() => undefined);
        await controle.end();
        await observador.end();
      }
    });
  }
  for (const primeiro of ['logout', 'push'] as const) {
    it(`${primeiro} mantém lock da sessão até concluir antes do outro`, async () => {
      const conta = await contaEmTeste(amb);
      await preencher(conta);
      const antes = await snapshot();
      const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(conta.token)));
      const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      const segunda = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
      const m = mutacao('venda', venda(conta));
      let push: Promise<unknown> | undefined;
      let logout: Promise<unknown> | undefined;
      const esperarBloqueio = async (pid: number, trecho: string) => {
        for (let i = 0; i < 200; i++) {
          const linhas = await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query ilike ${'%' + trecho + '%'}`;
          if (linhas.length) return Number(linhas[0]!.pid);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error(`Bloqueio não observado: ${trecho}`);
      };
      try {
        await controle`create or replace function sync_teste_barreira() returns trigger language plpgsql as $$ begin perform pg_advisory_xact_lock(9012345); return new; end $$`;
        await controle.unsafe(`create trigger sync_teste_barreira before ${primeiro === 'logout' ? 'update on sessoes' : 'insert on vendas'} for each row execute function sync_teste_barreira()`);
        await controle`begin`;
        const pid = Number((await controle`select pg_backend_pid() as pid`)[0]!.pid);
        await controle`select pg_advisory_xact_lock(9012345)`;
        const iniciarPush = () => segunda.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${conta.token}` }, payload: { aparelhoId: conta.aparelhoId, mutacoes: [m] } });
        const iniciarLogout = () => amb.app.inject({ method: 'POST', url: '/auth/logout', headers: { authorization: `Bearer ${conta.token}` } });
        if (primeiro === 'logout') logout = iniciarLogout(); else push = iniciarPush();
        const pidPrimeiro = await esperarBloqueio(pid, primeiro === 'logout' ? 'update "sessoes"' : 'insert into "vendas"');
        if (primeiro === 'logout') push = iniciarPush(); else logout = iniciarLogout();
        await esperarBloqueio(pidPrimeiro, primeiro === 'logout' ? 'for update' : 'update "sessoes"');
        await controle`commit`;
        const [resPush, resLogout] = await Promise.all([push, logout]) as [Awaited<ReturnType<typeof segunda.inject>>, Awaited<ReturnType<typeof amb.app.inject>>];
        expect(resLogout.statusCode).toBe(204);
        expect(resPush.statusCode).toBe(primeiro === 'logout' ? 401 : 200);
        if (primeiro === 'push') expect(resPush.json().aceitas).toEqual([m.id]);
        if (primeiro === 'push') await conferirVenda(m, conta, INICIO);
        expect((await amb.db.select().from(vendas)).length).toBe(primeiro === 'push' ? 2 : 1);
        expect((await amb.db.select().from(mutacoesAplicadas)).length).toBe(primeiro === 'push' ? 3 : 2);
        if (primeiro === 'logout') expect((await snapshot()).slice(0, 7)).toEqual(antes.slice(0, 7));
        else conferirHistorico(antes, await snapshot());
        expect((await amb.db.select().from(sessoes).where(eq(sessoes.id, sessao!.id)))[0]).toEqual({ ...sessao, revogadaEm: amb.relogio.agora() });
        const depois = await snapshot();
        expect((await enviar(amb, conta, [m])).status).toBe(401);
        expect(await snapshot()).toEqual(depois);
      } finally {
        await controle`rollback`.catch(() => undefined);
        await Promise.allSettled([push, logout].filter((p): p is Promise<unknown> => !!p));
        await controle.unsafe(`drop trigger if exists sync_teste_barreira on ${primeiro === 'logout' ? 'sessoes' : 'vendas'}`);
        await controle`drop function if exists sync_teste_barreira()`;
        await segunda.close();
        await controle.end();
        await observador.end();
      }
    });
  }
  for (const cancelada of [false, true]) {
    it(`aplica relógio após advisory à ${cancelada ? 'licença cancelada' : 'venda válida e metadados'}`, async () => {
      const conta = await contaEmTeste(amb);
      await preencher(conta);
      if (cancelada) await amb.db.update(assinaturas).set({ status: 'cancelada', acessoAte: new Date(INICIO.getTime() + 30 * 60_000), canceladaEm: INICIO }).where(eq(assinaturas.contaId, conta.contaId));
      const instante = new Date(INICIO.getTime() + 3_600_000);
      const m = mutacao('venda', venda(conta, { criadaEm: instante.toISOString() }));
      const antes = await snapshot();
      const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
      let pendente: Promise<unknown> | undefined;
      try {
        await controle`begin`;
        const pid = Number((await controle`select pg_backend_pid() as pid`)[0]!.pid);
        await controle`select pg_advisory_xact_lock(hashtext(${conta.lojaId}))`;
        pendente = enviar(amb, conta, [m]);
        let bloqueado = false;
        for (let i = 0; i < 200 && !bloqueado; i++) {
          const linhas = await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query like '%pg_advisory_xact_lock%'`;
          bloqueado = linhas.length > 0;
          if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(bloqueado).toBe(true);
        amb.relogio.avancarHoras(1);
        expect(amb.relogio.agora()).toEqual(instante);
        await controle`commit`;
        const resposta = await pendente as Awaited<ReturnType<typeof enviar>>;
        expect(resposta.status).toBe(200);
        if (cancelada) {
          expect(resposta.corpo.aceitas).toEqual([]);
          expect(resposta.corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'assinatura_suspensa' }]);
          expect(await snapshot()).toEqual(antes);
        } else {
          expect(resposta.corpo.aceitas).toEqual([m.id]);
          expect(resposta.corpo.rejeitadas).toEqual([]);
          await conferirVenda(m, conta, instante);
          const depois = await snapshot();
          conferirHistorico(antes, depois);
          expect(depois[7]).toEqual(antes[7]);
        }
      } finally {
        await controle`rollback`.catch(() => undefined);
        await pendente?.catch(() => undefined);
        await controle.end();
        await observador.end();
      }
    });
  }
  it('amostra o relógio após esperar o advisory da loja', async () => {
    const conta = await contaEmTeste(amb);
    await preencher(conta);
    const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(conta.token)));
    const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    let pendente: Promise<unknown> | undefined;
    try {
      await controle`begin`;
      const pid = (await controle`select pg_backend_pid() as pid`)[0]!.pid;
      await controle`select pg_advisory_xact_lock(hashtext(${conta.lojaId}))`;
      const antes = await snapshot();
      pendente = enviar(amb, conta, [mutacao('venda', venda(conta))]);
      let bloqueado = false;
      for (let i = 0; i < 200 && !bloqueado; i++) {
        const linhas = await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query like '%pg_advisory_xact_lock%'`;
        bloqueado = linhas.length > 0;
        if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(bloqueado).toBe(true);
      amb.relogio.avancarDias(30);
      expect(amb.relogio.agora()).toEqual(sessao!.expiraEm);
      await controle`commit`;
      const resposta = await pendente as Awaited<ReturnType<typeof enviar>>;
      expect(resposta.status).toBe(401);
      expect(resposta.corpo.erro).toBe('nao_autenticado');
      expect(await snapshot()).toEqual(antes);
    } finally {
      await controle`rollback`.catch(() => undefined);
      await pendente?.catch(() => undefined);
      await controle.end();
      await observador.end();
    }
  });
  for (const revogar of ['sessao', 'aparelho', 'loja.conta', 'operador.conta', 'operador.loja', 'aparelho.conta', 'aparelho.loja'] as const) it(`rejeita push que esperou alteração de ${revogar}`, async () => {
    const conta = await contaEmTeste(amb);
    await preencher(conta);
    const outra = revogar.includes('.') ? await criarConta(amb) : undefined;
    const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(conta.token)));
    const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    const observador = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
    const segunda = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
    let pendente: Promise<unknown> | undefined;
    try {
      await controle`begin`;
      const pid = (await controle`select pg_backend_pid() as pid`)[0]!.pid;
      await controle`select id from contas where id = ${conta.contaId} for update`;
      const antes = await snapshot();
      const m = mutacao('venda', venda(conta));
      pendente = segunda.inject({ method: 'POST', url: '/sync/push', headers: { authorization: `Bearer ${conta.token}` }, payload: { aparelhoId: conta.aparelhoId, mutacoes: [m] } });
      let bloqueado = false;
      for (let i = 0; i < 200 && !bloqueado; i++) {
        const linhas = await observador`select pid from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid)) and query like '%contas%' and query like '%for update%'`;
        bloqueado = linhas.length > 0;
        if (!bloqueado) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(bloqueado).toBe(true);
      if (revogar === 'sessao') await controle`update sessoes set revogada_em = ${amb.relogio.agora()} where id = ${sessao!.id}`;
      else if (revogar === 'aparelho') await controle`update aparelhos set revogado_em = ${amb.relogio.agora()} where id = ${conta.aparelhoId}`;
      else if (revogar === 'loja.conta') await controle`update lojas set conta_id = ${outra!.contaId} where id = ${conta.lojaId}`;
      else if (revogar === 'operador.conta') await controle`update operadores set conta_id = ${outra!.contaId} where id = ${conta.operadorId}`;
      else if (revogar === 'operador.loja') await controle`update operadores set loja_id = ${outra!.lojaId} where id = ${conta.operadorId}`;
      else if (revogar === 'aparelho.conta') await controle`update aparelhos set conta_id = ${outra!.contaId} where id = ${conta.aparelhoId}`;
      else await controle`update aparelhos set loja_id = ${outra!.lojaId} where id = ${conta.aparelhoId}`;
      await controle`commit`;
      const resposta = await pendente as Awaited<ReturnType<typeof segunda.inject>>;
      expect(resposta.statusCode).toBe(401);
      expect(resposta.json().erro).toBe('nao_autenticado');
      const depois = await snapshot();
      expect(depois.slice(0, 7)).toEqual(antes.slice(0, 7));
      if (revogar !== 'sessao') expect(depois[7]).toEqual(antes[7]);
      else expect((await amb.db.select().from(sessoes).where(eq(sessoes.id, sessao!.id)))[0]).toEqual({ ...sessao, revogadaEm: amb.relogio.agora() });
    } finally {
      await controle`rollback`.catch(() => undefined);
      await pendente?.catch(() => undefined);
      await segunda.close();
      await controle.end();
      await observador.end();
    }
  });
}
