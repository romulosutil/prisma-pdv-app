import { eq, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  atualizarCartao,
  AssinaturaResSchema,
  avaliar,
  calcularProrata,
  cancelar,
  CriarAssinaturaReqSchema,
  AtualizarCartaoReqSchema,
  TrocarPlanoReqSchema,
  gerarId,
  iniciarTeste,
  licencaDe,
  PLANOS,
  PLANOS_DISPONIVEIS,
  encontrarCupom,
  valorMensalAssinatura,
  reativar,
  registrarCobrancaAprovada,
  serializarAssinatura,
  serializarLicenca,
  trocarPlano,
  type Assinatura,
  type AssinaturaRes,
  type ResultadoVerificacao,
} from '@pdv/shared';
import { contas, testesUsados } from '../db/schema';
import type { Deps } from '../deps';
import { exigirDono } from '../auth';
import { ErroApi } from '../erros';
import { carregarAssinatura, registrarEvento, salvarAssinatura } from '../servicos/assinatura';
import { chaveAvulsa, cobrarFatura, descricaoDaFatura, type TipoFatura } from '../servicos/cobranca';

type CartaoVerificado = Extract<ResultadoVerificacao, { ok: true }>;

function resposta(a: Assinatura, agora: Date): AssinaturaRes {
  return AssinaturaResSchema.parse({
    assinatura: serializarAssinatura(avaliar(a, agora)),
    licenca: serializarLicenca(licencaDe(a, agora)),
  });
}

export function rotasPlanos(app: FastifyInstance): void {
  app.get('/planos', async () => PLANOS_DISPONIVEIS.map((id) => PLANOS[id]));
}

