import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { gerarId } from '@pdv/shared';
import type { SessaoAutenticada } from '../auth';
import { sha256 } from '../auth';
import { estadosOauthPagamento, operadores } from '../db/schema';
import { ErroApi } from '../erros';
import { ErroProvedorMp, urlAutorizacao } from '../pagamentos/mercadoPago';
import { salvarConexao, VALIDADE_PADRAO_TOKEN_MS, type AmbienteConexao } from './conexoesMercadoPago';
import type { ConfiguracaoOAuthMercadoPago } from '../configuracao';

/**
 * OAuth do Mercado Pago (aplicação da plataforma): o dono abre a tela do Mercado Pago, autoriza, e o Mercado Pago
 * devolve o `code` à rota pública de retorno. `state` de uso único (10 min), ligado à loja e ao dono; PKCE S256
 * com o `code_verifier` cifrado no servidor. Tokens cifrados; nenhuma resposta, página ou log os contém.
 */

export const VALIDADE_ESTADO_MS = 10 * 60_000;

export type AmbienteOAuth = AmbienteConexao & { oauth: ConfiguracaoOAuthMercadoPago };

export function exigirOAuth<T extends AmbienteConexao>(amb: T): T & { oauth: ConfiguracaoOAuthMercadoPago } {
  if (!amb.oauth) throw new ErroApi(503, 'oauth_indisponivel', 'Conexão pelo Mercado Pago indisponível neste servidor.');
  return amb as T & { oauth: ConfiguracaoOAuthMercadoPago };
}

/** Novo início invalida os `state` pendentes da loja: só a autorização mais recente pode concluir. */
export async function iniciarOAuth(amb: AmbienteOAuth, sessao: SessaoAutenticada): Promise<{ url: string }> {
  const agora = amb.relogio.agora();
  const estado = randomBytes(32).toString('base64url');
  // 64 caracteres base64url: dentro dos 43–128 do PKCE.
  const verificador = amb.oauth.pkce ? randomBytes(48).toString('base64url') : null;
  const id = gerarId();
  await amb.db.transaction(async (tx) => {
    await tx.update(estadosOauthPagamento).set({ invalidadoEm: agora, verificadorEnvelope: null, resultado: 'substituido' })
      .where(and(eq(estadosOauthPagamento.lojaId, sessao.lojaId), isNull(estadosOauthPagamento.usadoEm), isNull(estadosOauthPagamento.invalidadoEm)));
    await tx.insert(estadosOauthPagamento).values({
      id, contaId: sessao.contaId, lojaId: sessao.lojaId, operadorId: sessao.operadorId, provedor: 'mercadopago',
      estadoHash: sha256(estado),
      verificadorEnvelope: verificador ? amb.cifrador.cifrar(verificador, { lojaId: sessao.lojaId, conexaoId: id, campo: 'pkce_verificador' }) : null,
      criadoEm: agora, expiraEm: new Date(agora.getTime() + VALIDADE_ESTADO_MS),
    });
  });
  return { url: urlAutorizacao(amb.oauth, estado, verificador) };
}

export type ResultadoOAuth =
  | 'conectado' | 'estado_invalido' | 'estado_expirado' | 'nao_autorizado' | 'sem_codigo' | 'troca_falhou'
  | 'concessao_recusada' | 'troca_recusada' | 'ambiente_teste_ausente' | 'credencial_produtiva' | 'vendedor_nao_identificado';

/**
 * Retorno do Mercado Pago. O `state` é consumido (marcado como usado) antes de qualquer outra verificação, mesmo
 * quando algo falha depois. Sem `code` válido (inclusive com `error=`): falha genérica.
 */
