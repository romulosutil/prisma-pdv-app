import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone, type NomeIcone } from '@/componentes/Icone';
import { LinhaLista } from '@/componentes/LinhaLista';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useAssinatura, useConta, useResumoDoDia, useVendas } from '@/dados/hooks';
import { avisoDeAssinatura } from '@/nucleo/avisosAssinatura';
import { useAbrirVenda } from '@/nucleo/useAbrirVenda';
import { cores, raio, textoBotao } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { iconeDoMeio, rotuloDoMeio } from '@/util/meios';
import { formatarHora } from '@/util/tempo';

/**
 * Atalho de diagnóstico da versão de testes. A condição é a mesma de `FERRAMENTAS_TESTE`, escrita por extenso de
 * propósito: o Metro só apaga o ramo morto (e o módulo do `require`) quando a condição está inline neste arquivo.
 * Em produção (sem EXPO_PUBLIC_FERRAMENTAS_TESTE) o componente nem entra no bundle.
 */
const ChipComDiagnostico: typeof import('@/diagnostico/ChipComDiagnostico').ChipComDiagnostico | null =
  __DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1'
    ? (require('@/diagnostico/ChipComDiagnostico') as typeof import('@/diagnostico/ChipComDiagnostico')).ChipComDiagnostico
    : null;

const ATALHOS: readonly { icone: NomeIcone; rotulo: string; destino: '/produtos' | '/produtos/scanner' | '/caixa' | '/vender' }[] = [
  { icone: 'cadastrarBipando', rotulo: 'Cadastrar bipando', destino: '/produtos/scanner' },
  { icone: 'produtos', rotulo: 'Produtos', destino: '/produtos' },
  { icone: 'fecharCaixa', rotulo: 'Fechar caixa', destino: '/caixa' },
  { icone: 'calculadora', rotulo: 'Valor avulso', destino: '/vender' },
];

