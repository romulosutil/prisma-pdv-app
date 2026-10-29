import { formatarBRL, somar, type Venda } from '@pdv/shared';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { Icone } from '@/componentes/Icone';
import { Ilustra } from '@/componentes/Ilustra';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { formatarPeso, useCarrinho } from '@/dados/carrinho';
import { useConta, useProdutos, useVendas } from '@/dados/hooks';
import { cores, legendaForte, raio } from '@/tema';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { iconeDoMeio } from '@/util/meios';
import { formatarHora } from '@/util/tempo';
import { rotuloDaParcela } from './rotulos';

const OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000;
const dois = (n: number): string => String(n).padStart(2, '0');

/** "23/10/2026 18:42", no relógio de Brasília. */
function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const b = new Date(d.getTime() + OFFSET_BRASILIA_MS);
  return `${dois(b.getUTCDate())}/${dois(b.getUTCMonth() + 1)}/${b.getUTCFullYear()} ${formatarHora(d)}`;
}

export function TelaSucesso() {
  const router = useRouter();
  const toast = useToast();
  const { venda: vendaId } = useLocalSearchParams<{ venda?: string }>();
  const { vendas, numeroDe } = useVendas();
  const { buscarPorId } = useProdutos();
  const { nomeLoja } = useConta();
  const { limpar } = useCarrinho();
  const [reciboAberto, setReciboAberto] = useState(false);

  const venda = vendas.find((v) => v.id === vendaId);
  const troco = venda ? somar(...venda.pagamentos.map((p) => p.trocoCentavos)) : 0;

  const novaVenda = useCallback(async () => {
    try { await limpar(); router.dismissTo('/vender'); }
    catch (erro) { toast.mostrar(erro instanceof Error ? erro.message : 'Não foi possível abrir uma nova venda.', { tipo: 'erro' }); }
  }, [limpar, router, toast]);

  // A venda já foi gravada: voltar para a cobrança poderia registrá-la de novo.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => {
      novaVenda();
      return true;
    });
    return () => assinatura.remove();
  }, [novaVenda]);

  const totalCentavos = venda?.totalCentavos;
  useEffect(() => {
    if (totalCentavos === undefined) return;
    AccessibilityInfo.announceForAccessibility(`Venda concluída, ${falarDinheiro(totalCentavos)}${troco > 0 ? `. Troco ${falarDinheiro(troco)}` : ''}`);
  }, [totalCentavos, troco]);

  if (!venda) return <Redirect href="/" />;

  const unico = venda.pagamentos.length === 1 ? venda.pagamentos[0] : undefined;
  const meio = unico ? rotuloDaParcela(unico) : `Dividido em ${venda.pagamentos.length}`;
  const quantidade = (item: Venda['itens'][number]): string =>
    buscarPorId(item.produtoId ?? '')?.unidade === 'kg' ? formatarPeso(item.quantidadeMilesimos) : `${Math.round(item.quantidadeMilesimos / 1000)}×`;
  const unidades = venda.itens.reduce((soma, i) => soma + (buscarPorId(i.produtoId ?? '')?.unidade === 'kg' ? 1 : Math.round(i.quantidadeMilesimos / 1000)), 0);

  return (
    <TelaBase rolavel rodape={<Botao rotulo="Nova venda" onPress={novaVenda} />}>
      <View style={estilos.conteudo}>
        <View style={estilos.topo}>
          <Ilustra kind="check" size={128} />
          <Texto estilo="tituloXL" accessibilityRole="header">
            Venda concluída
          </Texto>
          <Dinheiro centavos={venda.totalCentavos} estilo="display" />
          <View style={estilos.pilulas}>
            <StatusPill tipo="pago" />
            <View accessible accessibilityLabel={`Forma de pagamento: ${meio}`} style={estilos.pilulaMeio}>
              <Icone nome={unico ? iconeDoMeio(unico.meio) : 'dividir'} tamanho={14} espessura={2.5} />
              <Texto style={legendaForte} numerico>
                {meio}
              </Texto>
            </View>
          </View>
        </View>

        {troco > 0 ? (
          <View accessible accessibilityLabel={`Troco: ${falarDinheiro(troco)}`} style={estilos.troco}>
            <Icone nome="dinheiro" cor={cores.folha} />
            <Texto estilo="tituloL" numerico cor={cores.folha}>{`Troco ${formatarBRL(troco)}`}</Texto>
          </View>
        ) : null}

        <Botao
          rotulo={reciboAberto ? 'Ocultar recibo' : 'Ver recibo'}
          icone="recibo"
          variante="terciario"
          tamanho="M"
          larguraTotal
          accessibilityHint={reciboAberto ? undefined : 'Mostra os itens e as formas de pagamento'}
          onPress={() => setReciboAberto((aberto) => !aberto)}
        />

        {reciboAberto ? (
          <View accessibilityLabel="Recibo" style={estilos.recibo}>
            <View>
              <Texto estilo="tituloM">{nomeLoja}</Texto>
              <Texto estilo="legenda" cor={cores.ink3} numerico>{`${numeroDe(venda)} · ${formatarDataHora(venda.criadaEm)}`}</Texto>
            </View>
            <View style={estilos.itensDoRecibo}>
              {venda.itens.map((item) => (
                <View key={item.id} accessible accessibilityLabel={`${item.descricao}, ${quantidade(item)}, ${falarDinheiro(item.totalCentavos)}`} style={estilos.linha}>
                  <Texto estilo="corpo" numerico style={estilos.descricao}>{`${quantidade(item)} ${item.descricao}`}</Texto>
                  <Dinheiro centavos={item.totalCentavos} estilo="corpo" accessible={false} />
                </View>
              ))}
            </View>
            <View style={estilos.linha}>
              <Texto estilo="tituloM">{unidades === 1 ? 'Total · 1 item' : `Total · ${unidades} itens`}</Texto>
              <Dinheiro centavos={venda.totalCentavos} estilo="tituloM" />
            </View>
            <View style={estilos.formas}>
              <Texto estilo="label" cor={cores.ink3}>
                Forma de pagamento
              </Texto>
              {venda.pagamentos.map((p) => (
                <View key={p.id} style={estilos.linha}>
                  <Texto estilo="corpo">{p.trocoCentavos > 0 ? 'Dinheiro recebido' : rotuloDaParcela(p)}</Texto>
                  <Dinheiro centavos={p.valorCentavos + p.trocoCentavos} estilo="corpo" />
                </View>
              ))}
              {troco > 0 ? (
                <View style={estilos.linha}>
                  <Texto estilo="corpo">Troco</Texto>
                  <Dinheiro centavos={troco} estilo="corpo" />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  conteudo: { gap: 16, paddingTop: 16, paddingBottom: 8 },
  topo: { alignItems: 'center', gap: 8 },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  pilulaMeio: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: cores.surface },
  troco: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.folhaSoft },
  recibo: { gap: 12, padding: 20, borderRadius: raio.lg, backgroundColor: cores.surface },
  itensDoRecibo: { gap: 6, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: cores.ink3 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  descricao: { flex: 1 },
  formas: { gap: 4 },
});