export async function concluirOAuth(amb: AmbienteOAuth, consulta: { code?: string; state?: string }): Promise<ResultadoOAuth> {
  const estado = consulta.state;
  if (!estado || estado.length > 256) return 'estado_invalido';
  const agora = amb.relogio.agora();
  const [registro] = await amb.db.update(estadosOauthPagamento).set({ usadoEm: agora })
    .where(and(eq(estadosOauthPagamento.estadoHash, sha256(estado)), isNull(estadosOauthPagamento.usadoEm), isNull(estadosOauthPagamento.invalidadoEm)))
    .returning();
  if (!registro) return 'estado_invalido';
  const encerrar = async (resultado: ResultadoOAuth): Promise<ResultadoOAuth> => {
    await amb.db.update(estadosOauthPagamento).set({ resultado, verificadorEnvelope: null }).where(eq(estadosOauthPagamento.id, registro.id));
    return resultado;
  };
  if (registro.expiraEm <= agora) return encerrar('estado_expirado');
  // Quem iniciou ainda precisa ser o dono ativo daquela loja.
  const [dono] = await amb.db.select({ id: operadores.id }).from(operadores)
    .where(and(eq(operadores.id, registro.operadorId), eq(operadores.lojaId, registro.lojaId), eq(operadores.contaId, registro.contaId),
      eq(operadores.papel, 'dono'), eq(operadores.estado, 'ativo')));
  if (!dono) return encerrar('nao_autorizado');
  const codigo = consulta.code;
  if (!codigo || codigo.length > 512 || !/^[\x21-\x7e]+$/.test(codigo)) return encerrar('sem_codigo');
  let verificador: string | null = null;
  if (amb.oauth.pkce) {
    if (!registro.verificadorEnvelope) return encerrar('estado_invalido');
    try {
      verificador = amb.cifrador.decifrar(registro.verificadorEnvelope, { lojaId: registro.lojaId, conexaoId: registro.id, campo: 'pkce_verificador' });
    } catch {
      return encerrar('estado_invalido');
    }
  }
  let tokens;
  try {
    tokens = await (amb.provedorOAuthTeste ?? amb.provedor).trocarCodigo(amb.oauth, codigo, verificador);
  } catch (erro) {
    if (amb.oauth.testToken && erro instanceof ErroProvedorMp && erro.status !== null && erro.status >= 400 && erro.status < 500) {
      return encerrar(erro.tipo === 'concessao_invalida' ? 'concessao_recusada' : 'troca_recusada');
    }
    return encerrar('troca_falhou');
  }
  if (amb.oauth.testToken) {
    if (tokens.liveMode === null) return encerrar('ambiente_teste_ausente');
    if (tokens.liveMode !== false) return encerrar('credencial_produtiva');
    if (!tokens.contaProvedorId) return encerrar('vendedor_nao_identificado');
  }
  const fim = amb.relogio.agora();
  await salvarConexao(amb, { contaId: registro.contaId, lojaId: registro.lojaId, operadorId: registro.operadorId }, {
    modo: 'oauth',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiraEm: new Date(fim.getTime() + (tokens.expiraEmSegundos ? tokens.expiraEmSegundos * 1000 : VALIDADE_PADRAO_TOKEN_MS)),
    liveMode: tokens.liveMode,
    contaProvedorId: tokens.contaProvedorId,
  }, fim);
  return encerrar('conectado');
}

/** Página mínima do retorno: sem recursos externos, sem token, `state`, `code` nem ids; nada da query é refletido. */
export function paginaRetornoOAuth(ok: boolean, diagnosticoTeste?: ResultadoOAuth): string {
  const titulo = ok ? 'Mercado Pago conectado' : 'Não foi possível conectar';
  const texto = ok ? 'Mercado Pago conectado. Volte ao app.' : 'Não foi possível conectar o Mercado Pago. Volte ao app e tente de novo.';
  const detalhe = !ok && diagnosticoTeste ? `<p>Código de homologação: ${diagnosticoTeste}</p>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${titulo}</title><style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f7f9;color:#1d2433}main{max-width:22rem;padding:1.5rem;text-align:center}p{font-size:1.125rem;line-height:1.5}</style></head><body><main><p>${texto}</p>${detalhe}</main></body></html>`;
}
