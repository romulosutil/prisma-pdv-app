import {
  deveLembrarFimTeste,
  diasRestantesTeste,
  formatarBRL,
  formatarDataCurta,
  valorMensalAssinatura,
  temAcesso,
  type Assinatura,
} from '@pdv/shared';

export interface AvisoAssinatura {
  tipo: 'info' | 'atencao' | 'erro';
  texto: string;
  acao: { rotulo: string; destino: '/atualizar-cartao' | '/ajustes/assinatura' };
}

/** Banner da tela Início: fim do teste (D-2), cobrança que falhou ou cancelamento com acesso restante. */
export function avisoDeAssinatura(assinatura: Assinatura | null, agora: Date): AvisoAssinatura | null {
  if (!assinatura) return null;

  if (deveLembrarFimTeste(assinatura, agora)) {
    const dias = diasRestantesTeste(assinatura, agora);
    const preco = formatarBRL(valorMensalAssinatura(assinatura));
    return {
      tipo: 'info',
      texto: `Seu teste termina em ${dias} ${dias === 1 ? 'dia' : 'dias'}. Em ${formatarDataCurta(assinatura.testeTerminaEm)} cobraremos ${preco}.`,
      acao: { rotulo: 'Ver assinatura', destino: '/ajustes/assinatura' },
    };
  }

  if (assinatura.status === 'inadimplente') {
    return {
      tipo: 'erro',
      texto: 'Não conseguimos cobrar seu cartão. Atualize para continuar vendendo.',
      acao: { rotulo: 'Atualizar cartão', destino: '/atualizar-cartao' },
    };
  }

  if (assinatura.status === 'cancelada' && assinatura.acessoAte && temAcesso(assinatura, agora)) {
    return {
      tipo: 'atencao',
      texto: `Sua assinatura termina em ${formatarDataCurta(assinatura.acessoAte)}. Reative para continuar vendendo depois dessa data.`,
      acao: { rotulo: 'Reativar', destino: '/ajustes/assinatura' },
    };
  }

  return null;
}
