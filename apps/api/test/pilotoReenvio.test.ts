/**
 * Piloto Android, lado servidor de F09 e F11 (docs/roteiro-piloto-android.md, linhas 43 e 45).
 * O aparelho grava localmente e envia pela sincronização com IDs gerados no cliente; aqui ficam os
 * reenvios: resposta perdida, parcela isolada, movimento, fechamento, conteúdo divergente com o mesmo ID,
 * lote fora de ordem e preservação do responsável.
 *
 * Já cobertos em outros arquivos e NÃO repetidos aqui:
 * - syncCaixaVenda.test.ts: reenvio idêntico de fechamento, `caixa_fechada` e `venda_imutavel` em caixa legado (v1).
 * - syncPagamentosManuais.test.ts: pagamento dividido (Pix manual) aceito, snapshot idêntico no reenvio em lote.
 * - syncRecursosCaixa.test.ts: movimentos duplicados/divergentes em caixa legado (v1) e plano.
 * Este arquivo cobre o contrato atual do aparelho (turno reservado, v2): reserva online, movimentos com autoria e
 * fechamento com conferente, mais as combinações de reenvio que os arquivos acima não exercem.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { gerarId, type Caixa, type Mutacao, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import type { Conexao } from '../src/db/conexao';
import { aparelhos, caixas, itensVenda, movimentosCaixa, mudancas, mutacoesAplicadas, operadores, pagamentosVenda, usuarios, vendas } from '../src/db/schema';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, INICIO, mutacao, NUMEROS, venda, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

const post = (s: Sessao, url: string, corpo: unknown) => chamar(amb, 'POST', url, { token: s.token, corpo });
const get = (s: Sessao, url: string) => chamar(amb, 'GET', url, { token: s.token });

async function funcionario(dono: Sessao, nome = 'Ana') {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${usuarioId}@exemplo.com`, nome, criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome, papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome, criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}

/** O aparelho reserva o turno online; o servidor devolve o caixa v2 com troco inicial. */
async function reservar(s: Sessao, trocoInicialCentavos = 1000): Promise<Caixa> {
  const r = await post(s, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos });
  expect(r.status).toBe(200);
  return r.corpo as Caixa;
}

/** Venda de 700: 200 em dinheiro e 500 em Pix manual; só o dinheiro entra na gaveta. */
function vendaDividida(s: Sessao, cx: Caixa) {
  return venda(s, {
    caixaId: cx.id,
    pagamentos: [
      { id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 200, trocoCentavos: 0 },
      { id: gerarId(), meio: 'pix', provedor: null, valorCentavos: 500, trocoCentavos: 0 },
    ],
  });
}

const movimento = (s: Sessao, tipo: 'suprimento' | 'sangria' | 'retirada', valorCentavos: number) => ({
  id: gerarId(), tipo, valorCentavos, motivo: `Motivo ${tipo}`, criadoEm: INICIO.toISOString(), versaoContrato: 2 as const,
  autorOperadorId: s.operadorId, responsavelOperadorId: s.operadorId, aparelhoId: s.aparelhoId, categoria: 'teste', destino: 'Cofre',
});
type Mov = ReturnType<typeof movimento>;

/** Turno com troco 40 que sobra na gaveta; o resto do contado é recolhido. */
const fechamento = (s: Sessao, esperadoCentavos: number, contadoCentavos: number) => ({
  em: INICIO.toISOString(), esperadoCentavos, contadoCentavos, diferencaCentavos: contadoCentavos - esperadoCentavos,
  conferenteId: s.operadorId, recolhidoCentavos: contadoCentavos - 40, trocoRestanteCentavos: 40,
});

const comMovimentos = (cx: Caixa, movs: Mov[], fim: Caixa['fechamento'] = null): Caixa => ({ ...cx, movimentos: movs, fechamento: fim });
const novoId = (m: Mutacao): Mutacao => ({ ...m, id: gerarId() }) as Mutacao;
const ordenado = <T>(xs: T[]) => xs.map(x => JSON.stringify(x)).sort();

