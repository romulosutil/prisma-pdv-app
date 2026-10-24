import { Stack } from 'expo-router';
import { RascunhoProvider } from '@/nucleo/rascunho';
import { cores } from '@/tema';

export default function LayoutOnboarding() {
  return (
    <RascunhoProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg } }} />
    </RascunhoProvider>
  );
}
