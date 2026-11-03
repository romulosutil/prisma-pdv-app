import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, ScrollView, View } from 'react-native';
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
import { escopoDoPerfil } from '@/dados/estadoConta';
import { registrarPiloto } from '@/telemetria/registro';

const piloto = process.env.EXPO_PUBLIC_AMBIENTE === 'homologacao' ? require('@/telemetria/captura') as typeof import('@/telemetria/captura') : null;
piloto?.instalarPiloto(dados);
const IndicadorPiloto = piloto?.IndicadorPiloto;

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
      if (Platform.OS !== 'web') {
        try { const { limparExportacoesExpiradas } = await import('@/util/exportacoes'); limparExportacoesExpiradas(); }
        catch { /* A limpeza temporária não deve impedir abrir os dados comerciais. */ }
      }
      registrarPiloto('app', { etapa: 'pronto' });
      setErroDeDados(false);
      setDadosProntos(true);
    } catch {
      registrarPiloto('app', { etapa: 'falha' });
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
        {piloto ? <Botao rotulo="Copiar histórico do teste" variante="terciario" onPress={() => { void piloto.copiarHistoricoPiloto().catch(() => undefined); }} /> : null}
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
  const { temConta, identidade, reautenticacaoNecessaria, carregandoConta } = useConta();
  const escopo = identidade ? escopoDoPerfil(identidade) : null;
  const escopoAnterior = useRef(escopo);
  const carrinho = useCarrinho();
  const { assinatura, agora, servico } = useAssinatura();

  useDiagnosticoDeNavegacao();

  const destino = navegacaoPronta && !carregandoConta ? decidirRota({ temConta, assinatura, agora, reautenticacaoNecessaria, vendaEmAndamento: !carrinho.vazio }, segmentos) : null;

  useEffect(() => {
    if (!navegacaoPronta || carregandoConta) return;
    const mudou = escopoAnterior.current !== null && escopo !== null && escopoAnterior.current !== escopo;
    escopoAnterior.current = escopo;
    if (mudou && router.canDismiss()) router.dismissAll();
    if (destino || mudou) {
      const rota = destino ?? '/';
      registrar('navegacao', 'redirecionado pelo guarda de fluxo', { destino: String(rota) });
      router.replace(rota);
    }
  }, [destino, router, escopo, carregandoConta, navegacaoPronta]);

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

  useEffect(() => {
    let ativo = AppState.currentState === 'active';
    const tentar = () => {
      if (ativo) void dados.processarSaidasPendentes().then(() => dados.sincronizacao.sincronizar()).catch(() => undefined);
    };
    tentar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      ativo = estado === 'active';
      tentar();
    });
    const intervalo = setInterval(tentar, 15_000);
    return () => { assinatura.remove(); clearInterval(intervalo); };
  }, [escopo, reautenticacaoNecessaria]);

  return <View style={{ flex: 1 }}>
    {IndicadorPiloto ? <SafeAreaView edges={['top']}><IndicadorPiloto /></SafeAreaView> : null}
    <View style={{ flex: 1 }} accessibilityElementsHidden={carregandoConta} importantForAccessibility={carregandoConta ? 'no-hide-descendants' : 'auto'}>
      <Stack key={escopo ?? 'sem-conta'} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg } }} />
    </View>
    {carregandoConta ? <View accessibilityRole="progressbar" accessibilityLabel="Carregando dados da conta" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: cores.bg }}><ActivityIndicator /><Texto>Carregando seus dados…</Texto></View> : null}
  </View>;
}
