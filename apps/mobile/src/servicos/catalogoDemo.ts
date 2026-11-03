import type { ResultadoCatalogo } from './catalogoEan';
import { registrar } from '@/diagnostico/registro';

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

export function buscarCatalogoDemo(ean: string): ResultadoCatalogo {
  const nome = BASE_LOCAL[ean.replace(/\D/g, '')];
  return nome ? { achou: true, nome } : { achou: false };
}

/** Exclusivo do perfil demo; este módulo inteiro é excluído dos releases conectados. */
export function consultarCatalogoDemo(ean: string, atrasoMs = 900, sinal?: AbortSignal): Promise<ResultadoCatalogo> {
  const inicio = Date.now();
  return new Promise((resolver, rejeitar) => {
    const cancelar = () => {
      clearTimeout(espera);
      rejeitar(Object.assign(new Error('Consulta cancelada'), { name: 'AbortError' }));
    };
    const espera = setTimeout(() => {
      sinal?.removeEventListener('abort', cancelar);
      const resultado = buscarCatalogoDemo(ean);
      registrar('leitura', 'consulta de catálogo', { fonte: 'demo', achou: resultado.achou, ms: Date.now() - inicio, ean: ean.replace(/\D/g, '') });
      resolver(resultado);
    }, atrasoMs);
    sinal?.addEventListener('abort', cancelar, { once: true });
    if (sinal?.aborted) cancelar();
  });
}
