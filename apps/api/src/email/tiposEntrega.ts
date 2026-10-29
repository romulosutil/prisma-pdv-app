import type { Relogio } from '@pdv/shared';
import type { CanalCodigo } from './contrato';
import type { criarCifradorCodigo } from './cifrador';
import type { ConfiguracaoSmtp } from './smtp';

export interface ChavesCodigo {
  ativaId: string;
  cifradores: ReadonlyMap<string, ReturnType<typeof criarCifradorCodigo>>;
}

export type EmissaoCodigo = { modo: 'desenvolvimento' } | {
  modo: 'email'; chaves: ChavesCodigo; dominioRemetente: string;
};

export type ConfiguracaoEntregaCodigo = { modo: 'desenvolvimento' } | {
  modo: 'smtp';
  smtp: ConfiguracaoSmtp;
  chaves: ChavesCodigo;
};

export interface ResumoEntregaCodigo {
  aceitas: number;
  retentativas: number;
  canceladas: number;
  falhas: number;
  bloqueadas: number;
  ignoradas: number;
}

export interface OpcoesEntregaCodigo {
  chaves: ChavesCodigo;
  canal: CanalCodigo;
  /** O mesmo domínio do remetente configurado no canal, vinculado à entrega. */
  dominioRemetente: string;
  relogio: Relogio;
  limite?: number;
}

export type MotivoEntregaCodigo = 'substituida' | 'usado' | 'esgotado' | 'expirado' |
  'permanente' | 'temporario' | 'tentativas_esgotadas' | 'chave_ausente' | 'payload_invalido' | 'canal_incompativel';
