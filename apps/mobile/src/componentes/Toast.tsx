import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, margemTela, raio, sombras, textoBotao } from '@/tema';
import { useReducaoMovimento } from '@/tema/useReducaoMovimento';
import { Icone, type NomeIcone } from './Icone';
import { Texto } from './Texto';
import { registrarPiloto } from '@/telemetria/registro';

export type TipoToast = 'info' | 'sucesso' | 'erro';

export interface OpcoesToast {
  tipo?: TipoToast;
  acao?: { rotulo: string; aoPressionar: () => void };
  duracaoMs?: number;
}

interface ToastAtivo extends OpcoesToast {
  id: number;
  mensagem: string;
}

interface ApiToast {
  mostrar: (mensagem: string, opcoes?: OpcoesToast) => void;
}

const ContextoToast = createContext<ApiToast | null>(null);

const ICONE: Record<TipoToast, NomeIcone> = { info: 'info', sucesso: 'check', erro: 'erro' };

/** Distância da borda inferior: acima da barra de navegação (88 + folga). */
const FOLGA_BARRA = 100;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<ToastAtivo | null>(null);
  const contador = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacidade = useRef(new Animated.Value(0)).current;
  const reduzirMovimento = useReducaoMovimento();
  const insets = useSafeAreaInsets();

  const esconder = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    setAtual(null);
  }, []);

  const mostrar = useCallback(
    (mensagem: string, opcoes: OpcoesToast = {}) => {
      if (opcoes.tipo === 'erro') registrarPiloto('aviso_interface', { etapa: 'falha' });
      if (temporizador.current) clearTimeout(temporizador.current);
      contador.current += 1;
      setAtual({ id: contador.current, mensagem, ...opcoes });
      AccessibilityInfo.announceForAccessibility(mensagem);
      // Com ação, dá mais tempo para tocar.
      temporizador.current = setTimeout(esconder, opcoes.duracaoMs ?? (opcoes.acao ? 6000 : 3500));
    },
    [esconder],
  );

  useEffect(() => {
    if (!atual) return;
    opacidade.setValue(reduzirMovimento ? 1 : 0);
    if (!reduzirMovimento) Animated.timing(opacidade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [atual, opacidade, reduzirMovimento]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const api = useMemo<ApiToast>(() => ({ mostrar }), [mostrar]);

  return (
    <ContextoToast.Provider value={api}>
      {children}
      {atual ? (
        <View pointerEvents="box-none" style={[estilos.camada, { bottom: insets.bottom + FOLGA_BARRA }]}>
          <Animated.View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[estilos.toast, sombras.toast, { opacity: opacidade }]}
          >
            <Icone nome={ICONE[atual.tipo ?? 'info']} cor={atual.tipo === 'erro' ? '#FF8A9B' : cores.bg} />
            <Texto estilo="corpoMedio" cor={cores.bg} style={estilos.mensagem}>
              {atual.mensagem}
            </Texto>
            {atual.acao ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={atual.acao.rotulo}
                onPress={() => {
                  atual.acao?.aoPressionar();
                  esconder();
                }}
                style={estilos.acao}
              >
                <Texto cor={cores.manga} style={textoBotao.M}>
                  {atual.acao.rotulo}
                </Texto>
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </ContextoToast.Provider>
  );
}

export function useToast(): ApiToast {
  const api = useContext(ContextoToast);
  if (!api) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return api;
}

const estilos = StyleSheet.create({
  camada: { position: 'absolute', left: margemTela, right: margemTela, alignItems: 'center' },
  toast: {
    alignSelf: 'stretch',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: raio.md,
    backgroundColor: cores.ink,
  },
  mensagem: { flex: 1, minWidth: 120 },
  acao: { minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
});
