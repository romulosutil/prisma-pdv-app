import type { Armazenamento } from './armazenamento';
import { montarVenda } from './carrinho';
import type { PersistenciaCheckout, RegistroCheckout } from './checkoutTipos';
import type { VendasRepo } from './vendas';

/** Adaptador demonstrativo explícito. Não oferece atomicidade multi-chave do SQLite Android. */
export class CheckoutNavegador implements PersistenciaCheckout {
  constructor(private readonly armazenamento: Armazenamento, private readonly vendas: VendasRepo, private readonly particao: () => string) {}
  private chave() { return `checkout-demo:${this.particao()}`; }
  carregar() { return this.armazenamento.obter<RegistroCheckout>(this.chave()); }
  async salvar(registro: RegistroCheckout | null) {
    if (registro) await this.armazenamento.gravar(this.chave(), registro);
    else await this.armazenamento.remover(this.chave());
  }
  async concluir() {
    const r = await this.carregar();
    if (!r) throw new Error('Checkout não encontrado.');
    const venda = await this.vendas.registrar(montarVenda(r.estado.itens, r.estado.parcelas), r.vendaId);
    await this.salvar({ ...r, estado: { ...r.estado, concluidaId: venda.id } });
    return venda;
  }
}
