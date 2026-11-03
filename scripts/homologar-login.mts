/** Retoma somente login/restauração de uma conta descartável já criada pelo smoke. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { BackendHttp } from '../apps/mobile/src/servicos/backendHttp.ts';

const [email, arquivo] = process.argv.slice(2);
assert.ok(email && arquivo);
const codigo = process.env.PDV_CODIGO_SMOKE;
assert.match(codigo ?? '', /^\d{6}$/, 'Informe o código somente pelo ambiente do processo.');
const url = 'https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host';
let token: string | null = null;
const backend = new BackendHttp(url, () => token);
const req = { email, codigo: codigo!, aparelhoId: randomUUID(), aparelhoNome: 'Smoke R0 instalação autorizada' };
const sessao = await backend.entrar(req); token = sessao.token;
delete process.env.PDV_CODIGO_SMOKE;
try {
  assert.equal((await backend.obterPerfil()).email, email);
  await assert.rejects(() => backend.entrar(req), (e: any) => e.status === 401);
  const assinatura = await backend.obterAssinatura(); assert.equal(assinatura?.assinatura.status, 'liberada');
  const pagina = await backend.receberMudancas('0'); assert.equal(pagina.mudancas.length, 3);
  const venda = pagina.mudancas.find(m => m.entidade === 'venda');
  assert.ok(venda?.entidade === 'venda' && venda.operacao === 'upsert');
  assert.equal(venda.dados.totalCentavos, 700); assert.equal(venda.dados.operadorId, sessao.operadorId);
  assert.notEqual(venda.dados.aparelhoId, req.aparelhoId);
  const caixa = pagina.mudancas.find(m => m.entidade === 'caixa');
  assert.ok(caixa?.entidade === 'caixa' && caixa.operacao === 'upsert');
  assert.equal(venda.dados.caixaId, caixa.dados.id); assert.equal(caixa.dados.operadorId, sessao.operadorId);
  assert.equal((await backend.receberMudancas(pagina.cursor)).mudancas.length, 0);
  const relatorio = { executadoEm: new Date().toISOString(), api: url, resultados: ['Código recebido no Temp Mail autentica uma nova instalação pelo BackendHttp do app', 'Reuso do OTP bloqueado com 401', 'Licença liberada sem cobrança', 'Restauração recupera um produto, um caixa e uma venda; sem duplicação', 'R$ 7,00 e IDs de caixa, operador e aparelho de origem preservados', 'Cursor confirmado não reenvia dados'], dados: { contaId: sessao.contaId, lojaId: sessao.lojaId, vendaId: venda.dados.id, caixaId: caixa.dados.id, totalCentavos: 700 }, limites: ['Smoke remoto HTTP; teste físico do APK ainda necessário.'] };
  await writeFile(arquivo, JSON.stringify(relatorio, null, 2) + '\n');
  console.log(JSON.stringify(relatorio, null, 2));
} finally { await backend.sair(); token = null; }
