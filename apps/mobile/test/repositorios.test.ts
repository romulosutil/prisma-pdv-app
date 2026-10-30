import type { PlanoId } from '@pdv/shared';
import { describe, expect, it } from 'vitest';
import { CaixaRepo, resumirDia } from '@/dados/caixa';
import { ehErroDeDominio } from '@/dados/erros';
import { ProdutosRepo } from '@/dados/produtos';
import { VendasRepo } from '@/dados/vendas';
import { criarAmbiente } from './ambiente';

const sessao = () => ({ lojaId: 'loja', aparelhoId: 'aparelho', operadorId: 'operador' });

function criarProdutos(planoId: PlanoId = 'negocio') {
  const amb = criarAmbiente();
  return { amb, repo: new ProdutosRepo(amb, { lojaId: () => 'loja', planoId: () => planoId }) };
}

describe('ProdutosRepo', () => {
  it('cria, edita e exclui logicamente', async () => {
    const { repo } = criarProdutos();
    const arroz = await repo.criar({ nome: ' Arroz ', ean: '7890000000017', precoCentavos: 2790 });
    expect(arroz).toMatchObject({ nome: 'Arroz', unidade: 'un', versao: 1, excluidoEm: null });

    const editado = await repo.editar(arroz.id, { precoCentavos: 2990, atalho: true });
    expect(editado).toMatchObject({ precoCentavos: 2990, atalho: true, versao: 2, ean: '7890000000017' });
    expect(repo.atalhos()).toHaveLength(1);

    await repo.excluir(arroz.id);
    expect(repo.listar()).toHaveLength(0);
    expect(repo.obter()).toHaveLength(1);
    expect(repo.buscarPorEan('7890000000017')).toBeNull();
  });

  it('busca por EAN e por nome sem acento nem caixa', async () => {
    const { repo } = criarProdutos();
    await repo.criar({ nome: 'Pão francês', precoCentavos: 1690, unidade: 'kg' });
    await repo.criar({ nome: 'Café torrado 500g', ean: '7890000000048', precoCentavos: 1990 });
    await repo.criar({ nome: 'Biscoito de café', precoCentavos: 500 });

    expect(repo.buscarPorEan('7890000000048')?.nome).toBe('Café torrado 500g');
    expect(repo.buscarPorNome('PAO FRANCES').map((p) => p.nome)).toEqual(['Pão francês']);
    expect(repo.buscarPorNome('cafe').map((p) => p.nome)).toEqual(['Café torrado 500g', 'Biscoito de café']);
    expect(repo.buscarPorNome('  ')).toEqual([]);
  });

  it('respeita o limite de produtos do plano com erro tipado', async () => {
    const { repo } = criarProdutos('essencial');
    await repo.substituirTodos(
      Array.from({ length: 500 }, (_, i) => ({
        id: `p${i}`,
        lojaId: 'loja',
        nome: `Produto ${i}`,
        ean: null,
        precoCentavos: 100,
        unidade: 'un' as const,
        estoque: null,
        estoqueMinimo: null,
        atalho: false,
        criadoEm: '',
        atualizadoEm: '',
        excluidoEm: null,
        versao: 1,
      })),
    );
    await expect(repo.criar({ nome: 'Mais um', precoCentavos: 100 })).rejects.toSatisfy(
      (e) => ehErroDeDominio(e, 'limite_plano') && e.limite === 'produtos',
    );
  });

  it('recusa EAN repetido e dados inválidos', async () => {
    const { repo } = criarProdutos();
    await repo.criar({ nome: 'A', ean: '7890000000017', precoCentavos: 100 });
    await expect(repo.criar({ nome: 'B', ean: '7890000000017', precoCentavos: 100 })).rejects.toSatisfy((e) =>
      ehErroDeDominio(e, 'ean_duplicado'),
    );
    await expect(repo.criar({ nome: 'C', ean: '12', precoCentavos: 100 })).rejects.toSatisfy((e) => ehErroDeDominio(e, 'valor_invalido'));
    await expect(repo.criar({ nome: ' ', precoCentavos: 100 })).rejects.toSatisfy((e) => ehErroDeDominio(e, 'valor_invalido'));
  });

  it('persiste e recarrega', async () => {
    const { amb, repo } = criarProdutos();
    await repo.criar({ nome: 'Leite', precoCentavos: 529 });
    const outro = new ProdutosRepo(amb, { lojaId: () => 'loja', planoId: () => 'negocio' });
    await outro.carregar();
    expect(outro.listar().map((p) => p.nome)).toEqual(['Leite']);
  });
});

