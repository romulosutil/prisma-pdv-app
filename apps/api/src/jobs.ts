import type { BillingProvider, Relogio } from '@pdv/shared';
import type { Db } from './db/conexao';
import { processarCobrancas } from './servicos/cobranca';

const UMA_HORA_MS = 60 * 60 * 1000;

/** Agenda o job de cobrança a cada hora e devolve a função que o cancela. */
export function agendarCobranca(
  db: Db,
  billing: BillingProvider,
  relogio: Relogio,
  registrar: (mensagem: string) => void,
): () => void {
  let emExecucao = false;
  const temporizador = setInterval(() => {
    // Uma passada lenta não pode se sobrepor à seguinte.
    if (emExecucao) return;
    emExecucao = true;
    processarCobrancas(db, billing, relogio, registrar)
      .then((resumo) => registrar(`[cobranca] ${JSON.stringify(resumo)}`))
      .catch((erro: unknown) => registrar(`[cobranca] Passada abortada: ${erro instanceof Error ? erro.message : String(erro)}`))
      .finally(() => {
        emExecucao = false;
      });
  }, UMA_HORA_MS);
  return () => clearInterval(temporizador);
}
