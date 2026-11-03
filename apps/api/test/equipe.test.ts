import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { gerarId, type Caixa, type Sessao } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import type { Conexao } from '../src/db/conexao';
import { lojas, operadores, usuarios } from '../src/db/schema';
import { criarSessao } from '../src/auth';
import { criarApp } from '../src/servidor';
import { processarEntregasCodigo } from '../src/email/filaCodigo';
import { emissaoTeste } from './emailFixture';
import { abrirBanco, chamar, contaEmTeste, criarAmbiente, enviar, mutacao, produto, venda, NUMEROS, INICIO, type Ambiente } from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
const pedir = async (email: string) => {
  const r = await chamar(amb, 'POST', '/auth/codigo', { corpo: { email } });
  expect(r.status).toBe(200); return r.corpo.codigo as string;
};
async function convidar(dono: Sessao, email: string, papel = 'operador') {
  const r = await chamar(amb, 'POST', '/equipe/convites', { token: dono.token, corpo: { email, nome: email.split('@')[0], papel } });
  expect(r.status, JSON.stringify(r.corpo)).toBe(201); return r.corpo;
}
async function login(email: string, operadorId: string, aceitarConvite = true, codigo?: string, aparelhoId = gerarId()) {
  return chamar<Sessao>(amb, 'POST', '/auth/login', { corpo: { email, codigo: codigo ?? await pedir(email), aparelhoId, aparelhoNome: 'Aparelho pessoal', operadorId, aceitarConvite } });
}
it('dono convida dois usuários; cada pessoa aceita com OTP próprio e recebe apenas seus dados financeiros', async () => {
  const dono = await contaEmTeste(amb, 'pro');
  const a = await convidar(dono, 'ana@exemplo.com');
  const b = await convidar(dono, 'bruno@exemplo.com');
  const codigo = await pedir(a.email);
  const lista = await chamar(amb, 'POST', '/auth/vinculos', { corpo: { email: a.email, codigo } });
  expect(lista.status).toBe(200); expect(lista.corpo.map((v: any) => v.operadorId)).toEqual([a.operadorId]);
  expect((await login(a.email, a.operadorId, false, codigo)).status).toBe(409);
  expect((await login(a.email, b.operadorId, true, codigo)).status).toBe(403);
  const ana = await login(a.email, a.operadorId, true, codigo); expect(ana.status).toBe(200);
  expect((await login(a.email, a.operadorId, true, codigo)).status).toBe(401);
  const bruno = await login(b.email, b.operadorId); expect(bruno.status).toBe(200);
  expect(ana.corpo.papel).toBe('operador'); expect(ana.corpo.usuarioId).not.toBe(dono.usuarioId);
  expect((await chamar(amb, 'GET', '/conta', { token: ana.corpo.token })).corpo.email).toBe(a.email);
  const p = mutacao('produto', produto(dono.lojaId));
  expect((await enviar(amb, dono, [p])).corpo.aceitas).toEqual([p.id]);
  const vA = mutacao('venda', venda(ana.corpo)); const vB = mutacao('venda', venda(bruno.corpo));
  expect((await enviar(amb, ana.corpo, [vA])).corpo.aceitas).toEqual([vA.id]);
  expect((await enviar(amb, bruno.corpo, [vB])).corpo.aceitas).toEqual([vB.id]);
  const pull = await chamar(amb, 'GET', '/sync/pull?desde=0', { token: ana.corpo.token });
  expect(pull.corpo.mudancas.map((m: any) => m.dados.id)).toEqual([p.dados.id, vA.dados.id]);
  const proibido = await enviar(amb, ana.corpo, [mutacao('produto', produto(dono.lojaId)), mutacao('venda', { ...vB.dados, status: 'cancelada' } as any)]);
  expect(proibido.corpo.rejeitadas.map((r: any) => r.motivo)).toEqual(['permissao_negada', 'permissao_negada']);
  for (const url of ['/equipe', '/aparelhos']) expect((await chamar(amb, 'GET', url, { token: ana.corpo.token })).status).toBe(403);
});
it('gerente confere a loja autorizada, sem administrar equipe ou acessar outra empresa; suspensão revoga a sessão', async () => {
  const dono = await contaEmTeste(amb, 'pro'); const outra = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
  const convite = await convidar(dono, 'gerente@exemplo.com', 'gerente');
  const gerente = await login(convite.email, convite.operadorId); expect(gerente.status).toBe(200);
  const v = mutacao('venda', venda(dono)); const externa = mutacao('venda', venda(outra));
  await enviar(amb, dono, [v]); await enviar(amb, outra, [externa]);
  const pull = await chamar(amb, 'GET', '/sync/pull', { token: gerente.corpo.token });
  expect(pull.corpo.mudancas.map((m: any) => m.dados.id)).toEqual([v.dados.id]);
  expect((await chamar(amb, 'GET', '/equipe', { token: gerente.corpo.token })).status).toBe(403);
  expect((await chamar(amb, 'PUT', `/equipe/${convite.operadorId}`, { token: outra.token, corpo: { estado: 'suspenso' } })).status).toBe(404);
  expect((await chamar(amb, 'PUT', `/equipe/${convite.operadorId}`, { token: dono.token, corpo: { estado: 'suspenso' } })).status).toBe(200);
  expect((await chamar(amb, 'GET', '/sync/pull', { token: gerente.corpo.token })).status).toBe(401);
  amb.relogio.avancarDias(1);
  expect((await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: convite.email } })).status).toBe(204);
});
it('uma identidade participa de duas empresas; OTP não escolhe vínculo alheio e o aparelho é específico do vínculo', async () => {
  const a = await contaEmTeste(amb, 'pro'); const b = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
  const primeiro = await convidar(a, 'pessoa@exemplo.com'); const segundo = await convidar(b, primeiro.email, 'gerente');
  expect(primeiro.usuarioId).toBe(segundo.usuarioId);
  const codigo = await pedir(primeiro.email);
  const r = await chamar(amb, 'POST', '/auth/vinculos', { corpo: { email: primeiro.email, codigo } });
  expect(r.corpo).toHaveLength(2);
  expect((await chamar(amb, 'POST', '/auth/login', { corpo: { email: primeiro.email, codigo, aparelhoId: gerarId(), aparelhoNome: 'Celular' } })).status).toBe(409);
  expect((await login(primeiro.email, segundo.operadorId, true, codigo)).corpo.contaId).toBe(b.contaId);
});
it('convite expirado, autoativação, elevação de privilégio e cadastro que tomaria uma identidade são recusados', async () => {
  const dono = await contaEmTeste(amb, 'pro'); const c = await convidar(dono, 'convite@exemplo.com');
  expect((await chamar(amb, 'PUT', `/equipe/${c.operadorId}`, { token: dono.token, corpo: { estado: 'ativo' } })).status).toBe(409);
  expect((await chamar(amb, 'PUT', `/equipe/${dono.operadorId}`, { token: dono.token, corpo: { estado: 'desligado' } })).status).toBe(403);
  expect((await chamar(amb, 'POST', '/equipe/convites', { token: dono.token, corpo: { email: 'elevado@exemplo.com', nome: 'E', papel: 'operador', permissoes: ['administrar_equipe'] } })).status).toBe(400);
  expect((await chamar(amb, 'POST', '/contas', { corpo: { email: c.email, nomeResponsavel: 'Invasor', nomeLoja: 'X', documento: '12345678901', aparelhoId: gerarId(), aparelhoNome: 'X' } })).status).toBe(409);
  const codigo = await pedir(c.email); amb.relogio.avancarDias(8);
  expect((await login(c.email, c.operadorId, true, codigo)).status).toBe(401);
  expect((await chamar(amb, 'POST', '/auth/codigo', { corpo: { email: c.email } })).status).toBe(204);
});
it('alterar permissões revoga sessões; nova autenticação recebe a política atual e desligamento conserva a identidade', async () => {
  const dono = await contaEmTeste(amb, 'pro'); const c = await convidar(dono, 'pessoa@exemplo.com');
  const acesso = await login(c.email, c.operadorId);
  expect((await chamar(amb, 'PUT', `/equipe/${c.operadorId}`, { token: dono.token, corpo: { permissoes: ['cadastrar_produto'] } })).status).toBe(200);
  expect((await chamar(amb, 'GET', '/conta', { token: acesso.corpo.token })).status).toBe(401);
  amb.relogio.avancarDias(1);
  const novo = await login(c.email, c.operadorId, false, undefined, acesso.corpo.aparelhoId); expect(novo.status).toBe(200);
  const p = mutacao('produto', produto(dono.lojaId)); expect((await enviar(amb, novo.corpo, [p])).corpo.aceitas).toEqual([p.id]);
  expect((await enviar(amb, novo.corpo, [mutacao('venda', venda(novo.corpo))])).corpo.rejeitadas[0].motivo).toBe('permissao_negada');
  await chamar(amb, 'PUT', `/equipe/${c.operadorId}`, { token: dono.token, corpo: { estado: 'desligado' } });
  expect((await amb.db.select().from(usuarios).where(eq(usuarios.id, c.usuarioId)))).toHaveLength(1);
  expect((await amb.db.select().from(operadores).where(eq(operadores.id, c.operadorId)))[0]?.estado).toBe('desligado');
});

