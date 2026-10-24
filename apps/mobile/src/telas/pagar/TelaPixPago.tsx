import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Ilustra } from '@/componentes/Ilustra';
import { Texto } from '@/componentes/Texto';
import { cores, margemTela, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { formatarHora } from '@/util/tempo';
import { NOME_PROVEDOR } from './rotulos';
import { useCobranca } from './useCobranca';

/** Confirmação em tela cheia (folha) de que o banco recebeu o Pix. A parcela já foi registrada na tela anterior. */
export function TelaPixPago() {
  const { valorCentavos, provedor, avancar, ocupado } = useCobranca();
  const { aoFocar, aoDesfocar, anel } = useFoco();
  const hora = formatarHora(new Date());

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Pix recebido, ${falarDinheiro(valorCentavos)}`);
  }, [valorCentavos]);

  return (
    <SafeAreaView style={estilos.tela}>
      <View accessibilityRole="alert" style={estilos.centro}>
        <Ilustra kind="check" size={160} />
        <Texto estilo="display" cor={cores.bg} accessibilityRole="header">
          Pix recebido!
        </Texto>
        <View style={estilos.detalhe}>
          <Dinheiro centavos={valorCentavos} estilo="tituloM" cor={cores.bg} />
          <Texto estilo="tituloM" cor={cores.bg}>{`· ${provedor ? NOME_PROVEDOR[provedor] : 'Pix'} · ${hora}`}</Texto>
        </View>
        <Texto estilo="corpoL" cor={cores.bg} style={estilos.nota}>
          Confirmado pelo banco. Não precisa conferir o comprovante do cliente.
        </Texto>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar"
        accessibilityState={{ busy: ocupado, disabled: ocupado }}
        disabled={ocupado}
        onPress={() => void avancar()}
        onFocus={aoFocar}
        onBlur={aoDesfocar}
        style={({ pressed }) => [estilos.botao, pressed && estilos.pressionado, anel]}
      >
        <Texto cor={cores.ink} style={textoBotao.L}>
          Continuar
        </Texto>
      </Pressable>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, paddingHorizontal: margemTela, paddingBottom: 16, backgroundColor: cores.folha },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  detalhe: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nota: { maxWidth: 300, textAlign: 'center' },
  botao: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: cores.bg },
  pressionado: { backgroundColor: cores.surface2 },
});