describe('VendasRepo', () => {
  it('registra venda com total em centavos, numeração e filtro por dia', async () => {
    const amb = criarAmbiente(new Date('2026-10-23T15:00:00.000Z'));
    const repo = new VendasRepo(amb, { sessao });
    const venda = await repo.registrar({
      itens: [
        { produtoId: 'p1', descricao: 'Arroz', precoUnitarioCentavos: 2790, quantidadeMilesimos: 1000 },
        { produtoId: 'p2', descricao: 'Pão francês', precoUnitarioCentavos: 1690, quantidadeMilesimos: 500 },
      ],
      pagamentos: [{ meio: 'dinheiro', valorCentavos: 3635, trocoCentavos: 365 }],
    });
    expect(venda.totalCentavos).toBe(2790 + 845);
    expect(venda.itens[1]?.totalCentavos).toBe(845);
    expect(repo.numeroDe(venda)).toBe('#000001');

    amb.relogio.avancarDias(1);
    const amanha = await repo.registrar({
      itens: [{ produtoId: null, descricao: 'Valor avulso', precoUnitarioCentavos: 1000, quantidadeMilesimos: 1000 }],
      pagamentos: [{ meio: 'pix', valorCentavos: 1000 }],
    });
    expect(repo.listar()[0]?.id).toBe(amanha.id);
    expect(repo.listarPorDia(amb.relogio.agora()).map((v) => v.id)).toEqual([amanha.id]);
    expect(repo.listarPorDia(new Date('2026-10-23T15:00:00.000Z'))).toHaveLength(1);
  });

  it('valida itens e pagamentos', async () => {
    const repo = new VendasRepo(criarAmbiente(), { sessao });
    await expect(repo.registrar({ itens: [], pagamentos: [] })).rejects.toSatisfy((e) => ehErroDeDominio(e, 'sem_itens'));
    await expect(
      repo.registrar({
        itens: [{ produtoId: null, descricao: 'x', precoUnitarioCentavos: 1000, quantidadeMilesimos: 1000 }],
        pagamentos: [{ meio: 'pix', valorCentavos: 900 }],
      }),
    ).rejects.toSatisfy((e) => ehErroDeDominio(e, 'pagamento_incompleto'));
  });

  it('cancela sem apagar, e o resumo ignora as canceladas', async () => {
    const amb = criarAmbiente();
    const repo = new VendasRepo(amb, { sessao });
    const venda = await repo.registrar({
      itens: [{ produtoId: null, descricao: 'x', precoUnitarioCentavos: 1000, quantidadeMilesimos: 1000 }],
      pagamentos: [{ meio: 'pix', valorCentavos: 1000 }],
    });
    expect(resumirDia(amb.relogio.agora(), repo.listar(), null).totalCentavos).toBe(1000);
    await repo.cancelar(venda.id);
    expect(repo.listar()[0]?.status).toBe('cancelada');
    expect(resumirDia(amb.relogio.agora(), repo.listar(), null).totalCentavos).toBe(0);
  });
});

describe('CaixaRepo', () => {
  function criarCaixa(planoId: PlanoId = 'negocio') {
    const amb = criarAmbiente();
    const caixa = new CaixaRepo(amb, { sessao, planoId: () => planoId });
    return { amb, caixa, vendas: new VendasRepo(amb, { sessao, caixaId: () => caixa.atual()?.id ?? null }) };
  }

  it('abre, registra movimentos, calcula o esperado e fecha', async () => {
    const { amb, caixa, vendas } = criarCaixa();
    await caixa.abrir(10_000);
    await expect(caixa.abrir(0)).rejects.toSatisfy((e) => ehErroDeDominio(e, 'caixa_ja_aberto'));

    amb.relogio.avancarHoras(1);
    await vendas.registrar({
      itens: [{ produtoId: null, descricao: 'x', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000 }],
      pagamentos: [{ meio: 'dinheiro', valorCentavos: 2500 }],
    });
    await vendas.registrar({
      itens: [{ produtoId: null, descricao: 'y', precoUnitarioCentavos: 4000, quantidadeMilesimos: 1000 }],
      pagamentos: [{ meio: 'pix', valorCentavos: 4000 }],
    });
    await caixa.registrarMovimento('suprimento', 5000, 'Troco extra');
    await caixa.registrarMovimento('sangria', 3000);

    const resumo = resumirDia(amb.relogio.agora(), vendas.listar(), caixa.atual());
    expect(resumo).toMatchObject({
      caixaAberto: true,
      suprimentosCentavos: 5000,
      sangriasCentavos: 3000,
      esperadoNaGavetaCentavos: 10_000 + 2500 + 5000 - 3000,
    });
    expect(resumo.porMeio).toEqual({ dinheiro: 2500, pix: 4000, cartao: 0 });

    const fechado = await caixa.fechar(14_000, vendas.listar());
    expect(fechado.fechamento).toMatchObject({ esperadoCentavos: 14_500, contadoCentavos: 14_000 });
    expect(caixa.atual()).toBeNull();
    await expect(caixa.fechar(0, [])).rejects.toSatisfy((e) => ehErroDeDominio(e, 'caixa_fechado'));
  });

  it('sangria e suprimento exigem plano Negócio ou Pro', async () => {
    const { caixa } = criarCaixa('essencial');
    await caixa.abrir(0);
    await expect(caixa.registrarMovimento('sangria', 100)).rejects.toSatisfy((e) => ehErroDeDominio(e, 'recurso_plano'));
  });

  it('mantém fechamento e evento de cancelamento ao repetir, sem misturar caixas', async () => {
    const { caixa, vendas } = criarCaixa();
    const primeiro = await caixa.abrir(100);
    const nova = { itens: [{ produtoId: null, descricao: 'x', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000 }], pagamentos: [{ meio: 'dinheiro' as const, valorCentavos: 2500 }] };
    const venda = await vendas.registrar(nova);
    const fechado = await caixa.fechar(2600, vendas.listar());
    const segundo = await caixa.abrir(200);
    await vendas.registrar(nova);
    await vendas.registrar({ ...nova, caixaId: null });
    expect(resumirDia(new Date(), vendas.listar(), segundo).esperadoNaGavetaCentavos).toBe(2700);
    const cancelada = await vendas.cancelar(venda.id);
    expect(cancelada.caixaId).toBe(primeiro.id);
    expect(cancelada.cancelamento).toMatchObject({ operadorId: 'operador', motivo: 'Cancelamento solicitado pelo operador', estorno: 'nao_realizado' });
    expect(await vendas.cancelar(venda.id, 'outro motivo')).toEqual(cancelada);
    expect(caixa.obter().find((c) => c.id === primeiro.id)).toEqual(fechado);
  });
});