it('autoriza abertura/suprimento próprios e exige permissão de saída; gerente não movimenta caixa alheio sem contrato de intervenção', async () => {
  const dono = await contaEmTeste(amb, 'pro');
  const a = await convidar(dono, 'ana@exemplo.com'); const g = await convidar(dono, 'gerente@exemplo.com', 'gerente');
  const ana = (await login(a.email, a.operadorId)).corpo; const gerente = (await login(g.email, g.operadorId)).corpo;
  const caixa: Caixa = { id: gerarId(), lojaId: ana.lojaId, aparelhoId: ana.aparelhoId, operadorId: ana.operadorId,
    abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 1000 }, fechamento: null, movimentos: [] };
  const abertura = mutacao('caixa', caixa); expect((await enviar(amb, ana, [abertura])).corpo.aceitas).toEqual([abertura.id]);
  const suprimento = { ...caixa, movimentos: [{ id: gerarId(), tipo: 'suprimento' as const, valorCentavos: 100, motivo: 'Troco', criadoEm: INICIO.toISOString() }] };
  const entrada = mutacao('caixa', suprimento); expect((await enviar(amb, ana, [entrada])).corpo.aceitas).toEqual([entrada.id]);
  const saida = mutacao('caixa', { ...suprimento, movimentos: [...suprimento.movimentos, { id: gerarId(), tipo: 'sangria', valorCentavos: 50, motivo: 'Cofre', criadoEm: INICIO.toISOString() }] });
  expect((await enviar(amb, ana, [saida])).corpo.rejeitadas[0].motivo).toBe('permissao_negada');
  expect((await enviar(amb, gerente, [mutacao('caixa', suprimento)])).corpo.rejeitadas[0].motivo).toBe('permissao_negada');
  const p = mutacao('produto', produto(dono.lojaId)); expect((await enviar(amb, gerente, [p])).corpo.aceitas).toEqual([p.id]);
  const v = venda(ana); await enviar(amb, ana, [mutacao('venda', v)]);
  const cancelada = mutacao('venda', { ...v, status: 'cancelada', cancelamento: { id: gerarId(), em: INICIO.toISOString(), operadorId: gerente.operadorId, motivo: 'Conferência do gerente', estorno: 'nao_realizado' } });
  expect((await enviar(amb, gerente, [cancelada])).corpo.aceitas).toEqual([cancelada.id]);
  const pull = await chamar(amb, 'GET', '/sync/pull', { token: ana.token });
  expect(pull.corpo.mudancas.find((m: any) => m.dados.id === v.id).dados.cancelamento.operadorId).toBe(gerente.operadorId);
});

