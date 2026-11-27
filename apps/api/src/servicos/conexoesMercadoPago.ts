import { randomBytes } from 'node:crypto';
import { and, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { gerarId, type ConexaoMercadoPago, type Relogio } from '@pdv/shared';
import type { ConfiguracaoOAuthMercadoPago } from '../configuracao';
import type { Db } from '../db/conexao';
import { cobrancasPagamento, conexoesPagamento, estadosOauthPagamento } from '../db/schema';
import { ErroApi } from '../erros';
import type { CifradorPagamentos } from '../pagamentos/cifrador';
import { ErroProvedorMp, type ProvedorMercadoPago } from '../pagamentos/mercadoPago';

/**
 * Conexão da loja com o Mercado Pago, nos dois modos:
 * - `token`: o lojista colou o Access Token da própria aplicação (avançado; também usado na homologação de sandbox);
 * - `oauth`: o lojista autorizou a aplicação da plataforma; tokens renovados pelo refresh token, que gira a cada uso.
 * Toda chamada ao provedor usa a conexão ATIVA da loja, não a que criou a cobrança.
 */

export type Conexao = typeof conexoesPagamento.$inferSelect;

export interface AmbienteConexao {
  db: Db;
  relogio: Relogio;
  cifrador: CifradorPagamentos;
  provedor: ProvedorMercadoPago;
  oauth: ConfiguracaoOAuthMercadoPago | null;
}

/** Sem data de expiração na resposta: o padrão documentado do Mercado Pago (180 dias). */
export const VALIDADE_PADRAO_TOKEN_MS = 180 * 24 * 60 * 60_000;
const TRAVA_RENOVACAO_MS = 30_000;
const ESPERA_RENOVACAO_MS = 100;
const TENTATIVAS_ESPERA_RENOVACAO = 30;

export const webhookPath = (publicoId: string): string => `/webhooks/pdv-mercadopago/${publicoId}`;

export async function conexaoAtiva(db: Db, lojaId: string): Promise<Conexao | undefined> {
  const [c] = await db.select().from(conexoesPagamento)
    .where(and(eq(conexoesPagamento.lojaId, lojaId), eq(conexoesPagamento.provedor, 'mercadopago'), eq(conexoesPagamento.ativa, true)));
  return c;
}

export function serializarConexao(c: Conexao | undefined): ConexaoMercadoPago {
  if (!c) return { conectada: false, modo: null, reautorizacaoNecessaria: false, webhookPath: null, temSegredoWebhook: false, conectadaEm: null, atualizadaEm: null };
  return {
    conectada: true,
    modo: c.modo,
    reautorizacaoNecessaria: c.reautorizarDesde !== null,
    // OAuth usa o webhook único da aplicação da plataforma; a URL por conexão é só do modo token.
    webhookPath: c.modo === 'token' ? webhookPath(c.publicoId) : null,
    temSegredoWebhook: c.segredoWebhookEnvelope !== null,
    conectadaEm: c.criadoEm.toISOString(),
    atualizadaEm: c.atualizadoEm.toISOString(),
  };
}

/** Erro de unicidade do PostgreSQL (23505), direto ou embrulhado pelo drizzle. */
export function violacaoUnica(erro: unknown): boolean {
  for (let e: any = erro, i = 0; e && i < 4; e = e.cause, i++) if (e.code === '23505') return true;
  return false;
}

export type CredencialConexao =
  | { modo: 'token'; accessToken: string; segredoWebhook?: string; contaProvedorId: string | null }
  | { modo: 'oauth'; accessToken: string; refreshToken: string | null; tokenExpiraEm: Date; liveMode: boolean | null; contaProvedorId: string | null };

/**
 * Conecta ou troca a credencial da loja (mantém o id e a URL de webhook da conexão ativa). Duas primeiras conexões
 * simultâneas: a segunda bate no índice único parcial e é refeita como troca. Ao final, pendências que vinham
 * falhando voltam à fila da conciliação.
 */
export async function salvarConexao(amb: AmbienteConexao, dono: { contaId: string; lojaId: string; operadorId: string }, credencial: CredencialConexao, agora: Date): Promise<{ conexao: Conexao; criada: boolean }> {
  let resultado: { conexao: Conexao; criada: boolean };
  try {
    resultado = await gravarConexao(amb, dono, credencial, agora);
  } catch (erro) {
    if (!violacaoUnica(erro)) throw erro;
    resultado = await gravarConexao(amb, dono, credencial, agora);
  }
  await amb.db.update(cobrancasPagamento).set({ proximaConsultaEm: agora, falhasConsulta: 0 })
    .where(and(eq(cobrancasPagamento.lojaId, dono.lojaId), inArray(cobrancasPagamento.estado, ['aguardando', 'expirada', 'cancelada']),
      isNotNull(cobrancasPagamento.pedidoProvedorId), isNotNull(cobrancasPagamento.proximaConsultaEm), gt(cobrancasPagamento.falhasConsulta, 0)));
  return resultado;
}

async function gravarConexao(amb: AmbienteConexao, dono: { contaId: string; lojaId: string; operadorId: string }, credencial: CredencialConexao, agora: Date): Promise<{ conexao: Conexao; criada: boolean }> {
  return amb.db.transaction(async (tx) => {
    const [atual] = await tx.select().from(conexoesPagamento)
      .where(and(eq(conexoesPagamento.lojaId, dono.lojaId), eq(conexoesPagamento.provedor, 'mercadopago'), eq(conexoesPagamento.ativa, true))).for('update');
    const id = atual?.id ?? gerarId();
    const contexto = { lojaId: dono.lojaId, conexaoId: id };
    const comum = {
      modo: credencial.modo,
      tokenEnvelope: amb.cifrador.cifrar(credencial.accessToken, { ...contexto, campo: 'token' }),
      contaProvedorId: credencial.contaProvedorId ?? (atual?.modo === credencial.modo ? atual.contaProvedorId : null),
      versaoToken: (atual?.versaoToken ?? 0) + 1,
      renovandoAte: null,
      reautorizarDesde: null,
      reautorizarMotivo: null,
      tokenRenovadoEm: credencial.modo === 'oauth' ? agora : null,
      refreshSemRespostaEm: null,
      revisarEm: null,
      proximaRenovacaoEm: null,
      falhasRenovacao: 0,
      atualizadoEm: agora,
    };
    const especifico = credencial.modo === 'oauth'
      ? {
          refreshTokenEnvelope: credencial.refreshToken ? amb.cifrador.cifrar(credencial.refreshToken, { ...contexto, campo: 'refresh_token' }) : null,
          tokenExpiraEm: credencial.tokenExpiraEm,
          liveMode: credencial.liveMode,
          // O OAuth usa a assinatura da aplicação da plataforma; segredo por conexão não se aplica.
          segredoWebhookEnvelope: null,
        }
      : {
          refreshTokenEnvelope: null,
          tokenExpiraEm: null,
          liveMode: null,
          segredoWebhookEnvelope: credencial.segredoWebhook !== undefined
            ? amb.cifrador.cifrar(credencial.segredoWebhook, { ...contexto, campo: 'segredo_webhook' })
            : (atual?.modo === 'token' ? atual.segredoWebhookEnvelope : null),
        };
    if (atual) {
      const [salva] = await tx.update(conexoesPagamento).set({ ...comum, ...especifico }).where(eq(conexoesPagamento.id, id)).returning();
      return { conexao: salva!, criada: false };
    }
    const [salva] = await tx.insert(conexoesPagamento).values({
      id, contaId: dono.contaId, lojaId: dono.lojaId, provedor: 'mercadopago', publicoId: randomBytes(32).toString('base64url'),
      ativa: true, criadoPor: dono.operadorId, criadoEm: agora, ...comum, ...especifico,
    }).returning();
    return { conexao: salva!, criada: true };
  });
}

/**
 * Desliga e APAGA as credenciais cifradas (token, refresh, segredo); cobranças e eventos ficam no histórico.
 * Incrementa `versaoToken`: uma renovação em curso não consegue gravar tokens de volta nesta conexão.
 */
export async function desconectar(amb: Pick<AmbienteConexao, 'db' | 'relogio'>, lojaId: string): Promise<void> {
  const agora = amb.relogio.agora();
  await amb.db.update(conexoesPagamento)
    .set({ ativa: false, tokenEnvelope: null, refreshTokenEnvelope: null, segredoWebhookEnvelope: null, renovandoAte: null, revisarEm: null,
      versaoToken: sql`${conexoesPagamento.versaoToken} + 1`, desativadaEm: agora, atualizadoEm: agora })
    .where(and(eq(conexoesPagamento.lojaId, lojaId), eq(conexoesPagamento.provedor, 'mercadopago'), eq(conexoesPagamento.ativa, true)));
}

const naoConectado = () => new ErroApi(409, 'mercadopago_nao_conectado', 'Conecte o Mercado Pago da loja para cobrar por Pix.');
export const reautorizar = () => new ErroApi(409, 'mercadopago_reautorizar', 'O Mercado Pago pediu uma nova autorização. O dono precisa conectar a conta de novo.');

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
/** Um 401 até 5 min depois de uma renovação gravada não renova de novo (evita girar o refresh em laço). */
export const RENOVACAO_RECENTE_MS = 5 * 60_000;

/** Condição de toda escrita da renovação: mesma conexão, ainda ativa e sem troca de tokens desde a leitura. */
const mesmaVersao = (c: Pick<Conexao, 'id' | 'versaoToken'>) =>
  and(eq(conexoesPagamento.id, c.id), eq(conexoesPagamento.versaoToken, c.versaoToken), eq(conexoesPagamento.ativa, true));

/**
 * Renova o access token OAuth com o refresh token (que gira). Uma renovação por vez por conexão (trava curta);
 * quem chega durante a renovação espera o resultado e usa o token novo. Toda gravação exige a mesma `versaoToken`
 * e a conexão ativa: desconectar ou trocar a credencial no meio invalida a renovação em curso, e o refresh token
 * girado nunca é sobrescrito por um mais antigo. `invalid_grant` marca a conexão para nova autorização (com o
 * motivo `refresh_girado_sem_resposta` quando uma renovação anterior ficou sem resposta gravada).
 */
export async function renovarConexao(amb: AmbienteConexao, lida: Conexao): Promise<string> {
  if (!amb.oauth) throw naoConectado();
  const agora = amb.relogio.agora();
  const [travada] = await amb.db.update(conexoesPagamento).set({
    renovandoAte: new Date(agora.getTime() + TRAVA_RENOVACAO_MS),
    // Trava vencida de uma renovação anterior = ela morreu sem gravar (queda/timeout): o refresh pode ter girado.
    refreshSemRespostaEm: sql`case when ${conexoesPagamento.renovandoAte} is not null then coalesce(${conexoesPagamento.refreshSemRespostaEm}, ${agora.toISOString()}::timestamptz) else ${conexoesPagamento.refreshSemRespostaEm} end`,
  }).where(and(mesmaVersao(lida), isNull(conexoesPagamento.reautorizarDesde),
    or(isNull(conexoesPagamento.renovandoAte), lte(conexoesPagamento.renovandoAte, agora))))
    .returning();
  if (!travada) {
    for (let i = 0; i < TENTATIVAS_ESPERA_RENOVACAO; i++) {
      const [atual] = await amb.db.select().from(conexoesPagamento).where(eq(conexoesPagamento.id, lida.id));
      if (!atual?.ativa || !atual.tokenEnvelope) throw naoConectado();
      if (atual.reautorizarDesde) throw reautorizar();
      if (atual.versaoToken !== lida.versaoToken) return amb.cifrador.decifrar(atual.tokenEnvelope, { lojaId: atual.lojaId, conexaoId: atual.id, campo: 'token' });
      await esperar(ESPERA_RENOVACAO_MS);
    }
    throw new ErroProvedorMp('indisponivel');
  }
  const contexto = { lojaId: travada.lojaId, conexaoId: travada.id };
  const marcarReautorizacao = async () => {
    await amb.db.update(conexoesPagamento)
      .set({ reautorizarDesde: amb.relogio.agora(), reautorizarMotivo: travada.refreshSemRespostaEm ? 'refresh_girado_sem_resposta' : 'refresh_recusado', renovandoAte: null })
      .where(mesmaVersao(travada));
    return reautorizar();
  };
  if (!travada.refreshTokenEnvelope) throw await marcarReautorizacao();
  const refresh = amb.cifrador.decifrar(travada.refreshTokenEnvelope, { ...contexto, campo: 'refresh_token' });
  let tokens;
  try {
    tokens = await amb.provedor.renovarToken(amb.oauth, refresh);
  } catch (erro) {
    if (erro instanceof ErroProvedorMp && erro.tipo === 'concessao_invalida') throw await marcarReautorizacao();
    // Sem resposta confiável: o Mercado Pago pode ter girado o refresh. Fica registrado para diagnóstico.
    const semResposta = !(erro instanceof ErroProvedorMp) || erro.tipo === 'indisponivel' || erro.tipo === 'resposta_invalida';
    await amb.db.update(conexoesPagamento)
      .set({ renovandoAte: null, ...(semResposta ? { refreshSemRespostaEm: sql`coalesce(${conexoesPagamento.refreshSemRespostaEm}, ${amb.relogio.agora().toISOString()}::timestamptz)` } : {}) })
      .where(eq(conexoesPagamento.id, travada.id));
    throw erro;
  }
  const fim = amb.relogio.agora();
  const [salva] = await amb.db.update(conexoesPagamento).set({
    tokenEnvelope: amb.cifrador.cifrar(tokens.accessToken, { ...contexto, campo: 'token' }),
    // Sem refresh novo na resposta, mantém o atual (o Mercado Pago documenta que ele gira; isto é só defesa).
    refreshTokenEnvelope: tokens.refreshToken ? amb.cifrador.cifrar(tokens.refreshToken, { ...contexto, campo: 'refresh_token' }) : travada.refreshTokenEnvelope,
    tokenExpiraEm: new Date(fim.getTime() + (tokens.expiraEmSegundos ? tokens.expiraEmSegundos * 1000 : VALIDADE_PADRAO_TOKEN_MS)),
    liveMode: tokens.liveMode ?? travada.liveMode,
    contaProvedorId: tokens.contaProvedorId ?? travada.contaProvedorId,
    versaoToken: sql`${conexoesPagamento.versaoToken} + 1`,
    tokenRenovadoEm: fim,
    refreshSemRespostaEm: null,
    renovandoAte: null,
    proximaRenovacaoEm: null,
    falhasRenovacao: 0,
    atualizadoEm: fim,
  }).where(mesmaVersao(travada)).returning();
  if (!salva) throw naoConectado();
  return tokens.accessToken;
}

/**
 * Executa `usar` com o token da conexão ativa da loja. OAuth: renova antes se o token venceu e, num 401 do
 * provedor, renova uma vez e tenta de novo uma vez, a menos que o token tenha sido renovado há menos de 5 min.
 * 403 (`acesso_negado`) nunca renova: segue o recuo normal de falha. Modo token: nenhuma renovação.
 */
export async function comTokenDaLoja<T>(amb: AmbienteConexao, lojaId: string, usar: (token: string, contaProvedorId: string | null) => Promise<T>): Promise<T> {
  const conexao = await conexaoAtiva(amb.db, lojaId);
  if (!conexao?.tokenEnvelope) throw naoConectado();
  if (conexao.reautorizarDesde) throw reautorizar();
  const agora = amb.relogio.agora();
  const vencido = conexao.modo === 'oauth' && conexao.tokenExpiraEm !== null && conexao.tokenExpiraEm <= agora;
  const token = vencido
    ? await renovarConexao(amb, conexao)
    : amb.cifrador.decifrar(conexao.tokenEnvelope, { lojaId: conexao.lojaId, conexaoId: conexao.id, campo: 'token' });
  try {
    return await usar(token, conexao.contaProvedorId);
  } catch (erro) {
    const recente = conexao.tokenRenovadoEm !== null && agora.getTime() - conexao.tokenRenovadoEm.getTime() < RENOVACAO_RECENTE_MS;
    if (conexao.modo !== 'oauth' || vencido || recente || !(erro instanceof ErroProvedorMp && erro.tipo === 'credencial_invalida')) throw erro;
    return usar(await renovarConexao(amb, conexao), conexao.contaProvedorId);
  }
}

export interface ResumoRenovacao {
  renovadas: number;
  revisadas: number;
  reautorizar: number;
  falhas: number;
  estadosRemovidos: number;
}

const RECUO_RENOVACAO_MIN_MS = 5 * 60_000;
const RECUO_RENOVACAO_MAX_MS = 12 * 60 * 60_000;

/**
 * Job de hora em hora:
 * - renova os tokens OAuth que vencem em até 30 dias (o token dura 180; sem renovação, só nova autorização);
 * - confere as conexões sinalizadas por `mp-connect` com uma consulta barata (`/users/me`), que só renova se der 401;
 * - falha (inclusive recusa que não é `invalid_grant`) adia aquela conexão com recuo exponencial (5 min a 12 h);
 * - apaga `state` do OAuth com mais de 1 dia.
 */
export async function renovarTokensOAuth(amb: AmbienteConexao, opcoes: { deveParar?: () => boolean; antecedenciaMs?: number; lote?: number } = {}): Promise<ResumoRenovacao> {
  const resumo: ResumoRenovacao = { renovadas: 0, revisadas: 0, reautorizar: 0, falhas: 0, estadosRemovidos: 0 };
  const agora = amb.relogio.agora();
  const antigos = await amb.db.delete(estadosOauthPagamento).where(lt(estadosOauthPagamento.criadoEm, new Date(agora.getTime() - 24 * 60 * 60_000)))
    .returning({ id: estadosOauthPagamento.id });
  resumo.estadosRemovidos = antigos.length;
  if (!amb.oauth) return resumo;
  const limite = new Date(agora.getTime() + (opcoes.antecedenciaMs ?? 30 * 24 * 60 * 60_000));
  const cx = conexoesPagamento;
  const conexoes = await amb.db.select().from(cx)
    .where(and(eq(cx.ativa, true), eq(cx.modo, 'oauth'), isNull(cx.reautorizarDesde), isNotNull(cx.tokenEnvelope),
      or(isNull(cx.proximaRenovacaoEm), lte(cx.proximaRenovacaoEm, agora)),
      or(and(isNotNull(cx.refreshTokenEnvelope), lte(cx.tokenExpiraEm, limite)), lte(cx.revisarEm, agora))))
    .orderBy(sql`coalesce(${cx.proximaRenovacaoEm}, ${cx.revisarEm}, ${cx.tokenExpiraEm}) asc`, cx.id).limit(opcoes.lote ?? 20);
  for (const c of conexoes) {
    if (opcoes.deveParar?.()) break;
    const revisao = c.revisarEm !== null && c.revisarEm <= agora && !(c.tokenExpiraEm && c.tokenExpiraEm <= limite);
    try {
      if (revisao) {
        // Só 401 (com renovação), indisponibilidade ou 429 contam como falha; outra resposta não diz nada sobre o vínculo.
        await comTokenDaLoja(amb, c.lojaId, (token) => amb.provedor.validarCredencial(token)).catch((e: unknown) => {
          if (e instanceof ErroProvedorMp && !['credencial_invalida', 'indisponivel', 'limite'].includes(e.tipo)) return null;
          throw e;
        });
        resumo.revisadas += 1;
      } else {
        await renovarConexao(amb, c);
        resumo.renovadas += 1;
      }
      await amb.db.update(cx).set({ revisarEm: null, proximaRenovacaoEm: null, falhasRenovacao: 0 }).where(and(eq(cx.id, c.id), eq(cx.ativa, true)));
    } catch (erro) {
      if (erro instanceof ErroApi && erro.codigo === 'mercadopago_reautorizar') {
        resumo.reautorizar += 1;
        continue;
      }
      resumo.falhas += 1;
      const falhas = c.falhasRenovacao + 1;
      const atraso = Math.min(RECUO_RENOVACAO_MAX_MS, RECUO_RENOVACAO_MIN_MS * 2 ** Math.min(falhas - 1, 12));
      await amb.db.update(cx).set({ falhasRenovacao: falhas, proximaRenovacaoEm: new Date(amb.relogio.agora().getTime() + atraso) })
        .where(and(eq(cx.id, c.id), eq(cx.ativa, true)));
    }
  }
  return resumo;
}

/**
 * Aviso `mp-connect` (vínculo/desvínculo de conta, payload não documentado): só uma dica, e a assinatura não cobre
 * o corpo. Agenda uma conferência barata da conexão daquele usuário no próximo job; nunca mexe no vencimento nem
 * nos tokens. Repetir a dica não multiplica consultas (uma por passada).
 */
export async function sinalizarRevisaoConexao(amb: Pick<AmbienteConexao, 'db' | 'relogio'>, contaProvedorId: string): Promise<number> {
  const agora = amb.relogio.agora();
  const marcadas = await amb.db.update(conexoesPagamento).set({ revisarEm: agora })
    .where(and(eq(conexoesPagamento.ativa, true), eq(conexoesPagamento.modo, 'oauth'), eq(conexoesPagamento.contaProvedorId, contaProvedorId),
      isNull(conexoesPagamento.reautorizarDesde), isNull(conexoesPagamento.revisarEm)))
    .returning({ id: conexoesPagamento.id });
  return marcadas.length;
}
