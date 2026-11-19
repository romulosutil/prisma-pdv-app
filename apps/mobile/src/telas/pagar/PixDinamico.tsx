import { gerarId, type CobrancaPix } from '@pdv/shared';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useConta, useDados } from '@/dados/hooks';
import type { ProvedorPagamento } from '@/dados/tipos';
import { registrar } from '@/diagnostico/registro';
import { mensagemDeErro } from '@/servicos/backend';
import { provedoresPagamento, type CobrancaPix as CobrancaDemo, type SituacaoPix } from '@/servicos/provedoresPagamento';
import { cores, textoMonograma } from '@/tema';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { PROVEDORES } from '@/util/provedores';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { CartaoQr } from './CartaoQr';
import { useCobranca } from './useCobranca';

const segundosAte = (instante: Date): number => Math.max(0, Math.ceil((instante.getTime() - Date.now()) / 1000));
const relogio = (segundos: number): string => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

/** Pix com cobrança automática no servidor (MP/InfinitePay) ou simulador em modo demo. */
export function PixDinamico({ provedor }: { provedor: ProvedorPagamento }) {
  const router = useRouter();
  const toast = useToast();
  const dados = useDados();
  const { nomeLoja } = useConta();
  const { valorCentavos, registrarParcela, receber, ocupado, parametros } = useCobranca();
  const info = PROVEDORES.find((p) => p.id === provedor)!;
  const modoHttp = dados.backend.modo === 'http' && Boolean(dados.backend.criarCobrancaIntegrada);

  if (modoHttp) {
    return (
      <PixDinamicoServidor
        provedor={provedor}
        info={info}
        valorCentavos={valorCentavos}
        nomeLoja={nomeLoja}
        registrarParcela={registrarParcela}
        receber={receber}
        ocupado={ocupado}
        parametros={parametros}
        router={router}
        toast={toast}
      />
    );
  }

  return (
    <PixDinamicoDemo
      provedor={provedor}
      info={info}
      valorCentavos={valorCentavos}
      nomeLoja={nomeLoja}
      registrarParcela={registrarParcela}
      parametros={parametros}
      router={router}
      toast={toast}
    />
  );
}

