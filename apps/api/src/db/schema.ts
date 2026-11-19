import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  BANDEIRAS,
  PLANOS_ORDEM,
  STATUS_ASSINATURA,
  type ConfiancaCatalogo,
  type FonteCatalogo,
  type Venda,
  type CupomAplicado,
  type Permissao,
  type Caixa, type MovimentoCaixa,
  ESTADOS_COBRANCA_PIX,
} from '@pdv/shared';
import type { EnvelopeCodigo } from '../email/cifrador';
import type { MotivoEntregaCodigo } from '../email/tiposEntrega';

// `satisfies` mantém as listas alinhadas com o contrato (o enum do drizzle exige uma tupla).
// Coluna `text` com enum só no TypeScript: novas fontes não exigem migração.
const FONTES_CATALOGO = ['proprio', 'open_food_facts', 'open_beauty_facts', 'open_products_facts'] as const satisfies readonly FonteCatalogo[];
const CONFIANCAS_CATALOGO = ['confirmada', 'externa'] as const satisfies readonly ConfiancaCatalogo[];

const instante = (nome: string) => timestamp(nome, { withTimezone: true, mode: 'date' });
const criadoEm = () => instante('criado_em').notNull();
const atualizadoEm = () => instante('atualizado_em').notNull();
/** Dinheiro (centavos) e quantidades (milésimos): inteiros que podem passar de 2^31. */
const inteiro = (nome: string) => bigint(nome, { mode: 'number' });

export const contas = pgTable('contas', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  documento: text('documento').notNull().unique(),
  nomeResponsavel: text('nome_responsavel').notNull(),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const lojas = pgTable('lojas', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id')
    .notNull()
    .references(() => contas.id),
  nome: text('nome').notNull(),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  nome: text('nome').notNull(),
  criadoEm: criadoEm(), atualizadoEm: atualizadoEm(),
});

export const operadores = pgTable('operadores', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id')
    .notNull()
    .references(() => contas.id),
  lojaId: uuid('loja_id')
    .notNull()
    .references(() => lojas.id),
  nome: text('nome').notNull(),
  papel: text('papel', { enum: ['dono', 'gerente', 'operador'] }).notNull(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  estado: text('estado', { enum: ['convidado', 'ativo', 'suspenso', 'desligado'] }).notNull().default('ativo'),
  permissoes: jsonb('permissoes').$type<Permissao[]>(),
  conviteExpiraEm: instante('convite_expira_em'),
  convidadoPor: uuid('convidado_por'),
  aceitoEm: instante('aceito_em'),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
}, (t) => [uniqueIndex('operadores_usuario_loja_idx').on(t.usuarioId, t.lojaId)]);

/** O id é gerado no aparelho; vale para uma conta só. */
export const aparelhos = pgTable('aparelhos', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id')
    .notNull()
    .references(() => contas.id),
  lojaId: uuid('loja_id')
    .notNull()
    .references(() => lojas.id),
  nome: text('nome').notNull(),
  criadoEm: criadoEm(),
  ultimoAcessoEm: instante('ultimo_acesso_em').notNull(),
  revogadoEm: instante('revogado_em'),
});

export const sessoes = pgTable('sessoes', {
  id: uuid('id').primaryKey(),
  /** SHA-256 do token; o token em si só existe no aparelho. */
  tokenHash: text('token_hash').notNull().unique(),
  contaId: uuid('conta_id')
    .notNull()
    .references(() => contas.id),
  lojaId: uuid('loja_id')
    .notNull()
    .references(() => lojas.id),
  operadorId: uuid('operador_id')
    .notNull()
    .references(() => operadores.id),
  aparelhoId: uuid('aparelho_id')
    .notNull()
    .references(() => aparelhos.id),
  criadoEm: criadoEm(),
  expiraEm: instante('expira_em').notNull(),
  revogadaEm: instante('revogada_em'),
});

