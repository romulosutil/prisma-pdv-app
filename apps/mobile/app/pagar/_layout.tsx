import { Stack } from 'expo-router';
import { cores } from '@/tema';

export default function LayoutPagar() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg } }}>
      <Stack.Screen name="sucesso" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
