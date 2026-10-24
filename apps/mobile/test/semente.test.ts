import { describe, expect, it } from 'vitest';
import { resumirDia } from '@/dados/caixa';
import { gerarSemente, TROCO_INICIAL_DEMO } from '@/dados/semente';
import { criarContadorDeIds } from './ambiente';

const ids = { lojaId: 'loja', aparelhoId: 'aparelho', operadorId: 'operador' };

describe('semente do modo demo', () => {
  it.each(['2026-10-23T21:00:00.000Z', '2026-10-23T03:30:00.000Z'])('fecha os números do design system às %s', (hora) => {
    const agora = new Date(hora);
    const semente = gerarSemente({ ...ids, agora, novoId: criarContadorDeIds() });
    const caixa = semente.caixas[0]!;
    const resumo = resumirDia(agora, semente.vendas.vendas, caixa);

    expect(semente.produtos).toHaveLength(9);
    expect(resumo.quantidadeVendas).toBe(47);
    expect(resumo.totalCentavos).toBe(128_450);
    expect(resumo.porMeio).toEqual({ dinheiro: 41_230, pix: 59_870, cartao: 27_350 });
    expect(resumo.trocoInicialCentavos).toBe(TROCO_INICIAL_DEMO);
    expect(resumo.esperadoNaGavetaCentavos).toBe(51_230);
  });

  it('gera vendas coerentes: itens somam o total e o pagamento fecha a venda', () => {
    const semente = gerarSemente({ ...ids, agora: new Date('2026-10-23T21:00:00.000Z'), novoId: criarContadorDeIds() });
    for (const venda of semente.vendas.vendas) {
      expect(venda.itens.reduce((s, i) => s + i.totalCentavos, 0)).toBe(venda.totalCentavos);
      expect(venda.pagamentos.reduce((s, p) => s + p.valorCentavos, 0)).toBe(venda.totalCentavos);
      expect(venda.totalCentavos).toBeGreaterThan(0);
    }
  });

  it('cria os produtos do design system, com os atalhos e os kg', () => {
    const { produtos } = gerarSemente({ ...ids, agora: new Date(), novoId: criarContadorDeIds() });
    expect(produtos.find((p) => p.nome === 'Arroz tipo 1 5kg')).toMatchObject({ ean: '7890000000017', precoCentavos: 2790 });
    expect(produtos.filter((p) => p.atalho).map((p) => p.nome)).toEqual(['Pão francês', 'Banana prata', 'Saco de gelo 5kg']);
    expect(produtos.filter((p) => p.unidade === 'kg')).toHaveLength(2);
  });
});
