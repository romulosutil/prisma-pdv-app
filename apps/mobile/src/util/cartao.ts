import {
  cvvValido,
  detectarBandeira,
  luhnValido,
  validadeValida,
  type Bandeira,
  type DadosCartao,
} from '@pdv/shared';
import { soDigitos } from './documento';

const ROTULOS: Record<Bandeira, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  desconhecida: 'Cartão',
};

export const rotuloBandeira = (b: Bandeira): string => ROTULOS[b];

/** "1227" -> "12/27". */
export function formatarValidade(texto: string): string {
  const d = soDigitos(texto).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export type ErrosCartao = Partial<Record<keyof DadosCartao, string>>;

/** Valida campo a campo para mostrar todos os erros de uma vez (a tokenização do shared para no primeiro). */
export function validarCartao(dados: DadosCartao, agora: Date): ErrosCartao {
  const erros: ErrosCartao = {};
  const digitos = soDigitos(dados.numero);
  if (!luhnValido(digitos)) erros.numero = 'Confira o número do cartão.';
  if (!validadeValida(dados.validade, agora)) erros.validade = 'Use o formato MM/AA, com uma data futura.';
  if (!cvvValido(dados.cvv, detectarBandeira(digitos))) erros.cvv = 'O código de segurança está incompleto.';
  if (dados.nome.trim().length < 2) erros.nome = 'Digite o nome impresso no cartão.';
  return erros;
}
