import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useToast } from '@/componentes/Toast';
import { mensagemDeBloqueio, useLicenca } from '@/dados/hooks';

/**
 * Abre a tela de venda (`/vender`) se a licença permitir uma NOVA venda; senão explica o motivo.
 * Uma venda já aberta nunca é bloqueada.
 */
export function useAbrirVenda(): () => void {
  const router = useRouter();
  const toast = useToast();
  const { permissaoDeVenda } = useLicenca();
  return useCallback(() => {
    if (permissaoDeVenda.permitido) router.push('/vender');
    else toast.mostrar(mensagemDeBloqueio(permissaoDeVenda.motivo), { tipo: 'erro' });
  }, [permissaoDeVenda, router, toast]);
}
