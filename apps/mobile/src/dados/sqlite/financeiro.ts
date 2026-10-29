import { CaixaSchema, ProdutoSchema, VendaSchema, type Caixa, type Produto, type Venda } from '@pdv/shared';
import { z } from 'zod';
import type { EstadoVendas } from '../vendas';
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

export async function lerFinanceiro(tx: SqlExecutor, chave: ChaveFinanceira, p: ParticaoLocal): Promise<unknown> {
  const tabela = chave; // enum fechado, nunca entrada SQL livre
  const linhas = await tx.getAllAsync<{ id: string; payload_json: string }>(
    `SELECT id, payload_json FROM ${tabela} WHERE conta_id = ? AND loja_id = ? ORDER BY rowid`, p.contaId, p.lojaId,
  );
  let valor: unknown;
  try { valor = linhas.map((l) => JSON.parse(l.payload_json)); }
  catch { throw new Error(`Dados SQLite inválidos em ${chave}. Preserve o banco para recuperação.`); }
  if (chave === 'vendas') {
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
          conferem = conferem && filhos.every((f, i) => f.posicao === i && f.id === esperados[i]?.id && JSON.stringify(JSON.parse(f.payload_json)) === JSON.stringify(esperados[i]));
        } catch { conferem = false; }
        if (!conferem) throw new Error('Migração ou leitura com itens/pagamentos divergentes. Preserve a origem e o banco para recuperação.');
      }
    }
  }
  return validado;
}

/** Substitui o agregado dentro da transação do chamador, preservando a API dos repositórios. */
export async function escreverFinanceiro(tx: SqlExecutor, chave: ChaveFinanceira, valor: unknown, p: ParticaoLocal): Promise<void> {
  const dados = validarFinanceiro(chave, valor, p);
  const entidades: (Produto | Caixa | Venda)[] = Array.isArray(dados) ? dados : dados.vendas;
  if (chave === 'vendas') {
    await tx.runAsync('DELETE FROM vendas WHERE conta_id = ? AND loja_id = ?', p.contaId, p.lojaId);
  }
  for (const entidade of entidades) {
    if (chave === 'vendas') {
      const venda = entidade as Venda;
      // Legados não têm caixaId. P0-04 introduz o vínculo no contrato sem adivinhar associações.
      const caixaId = (entidade as Venda & { caixaId?: string | null }).caixaId ?? null;
      await tx.runAsync('INSERT INTO vendas VALUES (?, ?, ?, ?, ?)', p.contaId, p.lojaId, venda.id, caixaId, JSON.stringify(venda));
      for (const [tabela, filhos] of [['itens_venda', venda.itens], ['pagamentos_venda', venda.pagamentos]] as const) {
        for (const [posicao, filho] of filhos.entries()) {
          await tx.runAsync(`INSERT INTO ${tabela} VALUES (?, ?, ?, ?, ?, ?)`, p.contaId, p.lojaId, venda.id, filho.id, posicao, JSON.stringify(filho));
        }
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
