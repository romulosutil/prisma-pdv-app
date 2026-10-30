import { CaixaSchema, MutacaoSchema, ProdutoSchema, VendaSchema, type Caixa, type Produto, type Venda } from '@pdv/shared';
import { z } from 'zod';
import type { EstadoVendas } from '../vendas';
import { esperadoNaGaveta } from '../caixa';
import type { SqlExecutor } from './driver';

export interface ParticaoLocal { contaId: string; lojaId: string }
export type ChaveFinanceira = 'produtos' | 'caixas' | 'vendas';
export const ehFinanceira = (chave: string): chave is ChaveFinanceira => ['produtos', 'caixas', 'vendas'].includes(chave);
const EstadoVendasSchema = z.object({ vendas: z.array(VendaSchema), numeroBase: z.number().int().nonnegative() });
const schemas = { produtos: z.array(ProdutoSchema), caixas: z.array(CaixaSchema), vendas: EstadoVendasSchema };

/** Erros não incluem o payload: ele pode conter dados pessoais. A origem nunca é apagada. */
export function validarFinanceiro(chave: ChaveFinanceira, valor: unknown, particao: ParticaoLocal): Produto[] | Caixa[] | EstadoVendas {
  const resultado = schemas[chave].safeParse(valor);
  if (!resultado.success) throw new Error(`Dados locais inválidos em ${chave}. Preserve os dados e solicite recuperação.`);
  const dados = resultado.data;
  const entidades = Array.isArray(dados) ? dados : dados.vendas;
  if (entidades.some((e) => e.lojaId !== particao.lojaId) || new Set(entidades.map((e) => e.id)).size !== entidades.length) {
    throw new Error(`Partição ou IDs inválidos em ${chave}. Preserve os dados e solicite recuperação.`);
  }
  return dados;
}

const chaveNumeroBase = (p: ParticaoLocal): string => JSON.stringify(['numeroBase', p.contaId, p.lojaId]);
const canonico = (valor: unknown): unknown => Array.isArray(valor) ? valor.map(canonico) : valor !== null && typeof valor === 'object'
  ? Object.fromEntries(Object.entries(valor).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonico(v)])) : valor;
const iguais = (a: unknown, b: unknown): boolean => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));

