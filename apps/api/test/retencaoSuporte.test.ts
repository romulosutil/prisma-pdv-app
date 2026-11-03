import { afterEach, expect, it, vi } from 'vitest';
import { agendarRetencaoSuporte } from '../src/servicos/retencaoSuporte';
afterEach(() => vi.useRealTimers());
it('retenção diária não sobrepõe execuções e encerra depois de drenar a operação ativa', async () => {
  vi.useFakeTimers(); let concluir!: (n: number) => void;
  const processar = vi.fn(() => new Promise<number>(r => { concluir = r; }));
  const registrar = vi.fn(), parar = agendarRetencaoSuporte(processar, registrar);
  await vi.advanceTimersByTimeAsync(2 * 86400000); expect(processar).toHaveBeenCalledOnce();
  let encerrado = false; const parada = parar().then(() => { encerrado = true; });
  await Promise.resolve(); expect(encerrado).toBe(false);
  concluir(3); await parada; expect(registrar).toHaveBeenCalledWith('[suporte] retenção concluída: 3');
  await vi.advanceTimersByTimeAsync(86400000); expect(processar).toHaveBeenCalledOnce();
});
it('falha de retenção não expõe erro bruto e a próxima passada tenta novamente', async () => {
  vi.useFakeTimers(); const processar = vi.fn().mockRejectedValueOnce(new Error('segredo')).mockResolvedValue(0), registrar = vi.fn();
  const parar = agendarRetencaoSuporte(processar, registrar);
  await vi.advanceTimersByTimeAsync(86400000); expect(registrar).toHaveBeenCalledWith('[suporte] retenção falhou');
  await vi.advanceTimersByTimeAsync(86400000); expect(processar).toHaveBeenCalledTimes(2); await parar();
  expect(JSON.stringify(registrar.mock.calls)).not.toContain('segredo');
});
