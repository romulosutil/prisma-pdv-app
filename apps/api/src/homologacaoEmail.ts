import { MockBillingProvider, relogioSistema } from '@pdv/shared';
import type { FastifyInstance } from 'fastify';
import { abrirPostgres, type Conexao } from './db/conexao';
import { lerConfiguracaoEntregaCodigo } from './email/configuracaoEntrega';
import { encerrarEntregasExpiradas, processarEntregasCodigo, validarPendenciasEntrega } from './email/filaCodigo';
import { criarCanalSmtp } from './email/smtp';
import type { ConfiguracaoEntregaCodigo, EmissaoCodigo } from './email/tiposEntrega';
import { agendarEntregasCodigo } from './jobsEmail';
import { criarApp } from './servidor';

export interface ConfiguracaoHomologacaoEmail {
  databaseUrl: string;
  entrega: Extract<ConfiguracaoEntregaCodigo, { modo: 'smtp' }>;
}

/** Valida toda a configuração antes de adquirir qualquer recurso. */
export function lerConfiguracaoHomologacaoEmail(env: NodeJS.ProcessEnv): ConfiguracaoHomologacaoEmail {
  try {
    if (env.NODE_ENV !== 'development' || env.HOMOLOGACAO_EMAIL_CONFIRMAR !== 'sim') throw new Error();
    const databaseUrl = env.DATABASE_URL;
    if (!databaseUrl || !/^postgres(?:ql)?:\/\/(?:[^@/]*@)?(?:localhost|127\.0\.0\.1)(?::[0-9]+)?\/pdv_homologacao_email$/.test(databaseUrl)) throw new Error();
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname)
      || url.pathname !== '/pdv_homologacao_email' || url.search || url.hash) throw new Error();
    const entrega = lerConfiguracaoEntregaCodigo(env);
    if (entrega.modo !== 'smtp' || entrega.smtp.host !== 'smtp.resend.com' || entrega.smtp.porta !== 465
      || entrega.smtp.modo !== 'tls' || entrega.smtp.usuario !== 'resend'
      || entrega.smtp.remetente !== 'acesso@prumo.services') throw new Error();
    return { databaseUrl, entrega };
  } catch {
    throw new Error('Configuração de homologação de e-mail inválida.');
  }
}

export async function iniciarHomologacaoEmail(env: NodeJS.ProcessEnv = process.env): Promise<{ app: FastifyInstance; parar: () => Promise<void> }> {
  const { databaseUrl, entrega } = lerConfiguracaoHomologacaoEmail(env);
  const emissao: EmissaoCodigo = { modo: 'email', chaves: entrega.chaves, dominioRemetente: 'prumo.services' };
  let conexao: Conexao | undefined;
  let app: FastifyInstance | undefined;
  let pararEmail: (() => Promise<void>) | undefined;
  let parada: Promise<void> | undefined;
  const parar = (): Promise<void> => {
    if (parada) return parada;
    parada = (async () => {
      let falhou = false;
      try { await pararEmail?.(); } catch { falhou = true; }
      try { await app?.close(); } catch { falhou = true; }
      try { await conexao?.fechar(); } catch { falhou = true; }
      if (falhou) throw new Error('Falha ao encerrar a homologação de e-mail.');
    })();
    return parada;
  };
  try {
    conexao = await abrirPostgres(databaseUrl);
    await encerrarEntregasExpiradas(conexao.db, relogioSistema);
    await validarPendenciasEntrega(conexao.db, emissao, relogioSistema);
    const canal = criarCanalSmtp(entrega.smtp);
    // Fixture local: este launcher exige NODE_ENV=development e não agenda cobrança.
    const billing = new MockBillingProvider();
    app = await criarApp({ db: conexao.db, relogio: relogioSistema, billing, fontesEan: [], logger: true,
      emissaoCodigo: emissao, habilitarRotasDev: false });
    await app.listen({ host: '127.0.0.1', port: 3339 });
    const db = conexao.db;
    const registrar = (mensagem: string) => app!.log.info(mensagem);
    pararEmail = agendarEntregasCodigo(() => processarEntregasCodigo(db, {
      chaves: entrega.chaves, canal, dominioRemetente: emissao.dominioRemetente, relogio: relogioSistema,
    }), registrar);
    return { app, parar };
  } catch {
    try { await parar(); } catch { /* erro sanitizado abaixo */ }
    throw new Error('Falha ao iniciar a homologação de e-mail.');
  }
}
