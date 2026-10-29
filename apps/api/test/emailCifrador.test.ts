import { createCipheriv, createDecipheriv } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { criarCifradorCodigo } from '../src/email/cifrador';
import { ErroCanalEmail, lerMensagemCodigo } from '../src/email/contrato';

const chave = Buffer.alloc(32, 7).toString('base64');
const mensagem = {
  id: '5de08014-46b4-4bef-9ff8-8fb86ed9d8d1',
  codigoId: '5de08014-46b4-4bef-9ff8-8fb86ed9d8d2',
  destinatario: ' Teste@Example.com ', codigo: '123456', expiraEm: '2026-10-29T12:00:00Z',
};
const contexto = { id: mensagem.id, codigoId: mensagem.codigoId };

function erroLocal(fn: () => unknown, tipo: string, segredos: string[] = []) {
  try { fn(); throw new Error('Operação deveria falhar'); } catch (erro) {
    expect(erro).toBeInstanceOf(ErroCanalEmail);
    expect((erro as ErroCanalEmail).tipo).toBe(tipo);
    expect(erro).not.toHaveProperty('cause');
    for (const segredo of segredos) expect(String((erro as Error).stack)).not.toContain(segredo);
  }
}

describe('cifrador de código', () => {
  it('cifra todos os campos e recupera a mensagem normalizada com IV e tag corretos', () => {
    const cifrador = criarCifradorCodigo(chave);
    const envelope = cifrador.cifrar(mensagem);
    expect(Object.keys(envelope).sort()).toEqual(['conteudo', 'iv', 'tag', 'versao']);
    expect(envelope.versao).toBe(1);
    expect(Buffer.from(envelope.iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(envelope.tag, 'base64')).toHaveLength(16);
    const normalizada = { ...mensagem, destinatario: 'teste@example.com', expiraEm: '2026-10-29T12:00:00.000Z' };
    expect(cifrador.decifrar(envelope, contexto)).toEqual(normalizada);
    for (const valor of Object.values(mensagem)) expect(JSON.stringify(envelope)).not.toContain(valor);
    for (const valor of Object.values(normalizada)) expect(JSON.stringify(envelope)).not.toContain(valor);
    const outro = cifrador.cifrar(mensagem);
    expect(outro.iv).not.toBe(envelope.iv);
    expect(outro).not.toEqual(envelope);
  });

  it('permite decifrar independentemente com AES-256-GCM e AAD especificado', () => {
    const envelope = criarCifradorCodigo(chave).cifrar(mensagem);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(chave, 'base64'), Buffer.from(envelope.iv, 'base64'), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(JSON.stringify(['prisma-pdv:email-codigo', 1, contexto.id, contexto.codigoId])));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const texto = Buffer.concat([decipher.update(Buffer.from(envelope.conteudo, 'base64')), decipher.final()]).toString('utf8');
    expect(JSON.parse(texto)).toEqual({ ...mensagem, destinatario: 'teste@example.com', expiraEm: '2026-10-29T12:00:00.000Z' });
  });

  it.each(['', 'abc', Buffer.alloc(31).toString('base64'), Buffer.alloc(33).toString('base64'), undefined, chave.replace(/=+$/, ''), `${chave}\n`])('recusa chave inválida', invalida => {
    erroLocal(() => criarCifradorCodigo(invalida as string), 'configuracao', invalida ? [invalida] : []);
  });

  it('recusa mensagem inválida sem refletir conteúdo', () => {
    erroLocal(() => criarCifradorCodigo(chave).cifrar({ ...mensagem, codigo: 'segredo' }), 'mensagem_invalida', ['segredo']);
  });

  it('recusa envelope, contexto e autenticação adulterados sem revelar dados', () => {
    const cifrador = criarCifradorCodigo(chave);
    const envelope = cifrador.cifrar(mensagem);
    const alterado = (valor: string) => { const b = Buffer.from(valor, 'base64'); b[0] = b[0]! ^ 1; return b.toString('base64'); };
    const casos: unknown[] = [null, {}, { ...envelope, extra: true }, { ...envelope, versao: 2 },
      { ...envelope, iv: 'abc' }, { ...envelope, iv: Buffer.alloc(11).toString('base64') }, { ...envelope, iv: alterado(envelope.iv) },
      { ...envelope, tag: Buffer.alloc(15).toString('base64') }, { ...envelope, tag: alterado(envelope.tag) },
      { ...envelope, conteudo: '' }, { ...envelope, conteudo: alterado(envelope.conteudo) },
      { ...envelope, conteudo: Buffer.alloc(4097).toString('base64') }];
    for (const caso of casos) erroLocal(() => cifrador.decifrar(caso, contexto), 'permanente', [chave, mensagem.codigo, mensagem.destinatario, envelope.conteudo]);
    erroLocal(() => cifrador.decifrar(envelope, { ...contexto, id: 'invalido' }), 'permanente');
    erroLocal(() => cifrador.decifrar(envelope, { ...contexto, id: mensagem.codigoId }), 'permanente');
    erroLocal(() => cifrador.decifrar(envelope, { ...contexto, codigoId: mensagem.id }), 'permanente');
    erroLocal(() => criarCifradorCodigo(Buffer.alloc(32, 8).toString('base64')).decifrar(envelope, contexto), 'permanente');
  });

  it('recusa base64 não canônico em cada campo mesmo quando decodificável', () => {
    const cifrador = criarCifradorCodigo(chave);
    const envelope = cifrador.cifrar(mensagem);
    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const posicao = envelope.tag.length - 3;
    const indice = alfabeto.indexOf(envelope.tag[posicao]!);
    const tag = envelope.tag.slice(0, posicao) + alfabeto[indice + 1] + envelope.tag.slice(posicao + 1);
    expect(Buffer.from(tag, 'base64')).toEqual(Buffer.from(envelope.tag, 'base64'));
    for (const caso of [{ ...envelope, iv: `${envelope.iv}\n` }, { ...envelope, tag }, { ...envelope, conteudo: `${envelope.conteudo}\n` }]) {
      erroLocal(() => cifrador.decifrar(caso, contexto), 'permanente');
    }
  });

  it('recusa mensagem válida cujo ciphertext excederia 4096 bytes', () => {
    const longa = { ...mensagem, destinatario: `${'a'.repeat(4100)}@example.com` };
    expect(lerMensagemCodigo(longa).destinatario).toBe(longa.destinatario);
    erroLocal(() => criarCifradorCodigo(chave).cifrar(longa), 'mensagem_invalida');
  });

  it('recusa payload autenticado com IDs diferentes do contexto', () => {
    const iv = Buffer.alloc(12, 3);
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(chave, 'base64'), iv);
    cipher.setAAD(Buffer.from(JSON.stringify(['prisma-pdv:email-codigo', 1, contexto.id, contexto.codigoId])));
    const conteudo = Buffer.concat([cipher.update(JSON.stringify({ ...mensagem, id: mensagem.codigoId })), cipher.final()]);
    const envelope = { versao: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), conteudo: conteudo.toString('base64') };
    erroLocal(() => criarCifradorCodigo(chave).decifrar(envelope, contexto), 'permanente');
  });
});
