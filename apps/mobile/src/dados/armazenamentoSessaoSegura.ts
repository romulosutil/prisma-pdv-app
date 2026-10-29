import { z } from 'zod';
import type { Armazenamento } from './armazenamento';
import { IdentidadeLocalSchema, PerfilLocalSchema, normalizarEstadoConta, type EstadoConta } from './estadoConta';

export interface CofreSessao {
  obter(chave: string): Promise<string | null>;
  gravar(chave: string, valor: string): Promise<void>;
  remover(chave: string): Promise<void>;
}

const uuid = z.string().uuid();
const Metadata = z.object({
  versao: z.literal(1), identidade: IdentidadeLocalSchema.nullable(), perfil: PerfilLocalSchema.nullable(),
  referenciaCredencial: uuid.nullable(), referenciasParaExcluir: z.array(uuid),
  reautenticacaoNecessaria: z.boolean(),
}).strict().refine(m => new Set(m.referenciasParaExcluir).size === m.referenciasParaExcluir.length &&
  (!m.referenciaCredencial || (m.identidade !== null && !m.referenciasParaExcluir.includes(m.referenciaCredencial))));
type Metadata = z.infer<typeof Metadata>;
const Journal = z.array(uuid).refine(ids => new Set(ids).size === ids.length);
const CHAVE_JOURNAL = 'cofre_sessao_pendentes';
const chaveCofre = (id: string) => 'pdv-sessao-' + id;
const erro = () => new Error('Não foi possível acessar o armazenamento seguro da conta.');

export class ArmazenamentoSessaoSegura implements Armazenamento {
  private fila: Promise<unknown> = Promise.resolve();
  constructor(private base: Armazenamento, private cofre: CofreSessao, private novoId: () => string) {}

