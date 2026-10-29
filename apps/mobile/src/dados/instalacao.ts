import { z } from 'zod';
import type { Armazenamento } from './armazenamento';

const idSchema = z.uuid();
const instalacaoSchema = z.object({ aparelhoId: idSchema });

/** Identidade pública da instalação, compartilhada entre contas e sessões. */
export class InstalacaoRepo {
  private pendente: Promise<string> | null = null;

  constructor(private readonly armazenamento: Armazenamento, private readonly novoId: () => string) {}

  obterOuCriar(aparelhoLegado?: string): Promise<string> {
    if (this.pendente) return this.pendente;
    const operacao = this.obterOuCriarInterno(aparelhoLegado);
    this.pendente = operacao;
    void operacao.then(() => { this.pendente = null; }, () => { this.pendente = null; });
    return operacao;
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
