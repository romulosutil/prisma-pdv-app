import { SessaoSchema } from '@pdv/shared';
import type { Armazenamento } from '../armazenamento';
import type { BancoSqlite, SqlExecutor } from './driver';
import { ehFinanceira, escreverFinanceiro, lerFinanceiro, validarFinanceiro, type ChaveFinanceira, type ParticaoLocal } from './financeiro';
import { inicializarSchema } from './schema';

const CHAVES = ['produtos', 'caixas', 'vendas'] as const;
const PROPRIETARIO_LEGADO = 'proprietario_legado_v1';
const ERRO_MIGRACAO = 'Migração local não validada. Os dados de origem foram preservados para recuperação.';

/** SQLite para agregados financeiros; configuração/sessão legadas serão tratadas em P0-03. */
export class ArmazenamentoSqlite implements Armazenamento {
  private banco: Promise<BancoSqlite> | null = null;
  private fila: Promise<void> = Promise.resolve();

  constructor(private readonly abrir: () => Promise<BancoSqlite>, private readonly legado: Armazenamento) {}

  private enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(tarefa);
    this.fila = resultado.then(() => undefined, () => undefined);
    return resultado;
  }

  private async db(): Promise<BancoSqlite> {
    if (!this.banco) {
      this.banco = this.abrir().then(async (db) => { await inicializarSchema(db); return db; });
      this.banco.catch(() => { this.banco = null; });
    }
    return this.banco;
  }

  private async particao(): Promise<ParticaoLocal | null> {
    const conta = await this.legado.obter<{ sessao?: unknown }>('conta');
    if (!conta?.sessao) return null;
    const sessao = SessaoSchema.safeParse(conta.sessao);
    if (!sessao.success) throw new Error('Identidade local inválida. Recupere o acesso sem apagar os dados.');
    return { contaId: sessao.data.contaId, lojaId: sessao.data.lojaId };
  }

  private async migrar(db: BancoSqlite, p: ParticaoLocal): Promise<void> {
    const marcador = await db.getFirstAsync('SELECT chave FROM migracoes_legado WHERE conta_id = ? AND loja_id = ? AND chave = ?', p.contaId, p.lojaId, 'financeiro_v1');
    if (marcador) return;
    const proprietario = await db.getFirstAsync<{ valor_json: string }>('SELECT valor_json FROM estado_local WHERE chave = ?', PROPRIETARIO_LEGADO);
    // Os mesmos dados de origem nunca são importados para uma segunda conta.
    const importar = !proprietario || proprietario.valor_json === JSON.stringify(p);
    const valores = importar ? await Promise.all(CHAVES.map((chave) => this.legado.obter(chave))) : [null, null, null];
    const entrada = Object.fromEntries(CHAVES.map((chave, i) => [chave, validarFinanceiro(chave, valores[i] ?? (chave === 'vendas' ? { vendas: [], numeroBase: 0 } : []), p)]));
    await db.withExclusiveTransactionAsync(async (tx) => {
      // Não sobrescrever destino sem marcador: pode ser um banco recuperado.
      for (const chave of CHAVES) {
        const existente = await tx.getFirstAsync(`SELECT id FROM ${chave} WHERE conta_id = ? AND loja_id = ? LIMIT 1`, p.contaId, p.lojaId);
        if (existente) throw new Error(ERRO_MIGRACAO);
      }
      for (const chave of ['produtos', 'caixas', 'vendas'] as const) await escreverFinanceiro(tx, chave, entrada[chave], p);
      for (const chave of CHAVES) {
        const destino = await lerFinanceiro(tx, chave, p);
        // Verifica payload completo, incluindo contagens, valores, IDs e vínculos.
        if (JSON.stringify(destino) !== JSON.stringify(entrada[chave])) throw new Error(ERRO_MIGRACAO);
      }
      // Guardar somente contagens/totais no marcador, nunca o conteúdo financeiro completo.
      const vendas = entrada.vendas as { vendas: { totalCentavos: number }[]; numeroBase: number };
      await tx.runAsync('INSERT INTO migracoes_legado VALUES (?, ?, ?, ?)', p.contaId, p.lojaId, 'financeiro_v1', JSON.stringify({
        produtos: (entrada.produtos as unknown[]).length, caixas: (entrada.caixas as unknown[]).length,
        vendas: vendas.vendas.length, totalCentavos: vendas.vendas.reduce((s, v) => s + v.totalCentavos, 0), numeroBase: vendas.numeroBase,
      }));
      if (!proprietario) await tx.runAsync('INSERT INTO estado_local VALUES (?, ?)', PROPRIETARIO_LEGADO, JSON.stringify(p));
    });
  }

  async obter<T>(chave: string): Promise<T | null> {
    if (!ehFinanceira(chave)) return this.legado.obter<T>(chave);
    return this.enfileirar(async () => {
      const p = await this.particao();
      if (!p) {
        // Conta ausente nunca autoriza recuperar o legado em outra identidade.
        if ((await Promise.all(CHAVES.map((c) => this.legado.obter(c)))).some((v) => v !== null)) {
          throw new Error('Há dados locais sem conta identificada. Preserve a origem para recuperação.');
        }
        return null;
      }
      const db = await this.db();
      await this.migrar(db, p);
      return await lerFinanceiro(db, chave, p) as T;
    });
  }

  async gravar<T>(chave: string, valor: T): Promise<void> {
    if (!ehFinanceira(chave)) return this.legado.gravar(chave, valor);
    await this.transacao(async (tx, p) => escreverFinanceiro(tx, chave, valor, p));
  }

  /** Operações compostas (checkout/outbox) usam o mesmo commit SQLite, sem transações aninhadas. */
  async transacao(tarefa: (tx: SqlExecutor, particao: ParticaoLocal) => Promise<void>): Promise<void> {
    await this.enfileirar(async () => {
      const p = await this.particao();
      if (!p) throw new Error('Entre na sua conta antes de gravar dados da loja.');
      const db = await this.db();
      await this.migrar(db, p);
      await db.withExclusiveTransactionAsync((tx) => tarefa(tx, p));
    });
  }

  async remover(chave: string): Promise<void> {
    if (!ehFinanceira(chave)) return this.legado.remover(chave);
    const vazios: Record<ChaveFinanceira, unknown> = { produtos: [], caixas: [], vendas: { vendas: [], numeroBase: 0 } };
    await this.gravar(chave, vazios[chave]);
  }

  async limpar(): Promise<void> {
    await this.enfileirar(async () => {
      const db = await this.db();
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const tabela of ['itens_venda', 'pagamentos_venda', 'vendas', 'caixas', 'produtos', 'rascunhos', 'outbox', 'migracoes_legado', 'estado_local']) await tx.execAsync(`DELETE FROM ${tabela}`);
      });
      await this.legado.limpar();
    });
  }
}
