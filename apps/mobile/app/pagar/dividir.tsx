import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaDividir } from '@/telas/pagar/TelaDividir';

export default function Dividir() {
  return (
    <GuardaCobranca>
      <TelaDividir />
    </GuardaCobranca>
  );
}
