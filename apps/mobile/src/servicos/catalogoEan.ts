/** Resultado da consulta ao catálogo nacional de códigos de barras. */
export type ResultadoCatalogo = { achou: true; nome: string } | { achou: false };

/**
 * Base local que simula o catálogo nacional (versão de testes): EAN -> nome sugerido.
 * Os códigos 789000000xxxx são os do cadastro de demonstração.
 */
const BASE_LOCAL: Readonly<Record<string, string>> = {
  '7890000000017': 'Arroz tipo 1 5kg',
  '7890000000024': 'Feijão carioca 1kg',
  '7890000000031': 'Leite integral 1L',
  '7890000000048': 'Café torrado 500g',
  '7890000000055': 'Biscoito recheado 130g',
  '7890000000062': 'Refrigerante cola 2L',
  '7896543210987': 'Achocolatado em pó 400g',
  '7891000100103': 'Leite condensado 395g',
  '7891910000197': 'Açúcar refinado 1kg',
  '7891000053508': 'Creme de leite 200g',
  '7896004000012': 'Macarrão espaguete 500g',
  '7894900011517': 'Refrigerante laranja 2L',
  '7891150024391': 'Sabão em pó 1kg',
  '7898080640147': 'Água mineral 1,5L',
};

/** Consulta instantânea na base local; `{ achou: false }` para códigos fora do catálogo. */
export function buscarNoCatalogo(ean: string): ResultadoCatalogo {
  const nome = BASE_LOCAL[ean.replace(/\D/g, '')];
  return nome ? { achou: true, nome } : { achou: false };
}

export interface OpcoesConsulta {
  /** Atraso artificial que imita a ida à rede. */
  atrasoMs?: number;
  /** Cancela a espera (a tela foi fechada). */
  sinal?: AbortSignal;
}

const ATRASO_PADRAO_MS = 900;

/** Mesma consulta com atraso, como será com o catálogo de verdade. Rejeita com `AbortError` se cancelada. */
export function consultarCatalogo(ean: string, { atrasoMs = ATRASO_PADRAO_MS, sinal }: OpcoesConsulta = {}): Promise<ResultadoCatalogo> {
  return new Promise((resolver, rejeitar) => {
    const cancelar = () => {
      clearTimeout(espera);
      rejeitar(Object.assign(new Error('Consulta cancelada'), { name: 'AbortError' }));
    };
    const espera = setTimeout(() => {
      sinal?.removeEventListener('abort', cancelar);
      resolver(buscarNoCatalogo(ean));
    }, atrasoMs);
    if (sinal?.aborted) cancelar();
    else sinal?.addEventListener('abort', cancelar, { once: true });
  });
}
