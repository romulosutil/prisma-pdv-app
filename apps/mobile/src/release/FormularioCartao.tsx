import { Texto } from '@/componentes/Texto';
/** Cobrança de assinatura permanece desativada; nenhum dado de cartão é capturado. */
export function FormularioCartao(_props: unknown) {
  return <Texto accessibilityRole="alert">Cobrança indisponível no piloto. Entre novamente para consultar o acesso liberado da sua conta.</Texto>;
}
