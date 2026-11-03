import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { permissoesDoPapel, type Permissao, type Vinculo } from '@pdv/shared';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { BottomSheet } from '@/componentes/BottomSheet';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { Campo } from '@/componentes/Campo';
import { Interruptor } from '@/componentes/Interruptor';
import { Segmentado } from '@/componentes/Segmentado';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useConta, useDados } from '@/dados/hooks';
import { mensagemDeErro } from '@/servicos/backend';

const ROTULOS: Record<Permissao, string> = { vender: 'Vender', movimentar_proprio_caixa: 'Abrir e movimentar o próprio caixa', cadastrar_produto: 'Cadastrar e editar produtos', cancelar_venda: 'Cancelar vendas', retirar_dinheiro: 'Fazer sangria no próprio caixa', conferir_caixas: 'Consultar vendas e caixas de todos na loja', administrar_equipe: 'Administrar equipe' };
const ESTADOS = { ativo: 'Ativo', convidado: 'Convite pendente', suspenso: 'Suspenso', desligado: 'Desligado' };

export default function Equipe() {
  const router = useRouter(); const dados = useDados(); const { identidade, carregandoConta } = useConta();
  const [lista, setLista] = useState<Vinculo[]>([]); const [nome, setNome] = useState(''); const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'gerente' | 'operador'>('operador'); const [permissoes, setPermissoes] = useState<Permissao[]>(permissoesDoPapel('operador'));
  const [alvo, setAlvo] = useState<Vinculo | null>(null); const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState<string | null>(null); const [aviso, setAviso] = useState<string | null>(null);
  const trava = useRef(false); const geracao = useRef(0);
  useEffect(() => { const g = ++geracao.current; setLista([]); if (identidade && (!identidade.papel || identidade.papel === 'dono')) dados.backend.listarEquipe?.().then(v => { if (geracao.current === g) setLista(v); }).catch(e => { if (geracao.current === g) setErro(mensagemDeErro(e)); }); return () => { ++geracao.current; }; }, [dados, identidade?.operadorId]);
  const executar = async (f: () => Promise<void>) => {
    if (trava.current || carregandoConta) return; trava.current = true; setOcupado(true); setErro(null);
    try { await f(); } catch (e) { setErro(mensagemDeErro(e)); } finally { trava.current = false; setOcupado(false); }
  };
  const editar = (v?: Vinculo) => { setAlvo(v ?? null); setNome(v?.nome ?? ''); setEmail(v?.email ?? ''); setPapel(v?.papel === 'gerente' ? 'gerente' : 'operador'); setPermissoes(v?.permissoes ?? permissoesDoPapel('operador')); setAberto(true); setErro(null); };
  const salvar = () => void executar(async () => {
    if (alvo) await dados.backend.alterarVinculo!(alvo.operadorId, { papel, permissoes });
    else await dados.backend.convidar!({ nome: nome.trim(), email: email.trim().toLowerCase(), papel, permissoes });
    setLista(await dados.backend.listarEquipe!()); setAberto(false);
    setAviso(alvo ? 'Permissões atualizadas. O usuário deve entrar novamente.' : 'Convite criado por sete dias. Oriente a pessoa a entrar com este e-mail e aceitar o convite.');
  });
  const mudarEstado = (v: Vinculo, estado: 'ativo' | 'suspenso' | 'desligado') => void executar(async () => {
    await dados.backend.alterarVinculo!(v.operadorId, { estado }); setLista(await dados.backend.listarEquipe!());
    setAviso(estado === 'ativo' ? 'Acesso retomado. O usuário deve entrar com seu código pessoal.' : 'Acesso interrompido. O histórico continua preservado.');
  });
  // A sessão do dono da versão anterior não tinha papel serializado; a API revalida a autoridade.
  const dono = !!identidade && (!identidade.papel || identidade.papel === 'dono');
  return <TelaBase rolavel>
    <CabecalhoTela titulo="Equipe da loja" onVoltar={() => router.back()} />
    {!dono ? <Banner tipo="atencao" texto="Somente o dono administra a equipe." /> : <>
      <Texto estilo="corpo">Cada pessoa entra com seu próprio e-mail. O convite precisa ser aceito antes de liberar o acesso.</Texto>
      <Botao rotulo="Convidar pessoa" onPress={() => editar()} desabilitado={ocupado || carregandoConta} />
      {lista.map(v => <View key={v.operadorId} style={{ gap: 8, paddingVertical: 16 }}>
        <Texto estilo="corpoMedio">{v.nome} · {v.papel}</Texto><Texto estilo="legenda">{v.email} · {ESTADOS[v.estado]}</Texto>
        {v.papel !== 'dono' ? <>
          {v.estado === 'ativo' || v.estado === 'suspenso' ? <Botao tamanho="S" variante="terciario" rotulo={`Permissões de ${v.nome}`} onPress={() => editar(v)} desabilitado={ocupado || carregandoConta} /> : null}
          {v.estado === 'ativo' ? <Botao tamanho="S" variante="terciario" rotulo={`Suspender ${v.nome}`} onPress={() => mudarEstado(v, 'suspenso')} desabilitado={ocupado || carregandoConta} /> : null}
          {v.estado === 'suspenso' ? <Botao tamanho="S" variante="terciario" rotulo={`Retomar ${v.nome}`} onPress={() => mudarEstado(v, 'ativo')} desabilitado={ocupado || carregandoConta} /> : null}
          {v.estado === 'convidado' ? <Botao tamanho="S" variante="terciario" rotulo={`Renovar convite de ${v.nome}`} onPress={() => { editar(); setNome(v.nome); setEmail(v.email); setPapel(v.papel === 'gerente' ? 'gerente' : 'operador'); setPermissoes(v.permissoes); }} desabilitado={ocupado || carregandoConta} /> : null}
          {v.estado !== 'desligado' ? <Botao tamanho="S" variante="perigo" rotulo={v.estado === 'convidado' ? `Cancelar convite de ${v.nome}` : `Desligar ${v.nome}`} onPress={() => mudarEstado(v, 'desligado')} desabilitado={ocupado || carregandoConta} /> : <Botao tamanho="S" variante="terciario" rotulo={`Convidar ${v.nome} novamente`} onPress={() => { editar(); setNome(v.nome); setEmail(v.email); }} desabilitado={ocupado || carregandoConta} />}
        </> : null}
      </View>)}
    </>}
    {aviso ? <Banner tipo="atencao" texto={aviso} /> : null}{erro ? <Banner tipo="erro" texto={erro} /> : null}
    <BottomSheet visivel={aberto && dono} titulo={alvo ? 'Permissões da pessoa' : 'Convidar pessoa'} onFechar={() => { if (!ocupado) setAberto(false); }}>
      {!alvo ? <><Campo rotulo="Nome" value={nome} onChangeText={setNome} editable={!ocupado} /><Campo rotulo="E-mail pessoal" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!ocupado} /></> : <Texto estilo="corpo">{alvo.nome} · {alvo.email}</Texto>}
      <Segmentado rotuloGrupo="Papel na loja" valor={papel} onChange={p => { if (!ocupado) { setPapel(p); setPermissoes(permissoesDoPapel(p)); } }} opcoes={[{ valor: 'operador', rotulo: 'Operador' }, { valor: 'gerente', rotulo: 'Gerente' }]} />
      {permissoesDoPapel('dono').filter(p => p !== 'administrar_equipe').map(p => <Interruptor key={p} rotulo={ROTULOS[p]} ligado={permissoes.includes(p)} onChange={ativo => { if (!ocupado) setPermissoes(ps => ativo ? [...ps, p] : ps.filter(x => x !== p)); }} />)}
      <Texto estilo="legenda">Conferir caixas permite consultar os outros usuários desta loja. Movimentações são feitas no próprio caixa.</Texto>
      {erro ? <Banner tipo="erro" texto={erro} /> : null}
      <Botao rotulo={alvo ? 'Salvar permissões' : 'Criar convite'} onPress={salvar} carregando={ocupado} desabilitado={!alvo && (!nome.trim() || !email.trim())} />
    </BottomSheet>
  </TelaBase>;
}
