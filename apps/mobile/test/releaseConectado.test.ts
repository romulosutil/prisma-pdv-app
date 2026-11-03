import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { RelogioApp } from '@/release/relogio';
import { BackendHttp } from '@/servicos/backendHttp';
import { AcessoOffline } from '@/dados/acessoOffline';
import { gerarId } from '@pdv/shared';
import { buscarCatalogoDemo, consultarCatalogoDemo } from '@/release/catalogoDemo';
import { ArmazenamentoMemoria } from './ambiente';
const { substituicoesRelease } = createRequire(import.meta.url)('../config/isolamentoRelease.js');
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('release conectado retira implementações demo do grafo sem mudar os perfis de desenvolvimento', () => {
  const raiz = resolve('.');
  for (const ambiente of ['homologacao', 'producao']) {
    const mapa: Map<string, string> = substituicoesRelease(raiz, ambiente);
    expect(mapa.size).toBe(8);
    expect(mapa.get(resolve(raiz, '../../packages/shared/src/billing.ts'))).toBe(resolve(raiz, 'src/release/billing.ts'));
  }
  expect(substituicoesRelease(raiz, 'demo').size).toBe(0);
  expect(substituicoesRelease(raiz, undefined).size).toBe(0);
});
it('relógio do release ignora deslocamento persistido pela demo e recusa avanço artificial', async () => {
  const a = new ArmazenamentoMemoria(); await a.gravar('relogio_dias', 100);
  const r = new RelogioApp(a); await r.carregar();
  expect(Math.abs(r.agora().getTime() - Date.now())).toBeLessThan(1000);
  await expect(r.avancarDias(7)).rejects.toThrow('indisponível');
});
it('catálogo conectado sem API recusa a consulta em vez de sugerir produto fictício', async () => {
  expect(() => buscarCatalogoDemo('7891000100103')).toThrow('exige uma API');
  await expect(consultarCatalogoDemo('7891000100103')).rejects.toThrow('exige uma API');
});
it('resposta HTTP válida ancora hora real, sobrevive a reinício e mantém detecção de retrocesso offline', async () => {
  const local = Date.parse('2026-11-03T03:00:00.000Z');
  const agora = vi.spyOn(Date, 'now').mockReturnValue(local);
  const base = new ArmazenamentoMemoria();
  const relogio = new RelogioApp(base); await relogio.carregar();
  const servidor = local + 26000;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { headers: { 'x-pdv-agora': new Date(servidor).toISOString() } })));
  const backend = new BackendHttp('https://api.example', () => 'sessao', undefined, (em, recebida) => relogio.sincronizarServidor(em, recebida));
  await backend.listarSolicitacoesSuporte();
  expect(relogio.agora().getTime()).toBe(servidor);
  const retomado = new RelogioApp(base); await retomado.carregar();
  agora.mockReturnValue(local + 1000);
  expect(retomado.agora().getTime()).toBe(servidor + 1000);
  const identidade = { contaId: gerarId(), lojaId: gerarId(), operadorId: gerarId(), aparelhoId: gerarId() };
  const offline = new AcessoOffline(base, () => retomado.agora()); await offline.confirmar(identidade);
  expect(offline.permitido(identidade)).toBe(true);
  agora.mockReturnValue(local - 1000);
  expect(offline.permitido(identidade)).toBe(false);
});
it('resposta antiga ou hora inválida não substituem uma referência mais recente', async () => {
  const local = Date.parse('2026-11-03T03:00:00.000Z');
  vi.spyOn(Date, 'now').mockReturnValue(local);
  const r = new RelogioApp(new ArmazenamentoMemoria());
  await Promise.all([r.sincronizarServidor(new Date(local + 26000).toISOString(), local), r.sincronizarServidor(new Date(local + 10000).toISOString(), local + 100)]);
  await r.sincronizarServidor('invalida', local);
  expect(r.agora().getTime()).toBe(local + 26000);
});
it('aumento de latência entre respostas novas não faz o relógio offline recuar', async () => {
  const local = Date.parse('2026-11-03T03:00:00.000Z');
  const agora = vi.spyOn(Date, 'now').mockReturnValue(local);
  const r = new RelogioApp(new ArmazenamentoMemoria());
  await r.sincronizarServidor(new Date(local + 26000).toISOString(), local);
  agora.mockReturnValue(local + 2000);
  await r.sincronizarServidor(new Date(local + 27500).toISOString(), local + 2000);
  expect(r.agora().getTime()).toBe(local + 28000);
});
it('nova amostra real corrige salto grande do aparelho sem perpetuar horário artificial', async () => {
  const local = Date.parse('2026-11-03T03:00:00.000Z');
  const agora = vi.spyOn(Date, 'now').mockReturnValue(local);
  const r = new RelogioApp(new ArmazenamentoMemoria());
  await r.sincronizarServidor(new Date(local + 26000).toISOString(), local);
  agora.mockReturnValue(local + 86400000);
  await r.sincronizarServidor(new Date(local + 27000).toISOString(), local + 86400000);
  expect(r.agora().getTime()).toBe(local + 27000);
});
it('falha ao persistir hora não publica ajuste e permite repetir a confirmação original', async () => {
  const local = Date.parse('2026-11-03T03:00:00.000Z');
  vi.spyOn(Date, 'now').mockReturnValue(local);
  const base = new ArmazenamentoMemoria(), r = new RelogioApp(base); await r.carregar();
  const salvar = vi.spyOn(base, 'gravar').mockRejectedValueOnce(new Error('Disco cheio'));
  const servidor = new Date(local + 26000).toISOString();
  await expect(r.sincronizarServidor(servidor, local)).rejects.toThrow('Disco cheio');
  expect(r.agora().getTime()).toBe(local);
  salvar.mockRestore(); await r.sincronizarServidor(servidor, local);
  expect(r.agora().getTime()).toBe(local + 26000);
});
it('erro HTTP ou corpo fora do contrato não fornecem amostra de hora confiável', async () => {
  const registrarHora = vi.fn(async () => undefined);
  const backend = new BackendHttp('https://api.example', () => 'sessao', undefined, registrarHora);
  const headers = { 'x-pdv-agora': new Date().toISOString() };
  const buscar = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401, headers }))
    .mockResolvedValueOnce(new Response('{"invalido":true}', { headers }))
    .mockResolvedValueOnce(new Response('[]', { headers: { 'x-pdv-agora': 'invalida' } }));
  vi.stubGlobal('fetch', buscar);
  await expect(backend.listarSolicitacoesSuporte()).rejects.toMatchObject({ status: 401 });
  await expect(backend.listarSolicitacoesSuporte()).rejects.toMatchObject({ codigo: 'resposta_invalida' });
  await backend.listarSolicitacoesSuporte();
  expect(registrarHora).not.toHaveBeenCalled();
});
