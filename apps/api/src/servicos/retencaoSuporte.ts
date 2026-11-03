import { and, eq, lt } from 'drizzle-orm';
import type { Relogio } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { solicitacoesSuporte } from '../db/schema';

export async function limparSuporteConcluido(db: Db, relogio: Relogio): Promise<number> {
  const removidas = await db.delete(solicitacoesSuporte).where(and(eq(solicitacoesSuporte.estado, 'concluido'), lt(solicitacoesSuporte.atualizadoEm, new Date(relogio.agora().getTime() - 90 * 86400000)))).returning({ id: solicitacoesSuporte.id });
  return removidas.length;
}

export function agendarRetencaoSuporte(processar: () => Promise<number>, registrar: (mensagem: string) => void): () => Promise<void> {
  let ativa: Promise<void> | undefined;
  const registrarSeguro = (mensagem: string) => { try { registrar(mensagem); } catch { /* observabilidade não interrompe manutenção */ } };
  const executar = () => {
    if (ativa) return;
    ativa = processar().then(n => { registrarSeguro(`[suporte] retenção concluída: ${n}`); }, () => { registrarSeguro('[suporte] retenção falhou'); }).finally(() => { ativa = undefined; });
  };
  const timer = setInterval(executar, 24 * 60 * 60 * 1000);
  return async () => { clearInterval(timer); await ativa; };
}
