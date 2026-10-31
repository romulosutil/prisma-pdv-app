import { fileURLToPath } from 'node:url';
import { relogioSistema, type Relogio } from '@pdv/shared';
import type { FastifyInstance } from 'fastify';
import { criarBilling, criarBillingDesativado } from './billing';
import { validarConfiguracao } from './configuracao';
import { abrirPglite, abrirPostgres, type Conexao } from './db/conexao';
import { lerConfiguracaoEntregaCodigo } from './email/configuracaoEntrega';
import { ErroCanalEmail } from './email/contrato';
import { encerrarEntregasExpiradas, processarEntregasCodigo, validarPendenciasEntrega } from './email/filaCodigo';
import { criarCanalSmtp } from './email/smtp';
import type { EmissaoCodigo } from './email/tiposEntrega';
import { openFoodFacts } from './fontes/openFoodFacts';
import { agendarCobranca } from './jobs';
import { agendarEntregasCodigo } from './jobsEmail';
import { RelogioDeDesenvolvimento } from './relogio-dev';
import { criarApp } from './servidor';

export async function iniciarApi(): Promise<{ app: FastifyInstance; parar: () => Promise<void> }> {
  const configuracao = validarConfiguracao(process.env);
  const entrega = lerConfiguracaoEntregaCodigo(process.env);
  const relogio: Relogio = configuracao.ambiente === 'production' ? relogioSistema : new RelogioDeDesenvolvimento();
  const emissao: EmissaoCodigo = entrega.modo === 'smtp'
    ? { modo: 'email', chaves: entrega.chaves, dominioRemetente: entrega.smtp.remetente.split('@')[1]! }
    : { modo: 'desenvolvimento' };
  let conexao: Conexao | undefined;
  let app: FastifyInstance | undefined;
  let pararCobranca: (() => void) | undefined;
  let pararEmail: (() => Promise<void>) | undefined;
  let parada: Promise<void> | undefined;
  const parar = (): Promise<void> => {
    if (parada) return parada;
    parada = (async () => {
      let falhou = false;
      try { pararCobranca?.(); } catch { falhou = true; }
      try { await pararEmail?.(); } catch { falhou = true; }
      try { await app?.close(); } catch { falhou = true; }
      try { await conexao?.fechar(); } catch { falhou = true; }
      if (falhou) throw new Error('Falha ao encerrar a API.');
    })();
    return parada;
  };
  try {
    conexao = configuracao.databaseUrl ? await abrirPostgres(configuracao.databaseUrl)
      : await abrirPglite(fileURLToPath(new URL('../.data/pglite', import.meta.url)));
    await encerrarEntregasExpiradas(conexao.db, relogio);
    await validarPendenciasEntrega(conexao.db, emissao, relogio);
    const canal = entrega.modo === 'smtp' ? criarCanalSmtp(entrega.smtp) : undefined;
    const cobrancaDesativada = configuracao.billingProvider === 'disabled';
    const billing = cobrancaDesativada ? criarBillingDesativado() : criarBilling(configuracao.billingProvider);
    app = await criarApp({ db: conexao.db, relogio, billing, cobrancaDesativada, fontesEan: [openFoodFacts], logger: true, emissaoCodigo: emissao });
    await app.listen({ port: configuracao.porta, host: '0.0.0.0' });
    if (process.env.JOBS !== 'off') {
      const db = conexao.db;
      const registrar = (mensagem: string) => app!.log.info(mensagem);
      if (!cobrancaDesativada) pararCobranca = agendarCobranca(db, billing, relogio, registrar);
      if (entrega.modo === 'smtp' && emissao.modo === 'email' && canal) {
        pararEmail = agendarEntregasCodigo(() => processarEntregasCodigo(db, { chaves: entrega.chaves, canal, dominioRemetente: emissao.dominioRemetente, relogio }), registrar);
      }
    }
    return { app, parar };
  } catch (erro) {
    try { await parar(); } catch { /* preservar somente erro local */ }
    if (erro instanceof ErroCanalEmail) throw erro;
    throw new Error('Falha ao iniciar a API.');
  }
}