export async function lerFinanceiro(tx: SqlExecutor, chave: ChaveFinanceira, p: ParticaoLocal): Promise<unknown> {
  const tabela = chave; // enum fechado, nunca entrada SQL livre
  const linhas = await tx.getAllAsync<{ id: string; payload_json: string; caixa_id?: string | null }>(
    `SELECT id, payload_json${chave === 'vendas' ? ', caixa_id' : ''} FROM ${tabela} WHERE conta_id = ? AND loja_id = ? ORDER BY rowid`, p.contaId, p.lojaId,
  );
  let valor: unknown;
  try { valor = linhas.map((l) => JSON.parse(l.payload_json)); }
  catch { throw new Error(`Dados SQLite inválidos em ${chave}. Preserve o banco para recuperação.`); }
  if (chave === 'vendas') {
    for (const [i, linha] of linhas.entries()) {
      const venda = (valor as Record<string, unknown>[])[i];
      if (!venda || typeof venda !== 'object' || Array.isArray(venda)) throw new Error('Venda SQLite inválida. Preserve o banco para recuperação.');
      if (venda.caixaId !== undefined && (venda.caixaId ?? null) !== linha.caixa_id) throw new Error('Vínculo SQLite divergente. Preserve o banco para recuperação.');
      if (venda.caixaId === undefined && linha.caixa_id) {
        venda.caixaId = linha.caixa_id;
        // Recupera somente vínculo já registrado na coluna, sem inferir por data.
        VendaSchema.parse(venda);
        await tx.runAsync('UPDATE vendas SET payload_json = ? WHERE conta_id = ? AND loja_id = ? AND id = ?', JSON.stringify(venda), p.contaId, p.lojaId, linha.id);
        const mutacoes = await tx.getAllAsync<{ id: string; payload_json: string }>('SELECT id, payload_json FROM outbox WHERE conta_id = ? AND loja_id = ?', p.contaId, p.lojaId);
        for (const m of mutacoes) {
          let mutacao: unknown;
          try { mutacao = JSON.parse(m.payload_json); } catch { throw new Error('Outbox inválida. Preserve o banco para recuperação.'); }
          const parsed = MutacaoSchema.safeParse(mutacao);
          if (!parsed.success) throw new Error('Outbox inválida. Preserve o banco para recuperação.');
          if (parsed.data.entidade === 'venda' && parsed.data.operacao === 'upsert' && parsed.data.dados.id === linha.id) {
            const dados = parsed.data.dados;
            if (dados.caixaId !== undefined && dados.caixaId !== linha.caixa_id) throw new Error('Vínculo da outbox divergente. Preserve o banco para recuperação.');
            await tx.runAsync('UPDATE outbox SET payload_json = ? WHERE conta_id = ? AND loja_id = ? AND id = ?', JSON.stringify({ ...parsed.data, dados: { ...dados, caixaId: linha.caixa_id } }), p.contaId, p.lojaId, m.id);
          }
        }
      }
    }
    const base = await tx.getFirstAsync<{ valor_json: string }>('SELECT valor_json FROM estado_local WHERE chave = ?', chaveNumeroBase(p));
    try { valor = { vendas: valor, numeroBase: base ? JSON.parse(base.valor_json) : 0 }; }
    catch { throw new Error('Numeração local inválida. Preserve o banco para recuperação.'); }
  }
  const validado = validarFinanceiro(chave, valor, p);
  const entidades = Array.isArray(validado) ? validado : validado.vendas;
  if (entidades.some((e, i) => e.id !== linhas[i]?.id)) throw new Error(`IDs SQLite divergentes em ${chave}. Preserve o banco para recuperação.`);
  if (chave === 'vendas') {
    for (const venda of (validado as EstadoVendas).vendas) {
      for (const [tabelaFilhos, esperados] of [['itens_venda', venda.itens], ['pagamentos_venda', venda.pagamentos]] as const) {
        const filhos = await tx.getAllAsync<{ id: string; posicao: number; payload_json: string }>(
          `SELECT id, posicao, payload_json FROM ${tabelaFilhos} WHERE conta_id = ? AND loja_id = ? AND venda_id = ? ORDER BY posicao`, p.contaId, p.lojaId, venda.id,
        );
        let conferem = filhos.length === esperados.length;
        try {
          conferem = conferem && filhos.every((f, i) => f.posicao === i && f.id === esperados[i]?.id && iguais(JSON.parse(f.payload_json), esperados[i]));
        } catch { conferem = false; }
        if (!conferem) throw new Error('Migração ou leitura com itens/pagamentos divergentes. Preserve a origem e o banco para recuperação.');
      }
    }
  }
  return validado;
}

