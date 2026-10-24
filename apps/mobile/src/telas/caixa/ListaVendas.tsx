import { formatarBRL, PLANOS, planoMinimoPara, type Venda } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Chip } from '@/componentes/Chip';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { LinhaLista } from '@/componentes/LinhaLista';
import { Segmentado } from '@/componentes/Segmentado';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useDados, useLicenca, useVendas } from '@/dados/hooks';
import { useObservavel } from '@/dados/observavel';
import { cores } from '@/tema';
import { FolhaDePlano } from '@/componentes/FolhaDePlano';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { iconeDoMeio } from '@/util/meios';
import { formatarHora, inicioDoDia } from '@/util/tempo';
import { CabecalhoCaixa } from './CabecalhoCaixa';
import { compartilharCsv } from './compartilhar';
import {
  agruparPorDia,
  filtrarPorMeio,
  periodoExigePlano,
  resumirVendas,
  rotuloDoDia,
  rotuloDosPagamentos,
  textoDeItens,
  vendasDoPeriodo,
  type FiltroMeio,
  type PeriodoVendas,
} from './logica';
import { csvDeVendas, nomeDoArquivoDeVendas } from './vendasCsv';

const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: '7dias', rotulo: '7 dias' },
] as const;

const MEIOS: readonly { valor: FiltroMeio; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todas' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao', rotulo: 'Cartão' },
];

type Linha = { tipo: 'dia'; chave: string; rotulo: string } | { tipo: 'venda'; chave: string; venda: Venda; ultima: boolean };

