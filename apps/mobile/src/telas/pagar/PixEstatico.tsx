import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useConta } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { gerarBrCodeEstatico } from '@/util/brcode';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { CartaoQr } from './CartaoQr';
import { useChavePix } from './chavePix';
import { useCobranca } from './useCobranca';

const TIPOS_DE_CHAVE: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'e-mail',
  telefone: 'celular',
  aleatoria: 'chave aleatória',
};

/** Pix pela chave do lojista (plano Essencial ou sem provedor): o QR é gerado aqui e quem confirma é o operador. */
export function PixEstatico() {
  const router = useRouter();
  const toast = useToast();
  const { nomeLoja } = useConta();
  const { valorCentavos, receber, ocupado } = useCobranca();
  const { carregada, chave, salvar } = useChavePix();
  const [trocando, setTrocando] = useState(false);

  const codigo = useMemo(
    () => (chave ? gerarBrCodeEstatico({ chave: chave.chave, valorCentavos, nomeRecebedor: nomeLoja, cidade: 'BRASIL' }) : null),
    [chave, valorCentavos, nomeLoja],
  );

  const copiar = async () => {
    if (!codigo) return;
    await Clipboard.setStringAsync(codigo);
    toast.mostrar('Código Pix copiado', { tipo: 'sucesso' });
  };

  const cabecalho = (
    <CabecalhoPagamento
      titulo="Pix · Sua chave"
      rotuloVoltar="Cancelar cobrança e voltar"
      adorno={
        <View style={estilos.icone}>
          <Icone nome="pix" tamanho={20} />
        </View>
      }
    />
  );

  if (!carregada) return <TelaBase>{cabecalho}</TelaBase>;

  if (!chave || !codigo || trocando) {
    return (
      <TelaBase rolavel>
        {cabecalho}
        <FormularioDaChave
          chaveAtual={chave?.chave}
          onSalvar={async (texto) => {
            const ok = await salvar(texto);
            if (ok) setTrocando(false);
            return ok;
          }}
          onCancelar={chave ? () => setTrocando(false) : undefined}
        />
      </TelaBase>
    );
  }

  return (
    <TelaBase rolavel>
      {cabecalho}
      <View style={estilos.conteudo}>
        <Banner tipo="atencao" texto="O app não vê este Pix. Só toque em “Recebi o Pix” depois de ver o valor na sua conta." />
        <CartaoQr codigo={codigo} valorCentavos={valorCentavos} />
        <View style={estilos.valor}>
          <Dinheiro centavos={valorCentavos} estilo="display" />
          <Texto estilo="label" cor={cores.ink2} accessibilityLabel={`Chave ${TIPOS_DE_CHAVE[chave.tipo]} cadastrada`}>
            {`Chave ${TIPOS_DE_CHAVE[chave.tipo]}: ${chave.chave}`}
          </Texto>
        </View>
        <Botao rotulo="Copiar código Pix" icone="copiar" variante="secundario" tamanho="M" larguraTotal onPress={() => void copiar()} />
        <Botao rotulo="Recebi o Pix" carregando={ocupado} onPress={() => void receber({ meio: 'pix', provedor: null })} />
        <Botao rotulo="Trocar chave Pix" variante="ghost" tamanho="M" larguraTotal onPress={() => setTrocando(true)} />
        <Botao rotulo="Cancelar cobrança" variante="ghost" tamanho="M" larguraTotal onPress={() => router.back()} />
      </View>
    </TelaBase>
  );
}

interface FormularioDaChaveProps {
  chaveAtual?: string;
  onSalvar: (texto: string) => Promise<boolean>;
  onCancelar?: () => void;
}

function FormularioDaChave({ chaveAtual, onSalvar, onCancelar }: FormularioDaChaveProps) {
  const [texto, setTexto] = useState(chaveAtual ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const enviar = async () => {
    setSalvando(true);
    const ok = await onSalvar(texto);
    setSalvando(false);
    if (!ok) setErro('Não reconhecemos essa chave. Use CPF, CNPJ, e-mail, celular com DDD ou chave aleatória.');
  };

  return (
    <View style={estilos.conteudo}>
      <Texto estilo="tituloL" accessibilityRole="header">
        Qual é a sua chave Pix?
      </Texto>
      <Texto estilo="corpo" cor={cores.ink2}>
        Geramos o QR Code do valor com a chave que recebe os pagamentos da loja. Ela fica guardada só neste aparelho.
      </Texto>
      <Campo
        rotulo="Chave Pix"
        value={texto}
        onChangeText={(t) => {
          setTexto(t);
          setErro(null);
        }}
        erro={erro}
        ajuda="CPF, CNPJ, e-mail, celular ou chave aleatória"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => void enviar()}
      />
      <Botao rotulo="Salvar e gerar QR" carregando={salvando} desabilitado={texto.trim().length === 0} onPress={() => void enviar()} />
      {onCancelar ? <Botao rotulo="Manter a chave atual" variante="ghost" onPress={onCancelar} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16, paddingTop: 4, paddingBottom: 16 },
  icone: { width: 32, height: 32, borderRadius: raio.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.surface },
  valor: { alignItems: 'center', gap: 6 },
});
