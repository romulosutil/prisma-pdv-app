import { MeioPagamentoSchema, MutacaoSchema, ProvedorPagamentoSchema, VendaSchema, multiplicarPreco, pagamentoManualDisponivel, somar, type Venda } from '@pdv/shared';
import { IdentidadeLocalSchema } from '../estadoConta';
import { z } from 'zod';
import type { PersistenciaCheckout, RegistroCheckout } from '../checkoutTipos';
import type { EstadoVendas } from '../vendas';
import type { ArmazenamentoSqlite } from './armazenamentoSqlite';
import type { SqlExecutor } from './driver';
import { lerFinanceiro, type ParticaoLocal } from './financeiro';

const inteiro = z.number().int().safe();
const itemSchema = z.object({
  chave: z.string().min(1), produtoId: z.uuid().nullable(), descricao: z.string().min(1),
  precoUnitarioCentavos: inteiro.nonnegative(), quantidadeMilesimos: inteiro.positive(),
  unidade: z.enum(['un', 'kg']), ean: z.string().nullable(),
});
const parcelaSchema = z.object({
  meio: MeioPagamentoSchema, provedor: ProvedorPagamentoSchema.nullable().optional(),
  valorCentavos: inteiro.positive(), trocoCentavos: inteiro.nonnegative().optional(),
});
const registroSchema = z.object({
  vendaId: z.uuid(), criadaEm: z.iso.datetime(), caixaId: z.uuid().nullable(),
  estado: z.object({ itens: z.array(itemSchema), parcelas: z.array(parcelaSchema),
    removido: z.object({ item: itemSchema, indice: inteiro.nonnegative() }).nullable(), concluidaId: z.uuid().nullable() }),
});

function validar(valor: unknown): RegistroCheckout {
  const parsed = registroSchema.safeParse(valor);
  if (!parsed.success) throw new Error('Checkout local inválido. Preserve os dados para recuperação.');
  const r = parsed.data;
  if (r.estado.concluidaId && r.estado.concluidaId !== r.vendaId) throw new Error('Identidade da conclusão divergente.');
  if (new Set(r.estado.itens.map((i) => i.chave)).size !== r.estado.itens.length) throw new Error('Itens do checkout duplicados.');
  const total = somar(...r.estado.itens.map((i) => multiplicarPreco(i.precoUnitarioCentavos, i.quantidadeMilesimos)));
  const pago = somar(...r.estado.parcelas.map((p) => p.valorCentavos));
  if (pago > total || (r.estado.parcelas.length > 0 && r.estado.itens.length === 0)) throw new Error('Parcelas do checkout inválidas.');
  return r;
}

