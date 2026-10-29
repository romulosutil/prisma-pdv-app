import { z } from 'zod';
import { STATUS_ASSINATURA, type AssinaturaSerializada } from './assinatura';
import { BANDEIRAS } from './cartao';
import type { LicencaSerializada } from './licenca';
import { PLANOS_ORDEM, RECURSOS } from './planos';

// Contrato da API. Datas trafegam como string ISO 8601; dinheiro em centavos inteiros.

const IdSchema = z.uuid();
const DataIsoSchema = z.iso.datetime();
const CentavosSchema = z.number().int();
const CentavosNaoNegativosSchema = z.number().int().nonnegative();

export const PlanoIdSchema = z.enum(PLANOS_ORDEM);
export const UnidadeSchema = z.enum(['un', 'kg']);
export const MeioPagamentoSchema = z.enum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'tap']);
export const ProvedorPagamentoSchema = z.enum(['infinitepay', 'mercadopago']);

// ---------- Catálogo ----------

export const ProdutoSchema = z.object({
  id: IdSchema,
  lojaId: IdSchema,
  nome: z.string().min(1),
  ean: z.string().regex(/^\d{8,14}$/).nullable(),
  precoCentavos: CentavosNaoNegativosSchema,
  unidade: UnidadeSchema,
  /** Em milésimos da unidade, a mesma escala de `quantidadeMilesimos` dos itens de venda. */
  estoque: z.number().int().nullable(),
  estoqueMinimo: z.number().int().nullable(),
  atalho: z.boolean(),
  criadoEm: DataIsoSchema,
  atualizadoEm: DataIsoSchema,
  excluidoEm: DataIsoSchema.nullable(),
  versao: z.number().int().nonnegative(),
});
export type Produto = z.infer<typeof ProdutoSchema>;

export const FonteCatalogoSchema = z.enum(['proprio', 'open_food_facts']);
export type FonteCatalogo = z.infer<typeof FonteCatalogoSchema>;
export const ConfiancaCatalogoSchema = z.enum(['confirmada', 'externa']);
export type ConfiancaCatalogo = z.infer<typeof ConfiancaCatalogoSchema>;

/** Sugestão de cadastro a partir do código de barras. Nunca carrega preço: cada loja define o seu. */
export const ProdutoCatalogoSchema = z.object({
  ean: z.string(),
  nome: z.string().trim().min(1).max(200),
  marca: z.string().nullable(),
  conteudo: z.string().nullable(),
  imagemUrl: z.url().nullable(),
  fonte: FonteCatalogoSchema,
  confianca: ConfiancaCatalogoSchema,
});
export type ProdutoCatalogo = z.infer<typeof ProdutoCatalogoSchema>;

/** Nome confirmado pelo lojista ao salvar o produto; só o nome é compartilhado. */
export const ConfirmarEanReqSchema = z.object({ nome: z.string().trim().min(2).max(200) });
export type ConfirmarEanReq = z.infer<typeof ConfirmarEanReqSchema>;

// ---------- Vendas ----------

export const ItemVendaSchema = z.object({
  id: IdSchema,
  produtoId: IdSchema.nullable(),
  descricao: z.string().min(1),
  precoUnitarioCentavos: CentavosNaoNegativosSchema,
  quantidadeMilesimos: z.number().int().positive(),
  totalCentavos: CentavosNaoNegativosSchema,
});
export type ItemVenda = z.infer<typeof ItemVendaSchema>;

export const PagamentoVendaSchema = z.object({
  id: IdSchema,
  meio: MeioPagamentoSchema,
  provedor: ProvedorPagamentoSchema.nullable(),
  valorCentavos: CentavosNaoNegativosSchema,
  trocoCentavos: CentavosNaoNegativosSchema,
});
export type PagamentoVenda = z.infer<typeof PagamentoVendaSchema>;

export const VendaSchema = z.object({
  id: IdSchema,
  lojaId: IdSchema,
  aparelhoId: IdSchema,
  operadorId: IdSchema,
  itens: z.array(ItemVendaSchema),
  pagamentos: z.array(PagamentoVendaSchema),
  totalCentavos: CentavosNaoNegativosSchema,
  status: z.enum(['concluida', 'cancelada']),
  criadaEm: DataIsoSchema,
});
export type Venda = z.infer<typeof VendaSchema>;

