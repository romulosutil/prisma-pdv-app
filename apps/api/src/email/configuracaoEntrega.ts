import { criarCifradorCodigo } from './cifrador';
import { ErroCanalEmail } from './contrato';
import { lerConfiguracaoSmtp } from './smtp';
import type { ConfiguracaoEntregaCodigo } from './tiposEntrega';

const idValido = /^[a-zA-Z0-9_-]{1,64}$/;
const reservados = new Set(['__proto__', 'constructor', 'prototype']);

export function lerConfiguracaoEntregaCodigo(env: NodeJS.ProcessEnv): ConfiguracaoEntregaCodigo {
  try {
    const ambiente = env.NODE_ENV ?? 'development';
    if (ambiente !== 'development' && ambiente !== 'test' && ambiente !== 'production') throw new Error();
    const modo = env.EMAIL_CODIGO_MODE ?? (ambiente === 'production' ? undefined : 'desenvolvimento');
    if (modo === 'desenvolvimento') {
      if (ambiente === 'production' || env.EMAIL_CODIGO_KEY_ID !== undefined || env.EMAIL_CODIGO_KEYS !== undefined ||
          Object.keys(env).some(chave => chave.startsWith('SMTP_') && env[chave] !== undefined)) throw new Error();
      return { modo };
    }
    if (modo !== 'smtp') throw new Error();
    const ativaId = env.EMAIL_CODIGO_KEY_ID;
    if (!ativaId || !idValido.test(ativaId) || reservados.has(ativaId)) throw new Error();
    const dados: unknown = JSON.parse(env.EMAIL_CODIGO_KEYS ?? '');
    if (typeof dados !== 'object' || dados === null || Array.isArray(dados) || Object.getPrototypeOf(dados) !== Object.prototype) throw new Error();
    const entradas = Object.entries(dados);
    if (entradas.length < 1 || entradas.length > 4) throw new Error();
    const cifradores = new Map<string, ReturnType<typeof criarCifradorCodigo>>();
    for (const [id, chave] of entradas) {
      if (!idValido.test(id) || reservados.has(id) || typeof chave !== 'string') throw new Error();
      cifradores.set(id, criarCifradorCodigo(chave));
    }
    if (!cifradores.has(ativaId)) throw new Error();
    return { modo, smtp: lerConfiguracaoSmtp(env), chaves: { ativaId, cifradores } };
  } catch {
    throw new ErroCanalEmail('configuracao');
  }
}
