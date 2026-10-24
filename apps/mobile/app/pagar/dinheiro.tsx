import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaDinheiro } from '@/telas/pagar/TelaDinheiro';

export default function Dinheiro() {
  return (
    <GuardaCobranca>
      <TelaDinheiro />
    </GuardaCobranca>
  );
}
