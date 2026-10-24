import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conexao } from '../src/db/conexao';
import { AssinaturaResSchema, gerarId, LoginResSchema, MockBillingProvider, PLANOS_ORDEM, RelogioFalso } from '@pdv/shared';
import { criarApp } from '../src/servidor';
import { abrirBanco, assinar, chamar, contaEmTeste, criarAmbiente, criarConta, INICIO, NUMEROS, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => {
  banco = await abrirBanco();
});
afterAll(() => banco.fechar());
beforeEach(async () => {
  amb = await criarAmbiente(banco);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await amb.fechar();
});

async function pedirCodigo(email: string): Promise<string> {
  const res = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email } });
  expect(res.status).toBe(200);
  return res.corpo.codigo;
}

describe('saúde e catálogo', () => {
  it('GET /saude responde 200', async () => {
    const res = await chamar(amb, 'GET', '/saude');
    expect(res).toEqual({ status: 200, corpo: { status: 'ok' } });
  });

  it('GET /planos devolve o catálogo na ordem dos planos', async () => {
    const res = await chamar(amb, 'GET', '/planos');
    expect(res.status).toBe(200);
    expect(res.corpo.map((p: { id: string }) => p.id)).toEqual([...PLANOS_ORDEM]);
    expect(res.corpo[1].precoMensalCentavos).toBe(3490);
  });

  it('rota inexistente devolve erro em português', async () => {
    const res = await chamar(amb, 'GET', '/nada');
    expect(res.status).toBe(404);
    expect(res.corpo).toEqual({ erro: 'rota_nao_encontrada', mensagem: 'Rota não encontrada.' });
  });
});

describe('POST /contas', () => {
  it('cria conta, loja, dono, aparelho e sessão', async () => {
    const conta = await criarConta(amb);
    expect(conta.token.length).toBeGreaterThan(20);
    const res = await chamar(amb, 'GET', '/assinatura', { token: conta.token });
    expect(res.status).toBe(200);
    expect(res.corpo.assinatura.status).toBe('sem_assinatura');
  });

  it('rejeita documento e e-mail repetidos', async () => {
    const conta = await criarConta(amb);
    const base = { nomeResponsavel: 'Outro', nomeLoja: 'Outra', aparelhoNome: 'Cel' };

    const mesmoDocumento = await chamar(amb, 'POST', '/contas', {
      corpo: { ...base, email: 'novo@exemplo.com.br', documento: conta.documento, aparelhoId: gerarId() },
    });
    expect(mesmoDocumento.status).toBe(409);
    expect(mesmoDocumento.corpo.erro).toBe('documento_ja_cadastrado');

    const mesmoEmail = await chamar(amb, 'POST', '/contas', {
      corpo: { ...base, email: conta.email.toUpperCase(), documento: '99999999999', aparelhoId: gerarId() },
    });
    expect(mesmoEmail.status).toBe(409);
    expect(mesmoEmail.corpo.erro).toBe('email_ja_cadastrado');
  });

  it('valida a entrada com mensagem em português', async () => {
    const res = await chamar(amb, 'POST', '/contas', { corpo: { email: 'nao-e-email' } });
    expect(res.status).toBe(400);
    expect(res.corpo.erro).toBe('requisicao_invalida');
    expect(res.corpo.mensagem).toMatch(/^Requisição inválida/);
  });
});

