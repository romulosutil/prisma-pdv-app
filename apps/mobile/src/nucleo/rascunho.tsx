import type { PlanoId } from '@pdv/shared';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export const TIPOS_DE_LOJA = ['Mercadinho', 'Padaria', 'Adega', 'Banca', 'Conveniência'] as const;
export type TipoDeLoja = (typeof TIPOS_DE_LOJA)[number];

/** Respostas do onboarding enquanto a conta ainda não existe (ficam só em memória). */
export interface Rascunho {
  nomeResponsavel: string;
  email: string;
  /** Só dígitos. */
  documento: string;
  nomeLoja: string;
  tipoLoja: TipoDeLoja;
  planoId: PlanoId;
}

interface ApiRascunho {
  rascunho: Rascunho;
  alterar: (parcial: Partial<Rascunho>) => void;
}

const RASCUNHO_INICIAL: Rascunho = {
  nomeResponsavel: '',
  email: '',
  documento: '',
  nomeLoja: 'Mercadinho Bom Preço',
  tipoLoja: 'Mercadinho',
  planoId: 'pro',
  // Em desenvolvimento o cadastro já vem preenchido (CPF de teste válido) para agilizar a revisão do fluxo.
  ...(__DEV__ ? { nomeResponsavel: 'Ana Souza', email: 'ana@bompreco.com.br', documento: '52998224725' } : {}),
};

const ContextoRascunho = createContext<ApiRascunho | null>(null);

export function RascunhoProvider({ children }: { children: ReactNode }) {
  const [rascunho, setRascunho] = useState(RASCUNHO_INICIAL);
  const api = useMemo<ApiRascunho>(() => ({ rascunho, alterar: (parcial) => setRascunho((atual) => ({ ...atual, ...parcial })) }), [rascunho]);
  return <ContextoRascunho.Provider value={api}>{children}</ContextoRascunho.Provider>;
}

export function useRascunho(): ApiRascunho {
  const api = useContext(ContextoRascunho);
  if (!api) throw new Error('useRascunho precisa estar dentro de <RascunhoProvider>');
  return api;
}
