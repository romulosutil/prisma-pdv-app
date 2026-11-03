import { formatarDataCurta, type MovimentoEstoque, type Produto } from '@pdv/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';
import { formatarEstoque } from './logica';

export function HistoricoEstoque({ movimentos, unidade }: { movimentos: readonly MovimentoEstoque[]; unidade: Produto['unidade'] }) {
  const [todos, setTodos] = useState(false);
  if (!movimentos.length) return null;
  const ordenados = [...movimentos].sort((a, b) => b.em.localeCompare(a.em));
  const visiveis = todos ? ordenados : ordenados.slice(0, 10);
  return (
    <View style={estilos.grupo}>
      <Texto estilo="tituloL" accessibilityRole="header">Histórico do estoque</Texto>
      {visiveis.map(m => {
        const quantidade = `${m.quantidadeMilesimos > 0 ? '+' : ''}${formatarEstoque(m.quantidadeMilesimos, unidade)}`;
        const data = formatarDataCurta(new Date(m.em));
        return <View key={m.id} style={estilos.linha} accessible accessibilityLabel={`${m.motivo}, ${data}, ${quantidade}`}>
          <View style={estilos.descricao}>
            <Texto estilo="corpoMedio">{m.motivo}</Texto>
            <Texto estilo="legenda" cor={cores.ink2}>{data}</Texto>
          </View>
          <Texto estilo="corpoMedio" numerico>{quantidade}</Texto>
        </View>;
      })}
      {ordenados.length > 10 ? <Botao rotulo={todos ? 'Mostrar os 10 mais recentes' : `Ver todos os movimentos (${ordenados.length})`} variante="ghost" tamanho="M" onPress={() => setTodos(!todos)} /> : null}
    </View>
  );
}
const estilos = StyleSheet.create({
  grupo: { gap: 12 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.line },
  descricao: { flex: 1, minWidth: 120, gap: 4 },
});
