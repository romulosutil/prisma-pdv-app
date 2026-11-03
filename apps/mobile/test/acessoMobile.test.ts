import { DatabaseSync } from 'node:sqlite';
import { iniciarTeste, licencaDe, serializarAssinatura, serializarLicenca } from '@pdv/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Armazenamento } from '../src/dados/armazenamento';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { Dados } from '../src/dados/dados';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const identidade = { contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
const sessao = (token: string) => ({ ...identidade, token });
const perfil = { contaId: id(1), lojaId: id(2), operadorId: id(4), email: 'ana@example.com', nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real', papel: 'dono' };
class Memoria implements Armazenamento {
  dados = new Map<string, unknown>();
  falharConta = false;
  async obter<T>(k: string) { return (this.dados.get(k) ?? null) as T | null; }
  async gravar<T>(k: string, v: T) { if (k === 'conta' && this.falharConta) throw Error('falha de metadata'); this.dados.set(k, structuredClone(v)); }
  async remover(k: string) { this.dados.delete(k); }
  async limpar() { this.dados.clear(); }
}
class Cofre implements CofreSessao {
  dados = new Map<string, string>();
  async obter(k: string) { return this.dados.get(k) ?? null; }
  async gravar(k: string, v: string) { this.dados.set(k, v); }
  async remover(k: string) { this.dados.delete(k); }
}
const json = (valor: unknown, status = 200) => new Response(JSON.stringify(valor), { status });
const vazio = (status: number) => new Response(null, { status });
async function criar() {
  const raw = new DatabaseSync(':memory:');
  const base = new Memoria(); const cofre = new Cofre(); let n = 100;
  // A API devolve o aparelho solicitado; a fixture fixa a instalação A e respeita AD-019 para B.
  await base.gravar('instalacao', { aparelhoId: identidade.aparelhoId });
  const seguro = new ArmazenamentoSessaoSegura(base, cofre, () => id(n++));
  const sqlite = new ArmazenamentoSqlite(async () => sqliteBanco(raw), seguro);
  const dados = new Dados(sqlite, () => id(n++), 'https://api.test');
  let login = sessao('novo'); let respostaPerfil: () => Promise<Response> = async () => json(perfil);
  let respostaLogin: (aparelhoId: string) => Promise<Response> = async (aparelhoId) => json({ ...login, aparelhoId });
  let logout: () => Promise<Response> = async () => vazio(204);
  let protegido: () => Promise<Response> = async () => vazio(404);
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/caixas/reservar')) { const req = JSON.parse(String(init.body)); return json({ id: req.id, ...identidade, versaoContrato: 2, aparelhoAtualId: identidade.aparelhoId, abertura: { em: new Date().toISOString(), trocoInicialCentavos: req.trocoInicialCentavos }, fechamento: null, movimentos: [] }); }
    if (url.endsWith('/auth/login')) return respostaLogin(JSON.parse(String(init.body)).aparelhoId);
    if (url.endsWith('/conta')) return respostaPerfil();
    if (url.endsWith('/auth/logout')) return logout();
    if (url.endsWith('/assinatura')) return protegido();
    throw Error(`rota inesperada ${url} ${init.method}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  await dados.iniciar();
  return { raw, base, cofre, sqlite, dados, fetchMock, setLogin: (s: typeof login) => { login = s; }, setRespostaLogin: (f: typeof respostaLogin) => { respostaLogin = f; }, setPerfil: (f: typeof respostaPerfil) => { respostaPerfil = f; }, setLogout: (f: typeof logout) => { logout = f; }, setProtegido: (f: typeof protegido) => { protegido = f; } };
}
afterEach(() => vi.unstubAllGlobals());

describe('acesso mobile com SQLite e cofre', () => {
  it('consulta perfil com token novo antes de persistir e usa nomes reais', async () => {
    const c = await criar();
    try {
      c.setPerfil(async () => { expect(c.dados.conta.obter().sessao).toBeNull(); expect(c.cofre.dados.size).toBe(0); return json(perfil); });
      await c.dados.entrar(perfil.email, '123456');
      const chamada = c.fetchMock.mock.calls.find(([url]) => url.endsWith('/conta'))!;
      expect((chamada[1].headers as Record<string, string>).Authorization).toBe('Bearer novo');
      expect(c.dados.conta.obter()).toMatchObject({ sessao: sessao('novo'), perfil: { nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real' } });
      expect(JSON.stringify([...c.base.dados.values()])).not.toContain('novo');
    } finally { c.raw.close(); }
  });

  it.each(['malformado', 'divergente', 'rede'])('preserva conta anterior quando perfil é %s', async (falha) => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      const anterior = structuredClone(c.dados.conta.obter());
      c.setLogin(sessao('outro'));
      c.setPerfil(async () => { if (falha === 'rede') throw Error('offline'); return json(falha === 'malformado' ? {} : { ...perfil, contaId: id(99) }); });
      await expect(c.dados.entrar(perfil.email, '123456')).rejects.toThrow();
      expect(c.dados.conta.obter()).toEqual(anterior);
      expect([...c.cofre.dados.values()]).toEqual(['novo']);
    } finally { c.raw.close(); }
  });

  it('invalida apenas 401 autenticado atual, preservando rascunho e identidade', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      await c.dados.produtos.criar({ nome: 'Café', precoCentavos: 500 });
      await c.dados.caixa.abrir(1000);
      await c.dados.vendas.registrar({ itens: [{ produtoId: null, descricao: 'Anterior', precoUnitarioCentavos: 500, quantidadeMilesimos: 1000 }], pagamentos: [{ meio: 'pix', valorCentavos: 500 }] });
      await c.dados.carrinho.adicionarAvulso(2500, 'Avulso');
      await c.dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
      const antes = structuredClone(c.dados.carrinho.obter());
      const financeiro = structuredClone({ produtos: c.dados.produtos.obter(), vendas: c.dados.vendas.obter(), caixa: c.dados.caixa.obter(), assinatura: c.dados.assinatura.obter() });
      c.setRespostaLogin(async () => vazio(401));
      await expect(c.dados.entrar(perfil.email, '000000')).rejects.toThrow();
      expect(c.dados.conta.obter().sessao?.token).toBe('novo');
      c.setProtegido(async () => vazio(403));
      await expect(c.dados.backend.obterAssinatura()).rejects.toThrow();
      expect(c.dados.conta.obter().sessao?.token).toBe('novo');
      c.setProtegido(async () => vazio(401));
      await expect(c.dados.backend.obterAssinatura()).rejects.toThrow();
      expect(c.dados.conta.obter()).toMatchObject({ sessao: null, identidade, reautenticacaoNecessaria: true });
      expect(c.dados.carrinho.obter()).toEqual(antes);
      expect({ produtos: c.dados.produtos.obter(), vendas: c.dados.vendas.obter(), caixa: c.dados.caixa.obter(), assinatura: c.dados.assinatura.obter() }).toEqual(financeiro);
      expect((c.raw.prepare('SELECT COUNT(*) n FROM rascunhos').get() as { n: number }).n).toBe(1);
    } finally { c.raw.close(); }
  });

  it('ignora 401 atrasado de token anterior após reautenticar a mesma conta', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      let liberar!: (r: Response) => void;
      c.setProtegido(() => new Promise((resolve) => { liberar = resolve; }));
      const antiga = c.dados.backend.obterAssinatura().catch(() => undefined);
      await vi.waitFor(() => expect(liberar).toBeTypeOf('function'));
      c.setProtegido(async () => vazio(404)); c.setLogin(sessao('mais-novo'));
      await c.dados.entrar(perfil.email, '123456');
      liberar(vazio(401)); await antiga;
      expect(c.dados.conta.obter().sessao?.token).toBe('mais-novo');
      expect([...c.cofre.dados.values()]).toEqual(['mais-novo']);
    } finally { c.raw.close(); }
  });

  it('preserva token novo quando logout anterior termina atrasado', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      let liberar!: (r: Response) => void;
      c.setLogout(() => new Promise((resolve) => { liberar = resolve; }));
      const saida = c.dados.sair();
      await vi.waitFor(() => expect(liberar).toBeTypeOf('function'));
      c.setLogin(sessao('mais-novo'));
      await c.dados.entrar(perfil.email, '123456');
      liberar(vazio(204));
      await saida;
      expect(c.dados.conta.obter().sessao?.token).toBe('mais-novo');
      expect([...c.cofre.dados.values()]).toEqual(['mais-novo']);
    } finally { c.raw.close(); }
  });

  it('401 do perfil de novo login não invalida a sessão anterior', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      const anterior = structuredClone(c.dados.conta.obter());
      c.setLogin(sessao('mais-novo')); c.setPerfil(async () => vazio(401));
      await expect(c.dados.entrar(perfil.email, '123456')).rejects.toThrow();
      expect(c.dados.conta.obter()).toEqual(anterior);
      expect([...c.cofre.dados.values()]).toEqual(['novo']);
    } finally { c.raw.close(); }
  });

  it.each(['401', 'logout'])('preserva licença preenchida após %s', async (acao) => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      const agora = new Date('2026-10-29T12:00:00.000Z');
      const assinatura = iniciarTeste({ id: id(70), contaId: identidade.contaId, planoId: 'negocio', agora, cartao: { bandeira: 'visa', ultimos4: '4242', fingerprint: 'fingerprint' } });
      const payload = { assinatura: serializarAssinatura(assinatura), licenca: serializarLicenca(licencaDe(assinatura, agora)) };
      c.setProtegido(async () => json(payload));
      await c.dados.assinatura.sincronizar();
      const salvo = await c.dados.armazenamentoDaLoja.obter('assinatura');
      expect(salvo).toEqual(payload);
      if (acao === '401') {
        c.setProtegido(async () => vazio(401));
        await expect(c.dados.backend.obterAssinatura()).rejects.toThrow();
      } else await c.dados.sair();
      expect(await c.dados.armazenamentoDaLoja.obter('assinatura')).toEqual(payload);
      expect(c.dados.assinatura.obter().assinatura).toMatchObject({ id: id(70), contaId: identidade.contaId, planoId: 'negocio' });
      expect(c.dados.assinatura.obter().licenca).toMatchObject({ planoId: 'negocio', validaAte: new Date(payload.licenca.validaAte) });
    } finally { c.raw.close(); }
  });

  it('isola licença, preferências e Pix na troca permitida e recupera A ao voltar', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      const agora = new Date('2026-10-29T12:00:00.000Z');
      const assinatura = iniciarTeste({ id: id(70), contaId: identidade.contaId, planoId: 'negocio', agora, cartao: { bandeira: 'visa', ultimos4: '4242', fingerprint: 'fingerprint' } });
      const payload = { assinatura: serializarAssinatura(assinatura), licenca: serializarLicenca(licencaDe(assinatura, agora)) };
      c.setProtegido(async () => json(payload));
      await c.dados.assinatura.sincronizar();
      await c.dados.preferencias.alterar({ bipe: false, lanterna: true, pixPadrao: 'mercadopago' });
      await c.dados.armazenamentoDaLoja.gravar('chavePix', 'pix-a@example.com');
      const preferenciasA = structuredClone(c.dados.preferencias.obter());
      const perfilB = { ...perfil, contaId: id(11), lojaId: id(12), operadorId: id(14), email: 'bia@example.com', nomeResponsavel: 'Bia', nomeLoja: 'Loja B' };
      c.setLogin({ ...sessao('token-b'), contaId: id(11), lojaId: id(12), operadorId: id(14) });
      c.setPerfil(async () => json(perfilB)); c.setProtegido(async () => vazio(404));
      await c.dados.entrar(perfilB.email, '123456');
      expect(c.dados.conta.obter()).toMatchObject({ sessao: { token: 'token-b', contaId: id(11), lojaId: id(12), operadorId: id(14) }, perfil: { email: perfilB.email, nomeResponsavel: 'Bia', nomeLoja: 'Loja B' } });
      expect(c.dados.produtos.obter()).toEqual([]);
      expect(c.dados.vendas.obter()).toEqual({ vendas: [], numeroBase: 0 });
      expect(c.dados.caixa.obter()).toEqual([]);
      expect(c.dados.carrinho.obter().itens).toEqual([]);
      expect(c.dados.assinatura.obter()).toMatchObject({ assinatura: null, licenca: null });
      expect(c.dados.preferencias.obter()).toMatchObject({ bipe: true, lanterna: false, pixPadrao: 'infinitepay' });
      expect(await c.dados.armazenamentoDaLoja.obter('chavePix')).toBeNull();
      c.setLogin(sessao('token-a-novo')); c.setPerfil(async () => json(perfil));
      await c.dados.entrar(perfil.email, '123456');
      expect(c.dados.conta.obter()).toMatchObject({ sessao: { token: 'token-a-novo', contaId: id(1), lojaId: id(2) }, perfil: { nomeResponsavel: 'Ana Real', nomeLoja: 'Loja Real' } });
      expect(c.dados.preferencias.obter()).toEqual(preferenciasA);
      expect(await c.dados.armazenamentoDaLoja.obter('chavePix')).toBe('pix-a@example.com');
      expect(await c.dados.armazenamentoDaLoja.obter('assinatura')).toEqual(payload);
      expect(c.dados.assinatura.obter().assinatura).toMatchObject({ id: id(70), contaId: id(1), planoId: 'negocio' });
      expect(c.dados.assinatura.obter().licenca).toMatchObject({ planoId: 'negocio', validaAte: new Date(payload.licenca.validaAte) });
    } finally { c.raw.close(); }
  });

  it('falha de metadata em 401 remove credencial e recupera identidade ao reiniciar', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      const produto = await c.dados.produtos.criar({ nome: 'Café', precoCentavos: 500 });
      await c.dados.carrinho.adicionarAvulso(2500, 'Avulso');
      await c.dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
      const carrinho = structuredClone(c.dados.carrinho.obter());
      c.base.falharConta = true;
      c.setProtegido(async () => vazio(401));
      await expect(c.dados.backend.obterAssinatura()).rejects.toThrow();
      expect(c.dados.conta.obter()).toMatchObject({ sessao: null, identidade, reautenticacaoNecessaria: true });
      expect(c.cofre.dados.size).toBe(0);
      expect(c.dados.produtos.obter()).toContainEqual(produto);
      expect(c.dados.carrinho.obter()).toEqual(carrinho);
      c.base.falharConta = false;
      const retomado = new Dados(c.sqlite, () => id(900), 'https://api.test');
      await retomado.iniciar();
      expect(retomado.conta.obter()).toMatchObject({ sessao: null, identidade, reautenticacaoNecessaria: true });
      expect(retomado.produtos.obter()).toContainEqual(produto);
      expect(retomado.carrinho.obter()).toEqual(carrinho);
    } finally { c.raw.close(); }
  });

  it.each([false, true])('logout confirma revogação apenas online (%s)', async (online) => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      await c.dados.carrinho.adicionarAvulso(2500, 'Avulso');
      c.setLogout(online ? async () => vazio(204) : async () => { throw Error('offline'); });
      expect(await c.dados.sair()).toEqual({ revogadaNoServidor: online });
      expect(c.dados.conta.obter()).toMatchObject({ sessao: null, identidade });
      expect(c.dados.carrinho.obter().itens).toHaveLength(1);
    } finally { c.raw.close(); }
  });

  it('recusa outra conta com pendência e retoma a mesma venda após reautenticação', async () => {
    const c = await criar();
    try {
      await c.dados.entrar(perfil.email, '123456');
      await c.dados.carrinho.adicionarAvulso(2500, 'Avulso');
      await c.dados.carrinho.adicionarParcela({ meio: 'pix', valorCentavos: 1000 });
      const antes = structuredClone(c.dados.carrinho.obter());
      const vendaId = (c.raw.prepare('SELECT venda_id FROM rascunhos').get() as { venda_id: string }).venda_id;
      c.setLogin({ ...sessao('b'), contaId: id(11), lojaId: id(12), operadorId: id(14) });
      c.setPerfil(async () => json({ ...perfil, contaId: id(11), lojaId: id(12), operadorId: id(14) }));
      await expect(c.dados.entrar(perfil.email, '123456')).rejects.toMatchObject({ codigo: 'conflito' });
      expect(c.dados.conta.obter().sessao?.token).toBe('novo');
      expect(c.dados.carrinho.obter()).toEqual(antes);
      c.setLogin(sessao('renovado')); c.setPerfil(async () => json(perfil));
      await c.dados.entrar(perfil.email, '123456');
      expect(c.dados.carrinho.obter()).toEqual(antes);
      await c.dados.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500, trocoCentavos: 0 });
      const venda = await c.dados.carrinho.concluir();
      expect(venda).toMatchObject({ id: vendaId, totalCentavos: 2500 });
      expect(venda.pagamentos.map((p) => p.valorCentavos)).toEqual([1000, 1500]);
      expect((c.raw.prepare('SELECT COUNT(*) n FROM vendas').get() as { n: number }).n).toBe(1);
      expect((c.raw.prepare('SELECT COUNT(*) n FROM outbox').get() as { n: number }).n).toBe(1);
    } finally { c.raw.close(); }
  });
});
