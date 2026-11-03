import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { Icone, type NomeIcone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { cores } from '@/tema';
import { useToast } from '@/componentes/Toast';

const BENEFICIOS: readonly { icone: NomeIcone; texto: string }[] = [
  { icone: 'moldura', texto: 'Aponte para um código por vez e confira o produto lido' },
  { icone: 'vibrar', texto: 'Apita e vibra a cada produto' },
  { icone: 'lua', texto: 'Pausa sozinho para poupar bateria' },
];

export default function PermissaoCamera() {
  const router = useRouter();
  const [, pedirPermissao] = useCameraPermissions();
  const toast = useToast();

  const permitir = async () => {
    try { await pedirPermissao(); router.replace('/'); }
    catch { toast.mostrar('Não foi possível solicitar a câmera. Você pode continuar digitando os códigos.', { tipo: 'erro' }); }
  };

  return (
    <TelaBase
      rolavel
      rodape={
        <>
          <Botao rotulo="Permitir câmera" onPress={permitir} />
          <Botao rotulo="Agora não" variante="ghost" tamanho="M" larguraTotal onPress={() => router.replace('/')} />
        </>
      }
    >
      <CabecalhoEtapa etapa={6} total={6} onVoltar={() => router.back()} />
      <View style={estilos.ilustracao}>
        <Ilustra kind="scanner" size={200} />
      </View>
      <Texto estilo="tituloXL" accessibilityRole="header" style={estilos.titulo}>
        Seu celular vira um leitor de código de barras
      </Texto>
      <View style={estilos.lista}>
        {BENEFICIOS.map((b) => (
          <View key={b.texto} style={estilos.item}>
            <View style={estilos.icone}>
              <Icone nome={b.icone} />
            </View>
            <Texto estilo="corpoMedio" style={estilos.textoItem}>
              {b.texto}
            </Texto>
          </View>
        ))}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  ilustracao: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  titulo: { marginBottom: 24 },
  lista: { gap: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  icone: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.surface, alignItems: 'center', justifyContent: 'center' },
  textoItem: { flex: 1 },
});
