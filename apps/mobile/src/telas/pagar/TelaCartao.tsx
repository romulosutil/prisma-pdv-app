import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Segmentado } from '@/componentes/Segmentado';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { useCobranca } from './useCobranca';

type TipoDeCartao = 'cartao_credito' | 'cartao_debito';

const OPCOES = [
  { valor: 'cartao_credito', rotulo: 'Crédito' },
  { valor: 'cartao_debito', rotulo: 'Débito' },
] as const;

/** Cartão passado na maquininha do lojista: o app só registra o que foi aprovado lá. */
export function TelaCartao() {
  const { valorCentavos, receber, ocupado } = useCobranca();
  const [tipo, setTipo] = useState<TipoDeCartao>('cartao_credito');

  return (
    <TelaBase
      rodape={<Botao rotulo="Aprovado na maquininha" carregando={ocupado} onPress={() => void receber({ meio: tipo, provedor: null })} />}
    >
      <CabecalhoPagamento titulo="Cartão" />
      <View style={estilos.conteudo}>
        <View accessible accessibilityLabel={`A cobrar ${falarDinheiro(valorCentavos)}`}>
          <Texto estilo="legenda" cor={cores.ink3}>
            A cobrar na maquininha
          </Texto>
          <Dinheiro centavos={valorCentavos} estilo="display" accessible={false} />
        </View>
        <Segmentado rotuloGrupo="Tipo de cartão" opcoes={OPCOES} valor={tipo} onChange={setTipo} />
        <Banner tipo="info" texto="Digite o valor na sua maquininha, passe o cartão e toque em “Aprovado na maquininha” só depois da aprovação. O app apenas registra o recebimento." />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flex: 1, gap: 20, paddingTop: 8 },
});
