import { z } from 'zod';
import type { Armazenamento } from './armazenamento';
import type { IdentidadeLocal } from './estadoConta';

export const PRAZO_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;
const schema = z.object({ validadaEm: z.number().int(), observadaEm: z.number().int() });
type Autorizacao = z.infer<typeof schema>;
const chave = (i: IdentidadeLocal) => `acesso-offline:${JSON.stringify([i.contaId, i.lojaId, i.operadorId, i.aparelhoId])}`;

/** Uma retomada local nunca renova o prazo. Retrocesso do relógio exige conexão. */
export class AcessoOffline {
  private autorizacoes = new Map<string, Autorizacao | null>();
  constructor(private readonly base: Armazenamento, private readonly agora: () => Date) {}

  async carregar(i: IdentidadeLocal): Promise<void> {
    const salvo = await this.base.obter(chave(i));
    this.autorizacoes.set(chave(i), salvo === null ? null : schema.parse(salvo));
  }

  async confirmar(i: IdentidadeLocal): Promise<void> {
    const em = this.agora().getTime();
    const a = { validadaEm: em, observadaEm: em };
    await this.base.gravar(chave(i), a);
    this.autorizacoes.set(chave(i), a);
  }

  limite(i: IdentidadeLocal): string | null {
    const a = this.autorizacoes.get(chave(i));
    return a ? new Date(a.validadaEm + PRAZO_OFFLINE_MS).toISOString() : null;
  }

  permitido(i: IdentidadeLocal): boolean {
    const a = this.autorizacoes.get(chave(i));
    const em = this.agora().getTime();
    return !!a && em >= a.observadaEm && em >= a.validadaEm && em < a.validadaEm + PRAZO_OFFLINE_MS;
  }

  async observar(i: IdentidadeLocal): Promise<void> {
    await this.carregar(i);
    if (!this.permitido(i)) throw new Error('Conecte-se para revalidar este perfil. O prazo offline é de sete dias; os registros foram preservados.');
    const a = { ...this.autorizacoes.get(chave(i))!, observadaEm: this.agora().getTime() };
    await this.base.gravar(chave(i), a);
    this.autorizacoes.set(chave(i), a);
  }
}
