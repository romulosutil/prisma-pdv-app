import { fileURLToPath } from 'node:url';
import { relogioSistema, type Relogio } from '@pdv/shared';
import { criarBilling } from './billing';
import { abrirPglite, abrirPostgres } from './db/conexao';
import { openFoodFacts } from './fontes/openFoodFacts';
import { agendarCobranca } from './jobs';
import { RelogioDeDesenvolvimento } from './relogio-dev';
import { criarApp } from './servidor';

const producao = process.env.NODE_ENV === 'production';
const porta = Number(process.env.PORT ?? 3333);

if (producao && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL é obrigatória em produção.');
}

const conexao = process.env.DATABASE_URL
  ? await abrirPostgres(process.env.DATABASE_URL)
  : await abrirPglite(fileURLToPath(new URL('../.data/pglite', import.meta.url)));

// Fora de produção o relógio pode ser avançado pelas rotas /dev/relogio.
const relogio: Relogio = producao ? relogioSistema : new RelogioDeDesenvolvimento();
const billing = criarBilling(process.env.BILLING_PROVIDER);
const app = await criarApp({ db: conexao.db, relogio, billing, fontesEan: [openFoodFacts], logger: true });

const pararJob =
  process.env.JOBS === 'off' ? () => undefined : agendarCobranca(conexao.db, billing, relogio, (m) => app.log.info(m));

async function encerrar(): Promise<void> {
  pararJob();
  await app.close();
  await conexao.fechar();
  process.exit(0);
}
process.on('SIGINT', () => void encerrar());
process.on('SIGTERM', () => void encerrar());

await app.listen({ port: porta, host: '0.0.0.0' });
