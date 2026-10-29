import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { gerarId } from '@pdv/shared';
import { sql } from 'drizzle-orm';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, criarAmbiente, criarConta, contaEmTeste, type Ambiente } from './ajuda';
import { criarApp } from '../src/servidor';
import { aparelhos, sessoes, vendas, itensVenda, pagamentosVenda, caixas, movimentosCaixa, limitesAuth, recuperacoesAparelho, assinaturas, codigosLogin, lojas } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '../src/auth';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => banco.fechar());
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => amb.fechar());

const estadoConfirmacao = async () => ({
  aparelhos: await amb.db.select().from(aparelhos),
  sessoes: await amb.db.select().from(sessoes),
  recuperacoes: await amb.db.select().from(recuperacoesAparelho),
  ip: await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, sha256('login_ip:127.0.0.1'))),
});

it('prova, confirma e repete a mesma substituição sem renovar a sessão', async () => {
  const conta = await criarConta(amb);
  const codigo = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } });
  const novo = gerarId();
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo: codigo.corpo.codigo, aparelhoId: novo, aparelhoNome: 'Novo' } });
  expect(inicio.status).toBe(200);
  expect(inicio.corpo.perfil).toMatchObject({ contaId: conta.contaId, lojaId: conta.lojaId, papel: 'dono' });
  expect(inicio.corpo.perfil).toEqual({ contaId: conta.contaId, lojaId: conta.lojaId, operadorId: conta.operadorId, email: conta.email, nomeResponsavel: 'Maria Souza', nomeLoja: 'Mercadinho da Maria', papel: 'dono' });
  const [desafio] = await amb.db.select().from(recuperacoesAparelho);
  expect(desafio!.tokenHash).toBe(sha256(inicio.corpo.token));
  expect(JSON.stringify(desafio)).not.toContain(inicio.corpo.token);
  expect(desafio!.aparelhosPermitidos).toEqual([conta.aparelhoId]);
  expect(desafio!.expiraEm.getTime() - desafio!.criadoEm.getTime()).toBe(300000);
  expect(inicio.corpo.expiraEm).toBe(desafio!.expiraEm.toISOString());
  const repeticaoOtp = { email: conta.email, codigo: codigo.corpo.codigo, aparelhoId: gerarId(), aparelhoNome: 'Outro' };
  expect((await chamar(amb, 'POST', '/auth/login', { corpo: repeticaoOtp })).status).toBe(401);
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: repeticaoOtp })).status).toBe(401);
  expect(inicio.corpo.aparelhos.map((a: { id: string }) => a.id)).toEqual([conta.aparelhoId]);
  expect((await chamar(amb, 'GET', '/conta', { token: inicio.corpo.token })).status).toBe(401);
  expect((await chamar(amb, 'GET', '/conta', { token: sha256('pdv:recuperacao:sessao:v1:' + inicio.corpo.token) })).status).toBe(401);
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const antesSemConsentimento = await estadoConfirmacao();
  const semConsentimento = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: { id: req.id, token: req.token, aparelhoSubstituidoId: req.aparelhoSubstituidoId } });
  expect(semConsentimento.status).toBe(400);
  expect(semConsentimento.corpo.erro).toBe('requisicao_invalida');
  expect(await estadoConfirmacao()).toEqual(antesSemConsentimento);
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: { ...req, confirmar: false } })).status).toBe(400);
  const confirmado = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req });
  expect(confirmado.status).toBe(200);
  expect(confirmado.corpo.aparelhoId).toBe(novo);
  expect(confirmado.corpo.token).toBe(sha256('pdv:recuperacao:sessao:v1:' + inicio.corpo.token));
  const [sessao] = await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(confirmado.corpo.token)));
  expect(sessao!.expiraEm.getTime() - sessao!.criadoEm.getTime()).toBe(30 * 86400000);
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(401);
  expect((await chamar(amb, 'GET', '/conta', { token: confirmado.corpo.token })).status).toBe(200);
  amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 1000));
  expect(await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).toEqual(confirmado);
  expect((await amb.db.select().from(sessoes).where(eq(sessoes.id, sessao!.id)))[0]).toEqual(sessao);
  expect(await amb.db.$count(sessoes)).toBe(2);
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: { ...req, aparelhoSubstituidoId: gerarId() } })).corpo.erro).toBe('recuperacao_desatualizada');
  expect((await chamar(amb, 'POST', '/auth/logout', { token: confirmado.corpo.token })).status).toBe(204);
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(401);
});

