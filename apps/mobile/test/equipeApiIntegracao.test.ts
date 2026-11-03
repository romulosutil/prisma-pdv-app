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

it('R2: abre online, vende e fecha offline; só reserva o próximo turno após confirmar vendas e fechamento', async () => {
  const caixa = await dados.abrirCaixa(10000);
  const http = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  await vender(20000);
  await dados.caixa.registrarMovimento('suprimento', 5000, 'Troco extra', { categoria: 'troco', destino: 'Tesouraria' });
  await dados.caixa.registrarMovimento('sangria', 8000, 'Recolhimento', { categoria: 'cofre_deposito', destino: 'Cofre da loja' });
  await dados.caixa.registrarMovimento('retirada', 2000, 'Despesa', { categoria: 'despesa', destino: 'Fornecedor' });
  const fechado = await dados.caixa.fechar(24900, dados.vendas.listar(), 5000);
  expect(fechado.fechamento).toMatchObject({ esperadoCentavos: 25000, diferencaCentavos: -100, recolhidoCentavos: 19900, trocoRestanteCentavos: 5000 });
  expect(dados.caixa.atual()).toBeNull();
  await expect(dados.abrirCaixa(0)).rejects.toThrow('Sincronize');
  const token = dados.conta.obter().sessao!.token;
  const bloqueado = await app.inject({ method: 'POST', url: '/caixas/reservar', headers: { authorization: `Bearer ${token}` }, payload: { id: randomUUID(), trocoInicialCentavos: 0 } });
  expect(bloqueado.statusCode).toBe(409);
  vi.stubGlobal('fetch', http);
  await dados.sincronizacao.sincronizar({ forcar: true });
  expect(await dados.listarPendenciasSync()).toEqual([]);
  const painel = await dados.backend.listarCaixas!();
  expect(painel.find(l => l.caixa.id === caixa.id)?.caixa).toEqual({ ...fechado, movimentos: [...fechado.movimentos].sort((a, b) => a.id.localeCompare(b.id)) });
  expect((await dados.abrirCaixa(5000)).id).not.toBe(caixa.id);
});

it('R2: perda da resposta da abertura e da retirada conserva chaves; reinício e reenvio não duplicam', async () => {
  const http = globalThis.fetch;
  let perderAbertura = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const resposta = await http(url, init);
    if (url.endsWith('/caixas/reservar') && perderAbertura) { perderAbertura = false; throw new TypeError('resposta perdida'); }
    return resposta;
  }));
  await expect(dados.abrirCaixa(1000)).rejects.toMatchObject({ codigo: 'rede' });
  expect(await dados.armazenamentoDaLoja.obter('aberturaCaixaPendente')).not.toBeNull();
  const reiniciado = new Dados(storage, randomUUID, 'http://api.local'); await reiniciado.iniciar(); dados = reiniciado;
  await dados.sincronizacao.sincronizar({ forcar: true });
  expect(dados.caixa.atual()?.abertura.trocoInicialCentavos).toBe(1000);
  expect((await dados.backend.listarCaixas!())).toHaveLength(1);
  const caixaId = dados.caixa.atual()!.id;
  let perderRetirada = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const resposta = await http(url, init);
    if (url.endsWith('/movimentos') && perderRetirada) { perderRetirada = false; throw new TypeError('resposta perdida'); }
    return resposta;
  }));
  await expect(dados.operacaoCaixaOnline('movimento', { caixaId, tipo: 'retirada', valorCentavos: 100, motivo: 'Despesa', categoria: 'despesa', destino: 'Fornecedor' })).rejects.toMatchObject({ codigo: 'rede' });
  expect(await dados.armazenamentoDaLoja.obter('operacaoCaixaPendente')).not.toBeNull();
  await expect(dados.caixa.fechar(900, dados.vendas.listar())).rejects.toThrow('operação online pendente');
  await expect(dados.caixa.registrarMovimento('suprimento', 100, 'Troco', { categoria: 'troco', destino: 'Tesouraria' })).rejects.toThrow('operação online pendente');
  await dados.repetirOperacaoCaixaPendente();
  expect(await dados.armazenamentoDaLoja.obter('operacaoCaixaPendente')).toBeNull();
  const painel = await dados.backend.listarCaixas!();
  expect(painel[0]?.caixa.movimentos).toHaveLength(1); expect(painel[0]?.saldoCentavos).toBe(900);
});

