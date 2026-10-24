import type { Centavos, Produto } from '@pdv/shared';
import { useIsFocused, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { Campo } from '@/componentes/Campo';
import { Ilustra } from '@/componentes/Ilustra';
import { Scanner } from '@/componentes/Scanner';
import { StatusPill } from '@/componentes/StatusPill';
import { Stepper } from '@/componentes/Stepper';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { ehErroDeDominio } from '@/dados/erros';
import { useLicenca, useProdutos } from '@/dados/hooks';
import { buscarNoCatalogo } from '@/servicos/catalogoEan';
import { cores } from '@/tema';
import { EntradaDeValor } from '@/componentes/EntradaDeValor';
import { formatarEstoque, somenteDigitos } from './logica';
import { useVoltar } from '@/util/useVoltar';

interface Lido {
  ean: string;
  /** Produto já cadastrado com este código; `null` quando é novo. */
  produto: Produto | null;
  nomeSugerido: string;
}

/**
 * Cadastro em sequência para montar o catálogo: bipa, dá o preço, salva e já está pronto para o
 * próximo. Código já cadastrado só atualiza preço (e entrada de estoque).
 */
export function CadastroRapido() {
  const toast = useToast();
  const voltar = useVoltar('/produtos');
  const focada = useIsFocused();
  const { buscarPorEan } = useProdutos();
  const [lido, setLido] = useState<Lido | null>(null);

  const ler = useCallback(
    (codigo: string) => {
      const ean = somenteDigitos(codigo);
      if (!/^\d{8,14}$/.test(ean)) {
        toast.mostrar('Esse não parece um código de barras de produto.', { tipo: 'erro' });
        return;
      }
      const catalogo = buscarNoCatalogo(ean);
      setLido({ ean, produto: buscarPorEan(ean), nomeSugerido: catalogo.achou ? catalogo.nome : '' });
    },
    [buscarPorEan, toast],
  );

  return (
    <TelaBase bordas={['top']} semMargem>
      <Scanner onLer={ler} pausado={!focada || lido !== null} onFechar={voltar} titulo="Cadastro rápido" />
      <BottomSheet visivel={lido !== null} onFechar={() => setLido(null)} titulo={lido?.produto ? 'Atualizar produto' : 'Novo produto'}>
        {lido ? <FolhaRapida key={lido.ean} lido={lido} onConcluir={() => setLido(null)} /> : null}
      </BottomSheet>
    </TelaBase>
  );
}

function FolhaRapida({ lido, onConcluir }: { lido: Lido; onConcluir: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { criar, editar } = useProdutos();
  const { podeUsar } = useLicenca();
  const { produto } = lido;
  const comEstoque = podeUsar('estoque');

  const [nome, setNome] = useState(lido.nomeSugerido);
  const [preco, setPreco] = useState<Centavos>(produto?.precoCentavos ?? 0);
  const [entrada, setEntrada] = useState(0);
  const [erros, setErros] = useState<{ nome?: string; preco?: string }>({});
  const [salvando, setSalvando] = useState(false);

  const unidade = produto?.unidade ?? 'un';
  const estoqueAntes = produto?.estoque ?? 0;
  const estoqueDepois = estoqueAntes + entrada * 1000;

  const salvar = async () => {
    const novos: typeof erros = {};
    if (!produto && !nome.trim()) novos.nome = 'Digite o nome do produto.';
    if (preco <= 0) novos.preco = 'Digite o preço de venda.';
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setSalvando(true);
    try {
      if (produto) {
        await editar(produto.id, { precoCentavos: preco, ...(comEstoque && entrada > 0 ? { estoque: estoqueDepois } : {}) });
        toast.mostrar(`${produto.nome} atualizado`, { tipo: 'sucesso' });
      } else {
        await criar({ nome: nome.trim(), ean: lido.ean, precoCentavos: preco, ...(comEstoque && entrada > 0 ? { estoque: entrada * 1000 } : {}) });
        toast.mostrar(`${nome.trim()} cadastrado. Bipe o próximo.`, { tipo: 'sucesso' });
      }
      onConcluir();
    } catch (erro) {
      if (ehErroDeDominio(erro, 'limite_plano')) {
        onConcluir();
        toast.mostrar('Seu plano chegou ao limite de produtos.', {
          tipo: 'erro',
          acao: { rotulo: 'Ver planos', aoPressionar: () => router.push('/ajustes/assinatura') },
        });
      } else if (ehErroDeDominio(erro, 'valor_invalido')) {
        setErros({ nome: erro.message });
      } else {
        toast.mostrar('Não foi possível salvar. Tente de novo.', { tipo: 'erro' });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <View style={estilos.cabecalho}>
        <Ilustra kind="produto" size={56} />
        <View style={estilos.identificacao}>
          {produto ? (
            <Texto estilo="tituloM" numberOfLines={2}>
              {produto.nome}
            </Texto>
          ) : null}
          <Texto estilo="legenda" cor={cores.ink3} numerico>
            {`Código ${lido.ean}`}
          </Texto>
          {produto ? <StatusPill tipo="pago" texto="Já cadastrado" /> : null}
        </View>
      </View>

      {produto ? null : (
        <Campo
          rotulo="Nome"
          value={nome}
          onChangeText={(t) => {
            setNome(t);
            setErros((e) => ({ ...e, nome: undefined }));
          }}
          erro={erros.nome}
          maxLength={80}
          ajuda={lido.nomeSugerido ? 'Nome encontrado no catálogo. Confira.' : 'Código fora do catálogo: digite o nome.'}
        />
      )}

      <EntradaDeValor
        rotulo="Preço de venda"
        valorCentavos={preco}
        onChange={(v) => {
          setPreco(v);
          setErros((e) => ({ ...e, preco: undefined }));
        }}
        erro={erros.preco}
      />

      {comEstoque ? (
        <View style={estilos.estoque}>
          <Texto estilo="label" cor={cores.ink2}>
            {produto ? 'Entrada de estoque' : 'Estoque inicial'}
          </Texto>
          <Stepper valor={entrada} onChange={setEntrada} minimo={0} atalhoMais5 rotulo={produto ? 'Entrada de estoque' : 'Estoque inicial'} />
          {produto ? (
            <Texto estilo="corpoMedio" numerico accessibilityLiveRegion="polite" cor={entrada > 0 ? cores.folha : cores.ink2}>
              {`Estoque ${formatarEstoque(estoqueAntes, unidade)} → ${formatarEstoque(estoqueDepois, unidade)}`}
            </Texto>
          ) : null}
        </View>
      ) : null}

      <Botao rotulo={produto ? 'Salvar' : 'Cadastrar'} carregando={salvando} onPress={salvar} />
    </>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identificacao: { flex: 1, gap: 4 },
  estoque: { gap: 8 },
});
