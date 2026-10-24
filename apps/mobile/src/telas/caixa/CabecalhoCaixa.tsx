import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Segmentado } from '@/componentes/Segmentado';
import { Texto } from '@/componentes/Texto';

export type SecaoCaixa = 'resumo' | 'vendas' | 'sync';

const OPCOES = [
  { valor: 'resumo', rotulo: 'Resumo' },
  { valor: 'vendas', rotulo: 'Vendas' },
  { valor: 'sync', rotulo: 'Sincronização' },
] as const;

const ROTAS = { resumo: '/caixa', vendas: '/caixa/vendas', sync: '/caixa/sync' } as const;

/** Título "Caixa" e as três seções (Resumo, Vendas, Sincronização); trocar de seção não empilha telas. */
export function CabecalhoCaixa({ secao }: { secao: SecaoCaixa }) {
  const router = useRouter();
  return (
    <View style={estilos.grupo}>
      <Texto estilo="tituloXL" accessibilityRole="header">
        Caixa
      </Texto>
      <Segmentado
        rotuloGrupo="Seções do caixa"
        opcoes={OPCOES}
        valor={secao}
        onChange={(nova) => {
          if (nova !== secao) router.replace(ROTAS[nova]);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: 16 },
});