it('identidade pode escolher lojas distintas da mesma empresa, sem aproveitar aparelho ou dados de outra loja', async () => {
  const dono = await contaEmTeste(amb, 'pro'); const lojaId = gerarId(); const operadorId = gerarId();
  await amb.db.insert(lojas).values({ id: lojaId, contaId: dono.contaId, nome: 'Filial', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId: dono.usuarioId, contaId: dono.contaId, lojaId, nome: 'Dona', papel: 'dono', criadoEm: INICIO, atualizadoEm: INICIO });
  const aparelhoId = gerarId();
  const { aparelhos } = await import('../src/db/schema');
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId, nome: 'Filial', criadoEm: INICIO, ultimoAcessoEm: INICIO });
  const filial = await criarSessao(amb.db, { contaId: dono.contaId, lojaId, operadorId, aparelhoId }, INICIO);
  const a = await convidar(dono, 'pessoa@exemplo.com'); const b = await convidar(filial, a.email, 'gerente');
  const primeira = (await login(a.email, a.operadorId)).corpo;
  amb.relogio.avancarDias(1);
  const codigo = await pedir(a.email);
  expect((await chamar(amb, 'POST', '/auth/vinculos', { corpo: { email: a.email, codigo } })).corpo).toHaveLength(2);
  expect((await login(a.email, b.operadorId, true, codigo, primeira.aparelhoId)).status).toBe(409);
  const segunda = (await login(a.email, b.operadorId, true, codigo)).corpo;
  expect(segunda.lojaId).toBe(lojaId); expect(segunda.usuarioId).toBe(primeira.usuarioId);
  const p = mutacao('produto', produto(dono.lojaId)); await enviar(amb, dono, [p]);
  expect((await chamar(amb, 'GET', '/sync/pull', { token: segunda.token })).corpo.mudancas).toEqual([]);
});