it('não revela conta inexistente e rejeita prova desconhecida ou token incorreto', async () => {
  const conta = await criarConta(amb);
  const novo = gerarId();
  const desconhecida = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: 'ausente@exemplo.com', codigo: '123456', aparelhoId: novo, aparelhoNome: 'Novo' } });
  expect(desconhecida.status).toBe(401);
  expect(desconhecida.corpo.erro).toBe('codigo_invalido');
  expect(desconhecida.corpo).toEqual({ erro: 'codigo_invalido', mensagem: 'Código inválido ou expirado.' });
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const errado = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo: codigo === '000000' ? '111111' : '000000', aparelhoId: novo, aparelhoNome: 'Novo' } });
  expect(errado.status).toBe(401);
  expect(errado.corpo).toEqual({ erro: 'codigo_invalido', mensagem: 'Código inválido ou expirado.' });
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoId: novo, aparelhoNome: 'Novo' } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  for (const corpo of [{ ...req, id: gerarId() }, { ...req, token: 'A'.repeat(43) }]) {
    const resposta = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo });
    expect(resposta.status).toBe(401);
    expect(resposta.corpo.erro).toBe('recuperacao_invalida');
  }
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
});

it('preserva código após conflito e invalida prova quando novo código é emitido', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const base = { email: conta.email, codigo, aparelhoNome: 'Novo' };
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { ...base, aparelhoId: conta.aparelhoId } })).corpo.erro).toBe('aparelho_ja_autorizado');
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { ...base, aparelhoId: gerarId() } });
  expect(inicio.status).toBe(200);
  amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 60_000));
  expect((await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).status).toBe(200);
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).corpo.erro).toBe('recuperacao_invalida');
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
});

it('expira exatamente em cinco minutos e não revoga o aparelho', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  expect(inicio.status).toBe(200);
  amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 300_000));
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(401);
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
});

it('reverte revogação se inserção da sessão falha e permite retry', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const antes = await estadoConfirmacao();
  await amb.db.execute(sql.raw("create function falhar_sessao_recuperacao() returns trigger language plpgsql as $$ begin raise exception 'falha injetada'; end $$"));
  await amb.db.execute(sql.raw('create trigger falhar_sessao_recuperacao before insert on sessoes for each row execute function falhar_sessao_recuperacao()'));
  try {
    expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(500);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
    expect(await estadoConfirmacao()).toEqual(antes);
  } finally {
    await amb.db.execute(sql.raw('drop trigger falhar_sessao_recuperacao on sessoes'));
    await amb.db.execute(sql.raw('drop function falhar_sessao_recuperacao()'));
  }
  const concluido = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req });
  expect(concluido.status).toBe(200);
  expect((await estadoConfirmacao()).ip[0]?.usos).toBe(antes.ip[0]!.usos + 1);
  expect(await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).toEqual(concluido);
});

it.each([
  ['aparelhos', 'update'], ['sessoes', 'update'], ['aparelhos', 'insert'], ['recuperacoes_aparelho', 'update'],
])('reverte falha em %s %s e conclui no retry', async (tabela, operacao) => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const antes = await estadoConfirmacao();
  await amb.db.execute(sql.raw("create function falhar_fronteira_recuperacao() returns trigger language plpgsql as $$ begin raise exception 'falha injetada'; end $$"));
  await amb.db.execute(sql.raw(`create trigger falhar_fronteira_recuperacao before ${operacao} on ${tabela} for each row execute function falhar_fronteira_recuperacao()`));
  try {
    expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(500);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
    expect(await amb.db.$count(aparelhos)).toBe(1);
    expect(await amb.db.$count(sessoes)).toBe(1);
    expect((await amb.db.select().from(recuperacoesAparelho))[0]?.confirmadoEm).toBeNull();
    expect(await estadoConfirmacao()).toEqual(antes);
  } finally {
    await amb.db.execute(sql.raw(`drop trigger falhar_fronteira_recuperacao on ${tabela}`));
    await amb.db.execute(sql.raw('drop function falhar_fronteira_recuperacao()'));
  }
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(200);
  expect((await estadoConfirmacao()).ip[0]?.usos).toBe(antes.ip[0]!.usos + 1);
  expect(await amb.db.$count(sessoes)).toBe(2);
});

