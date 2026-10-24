import { describe, expect, it } from 'vitest';
import {
  AssinaturaResSchema,
  CaixaSchema,
  CriarContaReqSchema,
  gerarId,
  iniciarTeste,
  licencaDe,
  LoginReqSchema,
  MutacaoSchema,
  ProdutoSchema,
  serializarAssinatura,
  serializarLicenca,
  SyncPullResSchema,
  SyncPushReqSchema,
  VendaSchema,
  type Produto,
  type Venda,
} from '../src';

const AGORA = '2026-10-23T12:00:00.000Z';

const produto: Produto = {
  id: gerarId(),
  lojaId: gerarId(),
  nome: 'Arroz tipo 1 5kg',
  ean: '7890000000017',
  precoCentavos: 2790,
  unidade: 'un',
  estoque: 12000,
  estoqueMinimo: 3000,
  atalho: false,
  criadoEm: AGORA,
  atualizadoEm: AGORA,
  excluidoEm: null,
  versao: 1,
};

const venda: Venda = {
  id: gerarId(),
  lojaId: produto.lojaId,
  aparelhoId: gerarId(),
  operadorId: gerarId(),
  itens: [
    {
      id: gerarId(),
      produtoId: produto.id,
      descricao: produto.nome,
      precoUnitarioCentavos: 2790,
      quantidadeMilesimos: 1000,
      totalCentavos: 2790,
    },
    { id: gerarId(), produtoId: null, descricao: 'Venda avulsa', precoUnitarioCentavos: 500, quantidadeMilesimos: 1000, totalCentavos: 500 },
  ],
  pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 4000, trocoCentavos: 710 }],
  totalCentavos: 3290,
  status: 'concluida',
  criadaEm: AGORA,
};

describe('catálogo e vendas', () => {
  it('aceita um produto válido e recusa preço fracionário', () => {
    expect(ProdutoSchema.parse(produto)).toEqual(produto);
    expect(ProdutoSchema.safeParse({ ...produto, precoCentavos: 27.9 }).success).toBe(false);
    expect(ProdutoSchema.safeParse({ ...produto, unidade: 'litro' }).success).toBe(false);
    expect(ProdutoSchema.safeParse({ ...produto, criadoEm: '23/10/2026' }).success).toBe(false);
  });

  it('aceita produto sem EAN e com estoque nulo', () => {
    expect(ProdutoSchema.safeParse({ ...produto, ean: null, estoque: null, estoqueMinimo: null, unidade: 'kg' }).success).toBe(true);
  });

  it('aceita uma venda válida e recusa meio de pagamento desconhecido', () => {
    expect(VendaSchema.parse(venda)).toEqual(venda);
    const ruim = { ...venda, pagamentos: [{ ...venda.pagamentos[0], meio: 'boleto' }] };
    expect(VendaSchema.safeParse(ruim).success).toBe(false);
  });

  it('aceita pagamento por Tap com provedor', () => {
    const tap = { ...venda, pagamentos: [{ ...venda.pagamentos[0], meio: 'tap', provedor: 'infinitepay', trocoCentavos: 0 }] };
    expect(VendaSchema.safeParse(tap).success).toBe(true);
  });

  it('valida o caixa', () => {
    const caixa = {
      id: gerarId(),
      lojaId: produto.lojaId,
      aparelhoId: venda.aparelhoId,
      operadorId: venda.operadorId,
      abertura: { em: AGORA, trocoInicialCentavos: 10000 },
      fechamento: null,
      movimentos: [{ id: gerarId(), tipo: 'sangria', valorCentavos: 5000, motivo: null, criadoEm: AGORA }],
    };
    expect(CaixaSchema.safeParse(caixa).success).toBe(true);
    expect(CaixaSchema.safeParse({ ...caixa, movimentos: [{ ...caixa.movimentos[0], tipo: 'roubo' }] }).success).toBe(false);
  });
});

describe('conta e login', () => {
  it('valida e-mail, documento e código de 6 dígitos', () => {
    const conta = {
      email: 'ana@bompreco.com.br',
      nomeResponsavel: 'Ana',
      nomeLoja: 'Mercadinho Bom Preço',
      documento: '12345678000199',
      aparelhoId: gerarId(),
      aparelhoNome: 'Celular do balcão',
    };
    expect(CriarContaReqSchema.safeParse(conta).success).toBe(true);
    expect(CriarContaReqSchema.safeParse({ ...conta, email: 'ana' }).success).toBe(false);
    expect(CriarContaReqSchema.safeParse({ ...conta, documento: '123' }).success).toBe(false);

    const login = { email: conta.email, codigo: '123456', aparelhoId: conta.aparelhoId, aparelhoNome: conta.aparelhoNome };
    expect(LoginReqSchema.safeParse(login).success).toBe(true);
    expect(LoginReqSchema.safeParse({ ...login, codigo: '12345' }).success).toBe(false);
    expect(LoginReqSchema.safeParse({ ...login, codigo: '12345a' }).success).toBe(false);
  });
});

describe('assinatura', () => {
  it('AssinaturaRes valida a assinatura e a licença serializadas', () => {
    const assinatura = iniciarTeste({
      id: gerarId(),
      contaId: gerarId(),
      planoId: 'negocio',
      cartao: { bandeira: 'visa', ultimos4: '4242', fingerprint: 'fp_visa_4242' },
      agora: new Date(AGORA),
    });
    const res = {
      assinatura: serializarAssinatura(assinatura),
      licenca: serializarLicenca(licencaDe(assinatura, new Date(AGORA))),
    };
    expect(AssinaturaResSchema.parse(JSON.parse(JSON.stringify(res)))).toEqual(res);
    expect(AssinaturaResSchema.safeParse({ ...res, assinatura: { ...res.assinatura, status: 'vip' } }).success).toBe(false);
  });
});

describe('sincronização', () => {
  const upsertProduto = { id: gerarId(), entidade: 'produto', operacao: 'upsert', dados: produto, criadaEm: AGORA };

  it('push aceita upserts tipados e deletes', () => {
    const req = {
      aparelhoId: venda.aparelhoId,
      mutacoes: [
        upsertProduto,
        { id: gerarId(), entidade: 'venda', operacao: 'upsert', dados: venda, criadaEm: AGORA },
        { id: gerarId(), entidade: 'produto', operacao: 'delete', dados: { id: produto.id }, criadaEm: AGORA },
      ],
    };
    expect(SyncPushReqSchema.parse(req)).toEqual(req);
  });

  it('recusa upsert cujos dados não batem com a entidade', () => {
    expect(MutacaoSchema.safeParse({ ...upsertProduto, dados: venda }).success).toBe(false);
    expect(MutacaoSchema.safeParse({ ...upsertProduto, entidade: 'venda' }).success).toBe(false);
  });

  it('pull devolve cursor e mudanças', () => {
    const res = {
      cursor: 'c-42',
      mudancas: [{ entidade: 'produto', operacao: 'upsert', dados: produto }],
    };
    expect(SyncPullResSchema.parse(res)).toEqual(res);
  });
});
