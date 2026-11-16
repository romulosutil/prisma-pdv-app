/**
 * Piloto Android, cenário F13: dois aparelhos da mesma pessoa disputando o turno (o 2º aparelho é simulado por sessão própria,
 * como o piloto fez por HTTP no CP 147; não há evidência de dois Androids reais).
 *
 * Já existia cobertura parcial: caixaUsuario.test.ts ("duas reservas concorrentes confirmam somente uma" no MESMO aparelho, troca de
 * aparelho feliz e recusa do aparelho anterior) e equipe.test.ts. Este arquivo acrescenta: disputa concorrente entre DOIS aparelhos
 * do mesmo operador, recusas do 2º aparelho sobre turno aberto no 1º, as exigências de consentimento da transferência, atomicidade
 * entre dois pretendentes, bloqueio de escrita do aparelho antigo (rota e sync), retorno ao aparelho antigo, turno encerrado
 * que não reabre e revogação de aparelho (titular ou não) impedindo escrita.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, isNull } from 'drizzle-orm';
import { gerarId, type Caixa, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, auditoriaCaixa, caixas, movimentosCaixa, operadores, usuarios, vendas } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

const PERMISSOES = ['vender', 'movimentar_proprio_caixa', 'retirar_dinheiro'] as const;
async function novoAparelho(base: Sessao, nome: string): Promise<Sessao> {
  const aparelhoId = gerarId();
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: base.contaId, lojaId: base.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: base.contaId, lojaId: base.lojaId, operadorId: base.operadorId, aparelhoId }, INICIO);
}
async function funcionario(dono: Sessao, nome: string): Promise<Sessao> {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${nome}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', permissoes: [...PERMISSOES], criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}
const post = (s: Sessao, rota: string, corpo: unknown) => chamar(amb, 'POST', rota, { token: s.token, corpo });
const get = (s: Sessao, rota: string) => chamar(amb, 'GET', rota, { token: s.token });
const reservar = (s: Sessao, id: string, troco = 10000) => post(s, '/caixas/reservar', { id, trocoInicialCentavos: troco });
async function abrir(s: Sessao, troco = 10000): Promise<Caixa> {
  const r = await reservar(s, gerarId(), troco);
  expect(r.status).toBe(200);
  return r.corpo;
}
const trocar = (s: Sessao, caixaId: string, anteriorId: string, extra: Record<string, unknown> = {}) =>
  post(s, `/caixas/${caixaId}/aparelho`, { aparelhoAnteriorId: anteriorId, motivo: 'Troca de aparelho sincronizado', confirmarSincronizacaoAnterior: true, ...extra });
const suprimento = (s: Sessao, caixaId: string, valorCentavos: number) =>
  post(s, `/caixas/${caixaId}/movimentos`, { id: gerarId(), tipo: 'suprimento', valorCentavos, motivo: 'Entrada de troco', categoria: 'troco', destino: 'Tesouraria' });
async function vender(s: Sessao, caixaId: string, valor: number) {
  const v = venda(s, { caixaId, totalCentavos: valor,
    itens: [{ id: gerarId(), produtoId: null, descricao: 'Venda do piloto', precoUnitarioCentavos: valor, quantidadeMilesimos: 1000, totalCentavos: valor }],
    pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: valor, trocoCentavos: 0 }] });
  const m = mutacao('venda', v);
  return { id: v.id, resposta: await enviar(amb, s, [m]), mutacaoId: m.id };
}
const apagar = async (s: Sessao, rota: string) => (await amb.app.inject({ method: 'DELETE', url: rota, headers: { authorization: `Bearer ${s.token}` } })).statusCode;
const item = async (s: Sessao, caixaId: string) => ((await get(s, '/caixas')).corpo as any[]).find(i => i.caixa.id === caixaId) as { caixa: Caixa; saldoCentavos: number; auditoria: any[] };
const abertosDe = (operadorId: string) => amb.db.select().from(caixas).where(and(eq(caixas.operadorId, operadorId), isNull(caixas.fechadoEm)));

async function cenario() {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana'), bruno = await funcionario(dono, 'bruno');
  const ana2 = await novoAparelho(ana, 'Segundo aparelho da Ana');
  return { dono, ana, ana2, bruno };
}
/** Turno aberto no aparelho 1 com uma venda de 200 sincronizada: esperado 300. */
async function cenarioComTurno() {
  const c = await cenario();
  const caixa = await abrir(c.ana, 10000);
  expect((await vender(c.ana, caixa.id, 20000)).resposta.corpo.rejeitadas).toEqual([]);
  expect((await item(c.dono, caixa.id)).saldoCentavos).toBe(30000);
  return { ...c, caixa };
}

