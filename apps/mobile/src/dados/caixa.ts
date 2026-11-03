import { podeUsar, somar, saldoDoCaixa, type Caixa, type Centavos, type PlanoId, type Venda } from '@pdv/shared';
import { inicioDoDia } from '@/util/tempo';
import type { Ambiente } from './ambiente';
import { ErroDeDominio } from './erros';
import { Persistido } from './observavel';

export interface ContextoCaixa {
  sessao: () => { lojaId: string; aparelhoId: string; operadorId: string };
  planoId: () => PlanoId;
  checkoutPendente?: (caixaId: string) => boolean;
  autorizar?: (saida?: boolean) => void;
  conferirOutros?: () => boolean;
  reservar?: (id: string, trocoInicialCentavos: number) => Promise<Caixa>;
  vendas?: () => readonly Venda[];
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
  retiradasCentavos: Centavos;
  outrosMovimentosCentavos: Centavos;
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
  return saldoDoCaixa(caixa, vendas);
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
    totalCentavos: somar(0, ...doDia.map(v => v.totalCentavos)),
    quantidadeVendas: doDia.length,
    porMeio: { dinheiro, pix, cartao },
    caixaAberto: caixa !== null,
    trocoInicialCentavos: caixa?.abertura.trocoInicialCentavos ?? 0,
    suprimentosCentavos: somar(0, ...movimentos.filter((m) => m.tipo === 'suprimento').map((m) => m.valorCentavos)),
    sangriasCentavos: somar(0, ...movimentos.filter((m) => m.tipo === 'sangria').map((m) => m.valorCentavos)),
    retiradasCentavos: somar(0, ...movimentos.filter((m) => m.tipo === 'retirada').map((m) => m.valorCentavos)),
    outrosMovimentosCentavos: movimentos.filter(m => !['suprimento', 'sangria', 'retirada'].includes(m.tipo)).reduce((s, m) => s + (['transferencia_entrada', 'correcao_entrada', 'recebimento_fiado'].includes(m.tipo) ? 1 : -1) * m.valorCentavos, 0),
    esperadoNaGavetaCentavos: caixa ? esperadoNaGaveta(caixa, vendas) : null,
  };
}

/** Histórico de caixas do aparelho. Há no máximo um aberto (`fechamento === null`). */
export class CaixaRepo extends Persistido<Caixa[]> {
  private abrindo = false;
  constructor(
    private readonly amb: Ambiente,
    private readonly contexto: ContextoCaixa,
  ) {
    super(amb.armazenamento, 'caixas', []);
  }

  protected validarCarregado(valor: Caixa[]): Caixa[] {
    return this.contexto.conferirOutros?.() === false ? valor.filter(c => c.operadorId === this.contexto.sessao().operadorId) : valor;
  }

  atual(): Caixa | null {
    if (!this.obter().some((c) => c.fechamento === null)) return null;
    const { lojaId, aparelhoId, operadorId } = this.contexto.sessao();
    return this.obter().find((c) => c.fechamento === null && c.lojaId === lojaId && (c.aparelhoAtualId ?? c.aparelhoId) === aparelhoId && c.operadorId === operadorId) ?? null;
  }

  async abrir(trocoInicialCentavos: Centavos): Promise<Caixa> {
    this.contexto.autorizar?.();
    if (!Number.isSafeInteger(trocoInicialCentavos) || trocoInicialCentavos < 0) {
      throw new ErroDeDominio('valor_invalido', 'O troco inicial precisa ser zero ou mais.');
    }
    if (this.abrindo) throw new ErroDeDominio('caixa_ja_aberto', 'A abertura está em andamento.');
    if (this.contexto.reservar) {
      this.abrindo = true;
      const origem = JSON.stringify(this.contexto.sessao());
      try {
        if (this.obter().some(c => !c.fechamento && c.operadorId === this.contexto.sessao().operadorId && c.lojaId === this.contexto.sessao().lojaId)) throw new ErroDeDominio('caixa_ja_aberto', 'Retome ou encerre seu turno anterior antes de abrir outro.');
        let pendente = await this.amb.armazenamento.obter<{ id: string; troco: number }>('aberturaCaixaPendente');
        if (pendente && this.obter().some(c => c.id === pendente!.id && c.fechamento)) { await this.amb.armazenamento.remover('aberturaCaixaPendente'); pendente = null; }
        if (pendente && pendente.troco !== trocoInicialCentavos) throw new ErroDeDominio('valor_invalido', 'Repita o troco da abertura pendente para confirmar o resultado no servidor.');
        const intencao = pendente ?? { id: this.amb.novoId(), troco: trocoInicialCentavos };
        await this.amb.armazenamento.gravar('aberturaCaixaPendente', intencao);
        const caixa = await this.contexto.reservar(intencao.id, intencao.troco);
        if (origem !== JSON.stringify(this.contexto.sessao())) throw new Error('O perfil mudou durante a abertura. Retome o perfil original para recuperar o turno.');
        await this.modificar(lista => [...lista.filter(c => c.id !== caixa.id), caixa]);
        await this.amb.armazenamento.remover('aberturaCaixaPendente');
        return caixa;
      } finally { this.abrindo = false; }
    }
    let caixa: Caixa | undefined;
    await this.modificar((atual) => {
      const { lojaId, aparelhoId, operadorId } = this.contexto.sessao();
      if (atual.some((c) => c.fechamento === null && c.lojaId === lojaId && c.operadorId === operadorId)) throw new ErroDeDominio('caixa_ja_aberto', 'Já existe um caixa aberto.');
      caixa = { id: this.amb.novoId(), lojaId, aparelhoId, operadorId, abertura: { em: this.amb.relogio.agora().toISOString(), trocoInicialCentavos }, fechamento: null, movimentos: [] };
      return [...atual, caixa];
    });
    return caixa!;
  }

