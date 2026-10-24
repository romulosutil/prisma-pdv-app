import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { gerarId, SyncPullResSchema, SyncPushResSchema, type Caixa } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import {
  abrirBanco,
  chamar,
  contaEmTeste,
  criarAmbiente,
  criarConta,
  enviar,
  exclusao,
  INICIO,
  mutacao,
  produto,
  venda,
  type Ambiente,
} from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => {
  banco = await abrirBanco();
});
afterAll(() => banco.fechar());
beforeEach(async () => {
  amb = await criarAmbiente(banco);
  // O servidor não aceita atualizadoEm no futuro: as edições "mais novas" dos testes ficam até +3h.
  amb.relogio.avancarHoras(3);
});
afterEach(() => amb.fechar());

type Conta = Awaited<ReturnType<typeof contaEmTeste>>;

async function puxar(conta: Conta, desde?: string) {
  const res = await chamar(amb, 'GET', `/sync/pull${desde === undefined ? '' : `?desde=${desde}`}`, { token: conta.token });
  expect(res.status).toBe(200);
  return SyncPullResSchema.parse(res.corpo);
}

async function empurrar(conta: Conta, ...mutacoes: Parameters<typeof enviar>[2]) {
  const res = await enviar(amb, conta, mutacoes);
  expect(res.status).toBe(200);
  return SyncPushResSchema.parse(res.corpo);
}

/** Instante relativo ao início do teste; o relógio do servidor está em +3h. */
const horasDepois = (h: number): string => new Date(INICIO.getTime() + h * 3_600_000).toISOString();

describe('push idempotente e pull com cursor', () => {
  it('reenviar a mesma mutação não duplica nem muda nada', async () => {
    const conta = await contaEmTeste(amb);
    const m = mutacao('produto', produto(conta.lojaId));

    const primeira = await empurrar(conta, m);
    const segunda = await empurrar(conta, m);
    expect(primeira).toMatchObject({ aceitas: [m.id], rejeitadas: [] });
    expect(segunda).toMatchObject({ aceitas: [m.id], rejeitadas: [], cursor: primeira.cursor });

    const pull = await puxar(conta);
    expect(pull.mudancas).toHaveLength(1);
    expect(pull.mudancas[0]).toMatchObject({ entidade: 'produto', operacao: 'upsert', dados: { versao: 1 } });
  });

  it('a mesma mutação repetida dentro do lote vale uma vez', async () => {
    const conta = await contaEmTeste(amb);
    const m = mutacao('produto', produto(conta.lojaId));
    const res = await empurrar(conta, m, m);
    expect(res.aceitas).toEqual([m.id, m.id]);
    expect((await puxar(conta)).mudancas).toHaveLength(1);
  });

  it('pull devolve só o que mudou depois do cursor, cada entidade uma vez', async () => {
    const conta = await contaEmTeste(amb);
    const a = produto(conta.lojaId, { nome: 'A' });
    const b = produto(conta.lojaId, { nome: 'B' });
    await empurrar(conta, mutacao('produto', a), mutacao('produto', b));

    const inicial = await puxar(conta, '0');
    expect(inicial.mudancas.map((m) => (m.operacao === 'upsert' && m.entidade === 'produto' ? m.dados.nome : '?'))).toEqual(['A', 'B']);

    await empurrar(conta, mutacao('produto', { ...a, nome: 'A1', atualizadoEm: horasDepois(1) }));
    await empurrar(conta, mutacao('produto', { ...a, nome: 'A2', atualizadoEm: horasDepois(2) }));
    const incremental = await puxar(conta, inicial.cursor);
    expect(incremental.mudancas).toHaveLength(1);
    expect(incremental.mudancas[0]).toMatchObject({ dados: { id: a.id, nome: 'A2', versao: 3 } });

    const vazio = await puxar(conta, incremental.cursor);
    expect(vazio).toEqual({ cursor: incremental.cursor, mudancas: [] });
  });

  it('o cursor é por loja: uma conta não vê nem mexe nos dados da outra', async () => {
    const a = await contaEmTeste(amb);
    const b = await criarConta(amb);
    const p = produto(a.lojaId);
    await empurrar(a, mutacao('produto', p));

    expect((await puxar(b)).mudancas).toEqual([]);
    const roubo = await empurrar(b, mutacao('produto', { ...p, lojaId: b.lojaId, nome: 'Invadido' }));
    expect(roubo.rejeitadas).toMatchObject([{ motivo: 'loja_invalida' }]);
    const alheio = await empurrar(b, mutacao('produto', produto(a.lojaId)));
    expect(alheio.rejeitadas).toMatchObject([{ motivo: 'loja_invalida' }]);
    expect(await puxar(a)).toMatchObject({ mudancas: [{ dados: { nome: 'Arroz 5kg' } }] });
  });

  it('valida o cursor e o aparelho', async () => {
    const conta = await contaEmTeste(amb);
    const ruim = await chamar(amb, 'GET', '/sync/pull?desde=abc', { token: conta.token });
    expect(ruim.status).toBe(400);

    const res = await chamar(amb, 'POST', '/sync/push', {
      token: conta.token,
      corpo: { aparelhoId: gerarId(), mutacoes: [] },
    });
    expect(res.status).toBe(403);
    expect(res.corpo.erro).toBe('aparelho_invalido');
  });
});

