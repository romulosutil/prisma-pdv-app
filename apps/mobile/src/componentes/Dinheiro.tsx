import { formatarBRL, type Centavos } from '@pdv/shared';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { Texto, type TextoProps } from './Texto';

export interface DinheiroProps extends Omit<TextoProps, 'children' | 'numerico'> {
  centavos: Centavos;
}

/** Valor em R$ com algarismos tabulares e leitura natural ("34 reais e 90 centavos"). */
export function Dinheiro({ centavos, estilo = 'corpoMedio', accessibilityLabel, ...resto }: DinheiroProps) {
  return (
    <Texto estilo={estilo} numerico accessibilityLabel={accessibilityLabel ?? falarDinheiro(centavos)} {...resto}>
      {formatarBRL(centavos)}
    </Texto>
  );
}
