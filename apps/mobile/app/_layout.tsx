import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/componentes/Toast';
import { dados } from '@/dados/instancia';
import { registrar } from '@/diagnostico/registro';
import { DadosProvider, useAssinatura, useConta } from '@/dados/hooks';
import { decidirRota } from '@/nucleo/fluxo';
import { cores, FONTES_PARA_CARREGAR } from '@/tema';

// A splash fica até as fontes e os dados locais carregarem e o guarda de fluxo escolher a tela.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Versão de testes: captura erros, console e estado do app desde o início. A condição é a de `FERRAMENTAS_TESTE`
// escrita por extenso para o Metro apagar o ramo (e o módulo de captura) do bundle de produção.
const captura: typeof import('@/diagnostico/captura') | null =
  __DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1' ? (require('@/diagnostico/captura') as typeof import('@/diagnostico/captura')) : null;
captura?.instalarDiagnostico(dados);
const useDiagnosticoDeNavegacao: () => void = captura?.useDiagnosticoDeNavegacao ?? (() => undefined);

export default function LayoutRaiz() {
  const [fontesProntas, erroDeFonte] = useFonts(FONTES_PARA_CARREGAR);
  const [dadosProntos, setDadosProntos] = useState(false);

  useEffect(() => {
    dados.iniciar().finally(() => setDadosProntos(true));
  }, []);

  if (!(fontesProntas || erroDeFonte) || !dadosProntos) return null;

  return (
    <SafeAreaProvider>
      <DadosProvider dados={dados}>
        <ToastProvider>
          <StatusBar style="dark" />
          <GuardaDeFluxo />
        </ToastProvider>
      </DadosProvider>
    </SafeAreaProvider>
  );
}

function GuardaDeFluxo() {
  const router = useRouter();
  const segmentos = useSegments();
  const navegacaoPronta = useRootNavigationState()?.key !== undefined;
  const { temConta } = useConta();
  const { assinatura, agora, servico } = useAssinatura();

  useDiagnosticoDeNavegacao();

  const destino = navegacaoPronta ? decidirRota({ temConta, assinatura, agora }, segmentos) : null;

  useEffect(() => {
    if (destino) {
      registrar('navegacao', 'redirecionado pelo guarda de fluxo', { destino: String(destino) });
      router.replace(destino);
    }
  }, [destino, router]);

  useEffect(() => {
    if (navegacaoPronta && !destino) SplashScreen.hideAsync().catch(() => undefined);
  }, [navegacaoPronta, destino]);

  // Voltou ao primeiro plano: reavalia o tempo da assinatura (teste que acabou, cobrança devida, carência).
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') servico.sincronizar();
    });
    return () => assinatura.remove();
  }, [servico]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg } }} />;
}
