import { formatarBRL, formatarData, formatarDataCurta, PLANOS, PLANOS_DISPONIVEIS, valorMensalAssinatura, type PlanoId } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Icone } from '@/componentes/Icone';
import { Secao } from '@/componentes/Secao';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useAssinatura, useDados } from '@/dados/hooks';
import { useObservavel } from '@/dados/observavel';
import { mensagemDeErro } from '@/servicos/backend';
import { cores, raio } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { rotuloBandeira } from '@/util/cartao';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { STATUS_VISUAL } from '@/util/statusAssinatura';

type Folha = 'trocar' | 'cancelar' | null;

export default function Assinatura() {
  const router = useRouter();
  const toast = useToast();
  const dados = useDados();
  const { assinatura, agora, servico, modo } = useAssinatura();
  const desvioDeDias = useObservavel(dados.relogio);
  const [folha, setFolha] = useState<Folha>(null);
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanoId | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Quem usa leitor de tela precisa saber quando a situação muda (ex.: o teste acabou e a cobrança falhou).
  const statusAnterior = useRef(assinatura?.status);
  useEffect(() => {
    if (assinatura && assinatura.status !== statusAnterior.current) {
      AccessibilityInfo.announceForAccessibility(`Situação da assinatura: ${STATUS_VISUAL[assinatura.status].texto}`);
    }
    statusAnterior.current = assinatura?.status;
  }, [assinatura]);

  if (!assinatura) return null;

  if (assinatura.status === 'liberada') {
    return (
      <TelaBase rolavel bordas={['top']} style={estilos.tela}>
        <View style={estilos.topo}>
          <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => router.back()} />
          <Texto estilo="tituloL" accessibilityRole="header">Acesso ao PDV</Texto>
        </View>
        <View style={estilos.plano}>
          <Texto estilo="tituloL">Acesso liberado sem cobrança</Texto>
          <Texto estilo="corpo" cor={cores.ink2}>
            Você pode usar o PDV sem cadastrar cartão e sem pagar assinatura neste momento.
          </Texto>
          <Texto estilo="corpo" cor={cores.ink2}>
            Nenhuma cobrança será iniciada automaticamente. Se houver uma oferta paga no futuro, você precisará concordar antes de contratar.
          </Texto>
        </View>
      </TelaBase>
    );
  }

  const plano = PLANOS[assinatura.planoId];
  const status = STATUS_VISUAL[assinatura.status];
  const precoDaProxima = valorMensalAssinatura(assinatura);
  const previa = planoEscolhido ? servico.previaTroca(planoEscolhido) : null;
  const podeTrocar = assinatura.planoId !== 'pro' && (assinatura.status === 'em_teste' || assinatura.status === 'ativa');
  const podeCancelar = assinatura.status !== 'cancelada' && assinatura.status !== 'sem_assinatura';
  const fimDoAcesso = assinatura.status === 'em_teste' ? assinatura.testeTerminaEm : assinatura.periodoAtualFim;

  const executar = async (acao: () => Promise<void>, sucesso: string) => {
    setOcupado(true);
    try {
      await acao();
      setFolha(null);
      toast.mostrar(sucesso, { tipo: 'sucesso' });
    } catch (erro) {
      toast.mostrar(mensagemDeErro(erro), { tipo: 'erro' });
    } finally {
      setOcupado(false);
    }
  };

  const linhaDaCobranca = (): string | null => {
    switch (assinatura.status) {
      case 'em_teste':
        return `Primeira cobrança em ${formatarData(assinatura.testeTerminaEm)}: ${formatarBRL(precoDaProxima)}.`;
      case 'ativa':
        return `Próxima cobrança em ${formatarData(assinatura.periodoAtualFim)}: ${formatarBRL(precoDaProxima)}.`;
      case 'inadimplente':
        return assinatura.proximaTentativaEm ? `Vamos tentar de novo em ${formatarData(assinatura.proximaTentativaEm)}.` : 'Não haverá novas tentativas automáticas.';
      case 'cancelada':
        return assinatura.acessoAte ? `Você tem acesso até ${formatarData(assinatura.acessoAte)}.` : null;
      default:
        return null;
    }
  };

  const textoCancelamento =
    assinatura.status === 'em_teste'
      ? `Você não será cobrado. Seu acesso continua até ${formatarData(fimDoAcesso)}, o fim do teste grátis.`
      : `Você continua com acesso até ${formatarData(fimDoAcesso)}, o fim do período já pago. Depois disso não será mais cobrado e os dados ficam guardados por 90 dias.`;

  const textoPrevia = previa
    ? previa.efeito === 'proximo_ciclo'
      ? `Vale a partir de ${formatarData(previa.vigenteEm)}, na próxima renovação. Até lá você continua no plano ${plano.nome}. Nada é apagado.`
      : previa.cobrancaAgoraCentavos > 0
        ? `Você paga ${formatarBRL(previa.cobrancaAgoraCentavos)} agora, proporcional aos dias que faltam, e o plano novo vale na hora. A renovação passa a ser de ${formatarBRL(previa.novoPrecoCentavos)}.`
        : `Vale na hora, sem cobrança agora. A primeira cobrança passa a ser de ${formatarBRL(previa.novoPrecoCentavos)}.`
    : null;

  const aviso = linhaDaCobranca();

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <View style={estilos.topo}>
        <BotaoIcone icone="voltar" rotulo="Voltar" onPress={() => router.back()} />
        <Texto estilo="tituloL" accessibilityRole="header">
          Assinatura
        </Texto>
      </View>

      <View style={estilos.plano}>
        <View style={estilos.linhaPlano}>
          <Texto estilo="tituloL">{`Plano ${plano.nome}`}</Texto>
          <StatusPill tipo={status.tipo} texto={status.texto} />
        </View>
        <Texto estilo="corpo" cor={cores.ink2} numerico accessibilityLabel={`${falarDinheiro(precoDaProxima)} por mês`}>
          {`${formatarBRL(precoDaProxima)} por mês`}
        </Texto>
        {assinatura.cupom ? (
          <Texto estilo="corpoMedio" cor={cores.folha}>
            {`Cupom ${assinatura.cupom.codigo}: ${assinatura.cupom.percentualDesconto}% de desconto vitalício sobre ${formatarBRL(plano.precoMensalCentavos)}/mês.`}
          </Texto>
        ) : null}
        {aviso ? (
          <Texto estilo="corpoMedio" numerico>
            {aviso}
          </Texto>
        ) : null}
        {assinatura.planoAgendado ? (
          <Texto estilo="corpo" cor={cores.ink2}>
            {`Na renovação o plano muda para ${PLANOS[assinatura.planoAgendado].nome}.`}
          </Texto>
        ) : null}
      </View>

      {assinatura.status === 'inadimplente' ? (
        <Banner
          tipo="erro"
          texto="Não conseguimos cobrar seu cartão. Atualize para continuar vendendo."
          acao={{ rotulo: 'Atualizar cartão', aoPressionar: () => router.push('/atualizar-cartao') }}
        />
      ) : null}

      <Secao titulo="Cartão">
        <View style={estilos.cartao}>
          <Icone nome="cartao" />
          <Texto
            estilo="corpoMedio"
            style={estilos.numeroCartao}
            accessibilityLabel={assinatura.cartao ? `${rotuloBandeira(assinatura.cartao.bandeira)} com final ${assinatura.cartao.ultimos4}` : 'Nenhum cartão cadastrado'}
          >
            {assinatura.cartao ? `${rotuloBandeira(assinatura.cartao.bandeira)} •••• ${assinatura.cartao.ultimos4}` : 'Nenhum cartão'}
          </Texto>
          <Botao rotulo="Atualizar cartão" variante="secundario" tamanho="S" onPress={() => router.push('/atualizar-cartao')} />
        </View>
      </Secao>

      <View style={estilos.acoes}>
        {assinatura.status === 'cancelada' ? (
          <Botao
            rotulo="Reativar assinatura"
            carregando={ocupado}
            onPress={() => executar(() => servico.reativar(assinatura.planoId), 'Assinatura reativada.')}
          />
        ) : null}
        {podeTrocar ? (
          <Botao
            rotulo="Trocar plano"
            variante="terciario"
            onPress={() => {
              setPlanoEscolhido(null);
              setFolha('trocar');
            }}
          />
        ) : null}
        {podeCancelar ? <Botao rotulo="Cancelar assinatura" variante="perigo" onPress={() => setFolha('cancelar')} /> : null}
      </View>

      {FERRAMENTAS_TESTE && modo === 'demo' ? (
        <Secao titulo="Relógio de teste">
          <View style={estilos.relogio}>
            <Texto estilo="corpoMedio" numerico>
              {`Dia simulado: ${formatarData(agora)}${desvioDeDias === 0 ? ' (hoje de verdade)' : ` (${desvioDeDias > 0 ? '+' : ''}${desvioDeDias} dias)`}`}
            </Texto>
            <Texto estilo="legenda" cor={cores.ink3}>
              Só na versão de testes: avance o tempo para ver teste → cobrança → falha. Cartão 4000 0000 0000 0341 recusa as cobranças.
            </Texto>
            <View style={estilos.botoesRelogio}>
              <Botao
                rotulo="Avançar 1 dia"
                tamanho="M"
                variante="terciario"
                onPress={async () => {
                  await dados.relogio.avancarDias(1);
                  await servico.sincronizar();
                }}
              />
              <Botao
                rotulo="Avançar 7 dias"
                tamanho="M"
                variante="terciario"
                onPress={async () => {
                  await dados.relogio.avancarDias(7);
                  await servico.sincronizar();
                }}
              />
              <Botao
                rotulo="Voltar ao normal"
                tamanho="M"
                variante="ghost"
                onPress={async () => {
                  await dados.relogio.voltarAoNormal();
                  await servico.sincronizar();
                }}
              />
            </View>
          </View>
        </Secao>
      ) : null}

      <BottomSheet visivel={folha === 'trocar'} onFechar={() => setFolha(null)} titulo="Trocar plano">
        <View accessibilityRole="radiogroup" accessibilityLabel="Planos" style={estilos.opcoes}>
          {PLANOS_DISPONIVEIS.map((id) => (
            <OpcaoDePlano
              key={id}
              nome={PLANOS[id].nome}
              preco={PLANOS[id].precoMensalCentavos}
              atual={id === assinatura.planoId && assinatura.planoAgendado === null}
              selecionado={id === planoEscolhido}
              onPress={() => setPlanoEscolhido(id)}
            />
          ))}
        </View>
        {textoPrevia ? (
          <Texto estilo="corpo" cor={cores.ink2} accessibilityLiveRegion="polite">
            {textoPrevia}
          </Texto>
        ) : null}
        <Botao
          rotulo={previa?.efeito === 'proximo_ciclo' ? 'Agendar troca' : 'Confirmar troca'}
          desabilitado={!previa}
          carregando={ocupado}
          onPress={() => {
            if (!previa) return;
            executar(
              () => servico.trocarPlano(previa.planoId),
              previa.efeito === 'proximo_ciclo' ? `Troca agendada para ${formatarDataCurta(previa.vigenteEm)}.` : `Plano alterado para ${PLANOS[previa.planoId].nome}.`,
            );
          }}
        />
      </BottomSheet>

      <BottomSheet visivel={folha === 'cancelar'} onFechar={() => setFolha(null)} titulo="Cancelar assinatura?">
        <Texto estilo="corpoL" cor={cores.ink2}>
          {textoCancelamento}
        </Texto>
        <Botao
          rotulo="Cancelar assinatura"
          variante="perigo"
          carregando={ocupado}
          onPress={() => executar(() => servico.cancelar(), `Assinatura cancelada. Acesso até ${formatarDataCurta(fimDoAcesso)}.`)}
        />
        <Botao rotulo="Manter assinatura" variante="terciario" onPress={() => setFolha(null)} />
      </BottomSheet>
    </TelaBase>
  );
}

