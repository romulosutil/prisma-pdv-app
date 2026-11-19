import { gerarId, motivoConfirmacaoManual, type CobrancaPix } from '@pdv/shared';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Chip } from '@/componentes/Chip';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Segmentado } from '@/componentes/Segmentado';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useConta, useDados, usePreferencias } from '@/dados/hooks';
import type { ProvedorVenda } from '@/dados/tipos';
import { mensagemDeErro } from '@/servicos/backend';
import { cores } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { CartaoQr } from './CartaoQr';
import { NOME_PROVEDOR } from './rotulos';
import { useCobranca } from './useCobranca';

type TipoDeCartao = 'cartao_credito' | 'cartao_debito' | 'tap';

const OPCOES_BASE = [
  { valor: 'cartao_credito', rotulo: 'Crédito' },
  { valor: 'cartao_debito', rotulo: 'Débito' },
] as const;

const OPCOES_COM_TAP = [
  ...OPCOES_BASE,
  { valor: 'tap', rotulo: 'InfiniteTap' },
] as const;

const MAQUININHAS: readonly { id: ProvedorVenda; rotulo: string }[] = [
  { id: 'infinitepay', rotulo: 'InfinitePay' },
  { id: 'mercadopago', rotulo: 'Mercado Pago' },
  { id: 'stone', rotulo: 'Stone' },
  { id: 'outro', rotulo: 'Outra' },
];

