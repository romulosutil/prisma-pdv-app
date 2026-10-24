import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaCheckout } from '@/telas/pagar/TelaCheckout';

export default function Cobrar() {
  return (
    <GuardaCobranca>
      <TelaCheckout />
    </GuardaCobranca>
  );
}
