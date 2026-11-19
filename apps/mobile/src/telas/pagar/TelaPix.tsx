import { useLocalSearchParams } from 'expo-router';
import { PixDinamico } from './PixDinamico';
import { PixEstatico } from './PixEstatico';
import { ehProvedor } from './rotulos';

export function TelaPix() {
  const params = useLocalSearchParams<{ provedor?: string }>();
  if (ehProvedor(params.provedor)) {
    return <PixDinamico provedor={params.provedor} />;
  }
  return <PixEstatico />;
}
