import { formatarBRL } from '@pdv/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Campo } from '@/componentes/Campo';
import { CampoDinheiro } from '@/componentes/CampoDinheiro';
import { Chip } from '@/componentes/Chip';
import { TecladoNumerico } from '@/componentes/TecladoNumerico';
import { aplicarTecla } from '@/util/entradaDinheiro';

const CATEGORIAS = ['Pão', 'Hortifruti', 'Diversos'] as const;

export interface FolhaAvulsoProps {
  visivel: boolean;
  onFechar: () => void;
  onAdicionar: (valorCentavos: number, descricao: string) => void;
}

/** Lança um valor sem produto cadastrado: teclado de centavos e uma descrição opcional. */
export function FolhaAvulso({ visivel, onFechar, onAdicionar }: FolhaAvulsoProps) {
  return (
    <BottomSheet visivel={visivel} onFechar={onFechar} titulo="Valor avulso">
      <ConteudoAvulso onAdicionar={onAdicionar} />
    </BottomSheet>
  );
}

function ConteudoAvulso({ onAdicionar }: { onAdicionar: FolhaAvulsoProps['onAdicionar'] }) {
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');

  return (
    <View style={estilos.conteudo}>
      <Campo rotulo="Descrição (opcional)" placeholder="Ex.: Hortifruti" value={descricao} onChangeText={setDescricao} maxLength={40} returnKeyType="done" />
      <View style={estilos.categorias}>
        {CATEGORIAS.map((categoria) => (
          <Chip key={categoria} rotulo={categoria} ativo={descricao === categoria} onPress={() => setDescricao(descricao === categoria ? '' : categoria)} />
        ))}
      </View>
      <CampoDinheiro rotulo="Valor" valorCentavos={valor} />
      <TecladoNumerico onTecla={(tecla) => setValor((v) => aplicarTecla(v, tecla))} />
      <Botao rotulo={valor > 0 ? `Adicionar ${formatarBRL(valor)}` : 'Digite o valor'} desabilitado={valor <= 0} onPress={() => onAdicionar(valor, descricao)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16 },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
