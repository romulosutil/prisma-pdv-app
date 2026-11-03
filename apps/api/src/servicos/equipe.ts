import { and, eq, gt, or } from 'drizzle-orm';
import { permissoesEfetivas, VinculosSchema } from '@pdv/shared';
import type { Db } from '../db/conexao';
import { lojas, operadores, usuarios } from '../db/schema';

export async function vinculosDoUsuario(db: Db, usuarioId: string, agora: Date) {
  const lista = await db.select({ operador: operadores, usuario: usuarios, loja: lojas }).from(operadores)
    .innerJoin(usuarios, eq(usuarios.id, operadores.usuarioId))
    .innerJoin(lojas, and(eq(lojas.id, operadores.lojaId), eq(lojas.contaId, operadores.contaId)))
    .where(and(eq(usuarios.id, usuarioId), or(eq(operadores.estado, 'ativo'),
      and(eq(operadores.estado, 'convidado'), gt(operadores.conviteExpiraEm, agora)))));
  return VinculosSchema.parse(lista.map(({ operador: o, usuario: u, loja: l }) => ({
    operadorId: o.id, usuarioId: u.id, contaId: o.contaId, lojaId: l.id, nomeLoja: l.nome,
    nome: o.nome, email: u.email, papel: o.papel, estado: o.estado,
    permissoes: permissoesEfetivas(o.papel, o.permissoes), conviteExpiraEm: o.conviteExpiraEm?.toISOString() ?? null,
  })));
}