it('violação única de outra constraint retorna 500 e reverte orçamento e negócio', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const antes = await estadoConfirmacao();
  await amb.db.execute(sql.raw("create function falhar_constraint_sessao() returns trigger language plpgsql as $$ begin raise exception 'duplicada' using errcode = '23505', constraint = 'sessoes_token_hash_unique'; end $$"));
  await amb.db.execute(sql.raw('create trigger falhar_constraint_sessao before insert on sessoes for each row execute function falhar_constraint_sessao()'));
  try {
    const falha = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req });
    expect(falha.status).toBe(500);
    expect(falha.corpo.erro).toBe('erro_interno');
    expect(await estadoConfirmacao()).toEqual(antes);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
  } finally {
    await amb.db.execute(sql.raw('drop trigger falhar_constraint_sessao on sessoes'));
    await amb.db.execute(sql.raw('drop function falhar_constraint_sessao()'));
  }
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(200);
  expect((await estadoConfirmacao()).ip[0]?.usos).toBe(antes.ip[0]!.usos + 1);
  expect(await amb.db.$count(sessoes)).toBe(2);
});

it('duas instâncias confirmam o mesmo desafio com uma única sessão adicional', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const outra = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [] });
  try {
    const [a, b] = await Promise.all([
      amb.app.inject({ method: 'POST', url: '/auth/recuperacao/confirmar', payload: req }),
      outra.inject({ method: 'POST', url: '/auth/recuperacao/confirmar', payload: req }),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.json()).toEqual(b.json());
    expect(await amb.db.$count(sessoes)).toBe(2);
  } finally { await outra.close(); }
});

it('mantém os valores de vendas ao trocar o aparelho', async () => {
  const conta = await criarConta(amb);
  const agora = amb.relogio.agora();
  const vendaId = gerarId(), caixaId = gerarId();
  await amb.db.insert(vendas).values({ id: vendaId, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId, totalCentavos: 2500, status: 'concluida', criadoEm: agora, atualizadoEm: agora, versao: 1 });
  await amb.db.insert(itensVenda).values({ id: gerarId(), vendaId, lojaId: conta.lojaId, posicao: 0, descricao: 'Item', precoUnitarioCentavos: 2500, quantidadeMilesimos: 1000, totalCentavos: 2500, criadoEm: agora });
  await amb.db.insert(pagamentosVenda).values({ id: gerarId(), vendaId, lojaId: conta.lojaId, posicao: 0, meio: 'dinheiro', valorCentavos: 2500, trocoCentavos: 0, criadoEm: agora });
  await amb.db.insert(caixas).values({ id: caixaId, lojaId: conta.lojaId, aparelhoId: conta.aparelhoId, operadorId: conta.operadorId, abertoEm: agora, trocoInicialCentavos: 1000, criadoEm: agora, atualizadoEm: agora, versao: 1 });
  await amb.db.insert(movimentosCaixa).values({ id: gerarId(), caixaId, lojaId: conta.lojaId, tipo: 'sangria', valorCentavos: 1500, criadoEm: agora });
  const ler = async () => Promise.all([amb.db.select().from(vendas), amb.db.select().from(itensVenda), amb.db.select().from(pagamentosVenda), amb.db.select().from(caixas), amb.db.select().from(movimentosCaixa)]);
  const antes = await ler();
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(200);
  expect(await ler()).toEqual(antes);
});

it('preserva sessão de outro vínculo e rejeita replay com identidade alterada', async () => {
  const conta = await criarConta(amb), outra = await criarConta(amb);
  const tokenOutro = 'vinculo-malformado';
  await amb.db.insert(sessoes).values({ id: gerarId(), tokenHash: sha256(tokenOutro), contaId: outra.contaId, lojaId: outra.lojaId, operadorId: outra.operadorId, aparelhoId: conta.aparelhoId, criadoEm: amb.relogio.agora(), expiraEm: new Date(amb.relogio.agora().getTime() + 86400000) });
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const resposta = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req });
  expect(resposta.status).toBe(200);
  expect((await amb.db.select().from(sessoes).where(eq(sessoes.tokenHash, sha256(tokenOutro))))[0]?.revogadaEm).toBeNull();
  await amb.db.update(sessoes).set({ operadorId: outra.operadorId }).where(eq(sessoes.tokenHash, sha256(resposta.corpo.token)));
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(401);
});

