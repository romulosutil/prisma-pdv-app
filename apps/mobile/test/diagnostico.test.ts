import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sanitizar, sanitizarTexto } from '@/diagnostico/sanitizar';
import { ArmazenamentoMemoria } from './ambiente';

/** Carrega o registro com a flag das ferramentas de teste ligada ou desligada (estado do módulo é novo a cada chamada). */
async function carregar(ligada: boolean) {
  vi.resetModules();
  vi.doMock('@/util/ferramentasTeste', () => ({ FERRAMENTAS_TESTE: ligada }));
  return import('@/diagnostico/registro');
}

const CONTEXTO = {
  app: { versao: '0.1.1', versionCode: 2, ferramentasTeste: true, modo: 'demo' as const },
  aparelho: { marca: 'samsung', modelo: 'SM-A146B', so: 'android', versaoSo: '14 (API 34)' },
  estado: { rotaAtual: null, plano: 'essencial', statusAssinatura: 'em_teste', produtos: 12, vendasHoje: 3 },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-24T15:30:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('@/util/ferramentasTeste');
});

describe('sanitizarTexto', () => {
  it('mascara CPF formatado mantendo os 4 últimos dígitos', () => {
    expect(sanitizarTexto('cliente 123.456.747-25 pagou')).toBe('cliente ***.***.*47-25 pagou');
  });

  it('mascara CPF sem formatação', () => {
    expect(sanitizarTexto('doc=12345674725')).toBe('doc=***.***.*47-25');
  });

  it('mascara CNPJ formatado e sem formatação', () => {
    expect(sanitizarTexto('12.345.678/0001-95')).toBe('**.***.***/**01-95');
    expect(sanitizarTexto('CNPJ 12345678000195')).not.toContain('12345678');
  });

  it('mascara e-mail mantendo a primeira letra e o domínio', () => {
    expect(sanitizarTexto('login de ana.souza@bompreco.com.br falhou')).toBe('login de a***@bompreco.com.br falhou');
  });

  it.each([
    ['4111111111111111', 'Visa 16'],
    ['4111 1111 1111 1111', 'com espaços'],
    ['4111-1111-1111-1111', 'com hífens'],
    ['3782 822463 10005', 'Amex 15'],
    ['4222222222222', '13 dígitos'],
    ['6011111111111117123', '19 dígitos'],
  ])('remove número de cartão em texto livre (%s, %s)', (numero) => {
    const limpo = sanitizarTexto(`falha no cartão ${numero} ao cobrar`);
    expect(limpo).toBe('falha no cartão [removido] ao cobrar');
    expect(limpo).not.toMatch(/\d{4}/);
  });

  it('não mexe em números curtos nem em datas', () => {
    expect(sanitizarTexto('venda #000231 às 2026-10-24 total 1990')).toBe('venda #000231 às 2026-10-24 total 1990');
  });

  it('remove tokens, JWT e pares token=valor', () => {
    expect(sanitizarTexto('Authorization: Bearer abc.def-123')).not.toContain('abc.def');
    expect(sanitizarTexto('header Bearer abc.def-123')).toBe('header Bearer [removido]');
    expect(sanitizarTexto('jwt eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM')).toBe('jwt [removido]');
    expect(sanitizarTexto('token=abc123 cvv: 123 senha="x9"')).toBe('token=[removido] cvv: [removido] senha="[removido]"');
    expect(sanitizarTexto('tok_mock_9f8e7d')).toBe('[removido]');
  });
});

