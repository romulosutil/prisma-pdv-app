import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { gerarId, MockBillingProvider, RelogioFalso } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import { abrirBanco } from '../../api/test/ajuda';
import { emissaoTeste } from '../../api/test/emailFixture';
import { criarApp } from '../../api/src/servidor';
import { contas, entregasCodigo, sessoes } from '../../api/src/db/schema';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoMemoria } from './ambiente';
import { validarDocumento } from '../src/util/documento';

let banco: Awaited<ReturnType<typeof abrirBanco>>;
let app: Awaited<ReturnType<typeof criarApp>>;
beforeAll(async () => {
  banco = await abrirBanco();
  app = await criarApp({ db: banco.db, relogio: new RelogioFalso(new Date()), billing: new MockBillingProvider(), emissaoCodigo: emissaoTeste, cobrancaDesativada: true, fontesEan: [] });
  vi.stubGlobal('fetch', async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url);
    const resposta = await app.inject({ method: (init?.method ?? 'GET') as 'GET' | 'POST', url: url.pathname, headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { payload: String(init.body) } : {}) });
    return new Response(resposta.statusCode === 204 ? null : resposta.body, { status: resposta.statusCode, headers: { 'content-type': 'application/json' } });
  });
}, 30000);
afterAll(async () => { vi.unstubAllGlobals(); await app?.close(); await banco?.fechar(); });

async function emitir(dados: Dados, email: string) {
  const { desafioId } = await dados.pedirCodigoCadastro(email);
  const [entrega] = await banco.db.select().from(entregasCodigo).where(eq(entregasCodigo.codigoId, desafioId));
  if (!entrega || emissaoTeste.modo !== 'email') throw new Error('Fixture sem entrega cifrada.');
  const mensagem = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(entrega.envelope, { id: entrega.id, codigoId: entrega.codigoId });
  return { desafioId, codigo: mensagem.codigo };
}

it('mobile HTTP real recusa mesmo CPF normalizado com email novo antes da loja e também na criação final', async () => {
  const resultado = validarDocumento('529.982.247-25');
  expect(resultado.ok).toBe(true); if (!resultado.ok) throw new Error('CPF do fixture inválido.');
  const documento = resultado.digitos;
  const original = new Dados(new ArmazenamentoMemoria(), gerarId, 'http://api.local');
  await original.iniciar();
  const email = 'original-cpf@example.com', prova = await emitir(original, email);
  await original.verificarCadastro(email, documento, prova.desafioId, prova.codigo);
  await original.criarConta({ email, documento, nomeResponsavel: 'Original', nomeLoja: 'Loja original', tipoLoja: 'Mercado' });
  expect(await banco.db.$count(contas)).toBe(1); expect(await banco.db.$count(sessoes)).toBe(1);
  const base = new ArmazenamentoMemoria();
  const novo = new Dados(base, gerarId, 'http://api.local'); await novo.iniciar();
  const outroEmail = 'novo-cpf@example.com', outraProva = await emitir(novo, outroEmail);
  await expect(novo.verificarCadastro(outroEmail, documento, outraProva.desafioId, outraProva.codigo)).rejects.toMatchObject({ codigo: 'documento_ja_cadastrado', status: 409 });
  expect(novo.cadastroConfirmado(outroEmail, documento)).toBe(false);
  expect(novo.conta.obter().sessao).toBeNull();
  // Cliente antigo ou tentativa direta não pode contornar a conferência antecipada.
  await expect(novo.criarConta({ email: outroEmail, documento, nomeResponsavel: 'Outro', nomeLoja: 'Outra loja', tipoLoja: 'Mercado', desafioCadastroId: outraProva.desafioId, codigoCadastro: outraProva.codigo })).rejects.toMatchObject({ codigo: 'documento_ja_cadastrado', status: 409 });
  expect(await banco.db.$count(contas)).toBe(1); expect(await banco.db.$count(sessoes)).toBe(1);
  const [persistida] = await banco.db.select({ documento: contas.documento }).from(contas);
  expect(persistida?.documento).toBe(documento);
  expect(JSON.stringify([...base.dados])).not.toContain(outraProva.codigo);
});