export const codigosLogin = pgTable(
  'codigos_login',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    finalidade: text('finalidade', { enum: ['login', 'cadastro'] }).notNull().default('login'),
    aparelhoCadastroId: uuid('aparelho_cadastro_id'),
    codigoHash: text('codigo_hash').notNull(),
    expiraEm: instante('expira_em').notNull(),
    usadoEm: instante('usado_em'),
    tentativas: integer('tentativas').notNull().default(0),
    criadoEm: criadoEm(),
  },
  (t) => [index('codigos_login_email_idx').on(t.email)],
);

export const entregasCodigo = pgTable('entregas_codigo', {
  id: uuid('id').primaryKey(),
  ordemFila: bigserial('ordem_fila', { mode: 'number' }).notNull(),
  contaId: uuid('conta_id').references(() => contas.id),
  codigoId: uuid('codigo_id').notNull().unique().references(() => codigosLogin.id),
  dominioRemetente: text('dominio_remetente').notNull(),
  estado: text('estado', { enum: ['pendente', 'enviando', 'aceita', 'cancelada', 'falhou'] }).notNull(),
  chaveId: text('chave_id'), envelope: jsonb('envelope').$type<EnvelopeCodigo>(),
  tentativas: integer('tentativas').notNull().default(0),
  criadoEm: criadoEm(), atualizadoEm: atualizadoEm(), expiraEm: instante('expira_em').notNull(),
  proximaTentativaEm: instante('proxima_tentativa_em').notNull(),
  leaseToken: uuid('lease_token'), leaseExpiraEm: instante('lease_expira_em'),
  encerradoEm: instante('encerrado_em'), motivo: text('motivo').$type<MotivoEntregaCodigo>(),
}, (t) => [index('entregas_codigo_estado_proxima_idx').on(t.estado, t.proximaTentativaEm),
  index('entregas_codigo_estado_ordem_idx').on(t.estado, t.ordemFila), index('entregas_codigo_conta_idx').on(t.contaId)]);

export const recuperacoesAparelho = pgTable('recuperacoes_aparelho', {
  id: uuid('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  contaId: uuid('conta_id').notNull().references(() => contas.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  operadorId: uuid('operador_id').notNull().references(() => operadores.id),
  aparelhoNovoId: uuid('aparelho_novo_id').notNull(),
  aparelhoNovoNome: text('aparelho_novo_nome').notNull(),
  aparelhosPermitidos: jsonb('aparelhos_permitidos').$type<string[]>().notNull(),
  criadoEm: criadoEm(), expiraEm: instante('expira_em').notNull(),
  invalidadoEm: instante('invalidado_em'), confirmadoEm: instante('confirmado_em'),
  aparelhoSubstituidoId: uuid('aparelho_substituido_id').references(() => aparelhos.id),
  sessaoId: uuid('sessao_id').references(() => sessoes.id),
}, (t) => [index('recuperacoes_aparelho_conta_idx').on(t.contaId)]);

// ---------- Catálogo, vendas e caixa (sincronizados) ----------

export const produtos = pgTable(
  'produtos',
  {
    id: uuid('id').primaryKey(),
    lojaId: uuid('loja_id')
      .notNull()
      .references(() => lojas.id),
    nome: text('nome').notNull(),
    ean: text('ean'),
    precoCentavos: inteiro('preco_centavos').notNull(),
    unidade: text('unidade', { enum: ['un', 'kg'] }).notNull(),
    estoque: inteiro('estoque'),
    estoqueMinimo: inteiro('estoque_minimo'),
    atalho: boolean('atalho').notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
    excluidoEm: instante('excluido_em'),
    versao: integer('versao').notNull(),
  },
  (t) => [index('produtos_loja_idx').on(t.lojaId)],
);

export const vendas = pgTable(
  'vendas',
  {
    id: uuid('id').primaryKey(),
    lojaId: uuid('loja_id')
      .notNull()
      .references(() => lojas.id),
    aparelhoId: uuid('aparelho_id').notNull(),
    operadorId: uuid('operador_id').notNull(),
    caixaId: uuid('caixa_id').references((): AnyPgColumn => caixas.id),
    cancelamento: jsonb('cancelamento').$type<Venda['cancelamento']>(),
    fiado: jsonb('fiado').$type<Venda['fiado']>(),
    totalCentavos: inteiro('total_centavos').notNull(),
    status: text('status', { enum: ['concluida', 'cancelada'] }).notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
    excluidoEm: instante('excluido_em'),
    versao: integer('versao').notNull(),
  },
  (t) => [index('vendas_loja_idx').on(t.lojaId)],
);

export const itensVenda = pgTable('itens_venda', {
  id: uuid('id').primaryKey(),
  vendaId: uuid('venda_id')
    .notNull()
    .references(() => vendas.id),
  lojaId: uuid('loja_id')
    .notNull()
    .references(() => lojas.id),
  posicao: integer('posicao').notNull(),
  produtoId: uuid('produto_id'),
  descricao: text('descricao').notNull(),
  precoUnitarioCentavos: inteiro('preco_unitario_centavos').notNull(),
  quantidadeMilesimos: inteiro('quantidade_milesimos').notNull(),
  totalCentavos: inteiro('total_centavos').notNull(),
  criadoEm: criadoEm(),
});

export const pagamentosVenda = pgTable('pagamentos_venda', {
  id: uuid('id').primaryKey(),
  vendaId: uuid('venda_id')
    .notNull()
    .references(() => vendas.id),
  lojaId: uuid('loja_id')
    .notNull()
    .references(() => lojas.id),
  posicao: integer('posicao').notNull(),
  meio: text('meio', { enum: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'tap'] }).notNull(),
  provedor: text('provedor', { enum: ['infinitepay', 'mercadopago', 'stone', 'outro'] }),
  valorCentavos: inteiro('valor_centavos').notNull(),
  trocoCentavos: inteiro('troco_centavos').notNull(),
  criadoEm: criadoEm(),
});