async function financeiro() {
  return {
    vendas: ordenado(await amb.db.select().from(vendas)),
    itens: ordenado(await amb.db.select().from(itensVenda)),
    pagamentos: ordenado(await amb.db.select().from(pagamentosVenda)),
    // `versao` fica de fora: reenviar o estado do turno com outro ID de mutação regrava o turno e soma 1, sem tocar valores.
    caixas: ordenado((await amb.db.select().from(caixas)).map(({ versao: _versao, ...resto }) => resto)),
    movimentos: ordenado(await amb.db.select().from(movimentosCaixa)),
  };
}
const acks = async () => (await amb.db.select().from(mutacoesAplicadas)).length;
const alteracoes = async () => (await amb.db.select().from(mudancas)).length;
async function gaveta(s: Sessao, caixaId: string): Promise<number> {
  const linha = (await get(s, '/caixas')).corpo.find((c: { caixa: { id: string } }) => c.caixa.id === caixaId);
  return linha.saldoCentavos;
}

/** Valores normalizados (sem IDs nem instantes) para comparar duas execuções do mesmo cenário. */
async function resumo(lojaId: string) {
  const vs = await amb.db.select().from(vendas).where(eq(vendas.lojaId, lojaId));
  const ps = await amb.db.select().from(pagamentosVenda).where(eq(pagamentosVenda.lojaId, lojaId));
  const ms = await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.lojaId, lojaId));
  const cs = await amb.db.select().from(caixas).where(eq(caixas.lojaId, lojaId));
  return {
    vendas: ordenado(vs.map(v => [v.totalCentavos, v.status])),
    pagamentos: ordenado(ps.map(p => [p.meio, p.valorCentavos, p.trocoCentavos])),
    movimentos: ordenado(ms.map(m => [m.tipo, m.valorCentavos, m.motivo])),
    caixas: cs.map(c => [c.trocoInicialCentavos, c.esperadoCentavos, c.contadoCentavos, c.fechadoEm !== null]),
  };
}

