import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  adicionarDias,
  adicionarMeses,
  criarAssinaturaGratuita,
  gerarId,
  licencaDe,
  serializarAssinatura,
  serializarLicenca,
  type Assinatura,
  type AssinaturaRes,
  type ConfirmarCompraPlayReq,
  type EstadoAssinaturaPlay,
  type Relogio,
} from '@pdv/shared';
import type { Db } from '../db/conexao';
import { assinaturas, assinaturasPlay } from '../db/schema';
import type { Deps } from '../deps';
import { ErroApi } from '../erros';
import {
  criarVerificadorGooglePlay,
  decodificarRtdnPubSub,
  ErroGooglePlay,
  GOOGLE_PLAY_PACOTE_PADRAO,
  GOOGLE_PLAY_SKU_PRO_PADRAO,
  type CompraAssinaturaPlay,
  type VerificadorGooglePlay,
} from '../pagamentos/googlePlayBilling';
import { carregarAssinatura, registrarEvento, salvarAssinatura } from './assinatura';

export interface AmbienteGooglePlay {
  db: Db;
  relogio: Relogio;
  verificador: VerificadorGooglePlay;
  packageName: string;
  skuProMensal: string;
  cobrancaDesativada: boolean;
}

export function ambienteGooglePlay(
  deps: Pick<Deps, 'db' | 'relogio' | 'googlePlay' | 'cobrancaDesativada'>,
): AmbienteGooglePlay {
  return {
    db: deps.db,
    relogio: deps.relogio,
    verificador: deps.googlePlay?.verificador ?? criarVerificadorGooglePlay(null),
    packageName: deps.googlePlay?.packageName ?? GOOGLE_PLAY_PACOTE_PADRAO,
    skuProMensal: deps.googlePlay?.skuProMensal ?? GOOGLE_PLAY_SKU_PRO_PADRAO,
    cobrancaDesativada: Boolean(deps.cobrancaDesativada),
  };
}

export function hashPurchaseToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function respostaAssinatura(a: Assinatura, agora: Date): AssinaturaRes {
  return {
    assinatura: serializarAssinatura(a),
    licenca: serializarLicenca(licencaDe(a, agora)),
  };
}

function mapearEstadoPlayParaAssinatura(
  atual: Assinatura,
  compra: CompraAssinaturaPlay,
  agora: Date,
): Assinatura {
  const inicio = compra.startTime ?? atual.periodoAtualInicio ?? agora;
  const fim = compra.expiryTime;
  const base = {
    ...atual,
    planoId: 'pro' as const,
    planoAgendado: null,
  };

  switch (compra.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      if (compra.emTesteGratis) {
        return {
          ...base,
          status: 'em_teste',
          testeTerminaEm: fim,
          periodoAtualInicio: inicio,
          periodoAtualFim: fim,
          acessoAte: null,
          inadimplenteDesde: null,
          tentativasFalhas: 0,
          proximaTentativaEm: null,
          canceladaEm: null,
        };
      }
      return {
        ...base,
        status: 'ativa',
        periodoAtualInicio: inicio,
        periodoAtualFim: fim,
        acessoAte: null,
        inadimplenteDesde: null,
        tentativasFalhas: 0,
        proximaTentativaEm: null,
        canceladaEm: null,
      };

    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return {
        ...base,
        status: 'inadimplente',
        periodoAtualInicio: inicio,
        periodoAtualFim: fim,
        inadimplenteDesde: atual.inadimplenteDesde ?? agora,
        tentativasFalhas: Math.max(1, atual.tentativasFalhas),
        proximaTentativaEm: adicionarDias(agora, 1),
        acessoAte: null,
      };

    case 'SUBSCRIPTION_STATE_CANCELED':
      return {
        ...base,
        status: 'cancelada',
        canceladaEm: atual.canceladaEm ?? agora,
        acessoAte: fim,
        periodoAtualInicio: inicio,
        periodoAtualFim: fim,
        proximaTentativaEm: null,
      };

    case 'SUBSCRIPTION_STATE_ON_HOLD':
    case 'SUBSCRIPTION_STATE_PAUSED':
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return {
        ...base,
        status: 'suspensa',
        inadimplenteDesde: atual.inadimplenteDesde ?? agora,
        periodoAtualInicio: inicio,
        periodoAtualFim: fim,
        acessoAte: null,
        proximaTentativaEm: null,
      };

    case 'SUBSCRIPTION_STATE_PENDING':
    default:
      return atual;
  }
}

