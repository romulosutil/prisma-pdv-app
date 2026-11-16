/**
 * API local descartável para scripts/homologar-local.mjs: PGlite em memória, relógio de desenvolvimento, rotas /dev,
 * códigos de acesso devolvidos no corpo (modo desenvolvimento) e cobrança desativada (conta nova recebe acesso liberado, plano Pro).
 * Executar com tsx (imports sem extensão): node --import tsx scripts/homologar-local-api.mts
 * Imprime `PDV_API_PORTA=<n>` quando pronta e encerra ao receber SIGTERM/SIGINT ou quando o stdin é fechado.
 */
import { criarBillingDesativado } from '../apps/api/src/billing';
import { abrirPglite } from '../apps/api/src/db/conexao';
import { RelogioDeDesenvolvimento } from '../apps/api/src/relogio-dev';
import { criarApp } from '../apps/api/src/servidor';

if (process.env.NODE_ENV === 'production') throw new Error('Esta API local não roda em produção.');
const conexao = await abrirPglite();
const app = await criarApp({ db: conexao.db, relogio: new RelogioDeDesenvolvimento(), billing: criarBillingDesativado(), cobrancaDesativada: true, fontesEan: [], logger: false, emissaoCodigo: { modo: 'desenvolvimento' } });
await app.listen({ port: 0, host: '127.0.0.1' });
const endereco = app.server.address();
if (!endereco || typeof endereco === 'string') throw new Error('Porta indisponível.');
console.log('PDV_API_PORTA=' + endereco.port);
const encerrar = () => { void app.close().then(() => conexao.fechar()).finally(() => process.exit(0)); };
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
process.stdin.on('end', encerrar);
process.stdin.resume();