it('R2: mais de um lote de vendas offline é confirmado antes do fechamento imutável', async () => {
  const caixa = await dados.abrirCaixa(0);
  for (let i = 0; i < 103; i++) await dados.vendas.registrar({ itens: [{ produtoId: null, descricao: 'Venda offline', precoUnitarioCentavos: 100, quantidadeMilesimos: 1000 }], pagamentos: [{ meio: 'dinheiro', valorCentavos: 100 }] });
  await dados.caixa.fechar(10300, dados.vendas.listar());
  await dados.sincronizacao.sincronizar({ forcar: true });
  expect(await dados.listarPendenciasSync()).toEqual([]);
  const painel = await dados.backend.listarCaixas!();
  expect(painel.find(l => l.caixa.id === caixa.id)?.caixa.fechamento?.esperadoCentavos).toBe(10300);
}, 30000);

it.each(['sqlite', 'navegador'] as const)('API + %s: dois operadores alternam com filas e rascunhos separados, sincronizam e o dono confere ambos', async modo => {
  if (modo === 'navegador') {
    const estado = dados.conta.obter(); base = new ArmazenamentoMemoria();
    dados = new Dados(base, randomUUID, 'http://api.local');
    await dados.conta.registrar(estado.sessao!, estado.perfil!); await dados.iniciar();
  }
  const dono = dados.conta.obter().sessao!;
  await dados.armazenamentoDaLoja.gravar('chavePix', 'chave-da-loja@exemplo.com');
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  const b = await dados.backend.convidar!({ email: 'bruno@exemplo.com', nome: 'Bruno', papel: 'operador' });
  const produto = await dados.produtos.criar({ nome: 'Produto compartilhado', precoCentavos: 700 });
  await dados.sincronizacao.sincronizar();
  await acessar(a); await dados.sincronizacao.sincronizar();
  expect(dados.conta.obter().sessao!.aparelhoId).toBe(dono.aparelhoId);
  expect(await dados.armazenamentoDaLoja.obter('chavePix')).toBe('chave-da-loja@exemplo.com');
  await dados.preferencias.alterar({ lanterna: true });
  expect(dados.produtos.listar().map(p => p.id)).toContain(produto.id);
  await expect(dados.produtos.editar(produto.id, { nome: 'Sem permissão' })).rejects.toThrow('não permite');
  const caixaA = await dados.caixa.abrir(1000); const vendaA = await vender(700);
  await dados.carrinho.adicionarAvulso(200, 'Rascunho da Ana');
  const pendenciasA = await dados.listarPendenciasSync(); expect(pendenciasA.length).toBeGreaterThan(0);
  await acessar(b);
  expect(dados.conta.obter().sessao!.aparelhoId).toBe(dono.aparelhoId);
  expect(dados.preferencias.obter().lanterna).toBe(false);
  expect(dados.carrinho.obter().itens).toEqual([]); expect(dados.caixa.atual()).toBeNull(); expect(dados.vendas.listar()).toEqual([]);
  expect(await dados.listarPendenciasSync()).toEqual([]);
  const caixaB = await dados.caixa.abrir(500); const vendaB = await vender(400);
  await dados.sincronizacao.sincronizar(); expect(await dados.listarPendenciasSync()).toEqual([]);
  await dados.retomarPerfil(a.operadorId);
  expect(dados.caixa.atual()?.id).toBe(caixaA.id); expect(dados.vendas.listar().map(v => v.id)).toEqual([vendaA.id]);
  expect(dados.carrinho.obter().itens[0]?.descricao).toBe('Rascunho da Ana');
  expect(dados.preferencias.obter().lanterna).toBe(true);
  expect((await dados.listarPendenciasSync()).map(p => p.mutacao.id)).toEqual(pendenciasA.map(p => p.mutacao.id));
  await dados.sincronizacao.sincronizar();
  expect(dados.vendas.listar().map(v => v.id)).toEqual([vendaA.id]);
  expect(dados.caixa.obter().map(c => c.id)).toEqual([caixaA.id]);
  const tokenA = dados.conta.obter().sessao!.token;
  await dados.retomarPerfil(dono.operadorId); await dados.sincronizacao.sincronizar();
  expect(dados.vendas.listar().map(v => v.id).sort()).toEqual([vendaA.id, vendaB.id].sort());
  expect(dados.caixa.obter().map(c => c.id).sort()).toEqual([caixaA.id, caixaB.id].sort());
  if (modo === 'sqlite') {
    for (const token of [dono.token, tokenA]) expect([...base.dados.values()].join('')).not.toContain(token);
    expect([...cofre.dados.values()]).toContain(tokenA);
  }
  // Reiniciar Dados conserva o perfil ativo e os pausados, sem criar nova autoria.
  const reiniciado = new Dados(modo === 'sqlite' ? storage : base, randomUUID, 'http://api.local'); await reiniciado.iniciar();
  await reiniciado.retomarPerfil(a.operadorId);
  expect(reiniciado.carrinho.obter().itens[0]?.descricao).toBe('Rascunho da Ana');
  expect(reiniciado.conta.obter().sessao!.operadorId).toBe(a.operadorId);
});

