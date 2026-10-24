import { formatarBRL, multiplicarPreco } from '@pdv/shared';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Ilustra } from '@/componentes/Ilustra';
import { Stepper } from '@/componentes/Stepper';
import { Texto } from '@/componentes/Texto';
import { formatarPeso, rotuloDaQuantidade, type ItemCarrinho } from '@/dados/carrinho';
import { cores, raio } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { falarDinheiro } from '@/util/dinheiroFalado';

export interface ItensDoCarrinhoProps {
  itens: readonly ItemCarrinho[];
  onMudarQuantidade: (item: ItemCarrinho, milesimos: number) => void;
  onAlterarPeso: (item: ItemCarrinho) => void;
  onRemover: (item: ItemCarrinho) => void;
  onDestacar: (item: ItemCarrinho) => void;
}

const MIL = 1000;

/** Carrinho: o item mais recente em destaque (com quantidade) e os demais em lista. */
export function ItensDoCarrinho({ itens, onMudarQuantidade, onAlterarPeso, onRemover, onDestacar }: ItensDoCarrinhoProps) {
  const [ultimo, ...demais] = itens;

  if (!ultimo) {
    return (
      <View style={estilos.vazio}>
        <Ilustra kind="scanner" size={112} />
        <Texto estilo="tituloM" style={estilos.centro}>
          Aponte para o código de barras
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
          Ou busque o produto e use os atalhos acima.
        </Texto>
      </View>
    );
  }

  return (
    <ScrollView style={estilos.rolagem} contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <UltimoItem item={ultimo} onMudarQuantidade={onMudarQuantidade} onAlterarPeso={onAlterarPeso} onRemover={onRemover} />
      {demais.map((item) => (
        <LinhaDoItem key={item.chave} item={item} onRemover={onRemover} onDestacar={onDestacar} />
      ))}
    </ScrollView>
  );
}

interface UltimoItemProps extends Pick<ItensDoCarrinhoProps, 'onMudarQuantidade' | 'onAlterarPeso' | 'onRemover'> {
  item: ItemCarrinho;
}

function UltimoItem({ item, onMudarQuantidade, onAlterarPeso, onRemover }: UltimoItemProps) {
  const porPeso = item.unidade === 'kg';
  const subtotal = multiplicarPreco(item.precoUnitarioCentavos, item.quantidadeMilesimos);
  const detalhe = item.ean ? `EAN ${item.ean}` : porPeso ? 'Pesado' : item.produtoId ? 'Sem código' : 'Valor avulso';

  return (
    <View style={estilos.destaque}>
      <View style={estilos.topoDestaque}>
        <View style={estilos.textosDestaque}>
          <Texto estilo="tituloM">{item.descricao}</Texto>
          <Texto estilo="legenda" cor={cores.ink2} numerico>
            {detalhe}
          </Texto>
          <Texto estilo="label" cor={cores.ink2} numerico>
            {porPeso ? `${formatarBRL(item.precoUnitarioCentavos)}/kg` : `${formatarBRL(item.precoUnitarioCentavos)} cada`}
          </Texto>
        </View>
        <Dinheiro centavos={subtotal} estilo="tituloL" />
      </View>
      <View style={estilos.controles}>
        {porPeso ? (
          <Botao
            rotulo={`Alterar peso: ${formatarPeso(item.quantidadeMilesimos)}`}
            tamanho="M"
            variante="secundario"
            larguraTotal={false}
            onPress={() => onAlterarPeso(item)}
          />
        ) : (
          <Stepper
            valor={Math.round(item.quantidadeMilesimos / MIL)}
            minimo={0}
            maximo={999}
            atalhoMais5
            rotulo={`Quantidade de ${item.descricao}`}
            onChange={(n) => onMudarQuantidade(item, n * MIL)}
          />
        )}
        <BotaoIcone icone="lixeira" rotulo={`Remover ${item.descricao}`} onPress={() => onRemover(item)} />
      </View>
    </View>
  );
}

function LinhaDoItem({ item, onRemover, onDestacar }: { item: ItemCarrinho; onRemover: (item: ItemCarrinho) => void; onDestacar: (item: ItemCarrinho) => void }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  const subtotal = multiplicarPreco(item.precoUnitarioCentavos, item.quantidadeMilesimos);
  const quantidade = item.unidade === 'kg' ? formatarPeso(item.quantidadeMilesimos) : `${Math.round(item.quantidadeMilesimos / MIL)} un.`;

  return (
    <View style={estilos.linha}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.descricao}, ${quantidade}, ${falarDinheiro(subtotal)}`}
        accessibilityHint="Toque para alterar a quantidade"
        onPress={() => onDestacar(item)}
        onFocus={aoFocar}
        onBlur={aoDesfocar}
        style={({ pressed }) => [estilos.textoLinha, pressed && estilos.pressionada, anel]}
      >
        <Texto estilo="corpoMedio" numerico numberOfLines={1} style={estilos.nomeLinha}>
          {`${rotuloDaQuantidade(item)} ${item.descricao}`}
        </Texto>
        <Dinheiro centavos={subtotal} estilo="corpoMedio" accessible={false} />
      </Pressable>
      <BotaoIcone icone="lixeira" rotulo={`Remover ${item.descricao}`} onPress={() => onRemover(item)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  rolagem: { flex: 1 },
  conteudo: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  centro: { textAlign: 'center' },
  destaque: { gap: 12, padding: 16, marginBottom: 4, borderRadius: raio.lg, backgroundColor: cores.mangaSoft },
  topoDestaque: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  textosDestaque: { flex: 1, minWidth: 0, gap: 2 },
  controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  linha: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: cores.line },
  textoLinha: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nomeLinha: { flex: 1, minWidth: 0 },
  pressionada: { backgroundColor: cores.surface },
});