describe('F09: venda com pagamento dividido reenviada depois de resposta perdida', () => {
  it('F09: reenvio idêntico mantém uma venda, duas parcelas, valores iguais e a gaveta conta uma vez', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await reservar(s);
    const v = vendaDividida(s, cx), m = mutacao('venda', v);
    expect((await enviar(amb, s, [m])).corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    // O cliente não viu esta resposta (conexão caiu): tudo que foi gravado precisa sobreviver a reenvios.
    const depoisDoPrimeiro = { financeiro: await financeiro(), acks: await acks(), mudancas: await alteracoes() };

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      expect((await enviar(amb, s, [m])).corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    }
    // O app que reiniciou e remonta o envio com outro ID de mutação, mas a mesma venda.
    expect((await enviar(amb, s, [novoId(m)])).corpo.rejeitadas).toEqual([]);

    expect(await financeiro()).toEqual(depoisDoPrimeiro.financeiro);
    expect(await alteracoes()).toBe(depoisDoPrimeiro.mudancas);
    expect(await acks()).toBe(depoisDoPrimeiro.acks + 1);

    const [salva] = await amb.db.select().from(vendas).where(eq(vendas.id, v.id));
    expect(salva).toMatchObject({ id: v.id, totalCentavos: 700, status: 'concluida', caixaId: cx.id, operadorId: s.operadorId, aparelhoId: s.aparelhoId, versao: 1 });
    const parcelas = (await amb.db.select().from(pagamentosVenda).where(eq(pagamentosVenda.vendaId, v.id))).sort((a, b) => a.posicao - b.posicao);
    expect(parcelas.map(p => ({ id: p.id, meio: p.meio, provedor: p.provedor, valor: p.valorCentavos, troco: p.trocoCentavos }))).toEqual([
      { id: v.pagamentos[0]!.id, meio: 'dinheiro', provedor: null, valor: 200, troco: 0 },
      { id: v.pagamentos[1]!.id, meio: 'pix', provedor: null, valor: 500, troco: 0 },
    ]);
    expect(await amb.db.select().from(vendas)).toHaveLength(1);
    // Troco 1000 + 200 em dinheiro; o Pix manual não toca a gaveta e o reenvio não soma de novo.
    expect(await gaveta(s, cx.id)).toBe(1200);

    const pull = (await get(s, '/sync/pull?desde=0')).corpo.mudancas.filter((x: { entidade: string }) => x.entidade === 'venda');
    expect(pull).toHaveLength(1);
    expect(pull[0].dados.pagamentos).toEqual(v.pagamentos);
  });

  it('F09: reenvio de parcela isolada já gravada não altera a venda nem a gaveta', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await reservar(s);
    const v = vendaDividida(s, cx), m = mutacao('venda', v);
    await enviar(amb, s, [m]);
    const antes = await financeiro(), ackAntes = await acks(), mudancasAntes = await alteracoes();

    // O aparelho só reenvia a parcela de dinheiro, num pedido novo: a venda gravada tem as duas parcelas.
    const soDinheiro = mutacao('venda', { ...v, pagamentos: [v.pagamentos[0]!], totalCentavos: 200, itens: [v.itens[0]!] });
    expect((await enviar(amb, s, [soDinheiro])).corpo.rejeitadas).toEqual([{ id: soDinheiro.id, motivo: 'venda_imutavel' }]);
    // Mesma venda com a parcela de Pix e o total certo, mas sem a de dinheiro: também recusada.
    const soPix = mutacao('venda', { ...v, pagamentos: [v.pagamentos[1]!] });
    expect((await enviar(amb, s, [soPix])).corpo.rejeitadas).toEqual([{ id: soPix.id, motivo: 'venda_imutavel' }]);

    expect(await financeiro()).toEqual(antes);
    expect(await acks()).toBe(ackAntes);
    expect(await alteracoes()).toBe(mudancasAntes);
    expect(await gaveta(s, cx.id)).toBe(1200);
  });

  it('F09: mesmo ID de venda com valores diferentes é recusado e o valor gravado não é sobrescrito', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await reservar(s);
    const v = vendaDividida(s, cx);
    await enviar(amb, s, [mutacao('venda', v)]);
    const antes = await financeiro();

    const [dinheiro, pix] = v.pagamentos as [typeof v.pagamentos[number], typeof v.pagamentos[number]];
    const variacoes: Record<string, typeof v> = {
      'valores das parcelas trocados (soma igual)': { ...v, pagamentos: [{ ...dinheiro, valorCentavos: 300 }, { ...pix, valorCentavos: 400 }] },
      'meio da parcela trocado': { ...v, pagamentos: [dinheiro, { ...pix, meio: 'cartao_debito' }] },
      'troco inventado': { ...v, pagamentos: [{ ...dinheiro, valorCentavos: 300, trocoCentavos: 100 }, pix] },
      'caixa removido': { ...v, caixaId: null },
      'responsável trocado': { ...v, operadorId: gerarId() },
      'item alterado': { ...v, itens: [{ ...v.itens[0]!, descricao: 'Outro' }, v.itens[1]!] },
    };
    for (const [nome, alterada] of Object.entries(variacoes)) {
      const m = mutacao('venda', alterada);
      const res = await enviar(amb, s, [m]);
      expect(res.corpo.aceitas, nome).toEqual([]);
      expect(res.corpo.rejeitadas, nome).toEqual([{ id: m.id, motivo: 'venda_imutavel' }]);
      expect(await financeiro(), nome).toEqual(antes);
    }
    expect(await gaveta(s, cx.id)).toBe(1200);
  });

  it('F09: mesmo ID de mutação com conteúdo diferente é ignorado pelo ACK, sem sobrescrever o valor gravado', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await reservar(s);
    const v = vendaDividida(s, cx), m = mutacao('venda', v);
    await enviar(amb, s, [m]);
    const antes = await financeiro();
    // Um cliente real nunca altera uma mutação já enfileirada; se isso acontecesse, o servidor responde pelo ACK
    // do ID da mutação e não regrava nada. O que importa financeiramente: o valor gravado fica intacto.
    const adulterada = { ...m, dados: { ...v, totalCentavos: 1, pagamentos: [{ ...v.pagamentos[0]!, valorCentavos: 1 }] } } as Mutacao;
    expect((await enviar(amb, s, [adulterada])).corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    expect(await financeiro()).toEqual(antes);
    expect(await gaveta(s, cx.id)).toBe(1200);
  });
});