describe('Piloto F13: dois aparelhos disputando reserva de turno', () => {
  it('F13: reservas simultâneas do mesmo operador em dois aparelhos confirmam só uma, em três rodadas', async () => {
    const { dono } = await cenario();
    for (let rodada = 1; rodada <= 3; rodada++) {
      const a = await funcionario(dono, `rodada${rodada}`), b = await novoAparelho(a, `Aparelho B ${rodada}`);
      const ids = [gerarId(), gerarId(), gerarId(), gerarId()];
      const respostas = await Promise.all([reservar(a, ids[0]!), reservar(b, ids[1]!), reservar(a, ids[2]!), reservar(b, ids[3]!)]);
      const status = respostas.map(r => r.status);
      expect(status.filter(s => s === 200), `rodada ${rodada}: ${status}`).toHaveLength(1);
      expect(status.filter(s => s === 409), `rodada ${rodada}: ${status}`).toHaveLength(3);
      const abertos = await abertosDe(a.operadorId);
      expect(abertos).toHaveLength(1);
      const vencedora = respostas.findIndex(r => r.status === 200);
      expect(abertos[0]!.id).toBe(ids[vencedora]);
      expect(abertos[0]!.aparelhoId).toBe(vencedora % 2 === 0 ? a.aparelhoId : b.aparelhoId);
      expect((await amb.db.select().from(caixas).where(eq(caixas.operadorId, a.operadorId)))).toHaveLength(1);
    }
  });

  it('F13: o 2º aparelho não reserva o turno aberto no 1º, nem outro turno, nem por reservas concorrentes', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    const mesmo = await reservar(ana2, caixa.id, 10000);
    expect([mesmo.status, mesmo.corpo.erro]).toEqual([403, 'proibido']);
    const novo = await reservar(ana2, gerarId(), 0);
    expect([novo.status, novo.corpo.erro]).toEqual([409, 'conflito']);
    const idsNovos = [gerarId(), gerarId()];
    const rodadas = await Promise.all([reservar(ana2, caixa.id, 10000), reservar(ana2, idsNovos[0]!, 0), reservar(ana, idsNovos[1]!, 0), reservar(ana2, caixa.id, 10000)]);
    expect(rodadas.map(r => r.status)).toEqual([403, 409, 409, 403]);
    // O 1º aparelho segue com o turno: repetir a própria reserva é idempotente e devolve o mesmo turno.
    const repetida = await reservar(ana, caixa.id, 10000);
    expect(repetida.status).toBe(200);
    expect(repetida.corpo).toEqual((await item(dono, caixa.id)).caixa);
    const abertos = await abertosDe(ana.operadorId);
    expect(abertos.map(a => a.id)).toEqual([caixa.id]);
    expect(await amb.db.select().from(caixas)).toHaveLength(1);
    expect((await amb.db.select().from(caixas))[0]!.aparelhoId).toBe(ana.aparelhoId);
    const atual = (await item(dono, caixa.id)).caixa;
    expect(atual.aparelhoAtualId).toBe(ana.aparelhoId);
    expect(atual.movimentos).toEqual([]);
    expect(await amb.db.select().from(vendas)).toHaveLength(1);
  });
});

