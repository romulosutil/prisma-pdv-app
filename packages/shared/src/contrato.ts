import { z } from 'zod';
import { STATUS_ASSINATURA, type AssinaturaSerializada } from './assinatura';
import { BANDEIRAS } from './cartao';
import type { LicencaSerializada } from './licenca';
import { PLANOS_ORDEM, RECURSOS } from './planos';
import { PapelSchema, PermissoesSchema } from './equipe';

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

/** Só fontes gratuitas e sem chave. As três "Open … Facts" são o mesmo banco do Open Food Facts (ODbL). */
export const FonteCatalogoSchema = z.enum(['proprio', 'open_food_facts', 'open_beauty_facts', 'open_products_facts']);
export type FonteCatalogo = z.infer<typeof FonteCatalogoSchema>;
export const ConfiancaCatalogoSchema = z.enum(['confirmada', 'externa']);
export type ConfiancaCatalogo = z.infer<typeof ConfiancaCatalogoSchema>;

/** Crédito exigido pela licença da fonte (ODbL: citar a licença e o Open Food Facts, com link). */
export const AtribuicaoCatalogoSchema = z.object({
  texto: z.string().min(1),
  licenca: z.string().min(1),
  /** Só https: o app abre esta URL ao tocar no crédito (z.url() sozinho aceita `javascript:` e `intent:`). */
  url: z.url({ protocol: /^https$/ }),
});
export type AtribuicaoCatalogo = z.infer<typeof AtribuicaoCatalogoSchema>;

const PROJETOS_OPEN_FACTS: Record<Exclude<FonteCatalogo, 'proprio'>, { nome: string; host: string }> = {
  open_food_facts: { nome: 'Open Food Facts', host: 'world.openfoodfacts.org' },
  open_beauty_facts: { nome: 'Open Beauty Facts', host: 'world.openbeautyfacts.org' },
  open_products_facts: { nome: 'Open Products Facts', host: 'world.openproductsfacts.org' },
};

/** Atribuição de um item do catálogo; `null` para o catálogo próprio (nome confirmado pelas lojas). */
export function atribuicaoCatalogo(fonte: FonteCatalogo, ean: string): AtribuicaoCatalogo | null {
  if (fonte === 'proprio') return null;
  const projeto = PROJETOS_OPEN_FACTS[fonte];
  // As bases irmãs também creditam o Open Food Facts (mesmo banco); o próprio OFF não se repete.
  const credito = fonte === 'open_food_facts' ? projeto.nome : `${projeto.nome}, um projeto Open Food Facts`;
  return {
    texto: `Dados do ${credito}, sob a Open Database License`,
    licenca: 'ODbL-1.0',
    url: `https://${projeto.host}/product/${encodeURIComponent(ean)}`,
  };
}

/** Sugestão de cadastro a partir do código de barras. Nunca carrega preço: cada loja define o seu. */
export const ProdutoCatalogoSchema = z.object({
  ean: z.string(),
  nome: z.string().trim().min(1).max(200),
  marca: z.string().nullable(),
  conteudo: z.string().nullable(),
  imagemUrl: z.url().nullable(),
  fonte: FonteCatalogoSchema,
  confianca: ConfiancaCatalogoSchema,
  /** Ausente nas respostas de APIs anteriores e no cache antigo do aparelho: vira `null`. */
  atribuicao: AtribuicaoCatalogoSchema.nullable().default(null),
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
  /** Ausente/null no legado ou em venda explicitamente sem caixa. Nunca inferir pela data. */
  caixaId: IdSchema.nullable().optional(),
  /** Evento comercial único e imutável. Não representa estorno no banco/provedor. */
  cancelamento: z.object({
    id: IdSchema,
    em: DataIsoSchema,
    operadorId: IdSchema,
    motivo: z.string().trim().min(1).max(500),
    estorno: z.literal('nao_realizado'),
  }).nullable().optional(),
  fiado: z.object({ clienteId: IdSchema, vencimento: z.iso.date(), valorCentavos: z.number().int().positive().refine(Number.isSafeInteger) }).nullable().optional(),
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
  tipo: z.enum(['sangria', 'suprimento', 'retirada', 'transferencia_entrada', 'transferencia_saida', 'devolucao', 'correcao_entrada', 'correcao_saida', 'recebimento_fiado', 'estorno_fiado']),
  valorCentavos: z.number().int().positive(),
  motivo: z.string().nullable(),
  criadoEm: DataIsoSchema,
  versaoContrato: z.literal(2).optional(),
  autorOperadorId: IdSchema.optional(),
  responsavelOperadorId: IdSchema.optional(),
  aparelhoId: IdSchema.optional(),
  aprovadorId: IdSchema.optional(),
  categoria: z.string().trim().min(1).max(100).optional(),
  destino: z.string().trim().min(1).max(150).optional(),
  transferenciaId: IdSchema.optional(),
  originalId: IdSchema.optional(),
}).superRefine((m, ctx) => {
  if (m.versaoContrato === 2 && (!m.autorOperadorId || !m.responsavelOperadorId || !m.aparelhoId || !m.motivo?.trim() || !m.categoria || !m.destino)) {
    ctx.addIssue({ code: 'custom', message: 'Movimento v2 exige autoria, responsável, origem/destino, categoria e motivo.' });
  }
});
export type MovimentoCaixa = z.infer<typeof MovimentoCaixaSchema>;

