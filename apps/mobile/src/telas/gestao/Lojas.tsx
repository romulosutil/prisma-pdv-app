import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { LojaSchema } from '@pdv/shared';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Texto } from '@/componentes/Texto';
import { TelaGestao, useGestao } from './comum';

export function Lojas() {
  const g = useGestao(), { dados, token, mesmoPerfil } = g, router = useRouter();
  const [lojas, setLojas] = useState<z.infer<typeof LojaSchema>[]>([]), [nome, setNome] = useState('');
  const atualizar = useCallback(async () => {
    if (!dados.backend.listarLojas || !token) return;
    const r = await dados.backend.listarLojas(token); if (mesmoPerfil()) setLojas(r);
  }, [dados, token, mesmoPerfil]);
  useEffect(() => { void g.executar(atualizar); }, [atualizar]);
  const dono = dados.conta.obter().identidade?.papel === 'dono';
  return <TelaGestao titulo="Lojas e vínculos" estado={g} atualizar={atualizar}>
    <Texto>Cada loja tem estoque, caixas, equipe e configurações próprios. Entre com seu código pessoal e selecione o vínculo para trabalhar em outra loja. Pendências permanecem no perfil de origem.</Texto>
    {lojas.map(l => <Texto key={l.id} selectable>{`${l.nome} · ${l.papel}${l.id === dados.conta.obter().identidade?.lojaId ? ' · Loja atual' : ''}`}</Texto>)}
    <Botao rotulo="Selecionar loja com meu acesso pessoal" variante="secundario" onPress={() => router.push('/entrar')} desabilitado={g.ocupado} />
    <Botao rotulo="Retomar um perfil deste aparelho" variante="terciario" onPress={() => router.push('/ajustes/usuarios')} desabilitado={g.ocupado} />
    {dono ? <>
      <Campo rotulo="Nome da nova loja" value={nome} onChangeText={setNome} maxLength={150} />
      <Botao rotulo="Cadastrar loja" carregando={g.ocupado} onPress={() => void g.executar(async () => { await dados.operacaoGestaoOnline('loja', { nome }); setNome(''); await atualizar(); }, 'Loja criada com seu vínculo de dono. Entre nessa loja para convidar a equipe.')} />
      <Botao rotulo="Equipe da loja atual" variante="terciario" onPress={() => router.push('/ajustes/equipe')} />
    </> : null}
  </TelaGestao>;
}
