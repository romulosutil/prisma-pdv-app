import { avaliar, CARENCIA_INADIMPLENCIA_DIAS, type Assinatura, type StatusAssinatura } from './assinatura';
import { adicionarDias, MS_POR_DIA } from './datas';
import { PLANOS, type Limites, type PlanoId, type Recurso } from './planos';

/** Sem sincronizar por mais que isso, o app pede conexão antes de abrir uma nova venda. */
export const OFFLINE_MAX_DIAS = 7;

export interface Licenca {
  planoId: PlanoId;
  status: StatusAssinatura;
  validaAte: Date;
  limites: Limites;
  recursos: Recurso[];
  emitidaEm: Date;
}

export interface LicencaSerializada {
  planoId: PlanoId;
  status: StatusAssinatura;
  validaAte: string;
  limites: Limites;
  recursos: Recurso[];
  emitidaEm: string;
}

export type MotivoBloqueio = 'expirada' | 'precisa_sincronizar' | 'suspensa';

export type PermissaoDeVenda = { permitido: true } | { permitido: false; motivo: MotivoBloqueio };

function validaAteDe(a: Assinatura, agora: Date): Date {
  switch (a.status) {
    case 'liberada':
      return adicionarDias(agora, OFFLINE_MAX_DIAS);
    case 'em_teste':
    case 'ativa':
      return adicionarDias(a.periodoAtualFim, CARENCIA_INADIMPLENCIA_DIAS);
    case 'inadimplente':
      return adicionarDias(a.inadimplenteDesde ?? agora, CARENCIA_INADIMPLENCIA_DIAS);
    case 'cancelada':
      return a.acessoAte ?? agora;
    default:
      return agora;
  }
}

/** Licença que o servidor emite e o aparelho guarda para decidir offline. */
export function licencaDe(assinatura: Assinatura, agora: Date): Licenca {
  const a = avaliar(assinatura, agora);
  const plano = PLANOS[a.planoId];
  return {
    planoId: a.planoId,
    status: a.status,
    validaAte: validaAteDe(a, agora),
    limites: { ...plano.limites },
    recursos: [...plano.recursos],
    emitidaEm: agora,
  };
}

export function licencaPermiteVenda(l: Licenca, agora: Date): PermissaoDeVenda {
  if (l.status === 'suspensa' || l.status === 'sem_assinatura') return { permitido: false, motivo: 'suspensa' };
  if (agora.getTime() > l.validaAte.getTime()) return { permitido: false, motivo: 'expirada' };
  if (agora.getTime() - l.emitidaEm.getTime() > OFFLINE_MAX_DIAS * MS_POR_DIA) {
    return { permitido: false, motivo: 'precisa_sincronizar' };
  }
  return { permitido: true };
}

export function serializarLicenca(l: Licenca): LicencaSerializada {
  return { ...l, validaAte: l.validaAte.toISOString(), emitidaEm: l.emitidaEm.toISOString() };
}

export function desserializarLicenca(s: LicencaSerializada): Licenca {
  return { ...s, validaAte: new Date(s.validaAte), emitidaEm: new Date(s.emitidaEm) };
}
