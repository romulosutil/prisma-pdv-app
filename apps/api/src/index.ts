import { fileURLToPath } from 'node:url';
import { relogioSistema, type Relogio } from '@pdv/shared';
import { criarBilling } from './billing';
import { validarConfiguracao } from './configuracao';
import { abrirPglite, abrirPostgres } from './db/conexao';
import { openFoodFacts } from './fontes/openFoodFacts';
import { agendarCobranca } from './jobs';
import { RelogioDeDesenvolvimento } from './relogio-dev';
import { criarApp } from './servidor';

const configuracao = validarConfiguracao(process.env);
const producao = configuracao.ambiente === 'production';

const conexao = configuracao.databaseUrl
  ? await abrirPostgres(configuracao.databaseUrl)
  : await abrirPglite(fileURLToPath(new URL('../.data/pglite', import.meta.url)));

// Fora de produção o relógio pode ser avançado pelas rotas /dev/relogio.
const relogio: Relogio = producao ? relogioSistema : new RelogioDeDesenvolvimento();
const billing = criarBilling(configuracao.billingProvider);
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

await app.listen({ port: configuracao.porta, host: '0.0.0.0' });
