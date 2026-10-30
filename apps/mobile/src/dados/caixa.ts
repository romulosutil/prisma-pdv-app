import { podeUsar, somar, type Caixa, type Centavos, type PlanoId, type Venda } from '@pdv/shared';
import { inicioDoDia } from '@/util/tempo';
import type { Ambiente } from './ambiente';
import { ErroDeDominio } from './erros';
import { Persistido } from './observavel';

export interface ContextoCaixa {
  sessao: () => { lojaId: string; aparelhoId: string; operadorId: string };
  planoId: () => PlanoId;
  checkoutPendente?: (caixaId: string) => boolean;
}

export interface ResumoDoDia {
  totalCentavos: Centavos;
  quantidadeVendas: number;
  /** Cartão soma crédito, débito e Tap. Valores líquidos (sem troco). */
  porMeio: { dinheiro: Centavos; pix: Centavos; cartao: Centavos };
  caixaAberto: boolean;
  trocoInicialCentavos: Centavos;
  suprimentosCentavos: Centavos;
  sangriasCentavos: Centavos;
  /** Dinheiro que deveria estar na gaveta agora; `null` sem caixa aberto. */
  esperadoNaGavetaCentavos: Centavos | null;
}

const concluidas = (vendas: readonly Venda[]): Venda[] => vendas.filter((v) => v.status === 'concluida');

function somarMeio(vendas: readonly Venda[], meios: readonly string[]): Centavos {
  return somar(
    0,
    ...vendas.flatMap((v) => v.pagamentos.filter((p) => meios.includes(p.meio)).map((p) => p.valorCentavos)),
  );
}

/** Dinheiro esperado na gaveta: troco inicial + vendas em dinheiro desde a abertura + suprimentos − sangrias. */
export function esperadoNaGaveta(caixa: Caixa, vendas: readonly Venda[]): Centavos {
  const doCaixa = concluidas(vendas).filter((v) => v.caixaId === caixa.id);
  const suprimentos = somar(0, ...caixa.movimentos.filter((m) => m.tipo === 'suprimento').map((m) => m.valorCentavos));
  const sangrias = somar(0, ...caixa.movimentos.filter((m) => m.tipo === 'sangria').map((m) => m.valorCentavos));
  return caixa.abertura.trocoInicialCentavos + somarMeio(doCaixa, ['dinheiro']) + suprimentos - sangrias;
}

/** Resumo do dia de `dia` (calendário de Brasília). `caixa` é o caixa aberto, se houver. */
export function resumirDia(dia: Date, vendas: readonly Venda[], caixa: Caixa | null): ResumoDoDia {
  const inicio = inicioDoDia(dia).getTime();
  const doDia = concluidas(vendas).filter((v) => {
    const t = new Date(v.criadaEm).getTime();
    return t >= inicio && t < inicio + 24 * 60 * 60 * 1000;
  });
  const dinheiro = somarMeio(doDia, ['dinheiro']);
  const pix = somarMeio(doDia, ['pix']);
  const cartao = somarMeio(doDia, ['cartao_credito', 'cartao_debito', 'tap']);
  const movimentos = caixa?.movimentos ?? [];
  return {
    totalCentavos: dinheiro + pix + cartao,
    quantidadeVendas: doDia.length,
    porMeio: { dinheiro, pix, cartao },
    caixaAberto: caixa !== null,
    trocoInicialCentavos: caixa?.abertura.trocoInicialCentavos ?? 0,
    suprimentosCentavos: somar(0, ...movimentos.filter((m) => m.tipo === 'suprimento').map((m) => m.valorCentavos)),
    sangriasCentavos: somar(0, ...movimentos.filter((m) => m.tipo === 'sangria').map((m) => m.valorCentavos)),
    esperadoNaGavetaCentavos: caixa ? esperadoNaGaveta(caixa, vendas) : null,
  };
}