export const CaixaSchema = z.object({
  id: IdSchema,
  lojaId: IdSchema,
  aparelhoId: IdSchema,
  operadorId: IdSchema,
  versaoContrato: z.literal(2).optional(),
  contaId: IdSchema.optional(),
  aparelhoAtualId: IdSchema.optional(),
  abertura: z.object({ em: DataIsoSchema, trocoInicialCentavos: CentavosNaoNegativosSchema }),
  fechamento: z
    .object({
      em: DataIsoSchema,
      esperadoCentavos: CentavosSchema,
      contadoCentavos: CentavosNaoNegativosSchema,
      diferencaCentavos: CentavosSchema.optional(),
      conferenteId: IdSchema.optional(),
      recolhidoCentavos: CentavosNaoNegativosSchema.optional(),
      trocoRestanteCentavos: CentavosNaoNegativosSchema.optional(),
    })
    .nullable(),
  movimentos: z.array(MovimentoCaixaSchema),
});
export type Caixa = z.infer<typeof CaixaSchema>;

export const ReservarCaixaReqSchema = z.object({ id: IdSchema, trocoInicialCentavos: CentavosNaoNegativosSchema }).strict();
export const OperacaoCaixaReqSchema = z.object({ id: IdSchema, tipo: z.enum(['suprimento', 'sangria', 'retirada', 'devolucao', 'correcao_entrada', 'correcao_saida']), valorCentavos: z.number().int().positive(), motivo: z.string().trim().min(1).max(500), categoria: z.string().trim().min(1).max(100), destino: z.string().trim().min(1).max(150), originalId: IdSchema.optional() }).strict();
export const AutorizarTransferenciaReqSchema = z.object({ id: IdSchema, origemId: IdSchema, destinoId: IdSchema, valorCentavos: z.number().int().positive(), motivo: z.string().trim().min(1).max(500) }).strict();
export const ExecutarTransferenciaReqSchema = z.object({ autorizacaoId: IdSchema }).strict();
export const ConferirCaixaReqSchema = z.object({ id: IdSchema, motivo: z.string().trim().min(1).max(500) }).strict();
export const TrocarAparelhoCaixaReqSchema = z.object({ aparelhoAnteriorId: IdSchema, motivo: z.string().trim().min(1).max(500), confirmarSincronizacaoAnterior: z.literal(true) }).strict();
export const PainelCaixasSchema = z.array(z.object({ caixa: CaixaSchema, nomeOperador: z.string(), saldoCentavos: CentavosSchema, atualizadoEm: DataIsoSchema, auditoria: z.array(z.object({ id: IdSchema, tipo: z.string(), autorOperadorId: IdSchema, dados: z.record(z.string(), z.unknown()), em: DataIsoSchema })) }));
export type PainelCaixas = z.infer<typeof PainelCaixasSchema>;

