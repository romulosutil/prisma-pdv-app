import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Conexao } from '../src/db/conexao';
import { processarCobrancas } from '../src/servicos/cobranca';
import {
  abrirBanco,
  avancarEProcessar,
  chamar,
  contaEmTeste,
  criarAmbiente,
  enviar,
  eventosDe,
  faturasDe,
  mutacao,
  NUMEROS,
  statusDe,
  tokenDoCartao,
  venda,
  type Ambiente,
} from './ajuda';

let banco: Conexao;
let amb: Ambiente;
beforeAll(async () => {
  banco = await abrirBanco();
});
afterAll(() => banco.fechar());
beforeEach(async () => {
  amb = await criarAmbiente(banco);
});
afterEach(() => amb.fechar());

const agoraIso = () => amb.relogio.agora().toISOString();
const cobrancasNoGateway = () => amb.mock.transacoes.filter((t) => t.tipo === 'cobranca');

describe('fim do teste', () => {
  it('7 dias depois o job cobra a primeira fatura e ativa a assinatura', async () => {
    const conta = await contaEmTeste(amb);
    expect(await avancarEProcessar(amb, 7)).toMatchObject({ cobrancas: 1, aprovadas: 1, recusadas: 0, erros: 0 });

    const res = await chamar(amb, 'GET', '/assinatura', { token: conta.token });
    expect(res.corpo.assinatura).toMatchObject({
      status: 'ativa',
      periodoAtualInicio: '2026-03-17T12:00:00.000Z',
      periodoAtualFim: '2026-04-17T12:00:00.000Z',
    });
    expect(await faturasDe(amb)).toMatchObject([
      { tipo: 'primeira', status: 'aprovada', valorCentavos: 3490, transacaoId: 'txn_mock_2' },
    ]);
    expect(cobrancasNoGateway()).toHaveLength(1);
  });

  it('antes do fim do teste não cobra nada', async () => {
    const conta = await contaEmTeste(amb);
    expect(await avancarEProcessar(amb, 6)).toMatchObject({ cobrancas: 0 });
    expect(await statusDe(amb, conta.token)).toBe('em_teste');
    expect(await faturasDe(amb)).toHaveLength(0);
  });

  it('cancelar durante o teste: nenhuma fatura no D7 e acesso até o fim do teste', async () => {
    const conta = await contaEmTeste(amb);
    const cancelada = await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token });
    expect(cancelada.status).toBe(200);
    expect(cancelada.corpo.assinatura).toMatchObject({ status: 'cancelada', acessoAte: '2026-03-17T12:00:00.000Z' });

    expect(await avancarEProcessar(amb, 7)).toMatchObject({ cobrancas: 0 });
    expect(await faturasDe(amb)).toHaveLength(0);
    expect(cobrancasNoGateway()).toHaveLength(0);
  });

  it('renova no mês seguinte', async () => {
    await contaEmTeste(amb);
    await avancarEProcessar(amb, 7);
    await avancarEProcessar(amb, 31);
    expect(await faturasDe(amb)).toMatchObject([{ tipo: 'primeira' }, { tipo: 'renovacao', status: 'aprovada', valorCentavos: 3490 }]);
  });
});

