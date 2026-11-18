import { atribuicaoCatalogo, FonteCatalogoSchema, type AtribuicaoCatalogo } from '@pdv/shared';
import { buscarNoCatalogo } from '@/servicos/catalogoEan';
import { somenteDigitos } from './logica';

/** O que o formulário de novo produto recebe de quem leu o código. */
export interface SugestaoDeCadastro {
  ean: string;
  nome: string;
  /** `catalogo`: nome veio do catálogo; `ausente`: código fora do catálogo; `manual`: o usuário escolheu preencher sozinho. */
  origem: 'catalogo' | 'ausente' | 'manual';
  /** Crédito da fonte externa do nome (ODbL); ausente no catálogo próprio e fora do catálogo. */
  atribuicao?: AtribuicaoCatalogo | null;
}

/**
 * Monta a sugestão a partir dos parâmetros da rota `/produtos/novo`. `nome` já consultado (tela
 * "buscando") vale mais que uma nova consulta; sem código válido não há sugestão.
 */
export function sugestaoParaCadastro(codigo: string | undefined, nome?: string, manual = false, fonte?: string): SugestaoDeCadastro | undefined {
  const ean = somenteDigitos(codigo ?? '');
  if (!/^\d{8,14}$/.test(ean)) return undefined;
  if (manual) return { ean, nome: '', origem: 'manual' };
  if (nome) {
    // O parâmetro de rota é texto livre: fonte desconhecida é ignorada e a atribuição é derivada de novo.
    const valida = FonteCatalogoSchema.safeParse(fonte);
    return { ean, nome, origem: 'catalogo', atribuicao: valida.success ? atribuicaoCatalogo(valida.data, ean) : null };
  }
  const achado = buscarNoCatalogo(ean);
  if (!achado.achou) return { ean, nome: '', origem: 'ausente' };
  return { ean, nome: achado.nome, origem: 'catalogo', atribuicao: achado.atribuicao ?? (achado.fonte ? atribuicaoCatalogo(achado.fonte, ean) : null) };
}
