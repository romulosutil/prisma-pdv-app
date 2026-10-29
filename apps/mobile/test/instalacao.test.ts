import { describe, expect, it, vi } from 'vitest';
import type { Sessao } from '@pdv/shared';
import { Dados } from '../src/dados/dados';
import { InstalacaoRepo } from '../src/dados/instalacao';
import { ArmazenamentoMemoria, criarContadorDeIds } from './ambiente';

const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const sessao = (aparelhoId: string): Sessao => ({ token: 'token-teste', contaId: id(10), lojaId: id(11), aparelhoId, operadorId: id(12) });
const formulario = { nomeResponsavel: 'Ana', email: 'ana@example.test', documento: '123', nomeLoja: 'Loja', tipoLoja: 'Mercado' };

function criarDados(armazenamento: ArmazenamentoMemoria, novoId = criarContadorDeIds()) {
  const dados = new Dados(armazenamento, novoId, 'https://example.test');
  const entrar = vi.spyOn(dados.backend, 'entrar').mockImplementation(async (entrada) => sessao(entrada.aparelhoId));
  const criarConta = vi.spyOn(dados.backend, 'criarConta').mockImplementation(async (entrada) => sessao(entrada.aparelhoId));
  // Perfil passou a ser obrigatório no login; esta fixture continua testando identidade, sem rede real.
  vi.spyOn(dados.backend, 'obterPerfil').mockResolvedValue({ contaId: id(10), lojaId: id(11), operadorId: id(12), email: 'ana@example.test', nomeResponsavel: 'Ana', nomeLoja: 'Loja real', papel: 'dono' });
  vi.spyOn(dados.assinatura, 'sincronizar').mockResolvedValue(undefined);
  vi.spyOn(dados.carrinho, 'carregar').mockResolvedValue(undefined);
  return { dados, entrar, criarConta };
}

