import type { Armazenamento } from '@/dados/armazenamento';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { sanitizar, sanitizarTexto } from './sanitizar';

/**
 * Registro de diagnóstico da versão de testes: buffer circular em memória (500 eventos), espelhado no
 * armazenamento com debounce para sobreviver a um travamento. Com `FERRAMENTAS_TESTE` falso, TODAS as
 * funções daqui são no-op (nada é gravado, lido ou instalado). Sem dependências de React Native.
 */

export type CategoriaDiagnostico = 'erro' | 'aviso' | 'navegacao' | 'camera' | 'leitura' | 'produto' | 'venda' | 'pagamento' | 'assinatura' | 'app';

export interface EventoDiagnostico {
  /** ISO 8601. */
  t: string;
  cat: CategoriaDiagnostico;
  msg: string;
  dados?: unknown;
}

export interface DiagnosticoJson {
  geradoEm: string;
  app: { versao: string; versionCode: number | null; ferramentasTeste: boolean; modo: 'demo' | 'api' | null };
  aparelho: { marca: string | null; modelo: string | null; so: string; versaoSo: string | null };
  estado: {
    rotaAtual: string | null;
    plano: string | null;
    statusAssinatura: string | null;
    produtos: number | null;
    vendasHoje: number | null;
  };
  eventos: EventoDiagnostico[];
}

export type ContextoDiagnostico = Omit<DiagnosticoJson, 'geradoEm' | 'eventos'>;

export const LIMITE_EVENTOS = 500;
export const ATRASO_GRAVACAO_MS = 1000;
export const CHAVE_DIAGNOSTICO = 'diagnostico';

const CONTEXTO_VAZIO: ContextoDiagnostico = {
  app: { versao: 'desconhecida', versionCode: null, ferramentasTeste: false, modo: null },
  aparelho: { marca: null, modelo: null, so: 'desconhecido', versaoSo: null },
  estado: { rotaAtual: null, plano: null, statusAssinatura: null, produtos: null, vendasHoje: null },
};

let eventos: EventoDiagnostico[] = [];
let armazenamento: Armazenamento | null = null;
let fonteDeContexto: (() => ContextoDiagnostico) | null = null;
let rotaAtual: string | null = null;
let temporizador: ReturnType<typeof setTimeout> | null = null;
let sujo = false;
let emRegistro = false;
const ouvintes = new Set<() => void>();

const notificar = () => ouvintes.forEach((ouvinte) => ouvinte());

/** Liga a persistência e recupera os eventos da(s) abertura(s) anterior(es), que ficam antes dos desta. */
export async function iniciarRegistro(destino: Armazenamento): Promise<void> {
  if (!FERRAMENTAS_TESTE) return;
  armazenamento = destino;
  try {
    const salvos = await destino.obter<EventoDiagnostico[]>(CHAVE_DIAGNOSTICO);
    if (Array.isArray(salvos)) eventos = [...salvos, ...eventos].slice(-LIMITE_EVENTOS);
  } catch {
    // Diagnóstico nunca pode atrapalhar o app.
  }
  if (eventos.length > 0) agendarGravacao();
  notificar();
}

/** Como o contexto (versão, aparelho, contagens) é montado na exportação. */
export function definirFonteDeContexto(fonte: () => ContextoDiagnostico): void {
  if (!FERRAMENTAS_TESTE) return;
  fonteDeContexto = fonte;
}

export function definirRotaAtual(rota: string): void {
  if (!FERRAMENTAS_TESTE) return;
  rotaAtual = rota;
}

/** Nunca lança e nunca escreve no console (o console é capturado por aqui). Dados e mensagem passam por `sanitizar`. */
export function registrar(cat: CategoriaDiagnostico, mensagem: string, dados?: unknown): void {
  if (!FERRAMENTAS_TESTE || emRegistro) return;
  emRegistro = true;
  try {
    const evento: EventoDiagnostico = { t: new Date().toISOString(), cat, msg: sanitizarTexto(String(mensagem).slice(0, 600)) };
    if (dados !== undefined) {
      const limpo = sanitizar(dados);
      if (limpo !== undefined) evento.dados = limpo;
    }
    eventos.push(evento);
    if (eventos.length > LIMITE_EVENTOS) eventos.splice(0, eventos.length - LIMITE_EVENTOS);
    agendarGravacao();
  } catch {
    // Ignora: um evento perdido é melhor que um app quebrado.
  } finally {
    emRegistro = false;
  }
}

function agendarGravacao(): void {
  sujo = true;
  if (temporizador || !armazenamento) return;
  temporizador = setTimeout(() => {
    temporizador = null;
    void salvarAgora();
  }, ATRASO_GRAVACAO_MS);
}

/** Grava já (ao ir para segundo plano ou antes de um erro fatal). */
export async function salvarAgora(): Promise<void> {
  if (!FERRAMENTAS_TESTE || !armazenamento) return;
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  if (!sujo) return;
  sujo = false;
  try {
    await armazenamento.gravar(CHAVE_DIAGNOSTICO, eventos);
  } catch {
    sujo = true;
  }
  notificar();
}

export function quantidadeDeEventos(): number {
  return FERRAMENTAS_TESTE ? eventos.length : 0;
}

export function assinarRegistro(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Monta o JSON a colar na conversa. Desligado: estrutura vazia, `app.ferramentasTeste: false` e nenhum evento. */
export async function exportar(): Promise<DiagnosticoJson> {
  const geradoEm = new Date().toISOString();
  if (!FERRAMENTAS_TESTE) return { geradoEm, ...CONTEXTO_VAZIO, eventos: [] };
  let contexto = CONTEXTO_VAZIO;
  try {
    contexto = fonteDeContexto ? fonteDeContexto() : CONTEXTO_VAZIO;
  } catch {
    // Exporta mesmo assim, só com os eventos.
  }
  const estado = { ...contexto.estado, rotaAtual: contexto.estado.rotaAtual ?? rotaAtual };
  return { geradoEm, app: { ...contexto.app, ferramentasTeste: true }, aparelho: contexto.aparelho, estado, eventos: [...eventos] };
}

/** Apaga os eventos da memória e do armazenamento. */
export async function limpar(): Promise<void> {
  if (!FERRAMENTAS_TESTE) return;
  eventos = [];
  sujo = false;
  if (temporizador) {
    clearTimeout(temporizador);
    temporizador = null;
  }
  try {
    await armazenamento?.remover(CHAVE_DIAGNOSTICO);
  } catch {
    // Já está vazio em memória.
  }
  notificar();
}

/** `diagnostico-20261024-1530.json` (hora local). */
export function nomeDoArquivo(quando: Date = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  const data = `${quando.getFullYear()}${dois(quando.getMonth() + 1)}${dois(quando.getDate())}`;
  return `diagnostico-${data}-${dois(quando.getHours())}${dois(quando.getMinutes())}.json`;
}
