import type { Centavos } from './dinheiro';

export const PLANOS_ORDEM = ['essencial', 'negocio', 'pro'] as const;
export type PlanoId = (typeof PLANOS_ORDEM)[number];

/** Oferta atual. Os demais IDs continuam legíveis para assinaturas antigas. */
export const PLANOS_DISPONIVEIS = ['pro'] as const;
export const PLANO_PADRAO: PlanoId = 'pro';

export const RECURSOS = [
  'integracao_pagamentos',
  'estoque',
  'sangria_suprimento',
  'relatorios_periodo',
  'exportar_csv',
  'relatorios_avancados',
  'fiado',
  'caixa_por_operador',
  'permissoes',
  'multiloja',
] as const;
export type Recurso = (typeof RECURSOS)[number];

/** `null` = ilimitado. Vendas nunca são limitadas. */
export interface Limites {
  produtos: number | null;
  aparelhos: number;
  operadores: number | null;
  lojas: number;
  historicoDias: number | null;
}
export type ChaveLimite = keyof Limites;

export interface Plano {
  id: PlanoId;
  nome: string;
  precoMensalCentavos: Centavos;
  descricaoCurta: string;
  maisEscolhido: boolean;
  limites: Limites;
  recursos: Recurso[];
}

const RECURSOS_NEGOCIO: Recurso[] = [
  'integracao_pagamentos',
  'estoque',
  'sangria_suprimento',
  'relatorios_periodo',
  'exportar_csv',
];

export const PLANOS: Record<PlanoId, Plano> = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    precoMensalCentavos: 1990,
    descricaoCurta: 'Para quem vende sozinho, com 1 celular',
    maisEscolhido: false,
    limites: { produtos: 500, aparelhos: 1, operadores: 1, lojas: 1, historicoDias: 90 },
    recursos: [],
  },
  negocio: {
    id: 'negocio',
    nome: 'Negócio',
    precoMensalCentavos: 3490,
    descricaoCurta: 'Para lojas com até 3 pessoas no balcão',
    maisEscolhido: true,
    limites: { produtos: null, aparelhos: 3, operadores: 3, lojas: 1, historicoDias: 730 },
    recursos: RECURSOS_NEGOCIO,
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    precoMensalCentavos: 4990,
    descricaoCurta: 'Venda e registre seus recebimentos em um só plano',
    maisEscolhido: false,
    limites: { produtos: null, aparelhos: 10, operadores: null, lojas: 3, historicoDias: null },
    recursos: [
      ...RECURSOS_NEGOCIO,
      'relatorios_avancados',
      'fiado',
      'caixa_por_operador',
      'permissoes',
      'multiloja',
    ],
  },
};

export function podeUsar(planoId: PlanoId, recurso: Recurso): boolean {
  return PLANOS[planoId].recursos.includes(recurso);
}

export function limite(planoId: PlanoId, chave: ChaveLimite): number | null {
  return PLANOS[planoId].limites[chave];
}

/** true se ainda cabe mais um: `usoAtual` abaixo do limite, ou limite ilimitado. */
export function dentroDoLimite(planoId: PlanoId, chave: ChaveLimite, usoAtual: number): boolean {
  const max = limite(planoId, chave);
  return max === null || usoAtual < max;
}

export function planoMinimoPara(recurso: Recurso): PlanoId {
  const plano = PLANOS_ORDEM.find((id) => podeUsar(id, recurso));
  if (!plano) throw new Error(`Nenhum plano oferece o recurso "${recurso}"`);
  return plano;
}
