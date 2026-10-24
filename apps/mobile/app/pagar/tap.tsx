import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaTap } from '@/telas/pagar/TelaTap';

export default function Tap() {
  return (
    <GuardaCobranca>
      <TelaTap />
    </GuardaCobranca>
  );
}
