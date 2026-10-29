import { describe, expect, it } from 'vitest';
import { AssinaturaResSchema, RelogioFalso, type AssinaturaRes } from '@pdv/shared';
import { ArmazenamentoEscopo } from '../src/dados/armazenamentoEscopo';
import { AssinaturaServico } from '../src/servicos/assinatura';
import { ErroBackend, type Backend } from '../src/servicos/backend';
import { ArmazenamentoMemoria } from './ambiente';

const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const A = { contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) }, B = { ...A, lojaId: id(5) };
const data = '2026-01-01T00:00:00.000Z', fim = '2026-12-01T00:00:00.000Z';
function resposta(n: number): AssinaturaRes {
  return AssinaturaResSchema.parse({ assinatura: { id: id(n), contaId: A.contaId, planoId: 'negocio', status: 'ativa', criadaEm: data, testeTerminaEm: data, periodoAtualInicio: data, periodoAtualFim: fim, acessoAte: null, inadimplenteDesde: null, tentativasFalhas: 0, proximaTentativaEm: null, canceladaEm: null, planoAgendado: null, cartao: null }, licenca: { planoId: 'negocio', status: 'ativa', validaAte: fim, limites: { produtos: 100, aparelhos: 3, operadores: 3, lojas: 1, historicoDias: 30 }, recursos: [], emitidaEm: data } });
}
function pendente<T>() { let resolver!: (v: T) => void; let rejeitar!: (e: unknown) => void; const promise = new Promise<T>((r, j) => { resolver = r; rejeitar = j; }); return { promise, resolver, rejeitar }; }
function montar() {
  const base = new ArmazenamentoMemoria(); let atual = A;
  const escopo = new ArmazenamentoEscopo(base, () => atual, false);
  const relogio = new RelogioFalso(new Date(data));
  const chamada = pendente<AssinaturaRes | null>();
  const backend = { obterAssinatura: () => chamada.promise, criarAssinatura: () => chamada.promise, trocarPlano: () => chamada.promise } as unknown as Backend;
  const servico = new AssinaturaServico(escopo, relogio, backend, () => true, () => atual.contaId);
  return { base, escopo, relogio, chamada, servico, trocar: () => { atual = B; } };
}
async function prepararB(ctx: ReturnType<typeof montar>) {
  ctx.trocar(); await ctx.escopo.gravar('assinatura', resposta(20)); await ctx.servico.carregar();
  expect(ctx.servico.obter().licenca).toMatchObject({ planoId: 'negocio', limites: { aparelhos: 3 } });
}
describe('assinatura com troca de loja', () => {
  it('ignora licença válida tardia da loja anterior', async () => {
    const ctx = montar(); const sync = ctx.servico.sincronizar(); await prepararB(ctx); const antes = ctx.servico.obter();
    ctx.chamada.resolver(resposta(10)); await sync;
    expect(ctx.servico.obter()).toEqual(antes); expect(await ctx.escopo.obter('assinatura')).toEqual(resposta(20));
  });
  it.each(['ausente', 'rede'])('ignora %s tardio sem alterar offline, agora ou licença de B', async tipo => {
    const ctx = montar(); const sync = ctx.servico.sincronizar(); await prepararB(ctx); const antes = ctx.servico.obter(); ctx.relogio.avancarDias(1);
    if (tipo === 'rede') ctx.chamada.rejeitar(new ErroBackend('rede', 'offline')); else ctx.chamada.resolver(null);
    await sync; expect(ctx.servico.obter()).toEqual(antes); expect(await ctx.escopo.obter('assinatura')).toEqual(resposta(20));
  });
  it.each(['criar', 'upgrade'])('rejeita %s tardio e preserva licença de B', async tipo => {
    const ctx = montar(); const operacao = tipo === 'criar' ? ctx.servico.iniciarTeste('negocio', 'cartao') : ctx.servico.trocarPlano('pro');
    await prepararB(ctx); const antes = ctx.servico.obter(); ctx.chamada.resolver(resposta(10));
    await expect(operacao).rejects.toMatchObject({ codigo: 'conflito' });
    expect(ctx.servico.obter()).toEqual(antes); expect(await ctx.escopo.obter('assinatura')).toEqual(resposta(20));
  });
});
