import { describe, expect, it, vi } from 'vitest';
import { ArmazenamentoEscopo } from '../src/dados/armazenamentoEscopo';
import { ContaRepo } from '../src/dados/conta';
import { CatalogoEan, CHAVE_CACHE } from '../src/servicos/catalogoEan';
import { ArmazenamentoMemoria } from './ambiente';

const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const A = { contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4), token: 'token-A' }, B = { ...A, lojaId: id(5), token: 'token-B' };
const perfil = { nomeResponsavel: 'Ana', nomeLoja: 'Loja', email: 'a@b.com', aparelhoNome: 'Celular' };
const ean = '7891000100103';
const produto = { ean, nome: 'Produto A', marca: 'Marca', conteudo: '1 un', imagemUrl: null, fonte: 'proprio', confianca: 'confirmada' };
const endereco = (loja: string) => 'conta:' + JSON.stringify([A.contaId, loja]) + ':' + CHAVE_CACHE;
function pendente<T>() { let resolver!: (v: T) => void; const promise = new Promise<T>(r => { resolver = r; }); return { promise, resolver }; }
async function montar(buscar: typeof fetch, base = new ArmazenamentoMemoria()) {
  const conta = new ContaRepo(base); await conta.registrar(A, perfil);
  const armazenamento = new ArmazenamentoEscopo(base, () => conta.obter().identidade, false);
  const invalidar = vi.fn((token: string) => conta.invalidarSessao(token));
  const catalogo = new CatalogoEan({ urlApi: 'https://api.teste', obterToken: () => conta.obter().sessao?.token ?? null, armazenamento, buscar, aoSessaoInvalida: invalidar });
  return { base, conta, armazenamento, catalogo, invalidar };
}
const json = (valor: unknown, status = 200) => new Response(JSON.stringify(valor), { status, headers: { 'content-type': 'application/json' } });
describe('catálogo com troca de loja', () => {
  it('descarta resposta A tardia e não grava cache A nem B', async () => {
    const gate = pendente<Response>(); const iniciou = pendente<void>();
    const buscar = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => { expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-A'); iniciou.resolver(); return gate.promise; });
    const ctx = await montar(buscar as typeof fetch); const consulta = ctx.catalogo.consultar(ean); await iniciou.promise;
    await ctx.conta.registrar(B, perfil); gate.resolver(json(produto)); expect(await consulta).toEqual({ achou: false });
    expect(await ctx.base.obter(endereco(A.lojaId))).toBeNull(); expect(await ctx.base.obter(endereco(B.lojaId))).toBeNull();
    expect(ctx.catalogo.buscarLocal(ean)).toEqual({ achou: false });
    await ctx.catalogo.confirmar(ean, 'Produto B'); expect(buscar).toHaveBeenCalledTimes(1);
  });
  it('ignora carregamento atrasado de cache A após mudar para B', async () => {
    const base = new ArmazenamentoMemoria(); await base.gravar(endereco(A.lojaId), [produto]);
    const gate = pendente<void>(); const iniciou = pendente<void>(); const original = base.obter.bind(base);
    base.obter = async <T>(chave: string): Promise<T | null> => {
      const valor = await original<T>(chave);
      if (chave === endereco(A.lojaId)) { iniciou.resolver(); await gate.promise; }
      return valor;
    };
    const buscar = vi.fn(async () => json(produto)); const ctx = await montar(buscar as typeof fetch, base); await iniciou.promise;
    const consulta = ctx.catalogo.consultar(ean); await ctx.conta.registrar(B, perfil); gate.resolver();
    expect(await consulta).toEqual({ achou: false }); expect(ctx.catalogo.buscarLocal(ean)).toEqual({ achou: false });
    expect(await base.obter(endereco(B.lojaId))).toBeNull(); expect(buscar).not.toHaveBeenCalled();
  });
  it('401 tardio passa token A e ContaRepo preserva sessão B', async () => {
    const gate = pendente<Response>(); const iniciou = pendente<void>();
    const buscar = vi.fn(async () => { iniciou.resolver(); return gate.promise; }); const ctx = await montar(buscar as typeof fetch);
    const consulta = ctx.catalogo.consultar(ean); await iniciou.promise; await ctx.conta.registrar(B, perfil);
    gate.resolver(json({ erro: 'nao_autenticado' }, 401)); expect(await consulta).toEqual({ achou: false });
    expect(ctx.invalidar).toHaveBeenCalledExactlyOnceWith('token-A'); expect(ctx.conta.obter().sessao).toEqual(B);
  });
});