  /** Sangria e suprimento dependem do recurso `sangria_suprimento` do plano (Negócio ou Pro). */
  async registrarMovimento(tipo: 'sangria' | 'suprimento' | 'retirada', valorCentavos: Centavos, motivo: string | null = null, detalhes?: { categoria: string; destino: string }): Promise<Caixa> {
    this.contexto.autorizar?.(tipo !== 'suprimento');
    if (!podeUsar(this.contexto.planoId(), 'sangria_suprimento')) {
      throw new ErroDeDominio('recurso_plano', 'Sangria e suprimento estão a partir do plano Negócio.');
    }
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
      throw new ErroDeDominio('valor_invalido', 'O valor precisa ser maior que zero.');
    }
    let atualizado: Caixa | undefined;
    await this.modificar((lista) => {
      const { lojaId, aparelhoId, operadorId } = this.contexto.sessao();
      const atual = lista.find((c) => c.fechamento === null && c.lojaId === lojaId && (c.aparelhoAtualId ?? c.aparelhoId) === aparelhoId && c.operadorId === operadorId);
      if (!atual) throw new ErroDeDominio('caixa_fechado', 'Abra o caixa antes de registrar movimentos.');
      const auditado = atual.versaoContrato === 2 || tipo === 'retirada' || !!this.contexto.reservar;
      if (auditado && (!motivo?.trim() || !detalhes?.categoria.trim() || !detalhes.destino.trim())) throw new ErroDeDominio('valor_invalido', 'Informe categoria, origem/destino e motivo.');
      if (tipo !== 'suprimento' && this.contexto.vendas && valorCentavos > esperadoNaGaveta(atual, this.contexto.vendas())) throw new ErroDeDominio('valor_invalido', 'Saída maior que o dinheiro esperado na gaveta.');
      atualizado = { ...atual, movimentos: [...atual.movimentos, { id: this.amb.novoId(), tipo, valorCentavos, motivo, criadoEm: this.amb.relogio.agora().toISOString(), ...(auditado ? { versaoContrato: 2 as const, autorOperadorId: operadorId, responsavelOperadorId: operadorId, aparelhoId, categoria: detalhes!.categoria.trim(), destino: detalhes!.destino.trim() } : {}) }] };
      return lista.map((c) => c.id === atual.id ? atualizado! : c);
    });
    return atualizado!;
  }

  /** `vendas` são as vendas do app: servem para calcular o esperado que fica gravado no fechamento. */
  async fechar(contadoCentavos: Centavos, vendas: readonly Venda[], trocoRestanteCentavos = 0): Promise<Caixa> {
    this.contexto.autorizar?.();
    const aberto = this.atual();
    if (!aberto) throw new ErroDeDominio('caixa_fechado', 'Não há caixa aberto.');
    if (!Number.isSafeInteger(contadoCentavos) || contadoCentavos < 0) {
      throw new ErroDeDominio('valor_invalido', 'O valor contado precisa ser zero ou mais.');
    }
    if (!Number.isSafeInteger(trocoRestanteCentavos) || trocoRestanteCentavos < 0 || trocoRestanteCentavos > contadoCentavos) throw new ErroDeDominio('valor_invalido', 'O troco que fica deve estar entre zero e o valor contado.');
    let fechado: Caixa | undefined;
    await this.modificar((lista) => {
      const atual = lista.find((c) => c.id === aberto.id && c.fechamento === null);
      if (!atual) throw new ErroDeDominio('caixa_fechado', 'Não há caixa aberto.');
      if (this.contexto.checkoutPendente?.(atual.id)) throw new ErroDeDominio('checkout_pendente', 'Conclua a venda em andamento antes de fechar o caixa.');
      const esperadoCentavos = esperadoNaGaveta(atual, vendas);
      fechado = { ...atual, fechamento: { em: this.amb.relogio.agora().toISOString(), esperadoCentavos, contadoCentavos, ...(atual.versaoContrato === 2 ? { diferencaCentavos: contadoCentavos - esperadoCentavos, conferenteId: this.contexto.sessao().operadorId, trocoRestanteCentavos, recolhidoCentavos: contadoCentavos - trocoRestanteCentavos } : {}) } };
      return lista.map((c) => c.id === atual.id ? fechado! : c);
    });
    return fechado!;
  }

  async substituirTodos(caixas: Caixa[]): Promise<void> {
    await this.modificar(() => caixas);
  }
}
