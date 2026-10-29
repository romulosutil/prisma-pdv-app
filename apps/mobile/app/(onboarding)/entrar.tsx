import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import type { RecuperacaoAparelho } from '@pdv/shared';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Campo } from '@/componentes/Campo';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useConta, useDados } from '@/dados/hooks';
import { useCarrinho } from '@/dados/carrinho';
import { ErroBackend, mensagemDeErro } from '@/servicos/backend';
import { cores, raio } from '@/tema';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Visao = Omit<RecuperacaoAparelho, 'token'>;

export default function Entrar() {
  const router = useRouter();
  const navigation = useNavigation();
  const dados = useDados();
  const { perfil, identidade, carregandoConta, reautenticacaoNecessaria } = useConta();
  const carrinho = useCarrinho();
  const [email, setEmail] = useState(perfil?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [oferta, setOferta] = useState(false);
  const [visao, setVisao] = useState<Visao | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [fixado, setFixado] = useState(false);
  const [folha, setFolha] = useState(false);
  const trava = useRef(false);
  const confirmando = useRef(false);
  const geracao = useRef(0);
  const montado = useRef(true);
  const contexto = JSON.stringify({ identidade, perfil });
  const contextoRef = useRef(contexto);
  const contextoAnterior = useRef(contexto);
  contextoRef.current = contexto;

  useEffect(() => () => { montado.current = false; geracao.current++; }, []);
  useEffect(() => {
    if (carregandoConta) return;
    const mudouContexto = contextoAnterior.current !== contexto;
    contextoAnterior.current = contexto;
    const pendente = dados.obterRecuperacaoPendente();
    if (pendente) {
      if (confirmando.current) { ++geracao.current; trava.current = false; confirmando.current = false; setOcupado(false); }
      setVisao(pendente.recuperacao);
      setSelecionado(pendente.aparelhoSubstituidoId);
      setFixado(pendente.aparelhoSubstituidoId !== null);
      setEmail(pendente.recuperacao.perfil.email);
      setCodigoEnviado(false);
      setCodigo('');
      if (pendente.aparelhoSubstituidoId) setErro('Não foi possível concluir o acesso. Tente novamente com o mesmo aparelho ou peça um novo código.');
    } else if (!trava.current || mudouContexto) {
      if (mudouContexto) { ++geracao.current; trava.current = false; confirmando.current = false; setOcupado(false); setOferta(false); setErro(null); }
      setVisao(null); setSelecionado(null); setFixado(false); setFolha(false);
    }
  }, [dados, carregandoConta, contexto]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !ocupado && !carregandoConta });
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirmando.current || carregandoConta) return true;
      if (folha) { setFolha(false); return true; }
      if (visao || oferta) { cancelar(); return true; }
      return false;
    });
    return () => { assinatura.remove(); navigation.setOptions({ gestureEnabled: true }); };
  }, [navigation, ocupado, carregandoConta, folha, visao, oferta]);

  const cancelar = () => {
    if (confirmando.current || carregandoConta) return;
    ++geracao.current; trava.current = false;
    dados.cancelarRecuperacao();
    setOcupado(false); setVisao(null); setSelecionado(null); setFixado(false); setFolha(false);
    setOferta(false); setCodigo(''); setCodigoEnviado(false); setErro(null);
  };
  const executar = async (acao: () => Promise<void>, aoErro?: (e: unknown) => void) => {
    if (trava.current || carregandoConta) return;
    trava.current = true;
    const atual = ++geracao.current;
    const origem = contextoRef.current;
    const valido = () => montado.current && geracao.current === atual && contextoRef.current === origem;
    setErro(null); setOcupado(true);
    try { await acao(); }
    catch (e) { if (valido()) { setErro(mensagemDeErro(e)); aoErro?.(e); } }
    finally { if (valido()) { trava.current = false; confirmando.current = false; setOcupado(false); } }
  };
  const enviarCodigo = () => {
    if (trava.current || carregandoConta) return;
    if (!EMAIL.test(email.trim())) { setErro('Digite um e-mail válido, como nome@loja.com.br.'); return; }
    dados.cancelarRecuperacao(); setOferta(false);
    const atual = geracao.current + 1; const origem = contextoRef.current;
    void executar(async () => { await dados.backend.pedirCodigo(email.trim().toLowerCase()); if (montado.current && geracao.current === atual && contextoRef.current === origem) setCodigoEnviado(true); });
  };
  const entrar = () => {
    if (trava.current || carregandoConta) return;
    if (!/^\d{6}$/.test(codigo)) { setErro('O código tem 6 números.'); return; }
    setOferta(false);
    void executar(() => dados.entrar(email.trim().toLowerCase(), codigo), e => {
      if (dados.backend.modo !== 'demo' && e instanceof ErroBackend && e.codigo === 'limite_aparelhos' && e.status === 409) setOferta(true);
    });
  };
  const iniciar = () => {
    if (trava.current || carregandoConta) return;
    if (!/^\d{6}$/.test(codigo)) { setErro('O código tem 6 números.'); return; }
    const atual = geracao.current + 1; const origem = contextoRef.current;
    void executar(async () => {
      const resultado = await dados.iniciarRecuperacao(email.trim().toLowerCase(), codigo);
      if (montado.current && geracao.current === atual && contextoRef.current === origem) {
        setVisao(resultado); setOferta(false); setCodigo(''); setCodigoEnviado(false);
      }
    }, e => { if (e instanceof ErroBackend && e.status === 401) { setCodigo(''); setCodigoEnviado(false); setOferta(false); setErro('O código não é válido. Peça um novo código.'); } });
  };
  const confirmar = () => {
    const pendente = dados.obterRecuperacaoPendente();
    if (!selecionado || trava.current || carregandoConta || !visao || pendente?.recuperacao.id !== visao.id || (pendente.aparelhoSubstituidoId && pendente.aparelhoSubstituidoId !== selecionado) || !visao.aparelhos.some(a => a.id === selecionado)) return;
    confirmando.current = true;
    const atual = geracao.current + 1; const origem = contextoRef.current;
    void executar(async () => {
      await dados.confirmarRecuperacao(selecionado);
      if (montado.current && geracao.current === atual && contextoRef.current === origem) { setFolha(false); setVisao(null); }
    }, e => {
      if (e instanceof ErroBackend && e.status === 401) {
        setVisao(null); setSelecionado(null); setFixado(false); setFolha(false); setErro('A recuperação expirou. Peça um novo código.');
      } else {
        const pendente = dados.obterRecuperacaoPendente();
        if (pendente) { setFixado(pendente.aparelhoSubstituidoId !== null); setFolha(false); }
      }
    });
  };
  const pendenteAtual = dados.obterRecuperacaoPendente();
  const visaoAtual = visao && pendenteAtual?.recuperacao.id === visao.id ? visao : null;
  const alvo = visaoAtual?.aparelhos.find(a => a.id === selecionado);

  return (
    <TelaBase rolavel rodape={visaoAtual ? <Botao rotulo={fixado ? 'Tentar novamente' : 'Continuar'} onPress={() => { if (!carregandoConta) setFolha(true); }} desabilitado={!selecionado || ocupado || carregandoConta} /> : <Botao rotulo={codigoEnviado ? 'Entrar' : 'Enviar código'} onPress={codigoEnviado ? entrar : enviarCodigo} carregando={ocupado || carregandoConta} />}>
      <View style={estilos.topo}><BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => { if (confirmando.current || carregandoConta) return; if (visao || oferta) cancelar(); else router.back(); }} /></View>
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">{visaoAtual ? 'Substituir aparelho' : reautenticacaoNecessaria ? 'Entre novamente' : 'Entrar na sua conta'}</Texto>
        {reautenticacaoNecessaria ? <Banner tipo="atencao" texto="Seu acesso precisa ser confirmado. Os registros e recebimentos deste aparelho continuam guardados." /> : null}
        {!carrinho.vazio ? <Botao rotulo="Continuar venda em andamento" variante="secundario" desabilitado={ocupado || carregandoConta} onPress={() => { if (!carregandoConta && !trava.current) router.replace('/pagar'); }} /> : null}
        {visaoAtual ? <>
          <Texto estilo="corpo">{visaoAtual.perfil.nomeLoja} · {visaoAtual.perfil.email}</Texto>
          <Texto estilo="corpo">Escolha o aparelho que perderá o acesso.</Texto>
          {visaoAtual.aparelhos.map(a => <Pressable key={a.id} accessibilityRole="radio" accessibilityLabel={a.nome} accessibilityState={{ checked: selecionado === a.id, disabled: fixado || ocupado || carregandoConta }} disabled={fixado || ocupado || carregandoConta} onPress={() => { if (!carregandoConta && !trava.current && !fixado) setSelecionado(a.id); }} style={({ pressed }) => [estilos.opcao, { backgroundColor: pressed ? cores.surface2 : cores.surface }]}><Texto estilo="corpo">{selecionado === a.id ? '● ' : '○ '}{a.nome}</Texto></Pressable>)}
          <Botao rotulo="Pedir novo código" variante="ghost" desabilitado={ocupado || carregandoConta} onPress={cancelar} />
        </> : <>
          <Texto estilo="corpo" cor={cores.ink2}>{dados.backend.modo === 'demo' ? 'Modo de testes: use qualquer código de 6 números.' : codigoEnviado ? `Solicitação recebida. Se ${email.trim()} estiver cadastrado, um código de 6 números poderá chegar por e-mail.` : 'Solicite um código de 6 números para o e-mail cadastrado.'}</Texto>
          <Campo rotulo="E-mail" value={email} onChangeText={t => { if (carregandoConta || trava.current) return; cancelar(); setEmail(t); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!codigoEnviado && !ocupado && !carregandoConta} returnKeyType="done" onSubmitEditing={enviarCodigo} />
          {codigoEnviado ? <><Campo rotulo="Código" value={codigo} onChangeText={t => { if (carregandoConta || trava.current) return; setOferta(false); setCodigo(t.replace(/\D/g, '').slice(0, 6)); }} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" editable={!ocupado && !carregandoConta} ajuda={dados.backend.modo === 'demo' ? 'Modo de testes: qualquer código de 6 números funciona.' : undefined} returnKeyType="done" onSubmitEditing={entrar} /><Botao rotulo="Alterar e-mail ou pedir novo código" variante="ghost" desabilitado={ocupado || carregandoConta} onPress={cancelar} /></> : null}
          {oferta ? <Botao rotulo="Recuperar acesso neste aparelho" variante="secundario" onPress={iniciar} carregando={ocupado || carregandoConta} /> : null}
        </>}
        {erro ? <Banner tipo="erro" texto={erro} /> : null}
      </View>
      <BottomSheet visivel={!!visaoAtual && folha && !!alvo} titulo="Confirmar substituição" onFechar={() => { if (!confirmando.current && !carregandoConta) setFolha(false); }}>
        <Texto estilo="corpo">O acesso de {alvo?.nome} será revogado. Esta ação não transfere vendas para este aparelho.</Texto>
        <Botao rotulo="Confirmar substituição" variante="perigo" onPress={confirmar} carregando={ocupado || carregandoConta} />
        <Botao rotulo="Voltar" variante="ghost" desabilitado={ocupado || carregandoConta} onPress={() => { if (!confirmando.current && !carregandoConta) setFolha(false); }} />
      </BottomSheet>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({ topo: { minHeight: 56, justifyContent: 'center' }, corpo: { gap: 16, paddingTop: 24 }, opcao: { minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: raio.md } });
