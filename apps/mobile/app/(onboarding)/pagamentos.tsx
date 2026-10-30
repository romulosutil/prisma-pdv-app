import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { TelaBase } from '@/componentes/TelaBase';
import { TilePagamento } from '@/componentes/TilePagamento';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';

export default function Pagamentos() {
  const router = useRouter();

  return (
    <TelaBase rolavel rodape={<Botao rotulo="Continuar" onPress={() => router.push('/camera')} />}>
      <CabecalhoEtapa etapa={5} total={6} onVoltar={() => router.back()} />
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          Seus meios de recebimento
        </Texto>
        <View style={estilos.lista}>
          <TilePagamento titulo="Pix" legenda="Pela sua chave, com confirmação manual" icone="pix" fundo={cores.bg} cor={cores.ink} estado="sempre_ativo" />
          <TilePagamento titulo="Cartão" legenda="Registro manual da maquininha" icone="cartao" fundo={cores.bg} cor={cores.ink} estado="sempre_ativo" />
          <TilePagamento
            titulo="Dinheiro"
            legenda="Com calculadora de troco"
            icone="dinheiro"
            fundo={cores.folhaSoft}
            cor={cores.folha}
            estado="sempre_ativo"
          />
          <Texto estilo="legenda" cor={cores.ink3}>
            Confira o recebimento antes de confirmar a venda.
          </Texto>
        </View>
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 32, paddingTop: 24 },
  lista: { gap: 12 },
});