it('usa orçamento de IP compartilhado com login e preserva o código após bloqueio', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const chave = sha256('login_ip:127.0.0.1');
  await amb.db.insert(limitesAuth).values({ chave, janelaInicio: amb.relogio.agora(), usos: 49 });
  const req = { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' };
  expect((await chamar(amb, 'POST', '/auth/login', { corpo: req })).status).toBe(409);
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: req })).status).toBe(429);
  expect((await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, chave)))[0]?.usos).toBe(50);
  amb.relogio.avancarHoras(1);
  // Um código novo é necessário porque o limite e o código têm prazos distintos.
  const novoCodigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { ...req, codigo: novoCodigo } })).status).toBe(200);
});

if (process.env.PDV_TEST_POSTGRES_URL) it('concorrência entre contas pelo mesmo UUID reverte o perdedor', async () => {
  const postgres = (await import('postgres')).default;
  const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const a = await criarConta(amb), b = await criarConta(amb);
  const novo = gerarId();
  async function iniciar(conta: typeof a) {
    const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
    const r = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: novo } });
    expect(r.status).toBe(200);
    return { id: r.corpo.id, token: r.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  }
  const ra = await iniciar(a), rb = await iniciar(b);
  await amb.db.execute(sql.raw("create function barreira_recuperacao() returns trigger language plpgsql as $$ begin perform pg_advisory_xact_lock(1987654321); return new; end $$"));
  await amb.db.execute(sql.raw('create trigger barreira_recuperacao before insert on aparelhos for each row execute function barreira_recuperacao()'));
  await controle`select pg_advisory_lock(1987654321)`;
  try {
    const pa = amb.app.inject({ method: 'POST', url: '/auth/recuperacao/confirmar', payload: ra, remoteAddress: '10.0.0.1' });
    const pb = amb.app.inject({ method: 'POST', url: '/auth/recuperacao/confirmar', payload: rb, remoteAddress: '10.0.0.2' });
    let bloqueados = 0;
    for (let i = 0; i < 100 && bloqueados < 2; i++) {
      const linhas = await controle`select count(*)::int as n from pg_stat_activity where wait_event = 'advisory' and datname = current_database()`;
      bloqueados = linhas[0]!.n as number;
      if (bloqueados < 2) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(bloqueados).toBe(2);
    await controle`select pg_advisory_unlock(1987654321)`;
    const respostas = await Promise.all([pa, pb]);
    expect(respostas.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const perdedor = respostas[0]!.statusCode === 409 ? a : b;
    const ip = respostas[0]!.statusCode === 409 ? '10.0.0.1' : '10.0.0.2';
    expect(respostas.find((r) => r.statusCode === 409)!.json().erro).toBe('aparelho_em_uso');
    expect((await chamar(amb, 'GET', '/conta', { token: perdedor.token })).status).toBe(200);
    expect((await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, sha256('login_ip:' + ip))))[0]?.usos).toBe(1);
  } finally {
    await controle`select pg_advisory_unlock(1987654321)`;
    await amb.db.execute(sql.raw('drop trigger barreira_recuperacao on aparelhos'));
    await amb.db.execute(sql.raw('drop function barreira_recuperacao()'));
    await controle.end();
  }
});

it('limite próprio de cinco tentativas permanece mesmo com orçamento de email disponível', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const req = { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() };
  const errado = codigo === '000000' ? '111111' : '000000';
  const chave = sha256('falha_email:' + conta.email);
  for (let i = 0; i < 5; i++) {
    expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { ...req, codigo: errado } })).status).toBe(401);
    await amb.db.update(limitesAuth).set({ usos: 0 }).where(eq(limitesAuth.chave, chave));
  }
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: req })).status).toBe(401);
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
});

it('código expira exatamente após dez minutos', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 600_000));
  const resultado = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  expect(resultado.status).toBe(401);
  expect(resultado.corpo.erro).toBe('codigo_invalido');
});

it('limite de falhas do email bloqueia mesmo quando tentativas do OTP são zeradas', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const req = { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() };
  const errado = codigo === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) {
    expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { ...req, codigo: errado } })).status).toBe(401);
    await amb.db.execute(sql`update codigos_login set tentativas = 0 where email = ${conta.email}`);
  }
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: req })).status).toBe(401);
});

it('seleção fora do snapshot ou alvo revogado não altera o acesso', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: gerarId(), confirmar: true };
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).corpo.erro).toBe('recuperacao_desatualizada');
  await amb.db.update(aparelhos).set({ revogadoEm: amb.relogio.agora() }).where(eq(aparelhos.id, conta.aparelhoId));
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: { ...req, aparelhoSubstituidoId: conta.aparelhoId } })).corpo.erro).toBe('recuperacao_desatualizada');
  expect(await amb.db.$count(sessoes)).toBe(1);
  expect(await amb.db.$count(aparelhos)).toBe(1);
});

