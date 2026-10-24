import type { Centavos } from '@pdv/shared';
import { StyleSheet, View } from 'react-native';
import { CampoDinheiro } from '@/componentes/CampoDinheiro';
import { TecladoNumerico } from '@/componentes/TecladoNumerico';
import { aplicarTecla } from '@/util/entradaDinheiro';

export interface EntradaDeValorProps {
  rotulo: string;
  valorCentavos: Centavos;
  onChange: (valorCentavos: Centavos) => void;
  erro?: string | null;
  /** Teto da digitação, em centavos. */
  maximo?: Centavos;
}

/** Valor em R$ digitado no teclado numérico próprio (não abre o teclado do sistema). */
export function EntradaDeValor({ rotulo, valorCentavos, onChange, erro, maximo }: EntradaDeValorProps) {
  return (
    <View style={estilos.grupo}>
      <CampoDinheiro rotulo={rotulo} valorCentavos={valorCentavos} erro={erro} />
      <TecladoNumerico onTecla={(tecla) => onChange(aplicarTecla(valorCentavos, tecla, maximo))} />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 12 },
});
