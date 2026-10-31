import { eq } from 'drizzle-orm';
import { gerarId, type Assinatura } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { assinaturas, eventosCobranca } from '../db/schema';

type Linha = typeof assinaturas.$inferSelect;

export interface AssinaturaCarregada {
  assinatura: Assinatura;
  /** Cliente no gateway; `null` enquanto não há cartão. */
  clienteRef: string | null;
}

function paraAssinatura(l: Linha): Assinatura {
  const { cartaoBandeira, cartaoUltimos4, cartaoFingerprint } = l;
  return {
    id: l.id,
    contaId: l.contaId,
    planoId: l.planoId,
    status: l.status,
    criadaEm: l.criadaEm,
    testeTerminaEm: l.testeTerminaEm,
    periodoAtualInicio: l.periodoAtualInicio,
    periodoAtualFim: l.periodoAtualFim,
    acessoAte: l.acessoAte,
    inadimplenteDesde: l.inadimplenteDesde,
    tentativasFalhas: l.tentativasFalhas,
    proximaTentativaEm: l.proximaTentativaEm,
    canceladaEm: l.canceladaEm,
    planoAgendado: l.planoAgendado,
    cupom: l.cupom,
    cartao:
      cartaoBandeira && cartaoUltimos4 && cartaoFingerprint
        ? { bandeira: cartaoBandeira, ultimos4: cartaoUltimos4, fingerprint: cartaoFingerprint }
        : null,
  };
}

/**
 * Conta que ainda não assinou: não há linha no banco. O estado `sem_assinatura` do shared
 * é montado na leitura, com o id da conta, e nunca é gravado.
 */
function semAssinatura(contaId: string, agora: Date): Assinatura {
  return {
    id: contaId,
    contaId,
    planoId: 'pro',
    status: 'sem_assinatura',
    criadaEm: agora,
    testeTerminaEm: agora,
    periodoAtualInicio: agora,
    periodoAtualFim: agora,
    acessoAte: null,
    inadimplenteDesde: null,
    tentativasFalhas: 0,
    proximaTentativaEm: null,
    canceladaEm: null,
    planoAgendado: null,
    cartao: null,
  };
}

export function carregarDaLinha(l: Linha): AssinaturaCarregada {
  return { assinatura: paraAssinatura(l), clienteRef: l.clienteRef };
}

export async function carregarAssinatura(db: Db, contaId: string, agora: Date): Promise<AssinaturaCarregada> {
  const [linha] = await db.select().from(assinaturas).where(eq(assinaturas.contaId, contaId));
  return linha ? carregarDaLinha(linha) : { assinatura: semAssinatura(contaId, agora), clienteRef: null };
}

/** Grava (insere ou atualiza) a assinatura. `clienteRef` só muda quando informado. */
export async function salvarAssinatura(db: Db, a: Assinatura, agora: Date, clienteRef?: string): Promise<void> {
  const campos = {
    planoId: a.planoId,
    status: a.status,
    criadaEm: a.criadaEm,
    testeTerminaEm: a.testeTerminaEm,
    periodoAtualInicio: a.periodoAtualInicio,
    periodoAtualFim: a.periodoAtualFim,
    acessoAte: a.acessoAte,
    inadimplenteDesde: a.inadimplenteDesde,
    tentativasFalhas: a.tentativasFalhas,
    proximaTentativaEm: a.proximaTentativaEm,
    canceladaEm: a.canceladaEm,
    planoAgendado: a.planoAgendado,
    cupom: a.cupom ?? null,
    cartaoBandeira: a.cartao?.bandeira ?? null,
    cartaoUltimos4: a.cartao?.ultimos4 ?? null,
    cartaoFingerprint: a.cartao?.fingerprint ?? null,
    ...(clienteRef === undefined ? {} : { clienteRef }),
    atualizadoEm: agora,
  };
  await db
    .insert(assinaturas)
    .values({ id: a.id, contaId: a.contaId, ...campos })
    .onConflictDoUpdate({ target: assinaturas.id, set: campos });
}

/** Devolve false quando `chaveUnica` já existia (o evento não foi gravado de novo). */
export async function registrarEvento(
  db: Db,
  a: Pick<Assinatura, 'id' | 'contaId'>,
  tipo: string,
  dados: Record<string, unknown>,
  agora: Date,
  chaveUnica?: string,
): Promise<boolean> {
  const inseridos = await db
    .insert(eventosCobranca)
    .values({ id: gerarId(), assinaturaId: a.id, contaId: a.contaId, tipo, dados, chaveUnica: chaveUnica ?? null, criadoEm: agora })
    .onConflictDoNothing()
    .returning({ id: eventosCobranca.id });
  return inseridos.length > 0;
}
