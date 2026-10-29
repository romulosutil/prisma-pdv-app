import { multiplicarPreco, type Produto } from '@pdv/shared';
import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import { formatarPeso, useCarrinho } from '@/dados/carrinho';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { useToast } from '@/componentes/Toast';

/** Põe o produto no carrinho e anuncia ("Arroz tipo 1 5kg adicionado, 27 reais e 90 centavos"). */
export function useAdicionar(): (produto: Produto, milesimos?: number) => Promise<boolean> {
  const { adicionarProduto } = useCarrinho();
  const toast = useToast();
  return useCallback(
    async (produto, milesimos = 1000) => {
      try { await adicionarProduto(produto, milesimos); }
      catch (erro) { toast.mostrar(erro instanceof Error ? erro.message : 'Não foi possível guardar o item.', { tipo: 'erro' }); return false; }
      const peso = produto.unidade === 'kg' ? `, ${formatarPeso(milesimos)}` : '';
      AccessibilityInfo.announceForAccessibility(`${produto.nome}${peso} adicionado, ${falarDinheiro(multiplicarPreco(produto.precoCentavos, milesimos))}`);
      return true;
    },
    [adicionarProduto, toast],
  );
}
