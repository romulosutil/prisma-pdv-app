import * as RN from 'react-native';

export interface CompraPlayNativa {
  purchaseToken: string;
  productId: string;
  packageName: string;
}

export interface PontePlayBillingNativa {
  comprarAssinatura(sku: string, obfAccountId?: string): Promise<CompraPlayNativa>;
  consultarComprasAssinatura(sku: string): Promise<CompraPlayNativa[]>;
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
