import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gerarId } from '@pdv/shared';
import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Conexao } from '../src/db/conexao';
import { codigosLogin, limitesAuth, sessoes } from '../src/db/schema';
import { criarApp } from '../src/servidor';
import { abrirBanco, criarAmbiente, criarConta, contaEmTeste, INICIO, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
let outra: FastifyInstance;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => {
  amb = await criarAmbiente(banco);
  outra = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await outra.close(); await amb.fechar(); });

const pedir = (app: FastifyInstance, email: string, ip = '10.0.0.1', xff = '198.51.100.1') => app.inject({ method: 'POST', url: '/auth/codigo', payload: { email }, remoteAddress: ip, headers: { 'x-forwarded-for': xff } });
const login = (app: FastifyInstance, email: string, codigo: string, aparelhoId: string, ip = '10.0.0.1') => app.inject({ method: 'POST', url: '/auth/login', payload: { email, codigo, aparelhoId, aparelhoNome: 'Celular' }, remoteAddress: ip });
const erroLimite = { erro: 'limite_autenticacao', mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };

describe('limites de autenticação nas rotas', () => {
  it('aplica cooldown e orçamento compartilhado sem invalidar código recusado', async () => {
    const conta = await criarConta(amb);
    const primeiro = await pedir(amb.app, conta.email);
    const codigo = primeiro.json().codigo;
    expect(primeiro.statusCode).toBe(200);
    amb.relogio.definir(new Date(INICIO.getTime() + 59_999));
    const recusado = await pedir(outra, conta.email.toUpperCase());
    expect(recusado.statusCode).toBe(429);
    expect(recusado.json()).toEqual(erroLimite);
    expect((await login(outra, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(200);
    amb.relogio.definir(new Date(INICIO.getTime() + 60_000));
    expect((await pedir(outra, conta.email)).statusCode).toBe(200);
    amb.relogio.definir(new Date(INICIO.getTime() + 120_000));
    const terceiro = await pedir(amb.app, conta.email);
    expect(terceiro.statusCode).toBe(200);
    amb.relogio.definir(new Date(INICIO.getTime() + 180_000));
    expect((await pedir(outra, conta.email)).statusCode).toBe(429);
    expect((await login(amb.app, conta.email, terceiro.json().codigo, conta.aparelhoId)).statusCode).toBe(200);
    amb.relogio.definir(new Date(INICIO.getTime() + 900_000));
    expect((await pedir(outra, conta.email)).statusCode).toBe(200);
  });

  it('conta 20 pedidos válidos por IP, inclusive desconhecidos e bloqueados por email, ignorando XFF', async () => {
    expect((await pedir(amb.app, 'mesmo@exemplo.com')).statusCode).toBe(204);
    expect((await pedir(outra, 'mesmo@exemplo.com', '10.0.0.1', '203.0.113.2')).statusCode).toBe(429);
    for (let i = 0; i < 18; i++) expect((await pedir(amb.app, `desconhecido${i}@exemplo.com`, '10.0.0.1', `203.0.113.${i}`)).statusCode).toBe(204);
    const bloqueado = await pedir(outra, 'novo@exemplo.com', '10.0.0.1', '8.8.8.8');
    expect(bloqueado.statusCode).toBe(429);
    expect(bloqueado.json()).toEqual(erroLimite);
    expect((await pedir(outra, 'novo@exemplo.com', '10.0.0.2')).statusCode).toBe(204);
  });

  it('produção responde 204 vazio para conhecidos e desconhecidos e aplica o mesmo 429', async () => {
    const conta = await criarConta(amb);
    vi.stubEnv('NODE_ENV', 'production');
    const producao = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
    try {
      for (const email of [conta.email, 'ausente@exemplo.com']) {
        const resposta = await pedir(producao, email);
        expect([resposta.statusCode, resposta.body]).toEqual([204, '']);
        const repetida = await pedir(producao, email);
        expect([repetida.statusCode, repetida.json()]).toEqual([429, erroLimite]);
      }
    } finally { await producao.close(); }
  });

  it('mantém cinco falhas de email entre reemissão, IPs e instâncias', async () => {
    const conta = await criarConta(amb);
    const primeiro = await pedir(amb.app, conta.email);
    const errado = primeiro.json().codigo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 4; i++) expect((await login(i % 2 ? outra : amb.app, conta.email, errado, conta.aparelhoId, `10.0.0.${i + 1}`)).statusCode).toBe(401);
    amb.relogio.definir(new Date(INICIO.getTime() + 60_000));
    const novo = await pedir(outra, conta.email);
    expect(novo.statusCode).toBe(200);
    const novoErrado = novo.json().codigo === '000000' ? '111111' : '000000';
    expect((await login(outra, conta.email, novoErrado, conta.aparelhoId, '10.0.0.8')).statusCode).toBe(401);
    const bloqueado = await login(amb.app, conta.email, novo.json().codigo, conta.aparelhoId, '10.0.0.9');
    expect([bloqueado.statusCode, bloqueado.json().erro]).toEqual([401, 'codigo_invalido']);
    expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(1);
    expect((await amb.db.select().from(codigosLogin).where(eq(codigosLogin.email, conta.email))).filter((c) => c.usadoEm === null)).toHaveLength(1);
    amb.relogio.definir(new Date(INICIO.getTime() + 900_000));
    const terceiro = await pedir(amb.app, conta.email);
    expect(terceiro.statusCode).toBe(200);
    expect((await login(outra, conta.email, terceiro.json().codigo, conta.aparelhoId)).statusCode).toBe(200);
  });

  it('contabiliza código ausente, usado e expirado como falhas do email', async () => {
    const conta = await criarConta(amb);
    expect((await login(amb.app, conta.email, '000000', conta.aparelhoId)).statusCode).toBe(401);
    const primeiro = (await pedir(amb.app, conta.email)).json().codigo;
    expect((await login(outra, conta.email, primeiro, conta.aparelhoId)).statusCode).toBe(200);
    expect((await login(amb.app, conta.email, primeiro, conta.aparelhoId)).statusCode).toBe(401);
    amb.relogio.definir(new Date(INICIO.getTime() + 60_000));
    const expirado = (await pedir(outra, conta.email)).json().codigo;
    amb.relogio.definir(new Date(INICIO.getTime() + 660_000));
    expect((await login(outra, conta.email, expirado, conta.aparelhoId)).statusCode).toBe(401);
    const atual = (await pedir(amb.app, conta.email)).json().codigo;
    const errado = atual === '000000' ? '111111' : '000000';
    expect((await login(amb.app, conta.email, errado, conta.aparelhoId)).statusCode).toBe(401);
    expect((await login(outra, conta.email, errado, conta.aparelhoId)).statusCode).toBe(401);
    expect((await login(amb.app, conta.email, atual, conta.aparelhoId)).statusCode).toBe(401);
    const chave = createHash('sha256').update('falha_email:' + conta.email).digest('hex');
    expect((await amb.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)?.usos).toBe(5);
  });

  it('contabiliza login de conta inexistente sem revelar a conta', async () => {
    const email = 'ninguem@exemplo.com';
    for (let i = 0; i < 6; i++) {
      const resposta = await login(i % 2 ? outra : amb.app, email, '000000', gerarId());
      expect([resposta.statusCode, resposta.json().erro]).toEqual([401, 'codigo_invalido']);
    }
    const chave = createHash('sha256').update('falha_email:' + email).digest('hex');
    expect((await amb.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)?.usos).toBe(5);
  });

  it('aplica 50 logins por IP mesmo com emails diferentes e mantém sessão válida', async () => {
    const conta = await criarConta(amb);
    const outraConta = await criarConta(amb);
    const outroCodigo = (await pedir(outra, outraConta.email)).json().codigo;
    const cod = (await pedir(amb.app, conta.email)).json().codigo;
    const sucesso = await login(amb.app, conta.email, cod, conta.aparelhoId);
    expect(sucesso.statusCode).toBe(200);
    for (let i = 0; i < 49; i++) expect((await login(outra, `ausente${i}@exemplo.com`, '000000', gerarId())).statusCode).toBe(401);
    const corretoBloqueado = await login(outra, outraConta.email, outroCodigo, outraConta.aparelhoId);
    expect([corretoBloqueado.statusCode, corretoBloqueado.json()]).toEqual([429, erroLimite]);
    expect(await amb.db.$count(sessoes, eq(sessoes.contaId, outraConta.contaId))).toBe(1);
    expect((await login(outra, outraConta.email, outroCodigo, outraConta.aparelhoId, '10.0.0.3')).statusCode).toBe(200);
    const bloqueado = await login(amb.app, 'outro@exemplo.com', '000000', gerarId());
    expect([bloqueado.statusCode, bloqueado.json()]).toEqual([429, erroLimite]);
    expect((await amb.app.inject({ method: 'GET', url: '/conta', headers: { authorization: `Bearer ${sucesso.json().token}` } })).statusCode).toBe(200);
    expect((await login(outra, 'outro@exemplo.com', '000000', gerarId(), '10.0.0.2')).statusCode).toBe(401);
  });

  it('erro de aparelho preserva código e orçamento de falhas', async () => {
    const conta = await contaEmTeste(amb, 'essencial');
    const codigo = (await pedir(amb.app, conta.email)).json().codigo;
    const bloqueado = await login(outra, conta.email, codigo, gerarId());
    expect([bloqueado.statusCode, bloqueado.json().erro]).toEqual([409, 'limite_aparelhos']);
    const chaveIp = createHash('sha256').update('login_ip:10.0.0.1').digest('hex');
    const chaveEmail = createHash('sha256').update('falha_email:' + conta.email).digest('hex');
    const linhas = await amb.db.select().from(limitesAuth);
    expect(linhas.find((linha) => linha.chave === chaveIp)?.usos).toBe(1);
    expect(linhas.find((linha) => linha.chave === chaveEmail)?.usos).toBe(0);
    expect((await login(amb.app, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(200);
  });

  it('rejeita corpo inválido sem estado e falha inesperada não autoriza', async () => {
    const invalido = await amb.app.inject({ method: 'POST', url: '/auth/codigo', payload: { email: 'inválido' } });
    expect([invalido.statusCode, invalido.json().erro]).toEqual([400, 'requisicao_invalida']);
    const loginInvalido = await amb.app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'inválido' } });
    expect([loginInvalido.statusCode, loginInvalido.json().erro]).toEqual([400, 'requisicao_invalida']);
    expect(await amb.db.$count(limitesAuth)).toBe(0);
    const conta = await criarConta(amb);
    const codigo = (await pedir(amb.app, conta.email)).json().codigo;
    vi.spyOn(amb.db, 'transaction').mockRejectedValueOnce(new Error('banco indisponível'));
    expect((await login(amb.app, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(500);
    expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(1);
    expect((await login(amb.app, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(200);
  });

  it('rollback de erro inesperado após consumir IP não cria sessão nem usa o código', async () => {
    const conta = await criarConta(amb);
    const codigo = (await pedir(amb.app, conta.email)).json().codigo;
    let consultas = 0;
    const falho = await criarApp({ db: amb.db, billing: amb.billing, fontesEan: [], relogio: { agora: () => {
      if (++consultas === 3) throw new Error('falha inesperada');
      return amb.relogio.agora();
    } } });
    try {
      expect((await login(falho, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(500);
      expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(1);
      const chave = createHash('sha256').update('login_ip:10.0.0.1').digest('hex');
      expect((await amb.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)).toBeUndefined();
      expect((await login(amb.app, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(200);
    } finally { await falho.close(); }
  });

  it('falha ao inserir sessão desfaz consumo do código e dos contadores', async () => {
    const conta = await criarConta(amb);
    const codigo = (await pedir(amb.app, conta.email)).json().codigo;
    await amb.db.execute(sql.raw("CREATE FUNCTION falhar_sessao_teste() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha de banco'; END $$"));
    await amb.db.execute(sql.raw('CREATE TRIGGER falhar_sessao_teste BEFORE INSERT ON sessoes FOR EACH ROW EXECUTE FUNCTION falhar_sessao_teste()'));
    try {
      expect((await login(amb.app, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(500);
      expect(await amb.db.$count(sessoes, eq(sessoes.contaId, conta.contaId))).toBe(1);
      const codigos = await amb.db.select().from(codigosLogin).where(eq(codigosLogin.email, conta.email));
      expect(codigos[0]?.usadoEm).toBeNull();
      const chave = createHash('sha256').update('login_ip:10.0.0.1').digest('hex');
      expect((await amb.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)).toBeUndefined();
    } finally {
      await amb.db.execute(sql.raw('DROP TRIGGER falhar_sessao_teste ON sessoes'));
      await amb.db.execute(sql.raw('DROP FUNCTION falhar_sessao_teste()'));
    }
    expect((await login(amb.app, conta.email, codigo, conta.aparelhoId)).statusCode).toBe(200);
  });

  it('retenção preparada remove apenas linhas inativas há mais de 24 horas', async () => {
    const agora = new Date();
    await amb.db.insert(limitesAuth).values([
      { chave: 'antiga', janelaInicio: new Date(agora.getTime() - 26 * 3600_000), usos: 1, ultimoUsoEm: new Date(agora.getTime() - 25 * 3600_000) },
      { chave: 'ativa', janelaInicio: agora, usos: 1, ultimoUsoEm: agora },
      { chave: 'uso-recente', janelaInicio: new Date(agora.getTime() - 26 * 3600_000), usos: 1, ultimoUsoEm: agora },
    ]);
    const documento = await readFile(new URL('../../../docs/operacao-autenticacao.md', import.meta.url), 'utf8');
    const consulta = documento.match(/```sql\s+BEGIN;([\s\S]*?)COMMIT;\s+```/)?.[1];
    if (!consulta) throw new Error('SQL de retenção não encontrado');
    await amb.db.transaction((tx) => tx.execute(sql.raw(consulta)));
    expect((await amb.db.select().from(limitesAuth)).map((x) => x.chave).sort()).toEqual(['ativa', 'uso-recente']);
  });
});

if (process.env.PDV_TEST_POSTGRES_URL) {
  it('serializa emissão concorrente entre instâncias na criação das chaves', async () => {
    const conta = await criarConta(amb);
    const respostas = await Promise.all(Array.from({ length: 8 }, (_, i) => pedir(i % 2 ? amb.app : outra, conta.email)));
    expect(respostas.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect(respostas.filter((r) => r.statusCode === 429)).toHaveLength(7);
    expect(await amb.db.$count(codigosLogin, eq(codigosLogin.email, conta.email))).toBe(1);
  });

  it('serializa falhas concorrentes de email entre IPs e instâncias', async () => {
    const conta = await criarConta(amb);
    const codigo = (await pedir(amb.app, conta.email)).json().codigo;
    const errado = codigo === '000000' ? '111111' : '000000';
    const respostas = await Promise.all(Array.from({ length: 10 }, (_, i) => login(i % 2 ? amb.app : outra, conta.email, errado, conta.aparelhoId, `10.1.0.${i + 1}`)));
    expect(respostas.every((resposta) => resposta.statusCode === 401)).toBe(true);
    const chave = createHash('sha256').update('falha_email:' + conta.email).digest('hex');
    expect((await amb.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)?.usos).toBe(5);
    expect((await login(amb.app, conta.email, codigo, conta.aparelhoId, '10.1.1.1')).statusCode).toBe(401);
  });
}
