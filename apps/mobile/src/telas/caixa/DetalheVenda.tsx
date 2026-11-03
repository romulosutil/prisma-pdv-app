import { formatarData } from '@pdv/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '@/componentes/Botao';
import { Dinheiro } from '@/componentes/Dinheiro';
import { StatusPill } from '@/componentes/StatusPill';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useToast } from '@/componentes/Toast';
import { useCaixa, useProdutos, useVendas } from '@/dados/hooks';
import { cores, raio } from '@/tema';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { Confirmacao } from '@/componentes/Confirmacao';
import { useVoltar } from '@/util/useVoltar';
import { falarDinheiro } from '@/util/dinheiroFalado';
import { rotuloDoMeio } from '@/util/meios';
import { PROVEDORES } from '@/util/provedores';
import { formatarHora } from '@/util/tempo';
import { formatarQuantidade } from './logica';
import { LinhaValor } from './LinhaValor';

export function DetalheVenda() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const voltar = useVoltar('/caixa/vendas');
  const { vendas, numeroDe, cancelar } = useVendas();
  const { historico } = useCaixa();
  const { buscarPorId } = useProdutos();
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const venda = vendas.find((v) => v.id === id);
  if (!venda) {
    return (
      <TelaBase bordas={['top']} style={estilos.tela}>
        <CabecalhoTela titulo="Venda" onVoltar={voltar} rotuloVoltar="Voltar para as vendas" />
        <Texto estilo="corpoL" cor={cores.ink2}>
          Não encontramos esta venda.
        </Texto>
      </TelaBase>
    );
  }

  const numero = numeroDe(venda);
  const quando = new Date(venda.criadaEm);
  const paga = venda.status === 'concluida';
  const caixaDaVenda = historico.find((c) => c.id === venda.caixaId);

  const confirmarCancelamento = async () => {
    setCancelando(true);
    try {
      await cancelar(venda.id);
      setConfirmando(false);
      toast.mostrar(`Venda ${numero} cancelada`);
    } catch {
      toast.mostrar('Não foi possível cancelar. Tente de novo.', { tipo: 'erro' });
    } finally {
      setCancelando(false);
    }
  };

  return (
    <TelaBase rolavel bordas={['top']} style={estilos.tela}>
      <CabecalhoTela titulo={`Venda ${numero}`} onVoltar={voltar} rotuloVoltar="Voltar para as vendas" />

      <View style={estilos.resumo}>
        <StatusPill tipo={paga ? venda.fiado ? 'pendente' : 'pago' : 'cancelado'} texto={paga && venda.fiado ? 'Venda com fiado' : undefined} />
        <Texto estilo="corpo" cor={cores.ink2} numerico>
          {`${formatarData(quando)} às ${formatarHora(quando)}`}
        </Texto>
        <Dinheiro centavos={venda.totalCentavos} estilo="display" cor={paga ? cores.ink : cores.ink2} style={paga ? undefined : estilos.riscado} />
        <Texto estilo="legenda" cor={cores.ink3}>{venda.caixaId ? `Caixa vinculado: ${venda.caixaId}` : 'Venda sem vínculo com caixa. Não associada por estimativa de horário.'}</Texto>
      </View>

      {venda.cancelamento ? (
        <View style={estilos.secao}>
          <Texto estilo="tituloM" accessibilityRole="header">Registro do cancelamento</Texto>
          <Texto estilo="corpo">{venda.cancelamento.motivo}</Texto>
          <Texto estilo="legenda">{`${formatarData(new Date(venda.cancelamento.em))} às ${formatarHora(new Date(venda.cancelamento.em))}`}</Texto>
          <Texto estilo="legenda">{`Operador: ${venda.cancelamento.operadorId}`}</Texto>
          <Texto estilo="legenda">{`Registro: ${venda.cancelamento.id}`}</Texto>
          <Texto estilo="corpo" cor={cores.ink2}>Cancelamento comercial registrado. Estorno bancário não realizado pelo app.</Texto>
          {caixaDaVenda?.fechamento ? <Texto estilo="legenda" cor={cores.ink2}>O fechamento histórico deste caixa permanece preservado.</Texto> : null}
        </View>
      ) : !paga ? <Texto estilo="legenda" cor={cores.ink2}>Cancelamento legado sem evento detalhado. Nenhum estorno bancário é confirmado pelo app.</Texto> : null}

      <View style={estilos.secao}>
        <Texto estilo="tituloM" accessibilityRole="header">
          Itens
        </Texto>
        <View style={estilos.cartao}>
          {venda.itens.map((item, i) => {
            const quantidade = formatarQuantidade(item.quantidadeMilesimos, item.produtoId ? buscarPorId(item.produtoId)?.unidade : undefined);
            return (
              <LinhaValor
                key={item.id}
                rotulo={`${quantidade} ${item.descricao}`}
                centavos={item.totalCentavos}
                rotuloAcessivel={`${quantidade} ${item.descricao}: ${falarDinheiro(item.totalCentavos)}`}
                divisor={i > 0}
              />
            );
          })}
        </View>
      </View>

      {venda.fiado ? <View style={estilos.secao}><Texto estilo="tituloM">Fiado</Texto><LinhaValor rotulo={`Crédito original · vence ${venda.fiado.vencimento}`} centavos={venda.fiado.valorCentavos} /><Texto>Consulte Clientes e fiado para o saldo atualizado e os recebimentos posteriores.</Texto></View> : null}
      <View style={estilos.secao}>
        <Texto estilo="tituloM" accessibilityRole="header">
          Pagamento
        </Texto>
        <View style={estilos.cartao}>
          {venda.pagamentos.flatMap((pagamento, i) => {
            const provedor = PROVEDORES.find((p) => p.id === pagamento.provedor)?.nome;
            const linhas = [
              <LinhaValor
                key={pagamento.id}
                rotulo={`${rotuloDoMeio(pagamento.meio)}${provedor ? ` · ${provedor}` : ''}`}
                centavos={pagamento.valorCentavos}
                divisor={i > 0}
              />,
            ];
            if (pagamento.trocoCentavos > 0) linhas.push(<LinhaValor key={`${pagamento.id}-troco`} rotulo="Troco devolvido" centavos={pagamento.trocoCentavos} divisor />);
            return linhas;
          })}
        </View>
      </View>

      {paga ? (
        <Botao rotulo="Cancelar venda" variante="perigo" tamanho="M" larguraTotal accessibilityHint="Pede confirmação antes de cancelar" onPress={() => setConfirmando(true)} />
      ) : null}

      <Confirmacao
        visivel={confirmando}
        onFechar={() => setConfirmando(false)}
        titulo="Cancelar esta venda?"
        texto={`A venda ${numero} de ${falarDinheiro(venda.totalCentavos)} será cancelada comercialmente. ${caixaDaVenda?.fechamento ? 'O fechamento já salvo será preservado e o cancelamento ficará registrado separadamente.' : 'O total do dia e a gaveta do caixa aberto serão atualizados.'} O app não realiza estorno no banco ou na maquininha. Isso não pode ser desfeito.`}
        rotuloConfirmar="Cancelar venda"
        perigo
        carregando={cancelando}
        onConfirmar={confirmarCancelamento}
      />
    </TelaBase>
  );
}

const estilos = StyleSheet.create({
  tela: { gap: 20, paddingTop: 16, paddingBottom: 32 },
  resumo: { gap: 8 },
  secao: { gap: 8 },
  cartao: { paddingHorizontal: 16, borderRadius: raio.md, backgroundColor: cores.surface },
  riscado: { textDecorationLine: 'line-through' },
});
