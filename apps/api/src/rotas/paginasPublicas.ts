import type { FastifyInstance, FastifyReply } from 'fastify';
import { EMAIL_CONTATO, POLITICAS_PILOTO, VERSAO_POLITICAS } from '@pdv/shared';

type Titulo = (typeof POLITICAS_PILOTO)[number]['titulo'];
const html = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const secao = (titulo: Titulo) => `<h2>${html(titulo)}</h2><p>${html(POLITICAS_PILOTO.find(p => p.titulo === titulo)!.texto)}</p>`;
const paragrafo = (texto: string) => `<p>${html(texto)}</p>`;
const contato = `<p>Contato: <a href="mailto:${html(EMAIL_CONTATO)}">${html(EMAIL_CONTATO)}</a></p>`;

/** HTML estático, sem JS nem recursos externos: serve de URL pública para políticas e exclusão de conta. */
const pagina = (titulo: string, corpo: string) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(titulo)} - Prisma PDV</title><style>:root{color-scheme:light dark;--bg:#F4F2EE;--card:#FFFFFF;--ink:#14112B;--ink2:#4A4760;--ink3:#5C5973;--line:#E4E1EA;--accent:#1D3AC8;--mark:#F5A623}body{font:16px/1.6 system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);margin:0;padding:1.5rem 1rem}main{max-width:42rem;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:1.75rem 1.5rem}h1{font-size:1.5rem;margin:0 0 .25rem;display:flex;align-items:center;gap:.5rem}h1::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--mark);display:inline-block}h2{font-size:1.15rem;margin-top:1.5rem;color:var(--ink)}p{color:var(--ink2)}a{color:var(--accent)}small{color:var(--ink3)}@media(prefers-color-scheme:dark){:root{--bg:#0F0E17;--card:#191826;--ink:#F4F3FA;--ink2:#C9C7D8;--ink3:#9C98B4;--line:#2E2C40;--accent:#7C8DFF}}</style></head><body><main><h1>Prisma PDV</h1><h2>${html(titulo)}</h2>${corpo}${contato}<p><small>Políticas do piloto · versão ${html(VERSAO_POLITICAS)}</small></p></main></body></html>`;

const PAGINAS: Record<string, [string, string]> = {
  '/privacidade': ['Política de privacidade', secao('Privacidade') + secao('Retenção e exclusão')],
  '/termos': ['Termos de uso', secao('Termos do piloto')],
  '/exclusao-de-conta': ['Exclusão de conta', [
    paragrafo('Como pedir: no app, em Ajustes > Suporte e privacidade, aba "Exclusão"; ou envie um e-mail para ' + EMAIL_CONTATO + ' a partir do e-mail cadastrado, informando o nome da loja.'),
    paragrafo('O que acontece: a equipe analisa o pedido, informa o escopo e o prazo de execução no protocolo ou por e-mail e, então, executa a exclusão. O pedido, por si só, não apaga dados.'),
    secao('Retenção e exclusão'),
  ].join('')],
};

export function rotasPaginasPublicas(app: FastifyInstance) {
  for (const [caminho, [titulo, corpo]] of Object.entries(PAGINAS)) {
    const conteudo = pagina(titulo, corpo);
    app.get(caminho, async (_r, reply: FastifyReply) => reply.header('content-type', 'text/html; charset=utf-8').header('cache-control', 'public, max-age=300').header('x-content-type-options', 'nosniff').send(conteudo));
  }
}