export default function Inicio() {
  const router = useRouter();
  const abrirVenda = useAbrirVenda();
  const { primeiroNome, nomeLoja } = useConta();
  const { assinatura, agora, offline, modo } = useAssinatura();
  const resumo = useResumoDoDia();
  const { vendas, numeroDe } = useVendas();
  const aviso = avisoDeAssinatura(assinatura, agora);

  const meios = [
    { nome: 'Dinheiro', valor: resumo.porMeio.dinheiro },
    { nome: 'Pix', valor: resumo.porMeio.pix },
    { nome: 'Cartão', valor: resumo.porMeio.cartao },
  ];

  const abrirAtalho = (destino: (typeof ATALHOS)[number]['destino']) => (destino === '/vender' ? abrirVenda() : router.push(destino));

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Texto estilo="tituloXL" accessibilityRole="header">
          {`Olá, ${primeiroNome}`}
        </Texto>
        <Texto estilo="corpoMedio" cor={cores.ink2}>
          {nomeLoja}
        </Texto>
        <ChipDeStatus offline={offline} texto={modo === 'demo' ? 'Modo de testes · dados neste aparelho' : offline ? 'Offline · vendas ficam salvas no aparelho' : 'Online'} />
      </View>

      {aviso ? <Banner tipo={aviso.tipo} texto={aviso.texto} acao={{ rotulo: aviso.acao.rotulo, aoPressionar: () => router.push(aviso.acao.destino) }} /> : null}

      <View accessible accessibilityLabel={`Vendido hoje: ${falarDinheiro(resumo.totalCentavos)}, em ${resumo.quantidadeVendas} vendas`} style={estilos.resumo}>
        <View style={estilos.totais}>
          <Texto estilo="label" cor={cores.ink2} accessibilityRole="header">
            Vendido hoje
          </Texto>
          <Dinheiro centavos={resumo.totalCentavos} estilo="display" accessible={false} />
          <Texto estilo="corpoMedio" cor={cores.ink2}>
            {`${resumo.quantidadeVendas} ${resumo.quantidadeVendas === 1 ? 'venda' : 'vendas'}`}
          </Texto>
        </View>
        <View style={estilos.meios} aria-hidden>
          {meios.map((meio) => (
            <View key={meio.nome} style={estilos.linhaMeio}>
              <Texto estilo="label" cor={cores.ink2} style={estilos.nomeMeio}>
                {meio.nome}
              </Texto>
              <View style={estilos.trilho}>
                <View style={[estilos.barra, { width: `${resumo.totalCentavos > 0 ? (meio.valor / resumo.totalCentavos) * 100 : 0}%` }]} />
              </View>
              <Dinheiro centavos={meio.valor} estilo="label" style={estilos.valorMeio} />
            </View>
          ))}
        </View>
      </View>

      <Botao rotulo="Vender" icone="codigoBarras" onPress={abrirVenda} accessibilityHint="Abre o leitor de código de barras" />

      <View style={estilos.atalhos}>
        {ATALHOS.map((a) => (
          <Atalho key={a.rotulo} icone={a.icone} rotulo={a.rotulo} onPress={() => abrirAtalho(a.destino)} />
        ))}
      </View>

      <View style={estilos.ultimas}>
        <View style={estilos.tituloUltimas}>
          <Texto estilo="tituloM" accessibilityRole="header">
            Últimas vendas
          </Texto>
          <Botao rotulo="Ver todas" variante="ghost" tamanho="S" onPress={() => router.push('/caixa')} />
        </View>
        {vendas.slice(0, 3).map((venda, i, lista) => {
          const meio = venda.pagamentos[0]?.meio ?? 'dinheiro';
          const hora = formatarHora(new Date(venda.criadaEm));
          const numero = numeroDe(venda);
          return (
            <LinhaLista
              key={venda.id}
              titulo={`${numero} · ${rotuloDoMeio(meio)}`}
              subtitulo={hora}
              rotuloAcessivel={`Venda ${numero.slice(1)}, ${rotuloDoMeio(meio)}, ${hora}, ${falarDinheiro(venda.totalCentavos)}, ${venda.status === 'concluida' ? 'paga' : 'cancelada'}`}
              miniatura={<Icone nome={iconeDoMeio(meio)} tamanho={22} />}
              divisor={i < lista.length - 1}
              valor={
                <View style={estilos.valorVenda}>
                  <Dinheiro centavos={venda.totalCentavos} estilo="corpoMedio" />
                  <StatusPill tipo={venda.status === 'concluida' ? 'pago' : 'cancelado'} />
                </View>
              }
            />
          );
        })}
      </View>
    </TelaBase>
  );
}

/** Estado da conexão. Na versão de testes, o toque longo (1 s) copia o diagnóstico para a área de transferência. */
function ChipDeStatus({ offline, texto }: { offline: boolean; texto: string }) {
  const cor = offline ? cores.ambar : cores.ink2;
  const conteudo = (
    <>
      <Icone nome={offline ? 'offline' : 'online'} tamanho={16} cor={cor} />
      <Texto estilo="label" cor={cor}>
        {texto}
      </Texto>
    </>
  );
  return ChipComDiagnostico ? <ChipComDiagnostico texto={texto}>{conteudo}</ChipComDiagnostico> : <View style={estilos.conexao}>{conteudo}</View>;
}

function Atalho({ icone, rotulo, onPress }: { icone: NomeIcone; rotulo: string; onPress: () => void }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [estilos.atalho, { backgroundColor: pressed ? cores.surface2 : cores.surface }, anel]}
    >
      <Icone nome={icone} />
      <Texto style={textoBotao.M}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 24, paddingTop: 24, paddingBottom: 32 },
  cabecalho: { gap: 4 },
  conexao: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  resumo: { gap: 16, padding: 20, borderRadius: raio.lg, backgroundColor: cores.surface },
  totais: { gap: 4 },
  meios: { gap: 10 },
  linhaMeio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nomeMeio: { width: 64 },
  trilho: { flex: 1, height: 8, borderRadius: 999, backgroundColor: cores.surface2, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 999, backgroundColor: cores.ink },
  valorMeio: { minWidth: 84, textAlign: 'right' },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  atalho: { flexGrow: 1, flexBasis: '45%', minHeight: 96, justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: raio.md },
  ultimas: { gap: 4 },
  tituloUltimas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  valorVenda: { alignItems: 'flex-end', gap: 4 },
});