/** Substitui o agregado dentro da transação do chamador, preservando a API dos repositórios. */
export async function escreverFinanceiro(tx: SqlExecutor, chave: ChaveFinanceira, valor: unknown, p: ParticaoLocal, remoto = false): Promise<void> {
  const dados = validarFinanceiro(chave, valor, p);
  const entidades: (Produto | Caixa | Venda)[] = Array.isArray(dados) ? dados : dados.vendas;
  const anteriores = chave === 'vendas' ? (await lerFinanceiro(tx, 'vendas', p) as EstadoVendas).vendas : [];
  if (chave === 'caixas' && !remoto) {
    const antigos = await lerFinanceiro(tx, 'caixas', p) as Caixa[];
    if (antigos.some((c) => c.fechamento && !(entidades as Caixa[]).some((e) => e.id === c.id))) throw new Error('Caixa fechado não pode ser removido.');
    for (const caixa of entidades as Caixa[]) {
      const anterior = antigos.find((c) => c.id === caixa.id);
      if (anterior?.fechamento && !iguais(anterior, caixa)) throw new Error('Caixa fechado é imutável.');
    }
    const fechando = (entidades as Caixa[]).filter((c) => c.fechamento && antigos.some((a) => a.id === c.id && !a.fechamento));
    if (fechando.length) {
      const vendas = (await lerFinanceiro(tx, 'vendas', p) as EstadoVendas).vendas;
      for (const caixa of fechando) {
        const anterior = antigos.find((c) => c.id === caixa.id)!;
        if (!iguais({ ...caixa, fechamento: null }, anterior)) throw new Error('Dados do caixa mudaram. Atualize antes de fechar.');
        if (caixa.fechamento!.esperadoCentavos !== esperadoNaGaveta(caixa, vendas)) throw new Error('Vendas do caixa mudaram. Atualize os dados antes de fechar.');
      }
      const rascunhos = await tx.getAllAsync<{ payload_json: string }>('SELECT payload_json FROM rascunhos WHERE conta_id = ? AND loja_id = ?', p.contaId, p.lojaId);
      for (const linha of rascunhos) {
        let r: { caixaId?: unknown; estado?: { concluidaId?: unknown; itens?: unknown[]; parcelas?: unknown[] } };
        try { r = JSON.parse(linha.payload_json); } catch { throw new Error('Checkout inválido. Preserve o banco para recuperação.'); }
        if (!r.estado || !Array.isArray(r.estado.itens) || !Array.isArray(r.estado.parcelas)) throw new Error('Checkout inválido. Preserve o banco para recuperação.');
        if (fechando.some((c) => c.id === r.caixaId) && !r.estado.concluidaId && (r.estado.itens.length || r.estado.parcelas.length)) throw new Error('Conclua a venda em andamento antes de fechar o caixa.');
      }
    }
  }
  if (chave === 'vendas') {
    await tx.runAsync('DELETE FROM vendas WHERE conta_id = ? AND loja_id = ?', p.contaId, p.lojaId);
  }
  for (const entidade of entidades) {
    if (chave === 'vendas') {
      const venda = entidade as Venda;
      const anterior = anteriores.find((v) => v.id === venda.id);
      if (!remoto && anterior && (anterior.caixaId ?? null) !== (venda.caixaId ?? null)) throw new Error('Vínculo da venda não pode ser alterado.');
      if (!remoto && anterior?.cancelamento && !iguais(anterior.cancelamento, venda.cancelamento)) throw new Error('Cancelamento da venda é imutável.');
      const caixaId = venda.caixaId ?? null;
      await tx.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', p.contaId, p.lojaId, venda.id, caixaId, JSON.stringify(venda));
      for (const [tabela, filhos] of [['itens_venda', venda.itens], ['pagamentos_venda', venda.pagamentos]] as const) {
        for (const [posicao, filho] of filhos.entries()) {
          await tx.runAsync(`INSERT INTO ${tabela} VALUES (?, ?, ?, ?, ?, ?)`, p.contaId, p.lojaId, venda.id, filho.id, posicao, JSON.stringify(filho));
        }
      }
      if (!remoto && venda.cancelamento && !anterior?.cancelamento) {
        const mutacao = MutacaoSchema.parse({ id: venda.cancelamento.id, criadaEm: venda.cancelamento.em, entidade: 'venda', operacao: 'upsert', dados: venda });
        await tx.runAsync('INSERT INTO outbox (conta_id, loja_id, id, payload_json) VALUES (?, ?, ?, ?)', p.contaId, p.lojaId, mutacao.id, JSON.stringify(mutacao));
      }
    } else {
      await tx.runAsync(`INSERT INTO ${chave} VALUES (?, ?, ?, ?) ON CONFLICT(conta_id, loja_id, id) DO UPDATE SET payload_json = excluded.payload_json`,
        p.contaId, p.lojaId, entidade.id, JSON.stringify(entidade));
    }
  }
  if (chave !== 'vendas') {
    const existentes = await tx.getAllAsync<{ id: string }>(`SELECT id FROM ${chave} WHERE conta_id = ? AND loja_id = ?`, p.contaId, p.lojaId);
    const manter = new Set(entidades.map((e) => e.id));
    for (const { id } of existentes) {
      if (!manter.has(id)) await tx.runAsync(`DELETE FROM ${chave} WHERE conta_id = ? AND loja_id = ? AND id = ?`, p.contaId, p.lojaId, id);
    }
  } else {
    await tx.runAsync('INSERT INTO estado_local VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor_json = excluded.valor_json',
      chaveNumeroBase(p), JSON.stringify((dados as EstadoVendas).numeroBase));
  }
}
