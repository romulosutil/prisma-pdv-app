import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { gerarId, type Caixa, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, caixas, movimentosCaixa, operadores, usuarios } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarConta, criarAmbiente, enviar, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

async function funcionario(dono: Sessao, nome: string, saidas = true) {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${nome}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', permissoes: ['vender', 'movimentar_proprio_caixa', ...(saidas ? ['retirar_dinheiro' as const] : [])], criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}
const post = (s: Sessao, rota: string, corpo: unknown) => chamar(amb, 'POST', rota, { token: s.token, corpo });
async function abrir(s: Sessao, troco: number): Promise<Caixa> {
  const r = await post(s, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: troco });
  expect(r.status).toBe(200); return r.corpo;
}
const movimento = (s: Sessao, tipo: 'suprimento' | 'sangria' | 'retirada', valorCentavos: number) => ({ id: gerarId(), tipo, valorCentavos, motivo: 'Operação de teste', criadoEm: INICIO.toISOString(), versaoContrato: 2 as const, autorOperadorId: s.operadorId, responsavelOperadorId: s.operadorId, aparelhoId: s.aparelhoId, categoria: 'teste', destino: 'Responsável teste' });

it('reserva idempotente impede dois turnos do mesmo usuário e preserva saldos de Ana e Bruno', async () => {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana'), bruno = await funcionario(dono, 'bruno');
  let a = await abrir(ana, 10000), b = await abrir(bruno, 6000);
  expect((await post(ana, '/caixas/reservar', { id: a.id, trocoInicialCentavos: 10000 })).corpo).toEqual(a);
  expect((await post(ana, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: 0 })).status).toBe(409);
  a = { ...a, movimentos: [movimento(ana, 'suprimento', 5000), movimento(ana, 'sangria', 8000), movimento(ana, 'retirada', 2000)] };
  const va = venda(ana, { caixaId: a.id, totalCentavos: 20000, itens: [{ id: gerarId(), produtoId: null, descricao: 'Venda', precoUnitarioCentavos: 20000, quantidadeMilesimos: 1000, totalCentavos: 20000 }], pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 20000, trocoCentavos: 0 }] });
  const vb = venda(bruno, { caixaId: b.id, totalCentavos: 4000, itens: [{ id: gerarId(), produtoId: null, descricao: 'Venda', precoUnitarioCentavos: 4000, quantidadeMilesimos: 1000, totalCentavos: 4000 }], pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 4000, trocoCentavos: 0 }] });
  expect((await enviar(amb, ana, [mutacao('caixa', a), mutacao('venda', va)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, bruno, [mutacao('venda', vb)])).corpo.rejeitadas).toEqual([]);
  const painel = await chamar(amb, 'GET', '/caixas', { token: dono.token });
  expect(painel.corpo.map((x: any) => x.saldoCentavos).sort((x: number, y: number) => x - y)).toEqual([10000, 25000]);
  const individual = await chamar(amb, 'GET', '/caixas', { token: ana.token });
  expect(individual.corpo.map((x: any) => x.caixa.id)).toEqual([a.id]);
  a = { ...a, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 25000, contadoCentavos: 24900, diferencaCentavos: -100, conferenteId: ana.operadorId, recolhidoCentavos: 19900, trocoRestanteCentavos: 5000 } };
  expect((await post(ana, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: 0 })).status).toBe(409);
  expect((await enviar(amb, ana, [mutacao('caixa', a)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, ana, [mutacao('caixa', a)])).corpo.rejeitadas).toEqual([]);
  expect((await enviar(amb, ana, [mutacao('caixa', { ...a, fechamento: null })])).corpo.rejeitadas[0].motivo).toBe('caixa_fechada');
  expect((await abrir(ana, 5000)).id).not.toBe(a.id);
});

