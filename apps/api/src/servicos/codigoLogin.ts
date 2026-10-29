import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Relogio } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { codigosLogin, contas } from '../db/schema';
import { sha256 } from '../auth';
import { ErroApi } from '../erros';
import { limitarAuth } from './limitesAuth';

export const normalizarEmail = (email: string) => email.trim().toLowerCase();
export const hashDoCodigo = (email: string, codigo: string) => sha256(`${email}:${codigo}`);
export const limiteAuth = () => new ErroApi(429, 'limite_autenticacao', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');

/** Verifica o código sob a trava da conta; o chamador o consome apenas após suas verificações. */
export async function verificarCodigo(tx: Db, email: string, codigo: string, relogio: Relogio) {
  const invalido = new ErroApi(401, 'codigo_invalido', 'Código inválido ou expirado.');
  if (!await limitarAuth(tx, 'falha_email', email, relogio, false)) return invalido;
  const [conta] = await tx.select().from(contas).where(eq(contas.email, email)).for('update');
  if (!conta) { await limitarAuth(tx, 'falha_email', email, relogio); return invalido; }
  const agora = relogio.agora();
  const [pendente] = await tx.select().from(codigosLogin)
    .where(and(eq(codigosLogin.email, email), isNull(codigosLogin.usadoEm)))
    .orderBy(desc(codigosLogin.criadoEm)).limit(1);
  if (!pendente || pendente.expiraEm <= agora || pendente.tentativas >= 5) {
    await limitarAuth(tx, 'falha_email', email, relogio); return invalido;
  }
  if (pendente.codigoHash !== hashDoCodigo(email, codigo)) {
    await tx.update(codigosLogin).set({ tentativas: pendente.tentativas + 1 }).where(eq(codigosLogin.id, pendente.id));
    await limitarAuth(tx, 'falha_email', email, relogio); return invalido;
  }
  return { conta, pendente, agora };
}
