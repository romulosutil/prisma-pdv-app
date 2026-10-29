import type { ResumoEntregaCodigo } from './email/tiposEntrega';

export function agendarEntregasCodigo(
  processar: () => Promise<ResumoEntregaCodigo>,
  registrar: (mensagem: string) => void,
): () => Promise<void> {
  let ativa: Promise<void> | undefined;
  let parado = false;
  const registrarSeguro = (mensagem: string) => { try { registrar(mensagem); } catch { /* logger não interrompe o ciclo */ } };
  const executar = () => {
    if (parado || ativa) return;
    ativa = (async () => {
      try {
        const resumo = await processar();
        const { aceitas, retentativas, canceladas, falhas, bloqueadas, ignoradas } = resumo;
        registrarSeguro(`[email] ${JSON.stringify({ aceitas, retentativas, canceladas, falhas, bloqueadas, ignoradas })}`);
      } catch {
        registrarSeguro('[email] Passada abortada.');
      }
    })().finally(() => { ativa = undefined; });
  };
  const timer = setInterval(executar, 5000);
  executar();
  return async () => {
    parado = true;
    clearInterval(timer);
    await ativa;
  };
}
