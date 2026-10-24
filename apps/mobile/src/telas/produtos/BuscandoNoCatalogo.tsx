import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { consultarCatalogo } from '@/servicos/catalogoEan';
import { cores } from '@/tema';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { useVoltar } from '@/util/useVoltar';

/** Passo entre ler o código e preencher o cadastro: consulta o catálogo e segue sozinho para o formulário. */
export function BuscandoNoCatalogo() {
  const router = useRouter();
  const voltar = useVoltar('/produtos/scanner');
  const { ean = '' } = useLocalSearchParams<{ ean?: string }>();

  useEffect(() => {
    const controle = new AbortController();
    consultarCatalogo(ean, { sinal: controle.signal })
      .then((resultado) =>
        router.replace({
          pathname: '/produtos/novo',
          params: { ean, origem: 'camera', ...(resultado.achou ? { nome: resultado.nome } : {}) },
        }),
      )
      // Só rejeita ao sair da tela (consulta cancelada), quando não há mais o que fazer.
      .catch(() => undefined);
    return () => controle.abort();
  }, [ean, router]);

  return (
    <TelaBase bordas={['top']} style={estilos.tela}>
      <CabecalhoTela titulo="Cadastro" onVoltar={voltar} rotuloVoltar="Cancelar e voltar à câmera" />
      <View style={estilos.centro}>
        <Ilustra kind="busca" size={160} />
        <View style={estilos.estado} accessibilityLiveRegion="polite">
          <ActivityIndicator color={cores.anil} />
          <Texto estilo="tituloM" accessibilityRole="header" style={estilos.titulo}>
            Procurando no catálogo nacional…
          </Texto>
        </View>
        <Texto estilo="label" cor={cores.ink2} numerico>
          {`Código ${ean}`}
        </Texto>
      </View>
      <Botao
        rotulo="Preencher manualmente"
        variante="terciario"
        onPress={() => router.replace({ pathname: '/produtos/novo', params: { ean, origem: 'camera', manual: '1' } })}
      />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 16, paddingTop: 16, paddingBottom: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { flexShrink: 1 },
});