export function rotasAssinatura(app: FastifyInstance, { db, relogio, billing, cobrancaDesativada }: Deps): void {
  const permitirCobranca = [exigirDono(db, relogio), async (request: import('fastify').FastifyRequest) => {
    const { assinatura } = await carregarAssinatura(db, request.sessao.contaId, relogio.agora());
    if (cobrancaDesativada || assinatura.status === 'liberada') {
      throw new ErroApi(409, 'cobranca_desativada', 'O acesso está liberado sem cobrança de assinatura.');
    }
  }];
  async function verificarCartao(token: string): Promise<CartaoVerificado> {
    const verificacao = await billing.verificarCartao(token);
    if (!verificacao.ok) {
      throw new ErroApi(402, 'cartao_recusado', 'O cartão foi recusado. Confira os dados ou use outro cartão.');
    }
    return verificacao;
  }

  const semCartao = () => new ErroApi(409, 'sem_cartao', 'Cadastre um cartão antes de continuar.');
  const pagamentoRecusado = () =>
    new ErroApi(402, 'pagamento_recusado', 'O pagamento foi recusado. Atualize o cartão e tente de novo.');

  app.get('/assinatura', async (request) => {
    const agora = relogio.agora();
    const { assinatura } = await carregarAssinatura(db, request.sessao.contaId, agora);
    return resposta(assinatura, agora);
  });

  app.post('/assinatura', { preHandler: permitirCobranca }, async (request, reply) => {
    const req = CriarAssinaturaReqSchema.parse(request.body);
    if (req.codigoCupom && !encontrarCupom(req.codigoCupom)) {
      throw new ErroApi(400, 'cupom_invalido', 'Cupom inválido. Confira o código e tente novamente.');
    }
    const { contaId } = request.sessao;
    const agora = relogio.agora();

    const { assinatura } = await carregarAssinatura(db, contaId, agora);
    if (assinatura.status !== 'sem_assinatura' && assinatura.status !== 'cancelada') {
      throw new ErroApi(409, 'assinatura_existente', 'Esta conta já tem uma assinatura.');
    }
    const cartao = await verificarCartao(req.tokenCartao);

    const nova = await db.transaction(async (tx) => {
      const [conta] = await tx.select({ documento: contas.documento }).from(contas).where(eq(contas.id, contaId));
      if (!conta) throw new Error(`Conta ${contaId} da sessão não existe`);
      const [usado] = await tx
        .select({ id: testesUsados.id })
        .from(testesUsados)
        .where(or(eq(testesUsados.documento, conta.documento), eq(testesUsados.fingerprint, cartao.fingerprint)));
      if (usado) {
        throw new ErroApi(
          409,
          'teste_ja_usado',
          'O teste grátis já foi usado neste CPF/CNPJ ou cartão. Para voltar, reative a assinatura.',
        );
      }
      await tx
        .insert(testesUsados)
        .values({ id: gerarId(), contaId, documento: conta.documento, fingerprint: cartao.fingerprint, criadoEm: agora });

      const teste = iniciarTeste({
        id: gerarId(),
        contaId,
        planoId: req.planoId,
        ...(req.codigoCupom ? { codigoCupom: req.codigoCupom } : {}),
        cartao: { bandeira: cartao.bandeira, ultimos4: cartao.ultimos4, fingerprint: cartao.fingerprint },
        agora,
      });
      await salvarAssinatura(tx, teste, agora, cartao.clienteRef);
      await registrarEvento(tx, teste, 'teste_iniciado', { planoId: teste.planoId, testeTerminaEm: teste.testeTerminaEm }, agora);
      return teste;
    });

    return reply.status(201).send(resposta(nova, agora));
  });

  app.post('/assinatura/trocar-plano', { preHandler: permitirCobranca }, async (request) => {
    const { planoId } = TrocarPlanoReqSchema.parse(request.body);
    const agora = relogio.agora();
    const { assinatura, clienteRef } = await carregarAssinatura(db, request.sessao.contaId, agora);
    const atual = avaliar(assinatura, agora);

    // Valida a transição antes de cobrar qualquer coisa.
    const nova = trocarPlano(atual, planoId, agora);
    const prorata = calcularProrata(atual, planoId, agora);
    if (prorata > 0) {
      if (!clienteRef) throw semCartao();
      const aprovada = await cobrarFatura(
        db,
        billing,
        atual,
        {
          tipo: 'prorata',
          valorCentavos: prorata,
          chaveIdempotencia: await chaveAvulsa(db, atual.id, 'pro'),
          clienteRef,
          descricao: `Upgrade para ${PLANOS[planoId].nome}`,
        },
        agora,
      );
      if (!aprovada) throw pagamentoRecusado();
    }

    await salvarAssinatura(db, nova, agora);
    await registrarEvento(db, nova, 'plano_trocado', { de: atual.planoId, para: planoId, prorataCentavos: prorata }, agora);
    return resposta(nova, agora);
  });

  app.put('/assinatura/cartao', { preHandler: permitirCobranca }, async (request) => {
    const { tokenCartao } = AtualizarCartaoReqSchema.parse(request.body);
    const agora = relogio.agora();
    const { assinatura } = await carregarAssinatura(db, request.sessao.contaId, agora);
    const atual = avaliar(assinatura, agora);
    const cartao = await verificarCartao(tokenCartao);

    let nova = atualizarCartao(atual, {
      bandeira: cartao.bandeira,
      ultimos4: cartao.ultimos4,
      fingerprint: cartao.fingerprint,
    });
    // Com pagamento em atraso, o cartão novo já paga a assinatura: é o que reativa o acesso.
    if (atual.status === 'inadimplente' || atual.status === 'suspensa') {
      const aprovada = await cobrarFatura(
        db,
        billing,
        atual,
        {
          tipo: 'retentativa',
          valorCentavos: valorMensalAssinatura(atual),
          chaveIdempotencia: await chaveAvulsa(db, atual.id, 'cartao'),
          clienteRef: cartao.clienteRef,
          descricao: descricaoDaFatura(atual),
        },
        agora,
      );
      if (!aprovada) throw pagamentoRecusado();
      nova = registrarCobrancaAprovada(nova, agora);
    }

    await salvarAssinatura(db, nova, agora, cartao.clienteRef);
    await registrarEvento(db, nova, 'cartao_atualizado', { ultimos4: cartao.ultimos4 }, agora);
    return resposta(nova, agora);
  });

  app.post('/assinatura/cancelar', { preHandler: permitirCobranca }, async (request) => {
    const agora = relogio.agora();
    const { assinatura } = await carregarAssinatura(db, request.sessao.contaId, agora);
    const nova = cancelar(avaliar(assinatura, agora), agora);
    await salvarAssinatura(db, nova, agora);
    await registrarEvento(db, nova, 'cancelada', { acessoAte: nova.acessoAte }, agora);
    return resposta(nova, agora);
  });

  app.post('/assinatura/reativar', { preHandler: permitirCobranca }, async (request) => {
    const { planoId } = TrocarPlanoReqSchema.parse(request.body);
    const agora = relogio.agora();
    const { assinatura, clienteRef } = await carregarAssinatura(db, request.sessao.contaId, agora);
    const atual = avaliar(assinatura, agora);
    const nova = reativar(atual, { planoId, agora });

    // `reativar` não cobra: fora do teste e do período pago, o período novo precisa de pagamento antes.
    let tipo: TipoFatura = 'prorata';
    let valorCentavos = 0;
    if (agora >= atual.testeTerminaEm && agora >= atual.periodoAtualFim) {
      tipo = atual.periodoAtualFim.getTime() === atual.testeTerminaEm.getTime() ? 'primeira' : 'renovacao';
      valorCentavos = valorMensalAssinatura({ ...atual, planoId, planoAgendado: null });
    } else if (agora >= atual.testeTerminaEm) {
      valorCentavos = calcularProrata({ ...atual, status: 'ativa' }, planoId, agora);
    }
    if (valorCentavos > 0) {
      if (!clienteRef) throw semCartao();
      const aprovada = await cobrarFatura(
        db,
        billing,
        atual,
        {
          tipo,
          valorCentavos,
          chaveIdempotencia: await chaveAvulsa(db, atual.id, 'rea'),
          clienteRef,
          descricao: `Reativação ${PLANOS[planoId].nome}`,
        },
        agora,
      );
      if (!aprovada) throw pagamentoRecusado();
    }

    await salvarAssinatura(db, nova, agora);
    await registrarEvento(db, nova, 'reativada', { planoId, valorCentavos }, agora);
    return resposta(nova, agora);
  });
}
