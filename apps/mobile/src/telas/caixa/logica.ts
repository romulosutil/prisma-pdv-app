import { formatarBRL, formatarDataCurta, MS_POR_DIA, type Centavos, type Venda } from '@pdv/shared';
import type { MeioPagamento, Unidade } from '@/dados/tipos';
import { rotuloDoMeio } from '@/util/meios';
import { inicioDoDia } from '@/util/tempo';

// ---------- Conferência da gaveta ----------

export type ResultadoGaveta = { tipo: 'bate' | 'sobra' | 'falta'; valorCentavos: Centavos };

export function compararGaveta(esperadoCentavos: Centavos, contadoCentavos: Centavos): ResultadoGaveta {
  const diferenca = contadoCentavos - esperadoCentavos;
  if (diferenca === 0) return { tipo: 'bate', valorCentavos: 0 };
  return { tipo: diferenca > 0 ? 'sobra' : 'falta', valorCentavos: Math.abs(diferenca) };
}

export function textoDaGaveta(r: ResultadoGaveta): string {
  if (r.tipo === 'bate') return 'Bateu certinho';
  return `${r.tipo === 'sobra' ? 'Sobra' : 'Falta'} ${formatarBRL(r.valorCentavos)}`;
}

// ---------- Período e filtros da lista de vendas ----------

export type PeriodoVendas = 'hoje' | 'ontem' | '7dias';

/** Só "hoje" vale em qualquer plano; os outros períodos são relatório por período (Negócio+). */
export const periodoExigePlano = (periodo: PeriodoVendas): boolean => periodo !== 'hoje';

/**
 * Intervalo [inicio, fim) do período no calendário de Brasília. `historicoDias` (limite do plano,
 * `null` = ilimitado) impede que o início recue além do histórico guardado.
 */
export function intervaloDoPeriodo(periodo: PeriodoVendas, agora: Date, historicoDias: number | null): { inicio: Date; fim: Date } {
  const hoje = inicioDoDia(agora).getTime();
  const inicio = { hoje, ontem: hoje - MS_POR_DIA, '7dias': hoje - 6 * MS_POR_DIA }[periodo];
  const fim = periodo === 'ontem' ? hoje : hoje + MS_POR_DIA;
  const maisAntigo = historicoDias === null ? -Infinity : hoje - historicoDias * MS_POR_DIA;
  return { inicio: new Date(Math.max(inicio, maisAntigo)), fim: new Date(fim) };
}

/** Vendas do período, da mais recente para a mais antiga. */
export function vendasDoPeriodo(vendas: readonly Venda[], periodo: PeriodoVendas, agora: Date, historicoDias: number | null): Venda[] {
  const { inicio, fim } = intervaloDoPeriodo(periodo, agora, historicoDias);
  return vendas
    .filter((v) => {
      const t = new Date(v.criadaEm).getTime();
      return t >= inicio.getTime() && t < fim.getTime();
    })
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

export interface GrupoDia {
  /** Instante da meia-noite (Brasília) do dia do grupo. */
  dia: Date;
  vendas: Venda[];
}

/** Agrupa vendas (já ordenadas da mais recente) por dia, mantendo a ordem. */
export function agruparPorDia(vendas: readonly Venda[]): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const venda of vendas) {
    const dia = inicioDoDia(new Date(venda.criadaEm));
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia.getTime() === dia.getTime()) ultimo.vendas.push(venda);
    else grupos.push({ dia, vendas: [venda] });
  }
  return grupos;
}

export type FiltroMeio = 'todos' | 'dinheiro' | 'pix' | 'cartao';

const MEIOS_DO_FILTRO: Record<Exclude<FiltroMeio, 'todos'>, readonly MeioPagamento[]> = {
  dinheiro: ['dinheiro'],
  pix: ['pix'],
  cartao: ['cartao_credito', 'cartao_debito', 'tap'],
};

/** Uma venda com pagamento dividido aparece em todos os meios que usou. */
export function filtrarPorMeio(vendas: readonly Venda[], filtro: FiltroMeio): Venda[] {
  if (filtro === 'todos') return [...vendas];
  const meios = MEIOS_DO_FILTRO[filtro];
  return vendas.filter((v) => v.pagamentos.some((p) => meios.includes(p.meio)));
}

/** "Pix", "Dinheiro + Pix". */
export function rotuloDosPagamentos(venda: Venda): string {
  const rotulos = venda.pagamentos.map((p) => rotuloDoMeio(p.meio));
  if (venda.fiado) rotulos.push('Fiado');
  return [...new Set(rotulos)].join(' + ') || 'Sem pagamento';
}

export interface ResumoDasVendas {
  concluidas: number;
  canceladas: number;
  totalCentavos: Centavos;
}

/** O total conta só as vendas concluídas. */
export function resumirVendas(vendas: readonly Venda[]): ResumoDasVendas {
  const concluidas = vendas.filter((v) => v.status === 'concluida');
  return {
    concluidas: concluidas.length,
    canceladas: vendas.length - concluidas.length,
    totalCentavos: concluidas.reduce((soma, v) => soma + v.totalCentavos, 0),
  };
}

/** Itens em unidade aparecem como "3×"; fracionados (balança), como "0,350 kg". */
export function formatarQuantidade(milesimos: number, unidade?: Unidade): string {
  if (unidade !== 'kg' && milesimos % 1000 === 0) return `${milesimos / 1000}×`;
  const inteiro = Math.floor(milesimos / 1000);
  const fracao = String(milesimos % 1000).padStart(3, '0');
  return `${inteiro},${fracao} kg`;
}

export function textoDeItens(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`;
}

const DIAS_DA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;

/** "Hoje, 24/10", "Ontem, 23/10", "Quarta, 21/10". `dia` é a meia-noite de Brasília do grupo. */
export function rotuloDoDia(dia: Date, agora: Date): string {
  const data = formatarDataCurta(dia);
  const hoje = inicioDoDia(agora).getTime();
  if (dia.getTime() === hoje) return `Hoje, ${data}`;
  if (dia.getTime() === hoje - MS_POR_DIA) return `Ontem, ${data}`;
  // Meia-noite de Brasília cai às 03:00 UTC; recuar 3 h dá o dia da semana local.
  return `${DIAS_DA_SEMANA[new Date(dia.getTime() - 3 * 60 * 60 * 1000).getUTCDay()]}, ${data}`;
}
