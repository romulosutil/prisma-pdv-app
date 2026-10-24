import { formatarBRL } from '@pdv/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { CampoDinheiro } from '@/componentes/CampoDinheiro';
import { TecladoNumerico } from '@/componentes/TecladoNumerico';
import { aplicarTecla } from '@/util/entradaDinheiro';

export interface FolhaValorParteProps {
  visivel: boolean;
  maximoCentavos: number;
  onUsar: (centavos: number) => void;
  onFechar: () => void;
}

/** Digita quanto cobrar nesta parte de uma venda dividida (de R$ 0,01 até o que falta). */
export function FolhaValorParte({ visivel, maximoCentavos, onUsar, onFechar }: FolhaValorParteProps) {
  return (
    <BottomSheet visivel={visivel} onFechar={onFechar} titulo="Valor desta parte">
      <Conteudo maximoCentavos={maximoCentavos} onUsar={onUsar} />
    </BottomSheet>
  );
}

function Conteudo({ maximoCentavos, onUsar }: Pick<FolhaValorParteProps, 'maximoCentavos' | 'onUsar'>) {
  const [valor, setValor] = useState(0);
  const acimaDoMaximo = valor > maximoCentavos;
  return (
    <View style={estilos.conteudo}>
      <CampoDinheiro rotulo="Valor desta parte" valorCentavos={valor} erro={acimaDoMaximo ? `O máximo é ${formatarBRL(maximoCentavos)}` : null} />
      <TecladoNumerico onTecla={(tecla) => setValor((v) => aplicarTecla(v, tecla))} />
      <Botao
        rotulo={valor > 0 && !acimaDoMaximo ? `Usar ${formatarBRL(valor)}` : 'Digite o valor'}
        desabilitado={valor <= 0 || acimaDoMaximo}
        onPress={() => onUsar(valor)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16 },
});