it('recusa downgrade sem capacidade após substituir, preservando origem', async () => {
  const conta = await contaEmTeste(amb, 'negocio');
  const agora = amb.relogio.agora();
  for (let i = 0; i < 2; i++) await amb.db.insert(aparelhos).values({ id: gerarId(), contaId: conta.contaId, lojaId: conta.lojaId, nome: 'Outro', criadoEm: agora, ultimoAcessoEm: agora });
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  expect(inicio.status).toBe(200);
  await amb.db.update(assinaturas).set({ planoId: 'essencial' }).where(eq(assinaturas.contaId, conta.contaId));
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  const resposta = await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req });
  expect(resposta.status).toBe(409);
  expect(resposta.corpo.erro).toBe('limite_aparelhos');
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
  expect(await amb.db.$count(aparelhos)).toBe(3);
});

if (process.env.PDV_TEST_POSTGRES_URL) it('revalida expiração depois de aguardar trava da conta', async () => {
  const postgres = (await import('postgres')).default;
  const controle = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1 });
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoNome: 'Novo', aparelhoId: gerarId() } });
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  await controle`begin`;
  try {
    await controle`select id from contas where id = ${conta.contaId} for update`;
    const pendente = amb.app.inject({ method: 'POST', url: '/auth/recuperacao/confirmar', payload: req });
    let bloqueados = 0;
    for (let i = 0; i < 100 && !bloqueados; i++) {
      const linhas = await controle`select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and datname = current_database()`;
      bloqueados = linhas[0]!.n as number;
      if (!bloqueados) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(bloqueados).toBeGreaterThan(0);
    amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 300_000));
    await controle`commit`;
    expect((await pendente).statusCode).toBe(401);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
  } finally { await controle`rollback`; await controle.end(); }
});

it.each(['revogado', 'outra_conta', 'outra_loja', 'vaga'])('iniciação %s confirma orçamento e preserva OTP', async (caso) => {
  const conta = caso === 'vaga' ? await contaEmTeste(amb, 'negocio') : await criarConta(amb);
  const outra = await criarConta(amb);
  const agora = amb.relogio.agora();
  let aparelhoId = gerarId();
  if (caso === 'revogado') await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: conta.contaId, lojaId: conta.lojaId, nome: 'Revogado', criadoEm: agora, ultimoAcessoEm: agora, revogadoEm: agora });
  if (caso === 'outra_conta') aparelhoId = outra.aparelhoId;
  if (caso === 'outra_loja') {
    const lojaId = gerarId();
    await amb.db.insert(lojas).values({ id: lojaId, contaId: conta.contaId, nome: 'Outra', criadoEm: agora, atualizadoEm: agora });
    await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: conta.contaId, lojaId, nome: 'Outra loja', criadoEm: agora, ultimoAcessoEm: agora });
  }
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const sessoesAntes = await amb.db.$count(sessoes);
  const res = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoId, aparelhoNome: 'Novo' } });
  expect(res.status).toBe(409);
  expect(res.corpo.erro).toBe(({ revogado: 'aparelho_revogado', outra_conta: 'aparelho_em_uso', outra_loja: 'aparelho_em_uso', vaga: 'recuperacao_desnecessaria' } as Record<string, string>)[caso]);
  expect((await amb.db.select().from(codigosLogin).where(eq(codigosLogin.email, conta.email)))[0]?.usadoEm).toBeNull();
  expect((await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, sha256('login_ip:127.0.0.1'))))[0]?.usos).toBe(1);
  expect(await amb.db.$count(recuperacoesAparelho)).toBe(0);
  expect(await amb.db.$count(sessoes)).toBe(sessoesAntes);
});

it('revogar candidato não escolhido não invalida seleção ainda ativa', async () => {
  const conta = await contaEmTeste(amb, 'negocio');
  const agora = amb.relogio.agora();
  const outros = [gerarId(), gerarId()];
  for (const id of outros) await amb.db.insert(aparelhos).values({ id, contaId: conta.contaId, lojaId: conta.lojaId, nome: 'Outro', criadoEm: agora, ultimoAcessoEm: agora });
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' } });
  expect(inicio.status).toBe(200);
  expect(inicio.corpo.aparelhos).toHaveLength(3);
  await amb.db.update(aparelhos).set({ revogadoEm: agora }).where(eq(aparelhos.id, outros[0]!));
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true } })).status).toBe(200);
});

