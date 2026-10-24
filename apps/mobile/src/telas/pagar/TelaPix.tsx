import { PixDinamico } from './PixDinamico';
import { PixEstatico } from './PixEstatico';
import { useCobranca } from './useCobranca';
import { useMeiosDisponiveis } from './meiosDisponiveis';

/** Com plano de integração e o provedor conectado, o Pix é dinâmico e confirma sozinho; senão, é o QR da chave. */
export function TelaPix() {
  const { provedor } = useCobranca();
  const { conectados, comProvedor } = useMeiosDisponiveis();
  const dinamico = provedor !== null && comProvedor && conectados.some((p) => p.id === provedor);
  return dinamico ? <PixDinamico provedor={provedor} /> : <PixEstatico />;
}
