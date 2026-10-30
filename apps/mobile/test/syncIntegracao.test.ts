import { DatabaseSync } from 'node:sqlite';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { gerarId, type Sessao } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import { abrirBanco, contaEmTeste, criarAmbiente, chamar, enviar, mutacao, INICIO, produto as fixtureProduto, venda as fixtureVenda, type Ambiente } from '../../api/test/ajuda';
import type { Conexao } from '../../api/src/db/conexao';
import { produtos, vendas, caixas, mudancas, mutacoesAplicadas } from '../../api/src/db/schema';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { RepositorioSyncSqlite } from '../src/dados/sqlite/syncSqlite';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

let banco: Conexao;
let amb: Ambiente;
let url: string;
let abertos: DatabaseSync[] = [];
const fetchReal = globalThis.fetch;
beforeAll(async () => { banco = await abrirBanco(); }, 30000);
beforeEach(async () => {
  amb = await criarAmbiente(banco);
  url = await amb.app.listen({ port: 0, host: '127.0.0.1' });
  vi.spyOn(Date, 'now').mockReturnValue(INICIO.getTime());
});
afterEach(async () => { vi.unstubAllGlobals(); vi.restoreAllMocks(); for (const db of abertos) db.close(); abertos = []; await amb.fechar(); });
afterAll(async () => { await banco.fechar(); });

async function instalar(sessao: Sessao) {
  const base = new ArmazenamentoMemoria();
  const raw = new DatabaseSync(':memory:'); abertos.push(raw);
  const storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), base);
  const dados = new Dados(storage, gerarId, url);
  await dados.conta.registrar(sessao, { email: 'fixture@example.invalid', nomeResponsavel: 'Operador local', nomeLoja: 'Loja de teste', aparelhoNome: 'Teste' });
  await dados.iniciar();
  return { dados, raw, storage, sync: new RepositorioSyncSqlite(storage, gerarId, () => amb.relogio.agora()), base };
}

it('envia operações offline por HTTP real, perde resposta e restaura sem duplicar', async () => {
  const c = await contaEmTeste(amb);
  const { dados, raw, storage, sync } = await instalar(c);
  const produto = await dados.produtos.criar({ nome: 'Produto offline', precoCentavos: 2500 });
  const caixa = await dados.caixa.abrir(1000);
  await dados.carrinho.adicionarProduto(produto);
  await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1000 });
  await dados.carrinho.adicionarParcela({ meio: 'cartao_credito', valorCentavos: 1500 });
  const primeira = await dados.carrinho.concluir();
  await dados.carrinho.limpar();
  await dados.carrinho.adicionarAvulso(1000, 'Cancelar');
  await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1000 });
  const segunda = await dados.carrinho.concluir();
  await dados.vendas.cancelar(segunda.id);
  await dados.caixa.registrarMovimento('suprimento', 500, 'Teste offline');
  const fechado = await dados.caixa.fechar(2500, dados.vendas.obter().vendas);
  await dados.produtos.excluir(produto.id);
  const ids = (await sync.estado()).entradas.map((e) => e.mutacao.id);
  expect(ids.length).toBeGreaterThan(5);
  // Novo Dados simula reinício sem recriar as operações duráveis.
  const retomado = new Dados(storage, gerarId, url); await retomado.iniciar();
  let perder = true;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const resposta = await fetchReal(input, init);
    if (String(input).endsWith('/sync/push') && perder) { perder = false; throw new TypeError('Resposta perdida após commit'); }
    return resposta;
  });
  await retomado.sincronizacao.sincronizar();
  expect(retomado.sincronizacao.obter().situacao).toBe('offline');
  expect((await sync.estado()).entradas.map((e) => e.mutacao.id)).toEqual(ids);
  await retomado.sincronizacao.sincronizar({ forcar: true });
  expect((await sync.estado()).entradas).toEqual([]);
  expect((await amb.db.select().from(vendas)).map((v) => [v.id, v.status]).sort()).toEqual([[primeira.id, 'concluida'], [segunda.id, 'cancelada']].sort());
  expect((await amb.db.select().from(caixas)).find((v) => v.id === caixa.id)).toMatchObject({ esperadoCentavos: 2500, contadoCentavos: 2500 });
  const acks = await amb.db.select().from(mutacoesAplicadas);
  expect(acks.map((m) => m.id).sort()).toEqual([...ids].sort());
  const antes = await amb.db.select().from(mudancas);
  await retomado.sincronizacao.sincronizar({ forcar: true });
  expect(await amb.db.select().from(mudancas)).toEqual(antes);
  // Nova autorização real para uma instalação limpa da mesma conta.
  const codigo = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: c.email } });
  const acesso = await chamar<Sessao>(amb, 'POST', '/auth/login', { corpo: { email: c.email, codigo: codigo.corpo.codigo, aparelhoId: gerarId(), aparelhoNome: 'Restaurado' } });
  expect(acesso.status).toBe(200);
  const limpa = await instalar(acesso.corpo);
  await limpa.dados.sincronizacao.sincronizar();
  expect(limpa.dados.vendas.obter()).toEqual(retomado.vendas.obter());
  expect(limpa.dados.caixa.obter()).toEqual([fechado]);
  expect(limpa.dados.produtos.obter()).toEqual(retomado.produtos.obter());
  expect((await limpa.sync.estado()).entradas).toEqual([]);
  expect(raw.prepare('SELECT COUNT(*) AS n FROM outbox').get()).toMatchObject({ n: 0 });
}, 30000);

