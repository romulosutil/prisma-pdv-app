import { formatarData, partesDaData, type Venda } from '@pdv/shared';
import { decimalBR, montarCsv, neutralizarFormula, quantidadeBR } from '@/util/csv';
import { formatarHora } from '@/util/tempo';
import { rotuloDosPagamentos } from './logica';

const CABECALHO = ['Venda', 'Data', 'Hora', 'Situação', 'Pagamento', 'Item', 'Quantidade', 'Preço unitário', 'Total do item'];

/**
 * Uma linha por item vendido, para a planilha somar e filtrar por produto. O total da venda não
 * é repetido nas linhas para não ser somado em dobro.
 */
export function csvDeVendas(vendas: readonly Venda[], numeroDe: (venda: Venda) => string): string {
  const linhas = vendas.flatMap((venda) => {
    const quando = new Date(venda.criadaEm);
    return venda.itens.map((item) => [
      numeroDe(venda),
      formatarData(quando),
      formatarHora(quando),
      venda.status === 'concluida' ? venda.fiado ? 'Venda com fiado' : 'Paga' : 'Cancelada',
      rotuloDosPagamentos(venda),
      neutralizarFormula(item.descricao),
      quantidadeBR(item.quantidadeMilesimos),
      decimalBR(item.precoUnitarioCentavos),
      decimalBR(item.totalCentavos),
    ]);
  });
  return montarCsv([CABECALHO, ...linhas]);
}

/** "vendas-2026-10-24.csv" (data de Brasília). */
export function nomeDoArquivoDeVendas(agora: Date): string {
  const { dia, mes, ano } = partesDaData(agora);
  return `vendas-${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}.csv`;
}