describe('Piloto F13: transferência do turno para outro aparelho', () => {
  it('F13: a transferência exige o consentimento explícito, o aparelho anterior correto e o próprio operador', async () => {
    const { dono, ana, ana2, bruno, caixa } = await cenarioComTurno();
    const bruno2 = await novoAparelho(bruno, 'Segundo aparelho do Bruno');
    const base = { aparelhoAnteriorId: ana.aparelhoId, motivo: 'Troca de aparelho sincronizado' };
    // Sem o consentimento (ausente, falso ou texto) a API recusa na validação.
    expect((await post(ana2, `/caixas/${caixa.id}/aparelho`, base)).status).toBe(400);
    expect((await post(ana2, `/caixas/${caixa.id}/aparelho`, { ...base, confirmarSincronizacaoAnterior: false })).status).toBe(400);
    expect((await post(ana2, `/caixas/${caixa.id}/aparelho`, { ...base, confirmarSincronizacaoAnterior: 'true' })).status).toBe(400);
    expect((await post(ana2, `/caixas/${caixa.id}/aparelho`, { ...base, motivo: '  ', confirmarSincronizacaoAnterior: true })).status).toBe(400);
    // Aparelho anterior que não é o titular atual.
    const errado = await trocar(ana2, caixa.id, gerarId());
    expect([errado.status, errado.corpo.erro]).toEqual([409, 'conflito']);
    // Outra pessoa, mesmo com a identificação certa, e até o dono: o turno é pessoal.
    for (const intruso of [bruno, bruno2, dono]) {
      const r = await trocar(intruso, caixa.id, ana.aparelhoId);
      expect([r.status, r.corpo.erro]).toEqual([403, 'proibido']);
    }
    // Nada mudou: titular, auditoria e quantidade de turnos.
    const depois = await item(dono, caixa.id);
    expect(depois.caixa.aparelhoAtualId).toBe(ana.aparelhoId);
    expect(depois.auditoria).toEqual([]);
    expect(await amb.db.select().from(auditoriaCaixa)).toHaveLength(0);
    expect(await abertosDe(ana.operadorId)).toHaveLength(1);
  });

  it('F13: com consentimento a transferência move o titular, preserva a origem e a auditoria e é idempotente', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    const r = await trocar(ana2, caixa.id, ana.aparelhoId);
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ id: caixa.id, operadorId: ana.operadorId, aparelhoId: ana.aparelhoId, aparelhoAtualId: ana2.aparelhoId, fechamento: null });
    const repetida = await trocar(ana2, caixa.id, ana.aparelhoId);
    expect([repetida.status, repetida.corpo]).toEqual([200, r.corpo]);
    const visto = await item(dono, caixa.id);
    expect(visto.saldoCentavos).toBe(30000);
    expect(visto.auditoria).toHaveLength(1);
    expect(visto.auditoria[0]).toMatchObject({ tipo: 'troca_aparelho', autorOperadorId: ana.operadorId });
    expect(visto.auditoria[0].dados).toMatchObject({ aparelhoAnteriorId: ana.aparelhoId, aparelhoNovoId: ana2.aparelhoId, confirmarSincronizacaoAnterior: true });
    expect(await abertosDe(ana.operadorId)).toHaveLength(1);
    expect(await amb.db.select().from(caixas)).toHaveLength(1);
  });

  it('F13: dois aparelhos pretendendo o mesmo turno ao mesmo tempo: só um vence e só ele escreve', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    const ana3 = await novoAparelho(ana, 'Terceiro aparelho da Ana');
    const [r2, r3] = await Promise.all([trocar(ana2, caixa.id, ana.aparelhoId), trocar(ana3, caixa.id, ana.aparelhoId)]);
    expect([r2.status, r3.status].sort()).toEqual([200, 409]);
    const vencedor = r2.status === 200 ? ana2 : ana3, perdedor = r2.status === 200 ? ana3 : ana2;
    const atual = (await item(dono, caixa.id)).caixa;
    expect(atual.aparelhoAtualId).toBe(vencedor.aparelhoId);
    expect((await item(dono, caixa.id)).auditoria).toHaveLength(1);
    expect((await suprimento(vencedor, caixa.id, 1000)).status).toBe(200);
    for (const quem of [perdedor, ana]) {
      const negado = await suprimento(quem, caixa.id, 1000);
      expect([negado.status, negado.corpo.erro]).toEqual([403, 'proibido']);
    }
    expect((await item(dono, caixa.id)).saldoCentavos).toBe(31000);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(1);
  });

  it('F13: depois da transferência o aparelho antigo não escreve nem reabre o turno, e o novo escreve sem duplicar', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    expect((await trocar(ana2, caixa.id, ana.aparelhoId)).status).toBe(200);
    const antes = await item(dono, caixa.id);
    // Aparelho antigo: rota de movimento, sync de movimento, sync de venda e reservas.
    const movimentoAntigo = await suprimento(ana, caixa.id, 1000);
    expect([movimentoAntigo.status, movimentoAntigo.corpo.erro]).toEqual([403, 'proibido']);
    const doSync = { id: gerarId(), tipo: 'suprimento' as const, valorCentavos: 1000, motivo: 'Entrada offline', criadoEm: INICIO.toISOString(), versaoContrato: 2 as const, autorOperadorId: ana.operadorId, responsavelOperadorId: ana.operadorId, aparelhoId: ana.aparelhoId, categoria: 'troco', destino: 'Tesouraria' };
    const pushMovimento = await enviar(amb, ana, [mutacao('caixa', { ...antes.caixa, movimentos: [doSync] })]);
    expect(pushMovimento.corpo.aceitas).toEqual([]);
    expect(pushMovimento.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['origem_invalida']);
    const vendaAntiga = await vender(ana, caixa.id, 1500);
    expect(vendaAntiga.resposta.corpo.aceitas).toEqual([]);
    expect(vendaAntiga.resposta.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['caixa_invalido']);
    const mesmoId = await reservar(ana, caixa.id, 10000);
    expect([mesmoId.status, mesmoId.corpo.erro]).toEqual([409, 'conflito']);
    const outroId = await reservar(ana, gerarId(), 0);
    expect([outroId.status, outroId.corpo.erro]).toEqual([409, 'conflito']);
    expect(await item(dono, caixa.id)).toEqual(antes);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(0);
    expect(await amb.db.select().from(vendas)).toHaveLength(1);
    expect(await amb.db.select().from(caixas)).toHaveLength(1);
    // Aparelho novo: escreve normalmente e o histórico do antigo continua uma vez só.
    expect((await suprimento(ana2, caixa.id, 3000)).status).toBe(200);
    expect((await vender(ana2, caixa.id, 2500)).resposta.corpo.rejeitadas).toEqual([]);
    const depois = await item(dono, caixa.id);
    expect(depois.saldoCentavos).toBe(10000 + 20000 + 3000 + 2500);
    expect(depois.caixa.movimentos.map(m => [m.valorCentavos, m.aparelhoId])).toEqual([[3000, ana2.aparelhoId]]);
    expect(await amb.db.select().from(vendas)).toHaveLength(2);
    expect(await abertosDe(ana.operadorId)).toHaveLength(1);
  });

  it('F13: o retorno ao aparelho antigo é uma nova transferência consentida e devolve a escrita só a ele', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    expect((await trocar(ana2, caixa.id, ana.aparelhoId)).status).toBe(200);
    expect((await suprimento(ana2, caixa.id, 3000)).status).toBe(200);
    // Voltar exige apontar o titular atual (o aparelho 2) e o consentimento.
    expect((await trocar(ana, caixa.id, ana.aparelhoId)).status).toBe(409);
    expect((await post(ana, `/caixas/${caixa.id}/aparelho`, { aparelhoAnteriorId: ana2.aparelhoId, motivo: 'Voltei ao aparelho antigo' })).status).toBe(400);
    const volta = await trocar(ana, caixa.id, ana2.aparelhoId, { motivo: 'Voltei ao aparelho antigo' });
    expect(volta.status).toBe(200);
    expect(volta.corpo).toMatchObject({ id: caixa.id, aparelhoAtualId: ana.aparelhoId, fechamento: null });
    const negado = await suprimento(ana2, caixa.id, 100);
    expect([negado.status, negado.corpo.erro]).toEqual([403, 'proibido']);
    expect((await suprimento(ana, caixa.id, 500)).status).toBe(200);
    expect((await vender(ana, caixa.id, 1000)).resposta.corpo.rejeitadas).toEqual([]);
    const visto = await item(dono, caixa.id);
    expect(visto.saldoCentavos).toBe(10000 + 20000 + 3000 + 500 + 1000);
    expect(visto.auditoria.map(a => a.tipo)).toEqual(['troca_aparelho', 'troca_aparelho']);
    expect(await abertosDe(ana.operadorId)).toHaveLength(1);
    expect(await amb.db.select().from(caixas)).toHaveLength(1);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(2);
  });

  it('F13: turno encerrado no aparelho novo não é reaberto nem transferido pelo aparelho antigo', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    expect((await trocar(ana2, caixa.id, ana.aparelhoId)).status).toBe(200);
    const atual = await item(dono, caixa.id);
    const fechamento = { em: INICIO.toISOString(), esperadoCentavos: 30000, contadoCentavos: 30000, diferencaCentavos: 0, conferenteId: ana.operadorId, recolhidoCentavos: 25000, trocoRestanteCentavos: 5000 };
    expect((await enviar(amb, ana2, [mutacao('caixa', { ...atual.caixa, fechamento })])).corpo.rejeitadas).toEqual([]);
    const fechado = await item(dono, caixa.id);
    expect(fechado.caixa.fechamento).toMatchObject({ esperadoCentavos: 30000, contadoCentavos: 30000 });
    const voltar = await trocar(ana, caixa.id, ana2.aparelhoId);
    expect([voltar.status, voltar.corpo.erro]).toEqual([409, 'conflito']);
    const reabrir = await reservar(ana, caixa.id, 10000);
    expect([reabrir.status, reabrir.corpo.erro]).toEqual([409, 'conflito']);
    const tentarFechamentoAntigo = await enviar(amb, ana, [mutacao('caixa', { ...fechado.caixa, fechamento: null })]);
    expect(tentarFechamentoAntigo.corpo.aceitas).toEqual([]);
    expect((await suprimento(ana, caixa.id, 100)).status).toBe(403);
    expect(await item(dono, caixa.id)).toEqual(fechado);
    expect(await abertosDe(ana.operadorId)).toHaveLength(0);
    // Fechado, a pessoa pode abrir um turno novo (id novo) em qualquer aparelho.
    const novo = await abrir(ana2, 0);
    expect(novo.id).not.toBe(caixa.id);
    expect(await abertosDe(ana.operadorId)).toHaveLength(1);
  });
});

