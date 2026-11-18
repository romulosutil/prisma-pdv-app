import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import type { EnvelopePagamento } from '../db/schema';

/** Campo cifrado: o AAD amarra o envelope à loja, à conexão e ao campo (um envelope não pode ser trocado de lugar). */
export interface ContextoCifra {
  lojaId: string;
  conexaoId: string;
  campo: 'token' | 'segredo_webhook';
}

export interface CifradorPagamentos {
  cifrar(texto: string, contexto: ContextoCifra): EnvelopePagamento;
  decifrar(envelope: unknown, contexto: ContextoCifra): string;
}

/** Erro sem conteúdo: nunca carrega a credencial, a chave nem o envelope. */
export class ErroCifraPagamentos extends Error {
  constructor(mensagem = 'Credencial de pagamento indisponível.') {
    super(mensagem);
    this.name = 'ErroCifraPagamentos';
  }
}

const envelopeSchema = z.object({ versao: z.literal(1), iv: z.string(), tag: z.string(), conteudo: z.string() }).strict();
const TAMANHO_MAXIMO = 2048;

function base64(valor: unknown, tamanhoMaximo: number): Buffer | undefined {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > Math.ceil(tamanhoMaximo / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(valor)) return undefined;
  const bytes = Buffer.from(valor, 'base64');
  return bytes.length <= tamanhoMaximo && bytes.toString('base64') === valor ? bytes : undefined;
}

/** Chave em base64 com exatamente 32 bytes (AES-256). */
export function chavePagamentosValida(chaveBase64: string): boolean {
  return base64(chaveBase64, 32)?.length === 32;
}

function aad(c: ContextoCifra): Buffer {
  return Buffer.from(JSON.stringify(['prisma-pdv:pagamentos', 1, c.lojaId, c.conexaoId, c.campo]), 'utf8');
}

/** AES-256-GCM com IV aleatório de 12 bytes, como o cifrador do e-mail (`email/cifrador.ts`). */
export function criarCifradorPagamentos(chaveBase64: string): CifradorPagamentos {
  const chave = base64(chaveBase64, 32);
  if (!chave || chave.length !== 32) throw new ErroCifraPagamentos('PDV_PAGAMENTOS_CHAVE deve ser base64 de 32 bytes.');
  return {
    cifrar(texto, contexto) {
      if (!texto || Buffer.byteLength(texto, 'utf8') > TAMANHO_MAXIMO) throw new ErroCifraPagamentos();
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', chave, iv, { authTagLength: 16 });
      cipher.setAAD(aad(contexto));
      const conteudo = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
      return { versao: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), conteudo: conteudo.toString('base64') };
    },
    decifrar(envelope, contexto) {
      try {
        const dados = envelopeSchema.parse(envelope);
        const iv = base64(dados.iv, 12);
        const tag = base64(dados.tag, 16);
        const conteudo = base64(dados.conteudo, TAMANHO_MAXIMO);
        if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !conteudo) throw new Error();
        const decipher = createDecipheriv('aes-256-gcm', chave, iv, { authTagLength: 16 });
        decipher.setAAD(aad(contexto));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(conteudo), decipher.final()]).toString('utf8');
      } catch {
        throw new ErroCifraPagamentos();
      }
    },
  };
}
