import type { Centavos } from '@pdv/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';

export interface LinhaValorProps {
  rotulo: string;
  /** Valor em dinheiro; o leitor de tela recebe "rótulo: 34 reais e 90 centavos". */
  centavos?: Centavos;
  /** Sinal exibido antes do valor ("+" ou "−"), falado como "mais" ou "menos". */
  sinal?: '+' | '−';
  /** Conteúdo livre à direita, no lugar do dinheiro. */
  valor?: ReactNode;
  rotuloAcessivel?: string;
  destaque?: boolean;
  divisor?: boolean;
}

/** Linha "rótulo ........ valor" de cartões de resumo. */
export function LinhaValor({ rotulo, centavos, sinal, valor, rotuloAcessivel, destaque, divisor }: LinhaValorProps) {
  const falado = rotuloAcessivel ?? (centavos === undefined ? rotulo : `${rotulo}: ${sinal ? `${sinal === '+' ? 'mais' : 'menos'} ` : ''}${falarDinheiro(centavos)}`);
  return (
    <View accessible accessibilityLabel={falado} style={[estilos.linha, divisor && estilos.divisor]}>
      <Texto estilo={destaque ? 'tituloM' : 'corpo'} cor={destaque ? cores.ink : cores.ink2} style={estilos.rotulo}>
        {rotulo}
      </Texto>
      {centavos !== undefined ? (
        <View style={estilos.valor}>
          {sinal ? (
            <Texto estilo={destaque ? 'tituloM' : 'corpoMedio'} numerico>
              {sinal}
            </Texto>
          ) : null}
          <Dinheiro centavos={centavos} estilo={destaque ? 'tituloM' : 'corpoMedio'} accessible={false} />
        </View>
      ) : (
        valor
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.line },
  rotulo: { flexShrink: 1 },
  valor: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
});
