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
    if ((navigation.getState()?.routes.length ?? 0) <= 1) {
      router.replace(alternativa);
      // Separa o `replace` do `back` em ciclos de quadro diferentes: no Android (Fabric) as duas
      // trocas de pilha no mesmo ciclo coincidiam com a queda `addViewAt` do CP 115. Hipótese, o
      // destino continua o mesmo.
      requestAnimationFrame(() => router.back());
      return;
    }
    router.back();
  }, [router, navigation, alternativa]);
}