/** Histórico de caixas do aparelho. Há no máximo um aberto (`fechamento === null`). */
export class CaixaRepo extends Persistido<Caixa[]> {
  constructor(
    private readonly amb: Ambiente,
    private readonly contexto: ContextoCaixa,
  ) {
    super(amb.armazenamento, 'caixas', []);
  }

  atual(): Caixa | null {
    return this.obter().find((c) => c.fechamento === null) ?? null;
  }

  async abrir(trocoInicialCentavos: Centavos): Promise<Caixa> {
    if (!Number.isSafeInteger(trocoInicialCentavos) || trocoInicialCentavos < 0) {
      throw new ErroDeDominio('valor_invalido', 'O troco inicial precisa ser zero ou mais.');
    }
    let caixa: Caixa | undefined;
    await this.modificar((atual) => {
      if (atual.some((c) => c.fechamento === null)) throw new ErroDeDominio('caixa_ja_aberto', 'Já existe um caixa aberto.');
      const { lojaId, aparelhoId, operadorId } = this.contexto.sessao();
      caixa = { id: this.amb.novoId(), lojaId, aparelhoId, operadorId, abertura: { em: this.amb.relogio.agora().toISOString(), trocoInicialCentavos }, fechamento: null, movimentos: [] };
      return [...atual, caixa];
    });
    return caixa!;
  }

  /** Sangria e suprimento dependem do recurso `sangria_suprimento` do plano (Negócio ou Pro). */
  async registrarMovimento(tipo: 'sangria' | 'suprimento', valorCentavos: Centavos, motivo: string | null = null): Promise<Caixa> {
    if (!podeUsar(this.contexto.planoId(), 'sangria_suprimento')) {
      throw new ErroDeDominio('recurso_plano', 'Sangria e suprimento estão a partir do plano Negócio.');
    }
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
      throw new ErroDeDominio('valor_invalido', 'O valor precisa ser maior que zero.');
    }
    let atualizado: Caixa | undefined;
    await this.modificar((lista) => {
      const atual = lista.find((c) => c.fechamento === null);
      if (!atual) throw new ErroDeDominio('caixa_fechado', 'Abra o caixa antes de registrar movimentos.');
      atualizado = { ...atual, movimentos: [...atual.movimentos, { id: this.amb.novoId(), tipo, valorCentavos, motivo, criadoEm: this.amb.relogio.agora().toISOString() }] };
      return lista.map((c) => c.id === atual.id ? atualizado! : c);
    });
    return atualizado!;
  }

  /** `vendas` são as vendas do app: servem para calcular o esperado que fica gravado no fechamento. */
  async fechar(contadoCentavos: Centavos, vendas: readonly Venda[]): Promise<Caixa> {
    const aberto = this.atual();
    if (!aberto) throw new ErroDeDominio('caixa_fechado', 'Não há caixa aberto.');
    if (!Number.isSafeInteger(contadoCentavos) || contadoCentavos < 0) {
      throw new ErroDeDominio('valor_invalido', 'O valor contado precisa ser zero ou mais.');
    }
    let fechado: Caixa | undefined;
    await this.modificar((lista) => {
      const atual = lista.find((c) => c.id === aberto.id && c.fechamento === null);
      if (!atual) throw new ErroDeDominio('caixa_fechado', 'Não há caixa aberto.');
      if (this.contexto.checkoutPendente?.(atual.id)) throw new ErroDeDominio('checkout_pendente', 'Conclua a venda em andamento antes de fechar o caixa.');
      fechado = { ...atual, fechamento: { em: this.amb.relogio.agora().toISOString(), esperadoCentavos: esperadoNaGaveta(atual, vendas), contadoCentavos } };
      return lista.map((c) => c.id === atual.id ? fechado! : c);
    });
    return fechado!;
  }

  async substituirTodos(caixas: Caixa[]): Promise<void> {
    await this.modificar(() => caixas);
  }
}
