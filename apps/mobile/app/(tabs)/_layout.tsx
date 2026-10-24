import { Tabs } from 'expo-router/js-tabs';
import { BarraInferior } from '@/componentes/BarraInferior';
import { cores } from '@/tema';

export default function LayoutAbas() {
  return (
    <Tabs
      tabBar={(props) => <BarraInferior {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cores.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="produtos" />
      <Tabs.Screen name="caixa" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}
