import { PLANOS, planoMinimoPara, type Centavos, type Produto } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { Interruptor } from '@/componentes/Interruptor';
import { LinhaLista } from '@/componentes/LinhaLista';
import { Segmentado } from '@/componentes/Segmentado';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { ehErroDeDominio } from '@/dados/erros';
import { useDados, useLicenca, useProdutos } from '@/dados/hooks';
import type { NovoProduto } from '@/dados/produtos';
import type { Unidade } from '@/dados/tipos';
import { confirmarNoCatalogo } from '@/servicos/catalogoEan';
import { cores, raio } from '@/tema';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { CampoPreco } from '@/componentes/CampoPreco';
import { Confirmacao } from '@/componentes/Confirmacao';
import { FolhaDePlano } from '@/componentes/FolhaDePlano';
import { lerQuantidade, planoSemLimiteDeProdutos, somenteDigitos, textoDeQuantidade } from './logica';
import { useVoltar } from '@/util/useVoltar';
import type { SugestaoDeCadastro } from './sugestao';


export interface FormularioProdutoProps {
  /** Produto em edição; sem ele, o formulário cria um novo. */
  produto?: Produto;
  sugestao?: SugestaoDeCadastro;
  /** Nasce marcado como atalho de venda. */
  atalhoInicial?: boolean;
  /** Veio do "Cadastrar bipando": oferece salvar e bipar o próximo. */
  daCamera?: boolean;
}

interface Erros {
  nome?: string;
  ean?: string;
  preco?: string;
  estoque?: string;
  minimo?: string;
}

const OPCOES_UNIDADE = [
  { valor: 'un', rotulo: 'Unidade (un)' },
  { valor: 'kg', rotulo: 'Quilo (kg)' },
] as const;

