import { Banner } from '@/componentes/Banner';
import { StyleSheet, View } from 'react-native';
import { useCarrinho } from '@/dados/carrinho';
import { useProdutos } from '@/dados/hooks';
import { formatarEstoque } from '@/telas/produtos/logica';

/** Informa o saldo antes de receber, sem bloquear venda offline ou parcela já recebida. */
export function AvisoEstoque() {
  const { itens, concluidaId } = useCarrinho();
  const { produtos } = useProdutos();
  if (concluidaId) return null;
  const quantidades = new Map<string, number>();
  for (const i of itens) if (i.produtoId) quantidades.set(i.produtoId, (quantidades.get(i.produtoId) ?? 0) + i.quantidadeMilesimos);
  const avisos = produtos.filter(p => p.estoque !== null && (quantidades.get(p.id) ?? 0) > 0 && (quantidades.get(p.id) ?? 0) > p.estoque)
    .map(p => `${p.nome}: saldo ${formatarEstoque(p.estoque!, p.unidade)}; nesta venda ${formatarEstoque(quantidades.get(p.id)!, p.unidade)}.`);
  if (!avisos.length) return null;
  return <View style={estilos.aviso} accessibilityLiveRegion="polite"><Banner tipo="atencao" texto={`${avisos.join('\n')}\nVocê pode continuar. Ao concluir, o saldo poderá ficar negativo.`} /></View>;
}
const estilos = StyleSheet.create({ aviso: { marginBottom: 16 } });