it('restaura mais de500 mudanças paginadas pela API real sem eco na outbox', async () => {
  const c = await contaEmTeste(amb);
  const registros = Array.from({ length: 503 }, () => fixtureProduto(c.lojaId));
  // Fixture explícita do estado confirmado no servidor; não representa integração de cobrança.
  await amb.db.insert(produtos).values(registros.map((p) => ({ ...p, criadoEm: new Date(p.criadoEm), atualizadoEm: new Date(p.atualizadoEm), excluidoEm: null })));
  await amb.db.insert(mudancas).values(registros.map((p) => ({ lojaId: c.lojaId, entidade: 'produto' as const, entidadeId: p.id, criadoEm: INICIO })));
  const { dados, sync } = await instalar(c);
  await dados.sincronizacao.sincronizar();
  expect(dados.produtos.obter().map((p) => p.id).sort()).toEqual(registros.map((p) => p.id).sort());
  expect((await sync.estado()).cursor).toBe('503');
  expect((await sync.estado()).entradas).toEqual([]);
}, 30000);

it('preserva venda de oito dias rejeitada e envia vizinho válido', async () => {
  const c = await contaEmTeste(amb);
  amb.relogio.avancarDias(8);
  await chamar(amb, 'POST', '/dev/jobs/cobranca');
  vi.spyOn(Date, 'now').mockReturnValue(amb.relogio.agora().getTime());
  const { dados, sync } = await instalar(c);
  const antiga = fixtureVenda(c);
  await dados.vendas.substituirTodas({ vendas: [antiga], numeroBase: 0 });
  const produto = await dados.produtos.criar({ nome: 'Vizinho válido', precoCentavos: 100 });
  await dados.sincronizacao.sincronizar();
  const pendentes = (await sync.estado()).entradas;
  expect(pendentes).toHaveLength(1);
  expect(pendentes[0]).toMatchObject({ bloqueada: true, motivo: 'venda_fora_da_janela_offline', mutacao: { dados: antiga } });
  expect(await amb.db.select().from(vendas).where(eq(vendas.id, antiga.id))).toEqual([]);
  expect(await amb.db.select().from(produtos).where(eq(produtos.id, produto.id))).toHaveLength(1);
  expect(dados.vendas.obter().vendas).toEqual([antiga]);
  const exportado = JSON.parse(await dados.sincronizacao.exportar());
  expect(exportado.entradas[0].mutacao.dados).toEqual(antiga);
  expect(JSON.stringify(exportado)).not.toContain(c.token);
  const mutacao = pendentes[0]!.mutacao;
  await dados.sincronizacao.retentarRejeitadas();
  expect((await sync.estado()).entradas[0]!.mutacao).toEqual(mutacao);
}, 30000);

it('protege edição pendente durante pull e converge ao agregado mais recente após ACK', async () => {
  const c = await contaEmTeste(amb);
  const { dados, sync } = await instalar(c);
  const produto = await dados.produtos.criar({ nome: 'Inicial', precoCentavos: 100 });
  await dados.sincronizacao.sincronizar();
  vi.spyOn(Date, 'now').mockReturnValue(INICIO.getTime() + 1000);
  await dados.produtos.editar(produto.id, { nome: 'Local pendente' });
  const remoto = { ...produto, nome: 'Remoto mais recente', atualizadoEm: new Date(INICIO.getTime() + 2000).toISOString() };
  amb.relogio.definir(new Date(INICIO.getTime() + 2000));
  const m = mutacao('produto', remoto);
  expect((await enviar(amb, c, [m])).corpo.aceitas).toEqual([m.id]);
  const cursor = (await sync.estado()).cursor;
  const pagina = await dados.backend.receberMudancas!(cursor, c.token);
  await sync.aplicarPagina(pagina);
  await dados.produtos.carregar();
  expect(dados.produtos.obter()[0]?.nome).toBe('Local pendente');
  await dados.sincronizacao.sincronizar();
  expect((await sync.estado()).entradas).toEqual([]);
  expect(dados.produtos.obter()[0]?.nome).toBe('Remoto mais recente');
  expect((await amb.db.select().from(produtos).where(eq(produtos.id, produto.id)))[0]?.nome).toBe('Remoto mais recente');
}, 30000);
