import { formatarBRL, multiplicarPreco } from '@pdv/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Chip } from '@/componentes/Chip';
import { TecladoNumerico } from '@/componentes/TecladoNumerico';
import { Texto } from '@/componentes/Texto';
import { formatarPeso } from '@/dados/carrinho';
import { cores, raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { aplicarTecla } from '@/util/entradaDinheiro';

const PESO_MAXIMO_G = 99_999;
const ATALHOS_G = [
  { rotulo: '100 g', gramas: 100 },
  { rotulo: '250 g', gramas: 250 },
  { rotulo: '500 g', gramas: 500 },
  { rotulo: '1 kg', gramas: 1000 },
] as const;

export interface FolhaPesoProps {
  /** `null` fecha a folha. */
  produto: { nome: string; precoCentavos: number } | null;
  /** Peso atual em gramas, ao alterar um item que já está no carrinho. */
  pesoInicial?: number;
  onConfirmar: (gramas: number) => void;
  onFechar: () => void;
}

/** Pede o peso (em gramas, digitado de trás para frente) de um item vendido por kg. */
export function FolhaPeso({ produto, pesoInicial = 0, onConfirmar, onFechar }: FolhaPesoProps) {
  return (
    <BottomSheet visivel={produto !== null} onFechar={onFechar} titulo={produto ? `Peso: ${produto.nome}` : 'Peso'}>
      {produto ? <ConteudoPeso precoPorKg={produto.precoCentavos} pesoInicial={pesoInicial} editando={pesoInicial > 0} onConfirmar={onConfirmar} /> : null}
    </BottomSheet>
  );
}

function ConteudoPeso({ precoPorKg, pesoInicial, editando, onConfirmar }: { precoPorKg: number; pesoInicial: number; editando: boolean; onConfirmar: (gramas: number) => void }) {
  const [gramas, setGramas] = useState(pesoInicial);
  const total = multiplicarPreco(precoPorKg, gramas);

  return (
    <View style={estilos.conteudo}>
      <View
        accessible
        accessibilityLabel={`Peso: ${formatarPeso(gramas)}. Preço do quilo: ${falarDinheiro(precoPorKg)}.`}
        accessibilityLiveRegion="polite"
        style={estilos.visor}
      >
        <Texto estilo="label" cor={cores.ink2}>
          {`Peso · ${formatarBRL(precoPorKg)}/kg`}
        </Texto>
        <Texto estilo="display" numerico adjustsFontSizeToFit numberOfLines={1}>
          {formatarPeso(gramas)}
        </Texto>
      </View>
      <View style={estilos.atalhos}>
        {ATALHOS_G.map((a) => (
          <Chip key={a.gramas} rotulo={a.rotulo} ativo={gramas === a.gramas} onPress={() => setGramas(a.gramas)} />
        ))}
      </View>
      <TecladoNumerico onTecla={(tecla) => setGramas((g) => aplicarTecla(g, tecla, PESO_MAXIMO_G))} />
      <Botao
        rotulo={gramas > 0 ? `${editando ? 'Salvar' : 'Adicionar'} ${formatarBRL(total)}` : 'Digite o peso'}
        desabilitado={gramas <= 0}
        onPress={() => onConfirmar(gramas)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16 },
  visor: { gap: 4, padding: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
