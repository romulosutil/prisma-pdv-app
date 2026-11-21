import { eq } from 'drizzle-orm';
import { criarAcessoLiberado, gerarId } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { contas, lojas, operadores, usuarios } from '../db/schema';
import { registrarEvento, salvarAssinatura } from './assinatura';

const NOME_REVISOR_PLAY = 'Google Play Reviewer';
const NOME_LOJA_REVISOR_PLAY = 'Loja Demo Prisma PDV';
const DOCUMENTO_REVISOR_PLAY = '42718395000102';

/**
 * Provisiona de forma idempotente a conta dedicada para revisão na Google Play,
 * garantindo acesso completo (`liberada` / Pro) sem necessidade de compra real.
 */
export async function garantirContaRevisorPlay(
  tx: Db,
  email: string,
  agora: Date,
): Promise<typeof usuarios.$inferSelect> {
  const [existente] = await tx.select().from(usuarios).where(eq(usuarios.email, email)).for('update');
  if (existente) return existente;

  const [criado] = await tx
    .insert(usuarios)
    .values({ id: gerarId(), email, nome: NOME_REVISOR_PLAY, criadoEm: agora, atualizadoEm: agora })
    .onConflictDoNothing()
    .returning();

  if (!criado) {
    const [vencedor] = await tx.select().from(usuarios).where(eq(usuarios.email, email)).for('update');
    if (!vencedor) throw new Error('Falha ao provisionar usuário revisor da Google Play.');
    return vencedor;
  }

  const contaId = gerarId();
  const lojaId = gerarId();
  const operadorId = gerarId();

  await tx.insert(contas).values({
    id: contaId,
    email,
    documento: DOCUMENTO_REVISOR_PLAY,
    nomeResponsavel: NOME_REVISOR_PLAY,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  await tx.insert(lojas).values({
    id: lojaId,
    contaId,
    nome: NOME_LOJA_REVISOR_PLAY,
    criadoEm: agora,
    atualizadoEm: agora,
  });
  await tx.insert(operadores).values({
    id: operadorId,
    usuarioId: criado.id,
    contaId,
    lojaId,
    nome: NOME_REVISOR_PLAY,
    papel: 'dono',
    estado: 'ativo',
    aceitoEm: agora,
    criadoEm: agora,
    atualizadoEm: agora,
  });

  const acesso = criarAcessoLiberado({ id: gerarId(), contaId, agora });
  await salvarAssinatura(tx, acesso, agora);
  await registrarEvento(tx, acesso, 'acesso_liberado_sem_cobranca', { planoId: acesso.planoId }, agora);

  return criado;
}
