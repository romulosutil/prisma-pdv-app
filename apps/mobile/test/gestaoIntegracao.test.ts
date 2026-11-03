import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { MockBillingProvider, RelogioFalso, type Vinculo } from '@pdv/shared';
import { abrirPglite, type Conexao } from '../../api/src/db/conexao';
import { criarApp } from '../../api/src/servidor';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

class Cofre implements CofreSessao {
  dados = new Map<string, string>();
  async obter(k: string) { return this.dados.get(k) ?? null; }
  async gravar(k: string, v: string) { this.dados.set(k, v); }
  async remover(k: string) { this.dados.delete(k); }
}
let banco: Conexao;
let app: Awaited<ReturnType<typeof criarApp>>;
let raw: DatabaseSync;
let dados: Dados;
let base: ArmazenamentoMemoria;
let cofre: Cofre;
let storage: ArmazenamentoSqlite;
const agora = new Date('2026-11-01T20:00:00Z');
let relogio: RelogioFalso;
beforeAll(async () => { banco = await abrirPglite(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => {
  await banco.db.execute('TRUNCATE contas, usuarios, limites_auth CASCADE');
  relogio = new RelogioFalso(agora);
  vi.spyOn(Date, 'now').mockImplementation(() => relogio.agora().getTime());
  app = await criarApp({ db: banco.db, relogio, billing: new MockBillingProvider(), cobrancaDesativada: true, fontesEan: [] });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const r = await app.inject({ method: (init.method ?? 'GET') as 'GET' | 'POST' | 'PUT', url: new URL(url).pathname + new URL(url).search, headers: Object.fromEntries(new Headers(init.headers)), ...(init.body ? { payload: String(init.body) } : {}) });
    return new Response(r.statusCode === 204 ? null : r.body, { status: r.statusCode });
  }));
  raw = new DatabaseSync(':memory:'); base = new ArmazenamentoMemoria(); cofre = new Cofre();
  storage = new ArmazenamentoSqlite(async () => sqliteBanco(raw), new ArmazenamentoSessaoSegura(base, cofre, randomUUID));
  dados = new Dados(storage, randomUUID, 'http://api.local');
  await dados.criarConta({ email: 'dono@exemplo.com', nomeResponsavel: 'Dono', nomeLoja: 'Loja', documento: '12345678901', tipoLoja: 'Mercado' });
});
afterEach(async () => { raw.close(); await app.close(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function acessar(v: Vinculo) {
  const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: v.email } });
  expect(r.statusCode).toBe(200);
  const codigo = r.json().codigo;
  const vinculos = await dados.consultarVinculos(v.email, codigo);
  expect(vinculos.some(x => x.operadorId === v.operadorId)).toBe(true);
  await dados.entrar(v.email, codigo, v);
}
async function vender(valor: number) {
  await dados.carrinho.adicionarAvulso(valor, 'Venda de teste');
  await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: valor });
  const venda = await dados.carrinho.concluir(); await dados.carrinho.limpar(); return venda;
}

it.each(['sqlite', 'navegador'])('R4: fiado e baixa persistem offline, reiniciam e confirmam sem duplicar (%s)', async modo => {
  if (modo === 'navegador') { base = new ArmazenamentoMemoria(); dados = new Dados(base, randomUUID, 'http://api.local'); await dados.criarConta({ email: 'web@exemplo.com', nomeResponsavel: 'Web', nomeLoja: 'Web', documento: '12345678902', tipoLoja: 'Mercado' }); }
  await dados.operacaoGestaoOnline('cliente', { nome: 'Cliente real de teste', contato: '' });
  const cliente = (await dados.backend.obterFiado!()).clientes[0]!;
  const p = await dados.produtos.criar({ nome: 'Produto', precoCentavos: 1000, estoque: 1000 });
  await dados.sincronizacao.sincronizar({ forcar: true });
  await dados.abrirCaixa(1000);
  const http = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  const pedido = { itens: [{ produtoId: p.id, descricao: 'Produto', precoUnitarioCentavos: 1000, quantidadeMilesimos: 2000 }], pagamentos: [{ meio: 'dinheiro' as const, valorCentavos: 500 }], fiado: { clienteId: cliente.id, vencimento: '2026-11-30', valorCentavos: 1500 } };
  const [venda, repetida] = await Promise.all([dados.registrarFiado(pedido), dados.registrarFiado(pedido)]);
  expect(repetida.id).toBe(venda.id);
  expect(venda.totalCentavos).toBe(2000); expect(venda.fiado?.valorCentavos).toBe(1500);
  expect((await dados.listarPendenciasSync()).filter(e => e.mutacao.entidade === 'venda')).toHaveLength(1);
  dados = new Dados(modo === 'sqlite' ? storage : base, randomUUID, 'http://api.local'); await dados.iniciar();
  expect(dados.vendas.listar().find(v => v.id === venda.id)?.fiado).toEqual(venda.fiado);
  vi.stubGlobal('fetch', http);
  let perder = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { const resposta = await http(url, init); if (url.endsWith('/sync/push') && perder) { perder = false; throw new TypeError('ACK perdido'); } return resposta; }));
  await dados.sincronizacao.sincronizar({ forcar: true });
  await dados.sincronizacao.sincronizar({ forcar: true });
  expect(await dados.listarPendenciasSync()).toEqual([]);
  const estado = await dados.backend.obterFiado!();
  expect(estado.titulos).toHaveLength(1); expect(estado.titulos[0]?.saldoCentavos).toBe(1500);
  expect((await dados.backend.obterEstoque!()).saldos[0]).toMatchObject({ saldoMilesimos: -1000, negativo: true });
  expect(dados.produtos.buscarPorId(p.id)?.estoque).toBe(-1000);
  await expect(dados.produtos.editar(p.id, { estoque: 50000 })).rejects.toThrow('movimentos');
  const r = await dados.backend.obterRelatorio!({ inicio: '2026-11-01T00:00:00Z', fim: '2026-11-02T00:00:00Z' });
  expect(r.totais).toMatchObject({ venda: 2000, recebimento_venda: 500, fiado_emitido: 1500 });
});

