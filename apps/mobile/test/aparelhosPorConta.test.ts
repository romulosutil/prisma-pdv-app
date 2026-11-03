import { describe, expect, it, vi } from 'vitest';
import { InstalacaoRepo } from '../src/dados/instalacao';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoMemoria } from './ambiente';

const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
function ids() { let n = 0; return () => id(++n); }
const perfil = { nomeResponsavel: 'Ana', nomeLoja: 'Loja A', email: 'a@example.com', aparelhoNome: 'Celular' };
const sessao = { token: 'token-A', contaId: id(20), lojaId: id(21), aparelhoId: id(22), operadorId: id(23) };
const formulario = { ...perfil, documento: '12345678901', tipoLoja: 'Mercado' };
describe('aparelhos por conta', () => {
  it('mantém instalação global e aparelhos distintos estáveis após reiniciar', async () => {
    const base = new ArmazenamentoMemoria(); const repo = new InstalacaoRepo(base, ids());
    expect(await repo.aparelhoDaConta(' A@Example.com ')).toBe(id(1));
    expect(await repo.aparelhoDaConta('b@example.com')).toBe(id(2));
    const reiniciado = new InstalacaoRepo(base, () => id(99));
    expect(await reiniciado.aparelhoDaConta('a@example.com')).toBe(id(1)); expect(await reiniciado.aparelhoDaConta('B@example.com')).toBe(id(2));
    expect(await reiniciado.obterOuCriar()).toBe(id(1)); expect(await base.obter('instalacao')).toEqual({ aparelhoId: id(1) });
    expect(await base.obter('instalacao_aparelhos')).toEqual({ versao: 1, aparelhos: { 'a@example.com': id(1), 'b@example.com': id(2) } });
  });
  it('semeia legado no dono original preservando a instalação', async () => {
    const base = new ArmazenamentoMemoria(); await base.gravar('instalacao', { aparelhoId: id(7) });
    const repo = new InstalacaoRepo(base, () => id(8));
    expect(await repo.aparelhoDaConta('b@example.com', { email: 'A@example.com', aparelhoId: id(42) })).toBe(id(8));
    expect(await repo.aparelhoDaConta('a@example.com')).toBe(id(42));
    expect(await base.obter('instalacao')).toEqual({ aparelhoId: id(7) });
  });
  it('serializa chamadas concorrentes de emails iguais e distintos', async () => {
    const base = new ArmazenamentoMemoria(); const repo = new InstalacaoRepo(base, ids());
    expect(await Promise.all([repo.aparelhoDaConta('a@example.com'), repo.aparelhoDaConta('A@example.com'), repo.aparelhoDaConta('b@example.com')])).toEqual([id(1), id(1), id(2)]);
  });
  it.each([{ versao: 2, aparelhos: {} }, { versao: 1, aparelhos: { 'A@example.com': id(1) } }, { versao: 1, aparelhos: { 'a@example.com': id(1), 'b@example.com': id(1) } }, { versao: 1, aparelhos: { 'a@example.com': 'inválido' } }])('recusa mapa corrompido sem backend', async mapa => {
    const base = new ArmazenamentoMemoria(); await base.gravar('instalacao_aparelhos', mapa);
    const dados = new Dados(base, ids(), 'https://api.teste'); const entrar = vi.spyOn(dados.backend, 'entrar');
    await expect(dados.entrar('a@example.com', '123456')).rejects.toThrow(); expect(entrar).not.toHaveBeenCalled();
    expect(await base.obter('instalacao_aparelhos')).toEqual(mapa);
  });
  it('falha de mapa preserva origem e impede backend', async () => {
    const base = new ArmazenamentoMemoria(); await base.gravar('instalacao', { aparelhoId: id(7) });
    const original = base.gravar.bind(base); vi.spyOn(base, 'gravar').mockImplementation(async (chave, valor) => { if (chave === 'instalacao_aparelhos') throw Error('falha'); return original(chave, valor); });
    const dados = new Dados(base, ids(), 'https://api.teste'); const entrar = vi.spyOn(dados.backend, 'entrar');
    await expect(dados.entrar('a@example.com', '123456')).rejects.toThrow(); expect(entrar).not.toHaveBeenCalled(); expect(await base.obter('instalacao')).toEqual({ aparelhoId: id(7) });
  });
  it('bloqueia antes do backend e do vínculo novo quando há pendências', async () => {
    const base = new ArmazenamentoMemoria(); const dados = new Dados(base, ids(), 'https://api.teste');
    await dados.conta.registrar(sessao, perfil); await dados.acessoOffline.confirmar(sessao); await dados.produtos.criar({ nome: 'Produto', precoCentavos: 2500 });
    const entrar = vi.spyOn(dados.backend, 'entrar'); const criar = vi.spyOn(dados.backend, 'criarConta');
    await expect(dados.entrar('b@example.com', '123456')).rejects.toMatchObject({ codigo: 'conflito' });
    await expect(dados.criarConta({ ...formulario, email: 'b@example.com' })).rejects.toMatchObject({ codigo: 'conflito' });
    expect(entrar).not.toHaveBeenCalled(); expect(criar).not.toHaveBeenCalled(); expect(await base.obter('instalacao_aparelhos')).toBeNull(); expect(dados.conta.obter().sessao).toEqual(sessao);
  });
  it('não aceita aparelho retornado divergente', async () => {
    const base = new ArmazenamentoMemoria(); const dados = new Dados(base, ids(), 'https://api.teste');
    vi.spyOn(dados.backend, 'entrar').mockResolvedValue(sessao);
    await expect(dados.entrar('a@example.com', '123456')).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    expect(dados.conta.obter().sessao).toBeNull();
  });
  it('verifica pendências persistidas mesmo antes de iniciar o app', async () => {
    const base = new ArmazenamentoMemoria(); const primeiro = new Dados(base, ids(), 'https://api.teste');
    await primeiro.conta.registrar(sessao, perfil); await primeiro.acessoOffline.confirmar(sessao); await primeiro.produtos.criar({ nome: 'Produto', precoCentavos: 2500 });
    const reiniciado = new Dados(base, ids(), 'https://api.teste'); const entrar = vi.spyOn(reiniciado.backend, 'entrar');
    await expect(reiniciado.entrar('b@example.com', '123456')).rejects.toMatchObject({ codigo: 'conflito' });
    expect(entrar).not.toHaveBeenCalled(); expect(await base.obter('instalacao_aparelhos')).toBeNull();
  });
  it('mantém A bloqueada enquanto aguarda login em B', async () => {
    const base = new ArmazenamentoMemoria(); const dados = new Dados(base, ids(), 'https://api.teste');
    await dados.conta.registrar(sessao, perfil);
    let liberar!: (valor: typeof sessao) => void; let iniciou!: () => void;
    const espera = new Promise<typeof sessao>(resolve => { liberar = resolve; });
    const chamado = new Promise<void>(resolve => { iniciou = resolve; });
    let aparelhoB = '';
    vi.spyOn(dados.backend, 'entrar').mockImplementation(async entrada => { aparelhoB = entrada.aparelhoId; iniciou(); return espera; });
    vi.spyOn(dados.backend, 'obterPerfil').mockResolvedValue({ contaId: id(30), lojaId: id(31), operadorId: id(32), email: 'b@example.com', nomeResponsavel: 'B', nomeLoja: 'Loja B', papel: 'dono' });
    vi.spyOn(dados.assinatura, 'sincronizar').mockResolvedValue(undefined);
    const acesso = dados.entrar('b@example.com', '123456'); await chamado;
    expect(dados.conta.transicao.obter()).toBe(true); expect(dados.armazenamentoDaLoja.podeAlterar()).toBe(false);
    await expect(dados.produtos.criar({ nome: 'Produto A', precoCentavos: 2500 })).rejects.toThrow();
    await expect(dados.carrinho.adicionarAvulso(2500, 'Venda A')).rejects.toThrow();
    expect(dados.produtos.obter()).toEqual([]); expect(dados.carrinho.obter().itens).toEqual([]);
    liberar({ token: 'token-B', contaId: id(30), lojaId: id(31), operadorId: id(32), aparelhoId: aparelhoB });
    await acesso; expect(dados.conta.obter().sessao?.contaId).toBe(id(30));
    expect(dados.conta.transicao.obter()).toBe(false); expect(dados.armazenamentoDaLoja.podeAlterar()).toBe(true);
    const chaveA = 'conta:' + JSON.stringify([sessao.contaId, sessao.lojaId]) + ':produtos';
    expect(await base.obter(chaveA)).toBeNull();
  });
  it.each(['backend', 'perfil'])('libera bloqueio quando %s falha', async falha => {
    const base = new ArmazenamentoMemoria(); const dados = new Dados(base, ids(), 'https://api.teste');
    await dados.conta.registrar(sessao, perfil);
    await dados.acessoOffline.confirmar(sessao); // Fixture de perfil já autenticado antes da falha.
    vi.spyOn(dados.backend, 'entrar').mockImplementation(async entrada => {
      if (falha === 'backend') throw Error('backend falhou');
      return { token: 'token-B', contaId: id(30), lojaId: id(31), operadorId: id(32), aparelhoId: entrada.aparelhoId };
    });
    vi.spyOn(dados.backend, 'obterPerfil').mockRejectedValue(new Error('perfil falhou'));
    await expect(dados.entrar('b@example.com', '123456')).rejects.toThrow();
    expect(dados.conta.transicao.obter()).toBe(false); expect(dados.armazenamentoDaLoja.podeAlterar()).toBe(true);
    expect(dados.conta.obter().sessao).toEqual(sessao);
    const produto = await dados.produtos.criar({ nome: 'Produto A', precoCentavos: 2500 }); expect(produto.lojaId).toBe(sessao.lojaId);
  });
});
