import { useCallback, useSyncExternalStore } from 'react';
import { useToast } from '@/componentes/Toast';
import { copiarDiagnostico } from './acoes';
import { assinarRegistro, quantidadeDeEventos } from './registro';

/** Quantidade de eventos no registro (atualiza a cada gravação e ao limpar). */
export function useQuantidadeDeEventos(): number {
  return useSyncExternalStore(assinarRegistro, quantidadeDeEventos, quantidadeDeEventos);
}

/** Copia o diagnóstico e avisa por toast. Usado pelo botão de Ajustes e pelo toque longo do Início. */
export function useCopiarDiagnostico(): () => Promise<void> {
  const toast = useToast();
  return useCallback(async () => {
    try {
      await copiarDiagnostico();
      toast.mostrar('Diagnóstico copiado — cole na conversa', { tipo: 'sucesso' });
    } catch {
      toast.mostrar('Não foi possível copiar o diagnóstico.', { tipo: 'erro' });
    }
  }, [toast]);
}
