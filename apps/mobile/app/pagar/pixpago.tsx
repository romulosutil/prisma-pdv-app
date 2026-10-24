import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaPixPago } from '@/telas/pagar/TelaPixPago';

export default function PixPago() {
  return (
    <GuardaCobranca>
      <TelaPixPago />
    </GuardaCobranca>
  );
}