describe('sanitizar', () => {
  it('remove valores de chaves sensíveis, qualquer que seja o tipo', () => {
    const saida = sanitizar({
      numero: '4111111111111111',
      cvv: 123,
      token: 'abc',
      tokenCartao: 'tok_1',
      codigoLogin: '482913',
      cliente: 'Maria da Silva',
      sessao: { token: 'x' },
      meio: 'cartao',
    });
    expect(saida).toEqual({
      numero: '[removido]',
      cvv: '[removido]',
      token: '[removido]',
      tokenCartao: '[removido]',
      codigoLogin: '[removido]',
      cliente: '[removido]',
      sessao: '[removido]',
      meio: 'cartao',
    });
  });

  it('mascara documentos e e-mails em qualquer nível', () => {
    expect(sanitizar({ documento: '12345674725', loja: { cnpj: '12345678000195', contato: 'a@x.com.br' }, itens: ['maria@bompreco.com.br'] })).toEqual({
      documento: '***.***.*47-25',
      loja: { cnpj: '**.***.***/**01-95', contato: 'a***@x.com.br' },
      itens: ['m***@bompreco.com.br'],
    });
  });

  it('preserva o código de barras lido (8 a 14 dígitos) e o resto dos dados úteis', () => {
    expect(sanitizar({ tipo: 'ean13', codigo: '7891000100103', origem: 'camera', ignorada: false })).toEqual({
      tipo: 'ean13',
      codigo: '7891000100103',
      origem: 'camera',
      ignorada: false,
    });
  });

  it('serializa Error com nome, mensagem e pilha sanitizados', () => {
    const erro = new Error('falha para ana@x.com.br');
    const saida = sanitizar({ erro }) as { erro: { name: string; message: string; stack?: string } };
    expect(saida.erro.name).toBe('Error');
    expect(saida.erro.message).toBe('falha para a***@x.com.br');
    expect(saida.erro.stack).not.toContain('ana@x.com.br');
  });

  it('limita tamanho, profundidade e referências circulares', () => {
    const circular: Record<string, unknown> = { nome: 'a' };
    circular.eu = circular;
    expect(() => JSON.stringify(sanitizar(circular))).not.toThrow();
    const longo = sanitizar({ texto: 'x'.repeat(5000), lista: Array.from({ length: 100 }, (_, i) => i) }) as { texto: string; lista: unknown[] };
    expect(longo.texto.length).toBeLessThanOrEqual(401);
    expect(longo.lista.length).toBe(21);
    expect(sanitizar(() => 1)).toBe('[função]');
    expect(sanitizar(undefined)).toBeUndefined();
  });
});

