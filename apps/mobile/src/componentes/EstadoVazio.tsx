import { StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { Botao } from './Botao';
import { Ilustra, type KindIlustra } from './Ilustra';
import { Texto } from './Texto';

export interface EstadoVazioProps {
  ilustra?: KindIlustra;
  titulo: string;
  descricao: string;
  acao?: { rotulo: string; aoPressionar: () => void };
}

/** Estado vazio padrão para listas e cartões sem movimento. */
export function EstadoVazio({ ilustra, titulo, descricao, acao }: EstadoVazioProps) {
  return (
    <View style={estilos.caixa}>
      {ilustra ? <Ilustra kind={ilustra} size={112} /> : null}
      <View style={estilos.textos}>
        <Texto estilo="tituloM" style={estilos.centralizado}>
          {titulo}
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2} style={estilos.centralizado}>
          {descricao}
        </Texto>
      </View>
      {acao ? <Botao rotulo={acao.rotulo} variante="secundario" tamanho="M" onPress={acao.aoPressionar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { alignItems: 'center', padding: 20, gap: 12, borderRadius: raio.lg, backgroundColor: cores.surface },
  textos: { gap: 4, alignItems: 'center' },
  centralizado: { textAlign: 'center' },
});
