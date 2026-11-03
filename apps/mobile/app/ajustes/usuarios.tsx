import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Banner } from '@/componentes/Banner';
import { Botao } from '@/componentes/Botao';
import { CabecalhoTela } from '@/componentes/CabecalhoTela';
import { TelaBase } from '@/componentes/TelaBase';
import { Texto } from '@/componentes/Texto';
import { useConta, useDados } from '@/dados/hooks';
import { mensagemDeErro } from '@/servicos/backend';

export default function Usuarios() {
  const dados = useDados(); const router = useRouter(); const { identidade, perfil, carregandoConta } = useConta();
  const [perfis, setPerfis] = useState<Awaited<ReturnType<typeof dados.listarPerfisLocais>>>([]);
  const [erro, setErro] = useState<string | null>(null); const [ocupado, setOcupado] = useState(false);
  useEffect(() => { let ativo = true; dados.listarPerfisLocais().then(v => { if (ativo) setPerfis(v); }).catch(e => { if (ativo) setErro(mensagemDeErro(e)); }); return () => { ativo = false; }; }, [dados, identidade?.operadorId]);
  const retomar = async (id: string) => { if (ocupado || carregandoConta) return; setOcupado(true); setErro(null); try { await dados.retomarPerfil(id); router.replace('/'); } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); } };
  const sair = async () => { if (ocupado || carregandoConta) return; setOcupado(true); setErro(null); try { const r = await dados.sair(); if (dados.backend.modo === 'http' && !r.revogadaNoServidor) setErro('A saída foi feita neste aparelho. A revogação no servidor será repetida quando houver conexão.'); else router.replace('/(onboarding)/entrar'); } catch (e) { setErro(mensagemDeErro(e)); } finally { setOcupado(false); } };
  return <TelaBase rolavel>
    <CabecalhoTela titulo="Usuários neste aparelho" onVoltar={() => router.back()} />
    <Texto estilo="corpoMedio">{perfil?.nomeResponsavel} · {perfil?.nomeLoja}</Texto>
    <Texto estilo="corpo">Ao alternar, seu rascunho e suas pendências ficam guardados. Perfis já autenticados podem retomar offline por até sete dias da última validação. Ao reconectar, o acesso é conferido novamente.</Texto>
    {perfis.map(p => <View key={p.operadorId} style={{ gap: 8, paddingVertical: 12 }}>
      <Texto estilo="corpoMedio">{p.nome} · {p.loja}</Texto><Texto estilo="legenda">{p.email}</Texto>
      <Texto estilo="legenda">{p.ativo ? 'Perfil em uso' : 'Perfil pausado'}{p.exigeReautenticacao ? ' · Conecte-se para revalidar o acesso' : ''}</Texto>
      {p.offlineAte ? <Texto estilo="legenda">{`Prazo offline: ${new Date(p.offlineAte).toLocaleString('pt-BR')}`}</Texto> : null}
      {p.resumo ? <Texto estilo="legenda">{`${p.resumo.pendentes} aguardando envio · ${p.resumo.rejeitadas} para revisão. Última sincronização completa: ${p.resumo.ultimaSincronizacaoEm ? new Date(p.resumo.ultimaSincronizacaoEm).toLocaleString('pt-BR') : 'ainda não concluída'}.`}</Texto> : null}
      {!p.ativo && p.pausado ? <Botao rotulo={`Retomar ${p.nome}`} variante="terciario" onPress={() => void retomar(p.operadorId)} desabilitado={ocupado || carregandoConta} /> : !p.pausado ? <Texto estilo="legenda">Este perfil precisa de um novo código pessoal.</Texto> : null}
    </View>)}
    <Texto estilo="legenda">Pendências estão somente neste aparelho até a confirmação. Em um aparelho substituto, a quantidade de operações não enviadas pelo aparelho perdido é desconhecida. Revogação remota só é conhecida ao reconectar.</Texto>
    <Botao rotulo="Entrar com outro usuário ou loja" onPress={() => router.push('/(onboarding)/entrar')} desabilitado={ocupado || carregandoConta} />
    <Botao rotulo="Sair deste perfil" variante="perigo" onPress={() => void sair()} desabilitado={ocupado || carregandoConta} />
    {erro ? <Banner tipo="erro" texto={erro} /> : null}
  </TelaBase>;
}
