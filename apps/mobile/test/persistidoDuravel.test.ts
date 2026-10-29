import { describe, expect, it, vi } from 'vitest';
import { ArmazenamentoAsync, type Armazenamento } from '@/dados/armazenamento';
import { Persistido } from '@/dados/observavel';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), getAllKeys: vi.fn(), multiRemove: vi.fn() },
}));

function pendente<T>() {
  let resolver!: (valor: T) => void;
  let rejeitar!: (erro: Error) => void;
  const promessa = new Promise<T>((resolve, reject) => { resolver = resolve; rejeitar = reject; });
  return { promessa, resolver, rejeitar };
}

class Contador extends Persistido<number> {
  incrementar() { return this.modificar((atual) => atual + 1); }
}

function armazenamento(): Armazenamento {
  let valor: number | null = null;
  return {
    obter: async <T>() => valor as T | null,
    gravar: async <T>(_chave: string, novo: T) => { valor = novo as number; },
    remover: async () => { valor = null; },
    limpar: async () => { valor = null; },
  };
}

describe('Persistido durável', () => {
  it('publica e notifica somente depois da gravação', async () => {
    const arm = armazenamento();
    const bloqueio = pendente<void>();
    arm.gravar = vi.fn(async () => bloqueio.promessa);
    const contador = new Contador(arm, 'contador', 0);
    const ouvinte = vi.fn();
    contador.assinar(ouvinte);
    const escrita = contador.incrementar();
    await Promise.resolve();
    expect(contador.obter()).toBe(0);
    expect(ouvinte).not.toHaveBeenCalled();
    bloqueio.resolver();
    await expect(escrita).resolves.toBe(1);
    expect(contador.obter()).toBe(1);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('preserva o snapshot após falha e permite nova escrita', async () => {
    const arm = armazenamento();
    const gravar = arm.gravar.bind(arm);
    arm.gravar = vi.fn().mockRejectedValueOnce(new Error('falha')).mockImplementation(gravar);
    const contador = new Contador(arm, 'contador', 0);
    const ouvinte = vi.fn();
    contador.assinar(ouvinte);
    await expect(contador.incrementar()).rejects.toThrow('falha');
    expect(contador.obter()).toBe(0);
    expect(ouvinte).not.toHaveBeenCalled();
    await expect(contador.incrementar()).resolves.toBe(1);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });

  it('compõe modificações concorrentes na ordem', async () => {
    const arm = armazenamento();
    const gravar = arm.gravar.bind(arm);
    const bloqueio = pendente<void>();
    let primeira = true;
    arm.gravar = async (chave, valor) => {
      if (primeira) { primeira = false; await bloqueio.promessa; }
      await gravar(chave, valor);
    };
    const contador = new Contador(arm, 'contador', 0);
    const a = contador.incrementar();
    const b = contador.incrementar();
    bloqueio.resolver();
    expect(await Promise.all([a, b])).toEqual([1, 2]);
    expect(contador.obter()).toBe(2);
    expect(await arm.obter('contador')).toBe(2);
  });

  it('aguarda a remoção ao reiniciar e preserva o estado se ela falhar', async () => {
    const arm = armazenamento();
    const bloqueio = pendente<void>();
    arm.remover = vi.fn(() => bloqueio.promessa);
    const contador = new Contador(arm, 'contador', 5);
    const ouvinte = vi.fn();
    contador.assinar(ouvinte);
    const reset = contador.reiniciar(0);
    await Promise.resolve();
    expect(contador.obter()).toBe(5);
    expect(ouvinte).not.toHaveBeenCalled();
    bloqueio.rejeitar(new Error('remoção falhou'));
    await expect(reset).rejects.toThrow('remoção falhou');
    expect(contador.obter()).toBe(5);
    expect(ouvinte).not.toHaveBeenCalled();
    await contador.incrementar();
    expect(contador.obter()).toBe(6);
  });

  it('ordena carregar com gravações e reinicializações', async () => {
    const arm = armazenamento();
    const bloqueio = pendente<void>();
    const gravar = arm.gravar.bind(arm);
    arm.gravar = async (chave, valor) => { await bloqueio.promessa; await gravar(chave, valor); };
    const contador = new Contador(arm, 'contador', 0);
    const escrita = contador.incrementar();
    const carregar = contador.carregar();
    const reset = contador.reiniciar(9);
    const depois = contador.incrementar();
    bloqueio.resolver();
    await Promise.all([escrita, carregar, reset, depois]);
    expect(contador.obter()).toBe(10);
    expect(await arm.obter('contador')).toBe(10);
  });
});

describe('ArmazenamentoAsync', () => {
  it('rejeita JSON corrompido sem expor nem remover o conteúdo', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('{segredo');
    await expect(new ArmazenamentoAsync().obter('chave')).rejects.toThrow('Dados armazenados contêm JSON inválido.');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
