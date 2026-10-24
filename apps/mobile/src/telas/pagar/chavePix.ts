import { useCallback, useEffect, useState } from 'react';
import { ArmazenamentoAsync } from '@/dados/armazenamento';
import { interpretarChavePix, type ChavePix } from '@/util/brcode';

const CHAVE_NO_ARMAZENAMENTO = 'chavePix';
const armazenamento = new ArmazenamentoAsync();

/** Chave Pix do recebedor, usada no QR estático. Fica só neste aparelho. */
export function useChavePix() {
  const [carregada, setCarregada] = useState(false);
  const [chave, setChave] = useState<ChavePix | null>(null);

  useEffect(() => {
    let ativo = true;
    armazenamento
      .obter<ChavePix>(CHAVE_NO_ARMAZENAMENTO)
      .then((salva) => {
        if (ativo) setChave(salva);
      })
      .finally(() => {
        if (ativo) setCarregada(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  /** Guarda a chave digitada; devolve `false` se ela não for uma chave Pix válida. */
  const salvar = useCallback(async (texto: string): Promise<boolean> => {
    const interpretada = interpretarChavePix(texto);
    if (!interpretada) return false;
    await armazenamento.gravar(CHAVE_NO_ARMAZENAMENTO, interpretada);
    setChave(interpretada);
    return true;
  }, []);

  return { carregada, chave, salvar };
}
