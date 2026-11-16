/**
 * Piloto Android, cenários F05, F06 e F07 (docs/roteiro-piloto-android.md), repetidos na API com os mesmos valores do CP 147.
 *
 * Já existia cobertura parcial em caixaUsuario.test.ts (reserva idempotente + saldos de Ana e Bruno 25000/10000, fechamento
 * básico, conferência) e syncPagamentosManuais.test.ts (meios manuais). Este arquivo acrescenta o que faltava: o fluxo F05 -> F06 -> F07
 * ponta a ponta, o total comercial (230) separado da gaveta (250), diferenças -5/0 persistidas, autoria por registro, recusa de
 * fechamento que desconta o recolhimento duas vezes e consolidado comercial/esperado/contado.
 * Todos os valores estão em centavos.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, type Caixa, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, caixas, movimentosCaixa, operadores, usuarios } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

/** Operador com vender + caixa próprio + saídas, em aparelho próprio (mesmo desenho do piloto: "Fazer sangria no próprio caixa"). */
async function funcionario(dono: Sessao, nome: string): Promise<Sessao> {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${nome}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', permissoes: ['vender', 'movimentar_proprio_caixa', 'retirar_dinheiro'], criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}
const post = (s: Sessao, rota: string, corpo: unknown) => chamar(amb, 'POST', rota, { token: s.token, corpo });
async function abrir(s: Sessao, trocoInicial: number): Promise<Caixa> {
  const r = await post(s, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: trocoInicial });
  expect(r.status).toBe(200);
  return r.corpo;
}
const vendaDe = (s: Sessao, caixaId: string, valor: number, meio: 'dinheiro' | 'pix' | 'cartao_credito') => venda(s, {
  caixaId, totalCentavos: valor,
  itens: [{ id: gerarId(), produtoId: null, descricao: 'Venda do piloto', precoUnitarioCentavos: valor, quantidadeMilesimos: 1000, totalCentavos: valor }],
  pagamentos: [{ id: gerarId(), meio, provedor: null, valorCentavos: valor, trocoCentavos: 0 }],
});
async function vender(s: Sessao, caixaId: string, valor: number, meio: 'dinheiro' | 'pix' | 'cartao_credito') {
  const m = mutacao('venda', vendaDe(s, caixaId, valor, meio));
  const r = await enviar(amb, s, [m]);
  expect(r.corpo.rejeitadas).toEqual([]);
  expect(r.corpo.aceitas).toEqual([m.id]);
}
const movimentar = (s: Sessao, caixaId: string, tipo: 'suprimento' | 'sangria' | 'retirada', valorCentavos: number) => {
  const corpo = { id: gerarId(), tipo, valorCentavos, motivo: `Piloto: ${tipo}`, categoria: 'piloto', destino: 'Cofre da loja' };
  return post(s, `/caixas/${caixaId}/movimentos`, corpo).then(r => ({ ...r, corpo: r.corpo as Caixa, req: corpo }));
};
const painel = async (s: Sessao) => (await chamar(amb, 'GET', '/caixas', { token: s.token })).corpo as { caixa: Caixa; saldoCentavos: number; auditoria: any[] }[];
const itemDo = async (s: Sessao, caixaId: string) => (await painel(s)).find(i => i.caixa.id === caixaId)!;
const relatorio = async (s: Sessao, extra = '') =>
  (await chamar(amb, 'GET', `/relatorios?inicio=2026-03-10T00:00:00.000Z&fim=2026-03-11T00:00:00.000Z${extra}`, { token: s.token })).corpo as { totais: Record<string, number>; linhas: any[] };

/** F05: Ana abre 100, vende 200 em dinheiro, entrada 50, sangria 80, retirada 20; Bruno abre 60 e vende 40. */
async function cenarioF05() {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono, 'ana'), bruno = await funcionario(dono, 'bruno');
  const caixaAna = await abrir(ana, 10000), caixaBruno = await abrir(bruno, 6000);
  await vender(ana, caixaAna.id, 20000, 'dinheiro');
  await vender(bruno, caixaBruno.id, 4000, 'dinheiro');
  const entrada = await movimentar(ana, caixaAna.id, 'suprimento', 5000);
  const sangria = await movimentar(ana, caixaAna.id, 'sangria', 8000);
  const retirada = await movimentar(ana, caixaAna.id, 'retirada', 2000);
  for (const m of [entrada, sangria, retirada]) expect(m.status).toBe(200);
  return { dono, ana, bruno, caixaAna, caixaBruno, movimentos: [entrada, sangria, retirada] };
}
/** F06: Ana vende 10 em Pix manual e 20 em cartão manual. */
async function cenarioF06() {
  const c = await cenarioF05();
  await vender(c.ana, c.caixaAna.id, 1000, 'pix');
  await vender(c.ana, c.caixaAna.id, 2000, 'cartao_credito');
  return c;
}

