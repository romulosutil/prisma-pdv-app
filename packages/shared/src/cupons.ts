import type { Centavos } from './dinheiro';

export interface CupomAplicado {
  codigo: string;
  percentualDesconto: number;
  duracao: 'vitalicio';
}

/** Catálogo confiável. Novos cupons são cadastrados aqui até existir gestão comercial. */
export const CUPONS: readonly CupomAplicado[] = [
  { codigo: 'VITALICIO50', percentualDesconto: 50, duracao: 'vitalicio' },
];

export function encontrarCupom(codigo: string): CupomAplicado | null {
  const normalizado = codigo.trim().toUpperCase();
  const cupom = CUPONS.find((item) => item.codigo === normalizado);
  return cupom ? { ...cupom } : null;
}

export function aplicarDesconto(valor: Centavos, cupom?: CupomAplicado | null): Centavos {
  return cupom ? Math.round(valor * (100 - cupom.percentualDesconto) / 100) : valor;
}