describe('identidade de instalação', () => {
  it('reutiliza o mesmo ID em três logins, cadastro e após recriar Dados', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    const primeiro = criarDados(armazenamento);
    for (let n = 0; n < 3; n++) await primeiro.dados.entrar('ana@example.test', '123456');
    await primeiro.dados.criarConta(formulario);
    expect(primeiro.entrar.mock.calls.map(([p]) => p.aparelhoId)).toEqual([id(1), id(1), id(1)]);
    expect(primeiro.criarConta.mock.calls[0]![0].aparelhoId).toBe(id(1));
    const segundo = criarDados(armazenamento, () => id(99));
    // A mesma conta reutiliza o aparelho; duas contas têm vínculos próprios (AD-019/trocaContasApi).
    await segundo.dados.entrar('ana@example.test', '123456');
    expect(segundo.entrar.mock.calls[0]![0].aparelhoId).toBe(id(1));
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(1) });
  });

  it('adota o ID da sessão legada carregada sem gerar outro', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    await armazenamento.gravar('conta', { sessao: sessao(id(42)), perfil: null });
    const novoId = vi.fn(() => id(1)); const { dados, entrar } = criarDados(armazenamento, novoId);
    await dados.conta.carregar(); await dados.entrar('ana@example.test', '123456');
    expect(entrar.mock.calls[0]![0].aparelhoId).toBe(id(42));
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(42) });
    expect(novoId).not.toHaveBeenCalled();
  });

  it('compartilha a criação entre requisições concorrentes', async () => {
    const armazenamento = new ArmazenamentoMemoria(); const novoId = vi.fn(criarContadorDeIds());
    const { dados, entrar } = criarDados(armazenamento, novoId);
    await Promise.all(['111111', '222222', '333333'].map((codigo) => dados.entrar('ana@example.test', codigo)));
    expect(novoId).toHaveBeenCalledOnce();
    expect(entrar.mock.calls.map(([p]) => p.aparelhoId)).toEqual([id(1), id(1), id(1)]);
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(1) });
  });

  it.each(['{inválido', 'null', JSON.stringify({ aparelhoId: 'não-uuid' }), JSON.stringify({ outro: id(1) })])('bloqueia dados corrompidos sem apagá-los', async (bruto) => {
    const armazenamento = new ArmazenamentoMemoria(); armazenamento.dados.set('instalacao', bruto);
    const novoId = vi.fn(() => id(1)); const { dados, entrar } = criarDados(armazenamento, novoId);
    await expect(dados.entrar('ana@example.test', '123456')).rejects.toThrow();
    expect(armazenamento.dados.get('instalacao')).toBe(bruto);
    expect(novoId).not.toHaveBeenCalled(); expect(entrar).not.toHaveBeenCalled();
  });

  it('falha antes do backend se não gravar e permite nova tentativa', async () => {
    const armazenamento = new ArmazenamentoMemoria(); const gravar = armazenamento.gravar.bind(armazenamento);
    vi.spyOn(armazenamento, 'gravar').mockRejectedValueOnce(new Error('falha de gravação')).mockImplementation(gravar);
    const { dados, entrar } = criarDados(armazenamento);
    await expect(dados.entrar('ana@example.test', '123456')).rejects.toThrow('falha de gravação');
    expect(entrar).not.toHaveBeenCalled(); expect(await armazenamento.obter('instalacao')).toBeNull();
    await dados.entrar('ana@example.test', '123456');
    const salvo = await armazenamento.obter<{ aparelhoId: string }>('instalacao');
    expect(salvo?.aparelhoId).toBe(id(2)); expect(entrar.mock.calls[0]![0].aparelhoId).toBe(salvo?.aparelhoId);
  });

  it('reutiliza o ID salvo ao recriar o repositório sem regravar', async () => {
    const armazenamento = new ArmazenamentoMemoria(); const gravar = vi.spyOn(armazenamento, 'gravar');
    expect(await new InstalacaoRepo(armazenamento, () => id(7)).obterOuCriar()).toBe(id(7));
    expect(await new InstalacaoRepo(armazenamento, () => id(8)).obterOuCriar()).toBe(id(7));
    expect(gravar).toHaveBeenCalledOnce();
  });

  it('interrompe antes do backend quando a leitura falha e permite retentativa', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    await armazenamento.gravar('instalacao', { aparelhoId: id(7) });
    const bruto = armazenamento.dados.get('instalacao');
    const obter = armazenamento.obter.bind(armazenamento);
    vi.spyOn(armazenamento, 'obter').mockRejectedValueOnce(new Error('falha de leitura')).mockImplementation(obter);
    const novoId = vi.fn(() => id(8)); const { dados, entrar } = criarDados(armazenamento, novoId);
    await expect(dados.entrar('ana@example.test', '123456')).rejects.toThrow('falha de leitura');
    expect(entrar).not.toHaveBeenCalled(); expect(novoId).not.toHaveBeenCalled();
    expect(armazenamento.dados.get('instalacao')).toBe(bruto);
    await dados.entrar('ana@example.test', '654321');
    expect(entrar.mock.calls[0]![0].aparelhoId).toBe(id(7));
    expect(armazenamento.dados.get('instalacao')).toBe(bruto);
  });

  it('preserva o ID salvo quando o backend falha e o reutiliza na retentativa', async () => {
    const armazenamento = new ArmazenamentoMemoria(); const novoId = vi.fn(criarContadorDeIds());
    const { dados, entrar } = criarDados(armazenamento, novoId);
    entrar.mockRejectedValueOnce(new Error('falha no backend'));
    await expect(dados.entrar('ana@example.test', '123456')).rejects.toThrow('falha no backend');
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(1) });
    await dados.entrar('ana@example.test', '654321');
    expect(entrar.mock.calls.map(([p]) => [p.aparelhoId, p.codigo])).toEqual([[id(1), '123456'], [id(1), '654321']]);
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(1) });
    expect(novoId).toHaveBeenCalledOnce();
  });

  it('preserva a instalação global e o aparelho autorizado da sessão legada sem gerar outro', async () => {
    const armazenamento = new ArmazenamentoMemoria();
    await armazenamento.gravar('instalacao', { aparelhoId: id(7) });
    await armazenamento.gravar('conta', { sessao: sessao(id(42)), perfil: null });
    const gravar = vi.spyOn(armazenamento, 'gravar'); const novoId = vi.fn(() => id(8));
    const { dados, entrar } = criarDados(armazenamento, novoId);
    await dados.conta.carregar(); await dados.entrar('ana@example.test', '123456');
    expect(entrar.mock.calls[0]![0].aparelhoId).toBe(id(42));
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(7) });
    expect(await armazenamento.obter('instalacao_aparelhos')).toEqual({ versao: 1, aparelhos: { 'ana@example.test': id(42) } });
    expect(gravar.mock.calls.filter(([chave]) => chave === 'instalacao')).toHaveLength(0);
    expect(novoId).not.toHaveBeenCalled();
    expect(await armazenamento.obter('instalacao')).toEqual({ aparelhoId: id(7) });
  });
});
