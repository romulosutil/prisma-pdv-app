import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import type { ConexaoInfinitePay, ConexaoMercadoPago } from '@pdv/shared';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { Campo } from '@/componentes/Campo';
import { Cartao } from '@/componentes/Cartao';
import { Secao } from '@/componentes/Secao';
import { Segmentado } from '@/componentes/Segmentado';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useConta, useDados, usePreferencias } from '@/dados/hooks';
import { mensagemDeErro } from '@/servicos/backend';
import { cores, textoMonograma } from '@/tema';

export default function Maquininhas() {
  const router = useRouter();
  const toast = useToast();
  const dados = useDados();
  const { identidade } = useConta();
  const { preferencias, alterar, definirConexao } = usePreferencias();
  const dono = !identidade?.papel || identidade.papel === 'dono';
  const conectadoHttp = dados.backend.modo === 'http';

  const [carregando, setCarregando] = useState(conectadoHttp);
  const [ocupadoMp, setOcupadoMp] = useState(false);
  const [ocupadoIp, setOcupadoIp] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mp, setMp] = useState<ConexaoMercadoPago | null>(null);
  const [mpTokenAberto, setMpTokenAberto] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpSegredo, setMpSegredo] = useState('');

  const [ip, setIp] = useState<ConexaoInfinitePay | null>(null);
  const [ipHandle, setIpHandle] = useState('');
  const [ipApiKey, setIpApiKey] = useState('');

  const carregar = useCallback(async () => {
    if (!conectadoHttp || !dono) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [resMp, resIp] = await Promise.all([
        dados.backend.obterConexaoMercadoPago?.() ?? Promise.resolve(null),
        dados.backend.obterConexaoInfinitePay?.() ?? Promise.resolve(null),
      ]);
      if (resMp) {
        setMp(resMp);
        await definirConexao('mercadopago', resMp.conectada);
      }
      if (resIp) {
        setIp(resIp);
        if (resIp.handle) setIpHandle(resIp.handle);
        await definirConexao('infinitepay', resIp.conectada);
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [conectadoHttp, dono, dados.backend, definirConexao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const conectarMpOAuth = async () => {
    if (!dados.backend.iniciarOAuthMercadoPago) return;
    setOcupadoMp(true);
    setErro(null);
    try {
      const { url } = await dados.backend.iniciarOAuthMercadoPago();
      await Linking.openURL(url);
      toast.mostrar('Conclua a autorização no navegador e toque em Atualizar conexão.', { tipo: 'info' });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupadoMp(false);
    }
  };

  const salvarMpToken = async () => {
    if (!dados.backend.conectarMercadoPago) return;
    if (!mpAccessToken.trim()) {
      setErro('Informe o Access Token do Mercado Pago.');
      return;
    }
    setOcupadoMp(true);
    setErro(null);
    try {
      const res = await dados.backend.conectarMercadoPago({
        accessToken: mpAccessToken.trim(),
        ...(mpSegredo.trim() ? { segredoWebhook: mpSegredo.trim() } : {}),
      });
      setMp(res);
      setMpAccessToken('');
      setMpSegredo('');
      setMpTokenAberto(false);
      await definirConexao('mercadopago', true);
      toast.mostrar('Mercado Pago conectado.', { tipo: 'sucesso' });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupadoMp(false);
    }
  };

  const desconectarMp = async () => {
    setOcupadoMp(true);
    setErro(null);
    try {
      await dados.backend.desconectarMercadoPago?.();
      setMp(null);
      await definirConexao('mercadopago', false);
      toast.mostrar('Mercado Pago desconectado.', { tipo: 'sucesso' });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupadoMp(false);
    }
  };

  const salvarInfinitePay = async () => {
    if (!dados.backend.conectarInfinitePay) return;
    const handle = ipHandle.trim().replace(/^@/, '');
    if (handle.length < 3) {
      setErro('Digite a InfiniteTag (handle) da sua loja na InfinitePay.');
      return;
    }
    setOcupadoIp(true);
    setErro(null);
    try {
      const res = await dados.backend.conectarInfinitePay({
        handle,
        ...(ipApiKey.trim() ? { apiKey: ipApiKey.trim() } : {}),
      });
      setIp(res);
      setIpApiKey('');
      await definirConexao('infinitepay', true);
      toast.mostrar('InfinitePay conectada.', { tipo: 'sucesso' });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupadoIp(false);
    }
  };

  const desconectarIp = async () => {
    setOcupadoIp(true);
    setErro(null);
    try {
      await dados.backend.desconectarInfinitePay?.();
      setIp(null);
      await definirConexao('infinitepay', false);
      toast.mostrar('InfinitePay desconectada.', { tipo: 'sucesso' });
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupadoIp(false);
    }
  };

  const copiarWebhook = async (caminho: string) => {
    await Clipboard.setStringAsync(caminho);
    toast.mostrar('Caminho de webhook copiado.', { tipo: 'sucesso' });
  };

  return (
    <TelaBase rolavel espacamento="secoes" style={estilos.tela}>
      <CabecalhoTela titulo="Maquininhas e pagamentos" onVoltar={() => router.back()} />

      <Banner
        tipo="info"
        texto="Você recebe diretamente na sua conta da maquininha. O Prisma PDV não retém nem intermedeia nenhum valor."
      />

      {!dono ? (
        <Banner tipo="atencao" texto="Somente o dono da loja pode conectar ou alterar provedores de pagamento." />
      ) : null}

      {erro ? <Banner tipo="erro" texto={erro} /> : null}

      <Secao titulo="Provedores integrados">
        <Cartao>
          <View style={estilos.cabecalhoCard}>
            <View style={[estilos.monograma, { backgroundColor: cores.anilSoft }]}>
              <Texto cor={cores.anil} style={textoMonograma}>
                MP
              </Texto>
            </View>
            <View style={estilos.tituloCard}>
              <Texto estilo="tituloM">Mercado Pago</Texto>
              <Texto estilo="legenda" cor={cores.ink3}>
                Pix automático na tela (QR + confirmação) e registro manual para Point
              </Texto>
            </View>
            <StatusPill
              tipo={mp?.conectada ? (mp.reautorizacaoNecessaria ? 'atencao' : 'aberto') : 'inativo'}
              texto={mp?.conectada ? (mp.reautorizacaoNecessaria ? 'Reautorizar' : 'Conectado') : 'Desconectado'}
            />
          </View>

          {dono && conectadoHttp ? (
            <View style={estilos.acoes}>
              {mp?.conectada && mp.webhookPath ? (
                <Botao
                  rotulo="Copiar caminho de aviso (webhook)"
                  icone="copiar"
                  variante="terciario"
                  tamanho="S"
                  onPress={() => void copiarWebhook(mp.webhookPath!)}
                />
              ) : null}
              <Botao
                rotulo={mp?.conectada ? 'Reconectar com Mercado Pago' : 'Conectar com Mercado Pago'}
                carregando={ocupadoMp}
                desabilitado={carregando}
                onPress={() => void conectarMpOAuth()}
              />
              <Botao
                rotulo="Atualizar conexão"
                variante="secundario"
                tamanho="M"
                desabilitado={ocupadoMp || carregando}
                onPress={() => void carregar()}
              />
              <Botao
                rotulo={mpTokenAberto ? 'Ocultar modo token' : 'Usar Access Token (avançado)'}
                variante="ghost"
                tamanho="S"
                onPress={() => setMpTokenAberto((a) => !a)}
              />
              {mpTokenAberto ? (
                <View style={estilos.formulario}>
                  <Campo
                    rotulo="Access Token do Mercado Pago"
                    value={mpAccessToken}
                    onChangeText={setMpAccessToken}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <Campo
                    rotulo="Segredo do webhook (opcional)"
                    value={mpSegredo}
                    onChangeText={setMpSegredo}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <Botao rotulo="Salvar token" tamanho="M" carregando={ocupadoMp} onPress={() => void salvarMpToken()} />
                </View>
              ) : null}
              {mp?.conectada ? (
                <Botao rotulo="Desconectar Mercado Pago" variante="perigo" tamanho="S" desabilitado={ocupadoMp} onPress={() => void desconectarMp()} />
              ) : null}
            </View>
          ) : null}
        </Cartao>

        <Cartao>
          <View style={estilos.cabecalhoCard}>
            <View style={[estilos.monograma, { backgroundColor: cores.ink }]}>
              <Texto cor={cores.bg} style={textoMonograma}>
                IP
              </Texto>
            </View>
            <View style={estilos.tituloCard}>
              <Texto estilo="tituloM">InfinitePay</Texto>
              <Texto estilo="legenda" cor={cores.ink3}>
                Pix e cartão com Checkout Integrado + verificação no servidor e InfiniteTap identificado
              </Texto>
            </View>
            <StatusPill tipo={ip?.conectada ? 'aberto' : 'inativo'} texto={ip?.conectada ? 'Conectada' : 'Desconectada'} />
          </View>

          {dono && conectadoHttp ? (
            <View style={estilos.acoes}>
              <Campo
                rotulo="InfiniteTag (handle sem @)"
                placeholder="Ex.: loja-da-maria"
                value={ipHandle}
                onChangeText={setIpHandle}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Campo
                rotulo="Chave API / Token (opcional)"
                value={ipApiKey}
                onChangeText={setIpApiKey}
                secureTextEntry
                autoCapitalize="none"
              />
              <Botao
                rotulo={ip?.conectada ? 'Atualizar InfinitePay' : 'Conectar InfinitePay'}
                carregando={ocupadoIp}
                desabilitado={carregando}
                onPress={() => void salvarInfinitePay()}
              />
              {ip?.conectada ? (
                <Botao rotulo="Desconectar InfinitePay" variante="perigo" tamanho="S" desabilitado={ocupadoIp} onPress={() => void desconectarIp()} />
              ) : null}
            </View>
          ) : null}
        </Cartao>
      </Secao>

      <Secao titulo="Pix automático padrão">
        <Segmentado
          rotuloGrupo="Provedor padrão do Pix automático"
          valor={preferencias.pixPadrao}
          onChange={(pixPadrao) => void alterar({ pixPadrao })}
          opcoes={[
            { valor: 'infinitepay', rotulo: 'InfinitePay' },
            { valor: 'mercadopago', rotulo: 'Mercado Pago' },
          ]}
        />
      </Secao>

      <Secao titulo="Outras maquininhas (Stone, Point, Ton, PagBank)">
        <Cartao>
          <Texto estilo="corpoMedio">Confirmação manual identificada</Texto>
          <Texto estilo="corpo" cor={cores.ink2}>
            Para Stone e demais maquininhas sem API aberta ao PDV, cobre normalmente na maquininha e registre a venda em
            “Cartão” escolhendo o nome da maquininha e o comprovante/NSU opcional.
          </Texto>
        </Cartao>
      </Secao>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { paddingTop: 16, paddingBottom: 32 },
  cabecalhoCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monograma: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tituloCard: { flex: 1, minWidth: 0, gap: 2 },
  acoes: { gap: 10, paddingTop: 4 },
  formulario: { gap: 10, paddingTop: 4 },
});