function PixDinamicoServidor({
  provedor,
  info,
  valorCentavos,
  nomeLoja,
  registrarParcela,
  receber,
  ocupado,
  parametros,
  router,
  toast,
}: {
  provedor: ProvedorPagamento;
  info: (typeof PROVEDORES)[number];
  valorCentavos: number;
  nomeLoja: string;
  registrarParcela: ReturnType<typeof useCobranca>['registrarParcela'];
  receber: ReturnType<typeof useCobranca>['receber'];
  ocupado: boolean;
  parametros: ReturnType<typeof useCobranca>['parametros'];
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>;
}) {
  const dados = useDados();
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [restante, setRestante] = useState(0);
  const confirmada = useRef(false);

  const criarCobranca = useCallback(async () => {
    confirmada.current = false;
    setCarregando(true);
    setErro(null);
    try {
      const vendaId = dados.carrinho.vendaIdAtual() ?? gerarId();
      const pagamentoId = gerarId();
      const nova = await dados.backend.criarCobrancaIntegrada!({
        vendaId,
        pagamentoId,
        valorCentavos,
        provedor,
        meio: 'pix',
        descricao: `Venda ${nomeLoja}`,
      });
      setCobranca(nova);
      if (nova.expiraEm) setRestante(segundosAte(new Date(nova.expiraEm)));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [dados, valorCentavos, provedor, nomeLoja]);

  useEffect(() => {
    void criarCobranca();
  }, [criarCobranca, tentativa]);

  useEffect(() => {
    if (!cobranca || (cobranca.estado !== 'aguardando' && cobranca.estado !== 'criando')) return;
    let ativo = true;
    const conferir = async () => {
      try {
        const atual = await dados.backend.acompanharCobrancaIntegrada!(cobranca.id);
        if (!ativo) return;
        setCobranca(atual);
        if (atual.expiraEm) setRestante(segundosAte(new Date(atual.expiraEm)));
        if ((atual.estado === 'paga' || atual.estado === 'paga_tardia') && !confirmada.current) {
          confirmada.current = true;
          await registrarParcela({ id: atual.id, meio: 'pix', provedor, confirmacao: 'integrado', maquininha: info.nome });
          registrar('pagamento', 'pix pago', { provedor, valorCentavos, resultado: 'aprovado' });
          router.replace({ pathname: '/pagar/pixpago', params: parametros({ cobranca: atual.id, provedor }) });
        }
      } catch {
        // Falha pontual de rede não fecha a cobrança; a próxima consulta ou conciliação confere.
      }
    };
    const timerPoll = setInterval(() => void conferir(), 3000);
    const timerRelogio = setInterval(() => {
      if (cobranca.expiraEm) setRestante(segundosAte(new Date(cobranca.expiraEm)));
    }, 1000);
    return () => {
      ativo = false;
      clearInterval(timerPoll);
      clearInterval(timerRelogio);
    };
  }, [cobranca, dados.backend, registrarParcela, provedor, info.nome, valorCentavos, router, parametros]);

  const codigo = cobranca?.pix?.qrCode ?? cobranca?.checkoutUrl ?? null;
  const expirada = cobranca?.estado === 'expirada' || cobranca?.estado === 'cancelada' || cobranca?.estado === 'erro_provedor';

  const copiar = async () => {
    if (!codigo) return;
    await Clipboard.setStringAsync(codigo);
    toast.mostrar('Código Pix copiado', { tipo: 'sucesso' });
  };

  const cancelar = async () => {
    if (cobranca && (cobranca.estado === 'aguardando' || cobranca.estado === 'criando') && dados.backend.cancelarCobrancaIntegrada) {
      try {
        const res = await dados.backend.cancelarCobrancaIntegrada(cobranca.id);
        if (res.estado === 'paga' || res.estado === 'paga_tardia') {
          await registrarParcela({ id: res.id, meio: 'pix', provedor, confirmacao: 'integrado', maquininha: info.nome });
          router.replace({ pathname: '/pagar/pixpago', params: parametros({ cobranca: res.id, provedor }) });
          return;
        }
      } catch {
        // Permanece resiliente caso não haja rede no cancelamento.
      }
    }
    router.back();
  };

  return (
    <TelaBase rolavel>
      <CabecalhoPagamento
        titulo={`Pix · ${info.nome}`}
        rotuloVoltar="Cancelar cobrança e voltar"
        onVoltar={() => void cancelar()}
        adorno={
          <View style={[estilos.monograma, { backgroundColor: info.fundo }]}>
            <Texto cor={info.cor} style={textoMonograma}>
              {info.monograma}
            </Texto>
          </View>
        }
      />
      <View style={estilos.conteudo}>
        {erro ? <Banner tipo="erro" texto={erro} /> : null}
        {carregando && !cobranca ? (
          <Banner tipo="info" texto={`Gerando cobrança em ${info.nome}…`} />
        ) : null}
        {codigo && !expirada ? (
          <>
            <Banner tipo="info" texto="Deixe o brilho da tela no máximo para facilitar a leitura." />
            <CartaoQr codigo={codigo} valorCentavos={valorCentavos} />
            <View style={estilos.valor}>
              <Dinheiro centavos={valorCentavos} estilo="display" />
              <Texto estilo="label" cor={cores.ink2} numerico>
                {`Expira em ${relogio(restante)}`}
              </Texto>
            </View>
            {cobranca?.checkoutUrl ? (
              <Botao
                rotulo="Abrir Checkout InfinitePay"
                variante="primario"
                tamanho="M"
                larguraTotal
                onPress={() => void Linking.openURL(cobranca.checkoutUrl!)}
              />
            ) : null}
            <Botao rotulo="Copiar código Pix" icone="copiar" variante="secundario" tamanho="M" larguraTotal onPress={() => void copiar()} />
            <View accessibilityRole="text" accessibilityLiveRegion="polite" style={estilos.status}>
              <View style={estilos.ponto} />
              <Texto estilo="corpo" cor={cores.ink2} style={estilos.textoStatus}>
                <Texto estilo="corpoMedio">Aguardando confirmação…</Texto> consultando automaticamente.
              </Texto>
            </View>
          </>
        ) : null}

        {expirada || erro ? (
          <Botao rotulo="Gerar nova cobrança" onPress={() => setTentativa((t) => t + 1)} />
        ) : null}

        <Botao
          rotulo="Confirmar manualmente (Pix já caiu)"
          variante="terciario"
          tamanho="M"
          larguraTotal
          carregando={ocupado}
          onPress={() => void receber({ meio: 'pix', provedor, confirmacao: 'manual', maquininha: info.nome })}
        />
        <Botao rotulo="Cancelar cobrança" variante="ghost" tamanho="M" larguraTotal onPress={() => void cancelar()} />
      </View>
    </TelaBase>
  );
}

function PixDinamicoDemo({
  provedor,
  info,
  valorCentavos,
  nomeLoja,
  registrarParcela,
  parametros,
  router,
  toast,
}: {
  provedor: ProvedorPagamento;
  info: (typeof PROVEDORES)[number];
  valorCentavos: number;
  nomeLoja: string;
  registrarParcela: ReturnType<typeof useCobranca>['registrarParcela'];
  parametros: ReturnType<typeof useCobranca>['parametros'];
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>;
}) {
  const [cobranca, setCobranca] = useState<CobrancaDemo>(() =>
    provedoresPagamento.criarCobrancaPix({ provedor, valorCentavos, nomeRecebedor: nomeLoja }),
  );
  const [situacao, setSituacao] = useState<SituacaoPix>('aguardando');
  const [restante, setRestante] = useState(() => segundosAte(cobranca.expiraEm));
  const confirmada = useRef(false);
  const expiradoRegistrado = useRef(false);

  useEffect(() => {
    const conferir = async () => {
      const atual = provedoresPagamento.situacaoPix(cobranca.id);
      setSituacao(atual);
      setRestante(segundosAte(cobranca.expiraEm));
      if (atual === 'expirado' && !expiradoRegistrado.current) {
        expiradoRegistrado.current = true;
        registrar('pagamento', 'pix expirado', { provedor, valorCentavos, resultado: 'expirado' });
      }
      if (atual !== 'pago' || confirmada.current) return;
      confirmada.current = true;
      try {
        await registrarParcela({ meio: 'pix', provedor, confirmacao: 'integrado' });
        registrar('pagamento', 'pix pago', { provedor, valorCentavos, resultado: 'aprovado' });
        router.replace({ pathname: '/pagar/pixpago', params: parametros({ cobranca: cobranca.id, provedor }) });
      } catch (e) {
        confirmada.current = false;
        toast.mostrar(e instanceof Error ? e.message : 'Não foi possível guardar o recebimento.', { tipo: 'erro' });
      }
    };
    void conferir();
    const intervalo = setInterval(() => void conferir(), 1000);
    return () => clearInterval(intervalo);
  }, [cobranca, provedor, valorCentavos, registrarParcela, parametros, router, toast]);

  const copiar = async () => {
    await Clipboard.setStringAsync(cobranca.copiaECola);
    toast.mostrar('Código Pix copiado', { tipo: 'sucesso' });
  };

  const gerarNovo = () =>
    setCobranca(provedoresPagamento.criarCobrancaPix({ provedor, valorCentavos, nomeRecebedor: nomeLoja }));
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
