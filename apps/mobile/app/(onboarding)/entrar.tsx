import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { Campo } from '@/componentes/Campo';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useConta, useDados } from '@/dados/hooks';
import { useCarrinho } from '@/dados/carrinho';
import { mensagemDeErro } from '@/servicos/backend';
import { cores } from '@/tema';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Já tenho conta": e-mail → código de 6 dígitos enviado por e-mail. */
export default function Entrar() {
  const router = useRouter();
  const dados = useDados();
  const { perfil, reautenticacaoNecessaria } = useConta();
  const carrinho = useCarrinho();
  const [email, setEmail] = useState(perfil?.email ?? '');
  const [codigo, setCodigo] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const executar = async (acao: () => Promise<void>) => {
    setErro(null);
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  };

  const enviarCodigo = () => {
    if (!EMAIL.test(email.trim())) {
      setErro('Digite um e-mail válido, como nome@loja.com.br.');
      return;
    }
    executar(async () => {
      await dados.backend.pedirCodigo(email.trim().toLowerCase());
      setCodigoEnviado(true);
    });
  };

  const entrar = () => {
    if (!/^\d{6}$/.test(codigo)) {
      setErro('O código tem 6 números.');
      return;
    }
    executar(() => dados.entrar(email.trim().toLowerCase(), codigo));
  };

  return (
    <TelaBase
      rolavel
      rodape={
        <Botao
          rotulo={codigoEnviado ? 'Entrar' : 'Enviar código'}
          onPress={codigoEnviado ? entrar : enviarCodigo}
          carregando={ocupado}
        />
      }
    >
      <View style={estilos.topo}>
        <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => router.back()} />
      </View>
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          {reautenticacaoNecessaria ? 'Entre novamente' : 'Entrar na sua conta'}
        </Texto>
        {reautenticacaoNecessaria ? <Banner tipo="atencao" texto="Seu acesso precisa ser confirmado. Os registros e recebimentos deste aparelho continuam guardados." /> : null}
        {!carrinho.vazio ? <Botao rotulo="Continuar venda em andamento" variante="secundario" onPress={() => router.replace('/pagar')} /> : null}
        <Texto estilo="corpo" cor={cores.ink2}>
          {codigoEnviado ? `Enviamos um código de 6 números para ${email.trim()}.` : 'Enviaremos um código de 6 números para o seu e-mail.'}
        </Texto>
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          editable={!codigoEnviado}
          returnKeyType="done"
          onSubmitEditing={enviarCodigo}
        />
        {codigoEnviado ? (
          <Campo
            rotulo="Código"
            value={codigo}
            onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            ajuda={dados.backend.modo === 'demo' ? 'Modo de testes: qualquer código de 6 números funciona.' : undefined}
            returnKeyType="done"
            onSubmitEditing={entrar}
          />
        ) : null}
        {erro ? <Banner tipo="erro" texto={erro} /> : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  topo: { minHeight: 56, justifyContent: 'center' },
  corpo: { gap: 16, paddingTop: 24 },
});