it('suspensão impede retomar sem afetar outro perfil; cobrança em andamento impede alternância; logout elimina a sessão pausada', async () => {
  const dono = dados.conta.obter().sessao!;
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  await acessar(a); await dados.caixa.abrir(0);
  await dados.carrinho.adicionarAvulso(500, 'Recebimento'); await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 100 });
  await expect(dados.retomarPerfil(dono.operadorId)).rejects.toThrow('Conclua a cobrança');
  await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 400 }); await dados.carrinho.concluir(); await dados.carrinho.limpar();
  await dados.sincronizacao.sincronizar();
  await dados.retomarPerfil(dono.operadorId);
  await dados.backend.alterarVinculo!(a.operadorId, { estado: 'suspenso' });
  await expect(dados.retomarPerfil(a.operadorId)).rejects.toMatchObject({ status: 401 });
  expect(dados.conta.obter().sessao!.operadorId).toBe(dono.operadorId);
  expect((await dados.listarPerfisLocais()).find(p => p.operadorId === a.operadorId)?.pausado).toBe(false);
  expect((await dados.backend.obterPerfil()).papel).toBe('dono');
  await dados.sair();
  expect(dados.conta.obter().sessao).toBeNull();
  await expect(dados.produtos.criar({ nome: 'Após sair', precoCentavos: 100 })).rejects.toThrow('não permite');
  await expect(dados.caixa.abrir(0)).rejects.toThrow('não permite');
  expect((await app.inject({ method: 'GET', url: '/conta', headers: { authorization: `Bearer ${dono.token}` } })).statusCode).toBe(401);
});

it('logout offline impede uso local imediatamente e mantém somente no cofre a revogação pendente até reconectar', async () => {
  const sessao = dados.conta.obter().sessao!;
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
  expect(await dados.sair()).toEqual({ revogadaNoServidor: false });
  expect(dados.conta.obter().sessao).toBeNull();
  expect((await app.inject({ method: 'GET', url: '/conta', headers: { authorization: `Bearer ${sessao.token}` } })).statusCode).toBe(200);
  expect([...base.dados.values()].join('')).not.toContain(sessao.token);
  expect([...cofre.dados.values()]).toContain(sessao.token);
  expect(await dados.listarPerfisLocais()).toMatchObject([{ ativo: true, pausado: false, exigeReautenticacao: true }]);
  await dados.processarSaidasPendentes();
  expect((await app.inject({ method: 'GET', url: '/conta', headers: { authorization: `Bearer ${sessao.token}` } })).statusCode).toBe(401);
  expect([...cofre.dados.values()]).not.toContain(sessao.token);
  expect(await base.obter('saidas_pendentes')).toEqual([]);
});

