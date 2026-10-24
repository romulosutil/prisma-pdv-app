import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaPix } from '@/telas/pagar/TelaPix';

export default function Pix() {
  return (
    <GuardaCobranca>
      <TelaPix />
    </GuardaCobranca>
  );
}
