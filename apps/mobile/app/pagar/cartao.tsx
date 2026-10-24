import { GuardaCobranca } from '@/telas/pagar/GuardaCobranca';
import { TelaCartao } from '@/telas/pagar/TelaCartao';

export default function Cartao() {
  return (
    <GuardaCobranca>
      <TelaCartao />
    </GuardaCobranca>
  );
}
