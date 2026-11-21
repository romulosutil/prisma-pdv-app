import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getTableName, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { AssinaturaResSchema, gerarId, LoginResSchema, MockBillingProvider, RelogioFalso } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import * as schema from '../src/db/schema';
import { codigosLogin, entregasCodigo } from '../src/db/schema';
import { criarApp } from '../src/servidor';
import { abrirBanco, chamar, criarConta, INICIO, type Ambiente } from './ajuda';
import { cadastroComProva, emissaoTeste } from './emailFixture';

const EMAIL_REVISOR = 'revisor-play@exemplo.com.br';
const CODIGO_REVISOR = '482917';
const TABELAS = Object.values(schema)
  .filter((t) => is(t, PgTable))
  .map((t) => `"${getTableName(t)}"`)
  .join(', ');

let banco: Conexao;
let amb: Ambiente;

async function criarAmbienteRevisor(): Promise<Ambiente> {
  await banco.db.execute(sql.raw(`truncate table ${TABELAS} restart identity cascade`));
  const relogio = new RelogioFalso(INICIO);
  const mock = new MockBillingProvider();
  const app = await criarApp({
    db: banco.db,
    relogio,
    billing: mock,
    billingProvider: 'google_play',
    fontesEan: [],
    emissaoCodigo: emissaoTeste,
    revisorPlay: { email: EMAIL_REVISOR, codigo: CODIGO_REVISOR },
  });
  return { app, db: banco.db, relogio, billing: mock, mock, fechar: () => app.close() };
}

beforeAll(async () => {
  banco = await abrirBanco();
});

afterAll(() => banco.fechar());

beforeEach(async () => {
  amb = await criarAmbienteRevisor();
});

afterEach(async () => {
  await amb.fechar();
});

