import { formatarBRL, type Produto } from '@pdv/shared';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Chip } from '@/componentes/Chip';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { Scanner } from '@/componentes/Scanner';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useCarrinho, type ItemCarrinho } from '@/dados/carrinho';
import { mensagemDeBloqueio, useLicenca, usePreferencias, useProdutos } from '@/dados/hooks';
import { cores, margemTela, raio, sombras } from '@/tema';
import { useFoco } from '@/tema/useFoco';
import { FolhaAvulso } from './FolhaAvulso';
import { FolhaNaoEncontrado } from './FolhaNaoEncontrado';
import { FolhaPeso } from './FolhaPeso';
import { ItensDoCarrinho } from './ItensDoCarrinho';
import { useAdicionar } from './useAdicionar';

const ALTURA_VISOR = 316;
/** O painel sobe 24 sobre o visor para mostrar os cantos arredondados. */
const SOBREPOSICAO = 24;

type Pesando = {
  nome: string;
  precoCentavos: number;
  pesoInicial: number;
  /** Produto novo a pôr no carrinho, ou a linha existente cujo peso está sendo alterado. */
  destino: { produto: Produto } | { chave: string };
};

export function TelaVender() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const focado = useIsFocused();
  const params = useLocalSearchParams<{ avulso?: string }>();
  const { preferencias } = usePreferencias();
  const { permissaoDeVenda } = useLicenca();
  const { buscarPorEan, atalhos } = useProdutos();
  const carrinho = useCarrinho();
  const adicionar = useAdicionar();

  const [ociosa, setOciosa] = useState(false);
  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const [pesando, setPesando] = useState<Pesando | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null);
  const [descartando, setDescartando] = useState(false);

  const folhaAberta = avulsoAberto || pesando !== null || naoEncontrado !== null || descartando;

  // O visor é escuro: a barra de status fica clara enquanto esta tela está à frente.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  // Só bloqueia uma venda NOVA: com itens no carrinho, a venda em andamento segue.
  const motivoBloqueio = permissaoDeVenda.permitido ? null : permissaoDeVenda.motivo;
  useEffect(() => {
    if (!focado || !motivoBloqueio || !carrinho.vazio) return;
    toast.mostrar(mensagemDeBloqueio(motivoBloqueio), { tipo: 'erro' });
    router.replace('/');
  }, [focado, motivoBloqueio, carrinho.vazio, toast, router]);

  // Dinheiro já recebido numa venda dividida: só dá para concluir a cobrança.
  const cobrancaParcial = carrinho.parcelas.length > 0 && carrinho.concluidaId === null;
  useEffect(() => {
    if (focado && cobrancaParcial) router.replace('/pagar');
  }, [focado, cobrancaParcial, router]);

  // Voltou da busca pedindo valor avulso.
  useEffect(() => {
    if (params.avulso !== '1') return;
    setAvulsoAberto(true);
    router.setParams({ avulso: '' });
  }, [params.avulso, router]);

  // Economia de bateria: sem atividade por `pausarCameraSeg`, a câmera dorme até o toque.
  useEffect(() => {
    if (!focado || ociosa || folhaAberta) return;
    const temporizador = setTimeout(() => setOciosa(true), preferencias.pausarCameraSeg * 1000);
    return () => clearTimeout(temporizador);
  }, [focado, ociosa, folhaAberta, preferencias.pausarCameraSeg, carrinho.itens]);

  const aoEscolherProduto = useCallback(
    (produto: Produto) => {
      if (produto.unidade === 'kg') setPesando({ nome: produto.nome, precoCentavos: produto.precoCentavos, pesoInicial: 0, destino: { produto } });
      else adicionar(produto);
    },
    [adicionar],
  );

  const aoLer = useCallback(
    (codigo: string) => {
      setOciosa(false);
      const produto = buscarPorEan(codigo);
      if (!produto) setNaoEncontrado(codigo);
      else aoEscolherProduto(produto);
    },
    [buscarPorEan, aoEscolherProduto],
  );

  const aoRemover = (item: ItemCarrinho) => {
    carrinho.remover(item.chave);
    toast.mostrar(`${item.descricao} removido`, { acao: { rotulo: 'Desfazer', aoPressionar: carrinho.desfazerRemocao } });
  };

  const aoMudarQuantidade = (item: ItemCarrinho, milesimos: number) => {
    if (milesimos <= 0) aoRemover(item);
    else carrinho.definirQuantidade(item.chave, milesimos);
  };

  const aoConfirmarPeso = (gramas: number) => {
    if (!pesando) return;
    if ('chave' in pesando.destino) carrinho.definirQuantidade(pesando.destino.chave, gramas);
    else adicionar(pesando.destino.produto, gramas);
    setPesando(null);
  };

  const fechar = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const textoItens = carrinho.quantidade === 1 ? '1 item' : `${carrinho.quantidade} itens`;

  return (
    <View style={estilos.raiz}>
      <View style={[estilos.visor, { height: ALTURA_VISOR + insets.top, paddingTop: insets.top }]}>
        <Scanner onLer={aoLer} onFechar={fechar} pausado={!focado || ociosa || folhaAberta}>
          {ociosa ? <AvisoDePausa onAtivar={() => setOciosa(false)} /> : null}
        </Scanner>
      </View>

      <View style={[estilos.painel, sombras.sheet]}>
        <View style={estilos.cabecalho}>
          <View style={estilos.linhaBusca}>
            <CampoDeBusca onPress={() => router.push('/vender/busca')} />
            <Botao rotulo="Avulso" icone="calculadora" variante="terciario" tamanho="M" larguraTotal={false} onPress={() => setAvulsoAberto(true)} />
          </View>
          {atalhos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.atalhos} accessibilityLabel="Atalhos de produtos">
              {atalhos.map((produto) => (
                <Chip key={produto.id} rotulo={produto.nome} onPress={() => aoEscolherProduto(produto)} />
              ))}
            </ScrollView>
          ) : null}
        </View>

        <ItensDoCarrinho
          itens={carrinho.itens}
          onMudarQuantidade={aoMudarQuantidade}
          onAlterarPeso={(item) => setPesando({ nome: item.descricao, precoCentavos: item.precoUnitarioCentavos, pesoInicial: item.quantidadeMilesimos, destino: { chave: item.chave } })}
          onRemover={aoRemover}
          onDestacar={(item) => carrinho.destacar(item.chave)}
        />

        <View style={[estilos.rodape, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={estilos.linhaTotal}>
            <View style={estilos.contagem}>
              <Texto estilo="label" cor={cores.ink2}>
                {textoItens}
              </Texto>
              {!carrinho.vazio ? <Botao rotulo="Limpar venda" variante="ghost" tamanho="S" style={estilos.limpar} onPress={() => setDescartando(true)} /> : null}
            </View>
            <Texto estilo="display" numerico adjustsFontSizeToFit numberOfLines={1} style={estilos.total} accessibilityLabel={`Total: ${formatarBRL(carrinho.totalCentavos)}`}>
              {formatarBRL(carrinho.totalCentavos)}
            </Texto>
          </View>
          <Botao
            rotulo={carrinho.vazio ? 'Cobrar' : `Cobrar ${formatarBRL(carrinho.totalCentavos)}`}
            desabilitado={carrinho.vazio}
            accessibilityHint={carrinho.vazio ? 'Adicione um item para cobrar' : 'Abre as formas de pagamento'}
            onPress={() => router.push('/pagar')}
          />
        </View>
      </View>

      <FolhaAvulso
        visivel={avulsoAberto}
        onFechar={() => setAvulsoAberto(false)}
        onAdicionar={(valor, descricao) => {
          carrinho.adicionarAvulso(valor, descricao);
          setAvulsoAberto(false);
        }}
      />
      <FolhaPeso produto={pesando} pesoInicial={pesando?.pesoInicial} onConfirmar={aoConfirmarPeso} onFechar={() => setPesando(null)} />
      <FolhaNaoEncontrado
        codigo={naoEncontrado}
        onFechar={() => setNaoEncontrado(null)}
        onVenderAvulso={() => {
          setNaoEncontrado(null);
          setAvulsoAberto(true);
        }}
        onCadastrar={() => {
          const codigo = naoEncontrado;
          setNaoEncontrado(null);
          router.push(`/produtos/novo?ean=${codigo ?? ''}`);
        }}
      />
      <BottomSheet visivel={descartando} onFechar={() => setDescartando(false)} titulo="Descartar esta venda?">
        <View style={estilos.confirmacao}>
          <Texto estilo="corpoL" cor={cores.ink2}>
            {`Os ${textoItens} do carrinho serão removidos.`}
          </Texto>
          <Botao
            rotulo="Descartar venda"
            variante="perigo"
            onPress={() => {
              carrinho.limpar();
              setDescartando(false);
            }}
          />
          <Botao rotulo="Manter venda" variante="terciario" onPress={() => setDescartando(false)} />
        </View>
      </BottomSheet>
    </View>
  );
}