describe('produtos', () => {
  it('last-write-wins por atualizadoEm', async () => {
    const conta = await contaEmTeste(amb);
    const base = produto(conta.lojaId, { nome: 'Original', atualizadoEm: horasDepois(0) });
    await empurrar(conta, mutacao('produto', base));
    await empurrar(conta, mutacao('produto', { ...base, nome: 'Novo', atualizadoEm: horasDepois(2) }));

    const atrasada = await empurrar(conta, mutacao('produto', { ...base, nome: 'Velho', atualizadoEm: horasDepois(1) }));
    expect(atrasada.rejeitadas).toEqual([]);
    const { mudancas } = await puxar(conta);
    expect(mudancas).toMatchObject([{ dados: { nome: 'Novo', versao: 2, atualizadoEm: horasDepois(2) } }]);
  });

  it('relógio de aparelho no futuro não trava as edições seguintes', async () => {
    const conta = await contaEmTeste(amb);
    const base = produto(conta.lojaId, { atualizadoEm: '2099-01-01T00:00:00.000Z' });
    await empurrar(conta, mutacao('produto', base));
    expect((await puxar(conta)).mudancas).toMatchObject([{ dados: { atualizadoEm: horasDepois(3) } }]);

    // Gravado como "agora" (+3h), não como 2099: uma edição feita uma hora depois ganha.
    amb.relogio.avancarHoras(1);
    await empurrar(conta, mutacao('produto', { ...base, nome: 'Depois', atualizadoEm: horasDepois(4) }));
    expect((await puxar(conta)).mudancas).toMatchObject([{ dados: { nome: 'Depois', atualizadoEm: horasDepois(4) } }]);
  });

  it('exclusão vira operação delete no pull', async () => {
    const conta = await contaEmTeste(amb);
    const p = produto(conta.lojaId);
    const antes = await empurrar(conta, mutacao('produto', p));
    await empurrar(conta, exclusao('produto', p.id, new Date(horasDepois(1))));

    const { mudancas } = await puxar(conta, '0');
    expect(mudancas).toEqual([{ entidade: 'produto', operacao: 'delete', dados: { id: p.id } }]);
    expect(Number((await puxar(conta, antes.cursor)).cursor)).toBeGreaterThan(Number(antes.cursor));
  });

  it('excluir o que não existe ou algo imutável é rejeitado', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    await empurrar(conta, mutacao('venda', v));

    const res = await empurrar(conta, exclusao('produto', gerarId()), exclusao('venda', v.id));
    expect(res.rejeitadas.map((r) => r.motivo)).toEqual(['nao_encontrado', 'exclusao_nao_permitida']);
  });

  it('Essencial: o 501º produto é rejeitado com limite_plano, e excluir libera uma vaga', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    const lote = Array.from({ length: 501 }, (_, i) => produto(conta.lojaId, { nome: `Produto ${i}` }));

    const res = await empurrar(conta, ...lote.map((p) => mutacao('produto', p)));
    expect(res.aceitas).toHaveLength(500);
    expect(res.rejeitadas).toEqual([{ id: expect.any(String), motivo: 'limite_plano' }]);

    // Editar um produto que já existe nunca esbarra no limite.
    const edicao = await empurrar(conta, mutacao('produto', { ...lote[0]!, nome: 'Editado', atualizadoEm: horasDepois(1) }));
    expect(edicao.rejeitadas).toEqual([]);

    await empurrar(conta, exclusao('produto', lote[1]!.id, new Date(horasDepois(1))));
    const depois = await empurrar(conta, mutacao('produto', lote[500]!));
    expect(depois.rejeitadas).toEqual([]);

    // Paginação: 500 por página; o cursor leva ao resto.
    const primeira = await puxar(conta);
    expect(primeira.mudancas).toHaveLength(500);
    const segunda = await puxar(conta, primeira.cursor);
    expect(segunda.mudancas).toHaveLength(1);
    expect((await puxar(conta, segunda.cursor)).mudancas).toEqual([]);
  });

  it('Negócio não tem limite de produtos', async () => {
    const conta = await contaEmTeste(amb, 'negocio');
    const lote = Array.from({ length: 501 }, () => mutacao('produto', produto(conta.lojaId)));
    expect((await empurrar(conta, ...lote)).rejeitadas).toEqual([]);
  });
});

