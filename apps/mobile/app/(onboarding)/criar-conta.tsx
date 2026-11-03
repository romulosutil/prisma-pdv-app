import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useRascunho } from '@/nucleo/rascunho';
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
  const { rascunho, alterar } = useRascunho();
  const [nome, setNome] = useState(rascunho.nomeResponsavel);
  const [email, setEmail] = useState(rascunho.email);
  const [documento, setDocumento] = useState(formatarDocumento(rascunho.documento));
  const [erros, setErros] = useState<Erros>({});
  const refEmail = useRef<TextInputInstance>(null);
  const refDocumento = useRef<TextInputInstance>(null);

  const continuar = () => {
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
    if (Object.keys(novosErros).length > 0 || !resultadoDocumento.ok) return;
    alterar({ nomeResponsavel: nome.trim(), email: email.trim().toLowerCase(), documento: resultadoDocumento.digitos });
    router.push('/loja');
  };

  return (
    <TelaBase rolavel rodape={<Botao rotulo="Continuar" onPress={continuar} />}>
      <CabecalhoEtapa etapa={1} total={6} onVoltar={() => router.back()} />
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
          value={email}
          onChangeText={setEmail}
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
          value={documento}
          onChangeText={(t) => setDocumento(formatarDocumento(t))}
          keyboardType="number-pad"
          maxLength={18}
          returnKeyType="done"
          onSubmitEditing={continuar}
          erro={erros.documento}
        />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 16, paddingTop: 24 },
});