describe('F11: movimentos e fechamento de turno reenviados', () => {
  /** Turno com entrada 300, sangria 100 e retirada 50: gaveta 1000 + 300 - 100 - 50 = 1150. */
  async function turnoComMovimentos(s: Sessao) {
    const cx = await reservar(s);
    const movs = [movimento(s, 'suprimento', 300), movimento(s, 'sangria', 100), movimento(s, 'retirada', 50)];
    const m = mutacao('caixa', comMovimentos(cx, movs));
    expect((await enviar(amb, s, [m])).corpo).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    return { cx, movs, m };
  }

  it('F11: reenvio de entrada, sangria e retirada não duplica e a gaveta conta uma vez', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const { cx, movs, m } = await turnoComMovimentos(s);
    const antes = await financeiro(), mudancasAntes = await alteracoes();
    expect(await gaveta(s, cx.id)).toBe(1150);

    expect((await enviar(amb, s, [m])).corpo.rejeitadas).toEqual([]);
    // Pedido remontado com outro ID de mutação e o turno inteiro, com os mesmos IDs de movimento.
    expect((await enviar(amb, s, [novoId(m)])).corpo.rejeitadas).toEqual([]);
    // Só parte dos movimentos (reenvio parcial depois de reinício).
    expect((await enviar(amb, s, [mutacao('caixa', comMovimentos(cx, [movs[1]!]))])).corpo.rejeitadas).toEqual([]);

    expect(await financeiro()).toEqual(antes);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
    expect(await gaveta(s, cx.id)).toBe(1150);
    // Cada reenvio com ID de mutação novo registra de novo a mudança do turno (o ACK repetido não registra).
    expect(await alteracoes()).toBe(mudancasAntes + 2);
    const gravados = await amb.db.select().from(movimentosCaixa);
    for (const mov of movs) {
      const linha = gravados.find(g => g.id === mov.id)!;
      expect(linha).toMatchObject({ caixaId: cx.id, tipo: mov.tipo, valorCentavos: mov.valorCentavos, motivo: mov.motivo });
      expect(linha.detalhes).toMatchObject({ autorOperadorId: s.operadorId, responsavelOperadorId: s.operadorId, aparelhoId: s.aparelhoId });
    }
  });

  it('F11: mesmo ID de movimento com conteúdo diferente é recusado sem sobrescrever', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const { cx, movs } = await turnoComMovimentos(s);
    const antes = await financeiro();
    const sangria = movs[1]!;
    const variacoes: Record<string, Mov[]> = {
      'valor': [{ ...sangria, valorCentavos: 101 }],
      'tipo': [{ ...sangria, tipo: 'suprimento' }],
      'motivo': [{ ...sangria, motivo: 'Outro' }],
      'instante': [{ ...sangria, criadoEm: new Date(INICIO.getTime() + 1000).toISOString() }],
      'mesmo ID duas vezes no pedido': [sangria, sangria],
    };
    for (const [nome, movimentos] of Object.entries(variacoes)) {
      const m = mutacao('caixa', comMovimentos(cx, movimentos));
      const res = await enviar(amb, s, [m]);
      expect(res.corpo.aceitas, nome).toEqual([]);
      expect(res.corpo.rejeitadas, nome).toEqual([{ id: m.id, motivo: 'movimento_invalido' }]);
      expect(await financeiro(), nome).toEqual(antes);
    }
    // Autoria diferente com o mesmo ID também não reescreve o registro.
    const autoria = mutacao('caixa', comMovimentos(cx, [{ ...sangria, autorOperadorId: gerarId() }]));
    expect((await enviar(amb, s, [autoria])).corpo.rejeitadas).toEqual([{ id: autoria.id, motivo: 'movimento_imutavel' }]);
    expect(await financeiro()).toEqual(antes);
    expect(await gaveta(s, cx.id)).toBe(1150);
  });

  it('F11: fechamento reenviado não duplica e não altera esperado, contado nem diferença', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const { cx, movs } = await turnoComMovimentos(s);
    const v = vendaDividida(s, cx);
    await enviar(amb, s, [mutacao('venda', v)]);
    // 1000 + 200 (dinheiro da venda) + 300 - 100 - 50 = 1350; contado 1340 => diferença -10.
    const fim = fechamento(s, 1350, 1340);
    const fechar = mutacao('caixa', comMovimentos(cx, movs, fim));
    expect((await enviar(amb, s, [fechar])).corpo).toMatchObject({ aceitas: [fechar.id], rejeitadas: [] });
    const antes = await financeiro(), ackAntes = await acks();

    expect((await enviar(amb, s, [fechar])).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, s, [novoId(fechar)])).corpo.rejeitadas).toEqual([]);
    expect(await financeiro()).toEqual(antes);
    expect(await acks()).toBe(ackAntes + 1);

    const [salvo] = await amb.db.select().from(caixas).where(eq(caixas.id, cx.id));
    expect(salvo).toMatchObject({ esperadoCentavos: 1350, contadoCentavos: 1340, operadorId: s.operadorId });
    expect(salvo!.fechadoEm).toEqual(INICIO);
    expect(salvo!.detalhes?.fechamento).toMatchObject({ diferencaCentavos: -10, conferenteId: s.operadorId, recolhidoCentavos: 1300, trocoRestanteCentavos: 40 });
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
    expect(await gaveta(s, cx.id)).toBe(1350);
  });

  it('F11: fechamento com o mesmo ID de turno e valores diferentes é recusado sem sobrescrever', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const { cx, movs } = await turnoComMovimentos(s);
    await enviar(amb, s, [mutacao('caixa', comMovimentos(cx, movs, fechamento(s, 1150, 1150)))]);
    const antes = await financeiro();

    const variacoes: Record<string, Caixa> = {
      'contado diferente': comMovimentos(cx, movs, fechamento(s, 1150, 1140)),
      'esperado diferente': comMovimentos(cx, movs, fechamento(s, 1300, 1300)),
      'movimento a mais depois de fechado': comMovimentos(cx, [...movs, movimento(s, 'suprimento', 10)], fechamento(s, 1150, 1150)),
      'turno reaberto': comMovimentos(cx, movs, null),
    };
    for (const [nome, dados] of Object.entries(variacoes)) {
      const m = mutacao('caixa', dados);
      expect((await enviar(amb, s, [m])).corpo.rejeitadas, nome).toEqual([{ id: m.id, motivo: 'caixa_fechada' }]);
      expect(await financeiro(), nome).toEqual(antes);
    }
    const [salvo] = await amb.db.select().from(caixas).where(eq(caixas.id, cx.id));
    expect(salvo).toMatchObject({ esperadoCentavos: 1150, contadoCentavos: 1150 });
  });
});

