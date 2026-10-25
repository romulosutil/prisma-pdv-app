import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// A condição das ferramentas de teste fica escrita por extenso nestes arquivos para o Metro eliminar o
// diagnóstico do bundle de produção. Se uma cópia divergir da flag, o diagnóstico pode vazar para produção.
const CONDICAO = "__DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1'";
const ARQUIVOS = ['src/util/ferramentasTeste.ts', 'app/_layout.tsx', 'app/(tabs)/index.tsx', 'app/(tabs)/ajustes/index.tsx'];

const ler = (relativo: string) => readFileSync(fileURLToPath(new URL(`../${relativo}`, import.meta.url)), 'utf8');

describe('flag das ferramentas de teste', () => {
  it.each(ARQUIVOS)('%s usa exatamente a mesma condição', (arquivo) => {
    expect(ler(arquivo)).toContain(CONDICAO);
  });
});
