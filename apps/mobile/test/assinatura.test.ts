import { CARTOES_TESTE, tokenizarCartaoMock } from '@pdv/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { AssinaturaServico } from '@/servicos/assinatura';
import { ErroBackend } from '@/servicos/backend';
import { BackendLocal } from '@/servicos/backendLocal';
import { criarAmbiente } from './ambiente';

const INICIO = new Date('2026-10-23T15:00:00.000Z');

function token(numero: string): string {
  const resultado = tokenizarCartaoMock({ numero, validade: '12/30', cvv: '123', nome: 'Ana' }, INICIO);
  if (!resultado.ok) throw new Error('cartão de teste inválido');
  return resultado.token;
}

async function iniciar() {
  const amb = criarAmbiente(INICIO);
  const backend = new BackendLocal(amb.armazenamento, amb.relogio, amb.novoId);
  const sessao = await backend.criarConta({
    email: 'ana@bompreco.com.br',
    nomeResponsavel: 'Ana',
    nomeLoja: 'Mercadinho Bom Preço',
    documento: '52998224725',
    aparelhoId: amb.novoId(),
    aparelhoNome: 'Celular do balcão',
  });
  const servico = new AssinaturaServico(amb.armazenamento, amb.relogio, backend, () => sessao !== null);
  const avancar = async (dias: number) => {
    amb.relogio.avancarDias(dias);
    await servico.sincronizar();
    return servico.obter();
  };
  return { amb, backend, servico, avancar };
}

describe('assinatura no modo demo', () => {
  let ctx: Awaited<ReturnType<typeof iniciar>>;
  beforeEach(async () => {
    ctx = await iniciar();
  });

  it('começa o teste de 7 dias e cobra o plano quando o teste acaba', async () => {
    await ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.aprova.numero));
    let { assinatura, licenca } = ctx.servico.obter();
    expect(assinatura).toMatchObject({ status: 'em_teste', planoId: 'negocio', cartao: { ultimos4: '4242', bandeira: 'visa' } });
    expect(licenca?.planoId).toBe('negocio');

    ({ assinatura } = await ctx.avancar(6));
    expect(assinatura?.status).toBe('em_teste');

    ({ assinatura, licenca } = await ctx.avancar(1));
    expect(assinatura?.status).toBe('ativa');
    expect(assinatura!.periodoAtualFim.toISOString()).toBe('2026-11-30T15:00:00.000Z');
    expect(licenca?.status).toBe('ativa');
  });

  it('recusa na verificação: o teste não começa', async () => {
    await expect(ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.recusaVerificacao.numero))).rejects.toMatchObject({
      codigo: 'cartao_recusado',
    });
    expect(ctx.servico.obter().assinatura).toBeNull();
  });

  it('cobrança recusada: inadimplente, retentativas e suspensão depois de 7 dias', async () => {
    await ctx.servico.iniciarTeste('essencial', token(CARTOES_TESTE.recusaCobranca.numero));

    let { assinatura } = await ctx.avancar(7);
    expect(assinatura).toMatchObject({ status: 'inadimplente', tentativasFalhas: 1 });

    ({ assinatura } = await ctx.avancar(1));
    expect(assinatura).toMatchObject({ status: 'inadimplente', tentativasFalhas: 2 });

    ({ assinatura } = await ctx.avancar(6));
    expect(assinatura?.status).toBe('suspensa');
    expect(ctx.servico.obter().licenca?.status).toBe('suspensa');
  });

  it('cartão novo em conta suspensa cobra na hora e reativa', async () => {
    await ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.recusaCobranca.numero));
    await ctx.avancar(7);
    await ctx.avancar(7);
    expect(ctx.servico.obter().assinatura?.status).toBe('suspensa');

    await expect(ctx.servico.atualizarCartao(token(CARTOES_TESTE.recusaCobranca.numero))).rejects.toMatchObject({ codigo: 'cartao_recusado' });
    expect(ctx.servico.obter().assinatura?.status).toBe('suspensa');

    await ctx.servico.atualizarCartao(token(CARTOES_TESTE.aprova.numero));
    expect(ctx.servico.obter().assinatura).toMatchObject({ status: 'ativa', tentativasFalhas: 0 });
  });

  it('upgrade vale na hora com valor proporcional; downgrade só na renovação', async () => {
    await ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.aprova.numero));
    await ctx.avancar(7);
    await ctx.avancar(15);

    const subir = ctx.servico.previaTroca('pro');
    expect(subir).toMatchObject({ efeito: 'agora', novoPrecoCentavos: 4990 });
    expect(subir!.cobrancaAgoraCentavos).toBeGreaterThan(0);
    expect(subir!.cobrancaAgoraCentavos).toBeLessThan(1500);
    await ctx.servico.trocarPlano('pro');
    expect(ctx.servico.obter().assinatura).toMatchObject({ planoId: 'pro', planoAgendado: null });

    const descer = ctx.servico.previaTroca('essencial');
    expect(descer).toMatchObject({ efeito: 'proximo_ciclo', cobrancaAgoraCentavos: 0 });
    await ctx.servico.trocarPlano('essencial');
    expect(ctx.servico.obter().assinatura).toMatchObject({ planoId: 'pro', planoAgendado: 'essencial' });
    expect(ctx.servico.previaTroca('pro')).not.toBeNull();
  });

  it('no teste a troca de plano é imediata e sem cobrança', async () => {
    await ctx.servico.iniciarTeste('essencial', token(CARTOES_TESTE.aprova.numero));
    expect(ctx.servico.previaTroca('pro')).toMatchObject({ efeito: 'agora', cobrancaAgoraCentavos: 0 });
    await ctx.servico.trocarPlano('pro');
    expect(ctx.servico.obter().assinatura?.planoId).toBe('pro');
  });

  it('cancelar no teste mantém o acesso até o fim do teste; reativar volta ao teste', async () => {
    await ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.aprova.numero));
    await ctx.avancar(2);
    await ctx.servico.cancelar();
    const { assinatura } = ctx.servico.obter();
    expect(assinatura).toMatchObject({ status: 'cancelada' });
    expect(assinatura!.acessoAte!.toISOString()).toBe('2026-10-30T15:00:00.000Z');

    await ctx.servico.reativar('negocio');
    expect(ctx.servico.obter().assinatura?.status).toBe('em_teste');
  });

  it('reativar depois do fim do acesso cobra um período novo', async () => {
    await ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.aprova.numero));
    await ctx.servico.cancelar();
    await ctx.avancar(10);
    await ctx.servico.reativar('essencial');
    const { assinatura } = ctx.servico.obter();
    expect(assinatura).toMatchObject({ status: 'ativa', planoId: 'essencial' });
  });

  it('persiste a assinatura e a licença para decidir offline', async () => {
    await ctx.servico.iniciarTeste('negocio', token(CARTOES_TESTE.aprova.numero));
    const recarregado = new AssinaturaServico(ctx.amb.armazenamento, ctx.amb.relogio, ctx.backend, () => true);
    await recarregado.carregar();
    expect(recarregado.obter().assinatura?.status).toBe('em_teste');
    expect(recarregado.obter().licenca?.limites.aparelhos).toBe(3);
  });

  it('sem assinatura nada muda ao sincronizar; trocar plano falha com erro tipado', async () => {
    await ctx.servico.sincronizar();
    expect(ctx.servico.obter().assinatura).toBeNull();
    await expect(ctx.servico.trocarPlano('pro')).rejects.toBeInstanceOf(ErroBackend);
  });
});
