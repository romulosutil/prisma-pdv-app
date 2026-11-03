import { and, asc, desc, eq, lt, sql } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { SolicitacaoSuporteSchema, SolicitarSuporteSchema } from '@pdv/shared';
import { autorizacaoAtual, revalidarSessaoSync } from '../auth';
import type { Deps } from '../deps';
import type { Db } from '../db/conexao';
import { caixas, clientes, contas, eventosFiado, movimentosEstoque, operadores, produtos, solicitacoesSuporte, usuarios, vendas } from '../db/schema';
import { ErroApi } from '../erros';
import { carregarCaixas, carregarVendas, jsonIgual } from '../servicos/sync';

const requisicao = (s: typeof solicitacoesSuporte.$inferSelect) => ({ id: s.id, tipo: s.tipo, mensagem: s.mensagem, diagnostico: s.diagnostico, versaoPoliticas: s.versaoPoliticas });
const serializar = (s: typeof solicitacoesSuporte.$inferSelect) => SolicitacaoSuporteSchema.parse({ ...requisicao(s), estado: s.estado, resposta: s.resposta, criadoEm: s.criadoEm.toISOString(), atualizadoEm: s.atualizadoEm.toISOString() });
export function rotasSuporte(app: FastifyInstance, { db, relogio }: Deps) {
  const escopo = (r: FastifyRequest) => and(eq(solicitacoesSuporte.contaId, r.sessao.contaId), eq(solicitacoesSuporte.lojaId, r.sessao.lojaId), eq(solicitacoesSuporte.operadorId, r.sessao.operadorId));
  async function executar<T>(r: FastifyRequest, tarefa: (tx: Db) => Promise<T>) {
    return db.transaction(async tx => {
      await tx.select({ id: contas.id }).from(contas).where(eq(contas.id, r.sessao.contaId)).for('update');
      await revalidarSessaoSync(tx, r.sessaoId, r.sessao, relogio.agora());
      return tarefa(tx);
    });
  }
  app.get('/suporte/solicitacoes', async r => executar(r, async tx => {
    // Retenção aplicada também na leitura; não depende de o cliente apagar seu histórico.
    await tx.delete(solicitacoesSuporte).where(and(escopo(r), eq(solicitacoesSuporte.estado, 'concluido'), lt(solicitacoesSuporte.atualizadoEm, new Date(relogio.agora().getTime() - 90 * 86400000))));
    return (await tx.select().from(solicitacoesSuporte).where(escopo(r)).orderBy(desc(solicitacoesSuporte.criadoEm)).limit(100)).map(serializar);
  }));
  app.post('/suporte/solicitacoes', async r => {
    const req = SolicitarSuporteSchema.parse(r.body);
    return executar(r, async tx => {
      // Chave global protege de replay entre perfis sem revelar o protocolo alheio.
      const [anterior] = await tx.select().from(solicitacoesSuporte).where(eq(solicitacoesSuporte.id, req.id));
      if (anterior) {
        if (anterior.contaId !== r.sessao.contaId || anterior.lojaId !== r.sessao.lojaId || anterior.operadorId !== r.sessao.operadorId || !jsonIgual(requisicao(anterior), req)) throw new ErroApi(409, 'conflito', 'Identificador de solicitação já utilizado.');
        return serializar(anterior);
      }
      const abertas = await tx.$count(solicitacoesSuporte, and(escopo(r), sql`${solicitacoesSuporte.estado} <> 'concluido'`));
      if (abertas >= 10) throw new ErroApi(409, 'conflito', 'Acompanhe as solicitações abertas antes de enviar outra.');
      const agora = relogio.agora();
      const [s] = await tx.insert(solicitacoesSuporte).values({ ...req, ...r.sessao, id: req.id, criadoEm: agora, atualizadoEm: agora }).returning();
      return serializar(s!);
    });
  });
  app.get('/suporte/exportacao', async r => executar(r, async tx => {
    const { permissoes } = await autorizacaoAtual(tx, r.sessao.operadorId);
    const financeiro = permissoes.includes('conferir_caixas') ? undefined : r.sessao.operadorId;
    const [operador] = await tx.select().from(operadores).where(eq(operadores.id, r.sessao.operadorId));
    const [usuario] = operador?.usuarioId ? await tx.select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email }).from(usuarios).where(eq(usuarios.id, operador.usuarioId)) : [];
    const vs = await tx.select({ id: vendas.id }).from(vendas).where(and(eq(vendas.lojaId, r.sessao.lojaId), financeiro ? eq(vendas.operadorId, financeiro) : undefined));
    const cs = await tx.select({ id: caixas.id }).from(caixas).where(and(eq(caixas.lojaId, r.sessao.lojaId), financeiro ? eq(caixas.operadorId, financeiro) : undefined));
    const dadosVendas = [...(await carregarVendas(tx, vs.map(v => v.id))).values()].flatMap(m => m.entidade === 'venda' && m.operacao === 'upsert' ? [m.dados] : []);
    const clientesVisiveis = new Set(dadosVendas.flatMap(v => v.fiado ? [v.fiado.clienteId] : []));
    return {
      geradoEm: relogio.agora().toISOString(), escopo: { contaId: r.sessao.contaId, lojaId: r.sessao.lojaId, operadorId: r.sessao.operadorId, financeiro: financeiro ? 'proprio' : 'loja' },
      aviso: 'Somente dados confirmados e autorizados da loja selecionada. Exporte pendências no aparelho de origem. Não é um backup restaurável.',
      usuario: usuario ?? null, produtos: await tx.select().from(produtos).where(eq(produtos.lojaId, r.sessao.lojaId)).orderBy(asc(produtos.id)),
      vendas: dadosVendas, caixas: [...(await carregarCaixas(tx, cs.map(c => c.id))).values()].flatMap(m => m.entidade === 'caixa' && m.operacao === 'upsert' ? [m.dados] : []),
      clientes: permissoes.includes('vender') ? (await tx.select().from(clientes).where(eq(clientes.lojaId, r.sessao.lojaId))).filter(c => !financeiro || clientesVisiveis.has(c.id)) : [],
      movimentosEstoque: permissoes.includes('cadastrar_produto') ? await tx.select().from(movimentosEstoque).where(eq(movimentosEstoque.lojaId, r.sessao.lojaId)) : [],
      eventosFiado: await tx.select().from(eventosFiado).where(and(eq(eventosFiado.lojaId, r.sessao.lojaId), financeiro ? eq(eventosFiado.operadorId, financeiro) : undefined)),
      solicitacoes: (await tx.select().from(solicitacoesSuporte).where(escopo(r))).map(serializar),
    };
  }));
}