describe('F11: lote fora de ordem e reconexão intermitente', () => {
  /** Venda dividida, entrada 300, sangria 100, retirada 50 e fechamento contado 1340 (esperado 1350). */
  async function cenario(s: Sessao) {
    const cx = await reservar(s);
    const v = vendaDividida(s, cx);
    const movs = [movimento(s, 'suprimento', 300), movimento(s, 'sangria', 100), movimento(s, 'retirada', 50)];
    return {
      cx, v, movs,
      venda: mutacao('venda', v),
      abertoComMovimentos: mutacao('caixa', comMovimentos(cx, movs)),
      fechado: mutacao('caixa', comMovimentos(cx, movs, fechamento(s, 1350, 1340))),
    };
  }

  it('F11: lote com fechamento antes da venda e dos movimentos termina igual ao envio em ordem', async () => {
    const ordem = await contaEmTeste(amb, 'pro');
    const a = await cenario(ordem);
    expect((await enviar(amb, ordem, [a.venda])).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, ordem, [a.abertoComMovimentos])).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, ordem, [a.fechado])).corpo.rejeitadas).toEqual([]);

    const desordem = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
    const b = await cenario(desordem);
    // Pior ordem possível dentro de um mesmo pedido: fechamento primeiro, venda por último. O servidor aplica a venda
    // antes do turno (prioridade), o fechamento já carrega todos os movimentos e o estado "aberto" do mesmo turno,
    // que ficou para trás, é recusado de forma explícita (`caixa_fechada`) sem perder nada.
    const res = await enviar(amb, desordem, [b.fechado, b.abertoComMovimentos, b.venda]);
    expect(res.corpo.aceitas).toEqual([b.fechado.id, b.venda.id]);
    expect(res.corpo.rejeitadas).toEqual([{ id: b.abertoComMovimentos.id, motivo: 'caixa_fechada' }]);

    const esperado = await resumo(ordem.lojaId);
    expect(await resumo(desordem.lojaId)).toEqual(esperado);
    expect(esperado.caixas).toEqual([[1000, 1350, 1340, true]]);
    expect(await gaveta(desordem, b.cx.id)).toBe(1350);
    expect(await gaveta(ordem, a.cx.id)).toBe(1350);
  });

  it('F11: fechamento que chega antes da venda é recusado de forma explícita e vale quando a venda chega', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const c = await cenario(s);
    await enviar(amb, s, [c.abertoComMovimentos]);
    const antes = await financeiro();

    // Conexão intermitente: o fechamento (que já conta a venda) chega primeiro e a venda ainda não existe no servidor.
    const cedo = await enviar(amb, s, [c.fechado]);
    expect(cedo.corpo.aceitas).toEqual([]);
    expect(cedo.corpo.rejeitadas).toEqual([{ id: c.fechado.id, motivo: 'fechamento_inconsistente' }]);
    expect(await financeiro()).toEqual(antes);
    expect(await amb.db.select().from(mutacoesAplicadas).where(eq(mutacoesAplicadas.id, c.fechado.id))).toEqual([]);

    expect((await enviar(amb, s, [c.venda])).corpo.rejeitadas).toEqual([]);
    // A recusa não gravou ACK: o mesmo pedido, reenviado, é aplicado.
    expect((await enviar(amb, s, [c.fechado])).corpo).toMatchObject({ aceitas: [c.fechado.id], rejeitadas: [] });
    expect((await enviar(amb, s, [c.fechado])).corpo.rejeitadas).toEqual([]);

    expect(await resumo(s.lojaId)).toEqual({
      vendas: ordenado([[700, 'concluida']]),
      pagamentos: ordenado([['dinheiro', 200, 0], ['pix', 500, 0]]),
      movimentos: ordenado([['suprimento', 300, 'Motivo suprimento'], ['sangria', 100, 'Motivo sangria'], ['retirada', 50, 'Motivo retirada']]),
      caixas: [[1000, 1350, 1340, true]],
    });
  });

  it('F11: venda enviada depois do fechamento é recusada sem perda silenciosa e o turno fechado fica intacto', async () => {
    const s = await contaEmTeste(amb, 'pro'), cx = await reservar(s);
    // Fechamento sem a venda: esperado = troco 1000, correto para o servidor porque a venda ainda não existe nele.
    const fechar = mutacao('caixa', comMovimentos(cx, [], fechamento(s, 1000, 1000)));
    expect((await enviar(amb, s, [fechar])).corpo.rejeitadas).toEqual([]);
    const antes = await financeiro();
    const tardia = vendaDividida(s, cx);
    // Posterior ao fechamento: o servidor recusa explicitamente (o app mantém a venda pendente) e não grava nada.
    amb.relogio.avancarHoras(1);
    const posterior = mutacao('venda', { ...tardia, criadaEm: new Date(INICIO.getTime() + 1000).toISOString() });
    expect((await enviar(amb, s, [posterior])).corpo.rejeitadas).toEqual([{ id: posterior.id, motivo: 'caixa_invalido' }]);
    expect(await financeiro()).toEqual(antes);
    expect(await acks()).toBe(1);
  });

  it('F11: caixa aberto com movimentos que chega depois do fechamento é recusado sem perder os movimentos já gravados', async () => {
    const s = await contaEmTeste(amb, 'pro');
    const c = await cenario(s);
    await enviar(amb, s, [c.venda]);
    // O fechamento (com todos os movimentos) chega antes do pedido anterior do mesmo turno, que ainda estava em trânsito.
    expect((await enviar(amb, s, [c.fechado])).corpo.rejeitadas).toEqual([]);
    const fechadoEmFinal = await financeiro();

    const atrasado = await enviar(amb, s, [c.abertoComMovimentos]);
    expect(atrasado.corpo.aceitas).toEqual([]);
    expect(atrasado.corpo.rejeitadas).toEqual([{ id: c.abertoComMovimentos.id, motivo: 'caixa_fechada' }]);
    expect(await financeiro()).toEqual(fechadoEmFinal);
    expect(await amb.db.select().from(movimentosCaixa)).toHaveLength(3);
    const [salvo] = await amb.db.select().from(caixas).where(eq(caixas.id, c.cx.id));
    expect(salvo).toMatchObject({ esperadoCentavos: 1350, contadoCentavos: 1340 });
  });
});

