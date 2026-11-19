import type { Centavos } from './dinheiro';

export const PLANOS_ORDEM = ['free', 'essencial', 'negocio', 'pro'] as const;
export type PlanoId = (typeof PLANOS_ORDEM)[number];

/** Oferta atual: Free + Pago. Os demais IDs continuam legíveis para assinaturas antigas. */
export const PLANOS_DISPONIVEIS = ['free', 'pro'] as const;
export const PLANO_PADRAO: PlanoId = 'free';

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

const RECURSOS_FREE: Recurso[] = ['estoque', 'sangria_suprimento'];

const RECURSOS_NEGOCIO: Recurso[] = [
  'estoque',
  'sangria_suprimento',
  'relatorios_periodo',
  'exportar_csv',
];

function criarPlanosIniciais(): Record<PlanoId, Plano> {
  return {
    free: {
      id: 'free',
      nome: 'Gratuito',
      precoMensalCentavos: 0,
      descricaoCurta: 'Vendas ilimitadas no balcão, caixa e estoque básico para começar grátis',
      maisEscolhido: false,
      limites: { produtos: 500, aparelhos: 1, operadores: 1, lojas: 1, historicoDias: 90 },
      recursos: [...RECURSOS_FREE],
    },
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
      maisEscolhido: false,
      limites: { produtos: null, aparelhos: 3, operadores: 3, lojas: 1, historicoDias: 730 },
      recursos: [...RECURSOS_NEGOCIO],
    },
    pro: {
      id: 'pro',
      nome: 'Pro',
      precoMensalCentavos: 4990,
      descricaoCurta: 'Maquininhas integradas, equipe, fiado, relatórios completos e até 3 lojas',
      maisEscolhido: true,
      limites: { produtos: null, aparelhos: 10, operadores: null, lojas: 3, historicoDias: null },
      recursos: [...RECURSOS],
    },
  };
}

export const PLANOS: Record<PlanoId, Plano> = criarPlanosIniciais();

export type ConfiguracaoPlano = Partial<{
  nome: string;
  precoMensalCentavos: Centavos;
  descricaoCurta: string;
  maisEscolhido: boolean;
  limites: Partial<Limites>;
  recursos: readonly Recurso[];
}>;

/** Permite ajustar limites, recursos e preço de Free e Pro por configuração. */
export function configurarPlano(planoId: 'free' | 'pro', parcial: ConfiguracaoPlano): Plano {
  if (parcial.precoMensalCentavos !== undefined && (!Number.isSafeInteger(parcial.precoMensalCentavos) || parcial.precoMensalCentavos < 0)) {
    throw new Error('Preço do plano inválido.');
  }
  const atual = PLANOS[planoId];
  const proximo: Plano = {
    ...atual,
    ...(parcial.nome !== undefined ? { nome: parcial.nome } : {}),
    ...(parcial.precoMensalCentavos !== undefined ? { precoMensalCentavos: parcial.precoMensalCentavos } : {}),
    ...(parcial.descricaoCurta !== undefined ? { descricaoCurta: parcial.descricaoCurta } : {}),
    ...(parcial.maisEscolhido !== undefined ? { maisEscolhido: parcial.maisEscolhido } : {}),
    limites: { ...atual.limites, ...(parcial.limites ?? {}) },
    recursos: parcial.recursos ? [...parcial.recursos] : [...atual.recursos],
  };
  PLANOS[planoId] = proximo;
  return proximo;
}

export function restaurarPlanosPadrao(): void {
  const iniciais = criarPlanosIniciais();
  for (const id of PLANOS_ORDEM) PLANOS[id] = iniciais[id];
}

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
  const disponivel = PLANOS_DISPONIVEIS.find((id) => podeUsar(id, recurso));
  if (disponivel) return disponivel;
  const legado = PLANOS_ORDEM.find((id) => podeUsar(id, recurso));
  if (!legado) throw new Error(`Nenhum plano oferece o recurso "${recurso}"`);
  return legado;
}
