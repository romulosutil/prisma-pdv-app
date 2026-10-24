import { buscarNoCatalogo } from '@/servicos/catalogoEan';
import { somenteDigitos } from './logica';

/** O que o formulário de novo produto recebe de quem leu o código. */
export interface SugestaoDeCadastro {
  ean: string;
  nome: string;
  /** `catalogo`: nome veio do catálogo; `ausente`: código fora do catálogo; `manual`: o usuário escolheu preencher sozinho. */
  origem: 'catalogo' | 'ausente' | 'manual';
}

/**
 * Monta a sugestão a partir dos parâmetros da rota `/produtos/novo`. `nome` já consultado (tela
 * "buscando") vale mais que uma nova consulta; sem código válido não há sugestão.
 */
export function sugestaoParaCadastro(codigo: string | undefined, nome?: string, manual = false): SugestaoDeCadastro | undefined {
  const ean = somenteDigitos(codigo ?? '');
  if (!/^\d{8,14}$/.test(ean)) return undefined;
  if (manual) return { ean, nome: '', origem: 'manual' };
  if (nome) return { ean, nome, origem: 'catalogo' };
  const achado = buscarNoCatalogo(ean);
  return achado.achou ? { ean, nome: achado.nome, origem: 'catalogo' } : { ean, nome: '', origem: 'ausente' };
}