  private executar<T>(acao: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(acao, acao);
    this.fila = resultado.catch(() => undefined);
    return resultado;
  }
  private async lerJournal(): Promise<string[]> {
    try {
      const bruto = await this.base.obter<unknown>(CHAVE_JOURNAL);
      return bruto === null ? [] : Journal.parse(bruto);
    } catch { throw erro(); }
  }
  private async gravarJournal(ids: string[]): Promise<void> {
    try { await this.base.gravar(CHAVE_JOURNAL, ids); } catch { throw erro(); }
  }
  private async limparJournal(ids: string[], ativa: string | null): Promise<void> {
    const restantes: string[] = [];
    for (const id of ids) {
      if (id === ativa) continue;
      try { await this.cofre.remover(chaveCofre(id)); } catch { restantes.push(id); }
    }
    if (restantes.length !== ids.length) {
      try { await this.gravarJournal(restantes); } catch { /* journal anterior permite nova tentativa */ }
    }
  }
  private async limparPendentes(meta: Metadata): Promise<Metadata> {
    const restantes: string[] = [];
    for (const id of meta.referenciasParaExcluir) {
      try { await this.cofre.remover(chaveCofre(id)); } catch { restantes.push(id); }
    }
    if (restantes.length !== meta.referenciasParaExcluir.length) {
      const atual = { ...meta, referenciasParaExcluir: restantes };
      try { await this.base.gravar('conta', atual); return atual; } catch { return meta; }
    }
    return meta;
  }
  private async lerMeta(): Promise<Metadata | null> {
    let bruto: unknown;
    try { bruto = await this.base.obter<unknown>('conta'); } catch { throw erro(); }
    const journal = await this.lerJournal();
    if (bruto === null) { await this.limparJournal(journal, null); return null; }
    const resultado = Metadata.safeParse(bruto);
    if (resultado.success) {
      await this.limparJournal(journal, resultado.data.referenciaCredencial);
      return this.limparPendentes(resultado.data);
    }
    if (typeof bruto === 'object' && bruto !== null && 'versao' in bruto) throw erro();
    let legado: EstadoConta;
    try { legado = normalizarEstadoConta(bruto); } catch { throw erro(); }
    await this.limparJournal(journal, null);
    return this.salvar(legado, null);
  }
  private async salvar(estado: EstadoConta, anterior: Metadata | null): Promise<Metadata> {
    let referencia: string | null = null;
    if (estado.sessao) {
      try {
        const novaReferencia = uuid.parse(this.novoId());
        const journal = await this.lerJournal();
        if (novaReferencia === anterior?.referenciaCredencial || anterior?.referenciasParaExcluir.includes(novaReferencia) || journal.includes(novaReferencia)) throw erro();
        await this.gravarJournal([...journal, novaReferencia]);
        referencia = novaReferencia;
        await this.cofre.gravar(chaveCofre(referencia), estado.sessao.token);
        if (await this.cofre.obter(chaveCofre(referencia)) !== estado.sessao.token) throw erro();
      } catch {
        if (referencia) { try { await this.cofre.remover(chaveCofre(referencia)); } catch { /* preserva a origem */ } }
        throw erro();
      }
    }
    const pendentes = [...(anterior?.referenciasParaExcluir ?? [])];
    if (anterior?.referenciaCredencial) pendentes.push(anterior.referenciaCredencial);
    const meta: Metadata = { versao: 1, identidade: estado.identidade, perfil: estado.perfil,
      referenciaCredencial: referencia, referenciasParaExcluir: [...new Set(pendentes)],
      reautenticacaoNecessaria: estado.reautenticacaoNecessaria };
    // Uma falha pode ocorrer depois de a base confirmar a gravação. O journal
    // permite conferir a referência ativa antes de qualquer tentativa de exclusão.
    try { await this.base.gravar('conta', meta); } catch { throw erro(); }
    const journal = await this.lerJournal().catch(() => []);
    await this.limparJournal(journal, referencia);
    return this.limparPendentes(meta);
  }
  async obter<T>(chave: string): Promise<T | null> {
    if (chave !== 'conta') return this.base.obter<T>(chave);
    return this.executar(async () => {
      const meta = await this.lerMeta();
      if (!meta) return null;
      let token: string | null = null;
      if (meta.referenciaCredencial) {
        try { token = await this.cofre.obter(chaveCofre(meta.referenciaCredencial)); } catch { throw erro(); }
      }
      const valido = typeof token === 'string' && token.length > 0;
      const estado: EstadoConta = {
        sessao: valido && meta.identidade && token !== null ? { ...meta.identidade, token } : null,
        identidade: meta.identidade, perfil: meta.perfil,
        reautenticacaoNecessaria: meta.identidade !== null && !valido ? true : meta.reautenticacaoNecessaria,
      };
      try { return normalizarEstadoConta(estado) as T; } catch { throw erro(); }
    });
  }
  async gravar<T>(chave: string, valor: T): Promise<void> {
    if (chave !== 'conta') return this.base.gravar(chave, valor);
    return this.executar(async () => {
      let estado: EstadoConta;
      try { estado = normalizarEstadoConta(valor); } catch { throw erro(); }
      const anterior = await this.lerMeta();
      await this.salvar(estado, anterior);
    });
  }
  async remover(chave: string): Promise<void> {
    if (chave !== 'conta') return this.base.remover(chave);
    return this.executar(async () => {
      const meta = await this.lerMeta();
      if (!meta) return;
      const pendentes = [...new Set([...meta.referenciasParaExcluir, ...(meta.referenciaCredencial ? [meta.referenciaCredencial] : [])])];
      const vazio: Metadata = { versao: 1, identidade: null, perfil: null, referenciaCredencial: null, referenciasParaExcluir: pendentes, reautenticacaoNecessaria: false };
      try { await this.base.gravar('conta', vazio); } catch { throw erro(); }
      const limpo = await this.limparPendentes(vazio);
      if (!limpo.referenciasParaExcluir.length) {
        try { await this.base.remover('conta'); } catch { throw erro(); }
      }
    });
  }
  async limpar(): Promise<void> {
    return this.executar(async () => {
      let bruto: unknown;
      try { bruto = await this.base.obter<unknown>('conta'); } catch { throw erro(); }
      const journal = await this.lerJournal();
      let meta: Metadata | null = null;
      if (bruto !== null) {
        const resultado = Metadata.safeParse(bruto);
        if (resultado.success) meta = resultado.data;
        else if (typeof bruto === 'object' && bruto !== null && 'versao' in bruto) throw erro();
        else { try { normalizarEstadoConta(bruto); } catch { throw erro(); } }
      }
      const ids = [...new Set([...journal, ...(meta?.referenciasParaExcluir ?? []), ...(meta?.referenciaCredencial ? [meta.referenciaCredencial] : [])])];
      try { await this.base.limpar(); } catch { throw erro(); }
      const restantes: string[] = [];
      for (const id of ids) { try { await this.cofre.remover(chaveCofre(id)); } catch { restantes.push(id); } }
      if (restantes.length) { await this.gravarJournal(restantes); }
    });
  }
}
