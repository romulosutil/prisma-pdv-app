import { z } from 'zod';
import type { Armazenamento } from './armazenamento';

const idSchema = z.uuid();
const instalacaoSchema = z.object({ aparelhoId: idSchema });
const emailSchema = z.email();
const mapaSchema = z.object({ versao: z.literal(1), aparelhos: z.record(z.string(), idSchema) }).strict().refine(({ aparelhos }) => {
  const entradas = Object.entries(aparelhos);
  return entradas.every(([email]) => email === email.trim().toLowerCase() && emailSchema.safeParse(email).success) &&
    new Set(entradas.map(([, id]) => id)).size === entradas.length;
});

/** Identidade pública da instalação, compartilhada entre contas e sessões. */
export class InstalacaoRepo {
  private fila: Promise<unknown> = Promise.resolve();

  constructor(private readonly armazenamento: Armazenamento, private readonly novoId: () => string) {}

  obterOuCriar(aparelhoLegado?: string): Promise<string> {
    return this.enfileirar(() => this.obterOuCriarInterno(aparelhoLegado));
  }

  private enfileirar<T>(acao: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(acao, acao);
    this.fila = resultado.catch(() => undefined);
    return resultado;
  }

  aparelhoDaConta(email: string, legado?: { email: string; aparelhoId: string }): Promise<string> {
    return this.enfileirar(async () => {
      const normalizado = email.trim().toLowerCase();
      if (!emailSchema.safeParse(normalizado).success) throw new Error('E-mail da conta inválido.');
      const bruto = await this.armazenamento.obter<unknown>('instalacao_aparelhos');
      const resultado = mapaSchema.safeParse(bruto ?? { versao: 1, aparelhos: {} });
      if (!resultado.success) throw new Error('Vínculos de aparelho inválidos. Preserve os dados para recuperação.');
      const aparelhos = { ...resultado.data.aparelhos };
      if (!Object.keys(aparelhos).length && legado) {
        const dono = legado.email.trim().toLowerCase();
        if (!emailSchema.safeParse(dono).success || !idSchema.safeParse(legado.aparelhoId).success) throw new Error('Vínculo legado inválido. Preserve os dados para recuperação.');
        aparelhos[dono] = legado.aparelhoId;
      }
      let aparelhoId = aparelhos[normalizado];
      if (!aparelhoId) {
        aparelhoId = Object.keys(aparelhos).length ? this.novoId() : await this.obterOuCriarInterno(legado?.aparelhoId);
        if (!idSchema.safeParse(aparelhoId).success || Object.values(aparelhos).includes(aparelhoId)) throw new Error('Identidade de aparelho inválida. Preserve os dados para recuperação.');
        aparelhos[normalizado] = aparelhoId;
      }
      // Também preserva a identidade global quando o primeiro vínculo vem do legado.
      await this.obterOuCriarInterno(legado?.aparelhoId ?? aparelhoId);
      await this.armazenamento.gravar('instalacao_aparelhos', { versao: 1, aparelhos });
      return aparelhoId;
    });
  }

  private async obterOuCriarInterno(aparelhoLegado?: string): Promise<string> {
    const salvo = await this.armazenamento.obter<unknown>('instalacao');
    if (salvo !== null) {
      const resultado = instalacaoSchema.safeParse(salvo);
      if (!resultado.success) throw new Error('Identidade da instalação inválida. Preserve os dados para recuperação.');
      return resultado.data.aparelhoId;
    }
    const aparelhoId = aparelhoLegado ?? this.novoId();
    if (!idSchema.safeParse(aparelhoId).success) throw new Error('Identidade da instalação inválida. Preserve os dados para recuperação.');
    await this.armazenamento.gravar('instalacao', { aparelhoId });
    return aparelhoId;
  }
}
