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
  const [desafioId, setDesafioId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const trava = useRef(false);
  const conectado = dados.backend.modo === 'http';

  const continuar = async () => {
    if (trava.current) return;
    if (nomeLoja.trim().length === 0) {
      setErroNome('Digite o nome da loja.');
      return;
    }
    setErroNome(null);
    setErroGeral(null);
    if (conectado && desafioId && !/^\d{6}$/.test(codigo)) { setErroGeral('Digite os 6 números enviados ao seu e-mail.'); return; }
    trava.current = true;
    setCriando(true);
    alterar({ nomeLoja: nomeLoja.trim(), tipoLoja });
    try {
      if (conectado && !desafioId) {
        const desafio = await dados.pedirCodigoCadastro(rascunho.email);
        setDesafioId(desafio.desafioId);
        return;
      }
      await dados.criarConta({
        ...(desafioId ? { desafioCadastroId: desafioId, codigoCadastro: codigo } : {}),
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
    <TelaBase rolavel rodape={<Botao rotulo={conectado ? desafioId ? 'Confirmar e criar conta' : 'Enviar código ao e-mail' : 'Continuar'} onPress={continuar} carregando={criando} />}>
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
        {conectado ? <Texto>Para criar a conta, confirme a posse do e-mail informado. Nenhuma empresa ou sessão será criada antes da confirmação.</Texto> : null}
        {desafioId ? <>
          <Texto accessibilityLiveRegion="polite">Código enviado ao e-mail informado. Confira também a pasta de spam. Válido por 10 minutos.</Texto>
          <Campo rotulo="Código de confirmação do e-mail" value={codigo} onChangeText={t => setCodigo(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" editable={!criando} onSubmitEditing={continuar} />
          <Botao rotulo="Solicitar outro código" variante="terciario" desabilitado={criando} onPress={() => { setDesafioId(null); setCodigo(''); setErroGeral(null); }} />
        </> : null}
        {erroGeral ? <Banner tipo="erro" texto={erroGeral} /> : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  corpo: { gap: 24, paddingTop: 24 },
  grupo: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
