import { temAcesso, type Assinatura } from '@pdv/shared';

export type DestinoDoFluxo = '/' | '/boas-vindas' | '/planos' | '/bloqueio';

export interface EstadoDoFluxo {
  temConta: boolean;
  assinatura: Assinatura | null;
  agora: Date;
}

const ANTES_DA_CONTA = ['boas-vindas', 'entrar', 'criar-conta', 'loja'];
const ASSINAR = ['planos', 'cartao'];
/** Telas que o usuário ainda vê logo depois de assinar (a de cartão fica até a navegação terminar). */
const DEPOIS_DE_ASSINAR = ['cartao', 'teste-iniciado', 'pagamentos', 'camera'];

/**
 * Guarda de fluxo: sem conta → onboarding; sem assinatura → paywall; sem acesso (suspensa ou
 * cancelada vencida) → bloqueio; senão → abas. Devolve para onde redirecionar, ou `null` se a
 * tela atual (`segmentos` do expo-router) já é permitida.
 */
export function decidirRota(estado: EstadoDoFluxo, segmentos: readonly string[]): DestinoDoFluxo | null {
  const [raiz, tela = ''] = segmentos;
  const noOnboarding = raiz === '(onboarding)';

  if (!estado.temConta) return noOnboarding && ANTES_DA_CONTA.includes(tela) ? null : '/boas-vindas';

  const { assinatura, agora } = estado;
  if (!assinatura || assinatura.status === 'sem_assinatura') {
    return noOnboarding && ASSINAR.includes(tela) ? null : '/planos';
  }

  if (!temAcesso(assinatura, agora)) {
    return raiz === 'bloqueio' || raiz === 'atualizar-cartao' ? null : '/bloqueio';
  }

  if (noOnboarding) return DEPOIS_DE_ASSINAR.includes(tela) ? null : '/';
  if (raiz === 'bloqueio') return '/';
  return null;
}
