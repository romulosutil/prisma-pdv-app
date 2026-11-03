import { z } from 'zod';
import type { Armazenamento } from '@/dados/armazenamento';

const rotas = ['/', '/boas-vindas', '/criar-conta', '/loja', '/entrar', '/planos', '/cartao', '/teste-iniciado', '/pagamentos', '/camera', '/bloqueio', '/suporte', '/diagnostico', '/produtos', '/produtos/scanner', '/produtos/buscando', '/produtos/novo', '/produtos/rapido', '/produtos/atalhos', '/produtos/:id', '/caixa', '/caixa/abrir', '/caixa/fechar', '/caixa/movimento', '/caixa/sync', '/caixa/turnos', '/caixa/vendas', '/caixa/venda/:id', '/vender', '/pagar', '/ajustes', '/ajustes/assinatura', '/gestao', 'outra'] as const;
const endpoints = ['/contas', '/conta', '/auth/codigo', '/auth/vinculos', '/auth/login', '/auth/logout', '/auth/recuperacao', '/auth/recuperacao/confirmar', '/planos', '/assinatura', '/sync/push', '/sync/pull', '/caixas', '/caixas/reservar', '/catalogo/ean', '/suporte/solicitacoes', '/suporte/exportacao', 'outro'] as const;
const acoes = ['Continuar', 'Entrar', 'Enviar código', 'Criar conta', 'Abrir caixa', 'Fechar caixa', 'Vender', 'Salvar produto', 'Salvar e bipar próximo', 'Preencher manualmente', 'Sincronizar agora', 'Concluir venda', 'Confirmar', 'outra'] as const;

