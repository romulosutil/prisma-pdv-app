import { criarCifradorCodigo } from '../src/email/cifrador';
import type { EmissaoCodigo } from '../src/email/tiposEntrega';
import type { FastifyInstance } from 'fastify';
import type { CriarContaReq } from '@pdv/shared';
import type { Db } from '../src/db/conexao';
import { entregasCodigo } from '../src/db/schema';
import { eq } from 'drizzle-orm';

export const emissaoTeste: EmissaoCodigo = { modo: 'email', dominioRemetente: 'example.com', chaves: { ativaId: 'teste', cifradores: new Map([['teste', criarCifradorCodigo(Buffer.alloc(32, 7).toString('base64'))]]) } };

/** Lê a caixa postal cifrada do fixture; não há bypass de prova na configuração email. */
export async function cadastroComProva(app: FastifyInstance, db: Db, dados: CriarContaReq) {
  const resposta = await app.inject({ method: 'POST', url: '/auth/cadastro/codigo', payload: { email: dados.email, aparelhoId: dados.aparelhoId } });
  if (resposta.statusCode !== 200) throw new Error('Fixture não emitiu desafio de cadastro.');
  const desafioCadastroId = resposta.json().desafioId as string;
  const [entrega] = await db.select().from(entregasCodigo).where(eq(entregasCodigo.codigoId, desafioCadastroId));
  if (!entrega || emissaoTeste.modo !== 'email') throw new Error('Fixture sem entrega.');
  const mensagem = emissaoTeste.chaves.cifradores.get('teste')!.decifrar(entrega.envelope, { id: entrega.id, codigoId: entrega.codigoId });
  return { ...dados, desafioCadastroId, codigoCadastro: mensagem.codigo };
}
