import { expect, it } from 'vitest';
import { AcessoOffline, PRAZO_OFFLINE_MS } from '../src/dados/acessoOffline';
import { ArmazenamentoMemoria } from './ambiente';

const identidade = { contaId: 'conta', lojaId: 'loja', operadorId: 'ana', aparelhoId: 'aparelho' };
it('limita sete dias desde a validação e não renova ao usar ou reiniciar', async () => {
  const base = new ArmazenamentoMemoria(); let em = Date.parse('2026-11-02T12:00:00Z');
  let acesso = new AcessoOffline(base, () => new Date(em));
  await acesso.carregar(identidade); expect(acesso.permitido(identidade)).toBe(false);
  await acesso.confirmar(identidade); const limite = acesso.limite(identidade);
  em += PRAZO_OFFLINE_MS - 1; await acesso.observar(identidade);
  acesso = new AcessoOffline(base, () => new Date(em)); await acesso.carregar(identidade);
  expect(acesso.permitido(identidade)).toBe(true); expect(acesso.limite(identidade)).toBe(limite);
  em++; await expect(acesso.observar(identidade)).rejects.toThrow('sete dias');
});
it('isola empresa, loja, operador e aparelho; recusa relógio anterior ao último uso persistido', async () => {
  const base = new ArmazenamentoMemoria(); let em = 100000000;
  const acesso = new AcessoOffline(base, () => new Date(em));
  await acesso.confirmar(identidade); em += 10000; await acesso.observar(identidade); em--;
  const reiniciado = new AcessoOffline(base, () => new Date(em)); await reiniciado.carregar(identidade);
  await expect(reiniciado.observar(identidade)).rejects.toThrow('revalidar');
  for (const campo of ['contaId', 'lojaId', 'operadorId', 'aparelhoId'] as const) {
    const outra = { ...identidade, [campo]: 'outro' }; await reiniciado.carregar(outra);
    expect(reiniciado.permitido(outra)).toBe(false);
  }
  await reiniciado.confirmar(identidade); expect(reiniciado.permitido(identidade)).toBe(true);
});
