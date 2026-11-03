import { useCallback, useEffect, useState } from 'react';
import { useConta, useDados } from '@/dados/hooks';
import { interpretarChavePix, type ChavePix } from '@/util/brcode';

const CHAVE_NO_ARMAZENAMENTO = 'chavePix';

/** Chave Pix do recebedor, usada no QR estático. Fica só neste aparelho. */
export function useChavePix() {
  const dados = useDados();
  const { armazenamentoDaLoja: armazenamento } = dados;
  const { identidade } = useConta();
  const escopo = identidade ? JSON.stringify([identidade.contaId, identidade.lojaId]) : null;
  const [carregada, setCarregada] = useState(false);
  const [chave, setChave] = useState<ChavePix | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [escopoCarregado, setEscopoCarregado] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    setCarregada(false); setChave(null); setErro(null);
    armazenamento
      .obter<ChavePix>(CHAVE_NO_ARMAZENAMENTO)
      .then((salva) => {
        if (ativo) setChave(salva);
      })
      .catch(() => { if (ativo) setErro('Não foi possível abrir a chave Pix desta conta. Tente novamente antes de receber.'); })
      .finally(() => {
        if (ativo) { setEscopoCarregado(escopo); setCarregada(true); }
      });
    return () => {
      ativo = false;
    };
  }, [armazenamento, escopo, tentativa]);

  /** Guarda a chave digitada; devolve `false` se ela não for uma chave Pix válida. */
  const salvar = useCallback(async (texto: string): Promise<boolean> => {
    const interpretada = interpretarChavePix(texto);
    if (!interpretada) return false;
    const conferir = () => {
      const atual = dados.conta.obter().identidade;
      if (!atual || JSON.stringify([atual.contaId, atual.lojaId]) !== escopo)
        throw new Error('A loja mudou. Confira a chave Pix antes de receber.');
    };
    conferir();
    await armazenamento.gravar(CHAVE_NO_ARMAZENAMENTO, interpretada);
    conferir();
    setChave(interpretada);
    return true;
  }, [armazenamento, escopo, dados]);

  return { carregada: carregada && escopoCarregado === escopo, chave: escopoCarregado === escopo ? chave : null, salvar, erro: escopoCarregado === escopo ? erro : null, recarregar: () => setTentativa((n) => n + 1) };
}
