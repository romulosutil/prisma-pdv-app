import { eq, inArray } from 'drizzle-orm';
import {
  avaliar,
  cobrancaDevida,
  deveLembrarFimTeste,
  formatarBRL,
  formatarDataCurta,
  gerarId,
  PLANOS,
  registrarCobrancaAprovada,
  registrarCobrancaRecusada,
  type Assinatura,
  type BillingProvider,
  type Centavos,
  type Relogio,
} from '@pdv/shared';
import type { Db } from '../db/conexao';
import { assinaturas, faturas } from '../db/schema';
import { carregarDaLinha, registrarEvento, salvarAssinatura } from './assinatura';

export type TipoFatura = 'primeira' | 'renovacao' | 'retentativa' | 'prorata';

export interface PedidoFatura {
  tipo: TipoFatura;
  valorCentavos: Centavos;
  chaveIdempotencia: string;
  clienteRef: string;
  descricao: string;
}

export interface ResumoCobranca {
  cobrancas: number;
  aprovadas: number;
  recusadas: number;
  suspensas: number;
  lembretes: number;
  erros: number;
}

export const descricaoDaFatura = (a: Assinatura): string => `Assinatura ${PLANOS[a.planoAgendado ?? a.planoId].nome}`;

/**
 * Chave do job: assinatura + período + nº da tentativa. Reexecutar o job no mesmo
 * estado gera a mesma chave e, portanto, nunca cobra duas vezes.
 */
export const chaveDoJob = (a: Assinatura): string => `cob:${a.id}:${a.periodoAtualFim.toISOString()}:${a.tentativasFalhas}`;

/** Chave para cobranças iniciadas pelo usuário (prorata, troca de cartão, reativação): uma por fatura. */
export async function chaveAvulsa(db: Db, assinaturaId: string, prefixo: string): Promise<string> {
  const anteriores = await db.$count(faturas, eq(faturas.assinaturaId, assinaturaId));
  return `${prefixo}:${assinaturaId}:${anteriores + 1}`;
}

/**
 * Registra a fatura, cobra no gateway e grava o resultado. A fatura nasce `pendente` antes
 * da chamada: se o processo cair no meio, a próxima execução repete a mesma chave e o
 * gateway devolve o mesmo resultado. Quem chama aplica a transição de estado depois.
 */
export async function cobrarFatura(
  db: Db,
  billing: BillingProvider,
  a: Pick<Assinatura, 'id' | 'contaId'>,
  pedido: PedidoFatura,
  agora: Date,
): Promise<boolean> {
  await db
    .insert(faturas)
    .values({
      id: gerarId(),
      assinaturaId: a.id,
      contaId: a.contaId,
      valorCentavos: pedido.valorCentavos,
      tipo: pedido.tipo,
      status: 'pendente',
      chaveIdempotencia: pedido.chaveIdempotencia,
      criadoEm: agora,
      atualizadoEm: agora,
    })
    .onConflictDoNothing();

  const resultado = await billing.cobrar({
    clienteRef: pedido.clienteRef,
    valorCentavos: pedido.valorCentavos,
    descricao: pedido.descricao,
    chaveIdempotencia: pedido.chaveIdempotencia,
  });

  await db
    .update(faturas)
    .set(
      resultado.ok
        ? { status: 'aprovada', transacaoId: resultado.transacaoId, motivoRecusa: null, atualizadoEm: agora }
        : { status: 'recusada', transacaoId: null, motivoRecusa: resultado.motivo, atualizadoEm: agora },
    )
    .where(eq(faturas.chaveIdempotencia, pedido.chaveIdempotencia));

  await registrarEvento(
    db,
    a,
    resultado.ok ? 'cobranca_aprovada' : 'cobranca_recusada',
    {
      tipo: pedido.tipo,
      valorCentavos: pedido.valorCentavos,
      chaveIdempotencia: pedido.chaveIdempotencia,
      ...(resultado.ok ? { transacaoId: resultado.transacaoId } : { motivo: resultado.motivo }),
    },
    agora,
  );
  return resultado.ok;
}

/**
 * Passada do job de cobrança (roda a cada hora): suspende quem passou da carência,
 * avisa o fim do teste uma única vez e cobra o que estiver devido.
 * Uma assinatura com erro (ex.: gateway fora do ar) não impede as demais; a fatura
 * pendente é retomada na próxima passada.
 */
export async function processarCobrancas(
  db: Db,
  billing: BillingProvider,
  relogio: Relogio,
  registrar: (mensagem: string) => void = console.log,
): Promise<ResumoCobranca> {
  const agora = relogio.agora();
  const resumo: ResumoCobranca = { cobrancas: 0, aprovadas: 0, recusadas: 0, suspensas: 0, lembretes: 0, erros: 0 };
  const linhas = await db
    .select()
    .from(assinaturas)
    .where(inArray(assinaturas.status, ['em_teste', 'ativa', 'inadimplente']));

  for (const linha of linhas) {
    const { assinatura, clienteRef } = carregarDaLinha(linha);
    try {
      const avaliada = avaliar(assinatura, agora);
      if (avaliada.status !== assinatura.status) {
        await salvarAssinatura(db, avaliada, agora);
        await registrarEvento(db, assinatura, 'suspensa', { inadimplenteDesde: assinatura.inadimplenteDesde }, agora);
        resumo.suspensas += 1;
        continue;
      }

      if (deveLembrarFimTeste(assinatura, agora)) {
        const chave = `lembrete_fim_teste:${assinatura.id}:${assinatura.testeTerminaEm.toISOString()}`;
        if (await registrarEvento(db, assinatura, 'lembrete_fim_teste', {}, agora, chave)) {
          const valor = formatarBRL(PLANOS[assinatura.planoId].precoMensalCentavos);
          registrar(
            `[lembrete] Conta ${assinatura.contaId}: seu teste termina em ${formatarDataCurta(assinatura.testeTerminaEm)}. ` +
              `Nessa data cobraremos ${valor}.`,
          );
          resumo.lembretes += 1;
        }
      }

      const devida = cobrancaDevida(assinatura, agora);
      if (!devida) continue;
      if (!clienteRef) throw new Error('Assinatura com cobrança devida e sem cartão');

      resumo.cobrancas += 1;
      const aprovada = await cobrarFatura(
        db,
        billing,
        assinatura,
        {
          tipo: devida.tipo,
          valorCentavos: devida.valorCentavos,
          chaveIdempotencia: chaveDoJob(assinatura),
          clienteRef,
          descricao: descricaoDaFatura(assinatura),
        },
        agora,
      );
      if (aprovada) {
        await salvarAssinatura(db, registrarCobrancaAprovada(assinatura, agora), agora);
        resumo.aprovadas += 1;
      } else {
        await salvarAssinatura(db, registrarCobrancaRecusada(assinatura, agora), agora);
        resumo.recusadas += 1;
      }
    } catch (erro) {
      resumo.erros += 1;
      registrar(`[cobranca] Falha ao processar a assinatura ${assinatura.id}: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  return resumo;
}