describe('Piloto F05: valores de caixa de Ana e Bruno', () => {
  it('F05: esperado da Ana é 25000 com entrada, sangria e retirada, e o do Bruno é 10000', async () => {
    const { dono, ana, bruno, caixaAna, caixaBruno } = await cenarioF05();
    const doDono = await painel(dono);
    expect(doDono).toHaveLength(2);
    expect(doDono.find(i => i.caixa.id === caixaAna.id)!.saldoCentavos).toBe(25000); // 10000 + 20000 + 5000 - 8000 - 2000
    expect(doDono.find(i => i.caixa.id === caixaBruno.id)!.saldoCentavos).toBe(10000); // 6000 + 4000
    expect((await itemDo(ana, caixaAna.id)).saldoCentavos).toBe(25000);
    expect((await itemDo(bruno, caixaBruno.id)).saldoCentavos).toBe(10000);
  });

  it('F05: cada movimento gera exatamente um evento, com tipo, valor e autoria de quem operou', async () => {
    const { dono, ana, bruno, caixaAna, caixaBruno, movimentos } = await cenarioF05();
    const linhas = await amb.db.select().from(movimentosCaixa);
    expect(linhas).toHaveLength(3);
    expect(linhas.every(l => l.caixaId === caixaAna.id)).toBe(true);
    expect(linhas.map(l => [l.tipo, l.valorCentavos]).sort()).toEqual([['retirada', 2000], ['sangria', 8000], ['suprimento', 5000]]);
    const doCaixa = (await itemDo(dono, caixaAna.id)).caixa;
    expect(doCaixa.movimentos.map(m => [m.tipo, m.valorCentavos])).toEqual([['suprimento', 5000], ['sangria', 8000], ['retirada', 2000]]);
    for (const m of doCaixa.movimentos) {
      expect(m).toMatchObject({ autorOperadorId: ana.operadorId, responsavelOperadorId: ana.operadorId, aparelhoId: ana.aparelhoId, versaoContrato: 2 });
      expect(m.aprovadorId).toBeUndefined();
    }
    expect(doCaixa.movimentos.map(m => m.id)).toEqual(movimentos.map(m => m.req.id));
    expect(doCaixa.operadorId).toBe(ana.operadorId);
    expect((await itemDo(dono, caixaBruno.id)).caixa).toMatchObject({ operadorId: bruno.operadorId, movimentos: [] });
  });

  it('F05: repetir o mesmo movimento (resposta perdida ou reenvio do caixa inteiro) não conta duas vezes', async () => {
    const { dono, ana, caixaAna, movimentos } = await cenarioF05();
    for (const m of movimentos) {
      const repetido = await post(ana, `/caixas/${caixaAna.id}/movimentos`, m.req);
      expect(repetido.status).toBe(200);
    }
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
    expect((await itemDo(dono, caixaAna.id)).saldoCentavos).toBe(25000);
    // O mesmo identificador com valor diferente é recusado, sem alterar o evento original.
    const adulterado = await post(ana, `/caixas/${caixaAna.id}/movimentos`, { ...movimentos[1]!.req, valorCentavos: 1 });
    expect(adulterado.status).toBe(409);
    // Reenvio do turno pelo sync, com os mesmos movimentos já confirmados.
    const copia = (await itemDo(ana, caixaAna.id)).caixa;
    expect((await enviar(amb, ana, [mutacao('caixa', copia)])).corpo.rejeitadas).toEqual([]);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
    expect((await itemDo(dono, caixaAna.id)).saldoCentavos).toBe(25000);
    // O relatório do dono também conta cada saída uma única vez.
    const r = await relatorio(dono);
    expect(r.totais).toMatchObject({ suprimento: 5000, sangria: 8000, retirada: 2000 });
    const ids = r.linhas.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Piloto F06: Pix e cartão manuais não entram na gaveta', () => {
  it('F06: total comercial da Ana é 23000 e a gaveta continua em 25000', async () => {
    const { dono, ana, caixaAna } = await cenarioF06();
    const rAna = await relatorio(dono, `&operadorId=${ana.operadorId}`);
    expect(rAna.totais.venda).toBe(23000); // 20000 dinheiro + 1000 Pix + 2000 cartão
    expect(rAna.totais.recebimento_venda).toBe(23000);
    expect((await relatorio(dono, `&operadorId=${ana.operadorId}&meio=pix`)).totais.venda).toBe(1000);
    expect((await relatorio(dono, `&operadorId=${ana.operadorId}&meio=cartao_credito`)).totais.venda).toBe(2000);
    expect((await relatorio(dono, `&operadorId=${ana.operadorId}&meio=dinheiro`)).totais.venda).toBe(20000);
    expect((await itemDo(dono, caixaAna.id)).saldoCentavos).toBe(25000);
    expect((await itemDo(ana, caixaAna.id)).saldoCentavos).toBe(25000);
  });

  it('F06: Pix e cartão manuais não geram movimento de gaveta e não alteram o caixa do Bruno', async () => {
    const { dono, caixaBruno } = await cenarioF06();
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
    expect((await itemDo(dono, caixaBruno.id)).saldoCentavos).toBe(10000);
    // Consolidado comercial até aqui: Ana 230 + Bruno 40.
    expect((await relatorio(dono)).totais.venda).toBe(27000);
  });
});

describe('Piloto F07: fechamento, diferenças e autoria', () => {
  const fechamentoAna = (ana: Sessao, sobrescrever: Record<string, unknown> = {}) => ({
    em: INICIO.toISOString(), esperadoCentavos: 25000, contadoCentavos: 24500, diferencaCentavos: -500, conferenteId: ana.operadorId,
    recolhidoCentavos: 19500, trocoRestanteCentavos: 5000, ...sobrescrever,
  });
  const fechamentoBruno = (bruno: Sessao) => ({
    em: INICIO.toISOString(), esperadoCentavos: 10000, contadoCentavos: 10000, diferencaCentavos: 0, conferenteId: bruno.operadorId,
    recolhidoCentavos: 4000, trocoRestanteCentavos: 6000,
  });
  async function fechar(s: Sessao, caixaId: string, fechamento: Record<string, unknown>) {
    const atual = (await itemDo(s, caixaId)).caixa;
    return enviar(amb, s, [mutacao('caixa', { ...atual, fechamento } as Caixa)]);
  }

  it('F07: fechar Ana contando 24500 dá diferença -500 e Bruno contando 10000 dá 0, persistidas no banco', async () => {
    const { dono, ana, bruno, caixaAna, caixaBruno } = await cenarioF06();
    expect((await fechar(ana, caixaAna.id, fechamentoAna(ana))).corpo.rejeitadas).toEqual([]);
    expect((await fechar(bruno, caixaBruno.id, fechamentoBruno(bruno))).corpo.rejeitadas).toEqual([]);
    const a = await itemDo(dono, caixaAna.id), b = await itemDo(dono, caixaBruno.id);
    expect(a.caixa.fechamento).toMatchObject({ esperadoCentavos: 25000, contadoCentavos: 24500, diferencaCentavos: -500, conferenteId: ana.operadorId });
    expect(b.caixa.fechamento).toMatchObject({ esperadoCentavos: 10000, contadoCentavos: 10000, diferencaCentavos: 0, conferenteId: bruno.operadorId });
    const [linhaAna] = await amb.db.select().from(caixas).where(eq(caixas.id, caixaAna.id));
    const [linhaBruno] = await amb.db.select().from(caixas).where(eq(caixas.id, caixaBruno.id));
    expect([linhaAna!.esperadoCentavos, linhaAna!.contadoCentavos]).toEqual([25000, 24500]);
    expect([linhaBruno!.esperadoCentavos, linhaBruno!.contadoCentavos]).toEqual([10000, 10000]);
    // Reenviar o mesmo fechamento é idempotente.
    expect((await fechar(ana, caixaAna.id, fechamentoAna(ana))).corpo.rejeitadas).toEqual([]);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
  });

  it('F07: recolhimento e troco da saída final não alteram esperado nem diferença, e não são descontados duas vezes', async () => {
    const { dono, ana, caixaAna } = await cenarioF06();
    // Esperado descontando o recolhido (25000 - 19500): é contar a saída final duas vezes.
    const descontado = await fechar(ana, caixaAna.id, fechamentoAna(ana, { esperadoCentavos: 5500, diferencaCentavos: 24500 - 5500 }));
    expect(descontado.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['fechamento_inconsistente']);
    // Recolhido + troco precisa fechar com o contado.
    const soma = await fechar(ana, caixaAna.id, fechamentoAna(ana, { recolhidoCentavos: 19500, trocoRestanteCentavos: 4000 }));
    expect(soma.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['fechamento_inconsistente']);
    // Diferença que não corresponde a contado - esperado.
    const diferenca = await fechar(ana, caixaAna.id, fechamentoAna(ana, { diferencaCentavos: 0 }));
    expect(diferenca.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['fechamento_inconsistente']);
    // Conferente diferente de quem fecha.
    const conferente = await fechar(ana, caixaAna.id, fechamentoAna(ana, { conferenteId: dono.operadorId }));
    expect(conferente.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['fechamento_inconsistente']);
    const aindaAberto = await itemDo(dono, caixaAna.id);
    expect(aindaAberto.caixa.fechamento).toBeNull();
    expect(aindaAberto.saldoCentavos).toBe(25000);
    // Outra divisão da saída final (tudo recolhido, sem troco) mantém esperado e diferença.
    expect((await fechar(ana, caixaAna.id, fechamentoAna(ana, { recolhidoCentavos: 24500, trocoRestanteCentavos: 0 }))).corpo.rejeitadas).toEqual([]);
    const fechado = await itemDo(dono, caixaAna.id);
    expect(fechado.saldoCentavos).toBe(25000);
    expect(fechado.caixa.fechamento).toMatchObject({ esperadoCentavos: 25000, diferencaCentavos: -500, recolhidoCentavos: 24500, trocoRestanteCentavos: 0 });
  });

  it('F07: turno fechado é imutável, mas a conferência do dono acrescenta auditoria sem trocar o conferente do fechamento', async () => {
    const { dono, ana, caixaAna } = await cenarioF06();
    expect((await fechar(ana, caixaAna.id, fechamentoAna(ana))).corpo.rejeitadas).toEqual([]);
    const antes = (await itemDo(dono, caixaAna.id)).caixa;
    // Nem novo movimento nem novo fechamento depois de encerrado.
    expect((await movimentar(ana, caixaAna.id, 'suprimento', 100)).status).toBe(409);
    const outro = await enviar(amb, ana, [mutacao('caixa', { ...antes, fechamento: { ...antes.fechamento!, contadoCentavos: 25000, diferencaCentavos: 0, recolhidoCentavos: 20000 } })]);
    expect(outro.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['caixa_fechada']);
    expect((await itemDo(dono, caixaAna.id)).caixa).toEqual(antes);
    // A operadora não confere o próprio turno; o dono confere com autoria própria.
    const req = { id: gerarId(), motivo: 'Conferi o dinheiro contado' };
    expect((await post(ana, `/caixas/${caixaAna.id}/conferir`, req)).status).toBe(403);
    expect((await post(dono, `/caixas/${caixaAna.id}/conferir`, req)).status).toBe(200);
    expect((await post(dono, `/caixas/${caixaAna.id}/conferir`, req)).status).toBe(200);
    const depois = await itemDo(dono, caixaAna.id);
    expect(depois.caixa).toEqual(antes);
    expect(depois.caixa.fechamento!.conferenteId).toBe(ana.operadorId);
    expect(depois.auditoria.filter(a => a.tipo === 'conferencia')).toHaveLength(1);
    expect(depois.auditoria.find(a => a.tipo === 'conferencia')).toMatchObject({ autorOperadorId: dono.operadorId });
    for (const m of depois.caixa.movimentos) expect(m.autorOperadorId).toBe(ana.operadorId);
  });

  it('F07: consolidado do dono tem vendas 27000, esperado 35000, contado 34500 e diferença -500', async () => {
    const { dono, ana, bruno, caixaAna, caixaBruno } = await cenarioF06();
    await fechar(ana, caixaAna.id, fechamentoAna(ana));
    await fechar(bruno, caixaBruno.id, fechamentoBruno(bruno));
    const itens = await painel(dono);
    expect(itens).toHaveLength(2);
    expect(itens.reduce((s, i) => s + i.caixa.fechamento!.esperadoCentavos, 0)).toBe(35000);
    expect(itens.reduce((s, i) => s + i.caixa.fechamento!.contadoCentavos, 0)).toBe(34500);
    expect(itens.reduce((s, i) => s + i.saldoCentavos, 0)).toBe(35000);
    const r = await relatorio(dono);
    expect(r.totais).toMatchObject({ venda: 27000, recebimento_venda: 27000, suprimento: 5000, sangria: 8000, retirada: 2000, diferenca: -500 });
    expect((await relatorio(dono, `&operadorId=${bruno.operadorId}`)).totais).toMatchObject({ venda: 4000, diferenca: 0, suprimento: 0, sangria: 0, retirada: 0 });
    expect((await relatorio(dono, `&operadorId=${ana.operadorId}`)).totais).toMatchObject({ venda: 23000, diferenca: -500, suprimento: 5000, sangria: 8000, retirada: 2000 });
    // A autoria de cada linha de gaveta do relatório é a da Ana.
    const linhasGaveta = r.linhas.filter(l => ['suprimento', 'sangria', 'retirada'].includes(l.categoria));
    expect(linhasGaveta).toHaveLength(3);
    for (const l of linhasGaveta) expect(l).toMatchObject({ autorOperadorId: ana.operadorId, operadorId: ana.operadorId });
    // Depois de fechado, o operador pode abrir outro turno e o anterior permanece intacto.
    const novo = await abrir(ana, 5000);
    expect(novo.id).not.toBe(caixaAna.id);
    expect((await itemDo(dono, caixaAna.id)).saldoCentavos).toBe(25000);
  });
});
