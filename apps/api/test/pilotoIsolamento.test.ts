/**
 * Piloto Android, cenário F08 (isolamento entre operadores e entre empresas), espelhando os casos de scripts/homologar-equipe.mts
 * (38/38 por HTTP no CP 147) com IDs reais de turno, venda e movimento.
 *
 * Já existia cobertura parcial em equipe.test.ts (pull da Ana sem dados do Bruno, gerente sem acesso a outra empresa) e em
 * caixaUsuario.test.ts (listagem individual, autoria forjada). Este arquivo acrescenta, nas duas direções (Ana->Bruno e Bruno->Ana):
 * leitura (caixas, pull, relatórios, filtros), escrita (movimento, conferência, troca de aparelho, push de fechamento, cancelamento,
 * venda forjada, venda em turno alheio) e a prova de que o estado financeiro do alvo não mudou; e, para a empresa B, leitura e
 * escrita com IDs reais da empresa A. Afirma status, código de erro e ausência de IDs/valores alheios no corpo.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { gerarId, type Caixa, type Sessao, type Venda } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, caixas, movimentosCaixa, operadores, usuarios, vendas } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, NUMEROS, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

async function funcionario(dono: Sessao, nome: string): Promise<Sessao> {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${nome}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', permissoes: ['vender', 'movimentar_proprio_caixa', 'retirar_dinheiro', 'cancelar_venda'], criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}
const post = (s: Sessao, rota: string, corpo: unknown) => chamar(amb, 'POST', rota, { token: s.token, corpo });
const get = (s: Sessao | null, rota: string) => chamar(amb, 'GET', rota, { token: s?.token });
async function abrir(s: Sessao, trocoInicial: number): Promise<Caixa> {
  const r = await post(s, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: trocoInicial });
  expect(r.status).toBe(200);
  return r.corpo;
}
function vendaDinheiro(s: Sessao, caixaId: string, valor: number, sobrescrever: Partial<Venda> = {}): Venda {
  return venda(s, { caixaId, totalCentavos: valor,
    itens: [{ id: gerarId(), produtoId: null, descricao: 'Venda do piloto', precoUnitarioCentavos: valor, quantidadeMilesimos: 1000, totalCentavos: valor }],
    pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: valor, trocoCentavos: 0 }], ...sobrescrever });
}
async function vender(s: Sessao, caixaId: string, valor: number): Promise<string> {
  const v = vendaDinheiro(s, caixaId, valor);
  const r = await enviar(amb, s, [mutacao('venda', v)]);
  expect(r.corpo.rejeitadas).toEqual([]);
  return v.id;
}
const relatorio = (s: Sessao, extra = '') => get(s, `/relatorios?inicio=2026-03-10T00:00:00.000Z&fim=2026-03-11T00:00:00.000Z${extra}`);
const apagar = async (s: Sessao, rota: string) => {
  const r = await amb.app.inject({ method: 'DELETE', url: rota, headers: { authorization: `Bearer ${s.token}` } });
  return { status: r.statusCode, corpo: r.body ? r.json() : undefined };
};
const motivos = (r: { corpo: any }) => (r.corpo.rejeitadas as { motivo: string }[]).map(x => x.motivo);
const texto = (x: unknown) => JSON.stringify(x);

/** Empresa A: dono, Ana e Bruno (turno aberto, uma venda em dinheiro e, para Ana, um suprimento). Empresa B: outra conta. */
async function cenario() {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana'), bruno = await funcionario(dono, 'bruno');
  const empresaB = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
  const caixaAna = await abrir(ana, 10000), vendaAna = await vender(ana, caixaAna.id, 20000);
  const suprimento = { id: gerarId(), tipo: 'suprimento', valorCentavos: 5000, motivo: 'Troco da Ana', categoria: 'troco', destino: 'Tesouraria' };
  expect((await post(ana, `/caixas/${caixaAna.id}/movimentos`, suprimento)).status).toBe(200);
  const caixaBruno = await abrir(bruno, 6000), vendaBruno = await vender(bruno, caixaBruno.id, 4000);
  const pessoas = {
    ana: { s: ana, caixa: caixaAna, vendaId: vendaAna, movimentoIds: [suprimento.id], venda: 20000 },
    bruno: { s: bruno, caixa: caixaBruno, vendaId: vendaBruno, movimentoIds: [] as string[], venda: 4000 },
  };
  return { dono, ana, bruno, empresaB, pessoas };
}
type Pessoa = Awaited<ReturnType<typeof cenario>>['pessoas']['ana'];
const idsDe = (p: Pessoa) => [p.s.operadorId, p.caixa.id, p.vendaId, ...p.movimentoIds];
const estadoDoDono = async (dono: Sessao) => ({
  painel: texto((await get(dono, '/caixas')).corpo),
  movimentos: (await amb.db.select().from(movimentosCaixa)).length,
  vendas: (await amb.db.select().from(vendas)).length,
  caixas: (await amb.db.select().from(caixas)).length,
});

