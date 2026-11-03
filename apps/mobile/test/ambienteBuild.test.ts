import { expect, it, vi, afterEach } from 'vitest';
import { resolverAmbiente } from '../config/ambiente';
import { Dados } from '@/dados/dados';
import { ArmazenamentoMemoria } from './ambiente';
import { gerarId } from '@pdv/shared';

const base = { desenvolvimento: false, ferramentasTeste: false };
afterEach(() => vi.restoreAllMocks());

it('exige escolha explícita em release e URL nos perfis conectados', () => {
  expect(() => resolverAmbiente(base)).toThrow('EXPO_PUBLIC_AMBIENTE');
  expect(() => resolverAmbiente({ ...base, desenvolvimento: true })).toThrow('EXPO_PUBLIC_AMBIENTE');
  for (const ambiente of ['homologacao', 'producao']) {
    for (const urlApi of [undefined, '', 'http://api.example.com', 'https://u:s@api.example.com', 'https://api.example.com/?token=segredo']) {
      expect(() => resolverAmbiente({ ...base, ambiente, urlApi })).toThrow();
    }
    expect(resolverAmbiente({ ...base, ambiente, urlApi: 'https://api.example.com/' })).toMatchObject({ modo: 'http', urlApi: 'https://api.example.com' });
  }
});

it('isola demo e impede ferramentas em produção', () => {
  expect(resolverAmbiente({ ...base, ambiente: 'demo' }).modo).toBe('demo');
  expect(() => resolverAmbiente({ ...base, ambiente: 'demo', urlApi: 'https://api.example.com' })).toThrow();
  for (const ambiente of ['homologacao', 'producao']) expect(() => resolverAmbiente({ ...base, ambiente, urlApi: 'https://api.example.com', ferramentasTeste: true })).toThrow();
});

it('falha de rede no cadastro conectado preserva HTTP e não cria conta ou semente demo', async () => {
  const cfg = resolverAmbiente({ ...base, ambiente: 'homologacao', urlApi: 'https://api.example.com' });
  const dados = new Dados(new ArmazenamentoMemoria(), gerarId, cfg.urlApi);
  await dados.iniciar();
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  await expect(dados.criarConta({ email: 'teste@example.com', documento: '12345678901', nomeResponsavel: 'Teste', nomeLoja: 'Homologação', tipoLoja: 'Mercado' })).rejects.toMatchObject({ codigo: 'rede' });
  expect(dados.backend.modo).toBe('http');
  expect(dados.conta.obter().identidade).toBeNull();
  expect(dados.produtos.listar()).toHaveLength(0);
  expect(dados.vendas.listar()).toHaveLength(0);
});
