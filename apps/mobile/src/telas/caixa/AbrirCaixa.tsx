import { formatarBRL, type Centavos } from '@pdv/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useToast } from '@/componentes/Toast';
import { ehErroDeDominio } from '@/dados/erros';
import { useCaixa } from '@/dados/hooks';
import { useVoltar } from '@/util/useVoltar';
import { TelaDeValor } from './TelaDeValor';

export function AbrirCaixa() {
  const router = useRouter();
  const toast = useToast();
  const voltar = useVoltar('/caixa');
  const { abrir } = useCaixa();
  const [troco, setTroco] = useState<Centavos>(0);
  const [abrindo, setAbrindo] = useState(false);

  const confirmar = async () => {
    setAbrindo(true);
    try {
      await abrir(troco);
      toast.mostrar(`Caixa aberto com troco de ${formatarBRL(troco)}`, { tipo: 'sucesso' });
      router.replace('/caixa');
    } catch (erro) {
      if (ehErroDeDominio(erro, 'caixa_ja_aberto')) router.replace('/caixa');
      else toast.mostrar('Não foi possível abrir o caixa. Tente de novo.', { tipo: 'erro' });
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <TelaDeValor
      titulo="Abrir caixa"
      onVoltar={voltar}
      descricao="Quanto de dinheiro você deixa na gaveta para dar troco? Pode ser zero."
      rotuloCampo="Troco inicial"
      valorCentavos={troco}
      onChange={setTroco}
      acao={{ rotulo: 'Abrir caixa', onPress: confirmar, carregando: abrindo }}
    />
  );
}