describe('registro com as ferramentas de teste ligadas', () => {
  it('guarda no máximo 500 eventos, descartando os mais antigos', async () => {
    const r = await carregar(true);
    for (let i = 0; i < 620; i++) r.registrar('app', `evento ${i}`);
    expect(r.quantidadeDeEventos()).toBe(r.LIMITE_EVENTOS);
    const { eventos } = await r.exportar();
    expect(eventos).toHaveLength(500);
    expect(eventos[0]?.msg).toBe('evento 120');
    expect(eventos[499]?.msg).toBe('evento 619');
  });

  it('cada evento tem t (ISO), cat, msg e dados sanitizados', async () => {
    const r = await carregar(true);
    r.registrar('leitura', 'código lido de ana@x.com.br', { codigo: '7891000100103', token: 'segredo' });
    r.registrar('app', 'sem dados');
    const { eventos } = await r.exportar();
    expect(eventos[0]).toEqual({
      t: '2026-10-24T15:30:00.000Z',
      cat: 'leitura',
      msg: 'código lido de a***@x.com.br',
      dados: { codigo: '7891000100103', token: '[removido]' },
    });
    expect(eventos[1]).not.toHaveProperty('dados');
  });

  it('exporta a estrutura completa com o contexto informado', async () => {
    const r = await carregar(true);
    r.definirFonteDeContexto(() => CONTEXTO);
    r.definirRotaAtual('/vender');
    r.registrar('navegacao', '/vender');
    const json = await r.exportar();
    expect(Object.keys(json)).toEqual(['geradoEm', 'app', 'aparelho', 'estado', 'eventos']);
    expect(json.geradoEm).toBe('2026-10-24T15:30:00.000Z');
    expect(json.app).toEqual({ versao: '0.1.1', versionCode: 2, ferramentasTeste: true, modo: 'demo' });
    expect(json.aparelho).toEqual(CONTEXTO.aparelho);
    expect(json.estado).toEqual({ ...CONTEXTO.estado, rotaAtual: '/vender' });
    expect(json.eventos).toHaveLength(1);
    expect(() => JSON.parse(JSON.stringify(json))).not.toThrow();
  });

  it('exporta mesmo se a fonte de contexto falhar', async () => {
    const r = await carregar(true);
    r.definirFonteDeContexto(() => {
      throw new Error('boom');
    });
    r.registrar('app', 'a');
    const json = await r.exportar();
    expect(json.eventos).toHaveLength(1);
    expect(json.app.ferramentasTeste).toBe(true);
  });

  it('grava no armazenamento com debounce de 1 s e mantém os eventos da abertura anterior', async () => {
    const r1 = await carregar(true);
    const memoria = new ArmazenamentoMemoria();
    await r1.iniciarRegistro(memoria);
    r1.registrar('app', 'primeiro');
    r1.registrar('erro', 'segundo');
    await vi.advanceTimersByTimeAsync(900);
    expect(await memoria.obter(r1.CHAVE_DIAGNOSTICO)).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(await memoria.obter<{ msg: string }[]>(r1.CHAVE_DIAGNOSTICO)).toHaveLength(2);

    // "Reabre" o app: módulo novo, mesmo armazenamento.
    const r2 = await carregar(true);
    r2.registrar('app', 'antes de carregar');
    await r2.iniciarRegistro(memoria);
    r2.registrar('app', 'terceiro');
    const { eventos } = await r2.exportar();
    expect(eventos.map((e) => e.msg)).toEqual(['primeiro', 'segundo', 'antes de carregar', 'terceiro']);
  });

  it('salvarAgora grava sem esperar o debounce', async () => {
    const r = await carregar(true);
    const memoria = new ArmazenamentoMemoria();
    await r.iniciarRegistro(memoria);
    r.registrar('erro', 'fatal');
    await r.salvarAgora();
    expect(await memoria.obter<unknown[]>(r.CHAVE_DIAGNOSTICO)).toHaveLength(1);
  });

  it('limpar apaga a memória e o armazenamento', async () => {
    const r = await carregar(true);
    const memoria = new ArmazenamentoMemoria();
    await r.iniciarRegistro(memoria);
    r.registrar('app', 'x');
    await r.salvarAgora();
    await r.limpar();
    expect(r.quantidadeDeEventos()).toBe(0);
    expect(await memoria.obter(r.CHAVE_DIAGNOSTICO)).toBeNull();
    expect((await r.exportar()).eventos).toEqual([]);
  });

  it('avisa os ouvintes ao gravar e ao limpar', async () => {
    const r = await carregar(true);
    await r.iniciarRegistro(new ArmazenamentoMemoria());
    const ouvinte = vi.fn();
    const cancelar = r.assinarRegistro(ouvinte);
    r.registrar('app', 'x');
    await vi.advanceTimersByTimeAsync(1100);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    await r.limpar();
    expect(ouvinte).toHaveBeenCalledTimes(2);
    cancelar();
    await r.limpar();
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it('nunca lança, mesmo com dados estranhos', async () => {
    const r = await carregar(true);
    const hostil = {
      get ruim(): never {
        throw new Error('getter');
      },
    };
    expect(() => r.registrar('erro', 'x', hostil)).not.toThrow();
  });
});

describe('registro com as ferramentas de teste desligadas', () => {
  it('não registra, não grava e não lê o armazenamento', async () => {
    const r = await carregar(false);
    const memoria = new ArmazenamentoMemoria();
    const obter = vi.spyOn(memoria, 'obter');
    const gravar = vi.spyOn(memoria, 'gravar');
    await r.iniciarRegistro(memoria);
    r.definirFonteDeContexto(() => CONTEXTO);
    r.definirRotaAtual('/vender');
    r.registrar('erro', 'não deveria existir', { codigo: '7891000100103' });
    await vi.advanceTimersByTimeAsync(5000);
    await r.salvarAgora();
    expect(r.quantidadeDeEventos()).toBe(0);
    expect(obter).not.toHaveBeenCalled();
    expect(gravar).not.toHaveBeenCalled();
    expect(memoria.dados.size).toBe(0);
  });

  it('exportar devolve estrutura vazia e indisponível', async () => {
    const r = await carregar(false);
    r.definirFonteDeContexto(() => CONTEXTO);
    r.registrar('erro', 'x');
    const json = await r.exportar();
    expect(json.eventos).toEqual([]);
    expect(json.app.ferramentasTeste).toBe(false);
    expect(json.app.modo).toBeNull();
    expect(json.aparelho.modelo).toBeNull();
    expect(json.estado.produtos).toBeNull();
  });

  it('limpar não toca no armazenamento', async () => {
    const r = await carregar(false);
    const memoria = new ArmazenamentoMemoria();
    const remover = vi.spyOn(memoria, 'remover');
    await r.limpar();
    expect(remover).not.toHaveBeenCalled();
  });
});

describe('nomeDoArquivo', () => {
  it('usa AAAAMMDD-HHMM da hora local', async () => {
    const r = await carregar(true);
    expect(r.nomeDoArquivo(new Date(2026, 9, 4, 8, 5))).toBe('diagnostico-20261004-0805.json');
  });
});
