import { createHash } from 'node:crypto';
import type { Relogio } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/conexao';
import { limitesAuth } from '../db/schema';

export type TipoLimiteAuth = 'emissao_email' | 'emissao_ip' | 'falha_email' | 'login_ip' | 'cadastro_email' | 'cadastro_ip' | 'cadastro_confirmacao_ip';

const MAXIMOS: Record<TipoLimiteAuth, number> = {
  cadastro_email: 3,
  cadastro_ip: 20,
  cadastro_confirmacao_ip: 50,
  emissao_email: 3,
  emissao_ip: 20,
  falha_email: 5,
  login_ip: 50,
};

/** Deve ser chamado dentro de uma transação, que mantém a trava até a confirmação. */
export async function limitarAuth(tx: Db, tipo: TipoLimiteAuth, sujeito: string, relogio: Relogio, consumir = true): Promise<boolean> {
  const chave = createHash('sha256').update(tipo + ':' + sujeito).digest('hex');
  await tx.insert(limitesAuth).values({ chave, janelaInicio: new Date(0), usos: -1 }).onConflictDoNothing();
  const [registro] = await tx.select().from(limitesAuth).where(eq(limitesAuth.chave, chave)).for('update');
  if (!registro) throw new Error('Limite de autenticação não encontrado após inserção.');
  const agora = relogio.agora();
  const novaJanela = registro.usos === -1 || agora.getTime() - registro.janelaInicio.getTime() >= 900_000;
  const usos = novaJanela ? 0 : registro.usos;
  const ultimoUsoEm = novaJanela ? null : registro.ultimoUsoEm;
  const permitido = usos < MAXIMOS[tipo] && (!['emissao_email', 'cadastro_email'].includes(tipo) || ultimoUsoEm === null || agora.getTime() - ultimoUsoEm.getTime() >= 60_000);
  if (novaJanela || (permitido && consumir)) {
    await tx.update(limitesAuth).set({
      janelaInicio: novaJanela ? agora : usos === 0 && permitido && consumir
        ? new Date(Math.max(agora.getTime(), registro.janelaInicio.getTime()))
        : registro.janelaInicio,
      usos: usos + (permitido && consumir ? 1 : 0),
      ultimoUsoEm: permitido && consumir ? agora : ultimoUsoEm,
    }).where(eq(limitesAuth.chave, chave));
  }
  return permitido;
}
