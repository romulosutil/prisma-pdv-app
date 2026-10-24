import { useMemo } from 'react';
import { useLicenca, usePreferencias } from '@/dados/hooks';
import { PROVEDORES, type InfoProvedor } from '@/util/provedores';

/**
 * O que o plano e as conexões permitem cobrar. Pix com confirmação automática e aproximação exigem o
 * recurso `integracao_pagamentos` (Negócio/Pro) e um provedor conectado.
 */
export function useMeiosDisponiveis(): {
  /** O plano inclui a integração com provedores. */
  integracao: boolean;
  conectados: InfoProvedor[];
  /** Plano com integração e pelo menos um provedor conectado. */
  comProvedor: boolean;
  /** Provedor usado quando o operador não escolhe: o Pix padrão, se conectado. */
  padrao: InfoProvedor | undefined;
} {
  const { podeUsar } = useLicenca();
  const { preferencias } = usePreferencias();
  const integracao = podeUsar('integracao_pagamentos');
  return useMemo(() => {
    const conectados = PROVEDORES.filter((p) => preferencias.conectados[p.id]);
    return {
      integracao,
      conectados,
      comProvedor: integracao && conectados.length > 0,
      padrao: conectados.find((p) => p.id === preferencias.pixPadrao) ?? conectados[0],
    };
  }, [integracao, preferencias.conectados, preferencias.pixPadrao]);
}
