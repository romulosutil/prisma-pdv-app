// Piloto F09 e F11 (docs/roteiro-piloto-android.md), lado cliente: "encerramento forçado" simulado ao fechar e
// reabrir o arquivo SQLite com instâncias novas de todo o grafo (armazenamento, checkout, repositório de sync).
//
// O que já existia e NÃO é repetido aqui:
//  - checkoutSqlite.test.ts: reabrir com parcela salva; concluir uma vez e recuperar a mesma venda após resposta
//    perdida; reversão em falha de escrita/COMMIT. Aqui só se acrescenta a cadeia carrinho -> venda -> fila de envio.
//  - sincronizacao.test.ts: backoff, ACK parcial/desconhecido/duplicado e 401 com repositório SIMULADO (vi.fn).
//    Aqui o repositório é o SQLite real, reaberto entre as tentativas.
//  - syncPersistencia.test.ts: fila de produtos reaberta. Aqui a fila é de venda e turno.
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Caixa, Sessao, SyncPushReq, SyncPushRes, Venda } from '@pdv/shared';
import { CarrinhoDuravel } from '../src/dados/carrinhoDuravel';
import { totalDoCarrinho, valorRestante } from '../src/dados/carrinho';
import { escopoDoPerfil } from '../src/dados/estadoConta';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { CheckoutSqlite } from '../src/dados/sqlite/checkoutSqlite';
import { RepositorioSyncSqlite } from '../src/dados/sqlite/syncSqlite';
import type { EntradaSync } from '../src/dados/syncTipos';
import { ErroBackend, type Backend } from '../src/servicos/backend';
import { SincronizacaoServico } from '../src/servicos/sincronizacao';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const AGORA = '2026-11-16T12:00:00.000Z';
const sessao: Sessao = { token: 'token-teste', contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
const CAIXA_ID = id(7);
const caixaAberto: Caixa = { id: CAIXA_ID, lojaId: sessao.lojaId, aparelhoId: sessao.aparelhoId, operadorId: sessao.operadorId, versaoContrato: 2,
  contaId: sessao.contaId, abertura: { em: AGORA, trocoInicialCentavos: 0 }, fechamento: null, movimentos: [] };
const caixaFechado: Caixa = { ...caixaAberto, fechamento: { em: '2026-11-16T13:00:00.000Z', esperadoCentavos: 1500, contadoCentavos: 1500 } };

const pastas: string[] = [];
const abertos: DatabaseSync[] = [];
afterEach(() => {
  for (const raw of abertos.splice(0)) { try { raw.close(); } catch { /* já fechado pelo teste */ } }
  for (const pasta of pastas.splice(0)) rmSync(pasta, { recursive: true, force: true });
});

/** Arquivo SQLite + armazenamento legado (config/sessão) que sobrevivem ao "encerramento forçado". */
function aparelho() {
  const pasta = mkdtempSync(join(tmpdir(), 'pdv-piloto-')); pastas.push(pasta);
  const caminho = join(pasta, 'dados.sqlite');
  const legado = new ArmazenamentoMemoria();
  return { caminho, legado };
}
type Aparelho = ReturnType<typeof aparelho>;

/**
 * Uma "vida" do app: instância nova de tudo sobre o mesmo arquivo. `base` separa a faixa de IDs de cada vida; assim,
 * qualquer ID regenerado após reabrir seria diferente do original e o teste pegaria.
 */
async function abrir(a: Aparelho, base: number, opcoes: { agora?: () => Date } = {}) {
  await a.legado.gravar('conta', { sessao });
  const raw = new DatabaseSync(a.caminho); abertos.push(raw);
  let n = base; const novoId = () => id(++n);
  const agora = opcoes.agora ?? (() => new Date(AGORA));
  const armazenamento = new ArmazenamentoSqlite(async () => sqliteBanco(raw), a.legado);
  armazenamento.configurarSync(novoId, () => agora());
  const repositorio = new RepositorioSyncSqlite(armazenamento, novoId, () => agora());
  const carrinho = new CarrinhoDuravel();
  let caixaId: string | null = null;
  carrinho.configurar(new CheckoutSqlite(armazenamento, novoId), { novoId, agora: () => AGORA, caixaId: () => caixaId });
  return {
    raw, armazenamento, repositorio, carrinho,
    vincularCaixa: (c: string | null) => { caixaId = c; },
    contagem: (tabela: string) => (raw.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n,
    fechar: () => raw.close(),
  };
}
type App = Awaited<ReturnType<typeof abrir>>;

const avulso = (carrinho: CarrinhoDuravel) => carrinho.adicionarAvulso(2500, 'Avulso');
const resumoEntrada = (e: EntradaSync) => ({ id: e.mutacao.id, entidade: e.mutacao.entidade, dados: e.mutacao.dados });

/** Servidor de mentira com idempotência por ID de mutação, como a API real, e roteiro de falhas de rede. */
type Passo = 'ok' | 'rede_antes' | 'rede_no_meio_do_lote' | 'resposta_perdida';
function servidor(roteiro: Passo[]) {
  const aplicadas = new Map<string, number>(); // ID de mutação -> vezes em que o servidor efetivamente gravou
  const recebidas: string[][] = [];
  const tokens: string[] = [];
  const identidades = new Set<string>();
  const enviarMutacoes = async (req: SyncPushReq, token?: string): Promise<SyncPushRes> => {
    const ids = req.mutacoes.map((m) => m.id);
    recebidas.push(ids); tokens.push(token ?? '');
    for (const m of req.mutacoes) if ('operadorId' in m.dados) identidades.add(`${token}|${String(m.dados.operadorId)}`);
    const passo = roteiro.shift() ?? 'ok';
    const gravar = (lista: string[]) => { for (const x of lista) if (!aplicadas.has(x)) aplicadas.set(x, 1); };
    if (passo === 'rede_antes') throw new ErroBackend('rede', 'offline');
    if (passo === 'rede_no_meio_do_lote') { gravar(ids.slice(0, Math.ceil(ids.length / 2))); throw new ErroBackend('rede', 'queda no meio do lote'); }
    if (passo === 'resposta_perdida') { gravar(ids); throw new ErroBackend('rede', 'resposta perdida'); }
    gravar(ids);
    return { aceitas: ids, rejeitadas: [], cursor: '1' };
  };
  const backend = { modo: 'http', enviarMutacoes, receberMudancas: async () => ({ cursor: '0', mudancas: [] }) } as unknown as Backend;
  return { backend, aplicadas, recebidas, tokens, identidades };
}

/** Motor de sincronização real sobre o repositório SQLite real. `confirmacoes` conta cada ID confirmado localmente. */
function motor(app: App, srv: ReturnType<typeof servidor>, agora: () => Date) {
  const confirmacoes = new Map<string, number>();
  const confirmar = app.repositorio.confirmar.bind(app.repositorio);
  app.repositorio.confirmar = async (ids) => { for (const x of ids) confirmacoes.set(x, (confirmacoes.get(x) ?? 0) + 1); await confirmar(ids); };
  const servico = new SincronizacaoServico({ repositorio: app.repositorio, backend: srv.backend, sessao: () => sessao,
    vinculo: () => escopoDoPerfil(sessao), agora, aplicarLocal: (tarefa) => tarefa() });
  return { servico, confirmacoes };
}

async function vendas(app: App) { return (await app.armazenamento.obter<{ vendas: Venda[] }>('vendas'))!.vendas; }

describe('F09: encerramento forçado no pagamento dividido', () => {
  it('F09: parcela registrada antes do encerramento reaparece uma vez, com mesmo ID e valor, e a venda conclui sem duplicar', async () => {
    const a = aparelho();
    let app = await abrir(a, 1000);
    await avulso(app.carrinho);
    await app.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
    const vendaIdAntes = (app.raw.prepare('SELECT venda_id FROM rascunhos').get() as { venda_id: string }).venda_id;
    expect(app.carrinho.obter().parcelas).toEqual([{ meio: 'pix', valorCentavos: 1000 }]);
    app.fechar(); // encerramento forçado: nada além do que já foi confirmado em disco sobrevive

    app = await abrir(a, 2000);
    await app.carrinho.carregar();
    const retomado = app.carrinho.obter();
    expect(retomado.parcelas).toEqual([{ meio: 'pix', valorCentavos: 1000 }]);
    expect(retomado.concluidaId).toBeNull();
    expect(valorRestante(totalDoCarrinho(retomado.itens), retomado.parcelas)).toBe(1500);
    expect((app.raw.prepare('SELECT venda_id FROM rascunhos').get() as { venda_id: string }).venda_id).toBe(vendaIdAntes);
    expect([app.contagem('rascunhos'), app.contagem('vendas'), app.contagem('outbox')]).toEqual([1, 0, 0]);

    // Reabrir de novo, sem fazer nada, não duplica a parcela.
    app.fechar(); app = await abrir(a, 3000);
    await app.carrinho.carregar(); await app.carrinho.carregar();
    expect(app.carrinho.obter().parcelas).toEqual([{ meio: 'pix', valorCentavos: 1000 }]);

    await app.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500 });
    const venda = await app.carrinho.concluir();
    expect(venda.id).toBe(vendaIdAntes);
    expect(venda.totalCentavos).toBe(2500);
    expect(venda.pagamentos.map((p) => [p.meio, p.valorCentavos])).toEqual([['pix', 1000], ['dinheiro', 1500]]);
    expect([app.contagem('vendas'), app.contagem('itens_venda'), app.contagem('pagamentos_venda'), app.contagem('outbox')]).toEqual([1, 1, 2, 1]);
  });

  it('F09: depois de pagar, o encerramento não deixa mudar nem descartar o valor recebido', async () => {
    const a = aparelho();
    let app = await abrir(a, 1000);
    await avulso(app.carrinho);
    await app.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
    app.fechar();
    app = await abrir(a, 2000);
    await app.carrinho.carregar();
    await expect(app.carrinho.limpar()).rejects.toThrow('valores recebidos');
    await expect(app.carrinho.concluir()).rejects.toThrow();
    expect(app.carrinho.obter().parcelas).toEqual([{ meio: 'pix', valorCentavos: 1000 }]);
    expect([app.contagem('rascunhos'), app.contagem('vendas'), app.contagem('outbox')]).toEqual([1, 0, 0]);
  });

  it('F09: encerramento logo após concluir deixa uma venda, a fila com os mesmos IDs e nenhuma segunda venda', async () => {
    const a = aparelho();
    let app = await abrir(a, 1000);
    await avulso(app.carrinho);
    await app.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
    await app.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500 });
    const venda = await app.carrinho.concluir();
    const antes = (await app.repositorio.estado()).entradas.map(resumoEntrada);
    expect(antes).toHaveLength(1);
    expect(antes[0]).toMatchObject({ entidade: 'venda', dados: { id: venda.id, totalCentavos: 2500 } });
    app.fechar();

    app = await abrir(a, 2000);
    expect(app.contagem("rascunhos")).toBe(1); // antes de reabrir o carrinho, o rascunho concluído ainda está em disco
    await app.carrinho.carregar();
    expect(app.carrinho.obter().concluidaId).toBeNull();
    expect(app.carrinho.obter().itens).toEqual([]);
    expect(app.carrinho.obter().parcelas).toEqual([]);
    expect(app.contagem("rascunhos")).toBe(0);
    expect([app.contagem('vendas'), app.contagem('itens_venda'), app.contagem('pagamentos_venda'), app.contagem('outbox')]).toEqual([1, 1, 2, 1]);
    expect((await app.repositorio.estado()).entradas.map(resumoEntrada)).toEqual(antes);

    // O envio sai com os IDs originais e a venda chega uma única vez ao servidor.
    const srv = servidor([]);
    const { servico, confirmacoes } = motor(app, srv, () => new Date(AGORA));
    await servico.sincronizar();
    expect(srv.recebidas).toEqual([[antes[0]!.id]]);
    expect([...srv.aplicadas]).toEqual([[antes[0]!.id, 1]]);
    expect(confirmacoes.get(antes[0]!.id)).toBe(1);
    expect((await app.repositorio.estado()).entradas).toEqual([]);
    // Reiniciar depois do envio não recria nem reenvia a venda.
    app.fechar(); app = await abrir(a, 3000);
    const outro = motor(app, srv, () => new Date(AGORA));
    await outro.servico.sincronizar({ forcar: true });
    expect(srv.recebidas).toHaveLength(1);
    expect(await vendas(app)).toEqual([venda]);
    // Uma nova venda depois do reinício recebe outro ID.
    await avulso(app.carrinho);
    await app.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 2500 });
    const nova = await app.carrinho.concluir();
    expect(nova.id).not.toBe(venda.id);
    expect((await vendas(app)).map((v) => v.id)).toEqual([venda.id, nova.id]);
  });
});

