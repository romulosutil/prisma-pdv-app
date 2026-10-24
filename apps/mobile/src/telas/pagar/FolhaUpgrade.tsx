import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';

export interface FolhaUpgradeProps {
  visivel: boolean;
  onFechar: () => void;
}

/** Explica por que a aproximação está bloqueada no Essencial e leva à tela de planos. */
export function FolhaUpgrade({ visivel, onFechar }: FolhaUpgradeProps) {
  const router = useRouter();
  return (
    <BottomSheet visivel={visivel} onFechar={onFechar} titulo="Cartão por aproximação é do plano Negócio">
      <View style={estilos.conteudo}>
        <Texto estilo="corpoL" cor={cores.ink2}>
          Receba no próprio celular, sem maquininha, e tenha Pix com confirmação automática ao conectar InfinitePay ou Mercado Pago.
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2}>
          Enquanto isso, o Pix pela sua chave e o registro do cartão da maquininha continuam funcionando.
        </Texto>
        <Botao
          rotulo="Ver planos"
          onPress={() => {
            onFechar();
            router.push('/ajustes/assinatura');
          }}
        />
        <Botao rotulo="Agora não" variante="ghost" onPress={onFechar} />
      </View>
    </BottomSheet>
  );
}

const estilos = StyleSheet.create({ conteudo: { gap: 12 } });
