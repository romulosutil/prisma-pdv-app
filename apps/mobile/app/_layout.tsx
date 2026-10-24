import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/componentes/Toast';
import { dados } from '@/dados/instancia';
import { DadosProvider, useAssinatura, useConta } from '@/dados/hooks';
import { decidirRota } from '@/nucleo/fluxo';
import { cores, FONTES_PARA_CARREGAR } from '@/tema';

// A splash fica até as fontes e os dados locais carregarem e o guarda de fluxo escolher a tela.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

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

  const destino = navegacaoPronta ? decidirRota({ temConta, assinatura, agora }, segmentos) : null;

  useEffect(() => {
    if (destino) router.replace(destino);
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