export function ListaVendas() {
  const router = useRouter();
  const toast = useToast();
  const { relogio } = useDados();
  useObservavel(relogio);
  const { vendas, numeroDe } = useVendas();
  const { podeUsar, limite } = useLicenca();
  const [periodo, setPeriodo] = useState<PeriodoVendas>('hoje');
  const [meio, setMeio] = useState<FiltroMeio>('todos');
  const [avisoPlano, setAvisoPlano] = useState<'periodo' | 'csv' | null>(null);
  const [exportando, setExportando] = useState(false);

  // Só o dia importa para períodos e rótulos: um valor estável evita recalcular a lista a cada render.
  const diaDeHoje = inicioDoDia(relogio.agora()).getTime();
  const agora = useMemo(() => new Date(diaDeHoje), [diaDeHoje]);
  const historicoDias = limite('historicoDias');
  const periodoBloqueado = periodoExigePlano(periodo) && !podeUsar('relatorios_periodo');
  const podeExportar = podeUsar('exportar_csv');
  const planoPeriodo = PLANOS[planoMinimoPara('relatorios_periodo')].nome;
  const planoCsv = PLANOS[planoMinimoPara('exportar_csv')].nome;

  const lista = useMemo(
    () => (periodoBloqueado ? [] : filtrarPorMeio(vendasDoPeriodo(vendas, periodo, agora, historicoDias), meio)),
    [periodoBloqueado, vendas, periodo, agora, historicoDias, meio],
  );
  const resumo = resumirVendas(lista);
  const linhas = useMemo<Linha[]>(
    () =>
      agruparPorDia(lista).flatMap((grupo) => [
        { tipo: 'dia' as const, chave: `dia-${grupo.dia.getTime()}`, rotulo: rotuloDoDia(grupo.dia, agora) },
        ...grupo.vendas.map((venda, i) => ({ tipo: 'venda' as const, chave: venda.id, venda, ultima: i === grupo.vendas.length - 1 })),
      ]),
    [lista, agora],
  );

  const exportar = async () => {
    if (!podeExportar) {
      setAvisoPlano('csv');
      return;
    }
    if (lista.length === 0) {
      toast.mostrar('Não há vendas neste período para exportar.');
      return;
    }
    setExportando(true);
    try {
      const resultado = await compartilharCsv(nomeDoArquivoDeVendas(agora), csvDeVendas(lista, numeroDe));
      if (resultado === 'baixado') toast.mostrar('Arquivo CSV baixado.', { tipo: 'sucesso' });
      else if (resultado === 'indisponivel') toast.mostrar('Este aparelho não consegue compartilhar arquivos.', { tipo: 'erro' });
    } catch {
      toast.mostrar('Não foi possível exportar. Tente de novo.', { tipo: 'erro' });
    } finally {
      setExportando(false);
    }
  };

  const textoResumo = `${resumo.concluidas} ${resumo.concluidas === 1 ? 'venda' : 'vendas'} · ${formatarBRL(resumo.totalCentavos)}${
    resumo.canceladas > 0 ? ` · ${resumo.canceladas} ${resumo.canceladas === 1 ? 'cancelada' : 'canceladas'}` : ''
  }`;

  const cabecalho = (
    <View style={estilos.cabecalhoLista}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="toolbar" accessibilityLabel="Filtrar por forma de pagamento" contentContainerStyle={estilos.chips}>
        {MEIOS.map((m) => (
          <Chip key={m.valor} rotulo={m.rotulo} ativo={meio === m.valor} onPress={() => setMeio(m.valor)} />
        ))}
      </ScrollView>
      {periodoBloqueado ? (
        <Banner
          tipo="atencao"
          texto={`Ver vendas de ontem e dos últimos 7 dias está disponível a partir do plano ${planoPeriodo}. As vendas de hoje continuam aqui.`}
          acao={{ rotulo: `Conhecer o ${planoPeriodo}`, aoPressionar: () => router.push('/ajustes/assinatura') }}
        />
      ) : (
        <View style={estilos.resumo}>
          <Texto estilo="corpoMedio" numerico accessibilityLiveRegion="polite" style={estilos.textoResumo}>
            {textoResumo}
          </Texto>
          <Botao
            rotulo="Exportar CSV"
            icone={podeExportar ? undefined : 'cadeado'}
            variante="terciario"
            tamanho="S"
            carregando={exportando}
            accessibilityHint={podeExportar ? 'Gera uma planilha com as vendas listadas' : `Disponível no plano ${planoCsv}`}
            onPress={exportar}
          />
        </View>
      )}
    </View>
  );

  const vazio = periodoBloqueado ? undefined : (
    <View style={estilos.vazio}>
      <Ilustra kind="recibo" size={120} />
      <Texto estilo="tituloM" accessibilityRole="header">
        Nenhuma venda aqui
      </Texto>
      <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
        {meio === 'todos' ? 'Quando você vender, as vendas aparecem nesta lista.' : 'Nenhuma venda com essa forma de pagamento.'}
      </Texto>
    </View>
  );

  return (
    <TelaBase bordas={['top']}>
      <View style={estilos.topo}>
        <CabecalhoCaixa secao="vendas" />
        <Segmentado rotuloGrupo="Período das vendas" opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />
      </View>
      <FlatList
        data={linhas}
        keyExtractor={(l) => l.chave}
        ListHeaderComponent={cabecalho}
        ListEmptyComponent={vazio}
        ListFooterComponent={
          historicoDias === null ? undefined : (
            <Texto estilo="legenda" cor={cores.ink3} style={estilos.rodapeLista}>
              {`Histórico de ${historicoDias >= 365 ? `${Math.round(historicoDias / 365)} anos` : `${historicoDias} dias`} no seu plano.`}
            </Texto>
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.lista}
        renderItem={({ item }) =>
          item.tipo === 'dia' ? (
            <Texto estilo="label" cor={cores.ink3} accessibilityRole="header" style={estilos.dia}>
              {item.rotulo}
            </Texto>
          ) : (
            <LinhaDaVenda venda={item.venda} numero={numeroDe(item.venda)} divisor={!item.ultima} onPress={() => router.push({ pathname: '/caixa/venda/[id]', params: { id: item.venda.id } })} />
          )
        }
      />
      <FolhaDePlano
        visivel={avisoPlano === 'csv'}
        onFechar={() => setAvisoPlano(null)}
        titulo="Exportar vendas"
        texto={`Baixe as vendas em CSV para abrir no Excel ou enviar ao contador. Disponível a partir do plano ${planoCsv}.`}
        planoNome={planoCsv}
      />
    </TelaBase>
  );
}

function LinhaDaVenda({ venda, numero, divisor, onPress }: { venda: Venda; numero: string; divisor: boolean; onPress: () => void }) {
  const paga = venda.status === 'concluida';
  const hora = formatarHora(new Date(venda.criadaEm));
  const pagamentos = rotuloDosPagamentos(venda);
  return (
    <LinhaLista
      titulo={`${numero} · ${pagamentos}`}
      subtitulo={`${hora} · ${textoDeItens(venda.itens.length)}`}
      rotuloAcessivel={`Venda ${numero.slice(1)}, ${pagamentos}, ${hora}, ${falarDinheiro(venda.totalCentavos)}, ${paga ? 'paga' : 'cancelada'}. Toque para ver os detalhes`}
      miniatura={<Icone nome={iconeDoMeio(venda.pagamentos[0]?.meio ?? 'dinheiro')} tamanho={22} />}
      divisor={divisor}
      onPress={onPress}
      valor={
        <View style={estilos.valorVenda}>
          <Dinheiro centavos={venda.totalCentavos} estilo="corpoMedio" accessible={false} cor={paga ? cores.ink : cores.ink2} style={paga ? undefined : estilos.riscado} />
          <StatusPill tipo={paga ? 'pago' : 'cancelado'} />
        </View>
      }
    />
  );
}

const estilos = StyleSheet.create({
  topo: { gap: 16, paddingTop: 24, paddingBottom: 8 },
  lista: { paddingBottom: 16, flexGrow: 1 },
  cabecalhoLista: { gap: 12, paddingBottom: 4 },
  chips: { gap: 8, paddingVertical: 6, paddingRight: 20 },
  resumo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  textoResumo: { flexShrink: 1 },
  dia: { paddingTop: 12, paddingBottom: 4 },
  valorVenda: { alignItems: 'flex-end', gap: 4 },
  riscado: { textDecorationLine: 'line-through' },
  vazio: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  centro: { textAlign: 'center' },
  rodapeLista: { paddingTop: 16, textAlign: 'center' },
});
