import type { StatusAssinatura } from '@pdv/shared';
import type { TipoStatus } from '@/componentes/StatusPill';

export const STATUS_VISUAL: Record<StatusAssinatura, { tipo: TipoStatus; texto: string }> = {
  liberada: { tipo: 'pago', texto: 'Acesso liberado' },
  sem_assinatura: { tipo: 'pendente', texto: 'Sem assinatura' },
  em_teste: { tipo: 'sincronizando', texto: 'Em teste' },
  ativa: { tipo: 'pago', texto: 'Ativa' },
  inadimplente: { tipo: 'pendente', texto: 'Pagamento pendente' },
  suspensa: { tipo: 'cancelado', texto: 'Suspensa' },
  cancelada: { tipo: 'cancelado', texto: 'Cancelada' },
};
