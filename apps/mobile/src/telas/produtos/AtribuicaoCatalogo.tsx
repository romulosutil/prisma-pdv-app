import type { AtribuicaoCatalogo as Atribuicao } from '@pdv/shared';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';

/**
 * Crédito da fonte externa do nome sugerido (a licença ODbL exige citar a fonte junto do dado).
 * Sem atribuição (catálogo próprio), não mostra nada.
 */
export function AtribuicaoCatalogo({ atribuicao }: { atribuicao?: Atribuicao | null }) {
  if (!atribuicao) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${atribuicao.texto}. Licença ${atribuicao.licenca}. Abre a página do produto.`}
      onPress={() => void Linking.openURL(atribuicao.url).catch(() => undefined)}
      style={estilos.area}
    >
      <Texto estilo="label" cor={cores.ink2}>
        {`${atribuicao.texto} (${atribuicao.licenca})`}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  area: { minHeight: 44, justifyContent: 'center' },
});
