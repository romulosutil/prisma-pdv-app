import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';

export interface FolhaNaoEncontradoProps {
  /** Código lido que não está no catálogo; `null` fecha a folha. */
  codigo: string | null;
  onVenderAvulso: () => void;
  onCadastrar: () => void;
  onFechar: () => void;
}

/** Código que não está no catálogo: vender por valor ou cadastrar o produto na hora. */
export function FolhaNaoEncontrado({ codigo, onVenderAvulso, onCadastrar, onFechar }: FolhaNaoEncontradoProps) {
  return (
    <BottomSheet visivel={codigo !== null} onFechar={onFechar} titulo="Produto não encontrado">
      <View style={estilos.conteudo}>
        <Texto estilo="corpoL" cor={cores.ink2}>
          {`O código ${codigo ?? ''} não está no seu catálogo.`}
        </Texto>
        <Botao rotulo="Vender como avulso" onPress={onVenderAvulso} />
        <Botao rotulo="Cadastrar produto" variante="secundario" onPress={onCadastrar} />
        <Botao rotulo="Cancelar" variante="ghost" onPress={onFechar} />
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({ conteudo: { gap: 12 } });