// ---------- Conta e sessão ----------

export const SessaoSchema = z.object({
  token: z.string().min(1),
  contaId: IdSchema,
  lojaId: IdSchema,
  operadorId: IdSchema,
  aparelhoId: IdSchema,
  usuarioId: IdSchema.optional(),
  papel: PapelSchema.optional(),
  permissoes: PermissoesSchema.optional(),
});
export type Sessao = z.infer<typeof SessaoSchema>;

export const PerfilResSchema = z.object({ contaId: IdSchema, lojaId: IdSchema, operadorId: IdSchema, usuarioId: IdSchema.optional(), email: z.email(), nomeResponsavel: z.string(), nomeLoja: z.string(), papel: PapelSchema, permissoes: PermissoesSchema.optional() });
export const AparelhoResSchema = z.object({ id: IdSchema, nome: z.string(), criadoEm: DataIsoSchema, ultimoAcessoEm: DataIsoSchema, revogadoEm: DataIsoSchema.nullable(), atual: z.boolean() });
export const AparelhosResSchema = z.array(AparelhoResSchema);

export const CriarContaReqSchema = z.object({
  desafioCadastroId: IdSchema.optional(),
  codigoCadastro: z.string().regex(/^\d{6}$/).optional(),
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
  /** Código de uso único enviado ao e-mail pessoal. */
  codigo: z.string().regex(/^\d{6}$/),
  aparelhoId: IdSchema,
  aparelhoNome: z.string().min(1),
  operadorId: IdSchema.optional(),
  aceitarConvite: z.boolean().optional(),
});
export type LoginReq = z.infer<typeof LoginReqSchema>;
export const LoginResSchema = SessaoSchema;
export type LoginRes = Sessao;

// Prova restrita de recuperação: não autoriza rotas de negócio como uma sessão.
const TokenRecuperacaoSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const IniciarRecuperacaoReqSchema = LoginReqSchema;
export type IniciarRecuperacaoReq = z.infer<typeof IniciarRecuperacaoReqSchema>;
export const AparelhoRecuperacaoSchema = z.object({
  id: IdSchema,
  nome: z.string().min(1),
  ultimoAcessoEm: DataIsoSchema,
}).strict();
export const RecuperacaoAparelhoSchema = z.object({
  id: IdSchema,
  token: TokenRecuperacaoSchema,
  expiraEm: DataIsoSchema,
  perfil: PerfilResSchema.extend({ papel: z.literal('dono') }),
  aparelhoNovoId: IdSchema,
  aparelhoNovoNome: z.string().min(1),
  aparelhos: z.array(AparelhoRecuperacaoSchema).min(1),
}).strict().refine((d) => {
  const ids = d.aparelhos.map((a) => a.id);
  return new Set(ids).size === ids.length && !ids.includes(d.aparelhoNovoId);
}, 'Os alvos devem ser únicos e diferentes do aparelho novo.');
export type RecuperacaoAparelho = z.infer<typeof RecuperacaoAparelhoSchema>;
export const ConfirmarRecuperacaoReqSchema = z.object({
  id: IdSchema,
  token: TokenRecuperacaoSchema,
  aparelhoSubstituidoId: IdSchema,
  confirmar: z.literal(true),
}).strict();
export type ConfirmarRecuperacaoReq = z.infer<typeof ConfirmarRecuperacaoReqSchema>;

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
  cupom: z.object({
    codigo: z.string().min(1).max(40),
    percentualDesconto: z.number().int().min(1).max(99),
    duracao: z.literal('vitalicio'),
  }).nullable().optional(),
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
  codigoCupom: z.string().trim().max(40).optional(),
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

// ---------- Pagamentos integrados: Pix do Mercado Pago (N2) ----------

/**
 * `criando` → (`erro_provedor` ↔ nova tentativa) → `aguardando` → `paga` | `divergente` | `expirada` | `cancelada`.
 * `expirada`/`cancelada` → `paga_tardia` | `divergente` quando o provedor informa o pagamento depois.
 * `paga`, `paga_tardia` e `divergente` são finais. Só `paga` pode ser usada numa venda.
 */
