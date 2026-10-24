import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { Texto } from '@/componentes/Texto';

export interface CabecalhoPagamentoProps {
  titulo: string;
  /** Padrão: volta uma tela. `false` esconde o botão (venda com dinheiro já recebido). */
  onVoltar?: (() => void) | false;
  rotuloVoltar?: string;
  /** Item à esquerda do título (ex.: monograma do provedor). */
  adorno?: ReactNode;
}

export function CabecalhoPagamento({ titulo, onVoltar, rotuloVoltar = 'Voltar', adorno }: CabecalhoPagamentoProps) {
  const router = useRouter();
  return (
    <View style={estilos.linha}>
      {onVoltar === false ? null : <BotaoIcone icone="voltar" rotulo={rotuloVoltar} onPress={onVoltar ?? (() => router.back())} />}
      {adorno}
      <Texto estilo="tituloM" accessibilityRole="header" style={estilos.titulo}>
        {titulo}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { flex: 1 },
});
