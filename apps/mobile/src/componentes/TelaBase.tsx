import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { cores, margemTela } from '@/tema';

export interface TelaBaseProps {
  children: ReactNode;
  /** Conteúdo rolável. Sem isso, o conteúdo ocupa a tela e o layout é por flex. */
  rolavel?: boolean;
  /** Fixo abaixo do conteúdo (CTA principal). */
  rodape?: ReactNode;
  /** Bordas protegidas pela safe area. Nas abas, a barra inferior já cuida da base. */
  bordas?: readonly Edge[];
  /** Sem a margem lateral de 20 (ex.: câmera, listas de ponta a ponta). */
  semMargem?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Tela com fundo branco, safe area e margem lateral de 20. */
export function TelaBase({ children, rolavel, rodape, bordas = ['top', 'bottom', 'left', 'right'], semMargem, style, testID }: TelaBaseProps) {
  const margem = semMargem ? null : estilos.margem;
  return (
    <SafeAreaView edges={bordas} style={estilos.raiz} testID={testID}>
      <KeyboardAvoidingView style={estilos.corpo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {rolavel ? (
        <ScrollView
          style={estilos.corpo}
          contentContainerStyle={[estilos.rolagem, margem, style]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[estilos.corpo, margem, style]}>{children}</View>
      )}
      {rodape ? <View style={[estilos.rodape, margem]}>{rodape}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.bg },
  corpo: { flex: 1 },
  margem: { paddingHorizontal: margemTela },
  rolagem: { flexGrow: 1, paddingTop: 12, paddingBottom: 24 },
  rodape: { paddingTop: 12, paddingBottom: 16, gap: 8 },
});