it.each(['sqlite', 'navegador'] as const)('R3 %s: alterna offline, reinicia, perde ACK e reconecta Bruno antes de Ana sem misturar autoria', async modo => {
  const dono = dados.conta.obter().sessao!;
  if (modo === 'navegador') {
    base = new ArmazenamentoMemoria(); dados = new Dados(base, randomUUID, 'http://api.local');
    await dados.conta.registrar(dono, { email: 'dono@exemplo.com', nomeResponsavel: 'Dono', nomeLoja: 'Loja', aparelhoNome: 'Balcão' }); await dados.iniciar();
  }
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  const b = await dados.backend.convidar!({ email: 'bruno@exemplo.com', nome: 'Bruno', papel: 'operador' });
  await acessar(a); const ca = await dados.abrirCaixa(1000);
  await acessar(b); const cb = await dados.abrirCaixa(500);
  const http = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  await dados.retomarPerfil(a.operadorId); const va = await vender(700);
  await dados.carrinho.adicionarAvulso(300, 'Rascunho da Ana');
  const pa = await dados.listarPendenciasSync(); const prazoA = dados.acessoOffline.limite(dados.conta.obter().identidade!);
  await dados.retomarPerfil(b.operadorId); const vb = await vender(400);
  const pb = await dados.listarPendenciasSync();
  dados = new Dados(modo === 'sqlite' ? storage : base, randomUUID, 'http://api.local'); await dados.iniciar();
  await dados.retomarPerfil(a.operadorId);
  expect(dados.carrinho.obter().itens[0]?.descricao).toBe('Rascunho da Ana');
  expect(await dados.listarPendenciasSync()).toEqual(pa);
  expect(dados.acessoOffline.limite(dados.conta.obter().identidade!)).toBe(prazoA);
  await dados.retomarPerfil(b.operadorId);
  expect(await dados.listarPendenciasSync()).toEqual(pb); expect(dados.vendas.listar().map(v => v.id)).toEqual([vb.id]);
  const resumoA = (await dados.listarPerfisLocais()).find(p => p.operadorId === a.operadorId)!;
  expect(resumoA.resumo?.pendentes).toBe(pa.length); expect(resumoA.exigeReautenticacao).toBe(false);
  let perder = true;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const r = await http(url, init);
    if (url.endsWith('/sync/push') && perder) { perder = false; throw new TypeError('ACK perdido após commit'); }
    return r;
  }));
  await dados.sincronizacao.sincronizar(); expect(dados.sincronizacao.obter().situacao).toBe('offline');
  expect((await dados.listarPendenciasSync()).map(p => p.mutacao.id)).toEqual(pb.map(p => p.mutacao.id));
  await dados.sincronizacao.sincronizar({ forcar: true }); expect(await dados.listarPendenciasSync()).toEqual([]);
  await dados.retomarPerfil(a.operadorId); await dados.sincronizacao.sincronizar();
  expect(await dados.listarPendenciasSync()).toEqual([]); expect(dados.vendas.listar()).toMatchObject([{ id: va.id, operadorId: a.operadorId, caixaId: ca.id }]);
  await dados.retomarPerfil(dono.operadorId); await dados.sincronizacao.sincronizar();
  expect(dados.vendas.listar().map(v => [v.id, v.operadorId, v.caixaId]).sort()).toEqual([[va.id, a.operadorId, ca.id], [vb.id, b.operadorId, cb.id]].sort());
});

it('R3: revogação do perfil ativo preserva fila e permite operar com outro perfil', async () => {
  const dono = dados.conta.obter().sessao!;
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  await acessar(a); await dados.abrirCaixa(0); await vender(700);
  const pendencias = await dados.listarPendenciasSync();
  await dados.retomarPerfil(dono.operadorId); await dados.backend.alterarVinculo!(a.operadorId, { estado: 'suspenso' });
  const http = globalThis.fetch; vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  // A suspensão remota só é conhecida ao reconectar; o prazo local ainda está válido.
  await dados.retomarPerfil(a.operadorId);
  vi.stubGlobal('fetch', http); await dados.sincronizacao.sincronizar();
  expect(dados.conta.obter().sessao).toBeNull(); expect(dados.sincronizacao.obter().situacao).toBe('reautenticacao');
  expect(await dados.listarPendenciasSync()).toEqual(pendencias);
  await dados.retomarPerfil(dono.operadorId); expect(dados.pode('vender')).toBe(true);
  expect((await dados.listarPerfisLocais()).find(p => p.operadorId === a.operadorId)).toMatchObject({ pausado: false, exigeReautenticacao: true, resumo: { pendentes: pendencias.length } });
  expect(JSON.parse(await dados.sincronizacao.exportar()).entradas).toEqual([]);
});