it('fila entrega o código ao funcionário e uma emissão do dono não cancela os códigos pessoais da equipe', async () => {
  const dono = await contaEmTeste(amb, 'pro'); const a = await convidar(dono, 'ana@exemplo.com'); const b = await convidar(dono, 'bruno@exemplo.com');
  const app = await criarApp({ db: amb.db, relogio: amb.relogio, billing: amb.billing, fontesEan: [], emissaoCodigo: emissaoTeste });
  try {
    for (const email of [a.email, b.email, dono.email]) expect((await app.inject({ method: 'POST', url: '/auth/codigo', payload: { email } })).statusCode).toBe(204);
    if (emissaoTeste.modo !== 'email') throw new Error('Fixture de e-mail inválida.');
    const mensagens: { destinatario: string; codigo: string }[] = [];
    const resumo = await processarEntregasCodigo(amb.db, { chaves: emissaoTeste.chaves, dominioRemetente: emissaoTeste.dominioRemetente, relogio: amb.relogio,
      canal: { async enviar(m) { mensagens.push({ destinatario: m.destinatario, codigo: m.codigo }); } } });
    expect(resumo.aceitas).toBe(3); expect(mensagens.map(m => m.destinatario).sort()).toEqual([a.email, b.email, dono.email].sort());
    const codigo = mensagens.find(m => m.destinatario === a.email)!.codigo;
    const r = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: a.email, codigo, operadorId: a.operadorId, aceitarConvite: true, aparelhoId: gerarId(), aparelhoNome: 'Ana' } });
    expect(r.statusCode).toBe(200); expect(r.json().operadorId).toBe(a.operadorId);
  } finally { await app.close(); }
});
