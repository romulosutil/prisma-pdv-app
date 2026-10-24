import { multiplicarPreco, type Produto } from '@pdv/shared';
import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import { formatarPeso, useCarrinho } from '@/dados/carrinho';
import { falarDinheiro } from '@/util/dinheiroFalado';

/** Põe o produto no carrinho e anuncia ("Arroz tipo 1 5kg adicionado, 27 reais e 90 centavos"). */
export function useAdicionar(): (produto: Produto, milesimos?: number) => void {
  const { adicionarProduto } = useCarrinho();
  return useCallback(
    (produto, milesimos = 1000) => {
      adicionarProduto(produto, milesimos);
      const peso = produto.unidade === 'kg' ? `, ${formatarPeso(milesimos)}` : '';
      AccessibilityInfo.announceForAccessibility(`${produto.nome}${peso} adicionado, ${falarDinheiro(multiplicarPreco(produto.precoCentavos, milesimos))}`);
    },
    [adicionarProduto],
  );
}