async function ler(tx: SqlExecutor, p: ParticaoLocal): Promise<RegistroCheckout | null> {
  const linhas = await tx.getAllAsync<{ venda_id: string; payload_json: string }>('SELECT venda_id, payload_json FROM rascunhos WHERE conta_id = ? AND loja_id = ?', p.contaId, p.lojaId);
  if (linhas.length > 1) throw new Error('Mais de um checkout local. Preserve os dados para recuperação.');
  const linha = linhas[0];
  if (!linha) return null;
  let valor: unknown;
  try { valor = JSON.parse(linha.payload_json); } catch { throw new Error('Checkout local inválido. Preserve os dados para recuperação.'); }
  const r = validar(valor);
  if (r.vendaId !== linha.venda_id) throw new Error('Identidade do checkout divergente.');
  return r;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function vendaConcluida(tx: SqlExecutor, p: ParticaoLocal, registro: RegistroCheckout): Promise<Venda> {
  const { vendas } = await lerFinanceiro(tx, 'vendas', p) as EstadoVendas;
  const venda = vendas.find((v) => v.id === registro.vendaId);
  const itens = registro.estado.itens.map((i) => ({ produtoId: i.produtoId, descricao: i.descricao, precoUnitarioCentavos: i.precoUnitarioCentavos, quantidadeMilesimos: i.quantidadeMilesimos, totalCentavos: multiplicarPreco(i.precoUnitarioCentavos, i.quantidadeMilesimos) }));
  const pagamentos = registro.estado.parcelas.map((parcela) => ({ meio: parcela.meio, provedor: parcela.provedor ?? null, valorCentavos: parcela.valorCentavos, trocoCentavos: parcela.trocoCentavos ?? 0 }));
  const itensVenda = venda?.itens.map(({ id: _id, ...item }) => item);
  const pagamentosVenda = venda?.pagamentos.map(({ id: _id, ...pagamento }) => pagamento);
  // Cancelamento comercial posterior é legítimo; sua auditoria pertence a P0-04.
  if (!venda || venda.criadaEm !== registro.criadaEm || venda.totalCentavos !== somar(...itens.map((i) => i.totalCentavos)) || !igual(itensVenda, itens) || !igual(pagamentosVenda, pagamentos)) {
    throw new Error('Venda concluída divergente ou ausente. Preserve os dados para recuperação.');
  }
  return venda;
}

export class CheckoutSqlite implements PersistenciaCheckout {
  constructor(private readonly armazenamento: ArmazenamentoSqlite, private readonly novoId: () => string) {}

  async carregar(): Promise<RegistroCheckout | null> {
    let resultado: RegistroCheckout | null = null;
    await this.armazenamento.transacao(async (tx, p) => {
      resultado = await ler(tx, p);
      if (resultado?.estado.concluidaId) await vendaConcluida(tx, p, resultado);
    });
    return resultado;
  }

  async salvar(registro: RegistroCheckout | null): Promise<void> {
    await this.armazenamento.transacao(async (tx, p) => {
      const anterior = await ler(tx, p);
      const novo = registro === null ? null : validar(registro);
      if (anterior?.estado.concluidaId && !novo) await vendaConcluida(tx, p, anterior);
      if (anterior?.estado.concluidaId && novo) throw new Error('Checkout concluído não pode ser alterado.');
      if (anterior && novo && (anterior.vendaId !== novo.vendaId || anterior.criadaEm !== novo.criadaEm || anterior.caixaId !== novo.caixaId)) throw new Error('Identidade do checkout não pode ser alterada.');
      if (!anterior && novo?.estado.concluidaId) throw new Error('Conclusão deve ser registrada pela transação de venda.');
      if (novo?.estado.concluidaId && !anterior?.estado.concluidaId) throw new Error('Conclusão deve ser registrada pela transação de venda.');
      if (anterior && !anterior.estado.concluidaId && anterior.estado.parcelas.length) {
        if (!novo || !igual(anterior.estado.itens, novo.estado.itens) || !igual(anterior.estado.parcelas, novo.estado.parcelas.slice(0, anterior.estado.parcelas.length))) throw new Error('Checkout com pagamento recebido não pode ser alterado ou descartado.');
      }
      if (novo?.estado.parcelas.slice(anterior?.estado.parcelas.length ?? 0).some((p) => !pagamentoManualDisponivel(p))) throw new Error('Pagamento integrado indisponível nesta fase.');
      if (!novo) {
        await tx.runAsync('DELETE FROM rascunhos WHERE conta_id = ? AND loja_id = ?', p.contaId, p.lojaId);
      } else {
        await tx.runAsync('INSERT INTO rascunhos VALUES (?, ?, ?, ?) ON CONFLICT(conta_id, loja_id, venda_id) DO UPDATE SET payload_json = excluded.payload_json', p.contaId, p.lojaId, novo.vendaId, JSON.stringify(novo));
      }
    });
  }

  async concluir(): Promise<Venda> {
    const conta = await this.armazenamento.obter<{ sessao?: unknown; identidade?: unknown }>('conta');
    const sessao = IdentidadeLocalSchema.safeParse(conta?.identidade ?? conta?.sessao);
    if (!sessao.success) throw new Error('Sessão local inválida.');
    let resultado: Venda | null = null;
    await this.armazenamento.transacao(async (tx, p) => {
      // A autoria é capturada na conclusão; P0-03 deverá fixá-la ao iniciar o checkout.
      const contaAtual = await this.armazenamento.obter<{ sessao?: unknown; identidade?: unknown }>('conta');
      const atual = IdentidadeLocalSchema.safeParse(contaAtual?.identidade ?? contaAtual?.sessao);
      if (!atual.success || sessao.data.contaId !== p.contaId || sessao.data.lojaId !== p.lojaId ||
        atual.data.contaId !== sessao.data.contaId || atual.data.lojaId !== sessao.data.lojaId ||
        atual.data.aparelhoId !== sessao.data.aparelhoId || atual.data.operadorId !== sessao.data.operadorId) throw new Error('Sessão alterada durante o checkout.');
      const registro = await ler(tx, p);
      if (!registro) throw new Error('Checkout não encontrado.');
      const estadoVendas = await lerFinanceiro(tx, 'vendas', p) as EstadoVendas;
      const existente = estadoVendas.vendas.find((v) => v.id === registro.vendaId);
      if (registro.estado.concluidaId) {
        resultado = await vendaConcluida(tx, p, registro);
        return;
      }
      if (existente) throw new Error('Venda já existe sem conclusão do checkout.');
      const { itens, parcelas } = registro.estado;
      if (parcelas.some((p) => !pagamentoManualDisponivel(p))) throw new Error('Pagamento integrado indisponível nesta fase. Preserve o checkout para recuperação.');
      const totalCentavos = somar(...itens.map((i) => multiplicarPreco(i.precoUnitarioCentavos, i.quantidadeMilesimos)));
      if (!itens.length || !parcelas.length || somar(...parcelas.map((p) => p.valorCentavos)) !== totalCentavos) throw new Error('Pagamento incompleto ou checkout sem itens.');
      const venda = VendaSchema.parse({ id: registro.vendaId, lojaId: p.lojaId, aparelhoId: sessao.data.aparelhoId, operadorId: sessao.data.operadorId,
        itens: itens.map((i) => ({ id: this.novoId(), produtoId: i.produtoId, descricao: i.descricao, precoUnitarioCentavos: i.precoUnitarioCentavos, quantidadeMilesimos: i.quantidadeMilesimos, totalCentavos: multiplicarPreco(i.precoUnitarioCentavos, i.quantidadeMilesimos) })),
        pagamentos: parcelas.map((parcela) => ({ id: this.novoId(), meio: parcela.meio, provedor: parcela.provedor ?? null, valorCentavos: parcela.valorCentavos, trocoCentavos: parcela.trocoCentavos ?? 0 })), totalCentavos, status: 'concluida', criadaEm: registro.criadaEm });
      const mutacao = MutacaoSchema.parse({ id: this.novoId(), criadaEm: registro.criadaEm, entidade: 'venda', operacao: 'upsert', dados: venda });
      await tx.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', p.contaId, p.lojaId, venda.id, registro.caixaId, JSON.stringify(venda));
      for (const [tabela, filhos] of [['itens_venda', venda.itens], ['pagamentos_venda', venda.pagamentos]] as const) {
        for (const [posicao, filho] of filhos.entries()) await tx.runAsync(`INSERT INTO ${tabela} VALUES (?, ?, ?, ?, ?, ?)`, p.contaId, p.lojaId, venda.id, filho.id, posicao, JSON.stringify(filho));
      }
      await tx.runAsync('INSERT INTO outbox (conta_id, loja_id, id, payload_json) VALUES (?, ?, ?, ?)', p.contaId, p.lojaId, mutacao.id, JSON.stringify(mutacao));
      await tx.runAsync('UPDATE rascunhos SET payload_json = ? WHERE conta_id = ? AND loja_id = ? AND venda_id = ?', JSON.stringify({ ...registro, estado: { ...registro.estado, concluidaId: venda.id } }), p.contaId, p.lojaId, venda.id);
      resultado = venda;
    });
    if (!resultado) throw new Error('Venda não concluída.');
    return resultado;
  }
}