function estadoComprado(estado: EstadoAssinaturaPlay): boolean {
  return estado === 'SUBSCRIPTION_STATE_ACTIVE' || estado === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
}

export async function confirmarCompraGooglePlay(
  amb: AmbienteGooglePlay,
  contaId: string,
  req: ConfirmarCompraPlayReq,
  opcoes: { exigirComprado?: boolean } = { exigirComprado: true },
): Promise<AssinaturaRes> {
  if (amb.cobrancaDesativada) {
    throw new ErroApi(409, 'cobranca_desativada', 'O acesso está liberado sem cobrança de assinatura.');
  }
  const packageName = req.packageName ?? amb.packageName;
  if (packageName !== amb.packageName) {
    throw new ErroApi(400, 'pacote_invalido', 'Pacote do aplicativo não corresponde à loja configurada.');
  }
  const tokenHash = hashPurchaseToken(req.purchaseToken);
  const agora = amb.relogio.agora();

  let compra: CompraAssinaturaPlay;
  try {
    compra = await amb.verificador.consultarAssinatura(packageName, req.purchaseToken);
  } catch (erro) {
    if (erro instanceof ErroGooglePlay) {
      if (erro.tipo === 'token_invalido') throw new ErroApi(400, 'token_play_invalido', 'Compra da Google Play inválida ou expirada.');
      if (erro.tipo === 'nao_configurado') throw new ErroApi(503, 'google_play_nao_configurado', 'Integração com a Google Play não configurada neste servidor.');
      throw new ErroApi(502, 'google_play_indisponivel', 'Não foi possível validar a assinatura na Google Play agora.');
    }
    throw erro;
  }

  if (opcoes.exigirComprado !== false && !estadoComprado(compra.subscriptionState)) {
    if (compra.subscriptionState === 'SUBSCRIPTION_STATE_PENDING') {
      throw new ErroApi(409, 'compra_pendente', 'A compra ainda está pendente na Google Play. Aguarde a confirmação do pagamento.');
    }
    if (compra.subscriptionState !== 'SUBSCRIPTION_STATE_CANCELED' || agora >= compra.expiryTime) {
      throw new ErroApi(409, 'compra_nao_ativa', 'Esta assinatura da Google Play não está ativa.');
    }
  }

  // Confirma a compra na Google Play imediatamente (regra: confirmar em até 3 dias).
  let acknowledgedAgora = false;
  if (estadoComprado(compra.subscriptionState) && compra.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    try {
      await amb.verificador.confirmarAssinatura(packageName, compra.productId || req.productId, req.purchaseToken);
      acknowledgedAgora = true;
    } catch (erro) {
      if (erro instanceof ErroGooglePlay && erro.tipo === 'token_invalido') {
        throw new ErroApi(400, 'token_play_invalido', 'Não foi possível confirmar a compra na Google Play.');
      }
      throw new ErroApi(502, 'google_play_indisponivel', 'Falha ao confirmar a assinatura na Google Play. Tente novamente.');
    }
  }

  return amb.db.transaction(async (tx) => {
    const [existentePlay] = await tx.select().from(assinaturasPlay)
      .where(eq(assinaturasPlay.purchaseTokenHash, tokenHash)).for('update');
    if (existentePlay && existentePlay.contaId !== contaId) {
      throw new ErroApi(409, 'token_em_outra_conta', 'Esta assinatura da Google Play já está vinculada a outra conta.');
    }

    const { assinatura: atual } = await carregarAssinatura(tx, contaId, agora);
    const assinaturaId = atual.status === 'sem_assinatura' ? gerarId() : atual.id;
    const baseAtual: Assinatura = atual.status === 'sem_assinatura'
      ? { ...atual, id: assinaturaId }
      : atual;

    const nova = mapearEstadoPlayParaAssinatura(baseAtual, compra, agora);
    await salvarAssinatura(tx, nova, agora, `play:${tokenHash.slice(0, 16)}`);

    const acknowledgedEm = acknowledgedAgora || compra.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
      ? (existentePlay?.acknowledgedEm ?? agora)
      : null;

    if (existentePlay) {
      await tx.update(assinaturasPlay).set({
        productId: compra.productId || req.productId,
        orderId: compra.orderId,
        estadoPlay: compra.subscriptionState,
        acknowledgedEm,
        emTesteGratis: compra.emTesteGratis,
        autoRenewEnabled: compra.autoRenewing,
        inicioEm: compra.startTime,
        expiraEm: compra.expiryTime,
        atualizadoEm: agora,
      }).where(eq(assinaturasPlay.id, existentePlay.id));
    } else {
      await tx.insert(assinaturasPlay).values({
        id: gerarId(),
        contaId,
        assinaturaId,
        packageName,
        productId: compra.productId || req.productId,
        purchaseTokenHash: tokenHash,
        orderId: compra.orderId,
        estadoPlay: compra.subscriptionState,
        acknowledgedEm,
        emTesteGratis: compra.emTesteGratis,
        autoRenewEnabled: compra.autoRenewing,
        inicioEm: compra.startTime,
        expiraEm: compra.expiryTime,
        ultimaNotificacaoEm: null,
        ultimoEventoOrdem: 0,
        criadoEm: agora,
        atualizadoEm: agora,
      });
    }

    await registrarEvento(tx, nova, 'play_compra_validada', {
      estadoPlay: compra.subscriptionState,
      productId: compra.productId || req.productId,
      acknowledged: Boolean(acknowledgedEm),
      emTesteGratis: compra.emTesteGratis,
      expiraEm: compra.expiryTime.toISOString(),
    }, agora);

    return respostaAssinatura(nova, agora);
  });
}