describe('conta dedicada para revisão do Google Play', () => {
  it('POST /auth/codigo responde 204 sem enfileirar e-mail nem bloquear após 5 pedidos consecutivos', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await amb.app.inject({
        method: 'POST',
        url: '/auth/codigo',
        payload: { email: EMAIL_REVISOR },
        remoteAddress: `10.0.0.${i + 1}`,
      });
      expect(res.statusCode).toBe(204);
      expect(res.body).toBe('');
    }

    expect(await amb.db.select().from(codigosLogin)).toHaveLength(0);
    expect(await amb.db.select().from(entregasCodigo)).toHaveLength(0);
  });

  it('provisiona automaticamente conta Pro liberada e reutiliza o PIN fixo em mais de 10 aparelhos', async () => {
    const vinculosRes = await chamar(amb, 'POST', '/auth/vinculos', {
      corpo: { email: EMAIL_REVISOR.toUpperCase(), codigo: CODIGO_REVISOR },
    });
    expect(vinculosRes.status).toBe(200);
    expect(vinculosRes.corpo).toHaveLength(1);
    expect(vinculosRes.corpo[0]).toMatchObject({
      email: EMAIL_REVISOR,
      nomeLoja: 'Loja Demo Prisma PDV',
      papel: 'dono',
      estado: 'ativo',
    });

    const primeiroLogin = await chamar(amb, 'POST', '/auth/login', {
      corpo: {
        email: EMAIL_REVISOR,
        codigo: CODIGO_REVISOR,
        aparelhoId: gerarId(),
        aparelhoNome: 'Play Review Device 1',
      },
    });
    expect(primeiroLogin.status).toBe(200);
    const sessao = LoginResSchema.parse(primeiroLogin.corpo);
    expect(sessao.papel).toBe('dono');

    const assinaturaRes = await chamar(amb, 'GET', '/assinatura', { token: sessao.token });
    expect(assinaturaRes.status).toBe(200);
    const assinatura = AssinaturaResSchema.parse(assinaturaRes.corpo);
    expect(assinatura.assinatura.status).toBe('liberada');
    expect(assinatura.assinatura.planoId).toBe('pro');
    expect(assinatura.licenca.planoId).toBe('pro');
    expect(assinatura.licenca.status).toBe('liberada');
    expect(assinatura.licenca.recursos).toContain('integracao_pagamentos');

    // Avança vários dias e autentica 11 novos aparelhos distintos (total 12 > teto de 10 do Pro).
    amb.relogio.avancarDias(2);
    for (let i = 2; i <= 12; i++) {
      const loginExtra = await chamar(amb, 'POST', '/auth/login', {
        corpo: {
          email: EMAIL_REVISOR,
          codigo: CODIGO_REVISOR,
          aparelhoId: gerarId(),
          aparelhoNome: `Play Review Device ${i}`,
        },
      });
      expect(loginExtra.status).toBe(200);
    }
  });

  it('rejeita PIN incorreto com 401 e mantém limite de tentativas contra força bruta', async () => {
    for (let i = 0; i < 5; i++) {
      const falha = await chamar(amb, 'POST', '/auth/login', {
        corpo: {
          email: EMAIL_REVISOR,
          codigo: '000000',
          aparelhoId: gerarId(),
          aparelhoNome: `Tentativa ${i + 1}`,
        },
      });
      expect(falha.status).toBe(401);
      expect(falha.corpo.erro).toBe('codigo_invalido');
    }

    // Após 5 falhas na janela de 15 min, nem o PIN correto passa antes de expirar o bloqueio.
    const bloqueado = await chamar(amb, 'POST', '/auth/login', {
      corpo: {
        email: EMAIL_REVISOR,
        codigo: CODIGO_REVISOR,
        aparelhoId: gerarId(),
        aparelhoNome: 'Device Após Bloqueio',
      },
    });
    expect(bloqueado.status).toBe(401);
    expect(bloqueado.corpo.erro).toBe('codigo_invalido');
  });

  it('não aceita o PIN fixo na recuperação de aparelho nem permite sequestro em POST /contas', async () => {
    const cadastroBloqueado = await chamar(amb, 'POST', '/contas', {
      corpo: {
        email: EMAIL_REVISOR.toUpperCase(),
        documento: '11122233344',
        nomeResponsavel: 'Terceiro',
        nomeLoja: 'Loja Terceiro',
        aparelhoId: gerarId(),
        aparelhoNome: 'Celular Terceiro',
      },
    });
    expect(cadastroBloqueado.status).toBe(409);
    expect(cadastroBloqueado.corpo.erro).toBe('email_ja_cadastrado');

    await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: EMAIL_REVISOR } });

    const rec = await chamar(amb, 'POST', '/auth/recuperacao', {
      corpo: {
        email: EMAIL_REVISOR,
        codigo: CODIGO_REVISOR,
        aparelhoId: gerarId(),
        aparelhoNome: 'Outro Celular',
      },
    });
    expect(rec.status).toBe(401);
    expect(rec.corpo.erro).toBe('codigo_invalido');
  });

  it('mantém contas normais com OTP efêmero e limite de aparelhos do plano', async () => {
    const dadosComProva = await cadastroComProva(amb.app, amb.db, {
      email: 'normal@exemplo.com.br',
      documento: '12345678909',
      nomeResponsavel: 'Lojista Normal',
      nomeLoja: 'Loja Normal',
      aparelhoId: gerarId(),
      aparelhoNome: 'Celular 1',
    });
    const criada = await criarConta(amb, dadosComProva);
    expect(criada.token.length).toBeGreaterThan(20);

    const pediu = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: 'normal@exemplo.com.br' } });
    expect(pediu.status).toBe(204);

    const tentouPinRevisor = await chamar(amb, 'POST', '/auth/login', {
      corpo: {
        email: 'normal@exemplo.com.br',
        codigo: CODIGO_REVISOR,
        aparelhoId: gerarId(),
        aparelhoNome: 'Celular 2',
      },
    });
    expect(tentouPinRevisor.status).toBe(401);

    const [entrega] = await amb.db.select().from(entregasCodigo).where(sql`conta_id = ${criada.contaId}`);
    if (!entrega || emissaoTeste.modo !== 'email') throw new Error('Entrega esperada não encontrada.');
    const decifrado = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(entrega.envelope, {
      id: entrega.id,
      codigoId: entrega.codigoId,
    });

    // No plano Free (1 aparelho), um 2º aparelho é bloqueado normalmente.
    const segundoAparelho = await chamar(amb, 'POST', '/auth/login', {
      corpo: {
        email: 'normal@exemplo.com.br',
        codigo: decifrado.codigo,
        aparelhoId: gerarId(),
        aparelhoNome: 'Celular 2',
      },
    });
    expect(segundoAparelho.status).toBe(409);
    expect(segundoAparelho.corpo.erro).toBe('limite_aparelhos');
  });
});
