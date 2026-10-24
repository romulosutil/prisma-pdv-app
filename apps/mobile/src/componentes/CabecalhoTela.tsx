import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { Texto } from '@/componentes/Texto';

export interface CabecalhoTelaProps {
  titulo: string;
  onVoltar: () => void;
  /** Rótulo do botão voltar para o leitor de tela ("Voltar para produtos"). */
  rotuloVoltar?: string;
  direita?: ReactNode;
}

/** Topo das telas internas: botão voltar (48) e título em Título L. */
export function CabecalhoTela({ titulo, onVoltar, rotuloVoltar = 'Voltar', direita }: CabecalhoTelaProps) {
  return (
    <View style={estilos.linha}>
      <BotaoIcone icone="voltar" rotulo={rotuloVoltar} onPress={onVoltar} />
      <Texto estilo="tituloL" accessibilityRole="header" style={estilos.titulo}>
        {titulo}
      </Texto>
      {direita}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { flex: 1 },
});
