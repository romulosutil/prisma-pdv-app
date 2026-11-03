import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, margemTela, raio, sombras } from '@/tema';
import { useReducaoMovimento } from '@/tema/useReducaoMovimento';
import { Texto } from './Texto';

export interface BottomSheetProps {
  visivel: boolean;
  onFechar: () => void;
  titulo: string;
  children: ReactNode;
}

/** Folha que sobe da base: r-lg no topo, alça 36×4 e título em Título L. Fecha no fundo, no botão voltar do Android e no Esc. */
export function BottomSheet({ visivel, onFechar, titulo, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reduzirMovimento = useReducaoMovimento();
  const deslocamento = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visivel) return;
    deslocamento.setValue(reduzirMovimento ? 0 : 40);
    if (!reduzirMovimento) Animated.timing(deslocamento, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [visivel, reduzirMovimento, deslocamento]);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType={reduzirMovimento ? 'none' : 'fade'}
      onRequestClose={onFechar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.fundo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onFechar} style={StyleSheet.absoluteFill} />
        <Animated.View
          accessibilityViewIsModal
          style={[estilos.folha, sombras.sheet, { paddingBottom: insets.bottom + 24, transform: [{ translateY: deslocamento }] }]}
        >
          <View style={estilos.alca} />
          <Texto estilo="tituloL" accessibilityRole="header" style={estilos.titulo}>
            {titulo}
          </Texto>
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={estilos.conteudo}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,43,0.4)' },
  folha: {
    maxHeight: '88%',
    paddingHorizontal: margemTela,
    paddingTop: 12,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
    backgroundColor: cores.bg,
  },
  alca: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: cores.line },
  titulo: { marginTop: 16, marginBottom: 12 },
  conteudo: { gap: 12 },
});
