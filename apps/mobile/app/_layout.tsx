import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ToastProvider, useToast } from '@/componentes/Toast';
import { Botao } from '@/componentes/Botao';
import { Texto } from '@/componentes/Texto';
import { dados } from '@/dados/instancia';
import { registrar } from '@/diagnostico/registro';
import { DadosProvider, useAssinatura, useConta } from '@/dados/hooks';
import { decidirRota } from '@/nucleo/fluxo';
import { cores, FONTES_PARA_CARREGAR } from '@/tema';
import { useCarrinho } from '@/dados/carrinho';

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
  const [erroDeDados, setErroDeDados] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(false);

  const carregarDados = useCallback(async () => {
    setCarregandoDados(true);
    try {
      await dados.iniciar();
      setErroDeDados(false);
      setDadosProntos(true);
    } catch {
      setErroDeDados(true);
      await SplashScreen.hideAsync().catch(() => undefined);
    } finally { setCarregandoDados(false); }
  }, []);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  if (erroDeDados && (fontesProntas || erroDeFonte)) return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32, gap: 24, backgroundColor: cores.bg }}>
        <Texto accessibilityRole="header" estilo="tituloL">Não foi possível abrir seus dados</Texto>
        <Texto accessibilityRole="alert">O acesso foi interrompido para proteger seus registros. Libere espaço se o aparelho estiver cheio e tente novamente. Se continuar, procure o suporte antes de limpar os dados ou reinstalar o app.</Texto>
        <Botao rotulo="Tentar novamente" carregando={carregandoDados} onPress={() => { void carregarDados(); }} />
      </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );

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
  const toast = useToast();
  const router = useRouter();
  const segmentos = useSegments();
  const navegacaoPronta = useRootNavigationState()?.key !== undefined;
  const { temConta, reautenticacaoNecessaria, carregandoConta } = useConta();
  const carrinho = useCarrinho();
  const { assinatura, agora, servico } = useAssinatura();

  useDiagnosticoDeNavegacao();

  const destino = navegacaoPronta && !carregandoConta ? decidirRota({ temConta, assinatura, agora, reautenticacaoNecessaria, vendaEmAndamento: !carrinho.vazio }, segmentos) : null;

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
      if (estado === 'active') void servico.sincronizar().catch(() => toast.mostrar('Não foi possível atualizar a licença. Seus registros continuam guardados.', { tipo: 'erro' }));
    });
    return () => assinatura.remove();
  }, [servico, toast]);

  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1 }} accessibilityElementsHidden={carregandoConta} importantForAccessibility={carregandoConta ? 'no-hide-descendants' : 'auto'}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg } }} />
    </View>
    {carregandoConta ? <View accessibilityRole="progressbar" accessibilityLabel="Carregando dados da conta" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: cores.bg }}><ActivityIndicator /><Texto>Carregando seus dados…</Texto></View> : null}
  </View>;
}
