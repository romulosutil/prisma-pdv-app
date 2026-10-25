import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // `__DEV__` é global do React Native; nos testes (Node) as ferramentas de teste ficam desligadas por padrão.
  define: { __DEV__: false },
  test: { include: ['test/**/*.test.ts'] },
});
