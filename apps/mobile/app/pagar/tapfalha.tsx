import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaTapFalha } from '@/telas/pagar/TelaTapFalha';

export default function TapFalha() {
  return (
    <GuardaCobranca>
      <TelaTapFalha />
    </GuardaCobranca>
  );
}
