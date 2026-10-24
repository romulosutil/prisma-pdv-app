import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import type { EstiloTipografia } from '@pdv/shared';

/** Fontes carregadas no layout raiz (`useFonts`). */
export const FONTES_PARA_CARREGAR = {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

// No RN o peso vem do nome da família carregada, não de `fontWeight`.
const FAMILIAS: Record<EstiloTipografia['familia'], Partial<Record<EstiloTipografia['peso'], string>>> = {
  'Bricolage Grotesque': { '700': 'BricolageGrotesque_700Bold', '800': 'BricolageGrotesque_800ExtraBold' },
  Inter: { '400': 'Inter_400Regular', '500': 'Inter_500Medium', '600': 'Inter_600SemiBold', '700': 'Inter_700Bold' },
};

export function nomeDaFonte(familia: EstiloTipografia['familia'], peso: EstiloTipografia['peso']): string {
  const nome = FAMILIAS[familia][peso];
  if (!nome) throw new Error(`Fonte não carregada: ${familia} ${peso}`);
  return nome;
}