describe('lembrete de fim do teste', () => {
  it('registra o lembrete uma única vez, a partir de D-2', async () => {
    await contaEmTeste(amb);
    const registrar = vi.fn();
    const rodar = () => processarCobrancas(amb.db, amb.billing, amb.relogio, registrar);

    amb.relogio.avancarDias(4);
    expect(await rodar()).toMatchObject({ lembretes: 0 });
    amb.relogio.avancarDias(1);
    expect(await rodar()).toMatchObject({ lembretes: 1 });
    amb.relogio.avancarDias(1);
    expect(await rodar()).toMatchObject({ lembretes: 0 });
    expect(await rodar()).toMatchObject({ lembretes: 0 });

    expect(await eventosDe(amb, 'lembrete_fim_teste')).toHaveLength(1);
    expect(registrar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledWith(expect.stringMatching(/^\[lembrete\] .*17\/03.*R\$ 34,90/));
  });
});

describe('falha de pagamento (dunning)', () => {
  it('cartão 0341: inadimplente no D7, retentativas em D+1, D+3 e D+5, suspensa em D+7', async () => {
    const conta = await contaEmTeste(amb, 'negocio', NUMEROS.recusaCobranca);
    amb.relogio.avancarDias(7);

    // [dias desde a primeira falha, faturas esperadas, status esperado]
    const linha: [number, number, string][] = [
      [0, 1, 'inadimplente'],
      [1, 2, 'inadimplente'],
      [2, 2, 'inadimplente'],
      [3, 3, 'inadimplente'],
      [4, 3, 'inadimplente'],
      [5, 4, 'inadimplente'],
      [6, 4, 'inadimplente'],
      [7, 4, 'suspensa'],
    ];
    for (const [dia, faturas, status] of linha) {
      if (dia > 0) amb.relogio.avancarDias(1);
      await chamar(amb, 'POST', '/dev/jobs/cobranca');
      expect({ dia, faturas: (await faturasDe(amb)).length, status: await statusDe(amb, conta.token) }).toEqual({
        dia,
        faturas,
        status,
      });
    }

    const todas = await faturasDe(amb);
    expect(todas.map((f) => [f.tipo, f.status, f.motivoRecusa])).toEqual([
      ['primeira', 'recusada', 'cartao_recusado'],
      ['retentativa', 'recusada', 'cartao_recusado'],
      ['retentativa', 'recusada', 'cartao_recusado'],
      ['retentativa', 'recusada', 'cartao_recusado'],
    ]);
    expect(await eventosDe(amb, 'suspensa')).toHaveLength(1);
  });

  it('a venda é aceita durante a carência e rejeitada depois da suspensão; novo cartão reativa tudo', async () => {
    const conta = await contaEmTeste(amb, 'negocio', NUMEROS.recusaCobranca);
    amb.relogio.avancarDias(7);
    await chamar(amb, 'POST', '/dev/jobs/cobranca');
    expect(await statusDe(amb, conta.token)).toBe('inadimplente');

    const naCarencia = await enviar(amb, conta, [mutacao('venda', venda(conta, { criadaEm: agoraIso() }))]);
    expect(naCarencia.corpo).toMatchObject({ rejeitadas: [] });

    await avancarEProcessar(amb, 7);
    expect(await statusDe(amb, conta.token)).toBe('suspensa');
    amb.relogio.avancarHoras(1);
    const suspensa = await enviar(amb, conta, [mutacao('venda', venda(conta, { criadaEm: agoraIso() }))]);
    expect(suspensa.status).toBe(200);
    expect(suspensa.corpo.aceitas).toEqual([]);
    expect(suspensa.corpo.rejeitadas).toMatchObject([{ motivo: 'assinatura_suspensa' }]);

    // Cartão que continua recusando não reativa.
    const recusado = await chamar(amb, 'PUT', '/assinatura/cartao', {
      token: conta.token,
      corpo: { tokenCartao: tokenDoCartao(NUMEROS.recusaCobranca) },
    });
    expect(recusado.status).toBe(402);
    expect(recusado.corpo.erro).toBe('pagamento_recusado');
    expect(await statusDe(amb, conta.token)).toBe('suspensa');

    const novo = await chamar(amb, 'PUT', '/assinatura/cartao', {
      token: conta.token,
      corpo: { tokenCartao: tokenDoCartao(NUMEROS.aprova) },
    });
    expect(novo.status).toBe(200);
    expect(novo.corpo.assinatura).toMatchObject({ status: 'ativa', tentativasFalhas: 0, cartao: { ultimos4: '4242' } });
    expect(novo.corpo.licenca.status).toBe('ativa');

    const depois = await enviar(amb, conta, [mutacao('venda', venda(conta, { criadaEm: agoraIso() }))]);
    expect(depois.corpo.rejeitadas).toEqual([]);
    const todas = await faturasDe(amb);
    expect(todas.filter((f) => f.status === 'aprovada')).toMatchObject([{ tipo: 'retentativa', valorCentavos: 3490 }]);
  });

  it('uma retentativa aprovada recupera a assinatura', async () => {
    const conta = await contaEmTeste(amb);
    amb.mock.falharProximasCobrancas(1);
    await avancarEProcessar(amb, 7);
    expect(await statusDe(amb, conta.token)).toBe('inadimplente');

    await avancarEProcessar(amb, 1);
    const res = await chamar(amb, 'GET', '/assinatura', { token: conta.token });
    expect(res.corpo.assinatura).toMatchObject({ status: 'ativa', tentativasFalhas: 0, inadimplenteDesde: null });
    expect((await faturasDe(amb)).map((f) => f.status)).toEqual(['recusada', 'aprovada']);
  });

  it('sem o job, GET /assinatura já mostra a suspensão devida', async () => {
    const conta = await contaEmTeste(amb, 'negocio', NUMEROS.recusaCobranca);
    await avancarEProcessar(amb, 7);
    amb.relogio.avancarDias(8);
    expect(await statusDe(amb, conta.token)).toBe('suspensa');
  });
});

describe('idempotência do job', () => {
  it('rodar duas vezes no mesmo instante não cobra duas vezes', async () => {
    await contaEmTeste(amb);
    amb.relogio.avancarDias(7);
    await chamar(amb, 'POST', '/dev/jobs/cobranca');
    const segunda = await chamar(amb, 'POST', '/dev/jobs/cobranca');
    expect(segunda.corpo).toMatchObject({ cobrancas: 0 });
    expect(await faturasDe(amb)).toHaveLength(1);
    expect(cobrancasNoGateway()).toHaveLength(1);
  });

  it('também não repete a retentativa', async () => {
    await contaEmTeste(amb, 'negocio', NUMEROS.recusaCobranca);
    await avancarEProcessar(amb, 7);
    await avancarEProcessar(amb, 1);
    await chamar(amb, 'POST', '/dev/jobs/cobranca');
    expect(await faturasDe(amb)).toHaveLength(2);
    expect(cobrancasNoGateway()).toHaveLength(2);
  });

  it('gateway fora do ar: a fatura fica pendente e a próxima passada retoma com a mesma chave', async () => {
    const conta = await contaEmTeste(amb);
    amb.relogio.avancarDias(7);
    vi.spyOn(amb.mock, 'cobrar').mockRejectedValueOnce(new Error('gateway fora do ar'));
    const registrar = vi.fn();

    expect(await processarCobrancas(amb.db, amb.billing, amb.relogio, registrar)).toMatchObject({ erros: 1, aprovadas: 0 });
    expect(registrar).toHaveBeenCalledWith(expect.stringContaining('gateway fora do ar'));
    expect(await statusDe(amb, conta.token)).toBe('em_teste');
    expect(await faturasDe(amb)).toMatchObject([{ status: 'pendente' }]);

    expect(await processarCobrancas(amb.db, amb.billing, amb.relogio, registrar)).toMatchObject({ aprovadas: 1, erros: 0 });
    expect(await statusDe(amb, conta.token)).toBe('ativa');
    expect(await faturasDe(amb)).toMatchObject([{ status: 'aprovada' }]);
  });
});

describe('vendas feitas offline e sincronizadas depois', () => {
  it('venda do D+5 da inadimplência, enviada no D+8 (suspensa), é aceita; a feita no D+8 não', async () => {
    const conta = await contaEmTeste(amb, 'negocio', NUMEROS.recusaCobranca);
    await avancarEProcessar(amb, 7); // inadimplente desde hoje
    await avancarEProcessar(amb, 5);
    const noD5 = venda(conta, { criadaEm: agoraIso() });

    await avancarEProcessar(amb, 3);
    expect(await statusDe(amb, conta.token)).toBe('suspensa');
    const noD8 = venda(conta, { criadaEm: agoraIso() });

    const res = await enviar(amb, conta, [mutacao('venda', noD5), mutacao('venda', noD8)]);
    expect(res.corpo.aceitas).toHaveLength(1);
    expect(res.corpo.rejeitadas).toMatchObject([{ motivo: 'assinatura_suspensa' }]);
    expect((await chamar(amb, 'GET', '/sync/pull', { token: conta.token })).corpo.mudancas).toMatchObject([
      { entidade: 'venda', dados: { id: noD5.id } },
    ]);
  });

  it('venda com mais de 7 dias de idade é rejeitada, mesmo em conta ativa', async () => {
    const conta = await contaEmTeste(amb);
    await avancarEProcessar(amb, 7);
    const antiga = venda(conta, { criadaEm: new Date(amb.relogio.agora().getTime() - 10 * 86_400_000).toISOString() });

    const res = await enviar(amb, conta, [mutacao('venda', antiga)]);
    expect(res.corpo.aceitas).toEqual([]);
    expect(res.corpo.rejeitadas).toMatchObject([{ motivo: 'venda_fora_da_janela_offline' }]);
  });

  it('conta cancelada: venda feita antes do fim do acesso é aceita depois dele', async () => {
    const conta = await contaEmTeste(amb);
    await avancarEProcessar(amb, 7);
    await chamar(amb, 'POST', '/assinatura/cancelar', { token: conta.token }); // acesso até 17/04
    amb.relogio.avancarDias(30);
    const antes = venda(conta, { criadaEm: agoraIso() });
    amb.relogio.avancarDias(3);
    const depois = venda(conta, { criadaEm: agoraIso() });

    const res = await enviar(amb, conta, [mutacao('venda', antes), mutacao('venda', depois)]);
    expect(res.corpo.aceitas).toHaveLength(1);
    expect(res.corpo.rejeitadas).toMatchObject([{ motivo: 'assinatura_suspensa' }]);
  });
});
