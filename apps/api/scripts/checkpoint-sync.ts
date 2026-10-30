/** Servidor exclusivamente local de revisão da sincronização. Não é o bootstrap de produção. */
import { MockBillingProvider, relogioSistema } from '@pdv/shared';
import { abrirPostgres } from '../src/db/conexao';
import { criarApp } from '../src/servidor';

if (process.env.NODE_ENV !== 'development') throw new Error('Checkpoint permitido somente em desenvolvimento.');
const endereco = new URL(process.env.DATABASE_URL ?? '');
if (!['postgres:', 'postgresql:'].includes(endereco.protocol) || !['localhost', '127.0.0.1'].includes(endereco.hostname) || endereco.pathname !== '/pdv_checkpoint_sync') {
  throw new Error('Use somente o banco local dedicado pdv_checkpoint_sync.');
}
const conexao = await abrirPostgres(endereco.href);
const app = await criarApp({ db: conexao.db, relogio: relogioSistema, billing: new MockBillingProvider(), fontesEan: [], emissaoCodigo: { modo: 'desenvolvimento' } });
await app.listen({ port: 3338, host: '127.0.0.1' });
console.log('Checkpoint de sincronização: http://127.0.0.1:3338 — dados e assinatura de teste, sem cobrança ou e-mail reais.');
let encerrando = false;
const parar = () => {
  if (encerrando) return;
  encerrando = true;
  void app.close().then(() => conexao.fechar()).then(() => process.exit(0), () => process.exit(1));
};
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
