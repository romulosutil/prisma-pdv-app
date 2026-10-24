import { formatarBRL, type Centavos } from '@pdv/shared';
import { StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { Texto } from './Texto';

export interface CampoDinheiroProps {
  rotulo: string;
  valorCentavos: Centavos;
  erro?: string | null;
}

/**
 * Mostra o valor digitado no `TecladoNumerico` (não abre o teclado do sistema).
 * Use `aplicarTecla` de `@/util/entradaDinheiro` para atualizar o valor.
 */
export function CampoDinheiro({ rotulo, valorCentavos, erro }: CampoDinheiroProps) {
  const [reais = '', centavos = '00'] = formatarBRL(valorCentavos).replace('R$ ', '').split(',');
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${rotulo}: ${falarDinheiro(valorCentavos)}${erro ? `. ${erro}` : ''}`}
      accessibilityLiveRegion="polite"
      style={[estilos.caixa, erro ? estilos.comErro : null]}
    >
      <Texto estilo="label" cor={cores.ink2}>
        {rotulo}
      </Texto>
      <View style={estilos.valor}>
        <Texto estilo="tituloL" numerico cor={cores.ink2}>
          R$
        </Texto>
        <Texto estilo="display" numerico adjustsFontSizeToFit numberOfLines={1} style={estilos.numero}>
          {`${reais},${centavos}`}
        </Texto>
      </View>
      {erro ? (
        <Texto estilo="legenda" cor={cores.pitanga}>
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { gap: 4, padding: 16, borderRadius: raio.md, backgroundColor: cores.surface, borderWidth: 2, borderColor: 'transparent' },
  comErro: { borderColor: cores.pitanga },
  valor: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  numero: { flexShrink: 1 },
});