it('R3: sete dias offline bloqueiam novas operações e alternância; recebimentos iniciados sobrevivem', async () => {
  const dono = dados.conta.obter().sessao!;
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  await acessar(a); await dados.abrirCaixa(0); await dados.carrinho.adicionarAvulso(500, 'Em recebimento');
  await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 100 });
  const http = globalThis.fetch; vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  relogio.avancarDias(7);
  expect(dados.pode('vender')).toBe(false);
  await expect(dados.retomarPerfil(dono.operadorId)).rejects.toThrow('Conclua a cobrança');
  await dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 400 }); await dados.carrinho.concluir(); await dados.carrinho.limpar();
  await expect(dados.carrinho.adicionarAvulso(100, 'Nova')).rejects.toThrow('Entre novamente');
  await expect(dados.retomarPerfil(dono.operadorId)).rejects.toMatchObject({ codigo: 'rede' });
  expect(dados.vendas.listar()).toHaveLength(1);
  vi.stubGlobal('fetch', http); await dados.sincronizacao.sincronizar();
  expect(dados.pode('vender')).toBe(true); expect(await dados.listarPendenciasSync()).toEqual([]);
});

it('R3: confirmação em andamento bloqueia alternância e login até concluir', async () => {
  const dono = dados.conta.obter().sessao!;
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  await acessar(a); await dados.abrirCaixa(0); await vender(100);
  const http = globalThis.fetch; let liberar!: () => void; let chegou!: () => void;
  const gate = new Promise<void>(r => { liberar = r; }); const aguardando = new Promise<void>(r => { chegou = r; });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { const r = await http(url, init); if (url.endsWith('/sync/push')) { chegou(); await gate; } return r; }));
  const voo = dados.sincronizacao.sincronizar(); await aguardando;
  try {
    await expect(dados.retomarPerfil(dono.operadorId)).rejects.toThrow('confirmação em andamento');
    await expect(dados.entrar('dono@exemplo.com', '000000')).rejects.toThrow('confirmação em andamento');
  } finally { liberar(); await voo; }
  expect(await dados.listarPendenciasSync()).toEqual([]);
});

it('R3: intervenção remota contra fechamento offline mantém conflito visível e ambos os históricos', async () => {
  const dono = dados.conta.obter().sessao!;
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  await acessar(a); const cx = await dados.abrirCaixa(1000); await vender(200);
  const fechado = await dados.caixa.fechar(1200, dados.vendas.listar());
  const remoto = await app.inject({ method: 'POST', url: `/caixas/${cx.id}/movimentos`, headers: { authorization: `Bearer ${dono.token}` }, payload: { id: randomUUID(), tipo: 'suprimento', valorCentavos: 300, motivo: 'Troco pelo gestor', categoria: 'troco', destino: 'Tesouraria' } });
  expect(remoto.statusCode).toBe(200);
  const ultimaCompleta = dados.sincronizacao.obter().ultimaSincronizacaoEm;
  relogio.avancarDias(1);
  await dados.sincronizacao.sincronizar();
  expect((await dados.listarPendenciasSync()).some(p => p.bloqueada && p.motivo === 'caixa_desatualizado')).toBe(true);
  expect(dados.caixa.obter().find(c => c.id === cx.id)).toEqual(fechado);
  expect(dados.sincronizacao.obter().ultimaSincronizacaoEm).toBe(ultimaCompleta);
  await expect(dados.abrirCaixa(0)).rejects.toThrow('Sincronize');
  const painel = await dados.backend.listarCaixas!(); expect(painel[0]!.caixa.fechamento).toBeNull(); expect(painel[0]!.caixa.movimentos).toHaveLength(1);
  expect(JSON.parse(await dados.sincronizacao.exportar()).entradas.find((p: any) => p.bloqueada).mutacao.dados).toEqual(fechado);
});

