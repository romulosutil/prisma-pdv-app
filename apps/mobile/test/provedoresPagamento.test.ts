import { RelogioFalso } from '@pdv/shared';
import { describe, expect, it } from 'vitest';
import { DURACAO_APROXIMACAO_MS, SimuladorProvedores, VALIDADE_PIX_MS } from '@/servicos/provedoresPagamento';
import { crc16 } from '@/util/brcode';

function criar() {
  const relogio = new RelogioFalso(new Date('2026-10-23T21:42:00.000Z'));
  return { relogio, sim: new SimuladorProvedores(relogio) };
}

const avancarMs = (r: RelogioFalso, ms: number) => r.definir(new Date(r.agora().getTime() + ms));

describe('SimuladorProvedores: Pix dinâmico', () => {
  it('cria a cobrança com BR Code dinâmico válido, aguardando pagamento', () => {
    const { sim } = criar();
    const cobranca = sim.criarCobrancaPix({ provedor: 'infinitepay', valorCentavos: 5605, nomeRecebedor: 'Mercadinho Bom Preço' });
    expect(sim.situacaoPix(cobranca.id)).toBe('aguardando');
    expect(cobranca.copiaECola).toContain('0014br.gov.bcb.pix25');
    expect(cobranca.copiaECola).toContain('540556.05');
    expect(cobranca.copiaECola.slice(-4)).toBe(crc16(cobranca.copiaECola.slice(0, -4)));
  });

  it('muda para pago só quando o banco confirma', () => {
    const { sim, relogio } = criar();
    const cobranca = sim.criarCobrancaPix({ provedor: 'mercadopago', valorCentavos: 1000, nomeRecebedor: 'Loja' });
    avancarMs(relogio, 60_000);
    expect(sim.situacaoPix(cobranca.id)).toBe('aguardando');
    sim.simularPagamentoPix(cobranca.id);
    expect(sim.situacaoPix(cobranca.id)).toBe('pago');
  });

  it('expira depois de 10 minutos e não aceita pagamento expirado', () => {
    const { sim, relogio } = criar();
    const cobranca = sim.criarCobrancaPix({ provedor: 'infinitepay', valorCentavos: 1000, nomeRecebedor: 'Loja' });
    avancarMs(relogio, VALIDADE_PIX_MS);
    expect(sim.situacaoPix(cobranca.id)).toBe('expirado');
    sim.simularPagamentoPix(cobranca.id);
    expect(sim.situacaoPix(cobranca.id)).toBe('expirado');
  });

  it('cada cobrança tem seu próprio id e situação', () => {
    const { sim } = criar();
    const a = sim.criarCobrancaPix({ provedor: 'infinitepay', valorCentavos: 100, nomeRecebedor: 'Loja' });
    const b = sim.criarCobrancaPix({ provedor: 'infinitepay', valorCentavos: 100, nomeRecebedor: 'Loja' });
    sim.simularPagamentoPix(a.id);
    expect(a.id).not.toBe(b.id);
    expect(sim.situacaoPix(b.id)).toBe('aguardando');
    expect(sim.situacaoPix('desconhecida')).toBe('expirado');
  });
});

describe('SimuladorProvedores: aproximação', () => {
  it('aprova depois do tempo de aproximação', () => {
    const { sim, relogio } = criar();
    const cobranca = sim.iniciarTap({ provedor: 'infinitepay', valorCentavos: 5605 });
    expect(sim.situacaoTap(cobranca.id)).toBe('aguardando');
    avancarMs(relogio, DURACAO_APROXIMACAO_MS - 1);
    expect(sim.situacaoTap(cobranca.id)).toBe('aguardando');
    avancarMs(relogio, 1);
    expect(sim.situacaoTap(cobranca.id)).toBe('aprovado');
  });

  it('voltar sem concluir deixa a cobrança como não encontrada, mesmo depois do tempo', () => {
    const { sim, relogio } = criar();
    const cobranca = sim.iniciarTap({ provedor: 'mercadopago', valorCentavos: 5605 });
    sim.simularAbandonoTap(cobranca.id);
    avancarMs(relogio, DURACAO_APROXIMACAO_MS * 2);
    expect(sim.situacaoTap(cobranca.id)).toBe('nao_encontrado');
  });

  it('não desfaz uma aprovação que já aconteceu', () => {
    const { sim, relogio } = criar();
    const cobranca = sim.iniciarTap({ provedor: 'infinitepay', valorCentavos: 100 });
    avancarMs(relogio, DURACAO_APROXIMACAO_MS);
    sim.simularAbandonoTap(cobranca.id);
    expect(sim.situacaoTap(cobranca.id)).toBe('aprovado');
  });
});
