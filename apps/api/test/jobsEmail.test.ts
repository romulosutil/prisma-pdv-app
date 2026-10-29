import { afterEach, describe, expect, it, vi } from 'vitest';
import { agendarEntregasCodigo } from '../src/jobsEmail';

const resumo = { aceitas: 1, retentativas: 2, canceladas: 3, falhas: 4, bloqueadas: 5, ignoradas: 6 };
afterEach(() => vi.useRealTimers());

describe('scheduler de entregas', () => {
  it('inicia novas passadas somente a cada 5000 ms', async () => {
    vi.useFakeTimers();
    const processar = vi.fn().mockResolvedValue(resumo);
    const parar = agendarEntregasCodigo(processar, vi.fn());
    expect(processar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4999);
    expect(processar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(processar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4999);
    expect(processar).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(processar).toHaveBeenCalledTimes(3);
    await parar();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('executa imediatamente, não sobrepõe e aguarda a passada ao parar', async () => {
    vi.useFakeTimers();
    let resolver!: (value: typeof resumo) => void;
    const processar = vi.fn(() => new Promise<typeof resumo>(resolve => { resolver = resolve; }));
    const registrar = vi.fn();
    const parar = agendarEntregasCodigo(processar, registrar);
    expect(processar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(15000);
    expect(processar).toHaveBeenCalledTimes(1);
    let parado = false;
    const espera = parar().then(() => { parado = true; });
    await Promise.resolve();
    expect(parado).toBe(false);
    resolver(resumo);
    await espera;
    expect(parado).toBe(true);
    expect(registrar).toHaveBeenCalledWith(`[email] ${JSON.stringify(resumo)}`);
    await parar();
    await vi.advanceTimersByTimeAsync(10000);
    expect(processar).toHaveBeenCalledTimes(1);
  });
  it('recupera após falha e logger que lança, sem divulgar erro', async () => {
    vi.useFakeTimers();
    const processar = vi.fn().mockRejectedValueOnce(new Error('segredo')).mockResolvedValue(resumo);
    const registrar = vi.fn().mockImplementationOnce(() => { throw new Error('segredo logger'); });
    const parar = agendarEntregasCodigo(processar, registrar);
    await vi.advanceTimersByTimeAsync(5000);
    expect(processar).toHaveBeenCalledTimes(2);
    expect(registrar.mock.calls[0]?.[0]).not.toContain('segredo');
    expect(registrar.mock.calls[1]?.[0]).toBe(`[email] ${JSON.stringify(resumo)}`);
    await parar();
  });
});