it('confirmação compartilha orçamento IP e outro IP pode concluir', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  await amb.db.insert(limitesAuth).values({ chave: sha256('login_ip:127.0.0.1'), janelaInicio: amb.relogio.agora(), usos: 49 });
  const inicio = await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' } });
  expect(inicio.status).toBe(200);
  const req = { id: inicio.corpo.id, token: inicio.corpo.token, aparelhoSubstituidoId: conta.aparelhoId, confirmar: true };
  expect((await chamar(amb, 'POST', '/auth/recuperacao/confirmar', { corpo: req })).status).toBe(429);
  expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
  expect((await amb.db.select().from(recuperacoesAparelho))[0]?.confirmadoEm).toBeNull();
  const resposta = await amb.app.inject({ method: 'POST', url: '/auth/recuperacao/confirmar', payload: req, remoteAddress: '10.0.0.3' });
  expect(resposta.statusCode).toBe(200);
});

it('falha ao inserir desafio reverte orçamento e consumo de OTP e retry conclui', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const req = { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' };
  await amb.db.execute(sql.raw("create function falhar_inicio_recuperacao() returns trigger language plpgsql as $$ begin raise exception 'falha'; end $$"));
  await amb.db.execute(sql.raw('create trigger falhar_inicio_recuperacao before insert on recuperacoes_aparelho for each row execute function falhar_inicio_recuperacao()'));
  try {
    expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: req })).status).toBe(500);
    expect((await amb.db.select().from(codigosLogin).where(eq(codigosLogin.email, conta.email)))[0]?.usadoEm).toBeNull();
    expect(await amb.db.$count(recuperacoesAparelho)).toBe(0);
    expect(await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, sha256('login_ip:127.0.0.1')))).toHaveLength(0);
    expect((await chamar(amb, 'GET', '/conta', { token: conta.token })).status).toBe(200);
  } finally {
    await amb.db.execute(sql.raw('drop trigger falhar_inicio_recuperacao on recuperacoes_aparelho'));
    await amb.db.execute(sql.raw('drop function falhar_inicio_recuperacao()'));
  }
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: req })).status).toBe(200);
});

it('falhas misturadas entre login, recuperação, novo código e outro IP compartilham email', async () => {
  const conta = await criarConta(amb);
  let codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  const req = { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' };
  const errado = () => codigo === '000000' ? '111111' : '000000';
  for (let i = 0; i < 3; i++) {
    const r = await amb.app.inject({ method: 'POST', url: i % 2 ? '/auth/recuperacao' : '/auth/login', payload: { ...req, codigo: errado() }, remoteAddress: '10.0.0.1' });
    expect(r.statusCode).toBe(401);
  }
  amb.relogio.definir(new Date(amb.relogio.agora().getTime() + 60000));
  codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  for (const url of ['/auth/login', '/auth/recuperacao']) {
    expect((await amb.app.inject({ method: 'POST', url, payload: { ...req, codigo: errado() }, remoteAddress: '10.0.0.2' })).statusCode).toBe(401);
  }
  expect((await amb.app.inject({ method: 'POST', url: '/auth/recuperacao', payload: { ...req, codigo }, remoteAddress: '10.0.0.3' })).statusCode).toBe(401);
  expect((await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, sha256('falha_email:' + conta.email))))[0]?.usos).toBe(5);
});

it('código legado com quatro tentativas é bloqueado na quinta sem esgotar email', async () => {
  const conta = await criarConta(amb);
  const codigo = (await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: conta.email } })).corpo.codigo;
  await amb.db.update(codigosLogin).set({ tentativas: 4 }).where(eq(codigosLogin.email, conta.email));
  const req = { email: conta.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Novo' };
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: { ...req, codigo: codigo === '000000' ? '111111' : '000000' } })).status).toBe(401);
  expect((await chamar(amb, 'POST', '/auth/recuperacao', { corpo: req })).status).toBe(401);
  expect((await amb.db.select().from(codigosLogin).where(eq(codigosLogin.email, conta.email)))[0]?.tentativas).toBe(5);
  expect((await amb.db.select().from(limitesAuth).where(eq(limitesAuth.chave, sha256('falha_email:' + conta.email))))[0]?.usos).toBe(2);
});
