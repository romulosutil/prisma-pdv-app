import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { BottomSheet } from '@/componentes/BottomSheet';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useConta, useDados } from '@/dados/hooks';
import { mensagemDeErro, type Aparelhos } from '@/servicos/backend';
import { cores, raio } from '@/tema';

export default function AparelhosDaConta() {
  const dados = useDados();
  const router = useRouter();
  const toast = useToast();
  const { perfil, identidade } = useConta();
  const [aparelhos, setAparelhos] = useState<Aparelhos>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Aparelhos[number] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ativo = useRef(true);
  const requisicao = useRef(0);
  const operacao = useRef(0);
  const [escopoLista, setEscopoLista] = useState<string | null | undefined>(undefined);
  const escopo = identidade ? JSON.stringify([identidade.contaId, identidade.lojaId]) : null;
  const demo = dados.backend.modo === 'demo';

  const carregar = useCallback(async () => {
    if (!ativo.current || dados.armazenamentoDaLoja.obterEscopo() !== escopo) return;
    const geracao = ++requisicao.current;
    const aindaAtual = () => ativo.current && geracao === requisicao.current && dados.armazenamentoDaLoja.obterEscopo() === escopo;
    setCarregando(true); setErro(null); setAparelhos([]); setConfirmando(null); setEscopoLista(escopo);
    try {
      const lista = await dados.backend.listarAparelhos();
      if (aindaAtual()) setAparelhos(lista);
    } catch (e) { if (aindaAtual()) { setAparelhos([]); setErro(mensagemDeErro(e)); } }
    finally { if (aindaAtual()) setCarregando(false); }
  }, [dados, escopo]);

  useEffect(() => { ativo.current = true; operacao.current++; setOcupado(false); void carregar(); return () => { ativo.current = false; }; }, [carregar]);

  const revogar = async () => {
    if (!confirmando || ocupado) return;
    const geracao = ++operacao.current;
    const aindaAtual = () => ativo.current && geracao === operacao.current && dados.armazenamentoDaLoja.obterEscopo() === escopo;
    setOcupado(true);
    try {
      await dados.revogarAparelho(confirmando.id);
      if (!aindaAtual()) return;
      setConfirmando(null);
      toast.mostrar('Acesso do aparelho revogado no servidor.', { tipo: 'sucesso' });
      await carregar();
    } catch (e) { if (aindaAtual()) toast.mostrar(mensagemDeErro(e), { tipo: 'erro' }); }
    finally { if (aindaAtual()) setOcupado(false); }
  };

  const sair = async () => {
    if (ocupado) return;
    const geracao = ++operacao.current;
    const aindaAtual = () => ativo.current && geracao === operacao.current && dados.armazenamentoDaLoja.obterEscopo() === escopo;
    setOcupado(true);
    try {
      const resultado = await dados.sair();
      if (!aindaAtual()) return;
      toast.mostrar(resultado.revogadaNoServidor ? 'Sessão encerrada no servidor. Seus registros continuam neste aparelho.' : 'Você saiu deste aparelho. A revogação no servidor não foi confirmada.', { tipo: resultado.revogadaNoServidor ? 'sucesso' : 'info' });
    } catch (e) { if (aindaAtual()) toast.mostrar(mensagemDeErro(e), { tipo: 'erro' }); }
    finally { if (aindaAtual()) setOcupado(false); }
  };

  return <TelaBase rolavel style={estilos.tela}>
    <BotaoIcone icone="voltar" rotulo="Voltar para ajustes" onPress={() => router.back()} />
    <Texto estilo="tituloXL" accessibilityRole="header">Conta e aparelhos</Texto>
    <Texto estilo="corpoMedio">{perfil?.nomeLoja}</Texto>
    <Texto estilo="corpo" cor={cores.ink2}>{perfil?.email}</Texto>
    <Banner tipo="info" texto="Revogar bloqueia o acesso ao servidor. Os registros locais do aparelho continuam preservados para recuperação." />
    {demo ? <Banner tipo="atencao" texto="Modo de demonstração. A revogação de aparelhos exige uma conta conectada à API." /> : null}
    {carregando ? <ActivityIndicator accessibilityLabel="Consultando aparelhos" /> : null}
    {erro && escopoLista === escopo ? <><Banner tipo="atencao" texto={erro} /><Botao rotulo="Tentar novamente" variante="secundario" onPress={() => { void carregar(); }} /></> : null}
    {!carregando && !erro && aparelhos.length === 0 ? <Texto>Nenhum aparelho encontrado nesta conta.</Texto> : null}
    {!erro && !carregando && escopoLista === escopo ? aparelhos.map((aparelho) => <View key={aparelho.id} style={estilos.cartao}>
      <Texto estilo="tituloM">{aparelho.nome}{aparelho.atual ? ' · Este aparelho' : ''}</Texto>
      <Texto estilo="corpo" cor={cores.ink2}>{aparelho.revogadoEm ? 'Acesso revogado' : 'Acesso ativo'}</Texto>
      {!aparelho.revogadoEm ? <Botao rotulo={`Revogar ${aparelho.nome}`} variante="perigo" tamanho="M" desabilitado={ocupado || demo} onPress={() => setConfirmando(aparelho)} /> : null}
    </View>) : null}
    <Botao rotulo="Sair desta sessão" variante="secundario" carregando={ocupado} onPress={() => { void sair(); }} />
    <BottomSheet visivel={confirmando !== null && escopoLista === escopo} titulo="Revogar acesso do aparelho?" onFechar={() => { if (!ocupado) setConfirmando(null); }}>
      <View style={estilos.tela}>
        <Texto>As sessões de {confirmando?.nome} serão encerradas no servidor. Isso não apaga vendas ou recebimentos deste aparelho.</Texto>
        <Botao rotulo="Confirmar revogação" variante="perigo" carregando={ocupado} onPress={() => { void revogar(); }} />
        <Botao rotulo="Manter acesso" variante="terciario" desabilitado={ocupado} onPress={() => setConfirmando(null)} />
      </View>
    </BottomSheet>
  </TelaBase>;
}

const estilos = StyleSheet.create({ tela: { gap: 16 }, cartao: { gap: 12, padding: 16, borderRadius: raio.md, backgroundColor: cores.surface } });
