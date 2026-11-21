import { fileURLToPath } from 'node:url';
import { relogioSistema, type Relogio } from '@pdv/shared';
import type { FastifyInstance } from 'fastify';
import { criarBilling } from './billing';
import {
  lerConfiguracaoGooglePlay,
  lerConfiguracaoOAuthMercadoPago,
  lerConfiguracaoPagamentos,
  lerConfiguracaoRevisorPlay,
  lerUrlPublicaApi,
  validarConfiguracao,
} from './configuracao';
import { abrirPglite, abrirPostgres, type Conexao } from './db/conexao';
import { lerConfiguracaoEntregaCodigo } from './email/configuracaoEntrega';
import { ErroCanalEmail } from './email/contrato';
import { encerrarEntregasExpiradas, processarEntregasCodigo, validarPendenciasEntrega } from './email/filaCodigo';
import { criarCanalSmtp } from './email/smtp';
import type { EmissaoCodigo } from './email/tiposEntrega';
import { fontesEanGratuitas } from './fontes/openFoodFacts';
import { agendarCobranca } from './jobs';
import { agendarEntregasCodigo } from './jobsEmail';
import { agendarConciliacaoPix, agendarRenovacaoOAuth } from './jobsPagamentos';
import { renovarTokensOAuth } from './servicos/conexoesMercadoPago';
import { criarCifradorPagamentos } from './pagamentos/cifrador';
import { criarVerificadorGooglePlay } from './pagamentos/googlePlayBilling';
import { criarProvedorInfinitePay } from './pagamentos/infinitePay';
import { criarProvedorMercadoPago } from './pagamentos/mercadoPago';
import type { ConfigPagamentos } from './deps';
import { ambientePix, conciliarCobrancasPix } from './servicos/cobrancasPix';
import { RelogioDeDesenvolvimento } from './relogio-dev';
import { criarApp } from './servidor';
import { agendarRetencaoSuporte, limparSuporteConcluido } from './servicos/retencaoSuporte';

export async function iniciarApi(): Promise<{ app: FastifyInstance; parar: () => Promise<void> }> {
  const configuracao = validarConfiguracao(process.env);
  const entrega = lerConfiguracaoEntregaCodigo(process.env);
  // Sem PDV_PAGAMENTOS_CHAVE a API sobe normalmente e as rotas de pagamento respondem 503.
  const configPagamentos = lerConfiguracaoPagamentos(process.env);
  const configGooglePlay = lerConfiguracaoGooglePlay(process.env);
  const revisorPlay = lerConfiguracaoRevisorPlay(process.env);
  const pagamentos: ConfigPagamentos = {
    cifrador: configPagamentos.chave ? criarCifradorPagamentos(configPagamentos.chave) : null,
    mercadoPago: criarProvedorMercadoPago(),
    infinitePay: criarProvedorInfinitePay(),
    urlPublicaApi: lerUrlPublicaApi(process.env),
    pagadorEmail: configPagamentos.pagadorEmail ?? null,
    // Sem PDV_MP_CLIENT_ID/SECRET/REDIRECT_URI, as rotas de OAuth respondem 503 e o modo token continua.
    oauth: lerConfiguracaoOAuthMercadoPago(process.env),
  };
  const relogio: Relogio = configuracao.ambiente === 'production' ? relogioSistema : new RelogioDeDesenvolvimento();
  const emissao: EmissaoCodigo = entrega.modo === 'smtp'
    ? { modo: 'email', chaves: entrega.chaves, dominioRemetente: entrega.smtp.remetente.split('@')[1]! }
    : { modo: 'desenvolvimento' };
  let conexao: Conexao | undefined;
  let app: FastifyInstance | undefined;
  let pararCobranca: (() => void) | undefined;
  let pararEmail: (() => Promise<void>) | undefined;
  let pararSuporte: (() => Promise<void>) | undefined;
  let pararPix: (() => Promise<void>) | undefined;
  let pararOAuth: (() => Promise<void>) | undefined;
  let parada: Promise<void> | undefined;
  const parar = (): Promise<void> => {
    if (parada) return parada;
    parada = (async () => {
      let falhou = false;
      try { pararCobranca?.(); } catch { falhou = true; }
      try { await pararSuporte?.(); } catch { falhou = true; }
      try { await pararPix?.(); } catch { falhou = true; }
      try { await pararOAuth?.(); } catch { falhou = true; }
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
    await limparSuporteConcluido(conexao.db, relogio);
    const canal = entrega.modo === 'smtp' ? criarCanalSmtp(entrega.smtp) : undefined;
    const cobrancaDesativada = configuracao.billingProvider === 'disabled';
    const billing = criarBilling(configuracao.billingProvider);
    app = await criarApp({
      db: conexao.db,
      relogio,
      billing,
      billingProvider: configuracao.billingProvider,
      cobrancaDesativada,
      googlePlay: {
        verificador: criarVerificadorGooglePlay(configGooglePlay.credencial),
        packageName: configGooglePlay.packageName,
        skuProMensal: configGooglePlay.skuProMensal,
        webhookToken: configGooglePlay.webhookToken,
      },
      fontesEan: fontesEanGratuitas,
      logger: true,
      emissaoCodigo: emissao,
      revisorPlay,
      pagamentos,
    });
    await app.listen({ port: configuracao.porta, host: '0.0.0.0' });
    if (process.env.JOBS !== 'off') {
      const db = conexao.db;
      const registrar = (mensagem: string) => app!.log.info(mensagem);
      pararSuporte = agendarRetencaoSuporte(() => limparSuporteConcluido(db, relogio), registrar);
      if (pagamentos.cifrador) {
        const amb = ambientePix({ db, relogio, pagamentos });
        pararPix = agendarConciliacaoPix((deveParar) => conciliarCobrancasPix(amb, { deveParar }), registrar);
        if (amb.oauth) pararOAuth = agendarRenovacaoOAuth((deveParar) => renovarTokensOAuth(amb, { deveParar }), registrar);
      }
      if (configuracao.billingProvider === 'mock') pararCobranca = agendarCobranca(db, billing, relogio, registrar);
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
