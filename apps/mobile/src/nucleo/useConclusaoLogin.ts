import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useConta, useDados } from '@/dados/hooks';
import { useObservavel } from '@/dados/observavel';

/** Deve ficar fora do Stack que remonta ao trocar o escopo financeiro. */
export function useConclusaoLogin(): void {
  const dados = useDados();
  const router = useRouter();
  const segmentos: readonly string[] = useSegments();
  const conclusao = useObservavel(dados.conta.conclusoesAcesso);
  const anterior = useRef(conclusao);
  const { temConta, reautenticacaoNecessaria, carregandoConta } = useConta();
  useEffect(() => {
    if (carregandoConta) return;
    const concluiu = anterior.current !== conclusao;
    anterior.current = conclusao;
    if (concluiu && temConta && !reautenticacaoNecessaria && segmentos[0] === '(onboarding)' && segmentos[1] === 'entrar') {
      router.replace('/');
    }
  }, [conclusao, carregandoConta, temConta, reautenticacaoNecessaria, segmentos, router]);
}
