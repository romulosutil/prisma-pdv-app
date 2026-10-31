import { CARTOES_TESTE, MockBillingProvider, tokenizarCartaoMock } from '@pdv/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendLocal } from '@/servicos/backendLocal';
import { AssinaturaServico } from '@/servicos/assinatura';
import { avisoDeAssinatura } from '@/nucleo/avisosAssinatura';
import { criarAmbiente } from './ambiente';

afterEach(() => vi.restoreAllMocks());

async function montar() {
  const amb = criarAmbiente(new Date('2026-10-30T12:00:00Z'));
  const backend = new BackendLocal(amb.armazenamento, amb.relogio, amb.novoId);
  await backend.criarConta({ email: 'cupom@example.invalid', nomeResponsavel: 'Teste', nomeLoja: 'Teste', documento: '52998224725', aparelhoId: amb.novoId(), aparelhoNome: 'Teste' });
  const servico = new AssinaturaServico(amb.armazenamento, amb.relogio, backend, () => true);
  const token = (numero: string) => {
    const r = tokenizarCartaoMock({ numero, validade: '12/30', cvv: '123', nome: 'Teste' }, amb.relogio.agora());
    if (!r.ok) throw new Error('Cartão inválido');
    return r.token;
  };
  return { amb, backend, servico, token };
}

describe('cupom no app demo', () => {
  it('oferta única e desconto sobrevivem reinício, renovação e reativação', async () => {
    const { amb, backend, servico, token } = await montar();
    const cobrar = vi.spyOn(MockBillingProvider.prototype, 'cobrar');
    expect((await backend.listarPlanos()).map((p) => [p.id, p.precoMensalCentavos])).toEqual([['pro', 4990]]);
    await servico.iniciarTeste('pro', token(CARTOES_TESTE.aprova.numero), ' vitalicio50 ');
    expect(servico.obter().assinatura?.cupom).toEqual({ codigo: 'VITALICIO50', percentualDesconto: 50, duracao: 'vitalicio' });
    expect(cobrar).not.toHaveBeenCalled();
    amb.relogio.avancarDias(5);
    const a = servico.obter().assinatura!;
    expect(avisoDeAssinatura(a, amb.relogio.agora())?.texto).toContain('R$ 24,95');
    const reiniciado = new BackendLocal(amb.armazenamento, amb.relogio, amb.novoId);
    expect((await reiniciado.obterAssinatura())?.assinatura.cupom?.codigo).toBe('VITALICIO50');
    amb.relogio.avancarDias(2);
    expect((await reiniciado.obterAssinatura())?.assinatura.status).toBe('ativa');
    amb.relogio.avancarDias(30);
    await reiniciado.obterAssinatura();
    await reiniciado.cancelarAssinatura();
    amb.relogio.avancarDias(31);
    expect((await reiniciado.reativarAssinatura('pro')).assinatura.cupom?.codigo).toBe('VITALICIO50');
    expect(cobrar.mock.calls.map(([p]) => p.valorCentavos)).toEqual([2495, 2495, 2495]);
  });
  it('cupom inválido não consome teste e cartão recusado permite tentar novamente', async () => {
    const { servico, token } = await montar();
    const verificar = vi.spyOn(MockBillingProvider.prototype, 'verificarCartao');
    await expect(servico.iniciarTeste('pro', token(CARTOES_TESTE.aprova.numero), 'ERRO')).rejects.toMatchObject({ codigo: 'cupom_invalido' });
    expect(verificar).not.toHaveBeenCalled();
    expect(servico.obter().assinatura).toBeNull();
    await expect(servico.iniciarTeste('pro', token(CARTOES_TESTE.recusaVerificacao.numero), 'VITALICIO50')).rejects.toMatchObject({ codigo: 'cartao_recusado' });
    expect(servico.obter().assinatura).toBeNull();
    await servico.iniciarTeste('pro', token(CARTOES_TESTE.aprova.numero), 'VITALICIO50');
    expect(servico.obter().assinatura?.status).toBe('em_teste');
  });
  it('atualização de cartão recupera assinatura suspensa com R$ 24,95', async () => {
    const { amb, servico, token } = await montar();
    const cobrar = vi.spyOn(MockBillingProvider.prototype, 'cobrar');
    await servico.iniciarTeste('pro', token(CARTOES_TESTE.recusaCobranca.numero), 'VITALICIO50');
    amb.relogio.avancarDias(7);
    await servico.sincronizar();
    amb.relogio.avancarDias(7);
    await servico.sincronizar();
    expect(servico.obter().assinatura?.status).toBe('suspensa');
    await servico.atualizarCartao(token(CARTOES_TESTE.aprova.numero));
    expect(servico.obter().assinatura?.status).toBe('ativa');
    expect(cobrar.mock.calls.map(([p]) => p.valorCentavos)).toEqual([2495, 2495]);
  });
});