describe('Piloto F08: operador contra o turno de outro operador da mesma loja', () => {
  it.each([['ana', 'bruno'], ['bruno', 'ana']] as const)('F08: %s lista, baixa e relata somente o que é dela, sem dados de %s', async (euNome, alheioNome) => {
    const { dono, pessoas } = await cenario();
    const eu = pessoas[euNome], alheio = pessoas[alheioNome];
    // Controle positivo: o dono vê os dois turnos.
    expect(((await get(dono, '/caixas')).corpo as any[]).map(i => i.caixa.id).sort()).toEqual([eu.caixa.id, alheio.caixa.id].sort());

    const lista = await get(eu.s, '/caixas');
    expect(lista.status).toBe(200);
    expect((lista.corpo as any[]).map(i => i.caixa.id)).toEqual([eu.caixa.id]);
    expect((lista.corpo as any[]).every(i => i.caixa.operadorId === eu.s.operadorId)).toBe(true);
    for (const id of idsDe(alheio)) expect(texto(lista.corpo)).not.toContain(id);

    const pull = await get(eu.s, '/sync/pull?desde=0');
    expect(pull.status).toBe(200);
    const financeiras = (pull.corpo.mudancas as any[]).filter(m => m.entidade === 'caixa' || m.entidade === 'venda');
    expect(financeiras.map(m => m.dados.id).sort()).toEqual([eu.caixa.id, eu.vendaId].sort());
    expect(financeiras.every(m => m.dados.operadorId === eu.s.operadorId)).toBe(true);
    for (const id of idsDe(alheio)) expect(texto(pull.corpo)).not.toContain(id);

    const rel = await relatorio(eu.s);
    expect(rel.status).toBe(200);
    expect(rel.corpo.totais.venda).toBe(eu.venda);
    expect(rel.corpo.linhas.length).toBeGreaterThan(0);
    expect(rel.corpo.linhas.every((l: any) => l.operadorId === eu.s.operadorId)).toBe(true);
    for (const id of idsDe(alheio)) expect(texto(rel.corpo)).not.toContain(id);

    const filtros = await get(eu.s, '/relatorios/filtros');
    expect(filtros.status).toBe(200);
    expect(filtros.corpo.usuarios.map((u: any) => u.id)).toEqual([eu.s.operadorId]);
    expect(filtros.corpo.turnos.map((t: any) => t.id)).toEqual([eu.caixa.id]);
    for (const id of idsDe(alheio)) expect(texto(filtros.corpo)).not.toContain(id);

    // Filtros dirigidos ao alheio: recusa por autorização, ou resposta vazia quando só estreitam o escopo próprio.
    const porOperador = await relatorio(eu.s, `&operadorId=${alheio.s.operadorId}`);
    expect([porOperador.status, porOperador.corpo.erro]).toEqual([403, 'permissao_negada']);
    const todas = await relatorio(eu.s, '&lojaId=todas');
    expect([todas.status, todas.corpo.erro]).toEqual([403, 'permissao_negada']);
    const porTurno = await relatorio(eu.s, `&caixaId=${alheio.caixa.id}`);
    expect(porTurno.status).toBe(200);
    expect(porTurno.corpo.linhas).toEqual([]);
    expect(Object.values(porTurno.corpo.totais).every(v => v === 0)).toBe(true);
  });

  it.each([['bruno', 'ana'], ['ana', 'bruno']] as const)('F08: %s não registra movimento, conferência nem troca de aparelho no turno de %s', async (euNome, alheioNome) => {
    const { dono, pessoas } = await cenario();
    const eu = pessoas[euNome], alheio = pessoas[alheioNome];
    const antes = await estadoDoDono(dono);
    const movimento = { id: gerarId(), tipo: 'suprimento', valorCentavos: 1, motivo: 'Tentativa indevida', categoria: 'teste', destino: 'gaveta' };
    const mov = await post(eu.s, `/caixas/${alheio.caixa.id}/movimentos`, movimento);
    expect([mov.status, mov.corpo.erro]).toEqual([403, 'proibido']);
    const saida = await post(eu.s, `/caixas/${alheio.caixa.id}/movimentos`, { ...movimento, id: gerarId(), tipo: 'sangria', valorCentavos: 100 });
    expect([saida.status, saida.corpo.erro]).toEqual([403, 'proibido']);
    const conferir = await post(eu.s, `/caixas/${alheio.caixa.id}/conferir`, { id: gerarId(), motivo: 'Tentativa indevida' });
    expect([conferir.status, conferir.corpo.erro]).toEqual([403, 'proibido']);
    const troca = await post(eu.s, `/caixas/${alheio.caixa.id}/aparelho`, { aparelhoAnteriorId: alheio.s.aparelhoId, motivo: 'Tentativa indevida', confirmarSincronizacaoAnterior: true });
    expect([troca.status, troca.corpo.erro]).toEqual([403, 'proibido']);
    // Nada do que foi recusado vaza no corpo de erro.
    for (const r of [mov, saida, conferir, troca]) for (const id of idsDe(alheio)) expect(texto(r.corpo)).not.toContain(id);
    expect(await estadoDoDono(dono)).toEqual(antes);
  });

  it.each([['bruno', 'ana'], ['ana', 'bruno']] as const)('F08: %s não fecha, cancela nem lança venda no turno de %s pelo sync', async (euNome, alheioNome) => {
    const { dono, pessoas } = await cenario();
    const eu = pessoas[euNome], alheio = pessoas[alheioNome];
    const antes = await estadoDoDono(dono);
    const original = ((await get(dono, '/caixas')).corpo as any[]).find(i => i.caixa.id === alheio.caixa.id).caixa as Caixa;
    const saldo = ((await get(dono, '/caixas')).corpo as any[]).find(i => i.caixa.id === alheio.caixa.id).saldoCentavos as number;
    const fechamento = { em: INICIO.toISOString(), esperadoCentavos: saldo, contadoCentavos: saldo, diferencaCentavos: 0, conferenteId: eu.s.operadorId, recolhidoCentavos: saldo, trocoRestanteCentavos: 0 };
    const vendaAlheia = ((await get(dono, '/sync/pull?desde=0')).corpo.mudancas as any[]).find(m => m.entidade === 'venda' && m.dados.id === alheio.vendaId).dados as Venda;
    const fechar = await enviar(amb, eu.s, [mutacao('caixa', { ...original, fechamento })]);
    expect(fechar.status).toBe(200);
    expect(fechar.corpo.aceitas).toEqual([]);
    expect(['permissao_negada', 'origem_invalida']).toContain(motivos(fechar)[0]);
    const cancelar = await enviar(amb, eu.s, [mutacao('venda', { ...vendaAlheia, status: 'cancelada' })]);
    expect(cancelar.corpo.aceitas).toEqual([]);
    expect(motivos(cancelar)).toEqual(['permissao_negada']);
    const forjada = await enviar(amb, eu.s, [mutacao('venda', vendaDinheiro(alheio.s, alheio.caixa.id, 777))]);
    expect(forjada.corpo.aceitas).toEqual([]);
    expect(motivos(forjada)).toEqual(['origem_invalida']);
    const emTurnoAlheio = await enviar(amb, eu.s, [mutacao('venda', vendaDinheiro(eu.s, alheio.caixa.id, 777))]);
    expect(emTurnoAlheio.corpo.aceitas).toEqual([]);
    expect(motivos(emTurnoAlheio)).toEqual(['caixa_invalido']);
    const comMovimento = await enviar(amb, eu.s, [mutacao('caixa', { ...original, movimentos: [...original.movimentos, { id: gerarId(), tipo: 'sangria', valorCentavos: 100, motivo: 'Tentativa indevida', criadoEm: INICIO.toISOString(), versaoContrato: 2, autorOperadorId: eu.s.operadorId, responsavelOperadorId: alheio.s.operadorId, aparelhoId: eu.s.aparelhoId, categoria: 'teste', destino: 'gaveta' }] })]);
    expect(comMovimento.corpo.aceitas).toEqual([]);
    expect(['permissao_negada', 'origem_invalida']).toContain(motivos(comMovimento)[0]);
    expect(await estadoDoDono(dono)).toEqual(antes);
    expect(((await get(dono, '/caixas')).corpo as any[]).find(i => i.caixa.id === alheio.caixa.id).saldoCentavos).toBe(saldo);
  });

  it('F08: sem token ou com token inválido nenhuma rota financeira responde', async () => {
    const { pessoas } = await cenario();
    const ruim = { ...pessoas.ana.s, token: 'x'.repeat(43) };
    for (const quem of [null, ruim]) {
      for (const rota of ['/caixas', '/sync/pull?desde=0', '/relatorios?inicio=2026-03-10T00:00:00.000Z&fim=2026-03-11T00:00:00.000Z', '/relatorios/filtros']) {
        const r = await get(quem, rota);
        expect(r.status, rota).toBe(401);
        expect(texto(r.corpo)).not.toContain(pessoas.ana.caixa.id);
      }
      expect((await chamar(amb, 'POST', `/caixas/${pessoas.ana.caixa.id}/movimentos`, { token: quem?.token, corpo: { id: gerarId(), tipo: 'suprimento', valorCentavos: 1, motivo: 'x', categoria: 'x', destino: 'x' } })).status).toBe(401);
    }
  });
});