function CampoDeBusca({ onPress }: { onPress: () => void }) {
  const { aoFocar, aoDesfocar, anel } = useFoco();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buscar produto ou digitar código"
      onPress={onPress}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      style={({ pressed }) => [estilos.campoBusca, pressed && estilos.campoPressionado, anel]}
    >
      <Icone nome="lupa" tamanho={22} cor={cores.ink2} />
      <Texto estilo="corpoMedio" cor={cores.ink3} numberOfLines={1} style={estilos.textoBusca}>
        Buscar produto ou código
      </Texto>
    </Pressable>
  );
}

function AvisoDePausa({ onAtivar }: { onAtivar: () => void }) {
  return (
    <View style={estilos.pausa}>
      <View style={estilos.medalhaPausa}>
        <Ilustra kind="pausa" size={72} />
      </View>
      <Texto estilo="label" cor={cores.bg}>
        Leitor em pausa para poupar bateria
      </Texto>
      <Botao rotulo="Toque para ativar o leitor" tamanho="M" larguraTotal={false} onPress={onAtivar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.noite },
  visor: { backgroundColor: cores.noite },
  painel: {
    flex: 1,
    marginTop: -SOBREPOSICAO,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
    backgroundColor: cores.bg,
    overflow: 'hidden',
  },
  cabecalho: { gap: 12, paddingTop: 20, paddingHorizontal: margemTela },
  linhaBusca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoBusca: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: raio.md, backgroundColor: cores.surface },
  campoPressionado: { backgroundColor: cores.surface2 },
  textoBusca: { flex: 1 },
  atalhos: { gap: 8, paddingRight: margemTela, paddingVertical: 6 },
  rodape: { gap: 12, paddingTop: 12, paddingHorizontal: margemTela, borderTopWidth: 1, borderTopColor: cores.line, backgroundColor: cores.bg },
  linhaTotal: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  limpar: { marginLeft: -16 },
  contagem: { gap: 2, alignItems: 'flex-start' },
  total: { flexShrink: 1, textAlign: 'right' },
  confirmacao: { gap: 12 },
  pausa: { ...StyleSheet.absoluteFill, top: 60, alignItems: 'center', gap: 10, paddingTop: 12, backgroundColor: 'rgba(13,11,26,0.55)' },
  medalhaPausa: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
});
