import { timingSafeEqual } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Relogio } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { codigosLogin, contas, usuarios } from '../db/schema';
import { sha256 } from '../auth';
import type { ConfiguracaoRevisorPlay } from '../configuracao';
import { ErroApi } from '../erros';
import { limitarAuth } from './limitesAuth';
import { cancelarEntregaDoCodigo } from '../email/filaCodigo';
import { garantirContaRevisorPlay } from './revisorPlay';

export const normalizarEmail = (email: string) => email.trim().toLowerCase();
export const hashDoCodigo = (email: string, codigo: string) => sha256(`${email}:${codigo}`);
export const limiteAuth = () => new ErroApi(429, 'limite_autenticacao', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');

function codigoIgualSeguro(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function consumirCodigoLogin(tx: Db, id: string, agora: Date): Promise<void> {
  await tx.update(codigosLogin).set({ usadoEm: agora }).where(eq(codigosLogin.id, id));
  await cancelarEntregaDoCodigo(tx, id, agora, 'usado');
}

/** Verifica o código sob a trava da conta; o chamador o consome apenas após suas verificações. */
export async function verificarCodigoUsuario(
  tx: Db,
  email: string,
  codigo: string,
  relogio: Relogio,
  revisorPlay?: ConfiguracaoRevisorPlay | null,
) {
  const invalido = new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
  if (!await limitarAuth(tx, 'falha_email', email, relogio, false)) return invalido;

  if (revisorPlay && email === revisorPlay.email) {
    if (!codigoIgualSeguro(codigo, revisorPlay.codigo)) {
      await limitarAuth(tx, 'falha_email', email, relogio);
      return invalido;
    }
    const agora = relogio.agora();
    const usuario = await garantirContaRevisorPlay(tx, email, agora);
    return { usuario, pendente: null as typeof codigosLogin.$inferSelect | null, agora, revisorPlay: true as const };
  }

  const [usuario] = await tx.select().from(usuarios).where(eq(usuarios.email, email)).for('update');
  if (!usuario) { await limitarAuth(tx, 'falha_email', email, relogio); return invalido; }
  const agora = relogio.agora();
  const [pendente] = await tx.select().from(codigosLogin)
    .where(and(eq(codigosLogin.email, email), eq(codigosLogin.finalidade, 'login'), isNull(codigosLogin.usadoEm)))
    .orderBy(desc(codigosLogin.criadoEm)).limit(1);
  if (!pendente || pendente.expiraEm <= agora || pendente.tentativas >= 5) {
    await limitarAuth(tx, 'falha_email', email, relogio); return invalido;
  }
  if (pendente.codigoHash !== hashDoCodigo(email, codigo)) {
    await tx.update(codigosLogin).set({ tentativas: pendente.tentativas + 1 }).where(eq(codigosLogin.id, pendente.id));
    if (pendente.tentativas + 1 >= 5) await cancelarEntregaDoCodigo(tx, pendente.id, agora, 'esgotado');
    await limitarAuth(tx, 'falha_email', email, relogio); return invalido;
  }
  return { usuario, pendente, agora, revisorPlay: false as const };
}

/** Recuperação de aparelhos permanece exclusiva do responsável pela empresa e exige OTP efêmero. */
export async function verificarCodigo(tx: Db, email: string, codigo: string, relogio: Relogio) {
  const prova = await verificarCodigoUsuario(tx, email, codigo, relogio);
  if (prova instanceof ErroApi) return prova;
  if (!prova.pendente) return new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
  const [conta] = await tx.select().from(contas).where(eq(contas.email, email)).for('update');
  if (!conta) return new ErroApi(403, 'proibido', 'Somente o dono pode substituir aparelhos.');
  const agora = relogio.agora();
  if (prova.pendente.expiraEm <= agora) return new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
  return { conta, pendente: prova.pendente, agora };
}
