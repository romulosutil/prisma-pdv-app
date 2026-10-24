import type { Produto } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useProdutos } from '@/dados/hooks';
import { cores, legendaForte, raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { BotaoRedondo } from './BotaoRedondo';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { IconeProduto } from './icones';
import { monograma } from './logica';
import { useVoltar } from '@/util/useVoltar';

/** Itens vendidos por botão na tela de venda. A ordem muda por setas (acessível), sem arrastar. */
export function GerenciarAtalhos() {
  const router = useRouter();
  const toast = useToast();
  const voltar = useVoltar('/produtos');
  const { atalhos: lista, editar, moverAtalho } = useProdutos();

  const mover = async (produto: Produto, sentido: -1 | 1) => {
    try {
      const nova = await moverAtalho(produto.id, sentido);
      AccessibilityInfo.announceForAccessibility(`${produto.nome} agora é o atalho ${nova.indexOf(produto.id) + 1} de ${nova.length}`);
    } catch {
      toast.mostrar('Não foi possível mudar a ordem. Tente de novo.', { tipo: 'erro' });
    }
  };

  const remover = async (produto: Produto) => {
    try {
      await editar(produto.id, { atalho: false });
      toast.mostrar(`${produto.nome} saiu dos atalhos`, {
        acao: { rotulo: 'Desfazer', aoPressionar: () => void editar(produto.id, { atalho: true }) },
      });
    } catch {
      toast.mostrar('Não foi possível remover. Tente de novo.', { tipo: 'erro' });
    }
  };

  return (
    <TelaBase
      rolavel
      bordas={['top']}
      style={estilos.tela}
      rodape={<Botao rotulo="Novo atalho" icone="mais" onPress={() => router.push({ pathname: '/produtos/novo', params: { atalho: '1' } })} />}
    >
      <CabecalhoTela titulo="Atalhos de venda" onVoltar={voltar} rotuloVoltar="Voltar para produtos" />
      <Texto estilo="corpo" cor={cores.ink2}>
        Viram botões rápidos na tela de venda, para itens sem código de barras. Use as setas para mudar a ordem.
      </Texto>

      {lista.length === 0 ? (
        <View style={estilos.vazio}>
          <Ilustra kind="cesta" size={120} />
          <Texto estilo="tituloM" accessibilityRole="header">
            Nenhum atalho ainda
          </Texto>
          <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
            Crie atalhos para pão, gelo, banana e outros itens que você vende todo dia.
          </Texto>
        </View>
      ) : (
        <View style={estilos.lista} accessibilityRole="list">
          {lista.map((produto, i) => (
            <View key={produto.id} style={estilos.cartao} accessibilityRole="listitem">
              <View style={estilos.linha}>
                <View style={estilos.monograma}>
                  <Texto cor={cores.ink2} style={legendaForte}>
                    {monograma(produto.nome)}
                  </Texto>
                </View>
                <View
                  style={estilos.dados}
                  accessible
                  accessibilityLabel={`Atalho ${i + 1} de ${lista.length}: ${produto.nome}, ${falarDinheiro(produto.precoCentavos)}${produto.unidade === 'kg' ? ' por quilo' : ''}`}
                >
                  <Texto estilo="corpoMedio">{produto.nome}</Texto>
                  <View style={estilos.preco}>
                    <Dinheiro centavos={produto.precoCentavos} estilo="tituloM" accessible={false} />
                    {produto.unidade === 'kg' ? (
                      <Texto estilo="legenda" cor={cores.ink3}>
                        /kg
                      </Texto>
                    ) : null}
                  </View>
                </View>
                <BotaoRedondo rotulo={`Subir ${produto.nome}`} desabilitado={i === 0} onPress={() => mover(produto, -1)}>
                  <IconeProduto nome="setaCima" />
                </BotaoRedondo>
                <BotaoRedondo rotulo={`Descer ${produto.nome}`} desabilitado={i === lista.length - 1} onPress={() => mover(produto, 1)}>
                  <IconeProduto nome="setaBaixo" />
                </BotaoRedondo>
              </View>
              <View style={estilos.acoes}>
                <Botao
                  rotulo="Editar"
                  variante="terciario"
                  tamanho="S"
                  onPress={() => router.push({ pathname: '/produtos/[id]', params: { id: produto.id } })}
                  accessibilityHint={`Edita ${produto.nome}`}
                />
                <Botao rotulo="Tirar dos atalhos" variante="perigo" tamanho="S" onPress={() => remover(produto)} accessibilityHint={`Remove ${produto.nome} dos atalhos`} />
              </View>
            </View>
          ))}
        </View>
      )}
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 16, paddingTop: 16, paddingBottom: 24 },
  lista: { gap: 12 },
  cartao: { gap: 12, padding: 12, borderRadius: raio.md, backgroundColor: cores.surface },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monograma: { width: 44, height: 44, borderRadius: raio.md, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.bg },
  dados: { flex: 1, minWidth: 0, gap: 2 },
  preco: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vazio: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  centro: { textAlign: 'center' },
});
