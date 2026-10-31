import type { CartaoSalvo } from './cartao';
import { adicionarDias, adicionarMeses, formatarDataCurta, MS_POR_DIA } from './datas';
import { formatarBRL, type Centavos } from './dinheiro';
import { PLANOS, type PlanoId } from './planos';
import { aplicarDesconto, encontrarCupom, type CupomAplicado } from './cupons';

export const TESTE_DIAS = 7;
export const CARENCIA_INADIMPLENCIA_DIAS = 7;
export const LEMBRETE_FIM_TESTE_DIAS_ANTES = 2;
/** Dias depois do primeiro fracasso (`inadimplenteDesde`) em que o gateway tenta cobrar de novo. */
export const RETENTATIVAS_DIAS = [1, 3, 5] as const;
export const RETENCAO_DADOS_DIAS = 90;

export const STATUS_ASSINATURA = [
  'sem_assinatura',
  'em_teste',
  'ativa',
  'inadimplente',
  'suspensa',
  'cancelada',
] as const;
export type StatusAssinatura = (typeof STATUS_ASSINATURA)[number];

export interface Assinatura {
  readonly id: string;
  readonly contaId: string;
  readonly planoId: PlanoId;
  readonly status: StatusAssinatura;
  readonly criadaEm: Date;
  readonly testeTerminaEm: Date;
  readonly periodoAtualInicio: Date;
  readonly periodoAtualFim: Date;
  readonly acessoAte: Date | null;
  readonly inadimplenteDesde: Date | null;
  readonly tentativasFalhas: number;
  readonly proximaTentativaEm: Date | null;
  readonly canceladaEm: Date | null;
  /** Downgrade marcado para a próxima renovação. */
  readonly planoAgendado: PlanoId | null;
  readonly cartao: CartaoSalvo | null;
  readonly cupom?: CupomAplicado | null;
}

/** Forma JSON da assinatura: datas em ISO 8601. */
export interface AssinaturaSerializada {
  id: string;
  contaId: string;
  planoId: PlanoId;
  status: StatusAssinatura;
  criadaEm: string;
  testeTerminaEm: string;
  periodoAtualInicio: string;
  periodoAtualFim: string;
  acessoAte: string | null;
  inadimplenteDesde: string | null;
  tentativasFalhas: number;
  proximaTentativaEm: string | null;
  canceladaEm: string | null;
  planoAgendado: PlanoId | null;
  cartao: CartaoSalvo | null;
  cupom?: CupomAplicado | null;
}

export interface CobrancaDevida {
  tipo: 'primeira' | 'renovacao' | 'retentativa';
  valorCentavos: Centavos;
}