// ---------- Caixa ----------

export const MovimentoCaixaSchema = z.object({
  id: IdSchema,
  tipo: z.enum(['sangria', 'suprimento']),
  valorCentavos: z.number().int().positive(),
  motivo: z.string().nullable(),
  criadoEm: DataIsoSchema,
});
export type MovimentoCaixa = z.infer<typeof MovimentoCaixaSchema>;

export const CaixaSchema = z.object({
  id: IdSchema,
  lojaId: IdSchema,
  aparelhoId: IdSchema,
  operadorId: IdSchema,
  abertura: z.object({ em: DataIsoSchema, trocoInicialCentavos: CentavosNaoNegativosSchema }),
  fechamento: z
    .object({
      em: DataIsoSchema,
      esperadoCentavos: CentavosSchema,
      contadoCentavos: CentavosNaoNegativosSchema,
    })
    .nullable(),
  movimentos: z.array(MovimentoCaixaSchema),
});
export type Caixa = z.infer<typeof CaixaSchema>;

// ---------- Conta e sessão ----------

export const SessaoSchema = z.object({
  token: z.string().min(1),
  contaId: IdSchema,
  lojaId: IdSchema,
  operadorId: IdSchema,
  aparelhoId: IdSchema,
});
export type Sessao = z.infer<typeof SessaoSchema>;

export const PerfilResSchema = z.object({ contaId: IdSchema, lojaId: IdSchema, operadorId: IdSchema, email: z.email(), nomeResponsavel: z.string(), nomeLoja: z.string(), papel: z.enum(['dono', 'operador']) });
export const AparelhoResSchema = z.object({ id: IdSchema, nome: z.string(), criadoEm: DataIsoSchema, ultimoAcessoEm: DataIsoSchema, revogadoEm: DataIsoSchema.nullable(), atual: z.boolean() });
export const AparelhosResSchema = z.array(AparelhoResSchema);

export const CriarContaReqSchema = z.object({
  email: z.email(),
  nomeResponsavel: z.string().min(1),
  nomeLoja: z.string().min(1),
  /** CPF ou CNPJ, só dígitos: um teste grátis por documento. */
  documento: z.string().regex(/^(\d{11}|\d{14})$/),
  aparelhoId: IdSchema,
  aparelhoNome: z.string().min(1),
});
export type CriarContaReq = z.infer<typeof CriarContaReqSchema>;
export const CriarContaResSchema = SessaoSchema;
export type CriarContaRes = Sessao;

export const LoginReqSchema = z.object({
  email: z.email(),
  /** Código de 6 dígitos enviado por e-mail (mock). */
  codigo: z.string().regex(/^\d{6}$/),
  aparelhoId: IdSchema,
  aparelhoNome: z.string().min(1),
});
export type LoginReq = z.infer<typeof LoginReqSchema>;
export const LoginResSchema = SessaoSchema;
export type LoginRes = Sessao;

// ---------- Assinatura e licença ----------

const CartaoSalvoSchema = z.object({
  bandeira: z.enum(BANDEIRAS),
  ultimos4: z.string().regex(/^\d{4}$/),
  fingerprint: z.string().min(1),
});

export const AssinaturaSerializadaSchema = z.object({
  id: IdSchema,
  contaId: IdSchema,
  planoId: PlanoIdSchema,
  status: z.enum(STATUS_ASSINATURA),
  criadaEm: DataIsoSchema,
  testeTerminaEm: DataIsoSchema,
  periodoAtualInicio: DataIsoSchema,
  periodoAtualFim: DataIsoSchema,
  acessoAte: DataIsoSchema.nullable(),
  inadimplenteDesde: DataIsoSchema.nullable(),
  tentativasFalhas: z.number().int().nonnegative(),
  proximaTentativaEm: DataIsoSchema.nullable(),
  canceladaEm: DataIsoSchema.nullable(),
  planoAgendado: PlanoIdSchema.nullable(),
  cartao: CartaoSalvoSchema.nullable(),
}) satisfies z.ZodType<AssinaturaSerializada>;