it.each(['sqlite', 'navegador'] as const)('R3 %s: revalida permissões, remove cache alheio e preserva operações recusadas na promoção/redução de gerente', async modo => {
  const dono = dados.conta.obter().sessao!;
  if (modo === 'navegador') {
    base = new ArmazenamentoMemoria(); dados = new Dados(base, randomUUID, 'http://api.local');
    await dados.conta.registrar(dono, { email: 'dono@exemplo.com', nomeResponsavel: 'Dono', nomeLoja: 'Loja', aparelhoNome: 'Balcão' }); await dados.iniciar();
  }
  await dados.abrirCaixa(0); const vendaDono = await vender(800); await dados.sincronizacao.sincronizar();
  const g = await dados.backend.convidar!({ email: 'gerente@exemplo.com', nome: 'Gerente', papel: 'gerente' });
  await acessar(g); await dados.abrirCaixa(0); const vendaG = await vender(200); await dados.sincronizacao.sincronizar();
  expect(dados.vendas.listar().map(v => v.id)).toContain(vendaDono.id);
  const produto = await dados.produtos.criar({ nome: 'Cadastro pendente do gerente', precoCentavos: 100 });
  const fila = await dados.listarPendenciasSync();
  await dados.retomarPerfil(dono.operadorId); await dados.backend.alterarVinculo!(g.operadorId, { papel: 'operador' });
  const http = globalThis.fetch; vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
  await dados.retomarPerfil(g.operadorId); expect(dados.vendas.listar()).toHaveLength(2);
  vi.stubGlobal('fetch', http); await dados.sincronizacao.sincronizar();
  expect(dados.conta.obter().sessao).toBeNull();
  relogio.avancarDias(1 / 24);
  await acessar({ ...g, estado: 'ativo' }); await dados.sincronizacao.sincronizar();
  expect(dados.pode('conferir_caixas')).toBe(false); expect(dados.vendas.listar().map(v => v.id)).toEqual([vendaG.id]);
  const pendentes = await dados.listarPendenciasSync();
  expect(pendentes).toHaveLength(1); expect(pendentes[0]?.mutacao).toEqual(fila[0]?.mutacao); expect(pendentes[0]?.bloqueada).toBe(true);
  expect(dados.produtos.listar().map(p => p.id)).toContain(produto.id);
  const exportado = JSON.parse(await dados.sincronizacao.exportar());
  expect(JSON.stringify(exportado)).not.toContain(vendaDono.id);
  if (modo === 'sqlite') {
    const cache = raw.prepare('SELECT payload_json FROM vendas WHERE loja_id = ?').all(JSON.stringify([g.lojaId, g.operadorId]));
    expect(JSON.stringify(cache)).not.toContain(vendaDono.id);
  }
  await dados.retomarPerfil(dono.operadorId); await dados.backend.alterarVinculo!(g.operadorId, { papel: 'gerente' });
  relogio.avancarDias(1 / 24); await acessar({ ...g, estado: 'ativo' }); await dados.sincronizacao.retentarRejeitadas(); await dados.sincronizacao.sincronizar();
  expect(dados.vendas.listar().map(v => v.id).sort()).toEqual([vendaDono.id, vendaG.id].sort()); expect(await dados.listarPendenciasSync()).toEqual([]);
});

