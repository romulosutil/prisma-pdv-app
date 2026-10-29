import type { Venda } from '@pdv/shared';

const seguro = (n: number) => Number.isSafeInteger(n) && n >= 0;
const limite = BigInt(Number.MAX_SAFE_INTEGER);

export function vendaConsistente(v: Venda): boolean {
  if (!seguro(v.totalCentavos) || v.itens.length === 0) return false;
  const itens = new Set<string>();
  let total = 0n;
  for (const i of v.itens) {
    if (itens.has(i.id) || !seguro(i.precoUnitarioCentavos) || !seguro(i.quantidadeMilesimos) || i.quantidadeMilesimos === 0 || !seguro(i.totalCentavos)) return false;
    itens.add(i.id);
    const produto = BigInt(i.precoUnitarioCentavos) * BigInt(i.quantidadeMilesimos);
    if (produto > limite || (produto + 500n) / 1000n !== BigInt(i.totalCentavos)) return false;
    total += BigInt(i.totalCentavos);
    if (total > limite) return false;
  }
  if (total !== BigInt(v.totalCentavos)) return false;
  const pagamentos = new Set<string>();
  let pago = 0n;
  for (const p of v.pagamentos) {
    if (pagamentos.has(p.id) || !seguro(p.valorCentavos) || !seguro(p.trocoCentavos)) return false;
    pagamentos.add(p.id);
    if (p.meio !== 'dinheiro' && p.trocoCentavos !== 0) return false;
    if (p.meio === 'dinheiro' && BigInt(p.valorCentavos) + BigInt(p.trocoCentavos) > limite) return false;
    pago += BigInt(p.valorCentavos);
    if (pago > limite) return false;
  }
  return pago === total;
}
