import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { usePreferencias, useProdutos } from '@/dados/hooks';
import { registrar } from '@/diagnostico/registro';
import { cores, legendaForte, raio, texto, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { useReducaoMovimento } from '@/tema/useReducaoMovimento';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { toqueLeve } from '@/util/haptico';
import { Botao } from './Botao';
import { BotaoIcone } from './BotaoIcone';
import { BottomSheet } from './BottomSheet';
import { tocarBipe } from './bipe';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';
import { useToast } from './Toast';

const ROI_LARGURA = 260;
const ROI_ALTURA = 120;
const FLASH_MS = 350;
/** Faixa inferior reservada para um painel que suba sobre o visor (cantos r-lg de 24). */
const MARGEM_INFERIOR = 32;
const TOPO_CONTROLES = 60;
const ALTURA_DIGITAR = 44;
const ALTURA_SIMULAR = 36;
const ESCURECIMENTO = 'rgba(13,11,26,0.55)';
const FLASH_FOLHA = 'rgba(14,122,64,0.85)';
const CINZA_PAUSA = '#A9A6BD';
const VERDE_ATIVO = '#1FAF5F';
const ERRO_SOBRE_NOITE = '#FF8A9B';

type OrigemDaLeitura = 'camera' | 'manual' | 'simulada';

const TIPOS_DE_CODIGO = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export interface ScannerProps {
  /** Chamado com o código lido (câmera, digitado ou, na versão de testes, simulado), sem repetições. */
  onLer: (codigo: string) => void;
  /** Para de ler da câmera (economia de bateria ou tela em segundo plano). Digitar continua funcionando. */
  pausado?: boolean;
  onFechar?: () => void;
  /** Texto do rótulo de estado no topo. Padrão: "Leitor ativo". */
  titulo?: string;
  /** Camada por cima do visor (ex.: aviso de pausa com botão). */
  children?: ReactNode;
}

/**
 * Visor de leitura de código de barras: câmera, ROI 260×120, laser, flash de leitura, lanterna e a
 * alternativa de digitar o código. Ocupa todo o espaço do pai (que define a altura; ≥ 300 recomendado).
 * Ignora o mesmo código por `ignorarMesmoCodigoMs` e respeita as preferências de bipe e vibração.
 */
export function Scanner({ onLer, pausado = false, onFechar, titulo = 'Leitor ativo', children }: ScannerProps) {
  const { preferencias } = usePreferencias();
  const { produtos } = useProdutos();
  const toast = useToast();
  const reduzirMovimento = useReducaoMovimento();
  const [permissao, pedirPermissao] = useCameraPermissions();

  const [medida, setMedida] = useState({ largura: 0, altura: 0 });
  const [lanterna, setLanterna] = useState(preferencias.lanterna);
  const [digitando, setDigitando] = useState(false);
  const [flash, setFlash] = useState(false);
  const [erroDaCamera, setErroDaCamera] = useState<string | null>(null);
  const ultimaLeitura = useRef<{ codigo: string; em: number } | null>(null);
  const temporizadorFlash = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulso = useRef(new Animated.Value(1)).current;
  const laser = useRef(new Animated.Value(0)).current;

  const cameraNoAparelho = Platform.OS !== 'web';
  const cameraLiberada = cameraNoAparelho && permissao?.granted === true && erroDaCamera === null;
  const codigosDeTeste = FERRAMENTAS_TESTE ? produtos.filter((p) => p.ean !== null).slice(0, 6) : [];

  useEffect(
    () => () => {
      if (temporizadorFlash.current) clearTimeout(temporizadorFlash.current);
    },
    [],
  );

  const permissaoConcedida = permissao === null ? null : permissao.granted;
  const podePedirDeNovo = permissao?.canAskAgain;
  useEffect(() => {
    if (permissaoConcedida === null) return;
    registrar('camera', permissaoConcedida ? 'permissão da câmera concedida' : 'permissão da câmera negada', { podePedirDeNovo });
  }, [permissaoConcedida, podePedirDeNovo]);

  useEffect(() => {
    if (!cameraLiberada) return;
    registrar('camera', 'câmera montada');
    return () => registrar('camera', 'câmera desmontada');
  }, [cameraLiberada]);

  useEffect(() => {
    if (reduzirMovimento || pausado || !cameraLiberada) {
      laser.setValue(0.5);
      return;
    }
    const ida = Animated.timing(laser, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
    const volta = Animated.timing(laser, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
    const laco = Animated.loop(Animated.sequence([ida, volta]));
    laco.start();
    return () => laco.stop();
  }, [reduzirMovimento, pausado, cameraLiberada, laser]);

  const entregar = useCallback(
    (codigo: string, origem: OrigemDaLeitura, tipo?: string) => {
      const agora = Date.now();
      const anterior = ultimaLeitura.current;
      const repetida = anterior !== null && anterior.codigo === codigo && agora - anterior.em < preferencias.ignorarMesmoCodigoMs;
      registrar('leitura', repetida ? 'leitura ignorada (repetida)' : 'código lido', { tipo: tipo ?? origem, codigo, origem, ignorada: repetida });
      if (repetida) {
        if (origem === 'manual') toast.mostrar('Mesmo código ignorado. Use + para somar.');
        return;
      }
      ultimaLeitura.current = { codigo, em: agora };
      if (preferencias.vibrar) toqueLeve();
      if (preferencias.bipe) tocarBipe();
      setFlash(true);
      if (!reduzirMovimento) {
        pulso.setValue(1);
        Animated.sequence([
          Animated.timing(pulso, { toValue: 1.04, duration: 120, useNativeDriver: true }),
          Animated.timing(pulso, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      }
      if (temporizadorFlash.current) clearTimeout(temporizadorFlash.current);
      temporizadorFlash.current = setTimeout(() => setFlash(false), FLASH_MS);
      onLer(codigo);
    },
    [onLer, preferencias.ignorarMesmoCodigoMs, preferencias.vibrar, preferencias.bipe, reduzirMovimento, pulso, toast],
  );

  const aoMedir = (e: LayoutChangeEvent) => setMedida({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height });

  const alternarLanterna = () => {
    AccessibilityInfo.announceForAccessibility(lanterna ? 'Lanterna desligada' : 'Lanterna ligada');
    setLanterna(!lanterna);
  };

  // O ROI fica centrado entre os controles do topo e a faixa de baixo (digitar + simulador).
  const alturaBaixo = ALTURA_DIGITAR + (FERRAMENTAS_TESTE ? 8 + ALTURA_SIMULAR : 0);
  const sobra = medida.altura - TOPO_CONTROLES - MARGEM_INFERIOR - alturaBaixo - 12 - ROI_ALTURA;
  const roiTopo = TOPO_CONTROLES + Math.max(4, sobra / 2);
  const roiEsquerda = (medida.largura - ROI_LARGURA) / 2;
  const roiBase = roiTopo + ROI_ALTURA;
  const translacaoLaser = laser.interpolate({ inputRange: [0, 1], outputRange: [10, ROI_ALTURA - 12] });

  return (
    <View style={estilos.visor} onLayout={aoMedir}>
      {cameraLiberada ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          active={!pausado}
          enableTorch={lanterna}
          barcodeScannerSettings={{ barcodeTypes: [...TIPOS_DE_CODIGO] }}
          onBarcodeScanned={pausado ? undefined : ({ data, type }) => entregar(data, 'camera', type)}
          onCameraReady={() => registrar('camera', 'câmera pronta (onCameraReady)')}
          onMountError={({ message }) => {
            registrar('erro', 'falha ao iniciar a câmera (onMountError)', { message });
            setErroDaCamera(message);
          }}
        />
      ) : (
        <ImagemSimulada clara={lanterna} apagada={pausado} />
      )}
      {cameraLiberada && pausado ? <View style={[StyleSheet.absoluteFill, estilos.apagao]} /> : null}

      {cameraLiberada && medida.largura > 0 ? (
        <View pointerEvents="none" aria-hidden style={StyleSheet.absoluteFill}>
          <View style={[estilos.escuro, { left: 0, right: 0, top: 0, height: roiTopo }]} />
          <View style={[estilos.escuro, { left: 0, right: 0, top: roiBase, bottom: 0 }]} />
          <View style={[estilos.escuro, { left: 0, width: roiEsquerda, top: roiTopo, height: ROI_ALTURA }]} />
          <View style={[estilos.escuro, { left: roiEsquerda + ROI_LARGURA, right: 0, top: roiTopo, height: ROI_ALTURA }]} />
          <Animated.View
            style={[estilos.roi, { left: roiEsquerda, top: roiTopo, backgroundColor: flash ? FLASH_FOLHA : 'transparent', transform: [{ scale: pulso }] }]}
          >
            <Canto lado="topo" extremo="esquerda" />
            <Canto lado="topo" extremo="direita" />
            <Canto lado="base" extremo="esquerda" />
            <Canto lado="base" extremo="direita" />
            {flash ? (
              <View style={estilos.rotuloBip}>
                <Icone nome="check" tamanho={32} cor={cores.bg} espessura={3} />
                <Texto estilo="tituloXL" cor={cores.bg}>
                  Bip!
                </Texto>
              </View>
            ) : pausado ? null : (
              <Animated.View style={[estilos.laser, { transform: [{ translateY: translacaoLaser }] }]} />
            )}
          </Animated.View>
        </View>
      ) : null}

      {!cameraLiberada && !(cameraNoAparelho && permissao === null) ? (
        <SemCamera
          cameraNoAparelho={cameraNoAparelho}
          erro={erroDaCamera !== null}
          onTentarDeNovo={() => setErroDaCamera(null)}
          podePedir={permissao?.canAskAgain ?? true}
          onPedir={() => void pedirPermissao()}
          onEnviar={(codigo) => entregar(codigo, 'manual')}
        />
      ) : null}

      <View style={estilos.topo} pointerEvents="box-none">
        <View style={estilos.cantoTopo}>{onFechar ? <BotaoIcone icone="fechar" rotulo="Fechar" variante="translucido" onPress={onFechar} /> : null}</View>
        <View style={estilos.centroTopo} pointerEvents="none">
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={pausado ? 'Leitor em pausa' : `${titulo}. Aponte a câmera para o código de barras.`}
            style={estilos.chipEstado}
          >
            <View style={[estilos.ponto, { backgroundColor: pausado ? CINZA_PAUSA : VERDE_ATIVO }]} />
            <Texto cor={cores.bg} style={textoBotao.S}>
              {pausado ? 'Leitor em pausa' : titulo}
            </Texto>
          </View>
          {lanterna && cameraNoAparelho ? (
            <View style={estilos.chipLanterna}>
              <Icone nome="lanterna" tamanho={14} cor={cores.manga} espessura={2.5} />
              <Texto cor={cores.manga} style={legendaForte}>
                Lanterna ligada
              </Texto>
            </View>
          ) : null}
        </View>
        <View style={estilos.cantoTopo}>
          {cameraNoAparelho ? (
            <BotaoIcone
              icone={lanterna ? 'lanterna' : 'lanternaDesligada'}
              rotulo={lanterna ? 'Desligar lanterna' : 'Ligar lanterna'}
              variante="translucido"
              selecionado={lanterna}
              onPress={alternarLanterna}
            />
          ) : null}
        </View>
      </View>

      <View style={[estilos.baixo, { bottom: MARGEM_INFERIOR }]} pointerEvents="box-none">
        {cameraLiberada ? <BotaoVisor rotulo="Digitar código" icone="calculadora" onPress={() => setDigitando(true)} /> : null}
        {FERRAMENTAS_TESTE ? <SimuladorDeBip produtos={codigosDeTeste} onBipar={(ean) => entregar(ean, 'simulada')} /> : null}
      </View>

      {children ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      ) : null}

      <BottomSheet visivel={digitando} onFechar={() => setDigitando(false)} titulo="Digitar código">
        <FormularioCodigo
          comRotulo
          onEnviar={(codigo) => {
            setDigitando(false);
            entregar(codigo, 'manual');
          }}
        />
      </BottomSheet>
    </View>
  );
}

function Canto({ lado, extremo }: { lado: 'topo' | 'base'; extremo: 'esquerda' | 'direita' }) {
  const topo = lado === 'topo';
  const esquerda = extremo === 'esquerda';
  return (
    <View
      style={[
        estilos.canto,
        topo ? { top: -2, borderTopWidth: 4, borderTopColor: cores.bg } : { bottom: -2, borderBottomWidth: 4, borderBottomColor: cores.bg },
        esquerda ? { left: -2, borderLeftWidth: 4, borderLeftColor: cores.bg } : { right: -2, borderRightWidth: 4, borderRightColor: cores.bg },
        topo && esquerda && { borderTopLeftRadius: raio.md - 4 },
        topo && !esquerda && { borderTopRightRadius: raio.md - 4 },
        !topo && esquerda && { borderBottomLeftRadius: raio.md - 4 },
        !topo && !esquerda && { borderBottomRightRadius: raio.md - 4 },
      ]}
    />
  );
}

const MANCHAS = [
  { cx: 65, cy: 84, rx: 120, ry: 80, cor: '#FF7A59', opacidade: 0.42 },
  { cx: 320, cy: 76, rx: 130, ry: 90, cor: '#2EC4B6', opacidade: 0.34 },
  { cx: 210, cy: 195, rx: 120, ry: 78, cor: '#FFC933', opacidade: 0.28 },
  { cx: 56, cy: 241, rx: 110, ry: 80, cor: '#7B5CFF', opacidade: 0.45 },
  { cx: 350, cy: 236, rx: 110, ry: 82, cor: '#E8407A', opacidade: 0.3 },
] as const;

/** Imagem de câmera simulada (manchas de cor desfocadas) para quando não há câmera real. */
function ImagemSimulada({ clara, apagada }: { clara: boolean; apagada: boolean }) {
  const id = useId().replace(/\W/g, '');
  return (
    <View aria-hidden style={[StyleSheet.absoluteFill, { opacity: apagada ? 0.3 : 1 }]}>
      <Svg width="100%" height="100%" viewBox="0 0 390 316" preserveAspectRatio="none">
        <Defs>
          {MANCHAS.map((m, i) => (
            <RadialGradient key={i} id={`m${id}${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={m.cor} stopOpacity={m.opacidade * (clara ? 1.6 : 1)} />
              <Stop offset="1" stopColor={m.cor} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {MANCHAS.map((m, i) => (
          <Ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill={`url(#m${id}${i})`} />
        ))}
      </Svg>
    </View>
  );
}

interface SemCameraProps {
  cameraNoAparelho: boolean;
  /** A câmera falhou ao iniciar (`onMountError`). */
  erro: boolean;
  onTentarDeNovo: () => void;
  podePedir: boolean;
  onPedir: () => void;
  onEnviar: (codigo: string) => void;
}

/** Sem câmera (web, permissão negada): explica e deixa digitar o código ali mesmo. */
function SemCamera({ cameraNoAparelho, erro, onTentarDeNovo, podePedir, onPedir, onEnviar }: SemCameraProps) {
  const mensagem = erro
    ? 'Não foi possível iniciar a câmera. Tente de novo ou digite o código.'
    : !cameraNoAparelho
    ? 'Sem câmera por aqui. Digite o código de barras.'
    : podePedir
      ? 'Permita o uso da câmera para ler os códigos.'
      : 'Câmera bloqueada. Libere nos ajustes ou digite o código.';
  return (
    <View style={estilos.semCamera} pointerEvents="box-none">
      <Texto estilo="corpoMedio" cor={cores.bg} style={estilos.mensagemSemCamera} accessibilityLiveRegion="polite">
        {mensagem}
      </Texto>
      {erro ? <Botao rotulo="Tentar de novo" tamanho="M" larguraTotal={false} onPress={onTentarDeNovo} /> : null}
      {!erro && cameraNoAparelho && podePedir ? <Botao rotulo="Permitir câmera" tamanho="M" larguraTotal={false} onPress={onPedir} /> : null}
      <FormularioCodigo onEnviar={onEnviar} />
    </View>
  );
}

interface FormularioCodigoProps {
  onEnviar: (codigo: string) => void;
  /** Rótulo visível acima do campo (no sheet; sobre o visor o placeholder basta). */
  comRotulo?: boolean;
}

function FormularioCodigo({ onEnviar, comRotulo }: FormularioCodigoProps) {
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [focado, setFocado] = useState(false);

  const enviar = () => {
    if (valor.length < 8) {
      setErro('Digite de 8 a 14 números do código de barras.');
      return;
    }
    setErro(null);
    setValor('');
    onEnviar(valor);
  };

  return (
    <View style={estilos.formulario}>
      {comRotulo ? (
        <Texto estilo="label" cor={cores.ink2}>
          Código de barras (8 a 14 números)
        </Texto>
      ) : null}
      <View style={estilos.linhaFormulario}>
        <TextInput
          value={valor}
          onChangeText={(t) => {
            setValor(t.replace(/\D/g, '').slice(0, 14));
            setErro(null);
          }}
          onSubmitEditing={enviar}
          onFocus={() => setFocado(true)}
          onBlur={() => setFocado(false)}
          accessibilityLabel="Código de barras"
          accessibilityHint="De 8 a 14 números"
          aria-invalid={Boolean(erro)}
          keyboardType="number-pad"
          inputMode="numeric"
          returnKeyType="done"
          maxLength={14}
          placeholder="Código de barras"
          placeholderTextColor={cores.ink3}
          selectionColor={cores.anil}
          style={[texto.corpoL, estilos.entrada, { borderColor: erro ? cores.pitanga : focado ? cores.anil : 'transparent' }]}
        />
        <Botao rotulo="Adicionar" tamanho="M" larguraTotal={false} onPress={enviar} />
      </View>
      {erro ? (
        <Texto estilo="legenda" cor={comRotulo ? cores.pitanga : ERRO_SOBRE_NOITE} accessibilityLiveRegion="polite" role="alert">
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

function BotaoVisor({ rotulo, icone, onPress }: { rotulo: string; icone: NomeIcone; onPress: () => void }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      hitSlop={{ top: 2, bottom: 2 }}
      style={({ pressed }) => [estilos.botaoVisor, { backgroundColor: pressed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)' }, anel]}
    >
      <Icone nome={icone} tamanho={20} cor={cores.bg} />
      <Texto cor={cores.bg} style={textoBotao.M}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

/** Só com as ferramentas de teste: bipa os EANs do catálogo de demonstração sem precisar de câmera. */
function SimuladorDeBip({ produtos, onBipar }: { produtos: readonly { id: string; nome: string; ean: string | null }[]; onBipar: (ean: string) => void }) {
  return (
    <View style={estilos.simulador}>
      <Texto cor={cores.bg} style={[textoBotao.S, estilos.rotuloSimulador]} numberOfLines={1} aria-hidden>
        Simular bip
      </Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chipsSimulador} keyboardShouldPersistTaps="handled">
        {produtos.map((p) => (
          <ChipSimulador key={p.id} rotulo={p.nome.split(' ')[0] ?? p.nome} acessivel={`Simular leitura de ${p.nome}`} onPress={() => p.ean && onBipar(p.ean)} />
        ))}
      </ScrollView>
    </View>
  );
}

function ChipSimulador({ rotulo, acessivel, onPress }: { rotulo: string; acessivel: string; onPress: () => void }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={acessivel}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [estilos.chipSimulador, pressed && estilos.chipSimuladorPressionado, anel]}
    >
      <Texto cor={cores.bg} style={textoBotao.S}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  visor: { flex: 1, alignSelf: 'stretch', backgroundColor: cores.noite, overflow: 'hidden' },
  apagao: { backgroundColor: ESCURECIMENTO },
  escuro: { position: 'absolute', backgroundColor: ESCURECIMENTO },
  roi: { position: 'absolute', width: ROI_LARGURA, height: ROI_ALTURA, borderRadius: raio.md - 4 },
  canto: { position: 'absolute', width: 28, height: 28 },
  laser: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: cores.manga,
    shadowColor: cores.manga,
    shadowOpacity: 0.65,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  rotuloBip: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  topo: { position: 'absolute', left: 16, right: 16, top: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cantoTopo: { width: 48, height: 48 },
  centroTopo: { flex: 1, alignItems: 'center', gap: 6, paddingTop: 10 },
  chipEstado: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(13,11,26,0.62)',
  },
  chipLanterna: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,201,51,0.4)',
    backgroundColor: 'rgba(13,11,26,0.62)',
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  baixo: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  botaoVisor: { minHeight: ALTURA_DIGITAR, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, borderRadius: 999 },
  simulador: { alignSelf: 'stretch', height: ALTURA_SIMULAR, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20 },
  rotuloSimulador: { flexShrink: 0 },
  chipsSimulador: { gap: 8, alignItems: 'center', paddingRight: 20 },
  chipSimulador: {
    minHeight: ALTURA_SIMULAR,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSimuladorPressionado: { backgroundColor: 'rgba(255,255,255,0.2)' },
  semCamera: { position: 'absolute', left: 20, right: 20, top: TOPO_CONTROLES + 4, gap: 12, alignItems: 'stretch' },
  mensagemSemCamera: { textAlign: 'center' },
  formulario: { gap: 8 },
  linhaFormulario: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entrada: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: raio.md,
    borderWidth: 2,
    backgroundColor: cores.surface,
    color: cores.ink,
    outlineWidth: 0,
  },
});
