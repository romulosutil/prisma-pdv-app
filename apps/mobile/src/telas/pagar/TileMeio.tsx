import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icone, type NomeIcone } from '@/componentes/Icone';
import { Texto } from '@/componentes/Texto';
import { cores, legendaForte, raio, textoBotao, textoMonograma } from '@/tema';
import { useFoco } from '@/tema/useFoco';

export interface TileMeioProps {
  titulo: string;
  legenda: string;
  onPress: () => void;
  /** Monograma do provedor ("IP", "MP"); tem prioridade sobre `icone`. */
  monograma?: string;
  icone?: NomeIcone;
  fundo?: string;
  cor?: string;
  /** Etiqueta à direita no lugar da seta (ex.: "Plano Negócio" com cadeado, "Conectar"). */
  etiqueta?: { texto: string; icone?: NomeIcone };
  /** Texto lido a mais pelo leitor de tela (ex.: "Bloqueado no seu plano"). */
  situacao?: string;
  /** Conteúdo logo abaixo da linha (ex.: escolha do provedor). */
  abaixo?: ReactNode;
}

/** Linha de meio de pagamento do checkout: um botão de 72 de altura, com a escolha do provedor embaixo quando houver. */
export function TileMeio({ titulo, legenda, onPress, monograma, icone, fundo = cores.bg, cor = cores.ink, etiqueta, situacao, abaixo }: TileMeioProps) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <View style={estilos.tile}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${titulo}. ${legenda}${situacao ? `. ${situacao}` : ''}`}
        onPress={onPress}
        onFocus={aoFocar}
        onBlur={aoDesfocar}
        style={({ pressed }) => [estilos.linha, pressed && estilos.pressionado, anel]}
      >
        <View style={[estilos.miniatura, { backgroundColor: fundo }]}>
          {monograma ? (
            <Texto cor={cor} style={textoMonograma}>
              {monograma}
            </Texto>
          ) : icone ? (
            <Icone nome={icone} cor={cor} />
          ) : null}
        </View>
        <View style={estilos.textos}>
          <Texto style={textoBotao.M}>{titulo}</Texto>
          <Texto estilo="legenda" cor={cores.ink3}>
            {legenda}
          </Texto>
        </View>
        {etiqueta ? (
          <View style={estilos.etiqueta}>
            {etiqueta.icone ? <Icone nome={etiqueta.icone} tamanho={14} cor={cores.ambar} espessura={2.5} /> : null}
            <Texto cor={cores.ambar} style={legendaForte}>
              {etiqueta.texto}
            </Texto>
          </View>
        ) : (
          <Icone nome="chevronDireita" cor={cores.ink2} />
        )}
      </Pressable>
      {abaixo ? <View style={estilos.abaixo}>{abaixo}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tile: { borderRadius: raio.md, backgroundColor: cores.surface, overflow: 'hidden' },
  linha: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pressionado: { backgroundColor: cores.surface2 },
  miniatura: { width: 40, height: 40, borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  etiqueta: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 10, borderRadius: 999, backgroundColor: cores.ambarSoft },
  abaixo: { marginLeft: 68, marginRight: 16, paddingBottom: 12 },
});
