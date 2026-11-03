import { SolicitarSuporteSchema, VERSAO_POLITICAS, type Sessao, type SolicitarSuporte } from '@pdv/shared';
import type { Armazenamento } from '@/dados/armazenamento';
import { ErroBackend, type Backend } from './backend';

export const CHAVE_SUPORTE_PENDENTE = 'suporte_pendente';
/** Persistência por perfil antes do HTTP. Resposta perdida conserva a mesma chave de idempotência. */
export class SuporteServico {
  private voo: Promise<unknown> | null = null;
  constructor(private readonly backend: Backend, private readonly armazenamento: Armazenamento, private readonly sessao: () => Sessao | null, private readonly novoId: () => string) {}
  private contexto() {
    const sessao = this.sessao();
    if (!sessao || this.backend.modo !== 'http') throw new ErroBackend('conflito', 'Entre na conta conectada para solicitar atendimento.');
    return { token: sessao.token, identidade: JSON.stringify([sessao.contaId, sessao.lojaId, sessao.operadorId, sessao.aparelhoId]), escopo: this.armazenamento.obterEscopo?.() };
  }
  private conferir(c: ReturnType<SuporteServico['contexto']>) {
    const atual = this.contexto();
    if (c.token !== atual.token || c.identidade !== atual.identidade || c.escopo !== atual.escopo) throw new ErroBackend('conflito', 'O perfil mudou. Abra o atendimento novamente neste perfil.');
  }
  async pendente() { return this.armazenamento.obter<SolicitarSuporte>(CHAVE_SUPORTE_PENDENTE); }
  enviar(dados?: Pick<SolicitarSuporte, 'tipo' | 'mensagem' | 'diagnostico'>): Promise<unknown> {
    if (this.voo) return this.voo;
    const voo = this.executar(dados).finally(() => { if (this.voo === voo) this.voo = null; });
    this.voo = voo;
    return voo;
  }
  private async executar(dados?: Pick<SolicitarSuporte, 'tipo' | 'mensagem' | 'diagnostico'>) {
    const c = this.contexto();
    const anterior = await this.pendente(); this.conferir(c);
    if (!anterior && !dados) return;
    if (anterior && dados) throw new ErroBackend('conflito', 'Confirme a solicitação pendente antes de criar outra.');
    const req = SolicitarSuporteSchema.parse(anterior ?? { ...dados, id: this.novoId(), versaoPoliticas: VERSAO_POLITICAS });
    if (!anterior) { await this.armazenamento.gravar(CHAVE_SUPORTE_PENDENTE, req); this.conferir(c); }
    if (!this.backend.solicitarSuporte) throw new ErroBackend('conflito', 'Atendimento indisponível nesta versão do servidor. Preserve a solicitação e tente após a atualização.');
    const resposta = await this.backend.solicitarSuporte(req, c.token); this.conferir(c);
    if (resposta.id !== req.id) throw new ErroBackend('resposta_invalida', 'Protocolo divergente.');
    await this.armazenamento.remover(CHAVE_SUPORTE_PENDENTE); this.conferir(c);
    return resposta;
  }
}
