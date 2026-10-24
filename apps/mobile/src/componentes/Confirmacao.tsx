import { View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';

export interface ConfirmacaoProps {
  visivel: boolean;
  onFechar: () => void;
  titulo: string;
  texto: string;
  rotuloConfirmar: string;
  /** Ação destrutiva (excluir, cancelar venda): botão em vermelho. */
  perigo?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
}

/** Confirmação em folha (o `Alert` do React Native não funciona na web). */
export function Confirmacao({ visivel, onFechar, titulo, texto, rotuloConfirmar, perigo, carregando, onConfirmar }: ConfirmacaoProps) {
  return (
    <BottomSheet visivel={visivel} onFechar={onFechar} titulo={titulo}>
      <Texto estilo="corpoL" cor={cores.ink2}>
        {texto}
      </Texto>
      <View style={{ gap: 8, marginTop: 8 }}>
        <Botao rotulo={rotuloConfirmar} variante={perigo ? 'perigo' : 'primario'} carregando={carregando} onPress={onConfirmar} />
        <Botao rotulo="Voltar" variante="terciario" onPress={onFechar} />
      </View>
    </BottomSheet>
  );
}
