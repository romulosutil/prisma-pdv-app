import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Botao } from './Botao';
import { Texto } from './Texto';

export const TAMANHO_PAGINA = 25;
/** Limita a montagem de cada coleção mesmo dentro de formulários roláveis. */
export function ListaPaginada<T>({ itens, renderizar }: { itens: readonly T[]; renderizar: (item: T, indice: number) => ReactNode }) {
  const [pagina, setPagina] = useState(0);
  useEffect(() => { setPagina(0); }, [itens.length]);
  const total = Math.max(1, Math.ceil(itens.length / TAMANHO_PAGINA));
  const atual = Math.min(pagina, total - 1), inicio = atual * TAMANHO_PAGINA;
  return <>
    {itens.slice(inicio, inicio + TAMANHO_PAGINA).map((item, n) => <Fragment key={inicio + n}>{renderizar(item, inicio + n)}</Fragment>)}
    {total > 1 ? <>
      <Texto accessibilityLiveRegion="polite">Página {atual + 1} de {total} · {itens.length} registros</Texto>
      <Botao rotulo="Página anterior" variante="terciario" desabilitado={atual === 0} onPress={() => setPagina(atual - 1)} />
      <Botao rotulo="Próxima página" variante="terciario" desabilitado={atual + 1 === total} onPress={() => setPagina(atual + 1)} />
    </> : null}
  </>;
}