it('nega autoria forjada, saída sem permissão e fechamento incoerente sem alterar eventos', async () => {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana', false);
  const cx = await abrir(ana, 1000), m = movimento(ana, 'retirada', 100);
  expect((await enviar(amb, ana, [mutacao('caixa', { ...cx, movimentos: [m] })])).corpo.rejeitadas[0].motivo).toBe('permissao_negada');
  expect((await enviar(amb, ana, [mutacao('caixa', { ...cx, movimentos: [{ ...m, tipo: 'suprimento', autorOperadorId: dono.operadorId }] })])).corpo.rejeitadas[0].motivo).toBe('origem_invalida');
  expect((await enviar(amb, ana, [mutacao('caixa', { ...cx, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 0, contadoCentavos: 0 } })])).corpo.rejeitadas[0].motivo).toBe('fechamento_inconsistente');
  const req = { id: gerarId(), tipo: 'retirada', valorCentavos: 200, motivo: 'Despesa autorizada', categoria: 'despesa', destino: 'Fornecedor' };
  expect((await post(ana, `/caixas/${cx.id}/movimentos`, req)).status).toBe(403);
  const aprovada = await post(dono, `/caixas/${cx.id}/movimentos`, req);
  expect(aprovada.status).toBe(200);
  expect(aprovada.corpo.movimentos[0]).toMatchObject({ autorOperadorId: dono.operadorId, responsavelOperadorId: ana.operadorId, aprovadorId: dono.operadorId });
  expect((await post(dono, `/caixas/${cx.id}/movimentos`, req)).corpo).toEqual(aprovada.corpo);
  expect((await post(dono, `/caixas/${cx.id}/movimentos`, { ...req, valorCentavos: 300 })).status).toBe(409);
  expect((await amb.db.select().from(movimentosCaixa))).toHaveLength(1);
});

it('transferência usa consentimento do destino e débito/crédito atômicos, sem revelar o caixa alheio', async () => {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana'), bruno = await funcionario(dono, 'bruno');
  const a = await abrir(ana, 10000), b = await abrir(bruno, 5000), id = gerarId();
  const req = { id, origemId: a.id, destinoId: b.id, valorCentavos: 3000, motivo: 'Troco para Bruno' };
  expect((await post(ana, '/caixas/transferencias/autorizar', req)).status).toBe(403);
  expect((await post(bruno, '/caixas/transferencias/autorizar', req)).status).toBe(200);
  const transferida = await post(ana, '/caixas/transferencias/executar', { autorizacaoId: id });
  expect(transferida.status).toBe(200); expect(transferida.corpo.destino).toBeUndefined();
  expect((await post(ana, '/caixas/transferencias/executar', { autorizacaoId: id })).corpo).toEqual(transferida.corpo);
  const eventos = await amb.db.select().from(movimentosCaixa);
  expect(eventos).toHaveLength(2); expect(eventos.map(e => e.detalhes?.transferenciaId)).toEqual([id, id]);
  const p = await chamar(amb, 'GET', '/caixas', { token: dono.token }); expect(p.corpo.map((x: any) => x.saldoCentavos)).toEqual([7000, 8000]);
  const outra = await criarConta(amb);
  expect((await post(outra, '/caixas/transferencias/executar', { autorizacaoId: id })).status).toBe(409);
  const excede = { ...req, id: gerarId(), valorCentavos: 20000 };
  await post(bruno, '/caixas/transferencias/autorizar', excede);
  expect((await post(ana, '/caixas/transferencias/executar', { autorizacaoId: excede.id })).status).toBe(409);
  expect((await amb.db.select().from(movimentosCaixa))).toHaveLength(2);
});

it('troca de aparelho preserva origem e recusa o aparelho anterior; conferência não altera fechamento', async () => {
  const dono = await contaEmTeste(amb, 'pro'), a = await abrir(dono, 1000), aparelhoId = gerarId();
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome: 'Novo', criadoEm: INICIO, ultimoAcessoEm: INICIO });
  const nova = await criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId: dono.operadorId, aparelhoId }, INICIO);
  const r = await post(nova, `/caixas/${a.id}/aparelho`, { aparelhoAnteriorId: dono.aparelhoId, motivo: 'Troca de aparelho sincronizado', confirmarSincronizacaoAnterior: true });
  expect(r.status).toBe(200); expect(r.corpo.aparelhoId).toBe(dono.aparelhoId); expect(r.corpo.aparelhoAtualId).toBe(aparelhoId);
  expect((await enviar(amb, dono, [mutacao('caixa', a)])).corpo.rejeitadas[0].motivo).toBe('origem_invalida');
  const cx = { ...r.corpo, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 1000, contadoCentavos: 1000, diferencaCentavos: 0, conferenteId: dono.operadorId, recolhidoCentavos: 1000, trocoRestanteCentavos: 0 } };
  expect((await enviar(amb, nova, [mutacao('caixa', cx)])).corpo.rejeitadas).toEqual([]);
  const antes = await amb.db.select().from(caixas).where(eq(caixas.id, a.id));
  const req = { id: gerarId(), motivo: 'Conferi notas e moedas' };
  expect((await post(nova, `/caixas/${a.id}/conferir`, req)).status).toBe(200);
  expect((await post(nova, `/caixas/${a.id}/conferir`, req)).status).toBe(200);
  expect(await amb.db.select().from(caixas).where(eq(caixas.id, a.id))).toEqual(antes);
});

