import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validação do `x-signature` do Mercado Pago (documentação de notificações da Orders API, consultada em 18/11/2026):
 * - cabeçalho no formato `ts=<milissegundos>,v1=<hmac hex>`;
 * - manifesto `id:[data.id da query, em minúsculas];request-id:[x-request-id];ts:[ts];`;
 * - sem `data.id` ou sem `x-request-id`, o par correspondente sai do manifesto;
 * - HMAC-SHA256 em hexadecimal com a assinatura secreta da aplicação, comparado em tempo constante.
 *
 * Janela de `ts`: a documentação não define tolerância e o Mercado Pago reenvia o aviso a cada 15 minutos
 * por tempo indeterminado; recusar avisos antigos perderia reenvios legítimos. Um aviso válido repetido só
 * dispara uma consulta idempotente (`GET /v1/orders/{id}`), então nenhuma janela é aplicada.
 */
export function lerCabecalhoAssinatura(cabecalho: string | undefined): { ts: string; v1: string } | null {
  if (!cabecalho || cabecalho.length > 512) return null;
  let ts: string | undefined;
  let v1: string | undefined;
  for (const parte of cabecalho.split(',')) {
    const [chave, ...resto] = parte.split('=');
    const valor = resto.join('=').trim();
    const nome = chave?.trim().toLowerCase();
    if (nome === 'ts') ts = valor;
    else if (nome === 'v1') v1 = valor;
  }
  if (!ts || !/^\d{1,20}$/.test(ts) || !v1 || !/^[0-9a-fA-F]{64}$/.test(v1)) return null;
  return { ts, v1: v1.toLowerCase() };
}

export function manifestoAssinatura(dataId: string | undefined, requestId: string | undefined, ts: string): string {
  const partes: string[] = [];
  if (dataId) partes.push(`id:${dataId.toLowerCase()}`);
  if (requestId) partes.push(`request-id:${requestId}`);
  partes.push(`ts:${ts}`);
  return partes.join(';') + ';';
}

export function assinarManifesto(manifesto: string, segredo: string): string {
  return createHmac('sha256', segredo).update(manifesto, 'utf8').digest('hex');
}

export function assinaturaValida(entrada: {
  assinatura: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
  segredo: string | null | undefined;
}): boolean {
  if (!entrada.segredo) return false;
  const cabecalho = lerCabecalhoAssinatura(entrada.assinatura);
  if (!cabecalho) return false;
  const esperado = Buffer.from(assinarManifesto(manifestoAssinatura(entrada.dataId, entrada.requestId, cabecalho.ts), entrada.segredo), 'utf8');
  const recebido = Buffer.from(cabecalho.v1, 'utf8');
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}