export async function ativarPlanoGratuito(db: Db, contaId: string, relogio: Relogio, cobrancaDesativada: boolean): Promise<AssinaturaRes> {
  if (cobrancaDesativada) {
    throw new ErroApi(409, 'cobranca_desativada', 'O acesso está liberado sem cobrança de assinatura.');
  }
  const agora = relogio.agora();
  return db.transaction(async (tx) => {
    const { assinatura: atual } = await carregarAssinatura(tx, contaId, agora);
    const id = atual.status === 'sem_assinatura' ? gerarId() : atual.id;
    const nova: Assinatura = {
      ...criarAssinaturaGratuita({ id, contaId, agora }),
      criadaEm: atual.status === 'sem_assinatura' ? agora : atual.criadaEm,
      periodoAtualFim: adicionarMeses(agora, 120),
    };
    await salvarAssinatura(tx, nova, agora);
    await registrarEvento(tx, nova, 'plano_free_ativado', {}, agora);
    return respostaAssinatura(nova, agora);
  });
}

export async function processarRtdnGooglePlay(
  amb: AmbienteGooglePlay,
  corpo: unknown,
): Promise<{ processado: boolean; motivo?: string; estado?: string }> {
  const notif = decodificarRtdnPubSub(corpo);
  if (!notif) return { processado: false, motivo: 'payload_invalido' };
  if (notif.isTest) return { processado: true, motivo: 'teste' };
  if (notif.packageName !== amb.packageName) return { processado: false, motivo: 'pacote_desconhecido' };
  if (!notif.purchaseToken) return { processado: false, motivo: 'sem_token' };

  const tokenHash = hashPurchaseToken(notif.purchaseToken);
  const [registro] = await amb.db.select().from(assinaturasPlay).where(eq(assinaturasPlay.purchaseTokenHash, tokenHash));
  if (!registro) return { processado: false, motivo: 'token_desconhecido' };

  // Proteção contra notificações fora de ordem: evento mais antigo nunca sobrescreve estado mais novo.
  if (notif.eventTimeMillis > 0 && notif.eventTimeMillis < registro.ultimoEventoOrdem) {
    return { processado: false, motivo: 'evento_fora_de_ordem' };
  }

  const compra = await amb.verificador.consultarAssinatura(notif.packageName, notif.purchaseToken);
  const agora = amb.relogio.agora();
  let acknowledgedAgora = false;
  if (estadoComprado(compra.subscriptionState) && compra.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    await amb.verificador.confirmarAssinatura(notif.packageName, compra.productId || registro.productId, notif.purchaseToken);
    acknowledgedAgora = true;
  }

  return amb.db.transaction(async (tx) => {
    const [atualPlay] = await tx.select().from(assinaturasPlay)
      .where(eq(assinaturasPlay.id, registro.id)).for('update');
    if (!atualPlay) return { processado: false, motivo: 'token_desconhecido' };
    if (notif.eventTimeMillis > 0 && notif.eventTimeMillis < atualPlay.ultimoEventoOrdem) {
      return { processado: false, motivo: 'evento_fora_de_ordem' };
    }

    const { assinatura } = await carregarAssinatura(tx, atualPlay.contaId, agora);
    const nova = mapearEstadoPlayParaAssinatura(assinatura, compra, agora);
    await salvarAssinatura(tx, nova, agora);

    const novaOrdem = Math.max(atualPlay.ultimoEventoOrdem, notif.eventTimeMillis);
    await tx.update(assinaturasPlay).set({
      orderId: compra.orderId ?? atualPlay.orderId,
      estadoPlay: compra.subscriptionState,
      acknowledgedEm: acknowledgedAgora || compra.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
        ? (atualPlay.acknowledgedEm ?? agora)
        : atualPlay.acknowledgedEm,
      emTesteGratis: compra.emTesteGratis,
      autoRenewEnabled: compra.autoRenewing,
      inicioEm: compra.startTime ?? atualPlay.inicioEm,
      expiraEm: compra.expiryTime,
      ultimaNotificacaoEm: agora,
      ultimoEventoOrdem: novaOrdem,
      atualizadoEm: agora,
    }).where(eq(assinaturasPlay.id, atualPlay.id));

    const chaveUnica = notif.eventTimeMillis > 0
      ? `rtdn:${tokenHash.slice(0, 16)}:${notif.eventTimeMillis}:${notif.notificationType ?? 0}:${compra.subscriptionState}`
      : undefined;
    await registrarEvento(tx, nova, 'play_rtdn', {
      notificationType: notif.notificationType,
      estadoPlay: compra.subscriptionState,
      eventTimeMillis: notif.eventTimeMillis,
    }, agora, chaveUnica);

    return { processado: true, estado: nova.status };
  });
}

export function configuracaoCobrancaAtual(deps: { cobrancaDesativada?: boolean; billingProvider?: string; googlePlayPackageName?: string; googlePlaySkuPro?: string }) {
  const canal: 'disabled' | 'mock' | 'google_play' = deps.cobrancaDesativada
    ? 'disabled'
    : (deps.billingProvider === 'google_play' ? 'google_play' : 'mock');
  return {
    modoGratuito: Boolean(deps.cobrancaDesativada),
    canal,
    planoPadrao: 'free' as const,
    packageName: deps.googlePlayPackageName ?? GOOGLE_PLAY_PACOTE_PADRAO,
    skuProMensal: deps.googlePlaySkuPro ?? GOOGLE_PLAY_SKU_PRO_PADRAO,
  };
}