export class ErroTransicao extends Error {
  constructor(acao: string, status: StatusAssinatura) {
    super(`Não é possível ${acao} uma assinatura com status "${status}"`);
    this.name = 'ErroTransicao';
  }
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const data = (s: string | null): Date | null => (s === null ? null : new Date(s));

export function serializarAssinatura(a: Assinatura): AssinaturaSerializada {
  return {
    ...a,
    criadaEm: a.criadaEm.toISOString(),
    testeTerminaEm: a.testeTerminaEm.toISOString(),
    periodoAtualInicio: a.periodoAtualInicio.toISOString(),
    periodoAtualFim: a.periodoAtualFim.toISOString(),
    acessoAte: iso(a.acessoAte),
    inadimplenteDesde: iso(a.inadimplenteDesde),
    proximaTentativaEm: iso(a.proximaTentativaEm),
    canceladaEm: iso(a.canceladaEm),
  };
}

export function desserializarAssinatura(s: AssinaturaSerializada): Assinatura {
  return {
    ...s,
    criadaEm: new Date(s.criadaEm),
    testeTerminaEm: new Date(s.testeTerminaEm),
    periodoAtualInicio: new Date(s.periodoAtualInicio),
    periodoAtualFim: new Date(s.periodoAtualFim),
    acessoAte: data(s.acessoAte),
    inadimplenteDesde: data(s.inadimplenteDesde),
    proximaTentativaEm: data(s.proximaTentativaEm),
    canceladaEm: data(s.canceladaEm),
  };
}

const preco = (planoId: PlanoId): Centavos => PLANOS[planoId].precoMensalCentavos;

export function valorMensalAssinatura(a: Pick<Assinatura, 'planoId' | 'planoAgendado' | 'cupom'>): Centavos {
  return aplicarDesconto(preco(a.planoAgendado ?? a.planoId), a.cupom);
}

/** Dia do mês em que a assinatura cobra, para não "escorregar" depois de um mês curto. */
function diaDeCobranca(a: Assinatura): number {
  if (a.periodoAtualFim.getTime() === a.testeTerminaEm.getTime()) return a.testeTerminaEm.getUTCDate();
  return Math.max(a.periodoAtualInicio.getUTCDate(), a.periodoAtualFim.getUTCDate());
}

export function iniciarTeste(p: {
  id: string;
  contaId: string;
  planoId: PlanoId;
  cartao: CartaoSalvo;
  agora: Date;
  codigoCupom?: string;
}): Assinatura {
  const codigo = p.codigoCupom?.trim();
  const cupom = codigo ? encontrarCupom(codigo) : null;
  if (codigo && !cupom) throw new Error('Cupom inválido. Confira o código e tente novamente.');
  const fimDoTeste = adicionarDias(p.agora, TESTE_DIAS);
  return {
    id: p.id,
    contaId: p.contaId,
    planoId: p.planoId,
    status: 'em_teste',
    criadaEm: p.agora,
    testeTerminaEm: fimDoTeste,
    periodoAtualInicio: p.agora,
    periodoAtualFim: fimDoTeste,
    acessoAte: null,
    inadimplenteDesde: null,
    tentativasFalhas: 0,
    proximaTentativaEm: null,
    canceladaEm: null,
    planoAgendado: null,
    cartao: p.cartao,
    cupom,
  };
}

/**
 * Pagamento confirmado (primeira cobrança, renovação, retentativa ou pagamento de
 * conta suspensa). O período novo é de 1 mês civil ancorado no fim do período
 * anterior; conta suspensa não usou o período em atraso, então recomeça em `agora`.
 */
export function registrarCobrancaAprovada(a: Assinatura, agora: Date): Assinatura {
  if (a.status === 'ativa' && agora < a.periodoAtualFim) {
    throw new ErroTransicao('cobrar antes do fim do período de', a.status);
  }
  let inicio: Date;
  let fim: Date;
  switch (a.status) {
    case 'em_teste':
    case 'ativa':
    case 'inadimplente':
      inicio = a.periodoAtualFim;
      fim = adicionarMeses(inicio, 1, diaDeCobranca(a));
      break;
    case 'suspensa':
      inicio = agora;
      fim = adicionarMeses(inicio, 1);
      break;
    default:
      throw new ErroTransicao('registrar cobrança aprovada em', a.status);
  }
  return {
    ...a,
    status: 'ativa',
    planoId: a.planoAgendado ?? a.planoId,
    planoAgendado: null,
    periodoAtualInicio: inicio,
    periodoAtualFim: fim,
    acessoAte: null,
    inadimplenteDesde: null,
    tentativasFalhas: 0,
    proximaTentativaEm: null,
  };
}

/** Cobrança recusada: vira inadimplente e agenda a próxima tentativa (ou nenhuma, depois da última). */
export function registrarCobrancaRecusada(a: Assinatura, agora: Date): Assinatura {
  if (a.status !== 'em_teste' && a.status !== 'ativa' && a.status !== 'inadimplente') {
    throw new ErroTransicao('registrar cobrança recusada em', a.status);
  }
  const desde = a.status === 'inadimplente' ? (a.inadimplenteDesde ?? agora) : agora;
  const tentativasFalhas = a.status === 'inadimplente' ? a.tentativasFalhas + 1 : 1;
  const diasAteProxima = RETENTATIVAS_DIAS[tentativasFalhas - 1];
  return {
    ...a,
    status: 'inadimplente',
    inadimplenteDesde: desde,
    tentativasFalhas,
    proximaTentativaEm: diasAteProxima === undefined ? null : adicionarDias(desde, diasAteProxima),
  };
}

/** Cancela sem reembolso automático. O acesso vai até o fim do teste ou do período já pago. */
export function cancelar(a: Assinatura, agora: Date): Assinatura {
  if (a.status === 'sem_assinatura' || a.status === 'cancelada') throw new ErroTransicao('cancelar', a.status);
  return {
    ...a,
    status: 'cancelada',
    canceladaEm: agora,
    acessoAte: a.status === 'em_teste' ? a.testeTerminaEm : a.periodoAtualFim,
    proximaTentativaEm: null,
    planoAgendado: null,
  };
}

/**
 * Reassinar. Dentro do teste, volta a `em_teste`; dentro de um período já pago, volta
 * a `ativa` no mesmo período (upgrade/downgrade seguem `trocarPlano`). Fora disso
 * começa um período novo em `agora`: quem chama deve ter cobrado o valor antes.
 */
export function reativar(a: Assinatura, p: { planoId: PlanoId; agora: Date }): Assinatura {
  if (a.status !== 'cancelada') throw new ErroTransicao('reativar', a.status);
  const base = {
    ...a,
    canceladaEm: null,
    acessoAte: null,
    inadimplenteDesde: null,
    tentativasFalhas: 0,
    proximaTentativaEm: null,
    planoAgendado: null,
  };
  if (p.agora < a.testeTerminaEm) return { ...base, status: 'em_teste', planoId: p.planoId };
  if (p.agora < a.periodoAtualFim) return trocarPlano({ ...base, status: 'ativa' }, p.planoId, p.agora);
  return {
    ...base,
    status: 'ativa',
    planoId: p.planoId,
    periodoAtualInicio: p.agora,
    periodoAtualFim: adicionarMeses(p.agora, 1),
  };
}

/**
 * Upgrade vale na hora (a cobrança proporcional é de quem chama: veja `calcularProrata`,
 * que usa o plano atual e por isso vem antes). Downgrade fica agendado para a renovação.
 * No teste qualquer troca vale na hora, sem cobrança.
 */
export function trocarPlano(a: Assinatura, novoPlano: PlanoId, agora: Date): Assinatura {
  if (a.status !== 'em_teste' && a.status !== 'ativa') throw new ErroTransicao('trocar o plano de', a.status);
  if (agora >= a.periodoAtualFim) throw new ErroTransicao('trocar o plano, com renovação pendente, de', a.status);
  if (a.status === 'em_teste' || preco(novoPlano) >= preco(a.planoId)) {
    return { ...a, planoId: novoPlano, planoAgendado: null };
  }
  return { ...a, planoAgendado: novoPlano };
}

export function atualizarCartao(a: Assinatura, cartao: CartaoSalvo): Assinatura {
  if (a.status === 'sem_assinatura') throw new ErroTransicao('atualizar o cartão de', a.status);
  return { ...a, cartao };
}

/** Transições por tempo: inadimplente há `CARENCIA_INADIMPLENCIA_DIAS` ou mais vira suspensa. */
export function avaliar(a: Assinatura, agora: Date): Assinatura {
  if (a.status === 'inadimplente' && a.inadimplenteDesde) {
    const suspendeEm = adicionarDias(a.inadimplenteDesde, CARENCIA_INADIMPLENCIA_DIAS);
    if (agora >= suspendeEm) return { ...a, status: 'suspensa', proximaTentativaEm: null };
  }
  return a;
}

/** O que cobrar agora. Na renovação vale o preço do plano agendado, se houver downgrade. */
export function cobrancaDevida(a: Assinatura, agora: Date): CobrancaDevida | null {
  const valorCentavos = valorMensalAssinatura(a);
  switch (a.status) {
    case 'em_teste':
      return agora >= a.testeTerminaEm ? { tipo: 'primeira', valorCentavos } : null;
    case 'ativa':
      return agora >= a.periodoAtualFim ? { tipo: 'renovacao', valorCentavos } : null;
    case 'inadimplente':
      return a.proximaTentativaEm && agora >= a.proximaTentativaEm ? { tipo: 'retentativa', valorCentavos } : null;
    default:
      return null;
  }
}

/** true a partir de D-2 até o fim do teste. Quem envia deve registrar que já avisou. */
export function deveLembrarFimTeste(a: Assinatura, agora: Date): boolean {
  if (a.status !== 'em_teste') return false;
  return agora >= adicionarDias(a.testeTerminaEm, -LEMBRETE_FIM_TESTE_DIAS_ANTES) && agora < a.testeTerminaEm;
}

export function temAcesso(a: Assinatura, agora: Date): boolean {
  switch (a.status) {
    case 'em_teste':
    case 'ativa':
    case 'inadimplente':
      return true;
    case 'cancelada':
      return a.acessoAte !== null && agora < a.acessoAte;
    default:
      return false;
  }
}

export function podeAbrirVenda(a: Assinatura, agora: Date): boolean {
  return temAcesso(a, agora);
}

export function diasRestantesTeste(a: Assinatura, agora: Date): number {
  if (a.status !== 'em_teste') return 0;
  return Math.max(0, Math.ceil((a.testeTerminaEm.getTime() - agora.getTime()) / MS_POR_DIA));
}

/** Resumo da cobrança após os sete dias grátis, já considerando o cupom. */
export function descricaoCobrancaPaywall(
  planoId: PlanoId,
  agora: Date,
  cupom?: CupomAplicado | null,
): { hoje: string; dataPrimeiraCobranca: Date; texto: string } {
  const dataPrimeiraCobranca = adicionarDias(agora, TESTE_DIAS);
  return {
    hoje: formatarBRL(0),
    dataPrimeiraCobranca,
    texto: `A partir de ${formatarDataCurta(dataPrimeiraCobranca)}: ${formatarBRL(aplicarDesconto(preco(planoId), cupom))}/mês`,
  };
}

/**
 * Valor a cobrar agora num upgrade: diferença de preço vezes a fração do período que
 * falta. Downgrade, mesmo plano e período de teste não cobram nada.
 */
export function calcularProrata(a: Assinatura, novoPlano: PlanoId, agora: Date): Centavos {
  if (a.status !== 'ativa') return 0;
  const diferenca = aplicarDesconto(preco(novoPlano), a.cupom) - aplicarDesconto(preco(a.planoId), a.cupom);
  if (diferenca <= 0) return 0;
  const total = a.periodoAtualFim.getTime() - a.periodoAtualInicio.getTime();
  const restante = Math.min(total, Math.max(0, a.periodoAtualFim.getTime() - agora.getTime()));
  return Math.floor((2 * diferenca * restante + total) / (2 * total));
}
