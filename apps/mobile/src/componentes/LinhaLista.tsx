import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { cores, raio } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { Texto } from './Texto';

export interface LinhaListaProps {
  titulo: string;
  subtitulo?: string;
  /** Miniatura de 44 (ilustração ou monograma). */
  miniatura?: ReactNode;
  /** Valor à direita (ex.: `<Dinheiro />`). */
  valor?: ReactNode;
  /** Nome lido pelo leitor de tela quando o valor à direita não for texto simples. */
  rotuloAcessivel?: string;
  onPress?: () => void;
  /** Linha divisória inferior. */
  divisor?: boolean;
  testID?: string;
}

/** Linha de lista de 64–72 de altura: miniatura, título + legenda e valor tabular à direita. */
export function LinhaLista({ titulo, subtitulo, miniatura, valor, rotuloAcessivel, onPress, divisor, testID }: LinhaListaProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  const conteudo = (
    <>
      {miniatura ? <View style={estilos.miniatura}>{miniatura}</View> : null}
      <View style={estilos.textos}>
        <Texto estilo="corpoMedio" numerico>
          {titulo}
        </Texto>
        {subtitulo ? (
          <Texto estilo="legenda" cor={cores.ink3} numerico>
            {subtitulo}
          </Texto>
        ) : null}
      </View>
      {valor}
    </>
  );
  const estiloLinha = [estilos.linha, divisor && estilos.divisor];

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={rotuloAcessivel} style={estiloLinha} testID={testID}>
        {conteudo}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      testID={testID}
      style={({ pressed }) => [estiloLinha, pressed && estilos.pressionada, anel]}
    >
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  divisor: { borderBottomWidth: 1, borderBottomColor: cores.line },
  pressionada: { backgroundColor: cores.surface },
  miniatura: {
    width: 44,
    height: 44,
    borderRadius: raio.md,
    backgroundColor: cores.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
});
