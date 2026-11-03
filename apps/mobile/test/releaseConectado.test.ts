import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { RelogioApp } from '@/release/relogio';
import { buscarCatalogoDemo, consultarCatalogoDemo } from '@/release/catalogoDemo';
import { ArmazenamentoMemoria } from './ambiente';
const { substituicoesRelease } = createRequire(import.meta.url)('../config/isolamentoRelease.js');
it('release conectado retira implementações demo do grafo sem mudar os perfis de desenvolvimento', () => {
  const raiz = resolve('.');
  for (const ambiente of ['homologacao', 'producao']) {
    const mapa: Map<string, string> = substituicoesRelease(raiz, ambiente);
    expect(mapa.size).toBe(8);
    expect(mapa.get(resolve(raiz, '../../packages/shared/src/billing.ts'))).toBe(resolve(raiz, 'src/release/billing.ts'));
  }
  expect(substituicoesRelease(raiz, 'demo').size).toBe(0);
  expect(substituicoesRelease(raiz, undefined).size).toBe(0);
});
it('relógio do release ignora deslocamento persistido pela demo e recusa avanço artificial', async () => {
  const a = new ArmazenamentoMemoria(); await a.gravar('relogio_dias', 100);
  const r = new RelogioApp(a); await r.carregar();
  expect(Math.abs(r.agora().getTime() - Date.now())).toBeLessThan(1000);
  await expect(r.avancarDias(7)).rejects.toThrow('indisponível');
});
it('catálogo conectado sem API recusa a consulta em vez de sugerir produto fictício', async () => {
  expect(() => buscarCatalogoDemo('7891000100103')).toThrow('exige uma API');
  await expect(consultarCatalogoDemo('7891000100103')).rejects.toThrow('exige uma API');
});
