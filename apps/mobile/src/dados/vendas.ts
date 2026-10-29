import { multiplicarPreco, somar, type Centavos, type Venda } from '@pdv/shared';
import { registrar } from '@/diagnostico/registro';
import { inicioDoDia } from '@/util/tempo';
import type { Ambiente } from './ambiente';
import { ErroDeDominio } from './erros';
import { Persistido } from './observavel';
import type { MeioPagamento, ProvedorPagamento } from './tipos';

export interface ItemNovaVenda {
  /** `null` para venda avulsa (valor digitado sem produto). */
  produtoId: string | null;
  descricao: string;
  /** Preço da unidade (ou do kg) em centavos. */
  precoUnitarioCentavos: Centavos;
  /** 1 un = 1000; 0,350 kg = 350. */
  quantidadeMilesimos: number;
}

export interface PagamentoNovaVenda {
  meio: MeioPagamento;
  provedor?: ProvedorPagamento | null;
  /** Quanto este meio pagou da venda (líquido: no dinheiro, sem o troco). A soma dos pagamentos é o total. */
  valorCentavos: Centavos;
  /** Troco devolvido (só dinheiro). Dinheiro recebido = valor + troco. */
  trocoCentavos?: Centavos;
}

export interface NovaVenda {
  itens: ItemNovaVenda[];
  pagamentos: PagamentoNovaVenda[];
}

export interface EstadoVendas {
  vendas: Venda[];
  /** O número exibido da venda é `numeroBase` + posição na ordem de criação. */
  numeroBase: number;
}

export interface ContextoVendas {
  sessao: () => { lojaId: string; aparelhoId: string; operadorId: string };
}

export const totalDoItem = (item: ItemNovaVenda): Centavos => multiplicarPreco(item.precoUnitarioCentavos, item.quantidadeMilesimos);

export const totalDosItens = (itens: readonly ItemNovaVenda[]): Centavos => somar(...itens.map(totalDoItem));

/** Vendas imutáveis: só o cancelamento muda o `status`. */
export class VendasRepo extends Persistido<EstadoVendas> {
  constructor(
    private readonly amb: Ambiente,
    private readonly contexto: ContextoVendas,
  ) {
    super(amb.armazenamento, 'vendas', { vendas: [], numeroBase: 0 });
  }

  /** Da mais recente para a mais antiga. */
  listar(): Venda[] {
    return [...this.obter().vendas].sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
  }

  listarPorDia(dia: Date): Venda[] {
    const inicio = inicioDoDia(dia).getTime();
    const fim = inicio + 24 * 60 * 60 * 1000;
    return this.listar().filter((v) => {
      const t = new Date(v.criadaEm).getTime();
      return t >= inicio && t < fim;
    });
  }

  /** "#000230". */
  numeroDe(venda: Venda): string {
    const { vendas, numeroBase } = this.obter();
    const ordem = [...vendas].sort((a, b) => a.criadaEm.localeCompare(b.criadaEm)).findIndex((v) => v.id === venda.id);
    return `#${String(numeroBase + ordem + 1).padStart(6, '0')}`;
  }

  /**
   * Registra uma venda concluída. Nunca depende da rede nem do estado da assinatura: quem já abriu a
   * venda consegue fechá-la. Lança `ErroDeDominio` se não houver itens ou se os pagamentos não fecharem o total.
   */
  async registrar(nova: NovaVenda, id?: string): Promise<Venda> {
    const existente = id ? this.obter().vendas.find((v) => v.id === id) : null;
    if (existente) return existente;
    if (nova.itens.length === 0) throw new ErroDeDominio('sem_itens', 'Adicione ao menos um item à venda.');
    const totalCentavos = totalDosItens(nova.itens);
    if (somar(...nova.pagamentos.map((p) => p.valorCentavos)) !== totalCentavos) {
      throw new ErroDeDominio('pagamento_incompleto', 'Os pagamentos não fecham o total da venda.');
    }
    const { lojaId, aparelhoId, operadorId } = this.contexto.sessao();
    const venda: Venda = {
      id: id ?? this.amb.novoId(),
      lojaId,
      aparelhoId,
      operadorId,
      itens: nova.itens.map((item) => ({
        id: this.amb.novoId(),
        produtoId: item.produtoId,
        descricao: item.descricao,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
        quantidadeMilesimos: item.quantidadeMilesimos,
        totalCentavos: totalDoItem(item),
      })),
      pagamentos: nova.pagamentos.map((p) => ({
        id: this.amb.novoId(),
        meio: p.meio,
        provedor: p.provedor ?? null,
        valorCentavos: p.valorCentavos,
        trocoCentavos: p.trocoCentavos ?? 0,
      })),
      totalCentavos,
      status: 'concluida',
      criadaEm: this.amb.relogio.agora().toISOString(),
    };
    await this.modificar((atual) => ({ ...atual, vendas: [...atual.vendas, venda] }));
    registrar('venda', 'venda registrada', {
      totalCentavos,
      itens: venda.itens.length,
      meios: venda.pagamentos.map((p) => p.meio),
    });
    return venda;
  }

  async cancelar(id: string): Promise<Venda> {
    const venda = this.obter().vendas.find((v) => v.id === id);
    if (!venda) throw new ErroDeDominio('venda_inexistente', 'Venda não encontrada.');
    const cancelada: Venda = { ...venda, status: 'cancelada' };
    await this.modificar((atual) => ({ ...atual, vendas: atual.vendas.map((v) => (v.id === id ? cancelada : v)) }));
    return cancelada;
  }

  async substituirTodas(estado: EstadoVendas): Promise<void> {
    await this.modificar(() => estado);
  }
}
