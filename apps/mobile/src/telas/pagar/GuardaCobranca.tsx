import { Redirect, useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { useCarrinho } from '@/dados/carrinho';

/**
 * Telas de cobrança só existem com um carrinho: sem itens (ex.: página recarregada) voltam para a venda.
 * Depois que a venda é registrada elas ficam em branco até "Nova venda" encerrar o fluxo.
 */
export function GuardaCobranca({ children }: { children: ReactNode }) {
  const { vazio, concluidaId } = useCarrinho();
  const focada = useIsFocused();
  if (concluidaId) return focada ? <Redirect href={{ pathname: '/pagar/sucesso', params: { venda: concluidaId } }} /> : null;
  if (vazio) return focada ? <Redirect href="/vender" /> : null;
  return <>{children}</>;
}
