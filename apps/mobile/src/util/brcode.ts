import type { Centavos } from '@pdv/shared';
import { cnpjValido, cpfValido, soDigitos } from './documento';

/** CRC16-CCITT-FALSE (polinômio 0x1021, início 0xFFFF), em 4 hexadecimais maiúsculos. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Campo EMV: id (2) + tamanho (2) + valor. */
const campo = (id: string, valor: string): string => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

/** O BR Code só aceita ASCII: tira acentos e o que sobrar fora de ASCII imprimível. */
const soAscii = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();

const valorEmReais = (c: Centavos): string => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;

interface DadosComuns {
  nomeRecebedor: string;
  cidade: string;
  /** Sem valor, o pagador digita o quanto quiser. */
  valorCentavos?: Centavos;
  /** Identificador da transação (até 25 letras/números). `***` quando não há. */
  txid?: string;
}

export interface DadosBrCodeEstatico extends DadosComuns {
  chave: string;
}

export interface DadosBrCodeDinamico extends DadosComuns {
  /** Endereço da cobrança no provedor, sem `https://` (ex.: `pix.provedor.com/qr/v2/abc`). */
  url: string;
}

function montar(contaDoRecebedor: string, d: DadosComuns): string {
  const txid = soAscii(d.txid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const partes = [
    campo('00', '01'),
    campo('26', contaDoRecebedor),
    campo('52', '0000'),
    campo('53', '986'),
    d.valorCentavos && d.valorCentavos > 0 ? campo('54', valorEmReais(d.valorCentavos)) : '',
    campo('58', 'BR'),
    campo('59', soAscii(d.nomeRecebedor).slice(0, 25) || 'RECEBEDOR'),
    campo('60', soAscii(d.cidade).slice(0, 15) || 'BRASIL'),
    campo('62', campo('05', txid)),
  ];
  const semCrc = `${partes.join('')}6304`;
  return `${semCrc}${crc16(semCrc)}`;
}

/** Pix "copia e cola" estático: chave do recebedor + valor. O banco confirma, o app não. */
export function gerarBrCodeEstatico(d: DadosBrCodeEstatico): string {
  return montar(`${campo('00', 'br.gov.bcb.pix')}${campo('01', d.chave)}`, d);
}

/** Pix "copia e cola" dinâmico: aponta para a cobrança criada no provedor (GUI + URL). */
export function gerarBrCodeDinamico(d: DadosBrCodeDinamico): string {
  return montar(`${campo('00', 'br.gov.bcb.pix')}${campo('25', d.url)}`, d);
}

export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface ChavePix {
  tipo: TipoChavePix;
  /** Já no formato do BR Code: CPF/CNPJ só dígitos, telefone com +55, e-mail em minúsculas. */
  chave: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reconhece o tipo da chave digitada e a normaliza; `null` se não for uma chave Pix válida. */
export function interpretarChavePix(texto: string): ChavePix | null {
  const bruto = texto.trim();
  if (EMAIL.test(bruto) && bruto.length <= 77) return { tipo: 'email', chave: bruto.toLowerCase() };
  if (UUID.test(bruto)) return { tipo: 'aleatoria', chave: bruto.toLowerCase() };
  const digitos = soDigitos(bruto);
  if (bruto.startsWith('+')) {
    return /^55\d{10,11}$/.test(digitos) ? { tipo: 'telefone', chave: `+${digitos}` } : null;
  }
  if (digitos.length === 14 && cnpjValido(digitos)) return { tipo: 'cnpj', chave: digitos };
  if (digitos.length === 11) {
    if (cpfValido(digitos)) return { tipo: 'cpf', chave: digitos };
    if (digitos[2] === '9') return { tipo: 'telefone', chave: `+55${digitos}` };
  }
  return null;
}