export const ESTADOS_COBRANCA_PIX = ['criando', 'erro_provedor', 'aguardando', 'expirada', 'cancelada', 'paga', 'paga_tardia', 'divergente'] as const;
export const EstadoCobrancaPixSchema = z.enum(ESTADOS_COBRANCA_PIX);
export type EstadoCobrancaPix = z.infer<typeof EstadoCobrancaPixSchema>;

/** A credencial é do próprio lojista (Access Token do Mercado Pago). Nunca volta em resposta alguma. */
export const ConectarMercadoPagoReqSchema = z.object({
  accessToken: z.string().trim().min(10).max(500).regex(/^\S+$/),
  /** Assinatura secreta do webhook da aplicação do lojista ("Suas integrações"). Ausente = mantém a atual. */
  segredoWebhook: z.string().trim().min(8).max(500).regex(/^\S+$/).optional(),
}).strict();
export type ConectarMercadoPagoReq = z.infer<typeof ConectarMercadoPagoReqSchema>;

export const ConexaoMercadoPagoSchema = z.object({
  conectada: z.boolean(),
  /** `oauth`: conta autorizada pela tela do Mercado Pago (padrão); `token`: credencial colada (avançado). */
  modo: z.enum(['token', 'oauth']).nullable(),
  /** O Mercado Pago recusou a renovação: o dono precisa conectar de novo. Cobranças pendentes ficam como estão. */
  reautorizacaoNecessaria: z.boolean(),
  /** Só no modo token: caminho a colar, depois do endereço da API, em "Suas integrações" > Webhooks (evento Order). */
  webhookPath: z.string().nullable(),
  temSegredoWebhook: z.boolean(),
  conectadaEm: DataIsoSchema.nullable(),
  atualizadaEm: DataIsoSchema.nullable(),
}).strict();
export type ConexaoMercadoPago = z.infer<typeof ConexaoMercadoPagoSchema>;

/** Início do OAuth: o app abre esta URL (tela de autorização do Mercado Pago) no navegador. */
export const InicioOAuthMercadoPagoSchema = z.object({ url: z.url({ protocol: /^https$/ }) }).strict();
export type InicioOAuthMercadoPago = z.infer<typeof InicioOAuthMercadoPagoSchema>;

/** `pagamentoId` é o id do pagamento da venda gerado no aparelho; repetir o mesmo pedido devolve a mesma cobrança. */
export const CriarCobrancaPixReqSchema = z.object({
  vendaId: IdSchema,
  pagamentoId: IdSchema,
  valorCentavos: z.number().int().positive().max(100_000_000),
}).strict();
export type CriarCobrancaPixReq = z.infer<typeof CriarCobrancaPixReqSchema>;

export const CobrancaPixSchema = z.object({
  id: IdSchema,
  vendaId: IdSchema,
  estado: EstadoCobrancaPixSchema,
  valorCentavos: CentavosNaoNegativosSchema,
  valorPagoCentavos: CentavosNaoNegativosSchema.nullable(),
  /** Só enquanto `aguardando`: QR expirado ou pago não é mais exibido. */
  pix: z.object({ qrCode: z.string(), qrCodeBase64: z.string().nullable(), ticketUrl: z.string().nullable() }).nullable(),
  expiraEm: DataIsoSchema.nullable(),
  pagaEm: DataIsoSchema.nullable(),
  vinculadaEm: DataIsoSchema.nullable(),
  /** Estorno/contestação observados no provedor depois da confirmação (ex.: `refunded/refunded`). */
  alerta: z.string().nullable(),
  criadaEm: DataIsoSchema,
  atualizadaEm: DataIsoSchema,
}).strict();
export type CobrancaPix = z.infer<typeof CobrancaPixSchema>;
export const CobrancasPixSchema = z.array(CobrancaPixSchema);

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

/**
 * `motivo` é um código estável. Pagamentos: `pagamento_indisponivel` (provedor/meio sem integração ou
 * cobrança inexistente nesta loja) e `pagamento_nao_confirmado` (cobrança Pix do Mercado Pago que não está
 * `paga`, é de outra venda, tem outro valor, troco ou já foi usada).
 */
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
