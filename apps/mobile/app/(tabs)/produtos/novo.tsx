import { useLocalSearchParams } from 'expo-router';
import { FormularioProduto } from '@/telas/produtos/FormularioProduto';
import { sugestaoParaCadastro } from '@/telas/produtos/sugestao';

/** `?ean=` pré-preenche o código (o fluxo de Vender chega aqui com um código não cadastrado). */
export default function NovoProduto() {
  const { ean, nome, manual, origem, atalho } = useLocalSearchParams<{
    ean?: string;
    nome?: string;
    manual?: string;
    origem?: string;
    atalho?: string;
  }>();
  return (
    <FormularioProduto
      key={ean ?? 'sem-codigo'}
      sugestao={sugestaoParaCadastro(ean, nome, manual === '1')}
      daCamera={origem === 'camera'}
      atalhoInicial={atalho === '1'}
    />
  );
}