describe('Piloto F08: empresa B contra a empresa A', () => {
  it('F08: B não lê turnos, vendas, movimentos, equipe, aparelhos nem relatórios de A, e A não lê os de B', async () => {
    const { dono, empresaB, pessoas } = await cenario();
    const idsA = [dono.contaId, dono.lojaId, dono.operadorId, dono.aparelhoId, ...idsDe(pessoas.ana), ...idsDe(pessoas.bruno), pessoas.ana.s.aparelhoId, pessoas.bruno.s.aparelhoId];
    const semA = (x: unknown) => { for (const id of idsA) expect(texto(x)).not.toContain(id); };
    // B começa vazia e depois ganha um turno e uma venda próprios (controle positivo de que as respostas não são vazias por acaso).
    expect(((await get(empresaB, '/caixas')).corpo as any[])).toEqual([]);
    const caixaB = await abrir(empresaB, 3000), vendaB = await vender(empresaB, caixaB.id, 1234);

    const lista = await get(empresaB, '/caixas');
    expect([lista.status, (lista.corpo as any[]).map(i => i.caixa.id)]).toEqual([200, [caixaB.id]]);
    semA(lista.corpo);
    const pull = await get(empresaB, '/sync/pull?desde=0');
    expect(pull.status).toBe(200);
    expect((pull.corpo.mudancas as any[]).filter(m => m.entidade === 'venda').map(m => m.dados.id)).toEqual([vendaB]);
    semA(pull.corpo);
    const rel = await relatorio(empresaB);
    expect(rel.status).toBe(200);
    expect(rel.corpo.totais.venda).toBe(1234);
    semA(rel.corpo);
    const relTodas = await relatorio(empresaB, '&lojaId=todas');
    expect(relTodas.status).toBe(200);
    expect(relTodas.corpo.totais.venda).toBe(1234);
    semA(relTodas.corpo);
    const relA = await relatorio(empresaB, `&lojaId=${dono.lojaId}`);
    expect([relA.status, relA.corpo.erro]).toEqual([403, 'permissao_negada']);
    semA(relA.corpo);
    const relTurnoA = await relatorio(empresaB, `&caixaId=${pessoas.ana.caixa.id}`);
    expect(relTurnoA.status).toBe(200);
    expect(relTurnoA.corpo.linhas).toEqual([]);
    const relOperadorA = await relatorio(empresaB, `&operadorId=${pessoas.ana.s.operadorId}`);
    expect(relOperadorA.status).toBe(200);
    expect(relOperadorA.corpo.linhas).toEqual([]);
    const filtros = await get(empresaB, '/relatorios/filtros');
    expect(filtros.corpo.lojas.map((l: any) => l.id)).toEqual([empresaB.lojaId]);
    expect(filtros.corpo.turnos.map((t: any) => t.id)).toEqual([caixaB.id]);
    semA(filtros.corpo);
    const lojas = await get(empresaB, '/lojas');
    expect((lojas.corpo as any[]).map(l => l.id)).toEqual([empresaB.lojaId]);
    for (const rota of ['/equipe', '/aparelhos']) {
      const r = await get(empresaB, rota);
      expect(r.status, rota).toBe(200);
      semA(r.corpo);
    }
    // Direção inversa: o dono de A só vê A.
    const doDonoA = await get(dono, '/caixas');
    expect((doDonoA.corpo as any[]).map(i => i.caixa.id).sort()).toEqual([pessoas.ana.caixa.id, pessoas.bruno.caixa.id].sort());
    const relDonoA = await relatorio(dono, '&lojaId=todas');
    expect(relDonoA.corpo.totais.venda).toBe(24000);
    for (const id of [empresaB.contaId, empresaB.lojaId, empresaB.operadorId, caixaB.id, vendaB]) {
      expect(texto(doDonoA.corpo)).not.toContain(id);
      expect(texto(relDonoA.corpo)).not.toContain(id);
      expect(texto((await get(dono, '/sync/pull?desde=0')).corpo)).not.toContain(id);
    }
    const doBPeloDonoA = await relatorio(dono, `&lojaId=${empresaB.lojaId}`);
    expect([doBPeloDonoA.status, doBPeloDonoA.corpo.erro]).toEqual([403, 'permissao_negada']);
    const movimentoEmB = await post(dono, `/caixas/${caixaB.id}/movimentos`, { id: gerarId(), tipo: 'suprimento', valorCentavos: 1, motivo: 'Tentativa indevida', categoria: 'teste', destino: 'gaveta' });
    expect([movimentoEmB.status, movimentoEmB.corpo.erro]).toEqual([404, 'nao_encontrado']);
  });

  it('F08: B não escreve em turnos, vendas, equipe nem aparelhos de A, e o estado de A permanece idêntico', async () => {
    const { dono, empresaB, pessoas } = await cenario();
    const caixaB = await abrir(empresaB, 1000);
    const antes = await estadoDoDono(dono);
    const ana = pessoas.ana;
    const original = ((await get(dono, '/caixas')).corpo as any[]).find(i => i.caixa.id === ana.caixa.id).caixa as Caixa;
    const vendaA = ((await get(dono, '/sync/pull?desde=0')).corpo.mudancas as any[]).find(m => m.entidade === 'venda' && m.dados.id === ana.vendaId).dados as Venda;
    const recusado = (r: { status: number; corpo: any }, status: number, erro: string) => expect([r.status, r.corpo.erro]).toEqual([status, erro]);
    const movimento = { id: gerarId(), tipo: 'suprimento', valorCentavos: 1, motivo: 'Tentativa indevida', categoria: 'teste', destino: 'gaveta' };

    recusado(await post(empresaB, `/caixas/${ana.caixa.id}/movimentos`, movimento), 404, 'nao_encontrado');
    recusado(await post(empresaB, `/caixas/${ana.caixa.id}/conferir`, { id: gerarId(), motivo: 'Tentativa indevida' }), 404, 'nao_encontrado');
    recusado(await post(empresaB, `/caixas/${ana.caixa.id}/aparelho`, { aparelhoAnteriorId: ana.s.aparelhoId, motivo: 'Tentativa indevida', confirmarSincronizacaoAnterior: true }), 404, 'nao_encontrado');
    recusado(await post(empresaB, '/caixas/reservar', { id: ana.caixa.id, trocoInicialCentavos: 10000 }), 403, 'proibido');
    const autorizar = await post(empresaB, '/caixas/transferencias/autorizar', { id: gerarId(), origemId: ana.caixa.id, destinoId: caixaB.id, valorCentavos: 100, motivo: 'Tentativa indevida' });
    expect([autorizar.status, autorizar.corpo.erro]).toEqual([404, 'nao_encontrado']);
    const executar = await post(empresaB, '/caixas/transferencias/executar', { autorizacaoId: gerarId() });
    expect(executar.status).toBe(409);

    const fechamento = { em: INICIO.toISOString(), esperadoCentavos: 0, contadoCentavos: 0, diferencaCentavos: 0, conferenteId: empresaB.operadorId, recolhidoCentavos: 0, trocoRestanteCentavos: 0 };
    const pushFechamento = await enviar(amb, empresaB, [mutacao('caixa', { ...original, fechamento })]);
    expect(pushFechamento.corpo.aceitas).toEqual([]);
    expect(motivos(pushFechamento)).toEqual(['loja_invalida']);
    const pushVenda = await enviar(amb, empresaB, [mutacao('venda', vendaDinheiro(empresaB, ana.caixa.id, 1, { lojaId: pessoas.ana.s.lojaId }))]);
    expect(pushVenda.corpo.aceitas).toEqual([]);
    expect(motivos(pushVenda)).toEqual(['loja_invalida']);
    const pushCancelamento = await enviar(amb, empresaB, [mutacao('venda', { ...vendaA, status: 'cancelada' })]);
    expect(pushCancelamento.corpo.aceitas).toEqual([]);
    expect(motivos(pushCancelamento)).toEqual(['loja_invalida']);
    // Mesmo id da venda de A, mas declarando a loja de B: o id existente pertence a A e continua protegido.
    const pushColisao = await enviar(amb, empresaB, [mutacao('venda', { ...vendaA, lojaId: empresaB.lojaId, aparelhoId: empresaB.aparelhoId, operadorId: empresaB.operadorId, caixaId: caixaB.id, status: 'cancelada' })]);
    expect(pushColisao.corpo.aceitas).toEqual([]);
    expect(motivos(pushColisao)).toEqual(['loja_invalida']);

    recusado(await chamar(amb, 'PUT', `/equipe/${ana.s.operadorId}`, { token: empresaB.token, corpo: { estado: 'suspenso' } }), 404, 'vinculo_nao_encontrado');
    expect((await apagar(empresaB, `/aparelhos/${ana.s.aparelhoId}`)).status).toBe(404);
    expect((await apagar(empresaB, `/aparelhos/${dono.aparelhoId}`)).status).toBe(404);

    // A continua operando normalmente, com os mesmos números.
    expect(await estadoDoDono(dono)).toEqual(antes);
    expect(((await get(ana.s, '/caixas')).corpo as any[])[0].saldoCentavos).toBe(35000); // 10000 + 20000 + 5000
    expect((await get(dono, '/conta')).status).toBe(200);
    expect((await get(ana.s, '/conta')).status).toBe(200);
    expect((await post(ana.s, `/caixas/${ana.caixa.id}/movimentos`, { ...movimento, valorCentavos: 100 })).status).toBe(200);
  });
});
