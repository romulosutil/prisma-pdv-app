import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useProdutos } from '@/dados/hooks';
import { cores } from '@/tema';
import { FormularioProduto } from '@/telas/produtos/FormularioProduto';
import { useVoltar } from '@/util/useVoltar';

export default function EditarProduto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Edicao key={id} id={id} />;
}

function Edicao({ id }: { id: string }) {
  const { buscarPorId } = useProdutos();
  const voltar = useVoltar('/produtos');
  // Foto do produto ao abrir: depois de excluir, o formulário não pisca em "não encontrado" antes de sair.
  const [produto] = useState(() => buscarPorId(id));

  if (!produto) {
    return (
      <TelaBase bordas={['top']} style={estilos.vazio}>
        <Ilustra kind="busca" size={120} />
        <Texto estilo="tituloM" accessibilityRole="header">
          Produto não encontrado
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
          Ele pode ter sido excluído.
        </Texto>
        <Botao rotulo="Voltar para produtos" variante="terciario" onPress={voltar} />
      </TelaBase>
    );
  }
  return <FormularioProduto produto={produto} />;
}

const estilos = StyleSheet.create({
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centro: { textAlign: 'center' },
});
