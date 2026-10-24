import {
  CARTOES_TESTE,
  detectarBandeira,
  formatarNumeroCartao,
  tokenizarCartaoMock,
  type DadosCartao,
} from '@pdv/shared';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';
import { mensagemDeErro } from '@/servicos/backend';
import { cores, raio } from '@/tema';
import { formatarValidade, rotuloBandeira, validarCartao, type ErrosCartao } from '@/util/cartao';
import { soDigitos } from '@/util/documento';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { Banner } from './Banner';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Chip } from './Chip';
import { Texto } from './Texto';

export interface FormularioCartaoProps {
  rotuloBotao: string;
  /** Recebe o token do cartão (mock do SDK do gateway). Erros lançados viram a mensagem amigável do formulário. */
  aoEnviar: (tokenCartao: string) => Promise<void>;
  /** Aparece logo acima do botão (resumo de cobrança). */
  resumo?: ReactNode;
  nomeInicial?: string;
  /** Relógio do app, para validar a validade do cartão. */
  agora: () => Date;
}

/** Validade de teste: dois anos à frente, no formato MM/AA. */
function validadeDeTeste(agora: Date): string {
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  return `${mes}/${String((agora.getFullYear() + 2) % 100).padStart(2, '0')}`;
}

export function FormularioCartao({ rotuloBotao, aoEnviar, resumo, nomeInicial = '', agora }: FormularioCartaoProps) {
  const [numero, setNumero] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [nome, setNome] = useState(nomeInicial);
  const [erros, setErros] = useState<ErrosCartao>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refValidade = useRef<TextInputInstance>(null);
  const refCvv = useRef<TextInputInstance>(null);
  const refNome = useRef<TextInputInstance>(null);

  const bandeira = detectarBandeira(numero);
  const amex = bandeira === 'amex';

  const enviar = async () => {
    const dados: DadosCartao = { numero, validade, cvv, nome };
    const encontrados = validarCartao(dados, agora());
    setErros(encontrados);
    setErroGeral(null);
    if (Object.keys(encontrados).length > 0) return;
    const token = tokenizarCartaoMock(dados, agora());
    if (!token.ok) {
      setErroGeral('Não foi possível validar o cartão. Confira os dados.');
      return;
    }
    setEnviando(true);
    try {
      await aoEnviar(token.token);
    } catch (erro) {
      setErroGeral(mensagemDeErro(erro));
    } finally {
      setEnviando(false);
    }
  };

  const usarCartaoDeTeste = (numeroDeTeste: string) => {
    setNumero(formatarNumeroCartao(numeroDeTeste));
    setValidade(validadeDeTeste(agora()));
    setCvv('123');
    setNome((atual) => atual || 'TESTE PDV');
    setErros({});
  };

  return (
    <View style={estilos.formulario}>
      <Campo
        rotulo="Número do cartão"
        value={numero}
        onChangeText={(t) => setNumero(formatarNumeroCartao(t))}
        keyboardType="number-pad"
        autoComplete="cc-number"
        textContentType="creditCardNumber"
        maxLength={23}
        returnKeyType="next"
        onSubmitEditing={() => refValidade.current?.focus()}
        erro={erros.numero}
        adorno={
          soDigitos(numero).length >= 4 && bandeira !== 'desconhecida' ? (
            <Texto estilo="label" cor={cores.ink2}>
              {rotuloBandeira(bandeira)}
            </Texto>
          ) : null
        }
      />
      <View style={estilos.linha}>
        <View style={estilos.metade}>
          <Campo
            ref={refValidade}
            rotulo="Validade (MM/AA)"
            value={validade}
            onChangeText={(t) => setValidade(formatarValidade(t))}
            keyboardType="number-pad"
            autoComplete="cc-exp"
            maxLength={5}
            placeholder="MM/AA"
            returnKeyType="next"
            onSubmitEditing={() => refCvv.current?.focus()}
            erro={erros.validade}
          />
        </View>
        <View style={estilos.metade}>
          <Campo
            ref={refCvv}
            rotulo="Código (CVV)"
            value={cvv}
            onChangeText={(t) => setCvv(soDigitos(t).slice(0, amex ? 4 : 3))}
            keyboardType="number-pad"
            autoComplete="cc-csc"
            secureTextEntry
            maxLength={4}
            returnKeyType="next"
            onSubmitEditing={() => refNome.current?.focus()}
            erro={erros.cvv}
          />
        </View>
      </View>
      <Campo
        ref={refNome}
        rotulo="Nome impresso no cartão"
        value={nome}
        onChangeText={setNome}
        autoCapitalize="characters"
        autoComplete="cc-name"
        returnKeyType="done"
        onSubmitEditing={enviar}
        erro={erros.nome}
      />

      {FERRAMENTAS_TESTE ? (
        <View style={estilos.dica} accessibilityLabel="Dica da versão de testes: cartões de teste">
          <Texto estilo="label">Cartões de teste (versão de testes)</Texto>
          {Object.values(CARTOES_TESTE).map((c) => (
            <View key={c.numero} style={estilos.cartaoDeTeste}>
              <Texto estilo="legenda" cor={cores.ink2} numerico>{`${c.numero} · ${c.descricao}`}</Texto>
              <Chip rotulo="Usar" onPress={() => usarCartaoDeTeste(c.numero)} />
            </View>
          ))}
        </View>
      ) : null}

      {erroGeral ? <Banner tipo="erro" texto={erroGeral} /> : null}
      {resumo}
      <Botao rotulo={rotuloBotao} onPress={enviar} carregando={enviando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: 16 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metade: { flexGrow: 1, flexBasis: 140 },
  dica: { gap: 8, padding: 12, borderRadius: raio.md, backgroundColor: cores.surface },
  cartaoDeTeste: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
});