it('R3: dois aparelhos de usuários diferentes recuperam somente o confirmado; fila perdida não é inventada', async () => {
  const a = await dados.backend.convidar!({ email: 'ana@exemplo.com', nome: 'Ana', papel: 'operador' });
  const b = await dados.backend.convidar!({ email: 'bruno@exemplo.com', nome: 'Bruno', papel: 'operador' });
  await acessar(a); const ca = await dados.abrirCaixa(0); const va = await vender(500); await dados.sincronizacao.sincronizar();
  const pendente = await vender(300);
  const aparelhoB = new DatabaseSync(':memory:'); const recuperado = new DatabaseSync(':memory:');
  const novo = (db: DatabaseSync) => new Dados(new ArmazenamentoSqlite(async () => sqliteBanco(db), new ArmazenamentoMemoria()), randomUUID, 'http://api.local');
  const autenticar = async (destino: Dados, v: Vinculo) => {
    relogio.avancarDias(1 / 24);
    const r = await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: v.email } });
    await destino.entrar(v.email, r.json().codigo, v);
  };
  try {
    const segundo = novo(aparelhoB); await autenticar(segundo, b); await segundo.abrirCaixa(0);
    await segundo.carrinho.adicionarAvulso(700, 'Bruno'); await segundo.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 700 });
    const vb = await segundo.carrinho.concluir(); await segundo.sincronizacao.sincronizar();
    expect(segundo.vendas.listar().map(v => v.id)).toEqual([vb.id]);
    const terceiro = novo(recuperado); await autenticar(terceiro, a); await terceiro.sincronizacao.sincronizar();
    expect(terceiro.vendas.listar().map(v => v.id)).toEqual([va.id]); expect(terceiro.vendas.listar().map(v => v.id)).not.toContain(pendente.id);
    expect(await terceiro.listarPendenciasSync()).toEqual([]); expect(terceiro.caixa.atual()).toBeNull();
    expect(terceiro.caixa.obter().map(c => c.id)).toEqual([ca.id]);
    // A origem ainda existe neste teste: reconecta por último e recupera o registro uma única vez.
    await dados.sincronizacao.sincronizar(); await terceiro.sincronizacao.sincronizar();
    expect(terceiro.vendas.listar().map(v => v.id).sort()).toEqual([va.id, pendente.id].sort());
  } finally { aparelhoB.close(); recuperado.close(); }
});

it('R3: revalidação lenta não bloqueia a escrita offline de um perfil autorizado', async () => {
  await dados.abrirCaixa(0);
  const http = globalThis.fetch; let liberar!: () => void; let chegou!: () => void;
  const gate = new Promise<void>(r => { liberar = r; }); const aguardando = new Promise<void>(r => { chegou = r; });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { if (url.endsWith('/conta')) { chegou(); await gate; } return http(url, init); }));
  const voo = dados.sincronizacao.sincronizar(); await aguardando;
  try {
    expect(dados.conta.transicao.obter()).toBe(false);
    await dados.carrinho.adicionarAvulso(600, 'Venda durante a espera de rede');
    expect(dados.carrinho.obter().itens[0]?.descricao).toBe('Venda durante a espera de rede');
  } finally { liberar(); await voo; }
  expect(dados.carrinho.obter().itens[0]?.descricao).toBe('Venda durante a espera de rede');
});

it('R5: sincronizações periódicas mantêm as travas e não exibem a transição visual de troca de usuário', async () => {
  await dados.abrirCaixa(10000);
  const snapshots: { bloqueado: boolean; segundoPlano: boolean; escrita: boolean }[] = [];
  const parar = dados.conta.transicao.assinar(() => snapshots.push({ bloqueado: dados.conta.transicao.obter(), segundoPlano: dados.conta.atualizacaoEmSegundoPlano.obter(), escrita: dados.armazenamentoDaLoja.podeAlterar() }));
  try { await dados.sincronizacao.sincronizar(); await dados.sincronizacao.sincronizar(); } finally { parar(); }
  expect(snapshots.filter(s => s.bloqueado).length).toBeGreaterThan(0);
  expect(snapshots.some(s => s.bloqueado && !s.segundoPlano)).toBe(false);
  expect(dados.conta.transicao.obter()).toBe(false);
  expect(dados.conta.atualizacaoEmSegundoPlano.obter()).toBe(false);
  expect(dados.armazenamentoDaLoja.podeAlterar()).toBe(true);
  expect(dados.caixa.atual()?.abertura.trocoInicialCentavos).toBe(10000);
});
