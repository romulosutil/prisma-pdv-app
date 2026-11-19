import { StyleSheet, View, type ViewStyle } from 'react-native';
import { cores } from '@/tema';

export function Divisor({ estilo }: { estilo?: ViewStyle }) {
  return <View style={[estilos.linha, estilo]} />;
}

const estilos = StyleSheet.create({
  linha: { height: 1, backgroundColor: cores.line, alignSelf: 'stretch' },
});
