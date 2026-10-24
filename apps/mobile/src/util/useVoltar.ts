import { useNavigation, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

/**
 * Volta uma tela. Se a tela é a única da pilha da aba (aberta direto, como o cadastro vindo da
 * venda), primeiro troca por `alternativa`: sem isso a aba voltaria depois com o formulário antigo.
 * Sem histórico nenhum (rota aberta por link), só vai para `alternativa`.
 */
export function useVoltar(alternativa: Href): () => void {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(() => {
    if (!router.canGoBack()) {
      router.replace(alternativa);
      return;
    }
    if ((navigation.getState()?.routes.length ?? 0) <= 1) router.replace(alternativa);
    router.back();
  }, [router, navigation, alternativa]);
}