describe('autenticação', () => {
  it('rotas protegidas exigem token', async () => {
    expect((await chamar(amb, 'GET', '/assinatura')).status).toBe(401);
    const invalido = await chamar(amb, 'GET', '/assinatura', { token: 'qualquer' });
    expect(invalido.status).toBe(401);
    expect(invalido.corpo.erro).toBe('nao_autenticado');
  });

  it('login por código: cria a sessão do aparelho novo', async () => {
    const conta = await criarConta(amb);
    const codigo = await pedirCodigo(conta.email);
    expect(codigo).toMatch(/^\d{6}$/);

    const res = await chamar(amb, 'POST', '/auth/login', {
      corpo: { email: conta.email, codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'Celular renomeado' },
    });
    expect(res.status).toBe(200);
    const sessao = LoginResSchema.parse(res.corpo);
    expect(sessao).toMatchObject({ contaId: conta.contaId, lojaId: conta.lojaId, operadorId: conta.operadorId });
    expect((await chamar(amb, 'GET', '/assinatura', { token: sessao.token })).status).toBe(200);
  });

  it('o código vale uma vez só', async () => {
    const conta = await criarConta(amb);
    const codigo = await pedirCodigo(conta.email);
    const corpo = { email: conta.email, codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'Cel' };
    expect((await chamar(amb, 'POST', '/auth/login', { corpo })).status).toBe(200);
    const repetido = await chamar(amb, 'POST', '/auth/login', { corpo });
    expect(repetido.status).toBe(401);
    expect(repetido.corpo.erro).toBe('codigo_invalido');
  });

  it('o código expira em 10 minutos', async () => {
    const conta = await criarConta(amb);
    const codigo = await pedirCodigo(conta.email);
    amb.relogio.avancarHoras(1);
    const res = await chamar(amb, 'POST', '/auth/login', {
      corpo: { email: conta.email, codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'Cel' },
    });
    expect(res.status).toBe(401);
  });

  it('bloqueia o código depois de 5 tentativas erradas', async () => {
    const conta = await criarConta(amb);
    const codigo = await pedirCodigo(conta.email);
    const errado = codigo === '000000' ? '111111' : '000000';
    const corpo = (c: string) => ({ email: conta.email, codigo: c, aparelhoId: conta.aparelhoId, aparelhoNome: 'Cel' });
    for (let i = 0; i < 5; i++) {
      expect((await chamar(amb, 'POST', '/auth/login', { corpo: corpo(errado) })).status).toBe(401);
    }
    expect((await chamar(amb, 'POST', '/auth/login', { corpo: corpo(codigo) })).status).toBe(401);
  });

  it('e-mail desconhecido não gera código e não revela que não existe', async () => {
    const res = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: 'ninguem@exemplo.com.br' } });
    expect(res.status).toBe(204);
  });

  it('em produção o código só é enviado, nunca devolvido', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const producao = await criarApp({ db: amb.db, relogio: new RelogioFalso(INICIO), billing: new MockBillingProvider() });
    const dados = { email: 'prod@exemplo.com.br', nomeResponsavel: 'P', nomeLoja: 'L', documento: '12345678901', aparelhoId: gerarId(), aparelhoNome: 'C' };
    expect((await producao.inject({ method: 'POST', url: '/contas', payload: dados })).statusCode).toBe(201);
    const res = await producao.inject({ method: 'POST', url: '/auth/codigo', payload: { email: dados.email } });
    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    await producao.close();
  });

  it('limite de aparelhos do plano: 409 limite_aparelhos até o upgrade', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    const entrarComNovoAparelho = async () => {
      const codigo = await pedirCodigo(conta.email);
      return chamar(amb, 'POST', '/auth/login', {
        corpo: { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Segundo celular' },
      });
    };

    const bloqueado = await entrarComNovoAparelho();
    expect(bloqueado.status).toBe(409);
    expect(bloqueado.corpo.erro).toBe('limite_aparelhos');

    const troca = await chamar(amb, 'POST', '/assinatura/trocar-plano', { token: conta.token, corpo: { planoId: 'negocio' } });
    expect(troca.status).toBe(200);
    expect((await entrarComNovoAparelho()).status).toBe(200);
  });

  it('aparelho de outra conta não pode ser reaproveitado', async () => {
    const a = await criarConta(amb);
    const b = await criarConta(amb);
    const codigo = await pedirCodigo(b.email);
    const res = await chamar(amb, 'POST', '/auth/login', {
      corpo: { email: b.email, codigo, aparelhoId: a.aparelhoId, aparelhoNome: 'Cel' },
    });
    expect(res.status).toBe(409);
    expect(res.corpo.erro).toBe('aparelho_em_uso');
  });
});

describe('POST /assinatura (primeiros passos)', () => {
  it('conta nova -> login por código -> assinatura com 4242 -> em_teste', async () => {
    const conta = await criarConta(amb);
    const codigo = await pedirCodigo(conta.email);
    const login = await chamar(amb, 'POST', '/auth/login', {
      corpo: { email: conta.email, codigo, aparelhoId: conta.aparelhoId, aparelhoNome: 'Cel' },
    });
    const token: string = login.corpo.token;

    const criada = await assinar(amb, token, 'negocio', NUMEROS.aprova);
    expect(criada.status).toBe(201);

    const res = await chamar(amb, 'GET', '/assinatura', { token });
    expect(res.status).toBe(200);
    const { assinatura, licenca } = AssinaturaResSchema.parse(res.corpo);
    expect(assinatura).toMatchObject({
      status: 'em_teste',
      planoId: 'negocio',
      tentativasFalhas: 0,
      cartao: { bandeira: 'visa', ultimos4: '4242' },
    });
    expect(assinatura.testeTerminaEm).toBe('2026-03-17T12:00:00.000Z');
    expect(licenca).toMatchObject({ planoId: 'negocio', status: 'em_teste' });
    expect(JSON.stringify(res.corpo)).not.toContain('tok_mock');
  });
});