export function FormularioProduto({ produto, sugestao, atalhoInicial = false, daCamera = false }: FormularioProdutoProps) {
  const router = useRouter();
  const dadosApp = useDados();
  const saldoPorMovimentos = !!produto && dadosApp.backend.modo === 'http';
  const toast = useToast();
  const voltar = useVoltar('/produtos');
  const { produtos, criar, editar, excluir, buscarPorEan } = useProdutos();
  const { planoId, podeUsar, dentroDoLimite } = useLicenca();

  const [nome, setNome] = useState(produto?.nome ?? sugestao?.nome ?? '');
  const [ean, setEan] = useState(produto?.ean ?? sugestao?.ean ?? '');
  const [precoCentavos, setPrecoCentavos] = useState<Centavos>(produto?.precoCentavos ?? 0);
  const [unidade, setUnidade] = useState<Unidade>(produto?.unidade ?? 'un');
  const [estoque, setEstoque] = useState(produto?.estoque != null ? textoDeQuantidade(produto.estoque) : '');
  const [minimo, setMinimo] = useState(produto?.estoqueMinimo != null ? textoDeQuantidade(produto.estoqueMinimo) : '');
  const [atalho, setAtalho] = useState(produto?.atalho ?? atalhoInicial);
  const [erros, setErros] = useState<Erros>({});
  const [duplicado, setDuplicado] = useState<Produto | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [avisoLimite, setAvisoLimite] = useState(false);
  const [avisoEstoque, setAvisoEstoque] = useState(false);

  const comEstoque = podeUsar('estoque');
  const planoEstoque = PLANOS[planoMinimoPara('estoque')].nome;
  const foraDoLimite = !produto && !dentroDoLimite('produtos', produtos.length);
  const limiteProdutos = PLANOS[planoId].limites.produtos;
  const planoIlimitado = planoSemLimiteDeProdutos().nome;

  const mudarEan = (texto: string) => {
    setEan(somenteDigitos(texto));
    setErros((e) => ({ ...e, ean: undefined }));
    setDuplicado(null);
  };

  const validar = (): NovoProduto | null => {
    const novos: Erros = {};
    if (!nome.trim()) novos.nome = 'Digite o nome do produto.';
    if (ean && !/^\d{8,14}$/.test(ean)) novos.ean = 'O código tem de 8 a 14 números. Deixe vazio se o item não tem código.';
    if (precoCentavos <= 0) novos.preco = 'Digite o preço de venda.';
    const lidoEstoque = lerQuantidade(estoque);
    const lidoMinimo = lerQuantidade(minimo);
    if (comEstoque && !saldoPorMovimentos && !lidoEstoque.valida) novos.estoque = 'Use só números, com vírgula para fração (ex.: 2,5).';
    if (comEstoque && !lidoMinimo.valida) novos.minimo = 'Use só números, com vírgula para fração (ex.: 2,5).';
    setErros(novos);
    if (Object.keys(novos).length > 0) return null;

    const dados: NovoProduto = { nome: nome.trim(), ean: ean || null, precoCentavos, unidade, atalho };
    if (comEstoque) {
      if (!saldoPorMovimentos) dados.estoque = lidoEstoque.valida ? lidoEstoque.milesimos : null;
      dados.estoqueMinimo = lidoMinimo.valida ? lidoMinimo.milesimos : null;
    }
    return dados;
  };

  const salvar = async (depois: 'sair' | 'proximo') => {
    const dados = validar();
    if (!dados) return;
    setSalvando(true);
    try {
      if (produto) await editar(produto.id, dados);
      else {
        await criar(dados);
        // Alimenta o catálogo com o nome confirmado; não espera nem falha a tela.
        if (dados.ean) void confirmarNoCatalogo(dados.ean, dados.nome);
      }
      toast.mostrar(`${dados.nome} salvo`, { tipo: 'sucesso' });
      if (depois === 'proximo') voltar();
      else if (daCamera) router.dismissTo('/produtos');
      else voltar();
    } catch (erro) {
      if (ehErroDeDominio(erro, 'ean_duplicado')) {
        const existente = buscarPorEan(ean);
        setErros({ ean: `Este código já está cadastrado em “${existente?.nome ?? 'outro produto'}”.` });
        setDuplicado(existente);
      } else if (ehErroDeDominio(erro, 'limite_plano')) {
        setAvisoLimite(true);
      } else if (ehErroDeDominio(erro, 'valor_invalido')) {
        setErros({ nome: erro.message });
      } else {
        toast.mostrar('Não foi possível salvar. Tente de novo.', { tipo: 'erro' });
      }
    } finally {
      setSalvando(false);
    }
  };

  const confirmarExcluir = async () => {
    if (!produto) return;
    setSalvando(true);
    try {
      await excluir(produto.id);
      setConfirmarExclusao(false);
      toast.mostrar(`${produto.nome} excluído`);
      voltar();
    } catch {
      toast.mostrar('Não foi possível excluir. Tente de novo.', { tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  };

  const rodape = (
    <>
      {daCamera && !produto ? (
        <>
          <Botao rotulo="Salvar e bipar o próximo" icone="cadastrarBipando" carregando={salvando} onPress={() => salvar('proximo')} />
          <Botao rotulo="Salvar e sair" variante="terciario" tamanho="M" larguraTotal desabilitado={salvando} onPress={() => salvar('sair')} />
        </>
      ) : (
        <Botao rotulo="Salvar" carregando={salvando} onPress={() => salvar('sair')} />
      )}
    </>
  );

  return (
    <TelaBase rolavel bordas={['top']} rodape={rodape} style={estilos.tela}>
      <CabecalhoTela titulo={produto ? 'Editar produto' : 'Novo produto'} onVoltar={voltar} rotuloVoltar="Voltar para produtos" />

      {foraDoLimite ? (
        <Banner
          tipo="atencao"
          texto={`Seu catálogo já tem os ${limiteProdutos} produtos do plano ${PLANOS[planoId].nome}. Dá para preencher, mas só é possível salvar com o plano ${planoIlimitado}.`}
          acao={{ rotulo: `Conhecer o ${planoIlimitado}`, aoPressionar: () => router.push('/ajustes/assinatura') }}
        />
      ) : null}

      {sugestao && !produto ? (
        sugestao.origem === 'catalogo' ? (
          <View style={estilos.sugestao}>
            <Ilustra kind="produto" size={88} />
            <View style={estilos.sugestaoTexto}>
              <StatusPill tipo="pago" texto="Encontrado no catálogo" />
              <Texto estilo="corpo" cor={cores.ink2}>
                O nome já veio. Confira e informe o preço.
              </Texto>
            </View>
          </View>
        ) : sugestao.origem === 'ausente' ? (
          <Banner tipo="info" texto="Este código não teve sugestão de nome. O catálogo pode não conhecer o produto ou estar indisponível. Você pode preencher o nome e o preço para continuar." />
        ) : null
      ) : null}

      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={(t) => {
          setNome(t);
          setErros((e) => ({ ...e, nome: undefined }));
        }}
        erro={erros.nome}
        autoCapitalize="sentences"
        returnKeyType="next"
        maxLength={80}
      />

      <View style={estilos.grupo}>
        <Campo
          rotulo="Código de barras (opcional)"
          value={ean}
          onChangeText={mudarEan}
          erro={erros.ean}
          ajuda="De 8 a 14 números. Deixe vazio para itens sem código, como pão ou gelo."
          keyboardType="number-pad"
          maxLength={14}
        />
        {duplicado ? (
          <Botao
            rotulo="Abrir esse produto"
            variante="terciario"
            tamanho="S"
            onPress={() => router.replace({ pathname: '/produtos/[id]', params: { id: duplicado.id } })}
          />
        ) : null}
      </View>

      <View style={estilos.grupo}>
        <Texto estilo="label" cor={cores.ink2}>
          Vendido por
        </Texto>
        <Segmentado rotuloGrupo="Vendido por" opcoes={OPCOES_UNIDADE} valor={unidade} onChange={setUnidade} />
      </View>

      <CampoPreco
        rotulo={unidade === 'kg' ? 'Preço de venda por kg' : 'Preço de venda'}
        valorCentavos={precoCentavos}
        onChange={(v) => {
          setPrecoCentavos(v);
          setErros((e) => ({ ...e, preco: undefined }));
        }}
        erro={erros.preco}
      />

      {comEstoque ? (
        <View style={estilos.grupo}>
          {saldoPorMovimentos ? <Botao rotulo="Ver movimentos de estoque" variante="terciario" onPress={() => router.push('/gestao/estoque')} /> : null}
          <Campo
            rotulo={`Estoque atual (${unidade})`}
            editable={!saldoPorMovimentos}
            value={estoque}
            onChangeText={(t) => {
              setEstoque(t);
              setErros((e) => ({ ...e, estoque: undefined }));
            }}
            erro={erros.estoque}
            ajuda={saldoPorMovimentos ? "Último saldo confirmado. Use movimentos para registrar entradas, ajustes ou devoluções." : "Deixe vazio se não controla este item."}
            keyboardType="decimal-pad"
            maxLength={10}
          />
          <Campo
            rotulo={`Avisar quando chegar a (${unidade})`}
            value={minimo}
            onChangeText={(t) => {
              setMinimo(t);
              setErros((e) => ({ ...e, minimo: undefined }));
            }}
            erro={erros.minimo}
            ajuda="O produto aparece em “Estoque baixo” a partir deste valor."
            keyboardType="decimal-pad"
            maxLength={10}
          />
        </View>
      ) : (
        <View style={estilos.cartao}>
          <LinhaLista
            titulo="Controle de estoque"
            subtitulo={`Disponível no ${planoEstoque}`}
            rotuloAcessivel={`Controle de estoque. Disponível no ${planoEstoque}. Toque para saber mais`}
            miniatura={<Icone nome="cadeado" />}
            valor={<Icone nome="chevronDireita" tamanho={20} cor={cores.ink3} />}
            onPress={() => setAvisoEstoque(true)}
          />
        </View>
      )}

      <View style={estilos.cartaoInterruptor}>
        <Interruptor rotulo="Mostrar como atalho na venda" ligado={atalho} onChange={setAtalho} />
      </View>

      {produto ? (
        <Botao rotulo="Excluir produto" icone="lixeira" variante="perigo" tamanho="M" larguraTotal onPress={() => setConfirmarExclusao(true)} />
      ) : null}

      <Confirmacao
        visivel={confirmarExclusao}
        onFechar={() => setConfirmarExclusao(false)}
        titulo="Excluir produto?"
        texto={`“${produto?.nome ?? ''}” sai da lista e da tela de venda. As vendas que já aconteceram continuam no histórico.`}
        rotuloConfirmar="Excluir"
        perigo
        carregando={salvando}
        onConfirmar={confirmarExcluir}
      />
      <FolhaDePlano
        visivel={avisoLimite}
        onFechar={() => setAvisoLimite(false)}
        titulo="Limite de produtos"
        texto={`O plano ${PLANOS[planoId].nome} inclui ${limiteProdutos} produtos e seu catálogo já chegou lá. Nada foi apagado e as vendas seguem normais. No ${planoIlimitado} você cadastra quantos quiser.`}
        planoNome={planoIlimitado}
      />
      <FolhaDePlano
        visivel={avisoEstoque}
        onFechar={() => setAvisoEstoque(false)}
        titulo="Controle de estoque"
        texto={`Saiba quanto resta de cada item e receba aviso quando estiver acabando. Disponível a partir do plano ${planoEstoque}.`}
        planoNome={planoEstoque}
      />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 20, paddingTop: 16, paddingBottom: 24 },
  grupo: { gap: 12 },
  sugestao: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: raio.lg, backgroundColor: cores.surface },
  sugestaoTexto: { flex: 1, gap: 8 },
  cartao: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  cartaoInterruptor: { paddingLeft: 16, paddingRight: 8, borderRadius: raio.md, backgroundColor: cores.surface },
});