it('R4: resposta de recebimento perdida mantém chave, bloqueia fechamento e reinicia com um só crédito', async () => {
  await dados.operacaoGestaoOnline('cliente', { nome: 'João', contato: '' });
  const cliente = (await dados.backend.obterFiado!()).clientes[0]!;
  const cx = await dados.abrirCaixa(1000);
  const v = await dados.registrarFiado({ itens: [{ produtoId: null, descricao: 'Crédito', precoUnitarioCentavos: 1000, quantidadeMilesimos: 1000 }], pagamentos: [], fiado: { clienteId: cliente.id, vencimento: '2026-11-30', valorCentavos: 1000 } });
  await dados.sincronizacao.sincronizar({ forcar: true });
  const http = globalThis.fetch; let perder = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { const resposta = await http(url, init); if (url.endsWith('/fiado/recebimentos') && perder) { perder = false; throw new TypeError('Resposta perdida'); } return resposta; }));
  const parametros = { vendaId: v.id, valorCentavos: 400, meio: 'dinheiro', caixaId: cx.id, motivo: 'Parcial recebida' };
  await expect(dados.operacaoGestaoOnline('recebimento', parametros)).rejects.toMatchObject({ codigo: 'rede' });
  const comando = await dados.armazenamentoDaLoja.obter('operacaoGestaoPendente'); expect(comando).not.toBeNull();
  await expect(dados.caixa.fechar(1400, dados.vendas.listar())).rejects.toThrow('pendente');
  dados = new Dados(storage, randomUUID, 'http://api.local'); await dados.iniciar();
  expect(await dados.armazenamentoDaLoja.obter('operacaoGestaoPendente')).toEqual(comando);
  await expect(dados.operacaoGestaoOnline('cliente', { nome: 'Outro cliente', contato: '' })).rejects.toThrow('pendente');
  await dados.repetirOperacaoGestaoPendente();
  expect(await dados.armazenamentoDaLoja.obter('operacaoGestaoPendente')).toBeNull();
  const estado = await dados.backend.obterFiado!(); expect(estado.eventos).toHaveLength(1); expect(estado.titulos[0]?.saldoCentavos).toBe(600);
  expect(dados.caixa.atual()?.movimentos).toHaveLength(1);
  expect((await dados.backend.listarCaixas!())[0]?.saldoCentavos).toBe(1400);
  const fechado = await dados.caixa.fechar(1400, dados.vendas.listar());
  await dados.sincronizacao.sincronizar({ forcar: true });
  expect(await dados.listarPendenciasSync()).toEqual([]);
  expect(fechado.fechamento?.esperadoCentavos).toBe(1400);
});

it('R4: lojas alternam com OTP, estoque, Pix e pendência de gestão isolados por perfil', async () => {
  const dono = dados.conta.obter().sessao!;
  await dados.produtos.criar({ nome: 'Matriz', precoCentavos: 100, estoque: 3000 }); await dados.sincronizacao.sincronizar({ forcar: true });
  await dados.armazenamentoDaLoja.gravar('chavePix', 'matriz@exemplo.com');
  await dados.operacaoGestaoOnline('loja', { nome: 'Filial' });
  const filial = (await dados.backend.listarLojas!()).find(l => l.id !== dono.lojaId)!;
  const codigo = (await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: 'dono@exemplo.com' } })).json().codigo;
  const vinculo = (await dados.consultarVinculos('dono@exemplo.com', codigo)).find(v => v.lojaId === filial.id)!;
  await dados.entrar('dono@exemplo.com', codigo, vinculo);
  expect(dados.conta.obter().sessao?.aparelhoId).not.toBe(dono.aparelhoId);
  expect(dados.produtos.listar()).toEqual([]); expect(await dados.armazenamentoDaLoja.obter('chavePix')).toBeNull();
  await dados.produtos.criar({ nome: 'Filial', precoCentavos: 300, estoque: 1000 }); await dados.sincronizacao.sincronizar({ forcar: true });
  const http = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { const r = await http(url, init); if (url.endsWith('/clientes')) throw new TypeError('ACK perdido'); return r; }));
  await expect(dados.operacaoGestaoOnline('cliente', { nome: 'Cliente filial', contato: '' })).rejects.toMatchObject({ codigo: 'rede' });
  vi.stubGlobal('fetch', http);
  await dados.retomarPerfil(dono.operadorId);
  expect(dados.produtos.listar().map(p => p.nome)).toEqual(['Matriz']);
  expect(await dados.armazenamentoDaLoja.obter('chavePix')).toBe('matriz@exemplo.com');
  expect(await dados.armazenamentoDaLoja.obter('operacaoGestaoPendente')).toBeNull();
  expect((await dados.backend.obterFiado!()).clientes).toHaveLength(0);
  await dados.retomarPerfil(filial.operadorId);
  await dados.repetirOperacaoGestaoPendente();
  expect((await dados.backend.obterFiado!()).clientes).toHaveLength(1);
  expect(dados.produtos.listar().map(p => p.nome)).toEqual(['Filial']);
});
