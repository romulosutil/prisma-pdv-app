import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useConta } from '@/dados/hooks';
import type { ProvedorPagamento } from '@/dados/tipos';
import { provedoresPagamento, type SituacaoPix } from '@/servicos/provedoresPagamento';
import { cores, textoMonograma } from '@/tema';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { PROVEDORES } from '@/util/provedores';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { CartaoQr } from './CartaoQr';
import { useCobranca } from './useCobranca';

const segundosAte = (instante: Date): number => Math.max(0, Math.ceil((instante.getTime() - Date.now()) / 1000));
const relogio = (segundos: number): string => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

/** Pix com QR da cobrança no provedor: a tela acompanha o banco e muda sozinha quando o dinheiro cai. */
export function PixDinamico({ provedor }: { provedor: ProvedorPagamento }) {
  const router = useRouter();
  const toast = useToast();
  const { nomeLoja } = useConta();
  const { valorCentavos, registrarParcela, parametros } = useCobranca();
  const info = PROVEDORES.find((p) => p.id === provedor)!;

  const [cobranca, setCobranca] = useState(() => provedoresPagamento.criarCobrancaPix({ provedor, valorCentavos, nomeRecebedor: nomeLoja }));
  const [situacao, setSituacao] = useState<SituacaoPix>('aguardando');
  const [restante, setRestante] = useState(() => segundosAte(cobranca.expiraEm));
  const confirmada = useRef(false);

  useEffect(() => {
    const conferir = () => {
      const atual = provedoresPagamento.situacaoPix(cobranca.id);
      setSituacao(atual);
      setRestante(segundosAte(cobranca.expiraEm));
      if (atual !== 'pago' || confirmada.current) return;
      confirmada.current = true;
      registrarParcela({ meio: 'pix', provedor });
      router.replace({ pathname: '/pagar/pixpago', params: parametros() });
    };
    conferir();
    const intervalo = setInterval(conferir, 1000);
    return () => clearInterval(intervalo);
  }, [cobranca, provedor, registrarParcela, parametros, router]);

  const copiar = async () => {
    await Clipboard.setStringAsync(cobranca.copiaECola);
    toast.mostrar('Código Pix copiado', { tipo: 'sucesso' });
  };

  const gerarNovo = () => setCobranca(provedoresPagamento.criarCobrancaPix({ provedor, valorCentavos, nomeRecebedor: nomeLoja }));
  const expirado = situacao === 'expirado';

  return (
    <TelaBase rolavel>
      <CabecalhoPagamento
        titulo={`Pix · ${info.nome}`}
        rotuloVoltar="Cancelar cobrança e voltar"
        adorno={
          <View style={[estilos.monograma, { backgroundColor: info.fundo }]}>
            <Texto cor={info.cor} style={textoMonograma}>
              {info.monograma}
            </Texto>
          </View>
        }
      />
      <View style={estilos.conteudo}>
        <Banner tipo="info" texto="Deixe o brilho da tela no máximo para facilitar a leitura." />
        <CartaoQr codigo={cobranca.copiaECola} valorCentavos={valorCentavos} />
        <View style={estilos.valor}>
          <Dinheiro centavos={valorCentavos} estilo="display" />
          {expirado ? (
            <Texto estilo="label" cor={cores.ambar} accessibilityLiveRegion="polite">
              Código expirado
            </Texto>
          ) : (
            <Texto estilo="label" cor={cores.ink2} numerico>
              {`Expira em ${relogio(restante)}`}
            </Texto>
          )}
        </View>

        {expirado ? (
          <Botao rotulo="Gerar novo código" onPress={gerarNovo} />
        ) : (
          <>
            <Botao rotulo="Copiar código Pix" icone="copiar" variante="secundario" tamanho="M" larguraTotal onPress={() => void copiar()} />
            <View accessibilityRole="text" accessibilityLiveRegion="polite" style={estilos.status}>
              <View style={estilos.ponto} />
              <Texto estilo="corpo" cor={cores.ink2} style={estilos.textoStatus}>
                <Texto estilo="corpoMedio">Aguardando pagamento…</Texto> a tela muda sozinha quando cair.
              </Texto>
            </View>
          </>
        )}

        <Botao rotulo="Cancelar cobrança" variante="ghost" tamanho="M" larguraTotal onPress={() => router.back()} />
        {FERRAMENTAS_TESTE ? (
          <Botao
            rotulo="Simular pagamento recebido"
            variante="terciario"
            tamanho="S"
            larguraTotal
            desabilitado={expirado}
            onPress={() => provedoresPagamento.simularPagamentoPix(cobranca.id)}
          />
        ) : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16, paddingTop: 4, paddingBottom: 16 },
  monograma: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  valor: { alignItems: 'center', gap: 6 },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ponto: { width: 10, height: 10, marginTop: 6, borderRadius: 5, backgroundColor: cores.anil },
  textoStatus: { flex: 1 },
});
