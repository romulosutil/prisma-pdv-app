import { formatarBRL } from '@pdv/shared';
import * as RN from 'react-native';

export interface CompraPlayNativa {
  purchaseToken: string;
  productId: string;
  packageName: string;
}

export interface OfertaAssinaturaPlay {
  productId: string;
  titulo: string;
  basePlanId: string;
  offerId: string | null;
  offerToken: string;
  precoFormatado: string;
  precoMicros: number;
  moeda: string;
  periodoCobranca: string;
  temTesteGratis: boolean;
  periodoTesteGratis: string | null;
  ciclosTesteGratis: number;
  precoIntrodutorioFormatado: string | null;
  periodoIntrodutorio: string | null;
  ciclosIntrodutorio: number;
}

export interface DescricaoOfertaPlay {
  precoFormatado: string;
  periodoLabel: string;
  precoPorPeriodo: string;
  detalheOferta: string | null;
  rotuloBotaoOnboarding: string;
  rotuloBotaoAssinatura: string;
  notaCobranca: string;
}

export interface PontePlayBillingNativa {
  comprarAssinatura(sku: string, obfAccountId?: string): Promise<CompraPlayNativa>;
  consultarComprasAssinatura(sku: string): Promise<CompraPlayNativa[]>;
  consultarOfertaAssinatura?(sku: string): Promise<OfertaAssinaturaPlay | null>;
}

function ponteNativa(injetada?: PontePlayBillingNativa | null): PontePlayBillingNativa | null {
  if (injetada !== undefined) return injetada;
  const rn = RN as unknown as { Platform?: { OS?: string }; NativeModules?: Record<string, unknown> };
  if (rn.Platform?.OS !== 'android') return null;
  const mod = rn.NativeModules?.PdvPlayBilling as PontePlayBillingNativa | undefined;
  if (!mod || typeof mod.comprarAssinatura !== 'function' || typeof mod.consultarComprasAssinatura !== 'function') {
    return null;
  }
  return mod;
}

export function playBillingDisponivel(injetada?: PontePlayBillingNativa | null): boolean {
  return ponteNativa(injetada) !== null;
}

export function gerenciarAssinaturaPlayUrl(packageName: string, sku: string): string {
  return `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(sku)}&package=${encodeURIComponent(packageName)}`;
}

export async function abrirGerenciamentoPlay(packageName: string, sku: string): Promise<void> {
  const url = gerenciarAssinaturaPlayUrl(packageName, sku);
  const linking = (RN as unknown as { Linking?: { openURL(u: string): Promise<void> } }).Linking;
  if (linking?.openURL) await linking.openURL(url);
}

export async function iniciarAssinaturaPlay(
  opcoes: { packageName: string; sku: string; contaId?: string },
  injetada?: PontePlayBillingNativa | null,
): Promise<CompraPlayNativa> {
  const ponte = ponteNativa(injetada);
  if (!ponte) {
    throw new Error('Assinatura via Google Play disponível na versão publicada pela Play Store em aparelho Android.');
  }
  return ponte.comprarAssinatura(opcoes.sku, opcoes.contaId);
}

export async function restaurarComprasPlay(
  opcoes: { packageName: string; sku: string },
  injetada?: PontePlayBillingNativa | null,
): Promise<CompraPlayNativa | null> {
  const ponte = ponteNativa(injetada);
  if (!ponte) {
    throw new Error('Restauração via Google Play disponível na versão publicada pela Play Store em aparelho Android.');
  }
  const lista = await ponte.consultarComprasAssinatura(opcoes.sku);
  return lista.find((c) => c.productId === opcoes.sku) ?? lista[0] ?? null;
}

export async function consultarOfertaPlay(
  opcoes: { sku: string },
  injetada?: PontePlayBillingNativa | null,
): Promise<OfertaAssinaturaPlay | null> {
  const ponte = ponteNativa(injetada);
  if (!ponte || typeof ponte.consultarOfertaAssinatura !== 'function') return null;
  try {
    return (await ponte.consultarOfertaAssinatura(opcoes.sku)) ?? null;
  } catch {
    return null;
  }
}

export function formatarPeriodoCobrancaPlay(iso: string): string {
  const m = /^P(\d+)([DWMY])$/.exec(iso.trim().toUpperCase());
  if (!m) return 'mês';
  const qtd = Number(m[1]);
  const unidade = m[2];
  if (!Number.isFinite(qtd) || qtd <= 0) return 'mês';
  switch (unidade) {
    case 'D':
      return qtd === 1 ? 'dia' : `${qtd} dias`;
    case 'W':
      return qtd === 1 ? 'semana' : `${qtd} semanas`;
    case 'M':
      return qtd === 1 ? 'mês' : `${qtd} meses`;
    case 'Y':
      return qtd === 1 ? 'ano' : `${qtd} anos`;
    default:
      return 'mês';
  }
}

