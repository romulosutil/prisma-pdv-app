import * as Haptics from 'expo-haptics';

/** Vibração leve de confirmação. Nunca deve quebrar o fluxo (web e aparelhos sem motor). */
export function toqueLeve(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
