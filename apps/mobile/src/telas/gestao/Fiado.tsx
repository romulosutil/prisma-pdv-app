import { ListaPaginada } from '@/componentes/ListaPaginada';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatarBRL, multiplicarPreco, type FiadoRes } from '@pdv/shared';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { CampoPreco } from '@/componentes/CampoPreco';
import { Confirmacao } from '@/componentes/Confirmacao';
import { Texto } from '@/componentes/Texto';
import { useCaixa, useProdutos, useVendas } from '@/dados/hooks';
import type { ItemNovaVenda } from '@/dados/vendas';
import { dataDigitada } from './datas';
import { TelaGestao, useGestao } from './comum';

const MEIOS = [{ valor: 'dinheiro', rotulo: 'Dinheiro' }, { valor: 'pix', rotulo: 'Pix confirmado' }, { valor: 'cartao_credito', rotulo: 'Crédito manual' }, { valor: 'cartao_debito', rotulo: 'Débito manual' }] as const;
export function Fiado() {
  const g = useGestao(), { dados, token, mesmoPerfil } = g, { produtos } = useProdutos(), { caixa } = useCaixa(), { vendas } = useVendas();
  const [estado, setEstado] = useState<FiadoRes>({ clientes: [], titulos: [], eventos: [] });
  const [nome, setNome] = useState(''), [contato, setContato] = useState(''), [clienteId, setCliente] = useState('');
  const [itens, setItens] = useState<ItemNovaVenda[]>([]), [quantidade, setQuantidade] = useState('1'), [vencimento, setVencimento] = useState('');
  const [entrada, setEntrada] = useState(0), [valor, setValor] = useState(0), [meio, setMeio] = useState<typeof MEIOS[number]['valor']>('dinheiro');
  const [vendaId, setVenda] = useState(''), [motivo, setMotivo] = useState(''), [confirmacao, setConfirmacao] = useState<{ tipo: 'venda' | 'receber' | 'cancelar' | 'estornar'; id?: string } | null>(null);
  const atualizar = useCallback(async () => {
    if (!dados.backend.obterFiado || !token) return;
    const r = await dados.backend.obterFiado(token); if (mesmoPerfil()) setEstado(r);
  }, [dados, token, mesmoPerfil]);
  useEffect(() => { void g.executar(atualizar); }, [atualizar]);
  const total = itens.reduce((s, i) => s + multiplicarPreco(i.precoUnitarioCentavos, i.quantidadeMilesimos), 0);
  const titulo = estado.titulos.find(t => t.vendaId === vendaId);
  const nomeCliente = (id: string) => estado.clientes.find(c => c.id === id)?.nome ?? 'Cliente';
  const registrar = () => g.executar(async () => {
    if (!confirmacao) return;
    if (confirmacao.tipo === 'venda') {
      if (!clienteId || !itens.length || entrada >= total) throw new Error('Selecione cliente, itens e um saldo a receber.');
      await dados.registrarFiado({ itens, pagamentos: entrada ? [{ meio, valorCentavos: entrada }] : [], fiado: { clienteId, vencimento: dataDigitada(vencimento), valorCentavos: total - entrada } });
      setItens([]); setEntrada(0); setConfirmacao(null);
      await dados.sincronizacao.sincronizar({ forcar: true });
    } else if (confirmacao.tipo === 'receber') {
      await dados.operacaoGestaoOnline('recebimento', { vendaId, valorCentavos: valor, meio, caixaId: caixa?.id ?? null, motivo });
      setValor(0);
    } else if (confirmacao.tipo === 'estornar') {
      await dados.operacaoGestaoOnline('estorno', { recebimentoId: confirmacao.id, caixaId: caixa?.id ?? null, motivo });
    } else {
      await dados.vendas.cancelar(vendaId, motivo);
      await dados.sincronizacao.sincronizar({ forcar: true });
    }
    setConfirmacao(null); await atualizar();
  }, 'Registro salvo. Confira o saldo confirmado e as pendências de sincronização.');
  return <TelaGestao titulo="Clientes e fiado" estado={g} atualizar={atualizar}>
    <Texto>Vender fiado registra a venda e o saldo a receber. Dinheiro só entra no turno quando é recebido. Pix e cartão são registros manuais de valores já confirmados fora do app.</Texto>
    <Texto estilo="tituloM">Clientes da loja</Texto>
    <Campo rotulo="Nome do cliente" value={nome} onChangeText={setNome} maxLength={150} />
    <Campo rotulo="Contato (opcional)" value={contato} onChangeText={setContato} maxLength={150} />
    <Botao rotulo="Cadastrar cliente" variante="terciario" carregando={g.ocupado} onPress={() => void g.executar(async () => { await dados.operacaoGestaoOnline('cliente', { nome, contato }); setNome(''); setContato(''); await atualizar(); }, 'Cliente cadastrado.')} />
    <ListaPaginada itens={estado.clientes} renderizar={c => <Botao key={c.id} rotulo={`${clienteId === c.id ? 'Selecionado: ' : ''}${c.nome}${c.contato ? ` · ${c.contato}` : ''}`} variante="terciario" tamanho="M" onPress={() => setCliente(c.id)} />} />
    <Texto estilo="tituloM">Nova venda fiada</Texto>
    <Campo rotulo="Quantidade do próximo item (un ou kg)" value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad" />
    <ListaPaginada itens={produtos} renderizar={p => <Botao key={p.id} rotulo={`Adicionar ${p.nome} · ${formatarBRL(p.precoCentavos)}/${p.unidade}`} variante="terciario" tamanho="M" onPress={() => {
      const q = Math.round(Number(quantidade.replace(',', '.')) * 1000);
      if (Number.isSafeInteger(q) && q > 0) setItens(atual => [...atual, { produtoId: p.id, descricao: p.nome, precoUnitarioCentavos: p.precoCentavos, quantidadeMilesimos: q }]);
    }} />} />
    <ListaPaginada itens={itens} renderizar={(i, n) => <Texto key={n}>{`${i.quantidadeMilesimos / 1000} × ${i.descricao}: ${formatarBRL(multiplicarPreco(i.precoUnitarioCentavos, i.quantidadeMilesimos))}`}</Texto>} />
    {itens.length ? <Botao rotulo="Limpar itens desta venda" variante="terciario" tamanho="M" onPress={() => setItens([])} /> : null}
    <Texto>{`Total: ${formatarBRL(total)} · Saldo a receber: ${formatarBRL(Math.max(0, total - entrada))}`}</Texto>
    <Campo rotulo="Vencimento (DD/MM/AAAA)" value={vencimento} onChangeText={setVencimento} placeholder="30/11/2026" />
    <CampoPreco rotulo="Entrada recebida agora (opcional)" valorCentavos={entrada} onChange={setEntrada} />
    <Texto estilo="label">Meio da entrada ou do recebimento abaixo</Texto>
    {MEIOS.map(m => <Botao key={m.valor} rotulo={`${meio === m.valor ? 'Selecionado: ' : ''}${m.rotulo}`} variante="terciario" tamanho="M" onPress={() => setMeio(m.valor)} />)}
    <Botao rotulo="Registrar venda fiada" carregando={g.ocupado} desabilitado={!itens.length || !clienteId || entrada >= total} onPress={() => setConfirmacao({ tipo: 'venda' })} />
    <Texto estilo="tituloM">Saldos e vencimentos</Texto>
    <Texto>{`Saldo confirmado: ${formatarBRL(estado.titulos.reduce((s,t) => s + t.saldoCentavos, 0))}`}</Texto>
    <ListaPaginada itens={vendas.filter(v => v.fiado && !estado.titulos.some(t => t.vendaId === v.id))} renderizar={v => <Texto key={v.id}>Venda fiada local aguardando confirmação: {formatarBRL(v.fiado!.valorCentavos)}. Consulte a sincronização antes de receber.</Texto>} />
    <ListaPaginada itens={estado.titulos} renderizar={t => <View key={t.vendaId} style={{ gap: 6 }}>
      <Botao rotulo={`${vendaId === t.vendaId ? 'Selecionado: ' : ''}${nomeCliente(t.clienteId)} · ${formatarBRL(t.saldoCentavos)} · ${t.cancelado ? 'Cancelado' : t.vencido ? 'Vencido' : t.saldoCentavos ? 'Em aberto' : 'Quitado'}`} variante="terciario" onPress={() => setVenda(t.vendaId)} />
      <Texto>{`Vence ${t.vencimento} · Crédito original ${formatarBRL(t.valorCentavos)} · Recebido ${formatarBRL(t.recebidoCentavos)}`}</Texto>
    </View>} />
    {titulo ? <>
      <CampoPreco rotulo="Valor recebido agora" valorCentavos={valor} onChange={setValor} />
      <Campo rotulo="Motivo ou observação do recebimento/correção" value={motivo} onChangeText={setMotivo} />
      <Texto>{meio === 'dinheiro' ? caixa ? 'O dinheiro será registrado no seu turno aberto.' : 'Abra seu turno antes de receber dinheiro.' : 'Confirme o crédito no banco ou maquininha antes de registrar.'}</Texto>
      <Botao rotulo="Registrar recebimento parcial ou total" carregando={g.ocupado} desabilitado={titulo.cancelado || !valor || valor > titulo.saldoCentavos || (meio === 'dinheiro' && !caixa)} onPress={() => setConfirmacao({ tipo: 'receber' })} />
      {!titulo.cancelado && !titulo.recebidoCentavos && dados.pode('cancelar_venda') ? <Botao rotulo="Cancelar venda e saldo a receber" variante="perigo" onPress={() => setConfirmacao({ tipo: 'cancelar' })} /> : null}
      <Texto estilo="tituloM">Histórico deste fiado</Texto>
      <ListaPaginada itens={estado.eventos.filter(e => e.vendaId === titulo.vendaId)} renderizar={e => <View key={e.id} style={{ gap: 6 }}>
        <Texto>{`${e.tipo} · ${formatarBRL(e.valorCentavos)} · ${e.meio} · ${e.motivo} · ${e.criadoEm}`}</Texto>
        {e.tipo === 'recebimento' && !estado.eventos.some(x => x.originalId === e.id) && dados.pode('cancelar_venda') ? <Botao rotulo={`Registrar devolução de ${formatarBRL(e.valorCentavos)}`} variante="perigo" tamanho="M" onPress={() => setConfirmacao({ tipo: 'estornar', id: e.id })} /> : null}
      </View>} />
    </> : null}
    <Confirmacao visivel={!!confirmacao} onFechar={() => setConfirmacao(null)} titulo={confirmacao?.tipo === 'venda' ? 'Confirmar venda fiada' : confirmacao?.tipo === 'receber' ? 'Confirmar recebimento' : 'Confirmar correção'}
      texto={confirmacao?.tipo === 'venda' ? `${nomeCliente(clienteId)}: venda de ${formatarBRL(total)}, entrada de ${formatarBRL(entrada)} já recebida e fiado de ${formatarBRL(total - entrada)}. Confira o vencimento. A venda ficará neste perfil até a sincronização.` : confirmacao?.tipo === 'receber' ? `Confirme que recebeu ${formatarBRL(valor)} por ${meio}. Em dinheiro, o valor pertence ao turno que está aberto neste aparelho.` : confirmacao?.tipo === 'cancelar' ? 'Cancelar a venda também zera a dívida. Entrada já recebida não é devolvida automaticamente. Registre a devolução financeira e o retorno de mercadoria separadamente.' : 'Confirme que devolveu integralmente o recebimento ao cliente. Dinheiro sai do seu turno atual. Para Pix/cartão, realize e confira o estorno externo primeiro. O saldo devedor será reaberto e o evento original será preservado.'}
      rotuloConfirmar="Confirmar registro" perigo={confirmacao?.tipo === 'cancelar' || confirmacao?.tipo === 'estornar'} carregando={g.ocupado} onConfirmar={() => void registrar()} />
  </TelaGestao>;
}
