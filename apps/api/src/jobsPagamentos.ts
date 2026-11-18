import type { ResumoConciliacaoPix } from './servicos/cobrancasPix';

export const INTERVALO_CONCILIACAO_PIX_MS = 30_000;
export const INTERVALO_RENOVACAO_OAUTH_MS = 60 * 60_000;

/** Renovação dos tokens OAuth (a cada hora; renova quem vence em até 30 dias). Mesmo padrão sem sobreposição. */
export function agendarRenovacaoOAuth(
  processar: (deveParar: () => boolean) => Promise<{ renovadas: number; reautorizar: number; falhas: number }>,
  registrar: (mensagem: string) => void,
  intervaloMs = INTERVALO_RENOVACAO_OAUTH_MS,
): () => Promise<void> {
  let ativa: Promise<void> | undefined;
  let parado = false;
  const registrarSeguro = (mensagem: string) => { try { registrar(mensagem); } catch { /* logger não interrompe o ciclo */ } };
  const executar = () => {
    if (parado || ativa) return;
    ativa = (async () => {
      try {
        const resumo = await processar(() => parado);
        if (resumo.renovadas + resumo.reautorizar + resumo.falhas > 0) registrarSeguro(`[oauth] ${JSON.stringify(resumo)}`);
      } catch {
        registrarSeguro('[oauth] Passada abortada.');
      }
    })().finally(() => { ativa = undefined; });
  };
  const timer = setInterval(executar, intervaloMs);
  return async () => {
    parado = true;
    clearInterval(timer);
    await ativa;
  };
}

/** Conciliação do Pix (aviso perdido, expiração, pagamento tardio). Uma passada nunca se sobrepõe à seguinte. */
export function agendarConciliacaoPix(
  processar: (deveParar: () => boolean) => Promise<ResumoConciliacaoPix>,
  registrar: (mensagem: string) => void,
  intervaloMs = INTERVALO_CONCILIACAO_PIX_MS,
): () => Promise<void> {
  let ativa: Promise<void> | undefined;
  let parado = false;
  const registrarSeguro = (mensagem: string) => { try { registrar(mensagem); } catch { /* logger não interrompe o ciclo */ } };
  const executar = () => {
    if (parado || ativa) return;
    ativa = (async () => {
      try {
        const resumo = await processar(() => parado);
        if (resumo.consultadas > 0) registrarSeguro(`[pix] ${JSON.stringify(resumo)}`);
      } catch {
        // Sem a mensagem original: pode carregar SQL ou dados do provedor.
        registrarSeguro('[pix] Passada abortada.');
      }
    })().finally(() => { ativa = undefined; });
  };
  const timer = setInterval(executar, intervaloMs);
  return async () => {
    parado = true;
    clearInterval(timer);
    await ativa;
  };
}