it('duas reservas concorrentes confirmam somente uma; o índice também protege escritas fora da rota', async () => {
  const dono = await contaEmTeste(amb, 'pro');
  const respostas = await Promise.all([0, 1].map(() => post(dono, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: 0 })));
  expect(respostas.map(r => r.status).sort()).toEqual([200, 409]);
  const linha = (await amb.db.select().from(caixas))[0]!;
  await expect(amb.db.insert(caixas).values({ ...linha, id: gerarId() })).rejects.toThrow();
  expect((await amb.db.select().from(caixas))).toHaveLength(1);
});

it('falha ao creditar a transferência desfaz também o débito; autorização expirada não movimenta', async () => {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana'), bruno = await funcionario(dono, 'bruno');
  const a = await abrir(ana, 10000), b = await abrir(bruno, 1000), id = gerarId();
  await post(bruno, '/caixas/transferencias/autorizar', { id, origemId: a.id, destinoId: b.id, valorCentavos: 1000, motivo: 'Troco' });
  await amb.db.execute(sql.raw("CREATE FUNCTION falhar_credito_r2() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo = 'transferencia_entrada' THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$"));
  await amb.db.execute(sql.raw('CREATE TRIGGER falhar_credito_r2 BEFORE INSERT ON movimentos_caixa FOR EACH ROW EXECUTE FUNCTION falhar_credito_r2()'));
  try {
    expect((await post(ana, '/caixas/transferencias/executar', { autorizacaoId: id })).status).toBe(500);
    expect((await amb.db.select().from(movimentosCaixa))).toHaveLength(0);
    expect((await chamar(amb, 'GET', '/caixas', { token: dono.token })).corpo.map((x: any) => x.saldoCentavos)).toEqual([10000, 1000]);
  } finally {
    await amb.db.execute(sql.raw('DROP TRIGGER falhar_credito_r2 ON movimentos_caixa'));
    await amb.db.execute(sql.raw('DROP FUNCTION falhar_credito_r2()'));
  }
  amb.relogio.avancarHoras(1);
  expect((await post(ana, '/caixas/transferencias/executar', { autorizacaoId: id })).status).toBe(409);
  expect((await amb.db.select().from(movimentosCaixa))).toHaveLength(0);
});

it('reenvio desatualizado preserva intervenção; correção acrescenta evento referenciado sem editar o original', async () => {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana');
  const cx = await abrir(ana, 1000);
  const entrada = { id: gerarId(), tipo: 'suprimento', valorCentavos: 200, motivo: 'Troco', categoria: 'troco', destino: 'Tesouraria' };
  await post(dono, `/caixas/${cx.id}/movimentos`, entrada);
  expect((await enviar(amb, ana, [mutacao('caixa', cx)])).corpo.rejeitadas).toEqual([]);
  expect((await chamar(amb, 'GET', '/caixas', { token: ana.token })).corpo[0].saldoCentavos).toBe(1200);
  const correcao = { id: gerarId(), tipo: 'correcao_saida', valorCentavos: 100, motivo: 'Entrada digitada a maior', categoria: 'correcao', destino: 'Tesouraria', originalId: entrada.id };
  const r = await post(dono, `/caixas/${cx.id}/movimentos`, correcao);
  expect(r.status).toBe(200); expect(r.corpo.movimentos).toHaveLength(2);
  expect(r.corpo.movimentos[0]).toMatchObject(entrada); expect(r.corpo.movimentos[1]).toMatchObject(correcao);
  const fechamento = { em: INICIO.toISOString(), esperadoCentavos: 1000, contadoCentavos: 1000, diferencaCentavos: 0, conferenteId: ana.operadorId, recolhidoCentavos: 1000, trocoRestanteCentavos: 0 };
  expect((await enviar(amb, ana, [mutacao('caixa', { ...cx, fechamento })])).corpo.rejeitadas[0].motivo).toBe('caixa_desatualizado');
  const original = (await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, entrada.id)))[0]!;
  expect((await enviar(amb, ana, [mutacao('caixa', { ...r.corpo, movimentos: r.corpo.movimentos.map((m: any) => m.id === entrada.id ? { ...m, destino: 'Mudou' } : m) })])).corpo.rejeitadas[0].motivo).toBe('movimento_imutavel');
  expect((await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, entrada.id)))[0]).toEqual(original);
});