describe('Piloto F13: revogação de aparelho impede escrita no turno', () => {
  it('F13: revogar o 2º aparelho (que não é titular) bloqueia toda escrita dele e não afeta o turno', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    const antes = await item(dono, caixa.id);
    expect(await apagar(dono, `/aparelhos/${ana2.aparelhoId}`)).toBe(204);
    expect((await get(ana2, '/caixas')).status).toBe(401);
    expect((await reservar(ana2, gerarId(), 0)).status).toBe(401);
    expect((await suprimento(ana2, caixa.id, 100)).status).toBe(401);
    expect((await trocar(ana2, caixa.id, ana.aparelhoId)).status).toBe(401);
    expect((await enviar(amb, ana2, [mutacao('caixa', antes.caixa)])).status).toBe(401);
    expect(await item(dono, caixa.id)).toEqual(antes);
    expect((await suprimento(ana, caixa.id, 100)).status).toBe(200);
    expect(await amb.db.select().from(caixas)).toHaveLength(1);
  });

  it('F13: revogar o aparelho titular bloqueia a escrita dele e o 1º aparelho retoma o turno com consentimento', async () => {
    const { dono, ana, ana2, caixa } = await cenarioComTurno();
    expect((await trocar(ana2, caixa.id, ana.aparelhoId)).status).toBe(200);
    expect((await suprimento(ana2, caixa.id, 3000)).status).toBe(200);
    expect(await apagar(dono, `/aparelhos/${ana2.aparelhoId}`)).toBe(204);
    expect((await suprimento(ana2, caixa.id, 100)).status).toBe(401);
    expect((await vender(ana2, caixa.id, 100)).resposta.status).toBe(401);
    expect((await trocar(ana2, caixa.id, ana2.aparelhoId)).status).toBe(401);
    // Sem o titular, o outro aparelho ainda não escreve até retomar o turno de forma consentida.
    expect((await suprimento(ana, caixa.id, 100)).status).toBe(403);
    const retomada = await trocar(ana, caixa.id, ana2.aparelhoId, { motivo: 'Aparelho anterior revogado pelo dono' });
    expect(retomada.status).toBe(200);
    expect(retomada.corpo.aparelhoAtualId).toBe(ana.aparelhoId);
    expect((await suprimento(ana, caixa.id, 500)).status).toBe(200);
    const visto = await item(dono, caixa.id);
    expect(visto.saldoCentavos).toBe(10000 + 20000 + 3000 + 500);
    expect(await abertosDe(ana.operadorId)).toHaveLength(1);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(2);
  });
});
