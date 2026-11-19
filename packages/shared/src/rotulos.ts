import type { MovimentoCaixa } from './contrato';
import type { Papel } from './equipe';

const ROTULOS_PAPEL: Record<Papel, string> = {
  dono: 'Dono',
  gerente: 'Gerente',
  operador: 'Operador',
};

export function rotuloPapel(papel: Papel | string | null | undefined): string {
  if (papel && Object.hasOwn(ROTULOS_PAPEL, papel)) {
    return ROTULOS_PAPEL[papel as Papel] ?? 'Operador';
  }
  return papel || 'Operador';
}

export const ROTULOS_TIPO_MOVIMENTO_CAIXA: Record<MovimentoCaixa['tipo'], string> = {
  suprimento: 'Entrada de troco',
  sangria: 'Sangria',
  retirada: 'Retirada',
  transferencia_entrada: 'Transferência recebida',
  transferencia_saida: 'Transferência enviada',
  devolucao: 'Devolução em dinheiro',
  correcao_entrada: 'Correção (+)',
  correcao_saida: 'Correção (−)',
  recebimento_fiado: 'Recebimento de fiado',
  estorno_fiado: 'Estorno de fiado',
};

export function rotuloTipoMovimentoCaixa(tipo: MovimentoCaixa['tipo']): string {
  return ROTULOS_TIPO_MOVIMENTO_CAIXA[tipo];
}

export const CATEGORIAS_MOVIMENTO_CAIXA = [
  { codigo: 'reforco_troco', rotulo: 'Reforço de troco' },
  { codigo: 'cofre_deposito', rotulo: 'Cofre ou depósito' },
  { codigo: 'despesa', rotulo: 'Despesa da loja' },
  { codigo: 'outra_saida', rotulo: 'Outra saída' },
] as const;

const MAPA_CATEGORIAS: Record<string, string> = Object.fromEntries(
  CATEGORIAS_MOVIMENTO_CAIXA.map((item) => [item.codigo, item.rotulo]),
);

export function rotuloCategoriaMovimento(codigo: string | null | undefined): string {
  if (!codigo) return '';
  return Object.hasOwn(MAPA_CATEGORIAS, codigo) ? MAPA_CATEGORIAS[codigo]! : codigo;
}

export function codigoCurto(id: string | null | undefined): string {
  const limpo = (id ?? '').replace(/[^A-Za-z0-9]/g, '');
  if (!limpo) return '#----';
  return `#${limpo.slice(-4).toUpperCase()}`;
}

export const MOTIVOS_CONFIRMACAO_MANUAL = {
  stone: 'A integração direta Stone Connect exige programa de parceria e homologação; confirme no visor da maquininha.',
  infinitetap: 'O InfiniteTap devolve o resultado apenas ao aparelho por deeplink, sem consulta no servidor.',
  infinitepay_estorno: 'A InfinitePay realiza estornos diretamente no aplicativo ou painel web do lojista.',
  mercadopago_point: 'Point Smart/Pro em modo PDV requer vinculação de terminal dedicada; na maquininha avulsa, confirme no visor.',
  outro: 'Maquininha sem integração automática: confirme o comprovante aprovado antes de finalizar a venda.',
} as const;
