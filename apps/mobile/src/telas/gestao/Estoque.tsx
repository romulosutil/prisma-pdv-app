import { ListaPaginada } from '@/componentes/ListaPaginada';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { z } from 'zod';
import { EstoqueResSchema } from '@pdv/shared';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Segmentado } from '@/componentes/Segmentado';
import { Texto } from '@/componentes/Texto';
import { TelaGestao, useGestao } from './comum';

const TIPOS = [{ valor: 'entrada', rotulo: 'Entrada' }, { valor: 'ajuste', rotulo: 'Ajuste' }, { valor: 'devolucao', rotulo: 'Devolução' }] as const;
export function Estoque() {
  const g = useGestao(), { dados, token, mesmoPerfil } = g;
  const [estado, setEstado] = useState<z.infer<typeof EstoqueResSchema>>({ saldos: [], movimentos: [] });
  const [produtoId, selecionar] = useState(''), [tipo, setTipo] = useState<typeof TIPOS[number]['valor']>('entrada');
  const [quantidade, setQuantidade] = useState(''), [motivo, setMotivo] = useState(''), [itemVendaId, setItem] = useState('');
  const atualizar = useCallback(async () => {
    if (!dados.backend.obterEstoque || !token) return;
    const r = await dados.backend.obterEstoque(token); if (mesmoPerfil()) setEstado(r);
  }, [dados, token, mesmoPerfil]);
  useEffect(() => { void g.executar(atualizar); }, [atualizar]);
  const salvar = () => g.executar(async () => {
    await dados.operacaoGestaoOnline('estoque', { produtoId, tipo, quantidadeMilesimos: Math.round(Number(quantidade.replace(',', '.')) * 1000), motivo, ...(tipo === 'devolucao' ? { itemVendaId } : {}) });
    setQuantidade(''); setMotivo(''); await atualizar();
  }, 'Movimento registrado.');
  return <TelaGestao titulo="Estoque da loja" estado={g} atualizar={atualizar}>
    <Texto estilo="corpo">O saldo pode ficar negativo quando vendas offline disputam as últimas unidades. Confira os movimentos e registre um ajuste com motivo após contar o estoque físico. Cancelar a venda não comprova retorno do produto.</Texto>
    {!estado.saldos.length ? <Texto>Nenhum produto confirmado. Cadastre e sincronize primeiro.</Texto> : null}
    <ListaPaginada itens={estado.saldos} renderizar={p => <View key={p.produtoId} style={{ gap: 8 }}>
      <Botao rotulo={`${produtoId === p.produtoId ? 'Selecionado: ' : ''}${p.nome}`} variante="terciario" onPress={() => selecionar(p.produtoId)} desabilitado={g.ocupado} />
      <Texto>{`Saldo: ${p.saldoMilesimos === null ? 'Sem controle' : (p.saldoMilesimos / 1000).toLocaleString('pt-BR')}${p.negativo ? ' · DIVERGÊNCIA: estoque negativo' : ''}${p.minimoMilesimos !== null && p.saldoMilesimos !== null && p.saldoMilesimos <= p.minimoMilesimos ? ' · Estoque baixo' : ''}`}</Texto>
    </View>} />
    {dados.pode('cadastrar_produto') && produtoId ? <>
      <Texto estilo="tituloM">Novo movimento</Texto>
      <Segmentado rotuloGrupo="Tipo de movimento" opcoes={TIPOS} valor={tipo} onChange={setTipo} />
      <Campo rotulo="Quantidade em un ou kg" value={quantidade} onChangeText={setQuantidade} keyboardType="numbers-and-punctuation" ajuda="Entrada e devolução: positivo. Ajuste: diferença positiva ou negativa, nunca o saldo final." />
      <Campo rotulo="Motivo do movimento" value={motivo} onChangeText={setMotivo} />
      {tipo === 'devolucao' ? <Campo rotulo="Identificador do item vendido" value={itemVendaId} onChangeText={setItem} autoCapitalize="none" ajuda="Copie o item na venda ou selecione uma baixa abaixo. A devolução financeira é registrada separadamente." /> : null}
      <Botao rotulo="Registrar movimento" carregando={g.ocupado} onPress={() => void salvar()} />
    </> : null}
    <Texto estilo="tituloM">Histórico de movimentos</Texto>
    <ListaPaginada itens={estado.movimentos.filter(m => !produtoId || m.produtoId === produtoId).slice().reverse()} renderizar={m => <View key={m.id} style={{ gap: 6, paddingVertical: 8 }}>
      <Texto selectable>{`${m.tipo}: ${m.quantidadeMilesimos / 1000} · ${m.motivo}`}</Texto>
      <Texto estilo="legenda" selectable>{`${m.criadoEm} · Autor: ${m.operadorId ?? 'Legado sem autoria'} · ID: ${m.id}`}</Texto>
      {m.tipo === 'venda' && m.itemVendaId ? <Botao rotulo="Devolver este item" variante="terciario" tamanho="S" onPress={() => { selecionar(m.produtoId); setItem(m.itemVendaId!); setTipo('devolucao'); }} /> : null}
    </View>} />
  </TelaGestao>;
}