/** Metadados opcionais de confirmação manual/aparelho (Stone, InfiniteTap, etc.). */
export const detalhesPagamentosVenda = pgTable('detalhes_pagamentos_venda', {
  pagamentoId: uuid('pagamento_id').primaryKey().references(() => pagamentosVenda.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  confirmacao: text('confirmacao', { enum: ['manual', 'integrado', 'aparelho'] }).notNull(),
  identificadorExterno: text('identificador_externo'),
  maquininha: text('maquininha'),
  criadoEm: criadoEm(),
}, (t) => [index('detalhes_pagamentos_venda_loja_idx').on(t.lojaId)]);

export const caixas = pgTable(
  'caixas',
  {
    id: uuid('id').primaryKey(),
    lojaId: uuid('loja_id')
      .notNull()
      .references(() => lojas.id),
    aparelhoId: uuid('aparelho_id').notNull(),
    operadorId: uuid('operador_id').notNull(),
    abertoEm: instante('aberto_em').notNull(),
    trocoInicialCentavos: inteiro('troco_inicial_centavos').notNull(),
    fechadoEm: instante('fechado_em'),
    esperadoCentavos: inteiro('esperado_centavos'),
    contadoCentavos: inteiro('contado_centavos'),
    reservado: boolean('reservado').notNull().default(false),
    detalhes: jsonb('detalhes').$type<Pick<Caixa, 'versaoContrato' | 'contaId' | 'aparelhoAtualId' | 'fechamento'>>(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
    excluidoEm: instante('excluido_em'),
    versao: integer('versao').notNull(),
  },
  (t) => [index('caixas_loja_idx').on(t.lojaId), uniqueIndex('caixas_reserva_ativa_idx').on(t.lojaId, t.operadorId).where(sql`${t.reservado} = true and ${t.fechadoEm} is null`)],
);

export const movimentosCaixa = pgTable('movimentos_caixa', {
  id: uuid('id').primaryKey(),
  caixaId: uuid('caixa_id')
    .notNull()
    .references(() => caixas.id),
  lojaId: uuid('loja_id')
    .notNull()
    .references(() => lojas.id),
  tipo: text('tipo', { enum: ['sangria', 'suprimento', 'retirada', 'transferencia_entrada', 'transferencia_saida', 'devolucao', 'correcao_entrada', 'correcao_saida', 'recebimento_fiado', 'estorno_fiado'] }).notNull(),
  valorCentavos: inteiro('valor_centavos').notNull(),
  motivo: text('motivo'),
  detalhes: jsonb('detalhes').$type<MovimentoCaixa>(),
  criadoEm: criadoEm(),
});

/** Eventos de autorização, troca de aparelho e conferência; nunca substituem o histórico financeiro. */
export const auditoriaCaixa = pgTable('auditoria_caixa', {
  id: uuid('id').primaryKey(),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  caixaId: uuid('caixa_id').notNull().references(() => caixas.id),
  autorOperadorId: uuid('autor_operador_id').notNull(),
  tipo: text('tipo').notNull(),
  dados: jsonb('dados').$type<Record<string, unknown>>().notNull(),
  criadoEm: criadoEm(),
}, t => [index('auditoria_caixa_loja_idx').on(t.lojaId, t.caixaId)]);

// ---------- Catálogo por código de barras ----------

/** Sugestões de cadastro por EAN. Nunca guarda preço; vale para todas as lojas. */
export const catalogoEan = pgTable('catalogo_ean', {
  ean: text('ean').primaryKey(),
  nome: text('nome').notNull(),
  marca: text('marca'),
  conteudo: text('conteudo'),
  imagemUrl: text('imagem_url'),
  fonte: text('fonte', { enum: FONTES_CATALOGO }).notNull(),
  confianca: text('confianca', { enum: CONFIANCAS_CATALOGO }).notNull(),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

/** Nome que cada loja confirmou para um EAN. O `loja_id` nunca sai pela API. */
export const catalogoEanConfirmacoes = pgTable(
  'catalogo_ean_confirmacoes',
  {
    ean: text('ean').notNull(),
    lojaId: uuid('loja_id')
      .notNull()
      .references(() => lojas.id),
    nome: text('nome').notNull(),
    nomeNormalizado: text('nome_normalizado').notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [primaryKey({ columns: [t.ean, t.lojaId] })],
);

// ---------- Sincronização ----------

/**
 * Cursor do pull: cada escrita sincronizável acrescenta uma linha aqui, e `seq` é a
 * sequência monotônica global. O pull lê só este índice, sem UNION entre as tabelas.
 */
export const mudancas = pgTable(
  'mudancas',
  {
    seq: bigserial('seq', { mode: 'number' }).primaryKey(),
    lojaId: uuid('loja_id')
      .notNull()
      .references(() => lojas.id),
    entidade: text('entidade', { enum: ['produto', 'venda', 'caixa'] }).notNull(),
    entidadeId: uuid('entidade_id').notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [index('mudancas_loja_seq_idx').on(t.lojaId, t.seq)],
);

/** Só mutações aceitas: é por aqui que um reenvio da outbox vira no-op. */
export const mutacoesAplicadas = pgTable(
  'mutacoes_aplicadas',
  {
    id: uuid('id').notNull(),
    lojaId: uuid('loja_id')
      .notNull()
      .references(() => lojas.id),
    aparelhoId: uuid('aparelho_id').notNull(),
    criadoEm: criadoEm(),
  },
  (t) => [primaryKey({ columns: [t.lojaId, t.id] })],
);

// ---------- Assinatura e cobrança ----------

export const assinaturas = pgTable('assinaturas', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id')
    .notNull()
    .unique()
    .references(() => contas.id),
  planoId: text('plano_id', { enum: PLANOS_ORDEM }).notNull(),
  status: text('status', { enum: STATUS_ASSINATURA }).notNull(),
  criadaEm: instante('criada_em').notNull(),
  testeTerminaEm: instante('teste_termina_em').notNull(),
  periodoAtualInicio: instante('periodo_atual_inicio').notNull(),
  periodoAtualFim: instante('periodo_atual_fim').notNull(),
  acessoAte: instante('acesso_ate'),
  inadimplenteDesde: instante('inadimplente_desde'),
  tentativasFalhas: integer('tentativas_falhas').notNull(),
  proximaTentativaEm: instante('proxima_tentativa_em'),
  canceladaEm: instante('cancelada_em'),
  planoAgendado: text('plano_agendado', { enum: PLANOS_ORDEM }),
  cupom: jsonb('cupom').$type<CupomAplicado>(),
  cartaoBandeira: text('cartao_bandeira', { enum: BANDEIRAS }),
  cartaoUltimos4: text('cartao_ultimos4'),
  cartaoFingerprint: text('cartao_fingerprint'),
  /** Referência do cliente no gateway: nunca sai pela API. */
  clienteRef: text('cliente_ref'),
  atualizadoEm: atualizadoEm(),
});

export const faturas = pgTable(
  'faturas',
  {
    id: uuid('id').primaryKey(),
    assinaturaId: uuid('assinatura_id')
      .notNull()
      .references(() => assinaturas.id),
    contaId: uuid('conta_id')
      .notNull()
      .references(() => contas.id),
    valorCentavos: inteiro('valor_centavos').notNull(),
    tipo: text('tipo', { enum: ['primeira', 'renovacao', 'retentativa', 'prorata'] }).notNull(),
    status: text('status', { enum: ['pendente', 'aprovada', 'recusada'] }).notNull(),
    transacaoId: text('transacao_id'),
    motivoRecusa: text('motivo_recusa'),
    chaveIdempotencia: text('chave_idempotencia').notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex('faturas_chave_idempotencia_idx').on(t.chaveIdempotencia),
    index('faturas_assinatura_idx').on(t.assinaturaId),
  ],
);

export const eventosCobranca = pgTable(
  'eventos_cobranca',
  {
    id: uuid('id').primaryKey(),
    assinaturaId: uuid('assinatura_id')
      .notNull()
      .references(() => assinaturas.id),
    contaId: uuid('conta_id')
      .notNull()
      .references(() => contas.id),
    tipo: text('tipo').notNull(),
    dados: jsonb('dados').$type<Record<string, unknown>>().notNull(),
    /** Preenchida nos eventos que só podem ocorrer uma vez (ex.: lembrete de fim do teste). */
    chaveUnica: text('chave_unica').unique(),
    criadoEm: criadoEm(),
  },
  (t) => [index('eventos_cobranca_assinatura_idx').on(t.assinaturaId)],
);

/** Um teste grátis por documento e por cartão (fingerprint do gateway). */
export const testesUsados = pgTable('testes_usados', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id')
    .notNull()
    .references(() => contas.id),
  documento: text('documento').notNull().unique(),
  fingerprint: text('fingerprint').notNull().unique(),
  criadoEm: criadoEm(),
});

export const limitesAuth = pgTable('limites_auth', {
  chave: text('chave').primaryKey(),
  janelaInicio: instante('janela_inicio').notNull(),
  usos: integer('usos').notNull(),
  ultimoUsoEm: instante('ultimo_uso_em'),
});

// ---------- Gestão R4: eventos imutáveis e cadastros por loja ----------
export const movimentosEstoque = pgTable('movimentos_estoque', {
  id: uuid('id').primaryKey(), lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  produtoId: uuid('produto_id').notNull().references(() => produtos.id),
  tipo: text('tipo', { enum: ['inicial', 'entrada', 'ajuste', 'venda', 'devolucao'] }).notNull(),
  quantidadeMilesimos: inteiro('quantidade_milesimos').notNull(), motivo: text('motivo').notNull(),
  itemVendaId: uuid('item_venda_id'), operadorId: uuid('operador_id'), aparelhoId: uuid('aparelho_id'), criadoEm: criadoEm(),
}, t => [index('movimentos_estoque_produto_idx').on(t.lojaId, t.produtoId),
  uniqueIndex('movimentos_estoque_baixa_item_idx').on(t.itemVendaId).where(sql`${t.tipo} = 'venda'`)]);
export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey(), lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  nome: text('nome').notNull(), contato: text('contato').notNull(), criadoEm: criadoEm(),
}, t => [index('clientes_loja_idx').on(t.lojaId)]);
export const eventosFiado = pgTable('eventos_fiado', {
  id: uuid('id').primaryKey(), lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  vendaId: uuid('venda_id').notNull().references(() => vendas.id), operadorId: uuid('operador_id').notNull(),
  aparelhoId: uuid('aparelho_id').notNull(), tipo: text('tipo', { enum: ['recebimento', 'estorno'] }).notNull(),
  valorCentavos: inteiro('valor_centavos').notNull(), meio: text('meio', { enum: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'] }).notNull(),
  caixaId: uuid('caixa_id').references(() => caixas.id), originalId: uuid('original_id'), motivo: text('motivo').notNull(), criadoEm: criadoEm(),
}, t => [index('eventos_fiado_venda_idx').on(t.lojaId, t.vendaId), uniqueIndex('eventos_fiado_estorno_idx').on(t.originalId)]);
/** Solicitações pessoais: nunca são compartilhadas com o dono ou outros operadores. */
export const solicitacoesSuporte = pgTable('solicitacoes_suporte', {
  id: uuid('id').primaryKey(), contaId: uuid('conta_id').notNull().references(() => contas.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  operadorId: uuid('operador_id').notNull().references(() => operadores.id),
  aparelhoId: uuid('aparelho_id').notNull().references(() => aparelhos.id),
  tipo: text('tipo', { enum: ['suporte', 'exclusao'] }).notNull(), mensagem: text('mensagem').notNull(),
  diagnostico: jsonb('diagnostico').$type<import('@pdv/shared').SolicitarSuporte['diagnostico']>(),
  versaoPoliticas: text('versao_politicas').notNull(),
  estado: text('estado', { enum: ['aberto', 'em_analise', 'concluido'] }).notNull().default('aberto'),
  resposta: text('resposta'), criadoEm: criadoEm(), atualizadoEm: atualizadoEm(),
}, t => [index('solicitacoes_suporte_perfil_idx').on(t.contaId, t.lojaId, t.operadorId)]);

// ---------- Pagamentos integrados (N2: Pix do Mercado Pago) ----------

/** Envelope AES-256-GCM da credencial do lojista; o texto em claro nunca é gravado. */
export type EnvelopePagamento = { versao: 1; iv: string; tag: string; conteudo: string };


/** Corpo do pedido enviado ao provedor, guardado para que toda nova tentativa reenvie exatamente o mesmo. Sem segredos. */
export interface PedidoPixGravado {
  valorCentavos: number;
  referenciaExterna: string;
  expiracao: string;
  pagadorEmail: string;
  pagadorPrimeiroNome: string | null;
  descricao?: string;
}

/** Credencial do próprio lojista no provedor, por loja. Desligar apaga a credencial e mantém o histórico. */
export const conexoesPagamento = pgTable('conexoes_pagamento', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id').notNull().references(() => contas.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  provedor: text('provedor', { enum: ['mercadopago', 'infinitepay'] }).notNull(),
  /** Identificador aleatório usado na URL do webhook; não é segredo (a proteção é a assinatura HMAC ou consulta no servidor). */
  publicoId: text('publico_id').notNull().unique(),
  /** Handle (InfiniteTag) do lojista na InfinitePay, quando aplicável. */
  handle: text('handle'),
  tokenEnvelope: jsonb('token_envelope').$type<EnvelopePagamento>(),
  segredoWebhookEnvelope: jsonb('segredo_webhook_envelope').$type<EnvelopePagamento>(),
  contaProvedorId: text('conta_provedor_id'),
  ativa: boolean('ativa').notNull(),
  /** `token`: o lojista colou o próprio Access Token; `oauth`: autorizou a aplicação da plataforma. */
  modo: text('modo', { enum: ['token', 'oauth'] }).notNull().default('token'),
  /** Só OAuth: refresh token cifrado, vencimento do access token e ambiente informado pelo Mercado Pago. */
  refreshTokenEnvelope: jsonb('refresh_token_envelope').$type<EnvelopePagamento>(),
  tokenExpiraEm: instante('token_expira_em'),
  liveMode: boolean('live_mode'),
  /** Incrementada a cada troca de tokens: a renovação só grava se ninguém renovou antes (sem perder o refresh token girado). */
  versaoToken: integer('versao_token').notNull().default(0),
  /** Trava curta: uma renovação por vez por conexão. */
  renovandoAte: instante('renovando_ate'),
  /** O Mercado Pago recusou a renovação (`invalid_grant`): o dono precisa autorizar de novo. */
  reautorizarDesde: instante('reautorizar_desde'),
  /** `refresh_recusado` ou `refresh_girado_sem_resposta` (uma renovação anterior ficou sem resposta gravada). */
  reautorizarMotivo: text('reautorizar_motivo'),
  /** Última renovação gravada: um 401 logo depois não dispara outra renovação. */
  tokenRenovadoEm: instante('token_renovado_em'),
  /** Uma renovação terminou sem resposta gravada (timeout, queda): o refresh pode ter girado no provedor. */
  refreshSemRespostaEm: instante('refresh_sem_resposta_em'),
  /** Dica de `mp-connect`: conferir a conexão (consulta barata) a partir deste instante; não mexe no vencimento. */
  revisarEm: instante('revisar_em'),
  /** Recuo do job de renovação depois de falhas: quem falha não ocupa a vez dos outros. */
  proximaRenovacaoEm: instante('proxima_renovacao_em'),
  falhasRenovacao: integer('falhas_renovacao').notNull().default(0),
  criadoPor: uuid('criado_por').notNull(),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
  desativadaEm: instante('desativada_em'),
}, (t) => [
  uniqueIndex('conexoes_pagamento_ativa_idx').on(t.lojaId, t.provedor).where(sql`${t.ativa} = true`),
  index('conexoes_pagamento_renovacao_idx').on(t.tokenExpiraEm).where(sql`${t.ativa} = true and ${t.modo} = 'oauth'`),
]);

/**
 * `state` do OAuth: uso único, 10 min, ligado à loja e ao dono que iniciou. Só o hash do `state` é gravado;
 * o `code_verifier` do PKCE fica cifrado e é apagado ao concluir.
 */
export const estadosOauthPagamento = pgTable('estados_oauth_pagamento', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id').notNull().references(() => contas.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  operadorId: uuid('operador_id').notNull().references(() => operadores.id),
  provedor: text('provedor', { enum: ['mercadopago'] }).notNull(),
  estadoHash: text('estado_hash').notNull().unique(),
  verificadorEnvelope: jsonb('verificador_envelope').$type<EnvelopePagamento>(),
  criadoEm: criadoEm(),
  expiraEm: instante('expira_em').notNull(),
  usadoEm: instante('usado_em'),
  invalidadoEm: instante('invalidado_em'),
  resultado: text('resultado'),
}, (t) => [index('estados_oauth_pagamento_loja_idx').on(t.lojaId)]);

/** Cobrança integrada criada pelo servidor (Mercado Pago Pix ou InfinitePay Checkout). O `id` é o id do pagamento da venda. */
export const cobrancasPagamento = pgTable('cobrancas_pagamento', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id').notNull().references(() => contas.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  conexaoId: uuid('conexao_id').notNull().references(() => conexoesPagamento.id),
  /** Venda ainda não sincronizada: sem FK, conferida no sync. */
  vendaId: uuid('venda_id').notNull(),
  operadorId: uuid('operador_id').notNull(),
  aparelhoId: uuid('aparelho_id').notNull(),
  provedor: text('provedor', { enum: ['mercadopago', 'infinitepay'] }).notNull(),
  meio: text('meio', { enum: ['pix', 'cartao_credito', 'cartao_debito'] }).notNull(),
  valorCentavos: inteiro('valor_centavos').notNull(),
  estado: text('estado', { enum: ESTADOS_COBRANCA_PIX }).notNull(),
  chaveIdempotencia: text('chave_idempotencia').notNull().unique(),
  pedido: jsonb('pedido').$type<PedidoPixGravado>().notNull(),
  pedidoProvedorId: text('pedido_provedor_id').unique(),
  checkoutUrl: text('checkout_url'),
  transacaoProvedorId: text('transacao_provedor_id'),
  slugProvedor: text('slug_provedor'),
  statusProvedor: text('status_provedor'),
  detalheProvedor: text('detalhe_provedor'),
  valorPagoCentavos: inteiro('valor_pago_centavos'),
  qrCode: text('qr_code'),
  qrCodeBase64: text('qr_code_base64'),
  ticketUrl: text('ticket_url'),
  expiraEm: instante('expira_em'),
  /** Trava curta da criação no provedor: duas requisições iguais não chamam o provedor ao mesmo tempo. */
  leaseAte: instante('lease_ate'),
  consultadoEm: instante('consultado_em'),
  /** Próxima conferência pela conciliação; `null` = não conferir mais (estado final ou fim da janela de 24 h). */
  proximaConsultaEm: instante('proxima_consulta_em'),
  /** Falhas seguidas de consulta ao provedor: alimentam o recuo exponencial. */
  falhasConsulta: integer('falhas_consulta').notNull().default(0),
  tentativas: integer('tentativas').notNull().default(0),
  ultimoErro: text('ultimo_erro'),
  /** Estorno ou contestação observados depois da confirmação: só informam o dono, nunca desfazem a venda. */
  alerta: text('alerta'),
  pagaEm: instante('paga_em'),
  vinculadaEm: instante('vinculada_em'),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
}, (t) => [
  index('cobrancas_pagamento_loja_estado_idx').on(t.lojaId, t.estado),
  index('cobrancas_pagamento_proxima_consulta_idx').on(t.proximaConsultaEm).where(sql`${t.proximaConsultaEm} is not null`),
  // O webhook procura a order da loja sem diferenciar maiúsculas (o manifesto da assinatura usa minúsculas).
  index('cobrancas_pagamento_loja_pedido_idx').on(t.lojaId, sql`lower(${t.pedidoProvedorId})`),
  // Webhook da aplicação da plataforma (OAuth): a order chega sem a loja; a busca é por todas as lojas.
  index('cobrancas_pagamento_pedido_lower_idx').on(sql`lower(${t.pedidoProvedorId})`),
]);

/** Auditoria de criação, consultas, avisos e cancelamentos. Sem credenciais nem QR. */
export const eventosCobrancaPagamento = pgTable('eventos_cobranca_pagamento', {
  id: uuid('id').primaryKey(),
  cobrancaId: uuid('cobranca_id').notNull().references(() => cobrancasPagamento.id),
  lojaId: uuid('loja_id').notNull().references(() => lojas.id),
  tipo: text('tipo').notNull(),
  dados: jsonb('dados').$type<Record<string, unknown>>().notNull(),
  criadoEm: criadoEm(),
}, (t) => [index('eventos_cobranca_pagamento_cobranca_idx').on(t.cobrancaId)]);

/** Assinaturas vinculadas à Google Play Billing (PurchaseToken cifrado por hash). */
export const assinaturasPlay = pgTable('assinaturas_play', {
  id: uuid('id').primaryKey(),
  contaId: uuid('conta_id').notNull().references(() => contas.id),
  assinaturaId: uuid('assinatura_id').notNull().references(() => assinaturas.id),
  packageName: text('package_name').notNull(),
  productId: text('product_id').notNull(),
  purchaseTokenHash: text('purchase_token_hash').notNull().unique(),
  orderId: text('order_id'),
  estadoPlay: text('estado_play').notNull(),
  acknowledgedEm: instante('acknowledged_em'),
  emTesteGratis: boolean('em_teste_gratis').notNull().default(false),
  autoRenewEnabled: boolean('auto_renew_enabled').notNull().default(true),
  inicioEm: instante('inicio_em'),
  expiraEm: instante('expira_em').notNull(),
  ultimaNotificacaoEm: instante('ultima_notificacao_em'),
  ultimoEventoOrdem: bigint('ultimo_evento_ordem', { mode: 'number' }).notNull().default(0),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
}, (t) => [
  index('assinaturas_play_conta_idx').on(t.contaId),
  index('assinaturas_play_assinatura_idx').on(t.assinaturaId),
]);