export function rotaSegura(rota: string): typeof rotas[number] {
  const semQuery = rota.split(/[?#]/)[0]!;
  if ((rotas as readonly string[]).includes(semQuery)) return semQuery as typeof rotas[number];
  if (/^\/produtos\/[0-9a-f-]{36}$/i.test(semQuery)) return '/produtos/:id';
  if (/^\/caixa\/venda\/[0-9a-f-]{36}$/i.test(semQuery)) return '/caixa/venda/:id';
  if (semQuery.startsWith('/pagar/')) return '/pagar';
  if (semQuery.startsWith('/vender/')) return '/vender';
  if (semQuery.startsWith('/gestao/')) return '/gestao';
  return 'outra';
}
export function endpointSeguro(caminho: string): typeof endpoints[number] {
  const base = caminho.split('?')[0]!;
  if (base.startsWith('/catalogo/ean/')) return '/catalogo/ean';
  return (endpoints as readonly string[]).includes(base) ? base as typeof endpoints[number] : 'outro';
}
export function acaoSegura(rotulo: string): typeof acoes[number] { return (acoes as readonly string[]).includes(rotulo) ? rotulo as typeof acoes[number] : 'outra'; }

const contador = z.number().int().min(0).max(1_000_000);
export const CamposEventoSchema = z.object({
  rota: z.enum(rotas).optional(), acao: z.enum(acoes).optional(), endpoint: z.enum(endpoints).optional(),
  metodo: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(), status: z.number().int().min(0).max(599).optional(), ms: contador.optional(),
  pendentes: contador.optional(), rejeitadas: contador.optional(), achou: z.boolean().optional(), bloqueado: z.boolean().optional(), segundoPlano: z.boolean().optional(),
  etapa: z.enum(['inicio', 'pronto', 'falha', 'sem_sessao', 'cache', 'api', 'invalido', 'timeout', 'rede', 'ausente', 'resposta_invalida', 'active', 'inactive', 'background', 'desconhecido']).optional(),
  situacao: z.enum(['local', 'sem_sessao', 'ocioso', 'sincronizando', 'offline', 'reautenticacao', 'falha']).optional(),
  erro: z.enum(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'erro_js', 'console_error', 'console_warn', 'promessa']).optional(),
  // Somente posições numéricas do bundle. Mensagens e nomes de arquivos/funções não entram.
  posicoes: z.array(z.string().regex(/^\d{1,8}:\d{1,8}$/)).max(8).optional(),
});
export type CamposEvento = z.infer<typeof CamposEventoSchema>;
const tipos = ['app', 'navegacao', 'acao', 'http', 'catalogo', 'sincronizacao', 'transicao', 'erro', 'aviso_interface'] as const;
export type TipoEvento = typeof tipos[number];
const EventoSchema = z.object({ em: z.iso.datetime(), execucao: z.uuid(), tipo: z.enum(tipos), campos: CamposEventoSchema, perfil: z.string().max(200).nullable() });
type Evento = z.infer<typeof EventoSchema>;
const CHAVE = 'pdv_diagnostico_homologacao_v1';
export const LIMITE_EVENTOS = 500;

/** Lista fechada de campos: nunca guarda texto digitado, mensagens, corpos HTTP, token ou CPF. */
export class RegistroPiloto {
  private eventos: Evento[] = [];
  private armazenamento: Armazenamento | null = null;
  private fontePerfil: () => string | null = () => null;
  private fila = Promise.resolve();
  private versao = 0;
  private salvo = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly execucao: string, private readonly agora: () => Date = () => new Date()) {}
  async iniciar(base: Armazenamento, perfil: () => string | null): Promise<void> {
    this.armazenamento = base; this.fontePerfil = perfil;
    try {
      const salvos = await base.obter<unknown>(CHAVE);
      const lido = z.array(EventoSchema).max(LIMITE_EVENTOS).safeParse(salvos);
      if (lido.success) this.eventos = [...lido.data, ...this.eventos].slice(-LIMITE_EVENTOS);
    } catch { /* Falha de diagnóstico não impede acesso aos dados comerciais. */ }
    await this.salvar();
  }
  registrar(tipo: TipoEvento, campos: CamposEvento = {}): void {
    try {
      const lido = CamposEventoSchema.safeParse(campos);
      if (!lido.success) return;
      this.eventos.push({ em: this.agora().toISOString(), execucao: this.execucao, tipo, campos: lido.data, perfil: this.fontePerfil() });
      this.eventos = this.eventos.slice(-LIMITE_EVENTOS); this.versao++;
      if (!this.timer) this.timer = setTimeout(() => { this.timer = null; void this.salvar(); }, 300);
    } catch { /* Nunca interromper a operação observada. */ }
  }
  async salvar(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const tarefa = this.fila.then(async () => {
      if (!this.armazenamento || this.salvo === this.versao) return;
      const versao = this.versao;
      try { await this.armazenamento.gravar(CHAVE, this.eventos); this.salvo = versao; }
      catch { /* Eventos seguem na memória para exportação; não bloqueia o PDV. */ }
    });
    this.fila = tarefa.catch(() => undefined); await this.fila;
  }
  exportar() {
    const perfil = this.fontePerfil();
    return { formato: 1, execucao: this.execucao, geradoEm: this.agora().toISOString(), limiteEventos: LIMITE_EVENTOS,
      eventos: this.eventos.filter(e => e.perfil === perfil || e.perfil === null).map(({ perfil: _perfil, ...e }) => JSON.parse(JSON.stringify(e)) as Omit<Evento, 'perfil'>),
      persistenciaPendente: this.salvo !== this.versao };
  }
}

export function camposErro(erro: unknown): CamposEvento {
  if (!(erro instanceof Error)) return { erro: 'erro_js' };
  const nome = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError'].includes(erro.name) ? erro.name as CamposEvento['erro'] : 'erro_js';
  return { erro: nome, posicoes: [...(erro.stack ?? '').split('\n').slice(1).join('\n').matchAll(/:(\d{1,8}:\d{1,8})\)?(?:\n|$)/g)].slice(0, 8).map(m => m[1]!) };
}
