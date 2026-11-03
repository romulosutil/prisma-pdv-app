import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Banner } from '@/componentes/Banner';
import { Campo } from '@/componentes/Campo';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useRascunho } from '@/nucleo/rascunho';
import { useDados } from '@/dados/hooks';
import { ErroBackend, mensagemDeErro } from '@/servicos/backend';
import { cores } from '@/tema';
import { formatarDocumento, validarDocumento } from '@/util/documento';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Erros {
  nome?: string;
  email?: string;
  documento?: string;
}

export default function CriarConta() {
  const router = useRouter();
  const dados = useDados();
  const { rascunho, alterar } = useRascunho();
  const [nome, setNome] = useState(rascunho.nomeResponsavel);
  const [email, setEmail] = useState(rascunho.email);
  const [documento, setDocumento] = useState(formatarDocumento(rascunho.documento));
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [desafioId, setDesafioId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const avancou = useRef(false);
  const trava = useRef(false);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; if (!avancou.current) dados.cancelarCadastro(); }; }, []);
  const refEmail = useRef<TextInputInstance>(null);
  const refDocumento = useRef<TextInputInstance>(null);
  const confirmadoAtual = dados.cadastroConfirmado(email.trim().toLowerCase(), documento.replace(/\D/g, ''));

  const continuar = async () => {
    if (trava.current) return;
    const resultadoDocumento = validarDocumento(documento);
    const novosErros: Erros = {};
    if (nome.trim().length < 2) novosErros.nome = 'Digite seu nome.';
    if (!EMAIL.test(email.trim())) novosErros.email = 'Digite um e-mail válido, como nome@loja.com.br.';
    if (!resultadoDocumento.ok) {
      novosErros.documento =
        resultadoDocumento.motivo === 'incompleto'
          ? 'Digite o CPF (11 números) ou o CNPJ (14 números).'
          : 'Esse CPF ou CNPJ não é válido. Confira os números.';
    }
    setErros(novosErros);
    setErroGeral(null);
    if (Object.keys(novosErros).length > 0 || !resultadoDocumento.ok) return;
    const endereco = email.trim().toLowerCase();
    const confirmado = dados.cadastroConfirmado(endereco, resultadoDocumento.digitos);
    if (dados.backend.modo === 'http' && desafioId && !confirmado && !/^\d{6}$/.test(codigo)) { setErroGeral('Digite os 6 números enviados ao seu e-mail.'); return; }
    trava.current = true;
    setVerificando(true);
    try {
      if (dados.backend.modo === 'http' && !confirmado) {
        if (!desafioId) {
          const desafio = await dados.pedirCodigoCadastro(endereco);
          if (montado.current) setDesafioId(desafio.desafioId);
          return;
        }
        await dados.verificarCadastro(endereco, resultadoDocumento.digitos, desafioId, codigo);
      }
      if (!montado.current) return;
      alterar({ nomeResponsavel: nome.trim(), email: endereco, documento: resultadoDocumento.digitos });
      avancou.current = true;
      router.push('/loja');
    } catch (erro) {
      if (!montado.current) return;
      if (erro instanceof ErroBackend && erro.codigo === 'email_ja_cadastrado') setErros({ email: mensagemDeErro(erro) });
      else if (erro instanceof ErroBackend && erro.codigo === 'documento_ja_cadastrado') setErros({ documento: mensagemDeErro(erro) });
      else setErroGeral(mensagemDeErro(erro));
    } finally {
      trava.current = false;
      if (montado.current) setVerificando(false);
    }
  };

  return (
    <TelaBase rolavel rodape={<Botao rotulo={dados.backend.modo === 'http' && !confirmadoAtual ? desafioId ? 'Confirmar e continuar' : 'Continuar e enviar código' : 'Continuar'} onPress={continuar} carregando={verificando} />}>
      <CabecalhoEtapa etapa={1} total={6} onVoltar={() => { if (!trava.current) router.back(); }} />
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          Vamos criar sua conta
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2}>
          Usamos o CPF ou CNPJ para identificar sua loja.
        </Texto>
        <Texto estilo="corpo" cor={cores.ink2}>Você confirmará seu e-mail com um código antes de criar a conta. Para acessar uma conta existente, toque em Entrar e use seu código pessoal.</Texto>
        <Campo
          rotulo="Seu nome"
          editable={!verificando}
          value={nome}
          onChangeText={setNome}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => refEmail.current?.focus()}
          erro={erros.nome}
        />
        <Campo
          ref={refEmail}
          rotulo="E-mail"
          editable={!verificando}
          value={email}
          onChangeText={t => { dados.cancelarCadastro(); setDesafioId(null); setCodigo(''); setEmail(t); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => refDocumento.current?.focus()}
          erro={erros.email}
        />
        <Campo
          ref={refDocumento}
          rotulo="CPF ou CNPJ"
          editable={!verificando}
          value={documento}
          onChangeText={t => { dados.cancelarCadastro(); setDocumento(formatarDocumento(t)); }}
          keyboardType="number-pad"
          maxLength={18}
          returnKeyType="done"
          onSubmitEditing={continuar}
          erro={erros.documento}
        />
        {desafioId ? <>
          <Texto accessibilityLiveRegion="polite">Confira o código enviado ao e-mail informado, inclusive na pasta de spam. Só depois da confirmação seguiremos para a loja.</Texto>
          <Campo rotulo="Código de confirmação do e-mail" value={codigo} onChangeText={t => setCodigo(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" editable={!verificando} onSubmitEditing={continuar} />
          <Botao rotulo="Solicitar outro código" variante="terciario" desabilitado={verificando} onPress={() => { if (!trava.current) { dados.cancelarCadastro(); setDesafioId(null); setCodigo(''); setErroGeral(null); } }} />
        </> : null}
        {erroGeral ? <Banner tipo="erro" texto={erroGeral} /> : null}
        <Botao rotulo="Já tenho conta" variante="terciario" desabilitado={verificando} onPress={() => { if (!trava.current) { dados.cancelarCadastro(); router.replace('/entrar'); } }} />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 24 },
});