/** Cartão na maquininha com identificação do provedor ou link Checkout InfinitePay. */
export function TelaCartao() {
  const toast = useToast();
  const dados = useDados();
  const { nomeLoja } = useConta();
  const { preferencias } = usePreferencias();
  const { valorCentavos, receber, ocupado } = useCobranca();

  const [maquininha, setMaquininha] = useState<ProvedorVenda>(() =>
    preferencias.conectados.infinitepay
      ? 'infinitepay'
      : preferencias.conectados.mercadopago
        ? 'mercadopago'
        : 'stone',
  );
  const [tipo, setTipo] = useState<TipoDeCartao>('cartao_credito');
  const [nsu, setNsu] = useState('');
  const [nomeCustom, setNomeCustom] = useState('');
  const [erroNsu, setErroNsu] = useState<string | null>(null);

  const [linkCheckout, setLinkCheckout] = useState<CobrancaPix | null>(null);
  const [gerandoLink, setGerandoLink] = useState(false);
  const confirmandoLink = useRef(false);

  const podeCheckoutIp =
    maquininha === 'infinitepay' &&
    preferencias.conectados.infinitepay &&
    tipo !== 'tap' &&
    dados.backend.modo === 'http' &&
    Boolean(dados.backend.criarCobrancaIntegrada);

  useEffect(() => {
    if (maquininha !== 'infinitepay' && tipo === 'tap') {
      setTipo('cartao_credito');
    }
    setLinkCheckout(null);
  }, [maquininha, tipo]);

  useEffect(() => {
    if (!linkCheckout || (linkCheckout.estado !== 'aguardando' && linkCheckout.estado !== 'criando')) return;
    let ativo = true;
    const poll = setInterval(async () => {
      try {
        const atual = await dados.backend.acompanharCobrancaIntegrada!(linkCheckout.id);
        if (!ativo) return;
        setLinkCheckout(atual);
        if ((atual.estado === 'paga' || atual.estado === 'paga_tardia') && !confirmandoLink.current) {
          confirmandoLink.current = true;
          await receber({
            id: atual.id,
            meio: atual.meio === 'cartao_debito' ? 'cartao_debito' : 'cartao_credito',
            provedor: 'infinitepay',
            confirmacao: 'integrado',
            maquininha: 'InfinitePay Checkout',
          });
        }
      } catch {
        // Mantém tentando até vencer ou cancelar.
      }
    }, 3000);
    return () => {
      ativo = false;
      clearInterval(poll);
    };
  }, [linkCheckout, dados.backend, receber]);

  const gerarCheckoutInfinitePay = async () => {
    if (!dados.backend.criarCobrancaIntegrada || tipo === 'tap') return;
    setGerandoLink(true);
    setErroNsu(null);
    confirmandoLink.current = false;
    try {
      const vendaId = dados.carrinho.vendaIdAtual() ?? gerarId();
      const pagamentoId = gerarId();
      const nova = await dados.backend.criarCobrancaIntegrada({
        vendaId,
        pagamentoId,
        valorCentavos,
        provedor: 'infinitepay',
        meio: tipo,
        descricao: `Cartão ${nomeLoja}`,
      });
      setLinkCheckout(nova);
    } catch (e) {
      toast.mostrar(mensagemDeErro(e), { tipo: 'erro' });
    } finally {
      setGerandoLink(false);
    }
  };

  const confirmarManualOuTap = async () => {
    const idExterno = nsu.trim();
    if (tipo === 'tap') {
      if (!idExterno) {
        setErroNsu('Informe o NSU ou código do comprovante gerado no InfiniteTap.');
        return;
      }
      setErroNsu(null);
      await receber({
        meio: 'tap',
        provedor: 'infinitepay',
        confirmacao: 'aparelho',
        identificadorExterno: idExterno,
        maquininha: 'InfiniteTap',
      });
      return;
    }

    setErroNsu(null);
    await receber({
      meio: tipo,
      provedor: maquininha,
      confirmacao: 'manual',
      ...(idExterno ? { identificadorExterno: idExterno } : {}),
      maquininha: nomeCustom.trim() || NOME_PROVEDOR[maquininha],
    });
  };

  const motivoManual = motivoConfirmacaoManual(maquininha, tipo);

  return (
    <TelaBase
      rolavel
      rodape={
        <Botao
          rotulo={tipo === 'tap' ? 'Aprovado no InfiniteTap' : 'Aprovado na maquininha'}
          carregando={ocupado}
          onPress={() => void confirmarManualOuTap()}
        />
      }
    >
      <CabecalhoPagamento titulo="Cartão" />
      <View style={estilos.conteudo}>
        <View accessible accessibilityLabel={`A cobrar ${falarDinheiro(valorCentavos)}`}>
          <Texto estilo="legenda" cor={cores.ink3}>
            A cobrar no cartão
          </Texto>
          <Dinheiro centavos={valorCentavos} estilo="display" accessible={false} />
        </View>

        <View style={estilos.bloco}>
          <Texto estilo="label" cor={cores.ink2}>
            Maquininha / provedor
          </Texto>
          <View style={estilos.chips}>
            {MAQUININHAS.map((m) => (
              <Chip
                key={m.id}
                rotulo={m.rotulo}
                ativo={maquininha === m.id}
                onPress={() => setMaquininha(m.id)}
              />
            ))}
          </View>
        </View>

        <Segmentado
          rotuloGrupo="Tipo de cartão"
          opcoes={maquininha === 'infinitepay' ? OPCOES_COM_TAP : OPCOES_BASE}
          valor={tipo}
          onChange={setTipo}
        />

        {podeCheckoutIp ? (
          <View style={estilos.bloco}>
            {linkCheckout?.checkoutUrl ? (
              <>
                <CartaoQr codigo={linkCheckout.checkoutUrl} valorCentavos={valorCentavos} />
                <Botao
                  rotulo="Abrir Checkout InfinitePay"
                  variante="secundario"
                  tamanho="M"
                  larguraTotal
                  onPress={() => void Linking.openURL(linkCheckout.checkoutUrl!)}
                />
                <Botao
                  rotulo="Copiar link de pagamento"
                  icone="copiar"
                  variante="terciario"
                  tamanho="S"
                  larguraTotal
                  onPress={async () => {
                    await Clipboard.setStringAsync(linkCheckout.checkoutUrl!);
                    toast.mostrar('Link copiado.', { tipo: 'sucesso' });
                  }}
                />
              </>
            ) : (
              <Botao
                rotulo="Gerar link Checkout InfinitePay (automático)"
                variante="secundario"
                tamanho="M"
                larguraTotal
                carregando={gerandoLink}
                onPress={() => void gerarCheckoutInfinitePay()}
              />
            )}
          </View>
        ) : null}

        {maquininha === 'outro' ? (
          <Campo
            rotulo="Nome da maquininha (opcional)"
            placeholder="Ex.: Ton, SumUp, PagBank"
            value={nomeCustom}
            onChangeText={setNomeCustom}
            maxLength={80}
          />
        ) : null}

        <Campo
          rotulo={tipo === 'tap' ? 'NSU / código do comprovante InfiniteTap' : 'NSU / código do comprovante (opcional)'}
          placeholder="Ex.: 987654"
          value={nsu}
          onChangeText={(t) => {
            setNsu(t);
            setErroNsu(null);
          }}
          erro={erroNsu}
          maxLength={64}
        />

        <Banner tipo="info" texto={motivoManual} />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  conteudo: { flex: 1, gap: 16, paddingTop: 8, paddingBottom: 16 },
  bloco: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
