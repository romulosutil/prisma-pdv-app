import type { Produto } from '@pdv/shared';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { LinhaLista } from '@/componentes/LinhaLista';
import { Texto } from '@/componentes/Texto';
import { cores, legendaForte } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { estoqueBaixo, formatarEstoque, monograma } from './logica';

const FUNDOS = [cores.mangaSoft, cores.ambarSoft, cores.anilSoft, cores.pitangaSoft, cores.folhaSoft];

/** Cor estável por nome: o mesmo produto sempre tem o mesmo monograma colorido. */
function fundoDo(nome: string): string {
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  return FUNDOS[soma % FUNDOS.length]!;
}

export interface LinhaProdutoProps {
  produto: Produto;
  /** Mostra estoque (plano com controle de estoque). */
  comEstoque: boolean;
  divisor: boolean;
  onPress: (produto: Produto) => void;
}

export const LinhaProduto = memo(function LinhaProduto({ produto, comEstoque, divisor, onPress }: LinhaProdutoProps) {
  const porKg = produto.unidade === 'kg';
  const baixo = comEstoque && estoqueBaixo(produto);
  const partes = [produto.ean ?? 'Sem código'];
  if (comEstoque && produto.estoque !== null) partes.push(`Estoque ${formatarEstoque(produto.estoque, produto.unidade)}`);
  if (produto.atalho) partes.push('Atalho');

  const falado = [
    produto.nome,
    `${falarDinheiro(produto.precoCentavos)}${porKg ? ' por quilo' : ''}`,
    produto.ean ? `código ${produto.ean.split('').join(' ')}` : 'sem código de barras',
    comEstoque && produto.estoque !== null ? `estoque ${formatarEstoque(produto.estoque, produto.unidade)}` : null,
    baixo ? 'estoque baixo' : null,
    produto.atalho ? 'é atalho de venda' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <LinhaLista
      titulo={produto.nome}
      subtitulo={partes.join(' · ')}
      rotuloAcessivel={`${falado}. Toque para editar`}
      onPress={() => onPress(produto)}
      divisor={divisor}
      miniatura={
        <View style={[estilos.monograma, { backgroundColor: fundoDo(produto.nome) }]}>
          <Texto cor={cores.ink2} style={legendaForte}>
            {monograma(produto.nome)}
          </Texto>
        </View>
      }
      valor={
        <View style={estilos.valor}>
          <View style={estilos.preco}>
            <Dinheiro centavos={produto.precoCentavos} estilo="corpoMedio" />
            {porKg ? (
              <Texto estilo="legenda" cor={cores.ink3}>
                /kg
              </Texto>
            ) : null}
          </View>
          {baixo ? (
            <View style={estilos.baixo}>
              <Icone nome="alerta" tamanho={14} cor={cores.ambar} />
              <Texto estilo="legenda" cor={cores.ambar}>
                Estoque baixo
              </Texto>
            </View>
          ) : null}
        </View>
      }
    />
  );
});

const estilos = StyleSheet.create({
  monograma: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  valor: { alignItems: 'flex-end', gap: 2 },
  preco: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  baixo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