describe('F11: modo avião, encerramento forçado e reconexão intermitente', () => {
  /** Turno reservado (v2) + duas vendas + fechamento, tudo gravado sem rede. */
  async function expedienteOffline(a: Aparelho, base: number) {
    const app = await abrir(a, base);
    await app.armazenamento.gravar('caixas', [caixaAberto]); // reserva já confirmada pela API antes de cair a rede
    app.vincularCaixa(CAIXA_ID);
    const feitas: Venda[] = [];
    for (const [valor, nome] of [[2500, 'Avulso'], [1800, 'Segundo']] as const) {
      await app.carrinho.adicionarAvulso(valor, nome);
      await app.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: valor === 2500 ? 1500 : 800 });
      await app.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: valor === 2500 ? 1000 : 1000 });
      feitas.push(await app.carrinho.concluir());
      await app.carrinho.limpar();
    }
    // Esperado em dinheiro: 1500 + 800.
    await app.armazenamento.gravar('caixas', [{ ...caixaFechado, fechamento: { em: '2026-11-16T13:00:00.000Z', esperadoCentavos: 2300, contadoCentavos: 2300 } }]);
    return { app, feitas };
  }

  it('F11: venda e fechamento feitos offline sobrevivem ao reinício com mesmos IDs, valores e responsável', async () => {
    const a = aparelho();
    const { app: primeiro, feitas } = await expedienteOffline(a, 1000);
    expect(feitas.map((v) => v.totalCentavos)).toEqual([2500, 1800]);
    const antes = (await primeiro.repositorio.estado()).entradas;
    expect(antes.map((e) => e.mutacao.entidade).sort()).toEqual(['caixa', 'caixa', 'venda', 'venda']);
    const srv = servidor(['rede_antes']);
    const m1 = motor(primeiro, srv, () => new Date(AGORA));
    await m1.servico.sincronizar(); // modo avião: nada sai
    expect(m1.confirmacoes.size).toBe(0);
    primeiro.fechar(); // encerramento forçado + reinício completo

    const app = await abrir(a, 2000);
    const depois = (await app.repositorio.estado()).entradas;
    expect(depois.map((e) => e.mutacao.id)).toEqual(antes.map((e) => e.mutacao.id));
    expect(depois.map((e) => e.mutacao.dados)).toEqual(antes.map((e) => e.mutacao.dados));
    for (const e of depois) {
      expect(e.mutacao.operacao).toBe('upsert');
      if (e.mutacao.operacao !== 'upsert') continue;
      expect(e.mutacao.dados).toMatchObject({ operadorId: sessao.operadorId, aparelhoId: sessao.aparelhoId, lojaId: sessao.lojaId });
    }
    const dadosVendas = depois.filter((e) => e.mutacao.entidade === 'venda').map((e) => e.mutacao.dados as Venda);
    expect(dadosVendas.map((v) => [v.id, v.totalCentavos, v.caixaId])).toEqual(feitas.map((v) => [v.id, v.totalCentavos, CAIXA_ID]));
    expect(dadosVendas.map((v) => v.pagamentos.map((p) => [p.id, p.meio, p.valorCentavos]))).toEqual(feitas.map((v) => v.pagamentos.map((p) => [p.id, p.meio, p.valorCentavos])));
    const fechamento = depois.filter((e) => e.mutacao.entidade === 'caixa').map((e) => e.mutacao.dados as Caixa).find((c) => c.fechamento);
    expect(fechamento?.fechamento).toMatchObject({ esperadoCentavos: 2300, contadoCentavos: 2300 });
    // Fechamento pendente continua na fila: é essa fila não vazia que bloqueia nova reserva (Dados.abrirCaixa).
    expect(depois.length).toBeGreaterThan(0);
    expect([app.contagem('vendas'), app.contagem('caixas'), app.contagem('outbox')]).toEqual([2, 1, 4]);
  });

  it('F11: reconexão intermitente reenvia os mesmos IDs, não duplica no servidor e só confirma com o ACK', async () => {
    const a = aparelho();
    const { app: inicial } = await expedienteOffline(a, 1000);
    const original = (await inicial.repositorio.estado()).entradas.map((e) => e.mutacao.id);
    expect(original).toHaveLength(4);
    inicial.fechar();

    // 1) rede cai no meio do lote; 2) o servidor grava tudo mas a resposta se perde; 3) volta a rede.
    const srv = servidor(['rede_no_meio_do_lote', 'resposta_perdida']);
    let relogio = Date.parse(AGORA);
    const agora = () => new Date(relogio);
    let vida = 2000;
    let app = await abrir(a, vida, { agora });
    let m = motor(app, srv, agora);

    await m.servico.sincronizar();
    expect(m.confirmacoes.size).toBe(0);
    expect((await app.repositorio.estado()).entradas.map((e) => e.mutacao.id)).toEqual(original);
    expect(srv.aplicadas.size).toBeGreaterThan(0); // o servidor gravou parte do lote
    expect(srv.aplicadas.size).toBeLessThan(original.length);

    app.fechar(); app = await abrir(a, vida += 1000, { agora }); m = motor(app, srv, agora);
    relogio += 3_600_000; // passa o backoff
    await m.servico.sincronizar();
    expect(m.confirmacoes.size).toBe(0); // servidor gravou tudo, cliente não recebeu ACK
    // O fechamento do turno fica retido até a venda ser confirmada, então a 2ª tentativa leva só as demais.
    expect(srv.aplicadas.size).toBe(original.length - 1);
    const aposPerda = (await app.repositorio.estado()).entradas;
    expect(aposPerda.map((e) => e.mutacao.id)).toEqual(original);
    expect(aposPerda.filter((e) => e.tentativas > 0)).toHaveLength(original.length - 1); // o fechamento retido nunca foi tentado
    expect(aposPerda.some((e) => e.bloqueada)).toBe(false);

    app.fechar(); app = await abrir(a, vida += 1000, { agora }); m = motor(app, srv, agora);
    relogio += 3_600_000;
    await m.servico.sincronizar();
    // Todo envio, de qualquer tentativa, usou apenas IDs da fila original; nenhum ID novo apareceu.
    expect(new Set(srv.recebidas.flat())).toEqual(new Set(original));
    expect(srv.tokens.every((t) => t === sessao.token)).toBe(true);
    // O servidor aplicou cada mutação exatamente uma vez, apesar de receber algumas várias vezes.
    expect([...srv.aplicadas.values()].every((v) => v === 1)).toBe(true);
    expect(srv.aplicadas.size).toBe(original.length);
    expect(srv.recebidas.flat().length).toBeGreaterThan(original.length);
    // O cliente só saiu da fila após o ACK, uma vez por mutação.
    expect([...m.confirmacoes.keys()].sort()).toEqual([...original].sort());
    expect([...m.confirmacoes.values()].every((v) => v === 1)).toBe(true);
    expect((await app.repositorio.estado()).entradas).toEqual([]);

    // Reinício após a confirmação: nada volta à fila nem é reenviado.
    const enviosAntes = srv.recebidas.length;
    app.fechar(); app = await abrir(a, vida += 1000, { agora }); m = motor(app, srv, agora);
    await m.servico.sincronizar({ forcar: true });
    expect(srv.recebidas).toHaveLength(enviosAntes);
    expect((await app.repositorio.estado()).entradas).toEqual([]);
    expect((await vendas(app)).map((v) => v.totalCentavos)).toEqual([2500, 1800]);
  });

  it('F11: nada sai da fila sem confirmação, mesmo com sucessivas falhas de rede e reinícios', async () => {
    const a = aparelho();
    let app = await abrir(a, 1000);
    await avulso(app.carrinho);
    await app.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 2500 });
    const venda = await app.carrinho.concluir();
    const [entrada] = (await app.repositorio.estado()).entradas;
    const srv = servidor(['rede_antes', 'resposta_perdida', 'rede_antes', 'rede_no_meio_do_lote']);
    let relogio = Date.parse(AGORA); const agora = () => new Date(relogio);
    let vida = 1000;
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      app.fechar(); app = await abrir(a, vida += 1000, { agora });
      const m = motor(app, srv, agora);
      relogio += 3_600_000;
      await m.servico.sincronizar();
      const fila = (await app.repositorio.estado()).entradas;
      expect(fila.map((e) => e.mutacao.id)).toEqual([entrada!.mutacao.id]);
      expect(fila[0]!.mutacao.dados).toEqual(entrada!.mutacao.dados);
      expect(m.confirmacoes.size).toBe(0);
    }
    expect(srv.recebidas.every((ids) => ids.length === 1 && ids[0] === entrada!.mutacao.id)).toBe(true);
    // Quinta tentativa: rede volta.
    app.fechar(); app = await abrir(a, vida += 1000, { agora });
    const m = motor(app, srv, agora); relogio += 3_600_000;
    await m.servico.sincronizar();
    expect(m.confirmacoes.get(entrada!.mutacao.id)).toBe(1);
    expect(srv.aplicadas.get(entrada!.mutacao.id)).toBe(1);
    expect((await app.repositorio.estado()).entradas).toEqual([]);
    expect(await vendas(app)).toEqual([venda]);
  });
});
