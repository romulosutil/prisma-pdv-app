import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { CabecalhoEtapa } from '@/componentes/CabecalhoEtapa';
import { Campo } from '@/componentes/Campo';
import { Chip } from '@/componentes/Chip';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useDados } from '@/dados/hooks';
import { TIPOS_DE_LOJA, useRascunho } from '@/nucleo/rascunho';
import { mensagemDeErro } from '@/servicos/backend';
import { cores } from '@/tema';

export default function Loja() {
  const router = useRouter();
  const dados = useDados();
  const { rascunho, alterar } = useRascunho();
  const [nomeLoja, setNomeLoja] = useState(rascunho.nomeLoja);
  const [tipoLoja, setTipoLoja] = useState(rascunho.tipoLoja);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const trava = useRef(false);
  const conectado = dados.backend.modo === 'http';

  const continuar = async () => {
    if (trava.current) return;
    if (conectado && !dados.cadastroConfirmado(rascunho.email, rascunho.documento)) { router.replace('/criar-conta'); return; }
    if (nomeLoja.trim().length === 0) {
      setErroNome('Digite o nome da loja.');
      return;
    }
    setErroNome(null);
    setErroGeral(null);
    trava.current = true;
    setCriando(true);
    alterar({ nomeLoja: nomeLoja.trim(), tipoLoja });
    try {
      await dados.criarConta({
        nomeResponsavel: rascunho.nomeResponsavel,
        email: rascunho.email,
        documento: rascunho.documento,
        nomeLoja: nomeLoja.trim(),
        tipoLoja,
      });
      router.replace(dados.assinatura.obter().assinatura?.status === 'liberada' ? '/pagamentos' : '/planos');
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    } finally {
      trava.current = false;
      setCriando(false);
    }
  };

  return (
    <TelaBase rolavel rodape={<Botao rotulo={conectado ? 'Criar minha conta' : 'Continuar'} onPress={continuar} carregando={criando} />}>
      <CabecalhoEtapa etapa={2} total={6} onVoltar={() => router.back()} />
      <View style={estilos.corpo}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          Como se chama sua loja?
        </Texto>
        <Campo
          rotulo="Nome da loja"
          value={nomeLoja}
          onChangeText={setNomeLoja}
          autoComplete="organization"
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={continuar}
          erro={erroNome}
        />
        <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel="Tipo de comércio">
          <Texto estilo="label" cor={cores.ink2}>
            Tipo de comércio
          </Texto>
          <View style={estilos.chips}>
            {TIPOS_DE_LOJA.map((tipo) => (
              <Chip key={tipo} rotulo={tipo} ativo={tipo === tipoLoja} onPress={() => setTipoLoja(tipo)} />
            ))}
          </View>
        </View>
        {conectado ? <Texto>Seu e-mail foi confirmado na etapa anterior. Confira os dados da loja antes de criar a conta.</Texto> : null}
        {erroGeral ? <Banner tipo="erro" texto={erroGeral} /> : null}
        <Botao rotulo="Já tenho conta" variante="terciario" desabilitado={criando} onPress={() => { if (!trava.current) { dados.cancelarCadastro(); router.replace('/entrar'); } }} />
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 24, paddingTop: 24 },
  grupo: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
