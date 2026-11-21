import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { EMAIL_CONTATO, NOME_DESENVOLVEDOR, POLITICAS, VERSAO_POLITICAS } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, criarAmbiente, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
const pegar = (url: string, method: 'GET' | 'HEAD' = 'GET') => amb.app.inject({ method, url });

it.each(['/privacidade', '/exclusao-de-conta', '/termos'])('%s é público, HTML estático com desenvolvedor, contato, versão e cabeçalhos de cache', async url => {
  const r = await pegar(url);
  expect(r.statusCode).toBe(200);
  expect(r.headers['content-type']).toBe('text/html; charset=utf-8');
  expect(r.headers['cache-control']).toBe('public, max-age=300');
  expect(r.headers['x-content-type-options']).toBe('nosniff');
  expect(r.headers['x-pdv-agora']).toBeDefined();
  expect(r.body).toContain('lang="pt-BR"'); expect(r.body).toContain('name="viewport"');
  expect(r.body).toContain('Prisma PDV');
  expect(r.body).toContain(NOME_DESENVOLVEDOR);
  expect(r.body).toContain(EMAIL_CONTATO);
  expect(r.body).toContain(VERSAO_POLITICAS);
  expect(r.body).not.toContain('Políticas do piloto');
  expect(r.body).not.toContain('Termos do piloto');
  expect(r.body).not.toMatch(/<script|<link|src=|https?:\/\//i);
});

it('conteúdo reaproveita as políticas de produção, com escape de HTML', async () => {
  const texto = (t: string) => POLITICAS.find(p => p.titulo === t)!.texto.replace(/'/g, '&#39;');
  expect((await pegar('/privacidade')).body).toContain(texto('Privacidade'));
  expect((await pegar('/privacidade')).body).toContain(texto('Retenção e exclusão'));
  expect((await pegar('/termos')).body).toContain(texto('Termos de uso'));
  expect((await pegar('/exclusao-de-conta')).body).toContain(texto('Retenção e exclusão'));
});

it('exclusão de conta cita o app, o desenvolvedor, o caminho no app e o e-mail com o nome da loja', async () => {
  const corpo = (await pegar('/exclusao-de-conta')).body;
  expect(corpo).toContain('Prisma PDV'); expect(corpo).toContain(NOME_DESENVOLVEDOR);
  expect(corpo).toContain('Ajustes &gt; Suporte e privacidade'); expect(corpo).toContain('&quot;Exclusão&quot;');
  expect(corpo).toContain(`mailto:${EMAIL_CONTATO}`); expect(corpo).toContain('nome da loja');
  expect(corpo).toContain('escopo'); expect(corpo).toContain('prazo');
});

it('HEAD funciona, /saude segue ativa e rota privada continua exigindo sessão', async () => {
  const h = await pegar('/privacidade', 'HEAD');
  expect(h.statusCode).toBe(200); expect(h.headers['content-type']).toBe('text/html; charset=utf-8'); expect(h.body).toBe('');
  expect((await chamar(amb, 'GET', '/saude')).corpo).toEqual({ status: 'ok' });
  expect((await chamar(amb, 'GET', '/suporte/solicitacoes')).status).toBe(401);
});