const LimiteOpcionalSchema = z.number().int().nonnegative().nullable();

export const LicencaSerializadaSchema = z.object({
  planoId: PlanoIdSchema,
  status: z.enum(STATUS_ASSINATURA),
  validaAte: DataIsoSchema,
  limites: z.object({
    produtos: LimiteOpcionalSchema,
    aparelhos: z.number().int().nonnegative(),
    operadores: LimiteOpcionalSchema,
    lojas: z.number().int().nonnegative(),
    historicoDias: LimiteOpcionalSchema,
  }),
  recursos: z.array(z.enum(RECURSOS)),
  emitidaEm: DataIsoSchema,
}) satisfies z.ZodType<LicencaSerializada>;

export const CriarAssinaturaReqSchema = z.object({
  planoId: PlanoIdSchema,
  tokenCartao: z.string().min(1),
});
export type CriarAssinaturaReq = z.infer<typeof CriarAssinaturaReqSchema>;

export const AssinaturaResSchema = z.object({
  assinatura: AssinaturaSerializadaSchema,
  licenca: LicencaSerializadaSchema,
});
export type AssinaturaRes = z.infer<typeof AssinaturaResSchema>;

export const TrocarPlanoReqSchema = z.object({ planoId: PlanoIdSchema });
export type TrocarPlanoReq = z.infer<typeof TrocarPlanoReqSchema>;

export const AtualizarCartaoReqSchema = z.object({ tokenCartao: z.string().min(1) });
export type AtualizarCartaoReq = z.infer<typeof AtualizarCartaoReqSchema>;

// ---------- Sincronização ----------

export const EntidadeSyncSchema = z.enum(['produto', 'venda', 'caixa']);
export type EntidadeSync = z.infer<typeof EntidadeSyncSchema>;

const UpsertProdutoSchema = z.object({ entidade: z.literal('produto'), operacao: z.literal('upsert'), dados: ProdutoSchema });
const UpsertVendaSchema = z.object({ entidade: z.literal('venda'), operacao: z.literal('upsert'), dados: VendaSchema });
const UpsertCaixaSchema = z.object({ entidade: z.literal('caixa'), operacao: z.literal('upsert'), dados: CaixaSchema });
const DeleteSchema = z.object({
  entidade: EntidadeSyncSchema,
  operacao: z.literal('delete'),
  dados: z.object({ id: IdSchema }),
});

/** Mudança de uma entidade, tal como o servidor devolve no pull. */
export const MudancaSchema = z.union([UpsertProdutoSchema, UpsertVendaSchema, UpsertCaixaSchema, DeleteSchema]);
export type Mudanca = z.infer<typeof MudancaSchema>;

const CamposMutacao = { id: IdSchema, criadaEm: DataIsoSchema };

/** Item da outbox do aparelho. `id` é a chave de idempotência da mutação. */
export const MutacaoSchema = z.union([
  UpsertProdutoSchema.extend(CamposMutacao),
  UpsertVendaSchema.extend(CamposMutacao),
  UpsertCaixaSchema.extend(CamposMutacao),
  DeleteSchema.extend(CamposMutacao),
]);
export type Mutacao = z.infer<typeof MutacaoSchema>;

export const SyncPushReqSchema = z.object({
  aparelhoId: IdSchema,
  mutacoes: z.array(MutacaoSchema),
});
export type SyncPushReq = z.infer<typeof SyncPushReqSchema>;

export const SyncPushResSchema = z.object({
  aceitas: z.array(IdSchema),
  rejeitadas: z.array(z.object({ id: IdSchema, motivo: z.string() })),
  cursor: z.string(),
});
export type SyncPushRes = z.infer<typeof SyncPushResSchema>;

export const SyncPullResSchema = z.object({
  cursor: z.string(),
  mudancas: z.array(MudancaSchema),
});
export type SyncPullRes = z.infer<typeof SyncPullResSchema>;
