import type { Centavos } from '@pdv/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { CampoDinheiro } from '@/componentes/CampoDinheiro';
import { useFoco } from '@/tema/useFoco';
import { raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { EntradaDeValor } from '@/componentes/EntradaDeValor';

export interface CampoPrecoProps {
  rotulo: string;
  valorCentavos: Centavos;
  onChange: (valorCentavos: Centavos) => void;
  erro?: string | null;
}

/** Campo de valor para formulários longos: o teclado numérico abre numa folha ao tocar. */
export function CampoPreco({ rotulo, valorCentavos, onChange, erro }: CampoPrecoProps) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(valorCentavos);
  const { aoFocar, aoDesfocar, anel } = useFoco();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${falarDinheiro(valorCentavos)}${erro ? `. ${erro}` : ''}`}
        accessibilityHint="Toque para digitar o valor"
        onPress={() => {
          setRascunho(valorCentavos);
          setAberto(true);
        }}
        onFocus={aoFocar}
        onBlur={aoDesfocar}
        style={[estilos.alvo, anel]}
      >
        <View aria-hidden pointerEvents="none">
          <CampoDinheiro rotulo={rotulo} valorCentavos={valorCentavos} erro={erro} />
        </View>
      </Pressable>
      <BottomSheet visivel={aberto} onFechar={() => setAberto(false)} titulo={rotulo}>
        <EntradaDeValor rotulo={rotulo} valorCentavos={rascunho} onChange={setRascunho} />
        <Botao
          rotulo="Confirmar"
          onPress={() => {
            onChange(rascunho);
            setAberto(false);
          }}
        />
      </BottomSheet>
    </>
  );
}

const estilos = StyleSheet.create({
  alvo: { borderRadius: raio.md },
});
