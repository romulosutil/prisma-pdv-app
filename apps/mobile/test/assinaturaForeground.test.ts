import { describe, expect, it } from 'vitest';
import { AssinaturaResSchema, RelogioFalso, type AssinaturaRes } from '@pdv/shared';
import { ArmazenamentoEscopo } from '../src/dados/armazenamentoEscopo';
import { AssinaturaServico } from '../src/servicos/assinatura';
import type { Backend } from '../src/servicos/backend';
import { ArmazenamentoMemoria } from './ambiente';

// Volta ao primeiro plano com a cobrança desligada (assinatura 'liberada'): a sincronização da licença
// corre ao lado da revalidação de perfil/sync, que bloqueiam gravações da loja por instantes.
const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const I = { contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
const data = '2026-01-01T00:00:00.000Z', fim = '2026-01-08T00:00:00.000Z';
function liberada(n: number): AssinaturaRes {
  return AssinaturaResSchema.parse({ assinatura: { id: id(n), contaId: I.contaId, planoId: 'pro', status: 'liberada', criadaEm: data, testeTerminaEm: data, periodoAtualInicio: data, periodoAtualFim: data, acessoAte: null, inadimplenteDesde: null, tentativasFalhas: 0, proximaTentativaEm: null, canceladaEm: null, planoAgendado: null, cartao: null, cupom: null }, licenca: { planoId: 'pro', status: 'liberada', validaAte: fim, limites: { produtos: null, aparelhos: 5, operadores: null, lojas: 1, historicoDias: null }, recursos: [], emitidaEm: data } });
}
function pendente<T>() { let resolver!: (v: T) => void; const promise = new Promise<T>((r) => { resolver = r; }); return { promise, resolver }; }
function montar(base = new ArmazenamentoMemoria()) {
  const escopo = new ArmazenamentoEscopo(base, () => I, false);
  const chamada = pendente<AssinaturaRes | null>();
  const backend = { obterAssinatura: () => chamada.promise } as unknown as Backend;
  const servico = new AssinaturaServico(escopo, new RelogioFalso(new Date(data)), backend, () => true, () => I.contaId);
  return { escopo, chamada, servico };
}

describe('licença ao voltar ao primeiro plano com cobrança desligada', () => {
  it('resposta que chega durante o bloqueio de gravação da loja não vira erro (sem toast) nem corrompe o cache', async () => {
    const { escopo, chamada, servico } = montar();
    await escopo.gravar('assinatura', liberada(10)); await servico.carregar();
    const antes = servico.obter();
    const sync = servico.sincronizar();
    escopo.bloquearAlteracoes(true); // revalidação de perfil / aplicarSyncLocal em curso
    chamada.resolver(liberada(11));
    await expect(sync).resolves.toBeUndefined();
    expect(servico.obter()).toEqual(antes);
    expect(await escopo.obter('assinatura')).toEqual(liberada(10));
    escopo.bloquearAlteracoes(false);
  });

  it('na volta seguinte (sem bloqueio) a licença liberada é aplicada normalmente', async () => {
    const { escopo, chamada, servico } = montar();
    chamada.resolver(liberada(12));
    await servico.sincronizar();
    expect(servico.obter()).toMatchObject({ offline: false, assinatura: { status: 'liberada', cartao: null }, licenca: { status: 'liberada' } });
    expect(await escopo.obter('assinatura')).toEqual(liberada(12));
  });

  it('falha inesperada de gravação (sem bloqueio) continua propagando para o aviso ao usuário', async () => {
    const base = new ArmazenamentoMemoria();
    const { chamada, servico } = montar(Object.assign(base, { gravar: async () => { throw new Error('disco cheio'); } }) as ArmazenamentoMemoria);
    chamada.resolver(liberada(13));
    await expect(servico.sincronizar()).rejects.toThrow('disco cheio');
  });
});
