import { PLANOS } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Chip } from '@/componentes/Chip';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { LinhaLista } from '@/componentes/LinhaLista';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useLicenca, useProdutos } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { CampoBusca } from './CampoBusca';
import { FolhaDePlano } from '@/componentes/FolhaDePlano';
import { IconeProduto } from './icones';
import { LinhaProduto } from './LinhaProduto';
import { contarPorFiltro, filtrarProdutos, legendaDoContador, planoSemLimiteDeProdutos, situacaoDoLimite, type FiltroProdutos } from './logica';

export function ListaProdutos() {
  const router = useRouter();
  const { produtos } = useProdutos();
  const { planoId, podeUsar, limite } = useLicenca();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroProdutos>('todos');
  const [avisoLimite, setAvisoLimite] = useState(false);

  const comEstoque = podeUsar('estoque');
  const limiteProdutos = limite('produtos');
  const situacao = situacaoDoLimite(produtos.length, limiteProdutos);
  const planoIlimitado = planoSemLimiteDeProdutos();
  const contagem = useMemo(() => contarPorFiltro(produtos), [produtos]);
  const visiveis = useMemo(() => filtrarProdutos(produtos, filtro, busca), [produtos, filtro, busca]);
  const semFiltros = busca.trim() === '' && filtro === 'todos';
  const legendaContador = legendaDoContador(produtos.length, limiteProdutos);

  const escolher = (novo: FiltroProdutos) => setFiltro(filtro === novo && novo !== 'todos' ? 'todos' : novo);
  const abrirNovo = () => (situacao === 'atingido' ? setAvisoLimite(true) : router.push('/produtos/novo'));
  const limparFiltros = () => {
    setBusca('');
    setFiltro('todos');
  };

  const cabecalho = (
    <View style={estilos.cabecalhoLista}>
      {situacao === 'atingido' ? (
        <Banner
          tipo="atencao"
          texto={`${produtos.length > (limiteProdutos ?? 0) ? 'Seu catálogo passou do' : 'Você chegou ao'} limite de ${limiteProdutos} produtos do plano ${PLANOS[planoId].nome}. Nada foi apagado e as vendas seguem normais.`}
          acao={{ rotulo: `Conhecer o ${planoIlimitado.nome}`, aoPressionar: () => router.push('/ajustes/assinatura') }}
        />
      ) : null}
      {semFiltros ? (
        <View style={estilos.atalhos}>
          <LinhaLista
            titulo="Atalhos de venda"
            subtitulo="Botões rápidos para pão, gelo e hortifruti"
            rotuloAcessivel="Atalhos de venda. Botões rápidos para pão, gelo e hortifruti"
            miniatura={<IconeProduto nome="raio" />}
            valor={<Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />}
            onPress={() => router.push('/produtos/atalhos')}
            divisor
          />
          <LinhaLista
            titulo="Cadastro rápido"
            subtitulo="Bipe, dê o preço e passe ao próximo"
            rotuloAcessivel="Cadastro rápido. Bipe, dê o preço e passe ao próximo"
            miniatura={<Icone nome="cadastrarBipando" />}
            valor={<Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />}
            onPress={() => router.push('/produtos/rapido')}
          />
        </View>
      ) : null}
    </View>
  );

  const vazio = (
    <View style={estilos.vazio}>
      <Ilustra kind={produtos.length === 0 ? 'produto' : 'busca'} size={120} />
      <Texto estilo="tituloM" accessibilityRole="header">
        {produtos.length === 0 ? 'Seu catálogo está vazio' : 'Nenhum produto encontrado'}
      </Texto>
      <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
        {produtos.length === 0 ? 'Bipe um produto para cadastrar o primeiro.' : 'Tente outro nome ou cadastre bipando.'}
      </Texto>
      {produtos.length > 0 ? <Botao rotulo="Limpar busca" variante="terciario" tamanho="M" onPress={limparFiltros} /> : null}
    </View>
  );

  const topoRolavel = (
      <View style={estilos.topo}>
        <View style={estilos.titulo}>
          <View style={estilos.linhaTitulo}>
            <Texto estilo="tituloXL" accessibilityRole="header" style={estilos.textoTitulo}>
              Produtos
            </Texto>
            <Botao rotulo="Novo produto" icone="mais" variante="terciario" tamanho="S" onPress={abrirNovo} />
          </View>
          <Texto estilo="legenda" cor={situacao === 'livre' ? cores.ink3 : cores.ambar} accessibilityLiveRegion="polite">
            {legendaContador}
          </Texto>
        </View>
        <CampoBusca valor={busca} onChange={setBusca} rotulo="Buscar produto" placeholder="Buscar por nome ou código" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="toolbar" accessibilityLabel="Filtros" contentContainerStyle={estilos.chips}>
          <Chip rotulo="Todos" ativo={filtro === 'todos'} onPress={() => escolher('todos')} />
          <Chip rotulo="Com código" ativo={filtro === 'com_codigo'} onPress={() => escolher('com_codigo')} />
          <Chip rotulo="Sem código/kg" ativo={filtro === 'sem_codigo'} onPress={() => escolher('sem_codigo')} />
          <Chip rotulo={`Atalhos · ${contagem.atalhos}`} ativo={filtro === 'atalhos'} onPress={() => escolher('atalhos')} />
          {comEstoque ? (
            <Chip rotulo={`Estoque baixo · ${contagem.estoque_baixo}`} ativo={filtro === 'estoque_baixo'} onPress={() => escolher('estoque_baixo')} />
          ) : null}
        </ScrollView>
      </View>
  );
  return (
    <TelaBase bordas={['top']} rodape={<Botao rotulo="Cadastrar bipando" icone="cadastrarBipando" onPress={() => router.push('/produtos/scanner')} />}>
      <FlatList
        data={visiveis}
        // Keep native children attached while the first save replaces the empty
        // state during the Android screen transition (Fabric addViewAt crash).
        removeClippedSubviews={false}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={<>{topoRolavel}{cabecalho}</>}
        ListEmptyComponent={vazio}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.lista}
        renderItem={({ item, index }) => (
          <LinhaProduto
            produto={item}
            comEstoque={comEstoque}
            divisor={index < visiveis.length - 1}
            onPress={(p) => router.push({ pathname: '/produtos/[id]', params: { id: p.id } })}
          />
        )}
      />

      <FolhaDePlano
        visivel={avisoLimite}
        onFechar={() => setAvisoLimite(false)}
        titulo="Limite de produtos"
        texto={`O plano ${PLANOS[planoId].nome} inclui ${limiteProdutos} produtos e seu catálogo já chegou lá. Nada foi apagado e as vendas seguem normais. No ${planoIlimitado.nome} você cadastra quantos quiser.`}
        planoNome={planoIlimitado.nome}
      />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  topo: { gap: 12, paddingTop: 24, paddingBottom: 4 },
  titulo: { gap: 2 },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  textoTitulo: { flexShrink: 1 },
  chips: { gap: 8, paddingVertical: 6, paddingRight: 20 },
  lista: { paddingTop: 8, paddingBottom: 16, flexGrow: 1 },
  cabecalhoLista: { gap: 12, marginBottom: 4 },
  atalhos: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  vazio: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  centro: { textAlign: 'center' },
});
