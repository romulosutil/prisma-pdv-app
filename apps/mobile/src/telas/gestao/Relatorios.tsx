import { ListaPaginada } from '@/componentes/ListaPaginada';
import { useCallback, useEffect, useState } from 'react';
import { csvRelatorio, formatarBRL, ROTULOS_RELATORIO, type OpcoesRelatorio, type Relatorio } from '@pdv/shared';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Texto } from '@/componentes/Texto';
import { compartilharCsv } from '@/telas/caixa/compartilhar';
import { textoData, intervaloDatas } from './datas';
import { TelaGestao, useGestao } from './comum';

const MEIOS = [{ valor: '', rotulo: 'Todos' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }, { valor: 'pix', rotulo: 'Pix' }, { valor: 'cartao_credito', rotulo: 'Crédito' }, { valor: 'cartao_debito', rotulo: 'Débito' }] as const;
export function Relatorios() {
  const g = useGestao(), { dados, token, mesmoPerfil } = g;
  const [inicio, setInicio] = useState(textoData(dados.relogio.agora())), [fim, setFim] = useState(textoData(dados.relogio.agora()));
  const [operadorId, setOperador] = useState(''), [caixaId, setCaixa] = useState(''), [meio, setMeio] = useState<typeof MEIOS[number]['valor']>(''), [loja, setLoja] = useState('');
  const [opcoes, setOpcoes] = useState<OpcoesRelatorio>({ lojas: [], usuarios: [], turnos: [] });
  const carregarOpcoes = useCallback(async () => { if (dados.backend.obterOpcoesRelatorio && token) { const r = await dados.backend.obterOpcoesRelatorio(token); if (mesmoPerfil()) setOpcoes(r); } }, [dados, token, mesmoPerfil]);
  useEffect(() => { void g.executar(carregarOpcoes); }, [carregarOpcoes]);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  async function atualizar() {
    if (!dados.backend.obterRelatorio || !token) return;
    const r = await dados.backend.obterRelatorio({ ...intervaloDatas(inicio, fim), ...(loja ? { lojaId: loja } : {}), ...(operadorId ? { operadorId } : {}), ...(caixaId ? { caixaId } : {}), ...(meio ? { meio } : {}) }, token);
    if (mesmoPerfil()) setRelatorio(r);
    await carregarOpcoes();
  }
  const nomeUsuario = (id: string) => opcoes.usuarios.find(u => u.id === id)?.nome ?? 'Responsável histórico';
  const nomeLoja = (id?: string) => id === 'todas' ? 'Todas as lojas' : opcoes.lojas.find(l => l.id === id)?.nome ?? 'Loja atual';
  const categoria = (c: string) => ROTULOS_RELATORIO[c as keyof typeof ROTULOS_RELATORIO] ?? c;
  const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const atualId = dados.conta.obter().identidade?.lojaId;
  const lojasDoFiltro = (id: string) => loja === 'todas' || id === (loja || atualId);
  return <TelaGestao titulo="Relatórios e CSV" estado={g} atualizar={atualizar}>
    <Texto>Vendas, recebimentos e gaveta são medidas separadas. O meio filtra a parcela correspondente de vendas divididas. Crédito ainda sem recebimento fica sem meio de pagamento.</Texto>
    <Campo rotulo="Data inicial (DD/MM/AAAA)" value={inicio} onChangeText={setInicio} ajuda="Dias completos no horário de Brasília." />
    <Campo rotulo="Data final (DD/MM/AAAA)" value={fim} onChangeText={setFim} />
    {dados.conta.obter().identidade?.papel === 'dono' ? <>
      <Texto estilo="label">Lojas</Texto>
      <ListaPaginada itens={[{ id: '', nome: 'Loja atual' }, { id: 'todas', nome: 'Todas as lojas' }, ...opcoes.lojas]} renderizar={l => <Botao key={l.id} rotulo={`${loja === l.id ? 'Selecionado: ' : ''}${l.nome}`} variante="terciario" tamanho="M" onPress={() => { setLoja(l.id); setOperador(''); setCaixa(''); }} />} />
    </> : null}
    {dados.pode('conferir_caixas') ? <><Texto estilo="label">Usuário</Texto><Botao rotulo="Todos os usuários permitidos" variante="terciario" tamanho="M" onPress={() => { setOperador(''); setCaixa(''); }} />
      <ListaPaginada itens={opcoes.usuarios.filter(u => lojasDoFiltro(u.lojaId))} renderizar={u => <Botao key={u.id} rotulo={`${operadorId === u.id ? 'Selecionado: ' : ''}${u.nome} · ${nomeLoja(u.lojaId)}`} variante="terciario" tamanho="M" onPress={() => { setOperador(u.id); setCaixa(''); }} />} /></> : <Texto>Seu relatório inclui somente seus registros.</Texto>}
    <Texto estilo="label">Turno</Texto><Botao rotulo="Todos os turnos" variante="terciario" tamanho="M" onPress={() => setCaixa('')} />
    <ListaPaginada itens={opcoes.turnos.filter(t => lojasDoFiltro(t.lojaId) && (!operadorId || t.operadorId === operadorId))} renderizar={t => <Botao key={t.id} rotulo={`${caixaId === t.id ? 'Selecionado: ' : ''}${nomeUsuario(t.operadorId)} · ${quando(t.abertoEm)} · ${t.fechadoEm ? 'Encerrado' : 'Aberto'}`} variante="terciario" tamanho="M" onPress={() => setCaixa(t.id)} />} />
    <Texto estilo="label">Meio de pagamento</Texto>
    {MEIOS.map(m => <Botao key={m.valor} rotulo={`${meio === m.valor ? 'Selecionado: ' : ''}${m.rotulo}`} variante="terciario" tamanho="M" onPress={() => setMeio(m.valor)} />)}
    <Botao rotulo="Gerar relatório com estes filtros" carregando={g.ocupado} onPress={() => void g.executar(atualizar)} />
    {relatorio ? <>
      <Texto estilo="tituloM">Resultado confirmado</Texto>
      <Texto>{`${textoData(new Date(relatorio.filtros.inicio))} a ${textoData(new Date(Date.parse(relatorio.filtros.fim) - 1))} · ${nomeLoja(relatorio.filtros.lojaId)} · ${relatorio.filtros.operadorId ? nomeUsuario(relatorio.filtros.operadorId) : 'Usuários permitidos'} · Meio: ${MEIOS.find(m => m.valor === relatorio.filtros.meio)?.rotulo ?? 'Todos'}`}</Texto>
      {Object.entries(relatorio.totais).map(([c, n]) => <Texto key={c}>{`${categoria(c)}: ${formatarBRL(n)}`}</Texto>)}
      <Texto>Vendas líquidas comerciais = realizadas − canceladas. Recebimentos líquidos = na venda + de fiado − devoluções financeiras. Entradas externas e transferências são movimentações de gaveta. Não some essas medidas entre si.</Texto>
      <Botao rotulo="Exportar este resultado em CSV" variante="secundario" carregando={g.ocupado} onPress={() => void g.executar(async () => { const r = await compartilharCsv('pdv-relatorio.csv', csvRelatorio(relatorio)); if (r === 'indisponivel') throw new Error('Compartilhamento indisponível.'); })} />
      <ListaPaginada itens={relatorio.linhas} renderizar={l => <Texto key={l.id} estilo="legenda" selectable>{`${quando(l.em)} · ${categoria(l.categoria)} · ${formatarBRL(l.valorCentavos)} · ${l.descricao} · ${nomeUsuario(l.operadorId)} · ${nomeLoja(l.lojaId)}${l.autorOperadorId && l.autorOperadorId !== l.operadorId ? ` · Autor: ${nomeUsuario(l.autorOperadorId)}` : ''}`}</Texto>} />
    </> : null}
  </TelaGestao>;
}