function OpcaoDePlano({
  nome,
  preco,
  atual,
  selecionado,
  onPress,
}: {
  nome: string;
  preco: number;
  atual: boolean;
  selecionado: boolean;
  onPress: () => void;
}) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${nome}, ${falarDinheiro(preco)} por mês${atual ? ', plano atual' : ''}`}
      accessibilityState={{ checked: selecionado, disabled: atual }}
      disabled={atual}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={[estilos.opcao, selecionado && estilos.opcaoSelecionada, atual && estilos.opcaoAtual, anel]}
    >
      <View style={{ flex: 1 }}>
        <Texto estilo="corpoMedio">{nome}</Texto>
        {atual ? (
          <Texto estilo="legenda" cor={cores.ink3}>
            Plano atual
          </Texto>
        ) : null}
      </View>
      <Texto estilo="corpoMedio" numerico>{`${formatarBRL(preco)}/mês`}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 24, paddingTop: 12, paddingBottom: 32 },
  topo: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16 },
  plano: { gap: 8, padding: 20, borderRadius: raio.lg, backgroundColor: cores.surface },
  linhaPlano: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  cartao: { minHeight: 64, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 12, paddingLeft: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  numeroCartao: { flex: 1, minWidth: 120 },
  acoes: { gap: 12 },
  relogio: { gap: 12, padding: 16, borderRadius: raio.md, borderWidth: 1, borderColor: cores.line },
  botoesRelogio: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcoes: { gap: 8 },
  opcao: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: raio.md, borderWidth: 2, borderColor: cores.line },
  opcaoSelecionada: { borderColor: cores.anil, backgroundColor: cores.anilSoft },
  opcaoAtual: { opacity: 0.6 },
});
