import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/componentes/Toast';
import { totalDoCarrinho, useCarrinho, valorRestante, type Parcela } from '@/dados/carrinho';
import { useDados } from '@/dados/hooks';
import type { ProvedorPagamento } from '@/dados/tipos';
import { registrar as registrarDiagnostico } from '@/diagnostico/registro';
import { ehProvedor } from './rotulos';

export type ParteDaParcela = Omit<Parcela, 'valorCentavos'>;

/**
 * Cobrança em andamento numa das telas de meio de pagamento. O valor desta cobrança vem do parâmetro
 * `valor` (venda dividida) ou é tudo o que falta; `receber` registra a parcela e segue o fluxo.
 */
export function useCobranca() {
  const router = useRouter();
  const toast = useToast();
  const { carrinho } = useDados();
  const { restanteCentavos } = useCarrinho();
  const params = useLocalSearchParams<{ valor?: string; dividir?: string; provedor?: string; cobranca?: string }>();

  // Fixado na abertura da tela: registrar a parcela reduz o "restante" antes da navegação terminar.
  // `carrinho.adicionarParcela` recusa valores que passem do que falta.
  const [valorCentavos] = useState(() => {
    const pedido = Number.parseInt(params.valor ?? '', 10);
    return pedido > 0 ? pedido : restanteCentavos;
  });
  const [ocupado, setOcupado] = useState(false);
  const emAndamento = useRef(false);

  const provedor: ProvedorPagamento | null = ehProvedor(params.provedor) ? params.provedor : null;

  /** Parâmetros que as telas seguintes precisam repetir. */
  const parametros = useCallback(
    (extra: Record<string, string> = {}) => ({
      valor: String(valorCentavos),
      ...(params.dividir === '1' ? { dividir: '1' } : {}),
      ...(provedor ? { provedor } : {}),
      ...extra,
    }),
    [valorCentavos, params.dividir, provedor],
  );

  const finalizar = useCallback(async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setOcupado(true);
    try {
      const venda = await carrinho.concluir();
      router.replace({ pathname: '/pagar/sucesso', params: { venda: venda.id } });
    } catch (erro) {
      registrarDiagnostico('pagamento', 'falha ao registrar a venda', { mensagem: erro instanceof Error ? erro.message : String(erro) });
      toast.mostrar(erro instanceof Error ? erro.message : 'Não foi possível registrar a venda.', { tipo: 'erro' });
    } finally { emAndamento.current = false; setOcupado(false); }
  }, [carrinho, router, toast]);

  /** Depois de uma parcela: volta à divisão se ainda falta valor, senão registra a venda. */
  const avancar = useCallback(async () => {
    const { itens, parcelas } = carrinho.obter();
    if (valorRestante(totalDoCarrinho(itens), parcelas) > 0) {
      router.dismissTo('/pagar/dividir');
      return;
    }
    await finalizar();
  }, [finalizar, router, carrinho]);

  const registrarParcela = useCallback(
    async (parte: ParteDaParcela) => {
      await carrinho.adicionarParcela({ ...parte, valorCentavos });
    },
    [valorCentavos, carrinho],
  );

  /** Registra a parcela e avança. Ignora toques repetidos enquanto a venda é gravada. */
  const receber = useCallback(
    async (parte: ParteDaParcela) => {
      if (emAndamento.current) return;
      const atual = carrinho.obter();
      // A parcela final pode estar confirmada mesmo se a conclusão falhou depois.
      // Retentar registra a venda, sem solicitar nem adicionar o recebimento outra vez.
      if (atual.itens.length > 0 && valorRestante(totalDoCarrinho(atual.itens), atual.parcelas) === 0) {
        await finalizar();
        return;
      }
      emAndamento.current = true;
      setOcupado(true);
      try {
        await registrarParcela(parte);
        registrarDiagnostico('pagamento', 'pagamento recebido', { meio: parte.meio, provedor: parte.provedor ?? null, valorCentavos, dividida: params.dividir === '1', resultado: 'aprovado' });
        // finalizar tem sua própria trava, compartilhada com o botão de retentativa.
        emAndamento.current = false;
        await avancar();
      } catch (erro) {
        toast.mostrar(erro instanceof Error ? erro.message : 'Não foi possível guardar o recebimento. Tente novamente.', { tipo: 'erro' });
      } finally {
        emAndamento.current = false;
        setOcupado(false);
      }
    },
    [registrarParcela, avancar, finalizar, valorCentavos, params.dividir, toast, carrinho],
  );

  /** Volta à escolha do meio (checkout, ou divisão quando há parcelas). */
  const trocarDeMeio = useCallback(() => router.dismissTo(params.dividir === '1' ? '/pagar/dividir' : '/pagar'), [router, params.dividir]);

  return {
    valorCentavos,
    dividindo: params.dividir === '1',
    provedor,
    cobranca: params.cobranca ?? null,
    ocupado,
    parametros,
    receber,
    registrarParcela,
    avancar,
    finalizar,
    trocarDeMeio,
  };
}
