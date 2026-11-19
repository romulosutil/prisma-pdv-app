import { codigoCurto } from '@pdv/shared';
import * as Clipboard from 'expo-clipboard';
import { Pressable, StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { Icone } from './Icone';
import { Texto } from './Texto';
import { useToast } from './Toast';

export interface CodigoCurtoProps {
  rotulo?: string;
  id: string;
}

/** Exibe o identificador curto (#A1B2C3) sem expor UUID cru na interface e copia o ID completo ao tocar. */
export function CodigoCurto({ rotulo = 'Código', id }: CodigoCurtoProps) {
  const toast = useToast();
  const curto = codigoCurto(id);

  const copiar = async () => {
    try {
      await Clipboard.setStringAsync(id);
      toast.mostrar(`${rotulo} copiado`, { tipo: 'sucesso' });
    } catch {
      toast.mostrar('Não foi possível copiar o código.', { tipo: 'erro' });
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}: ${curto}. Toque para copiar o identificador completo`}
      onPress={() => void copiar()}
      style={({ pressed }) => [estilos.pill, pressed && estilos.pressionado]}
    >
      <View style={estilos.linha}>
        <Texto estilo="legenda" cor={cores.ink3}>
          {`${rotulo}:`}
        </Texto>
        <Texto estilo="codigo" cor={cores.ink2}>
          {curto}
        </Texto>
        <Icone nome="copiar" tamanho={14} cor={cores.ink3} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: raio.sm, backgroundColor: cores.surface2 },
  pressionado: { opacity: 0.75 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
