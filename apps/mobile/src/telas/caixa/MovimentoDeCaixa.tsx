import { formatarBRL, PLANOS, planoMinimoPara, type Centavos } from '@pdv/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Campo } from '@/componentes/Campo';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { ehErroDeDominio } from '@/dados/erros';
import { useCaixa, useDados, useLicenca, useResumoDoDia } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { useVoltar } from '@/util/useVoltar';
import { LinhaValor } from './LinhaValor';
import { TelaDeValor } from './TelaDeValor';
import { mensagemDeErro } from '@/servicos/backend';

const TEXTOS = {
  sangria: {
    titulo: 'Sangria',
    descricao: 'Retire dinheiro da gaveta para guardar no cofre ou depositar no banco.',
    campo: 'Valor retirado',
    acao: 'Registrar sangria',
    feito: 'Sangria registrada',
  },
  suprimento: {
    titulo: 'Suprimento',
    descricao: 'Coloque dinheiro na gaveta, por exemplo para reforçar o troco.',
    campo: 'Valor colocado',
    acao: 'Registrar suprimento',
    feito: 'Suprimento registrado',
  },
  retirada: { titulo: 'Retirada', descricao: 'Registre despesa ou outra saída. Saídas para cofre ou depósito são sangrias.', campo: 'Valor retirado', acao: 'Registrar retirada', feito: 'Retirada registrada' },
} as const;

export function MovimentoDeCaixa() {
  const router = useRouter();
  const toast = useToast();
  const voltar = useVoltar('/caixa');
  const dados = useDados();
  const { tipo: tipoDaRota } = useLocalSearchParams<{ tipo?: string }>();
  const tipo = tipoDaRota === 'suprimento' ? 'suprimento' : tipoDaRota === 'retirada' ? 'retirada' : 'sangria';
  const textos = TEXTOS[tipo];
  const { caixa, registrarMovimento } = useCaixa();
  const resumo = useResumoDoDia();
  const { podeUsar } = useLicenca();
  const [valor, setValor] = useState<Centavos>(0);
  const [motivo, setMotivo] = useState('');
  const [categoria, setCategoria] = useState(tipo === 'sangria' ? 'cofre_deposito' : tipo === 'suprimento' ? 'reforco_troco' : 'despesa');
  const [destino, setDestino] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const liberado = podeUsar('sangria_suprimento');
  const planoNome = PLANOS[planoMinimoPara('sangria_suprimento')].nome;
  const esperado = resumo.esperadoNaGavetaCentavos;

  if (!liberado || !caixa || esperado === null) {
    return (
      <TelaBase bordas={['top']} style={estilos.bloqueio}>
        <CabecalhoTela titulo={textos.titulo} onVoltar={voltar} rotuloVoltar="Voltar para o caixa" />
        {liberado ? (
          <Texto estilo="corpoL" cor={cores.ink2}>
            Abra o caixa antes de registrar movimentos.
          </Texto>
        ) : (
          <Banner
            tipo="atencao"
            texto={`Sangria e suprimento estão disponíveis a partir do plano ${planoNome}. Seu caixa continua abrindo e fechando normalmente.`}
            acao={{ rotulo: `Conhecer o ${planoNome}`, aoPressionar: () => router.push('/ajustes/assinatura') }}
          />
        )}
      </TelaBase>
    );
  }

  const registrar = async () => {
    if (tipo !== 'suprimento' && !dados.pode('retirar_dinheiro')) { setErro('Esta saída exige autorização. Peça ao dono ou gerente que a registre no seu turno pela tela Caixas da loja.'); return; }
    if (valor <= 0) {
      setErro('Digite um valor maior que zero.');
      return;
    }
    if (tipo !== 'suprimento' && valor > esperado) {
      setErro(`A retirada é maior que o dinheiro esperado na gaveta (${formatarBRL(esperado)}).`);
      return;
    }
    setSalvando(true);
    try {
      await registrarMovimento(tipo, valor, motivo.trim() || undefined, { categoria, destino });
      toast.mostrar(`${textos.feito}: ${formatarBRL(valor)}`, { tipo: 'sucesso' });
      router.replace('/caixa');
    } catch (e) {
      if (ehErroDeDominio(e, 'valor_invalido')) setErro(e.message);
      else if (ehErroDeDominio(e, 'recurso_plano')) setErro(`Disponível a partir do plano ${planoNome}.`);
      else toast.mostrar(mensagemDeErro(e), { tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaDeValor
      titulo={textos.titulo}
      onVoltar={voltar}
      descricao={textos.descricao}
      antes={
        <View style={estilos.esperado}>
          <LinhaValor rotulo="Esperado na gaveta" centavos={esperado} />
        </View>
      }
      rotuloCampo={textos.campo}
      valorCentavos={valor}
      onChange={(novo) => {
        setValor(novo);
        setErro(null);
      }}
      erro={erro}
      depois={<View style={{ gap: 12 }}>
        <Campo rotulo="Categoria" value={categoria} onChangeText={setCategoria} maxLength={100} />
        <Campo rotulo={tipo === 'suprimento' ? 'Origem do dinheiro' : 'Destino e responsável pelo recebimento'} value={destino} onChangeText={setDestino} maxLength={150} />
        <Campo rotulo="Motivo" value={motivo} onChangeText={setMotivo} maxLength={500} placeholder={tipo === 'sangria' ? 'Ex.: recolhimento para o cofre' : 'Ex.: reforço de troco'} />
        {tipo !== 'suprimento' && !dados.pode('retirar_dinheiro') ? <Texto estilo="corpo">Peça ao dono ou gerente que autorize e registre a saída no seu turno.</Texto> : null}
      </View>}
      acao={{ rotulo: textos.acao, onPress: registrar, carregando: salvando }}
    />
  );
}

const estilos = StyleSheet.create({
  bloqueio: { gap: 16, paddingTop: 16 },
  esperado: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
});