describe('F11: responsável e aparelho preservados nos reenvios', () => {
  it('F11: operadorId e aparelhoId da venda, do turno e dos movimentos permanecem os de origem', async () => {
    const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono);
    const cxAna = await reservar(ana, 500), cxDono = await reservar(dono, 1000);
    const vAna = venda(ana, { caixaId: cxAna.id });
    const mAna = mutacao('venda', vAna);
    const movDono = movimento(dono, 'sangria', 100);
    const mDono = mutacao('caixa', comMovimentos(cxDono, [movDono]));
    expect((await enviar(amb, ana, [mAna])).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, dono, [mDono])).corpo.rejeitadas).toEqual([]);

    const depoisDoPrimeiro = await financeiro();
    // Resposta perdida de ambos e reenvio idêntico por cada aparelho.
    await enviar(amb, ana, [mAna]);
    await enviar(amb, dono, [mDono]);
    expect(await financeiro()).toEqual(depoisDoPrimeiro);

    // Ana tenta reenviar a própria venda reatribuída ao dono e a do turno do dono: ambos recusados.
    const reatribuida = mutacao('venda', { ...vAna, operadorId: dono.operadorId, aparelhoId: dono.aparelhoId });
    expect((await enviar(amb, ana, [reatribuida])).corpo.rejeitadas).toEqual([{ id: reatribuida.id, motivo: 'venda_imutavel' }]);
    const outraVenda = mutacao('venda', venda(ana, { caixaId: cxDono.id }));
    expect((await enviar(amb, ana, [outraVenda])).corpo.rejeitadas).toEqual([{ id: outraVenda.id, motivo: 'caixa_invalido' }]);
    const turnoDoDono = mutacao('caixa', comMovimentos(cxDono, [movDono]));
    expect((await enviar(amb, ana, [turnoDoDono])).corpo.rejeitadas).toEqual([{ id: turnoDoDono.id, motivo: 'origem_invalida' }]);
    expect(await financeiro()).toEqual(depoisDoPrimeiro);

    const [vendaSalva] = await amb.db.select().from(vendas).where(eq(vendas.id, vAna.id));
    expect(vendaSalva).toMatchObject({ operadorId: ana.operadorId, aparelhoId: ana.aparelhoId, caixaId: cxAna.id });
    const turnos = await amb.db.select().from(caixas);
    expect(turnos.find(t => t.id === cxAna.id)).toMatchObject({ operadorId: ana.operadorId, aparelhoId: ana.aparelhoId });
    expect(turnos.find(t => t.id === cxDono.id)).toMatchObject({ operadorId: dono.operadorId, aparelhoId: dono.aparelhoId });
    const [mov] = await amb.db.select().from(movimentosCaixa).where(eq(movimentosCaixa.id, movDono.id));
    expect(mov!.detalhes).toMatchObject({ autorOperadorId: dono.operadorId, responsavelOperadorId: dono.operadorId, aparelhoId: dono.aparelhoId });
    // Cada gaveta conta só o que é seu: Ana 500 + 700 em dinheiro; o dono 1000 - 100.
    expect(await gaveta(dono, cxAna.id)).toBe(1200);
    expect(await gaveta(dono, cxDono.id)).toBe(900);
  });

  it('F11: Ana fecha o próprio turno e o reenvio do fechamento preserva o conferente e o responsável', async () => {
    const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono);
    const cx = await reservar(ana, 500), v = venda(ana, { caixaId: cx.id });
    await enviar(amb, ana, [mutacao('venda', v)]);
    const fechar = mutacao('caixa', comMovimentos(cx, [], fechamento(ana, 1200, 1195)));
    expect((await enviar(amb, ana, [fechar])).corpo).toMatchObject({ aceitas: [fechar.id], rejeitadas: [] });
    const antes = await financeiro();
    expect((await enviar(amb, ana, [fechar])).corpo.rejeitadas).toEqual([]);
    expect((await enviar(amb, ana, [novoId(fechar)])).corpo.rejeitadas).toEqual([]);
    expect(await financeiro()).toEqual(antes);
    const [salvo] = await amb.db.select().from(caixas).where(eq(caixas.id, cx.id));
    expect(salvo).toMatchObject({ operadorId: ana.operadorId, aparelhoId: ana.aparelhoId, esperadoCentavos: 1200, contadoCentavos: 1195 });
    expect(salvo!.detalhes?.fechamento).toMatchObject({ conferenteId: ana.operadorId, diferencaCentavos: -5 });
  });
});
