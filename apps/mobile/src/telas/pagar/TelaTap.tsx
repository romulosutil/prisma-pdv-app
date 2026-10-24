import { formatarBRL } from '@pdv/shared';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import type { ProvedorPagamento } from '@/dados/tipos';
import { provedoresPagamento } from '@/servicos/provedoresPagamento';
import { cores, raio } from '@/tema';
import { FERRAMENTAS_TESTE } from '@/util/ferramentasTeste';
import { CabecalhoPagamento } from './CabecalhoPagamento';
import { NOME_TAP } from './rotulos';
import { useCobranca } from './useCobranca';

export function TelaTap() {
  const { provedor } = useCobranca();
  return provedor ? <AproximacaoEmCurso provedor={provedor} /> : <Redirect href="/pagar" />;
}

/** Aproximação no próprio celular: aguarda o provedor aprovar. A versão de testes aprova sozinha após alguns segundos. */
function AproximacaoEmCurso({ provedor }: { provedor: ProvedorPagamento }) {
  const router = useRouter();
  const { valorCentavos, receber, parametros } = useCobranca();
  const [cobranca] = useState(() => provedoresPagamento.iniciarTap({ provedor, valorCentavos }));
  const resolvida = useRef(false);
  const nome = NOME_TAP[provedor];

  useEffect(() => {
    const conferir = () => {
      if (resolvida.current) return;
      const situacao = provedoresPagamento.situacaoTap(cobranca.id);
      if (situacao === 'aguardando') return;
      resolvida.current = true;
      if (situacao === 'aprovado') void receber({ meio: 'tap', provedor });
      else router.replace({ pathname: '/pagar/tapfalha', params: parametros({ cobranca: cobranca.id }) });
    };
    const intervalo = setInterval(conferir, 400);
    return () => clearInterval(intervalo);
  }, [cobranca, provedor, receber, parametros, router]);

  const simularFalha = () => {
    provedoresPagamento.simularAbandonoTap(cobranca.id);
    resolvida.current = true;
    router.replace({ pathname: '/pagar/tapfalha', params: parametros({ cobranca: cobranca.id }) });
  };

  return (
    <TelaBase rolavel>
      <CabecalhoPagamento titulo="Cartão por aproximação" rotuloVoltar="Cancelar e voltar" />
      <View style={estilos.conteudo}>
        <View style={estilos.topo}>
          <Ilustra kind="tap" size={140} />
          <Texto estilo="tituloL" accessibilityRole="header" style={estilos.centro}>{`Abrindo o ${nome}…`}</Texto>
          <Dinheiro centavos={valorCentavos} estilo="display" />
        </View>

        <View accessibilityRole="list" style={estilos.passos}>
          <Passo estado="feito" texto={`Enviamos ${formatarBRL(valorCentavos)} e a referência da venda`} />
          <Passo estado="andamento" texto="O cliente encosta o cartão atrás do celular" />
          <Passo estado="pendente" numero={3} texto="Você volta para cá com o recibo" ultimo />
        </View>
        <Texto estilo="legenda" cor={cores.ink3}>
          {`Se o app não abrir, confira se o ${nome} está instalado e logado.`}
        </Texto>

        {FERRAMENTAS_TESTE ? <Botao rotulo="Simular falha" variante="terciario" tamanho="S" larguraTotal onPress={simularFalha} /> : null}
      </View>
    </TelaBase>
  );
}

type EstadoPasso = 'feito' | 'andamento' | 'pendente';
const PREFIXO: Record<EstadoPasso, string> = { feito: 'Concluído', andamento: 'Em andamento', pendente: 'Pendente' };

function Passo({ estado, texto, numero, ultimo }: { estado: EstadoPasso; texto: string; numero?: number; ultimo?: boolean }) {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${PREFIXO[estado]}: ${texto}`} style={[estilos.passo, !ultimo && estilos.divisor]}>
      <View style={[estilos.marca, estado === 'feito' && estilos.marcaFeita, estado === 'pendente' && estilos.marcaPendente]}>
        {estado === 'feito' ? <Icone nome="check" tamanho={16} cor={cores.folha} espessura={3} /> : null}
        {estado === 'andamento' ? <ActivityIndicator size="small" color={cores.anil} /> : null}
        {estado === 'pendente' ? (
          <Texto estilo="legenda" cor={cores.ink3}>
            {numero}
          </Texto>
        ) : null}
      </View>
      <Texto estilo={estado === 'andamento' ? 'corpoMedio' : 'corpo'} cor={estado === 'pendente' ? cores.ink3 : cores.ink} style={estilos.textoPasso}>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16, paddingBottom: 16 },
  topo: { alignItems: 'center', gap: 8 },
  centro: { textAlign: 'center' },
  passos: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: raio.md, backgroundColor: cores.surface },
  passo: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divisor: { borderBottomWidth: 1, borderBottomColor: cores.line },
  marca: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  marcaFeita: { backgroundColor: cores.folhaSoft },
  marcaPendente: { borderWidth: 2, borderColor: cores.line },
  textoPasso: { flex: 1 },
});
