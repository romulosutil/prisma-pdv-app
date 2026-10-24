import { Stack } from 'expo-router';
import { cores } from '@/tema';

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.bg } }} />;
}
