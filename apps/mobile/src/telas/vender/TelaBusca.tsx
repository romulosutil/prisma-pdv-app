import { formatarBRL, type Produto } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BotaoIcone } from '@/componentes/BotaoIcone';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { LinhaLista } from '@/componentes/LinhaLista';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useProdutos } from '@/dados/hooks';
import { cores, raio, texto } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { FolhaNaoEncontrado } from './FolhaNaoEncontrado';
import { FolhaPeso } from './FolhaPeso';
import { useAdicionar } from './useAdicionar';

const monograma = (nome: string): string =>
  nome
    .split(/\s+/)
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0))
    .join('')
    .toUpperCase();

/** Busca por nome (sem acento) ou por trecho do código de barras. */
export function TelaBusca() {
  const router = useRouter();
  const toast = useToast();
  const { produtos, buscarPorNome } = useProdutos();
  const adicionar = useAdicionar();
  const adicionando = useRef(false);

  const [consulta, setConsulta] = useState('');
  const [focado, setFocado] = useState(false);
  const [pesando, setPesando] = useState<Produto | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null);

  const termo = consulta.trim();
  const ehCodigo = /^\d+$/.test(termo);

  const resultados = useMemo(() => {
    if (!termo) return produtos;
    if (ehCodigo) return produtos.filter((p) => p.ean?.includes(termo));
    return buscarPorNome(termo);
  }, [termo, ehCodigo, produtos, buscarPorNome]);

  const escolher = async (produto: Produto) => {
    if (adicionando.current) return;
    if (produto.unidade === 'kg') {
      setPesando(produto);
      return;
    }
    adicionando.current = true;
    try { if (await adicionar(produto)) router.back(); }
    finally { adicionando.current = false; }
  };

  const buscarCodigo = () => {
    const exato = resultados.find((p) => p.ean === termo);
    if (exato) escolher(exato);
    else if (resultados.length === 1 && resultados[0]) escolher(resultados[0]);
    else if (resultados.length > 1) toast.mostrar(`${resultados.length} produtos com ${termo}. Toque no certo abaixo.`);
    else setNaoEncontrado(termo);
  };

  const lancarAvulso = () => router.dismissTo('/vender?avulso=1');
  const titulo = !termo ? 'Todos os produtos' : resultados.length === 1 ? '1 produto' : `${resultados.length} produtos`;

  const cabecalhoBusca = (
      <View style={estilos.cabecalho}>
        <View style={[estilos.caixa, focado && estilos.caixaFocada]}>
          <Icone nome="lupa" tamanho={22} cor={cores.ink2} />
          <TextInput
            autoFocus
            value={consulta}
            onChangeText={setConsulta}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            onSubmitEditing={ehCodigo ? buscarCodigo : undefined}
            accessibilityLabel="Buscar produto ou digitar código"
            placeholder="Buscar produto ou digitar código"
            placeholderTextColor={cores.ink3}
            selectionColor={cores.anil}
            returnKeyType="search"
            autoCorrect={false}
            style={[texto.corpoL, estilos.entrada]}
          />
          {consulta ? <BotaoIcone icone="fechar" rotulo="Limpar busca" onPress={() => setConsulta('')} style={estilos.limpar} /> : null}
        </View>
        <Botao rotulo="Cancelar" variante="ghost" tamanho="M" larguraTotal={false} onPress={() => router.back()} />
      </View>
  );
  return (
    <TelaBase>
      <FlatList
        data={resultados}
        keyExtractor={(produto) => produto.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {cabecalhoBusca}
            {ehCodigo ? (
              <LinhaLista
                titulo={`Buscar código ${termo}`}
                subtitulo="Procurar pelo código de barras (EAN)"
                rotuloAcessivel={`Buscar código ${termo}. Procurar pelo código de barras`}
                miniatura={<Icone nome="codigoBarras" cor={cores.anil} />}
                onPress={buscarCodigo}
                divisor
              />
            ) : null}
            {resultados.length > 0 ? (
              <Texto estilo="label" cor={cores.ink3} accessibilityRole="header" style={estilos.titulo}>
                {titulo}
              </Texto>
            ) : null}
          </View>
        }
        renderItem={({ item: produto, index }) => {
          const porKg = produto.unidade === 'kg';
          return (
            <LinhaLista
              titulo={produto.nome}
              subtitulo={produto.ean ? `EAN ${produto.ean}` : porKg ? 'Por kg · informe o peso' : 'Sem código · atalho'}
              rotuloAcessivel={`Adicionar ${produto.nome}, ${falarDinheiro(produto.precoCentavos)}${porKg ? ' o quilo' : ''}`}
              miniatura={<Texto estilo="label" cor={cores.ink2}>{monograma(produto.nome)}</Texto>}
              valor={porKg ? <Texto estilo="corpoMedio" numerico accessible={false}>{`${formatarBRL(produto.precoCentavos)}/kg`}</Texto> : <Dinheiro centavos={produto.precoCentavos} accessible={false} />}
              onPress={() => escolher(produto)}
              divisor={index < resultados.length - 1}
            />
          );
        }}
        ListEmptyComponent={
          ehCodigo ? undefined : (
            <View style={estilos.vazio}>
              <Ilustra kind="busca" size={112} />
              <Texto estilo="tituloM" style={estilos.centro}>
                {`Nada encontrado para “${termo}”`}
              </Texto>
              <Texto estilo="corpo" cor={cores.ink2} style={estilos.centro}>
                Confira a grafia ou lance como valor avulso.
              </Texto>
              <Botao rotulo="Lançar valor avulso" variante="terciario" tamanho="M" larguraTotal={false} onPress={lancarAvulso} />
            </View>
          )
        }
      />

      <FolhaPeso
        produto={pesando}
        onFechar={() => setPesando(null)}
        onConfirmar={async (gramas) => {
          if (!pesando || adicionando.current) return;
          adicionando.current = true;
          try {
            if (!await adicionar(pesando, gramas)) return;
            setPesando(null);
            router.back();
          } finally { adicionando.current = false; }
        }}
      />
      <FolhaNaoEncontrado
        codigo={naoEncontrado}
        onFechar={() => setNaoEncontrado(null)}
        onVenderAvulso={lancarAvulso}
        onCadastrar={() => {
          const codigo = naoEncontrado;
          setNaoEncontrado(null);
          router.push(`/produtos/novo?ean=${codigo ?? ''}`);
        }}
      />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  caixa: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: raio.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: cores.surface,
  },
  caixaFocada: { borderColor: cores.anil },
  entrada: { flex: 1, minHeight: 52, color: cores.ink, outlineWidth: 0 },
  limpar: { backgroundColor: 'transparent' },
  titulo: { paddingTop: 16, paddingBottom: 4 },
  vazio: { alignItems: 'center', gap: 8, paddingTop: 40, paddingHorizontal: 12 },
  centro: { textAlign: 'center' },
});