describe('vendas', () => {
  it('guarda itens e pagamentos na ordem em que chegaram', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    await empurrar(conta, mutacao('venda', v));

    const { mudancas } = await puxar(conta);
    expect(mudancas).toEqual([{ entidade: 'venda', operacao: 'upsert', dados: v }]);
  });

  it('é imutável: só aceita mudar o status para cancelada', async () => {
    const conta = await contaEmTeste(amb);
    const v = venda(conta);
    await empurrar(conta, mutacao('venda', v));

    const adulterada = await empurrar(conta, mutacao('venda', { ...v, totalCentavos: 1 }));
    expect(adulterada.rejeitadas).toMatchObject([{ motivo: 'venda_imutavel' }]);

    const igual = await empurrar(conta, mutacao('venda', v));
    expect(igual.rejeitadas).toEqual([]);

    const cancelada = await empurrar(conta, mutacao('venda', { ...v, status: 'cancelada' }));
    expect(cancelada.rejeitadas).toEqual([]);
    expect((await puxar(conta, '0')).mudancas).toMatchObject([{ entidade: 'venda', dados: { status: 'cancelada' } }]);

    const reaberta = await empurrar(conta, mutacao('venda', { ...v, status: 'concluida' }));
    expect(reaberta.rejeitadas).toMatchObject([{ motivo: 'venda_imutavel' }]);
  });

  it('cancelar uma venda antiga continua valendo com a assinatura suspensa', async () => {
    const conta = await contaEmTeste(amb, 'negocio', '4000 0000 0000 0341');
    const v = venda(conta);
    await empurrar(conta, mutacao('venda', v));
    amb.relogio.avancarDias(7);
    await chamar(amb, 'POST', '/dev/jobs/cobranca');
    amb.relogio.avancarDias(7);
    await chamar(amb, 'POST', '/dev/jobs/cobranca');

    const res = await empurrar(conta, mutacao('venda', { ...v, status: 'cancelada' }));
    expect(res.rejeitadas).toEqual([]);
  });

  it('conta sem assinatura não abre vendas novas', async () => {
    const conta = await criarConta(amb);
    const res = await enviar(amb, conta, [mutacao('venda', venda(conta))]);
    expect(res.corpo.rejeitadas).toMatchObject([{ motivo: 'assinatura_suspensa' }]);
  });
});

describe('caixa', () => {
  it('abre, recebe movimentos, fecha, e depois de fechado não aceita mais mudanças', async () => {
    const conta = await contaEmTeste(amb);
    const aberto: Caixa = {
      id: gerarId(),
      lojaId: conta.lojaId,
      aparelhoId: conta.aparelhoId,
      operadorId: conta.operadorId,
      abertura: { em: horasDepois(0), trocoInicialCentavos: 5000 },
      fechamento: null,
      movimentos: [],
    };
    await empurrar(conta, mutacao('caixa', aberto));

    const movimento = { id: gerarId(), tipo: 'sangria' as const, valorCentavos: 1000, motivo: 'Cofre', criadoEm: horasDepois(1) };
    const fechado: Caixa = {
      ...aberto,
      movimentos: [movimento],
      fechamento: { em: horasDepois(2), esperadoCentavos: 4000, contadoCentavos: 3950 },
    };
    expect((await empurrar(conta, mutacao('caixa', fechado))).rejeitadas).toEqual([]);

    const { mudancas } = await puxar(conta, '0');
    expect(mudancas).toEqual([{ entidade: 'caixa', operacao: 'upsert', dados: fechado }]);

    const depois = await empurrar(conta, mutacao('caixa', { ...fechado, movimentos: [] }));
    expect(depois.rejeitadas).toMatchObject([{ motivo: 'caixa_fechada' }]);
  });
});
