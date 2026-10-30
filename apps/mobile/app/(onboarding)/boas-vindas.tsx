import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { cores, textoMarca } from '@/tema';

export default function BoasVindas() {
  const router = useRouter();
  return (
    <TelaBase
      rolavel
      rodape={
        <>
          <Botao rotulo="Começar" onPress={() => router.push('/criar-conta')} />
          <Botao rotulo="Já tenho conta" variante="ghost" tamanho="M" larguraTotal onPress={() => router.push('/entrar')} />
        </>
      }
    >
      <View style={estilos.marca}>
        <Texto style={textoMarca} accessibilityRole="header">
          [nome]
        </Texto>
      </View>
      <View style={estilos.ilustracao}>
        <Ilustra kind="cesta" size={260} />
      </View>
      <View style={estilos.textos}>
        <Texto estilo="display" accessibilityRole="header">
          Seu balcão inteiro no celular.
        </Texto>
        <Texto estilo="corpoL" cor={cores.ink2}>
          Cadastre bipando, venda bipando e confirme seus recebimentos no Pix, cartão ou dinheiro.
        </Texto>
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  marca: { minHeight: 44, justifyContent: 'center' },
  ilustracao: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  textos: { gap: 12, marginBottom: 32 },
});
