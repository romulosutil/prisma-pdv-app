import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ErroCanalEmail, lerMensagemCodigo, type MensagemCodigo } from './contrato';

export type EnvelopeCodigo = { versao: 1; iv: string; tag: string; conteudo: string };

const envelopeSchema = z.object({ versao: z.literal(1), iv: z.string(), tag: z.string(), conteudo: z.string() }).strict();
const contextoSchema = z.object({ id: z.uuid(), codigoId: z.uuid() }).strict();

function base64(valor: unknown, tamanhoMaximo: number): Buffer | undefined {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > Math.ceil(tamanhoMaximo / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(valor)) return undefined;
  const bytes = Buffer.from(valor, 'base64');
  return bytes.length <= tamanhoMaximo && bytes.toString('base64') === valor ? bytes : undefined;
}

function aad(contexto: { id: string; codigoId: string }): Buffer {
  return Buffer.from(JSON.stringify(['prisma-pdv:email-codigo', 1, contexto.id, contexto.codigoId]), 'utf8');
}

export function criarCifradorCodigo(chaveBase64: string): {
  cifrar(mensagem: MensagemCodigo): EnvelopeCodigo;
  decifrar(envelope: unknown, contexto: { id: string; codigoId: string }): MensagemCodigo;
} {
  const chave = base64(chaveBase64, 32);
  if (!chave || chave.length !== 32) throw new ErroCanalEmail('configuracao');
  return {
    cifrar(mensagem) {
      const normalizada = lerMensagemCodigo(mensagem);
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', chave, iv, { authTagLength: 16 });
      cipher.setAAD(aad(normalizada));
      const conteudo = Buffer.concat([cipher.update(JSON.stringify(normalizada), 'utf8'), cipher.final()]);
      if (conteudo.length > 4096) throw new ErroCanalEmail('mensagem_invalida');
      return { versao: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), conteudo: conteudo.toString('base64') };
    },
    decifrar(envelope, contexto) {
      try {
        const dados = envelopeSchema.parse(envelope);
        const ids = contextoSchema.parse(contexto);
        const iv = base64(dados.iv, 12);
        const tag = base64(dados.tag, 16);
        const conteudo = base64(dados.conteudo, 4096);
        if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !conteudo) throw new Error();
        const decipher = createDecipheriv('aes-256-gcm', chave, iv, { authTagLength: 16 });
        decipher.setAAD(aad(ids));
        decipher.setAuthTag(tag);
        const texto = Buffer.concat([decipher.update(conteudo), decipher.final()]).toString('utf8');
        const mensagem = lerMensagemCodigo(JSON.parse(texto));
        if (mensagem.id !== ids.id || mensagem.codigoId !== ids.codigoId) throw new Error();
        return mensagem;
      } catch {
        throw new ErroCanalEmail('permanente');
      }
    },
  };
}