export function formatarDuracaoOfertaPlay(iso: string | null, ciclos = 1): string | null {
  if (!iso) return null;
  const m = /^P(\d+)([DWMY])$/.exec(iso.trim().toUpperCase());
  if (!m) return null;
  const base = Number(m[1]);
  const multiplicador = Number.isFinite(ciclos) && ciclos > 0 ? Math.floor(ciclos) : 1;
  const qtd = base * multiplicador;
  if (!Number.isFinite(qtd) || qtd <= 0) return null;
  switch (m[2]) {
    case 'D':
      return `${qtd} ${qtd === 1 ? 'dia' : 'dias'}`;
    case 'W':
      return qtd === 1 ? '7 dias' : `${qtd} semanas`;
    case 'M':
      return `${qtd} ${qtd === 1 ? 'mês' : 'meses'}`;
    case 'Y':
      return `${qtd} ${qtd === 1 ? 'ano' : 'anos'}`;
    default:
      return null;
  }
}

export function descreverOfertaPlay(
  oferta: OfertaAssinaturaPlay | null,
  precoFallbackCentavos: number,
): DescricaoOfertaPlay {
  if (!oferta) {
    const precoFormatado = formatarBRL(precoFallbackCentavos);
    const periodoLabel = 'mês';
    const precoPorPeriodo = `${precoFormatado}/mês`;
    return {
      precoFormatado,
      periodoLabel,
      precoPorPeriodo,
      detalheOferta: null,
      rotuloBotaoOnboarding: `Assinar Pro na Google Play (${precoPorPeriodo})`,
      rotuloBotaoAssinatura: `Assinar Plano Pro (${precoPorPeriodo})`,
      notaCobranca: `Cobrança de referência: ${precoFormatado}/mês na Google Play. O valor final e eventuais ofertas são confirmados na Play Store antes da compra. Cancele quando quiser na Google Play.`,
    };
  }

  const precoFormatado = oferta.precoFormatado;
  const periodoLabel = formatarPeriodoCobrancaPlay(oferta.periodoCobranca);
  const precoPorPeriodo = `${precoFormatado}/${periodoLabel}`;
  const duracaoGratis = oferta.temTesteGratis
    ? formatarDuracaoOfertaPlay(oferta.periodoTesteGratis, oferta.ciclosTesteGratis)
    : null;
  const duracaoIntro = oferta.precoIntrodutorioFormatado
    ? formatarDuracaoOfertaPlay(oferta.periodoIntrodutorio, oferta.ciclosIntrodutorio)
    : null;

  if (oferta.temTesteGratis) {
    return {
      precoFormatado,
      periodoLabel,
      precoPorPeriodo,
      detalheOferta: duracaoGratis
        ? `${duracaoGratis} grátis, depois ${precoPorPeriodo}`
        : `Inclui teste grátis, depois ${precoPorPeriodo}`,
      rotuloBotaoOnboarding: duracaoGratis
        ? `Começar ${duracaoGratis} grátis na Google Play`
        : 'Começar teste grátis na Google Play',
      rotuloBotaoAssinatura: duracaoGratis
        ? `Assinar Pro (${duracaoGratis} grátis)`
        : 'Assinar Pro (teste grátis)',
      notaCobranca: duracaoGratis
        ? `Inclui ${duracaoGratis} grátis na Google Play. Depois, ${precoFormatado} por ${periodoLabel}, com renovação automática. Cancele quando quiser na Google Play.`
        : `Inclui teste grátis na Google Play. Depois, ${precoFormatado} por ${periodoLabel}, com renovação automática. Cancele quando quiser na Google Play.`,
    };
  }

  if (oferta.precoIntrodutorioFormatado && duracaoIntro) {
    return {
      precoFormatado,
      periodoLabel,
      precoPorPeriodo,
      detalheOferta: `${oferta.precoIntrodutorioFormatado} por ${duracaoIntro}, depois ${precoPorPeriodo}`,
      rotuloBotaoOnboarding: `Assinar Pro na Google Play (${oferta.precoIntrodutorioFormatado})`,
      rotuloBotaoAssinatura: `Assinar Plano Pro (${oferta.precoIntrodutorioFormatado})`,
      notaCobranca: `Oferta inicial de ${oferta.precoIntrodutorioFormatado} por ${duracaoIntro} na Google Play. Depois, ${precoFormatado} por ${periodoLabel}, com renovação automática. Cancele quando quiser na Google Play.`,
    };
  }

  return {
    precoFormatado,
    periodoLabel,
    precoPorPeriodo,
    detalheOferta: null,
    rotuloBotaoOnboarding: `Assinar Pro na Google Play (${precoPorPeriodo})`,
    rotuloBotaoAssinatura: `Assinar Plano Pro (${precoPorPeriodo})`,
    notaCobranca: `Cobrança de ${precoFormatado} por ${periodoLabel} na Google Play, com renovação automática. Cancele quando quiser na Google Play.`,
  };
}
