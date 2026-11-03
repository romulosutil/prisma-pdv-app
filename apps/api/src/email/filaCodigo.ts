import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, lte, or, sql } from 'drizzle-orm';
import type { Relogio } from '@pdv/shared';
import { sha256 } from '../auth';
import type { Db } from '../db/conexao';
import { codigosLogin, contas, entregasCodigo, operadores, usuarios } from '../db/schema';
import { ErroCanalEmail, type MensagemCodigo } from './contrato';
import type { ChavesCodigo, EmissaoCodigo, MotivoEntregaCodigo, OpcoesEntregaCodigo, ResumoEntregaCodigo } from './tiposEntrega';

const ativos = ['pendente', 'enviando'] as const;
const limpar = { chaveId: null, envelope: null, leaseToken: null, leaseExpiraEm: null };
const ordemNova = sql<number>`nextval(pg_get_serial_sequence('entregas_codigo', 'ordem_fila'))`;

export async function enfileirarCodigo(tx: Db, chaves: ChavesCodigo, dados: { contaId: string; codigoId: string; email: string; codigo: string; dominioRemetente: string; criadoEm: Date; expiraEm: Date }): Promise<string> {
  const id = randomUUID();
  const cifrador = chaves.cifradores.get(chaves.ativaId);
  if (!cifrador) throw new ErroCanalEmail('configuracao');
  const envelope = cifrador.cifrar({ id, codigoId: dados.codigoId, destinatario: dados.email, codigo: dados.codigo, expiraEm: dados.expiraEm.toISOString() });
  await tx.insert(entregasCodigo).values({ id, contaId: dados.contaId, codigoId: dados.codigoId, dominioRemetente: dados.dominioRemetente, estado: 'pendente', chaveId: chaves.ativaId, envelope, criadoEm: dados.criadoEm, atualizadoEm: dados.criadoEm, expiraEm: dados.expiraEm, proximaTentativaEm: dados.criadoEm });
  return id;
}

export async function cancelarEntregasDaConta(tx: Db, contaId: string, agora: Date): Promise<void> {
  await tx.update(entregasCodigo).set({ ...limpar, estado: 'cancelada', motivo: 'substituida', atualizadoEm: agora, encerradoEm: agora }).where(and(eq(entregasCodigo.contaId, contaId), inArray(entregasCodigo.estado, ativos)));
}
export async function cancelarEntregaDoCodigo(tx: Db, codigoId: string, agora: Date, motivo: 'usado' | 'esgotado' | 'substituida'): Promise<void> {
  await tx.update(entregasCodigo).set({ ...limpar, estado: 'cancelada', motivo, atualizadoEm: agora, encerradoEm: agora }).where(and(eq(entregasCodigo.codigoId, codigoId), inArray(entregasCodigo.estado, ativos)));
}

async function travar(db: Db, contaId: string, id: string) {
  const [conta] = await db.select().from(contas).where(eq(contas.id, contaId)).for('update');
  const [entrega] = await db.select().from(entregasCodigo).where(eq(entregasCodigo.id, id)).for('update');
  return { conta, entrega };
}
async function terminal(db: Db, id: string, agora: Date, estado: 'cancelada' | 'falhou' | 'aceita', motivo: MotivoEntregaCodigo | null) {
  await db.update(entregasCodigo).set({ ...limpar, estado, motivo, atualizadoEm: agora, encerradoEm: agora }).where(eq(entregasCodigo.id, id));
}
export async function encerrarEntregasExpiradas(db: Db, relogio: Relogio): Promise<number> {
  const candidatas = await db.select({ id: entregasCodigo.id, contaId: entregasCodigo.contaId }).from(entregasCodigo).where(inArray(entregasCodigo.estado, ativos));
  let total = 0;
  for (const item of candidatas) await db.transaction(async tx => {
    const { entrega } = await travar(tx, item.contaId, item.id);
    const agora = relogio.agora();
    if (entrega && ativos.includes(entrega.estado as typeof ativos[number]) && entrega.expiraEm <= agora) { await terminal(tx, item.id, agora, 'cancelada', 'expirado'); total++; }
  });
  return total;
}
export async function validarPendenciasEntrega(db: Db, emissao: EmissaoCodigo, relogio: Relogio): Promise<void> {
  const pendencias = await db.select().from(entregasCodigo).where(inArray(entregasCodigo.estado, ativos));
  const agora = relogio.agora();
  if (pendencias.some(e => e.expiraEm > agora && (emissao.modo === 'desenvolvimento' || !e.chaveId || !emissao.chaves.cifradores.has(e.chaveId) || e.dominioRemetente !== emissao.dominioRemetente))) throw new ErroCanalEmail('configuracao');
}

export async function processarEntregasCodigo(db: Db, opcoes: OpcoesEntregaCodigo): Promise<ResumoEntregaCodigo> {
  const limite = opcoes.limite ?? 20;
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) throw new ErroCanalEmail('configuracao');
  const resumo: ResumoEntregaCodigo = { aceitas: 0, retentativas: 0, canceladas: 0, falhas: 0, bloqueadas: 0, ignoradas: 0 };
  try {
    const agora = opcoes.relogio.agora();
    const candidatas = await db.select({ id: entregasCodigo.id, contaId: entregasCodigo.contaId }).from(entregasCodigo).where(or(and(eq(entregasCodigo.estado, 'pendente'), lte(entregasCodigo.proximaTentativaEm, agora)), and(eq(entregasCodigo.estado, 'enviando'), lte(entregasCodigo.leaseExpiraEm, agora)))).orderBy(asc(entregasCodigo.ordemFila), asc(entregasCodigo.id)).limit(limite);
    for (const item of candidatas) {
      const claim = await db.transaction(async tx => {
        const { conta, entrega: e } = await travar(tx, item.contaId, item.id);
        const now = opcoes.relogio.agora();
        if (!e || !((e.estado === 'pendente' && e.proximaTentativaEm <= now) || (e.estado === 'enviando' && e.leaseExpiraEm && e.leaseExpiraEm <= now))) return { tipo: 'ignoradas' as const };
        const [otp] = await tx.select().from(codigosLogin).where(eq(codigosLogin.id, e.codigoId));
        const [destinatario] = otp ? await tx.select({ email: usuarios.email }).from(usuarios)
          .innerJoin(operadores, eq(operadores.usuarioId, usuarios.id))
          .where(and(eq(usuarios.email, otp.email), eq(operadores.contaId, e.contaId),
            or(eq(operadores.estado, 'ativo'), eq(operadores.estado, 'convidado')))) : [];
        let motivo: MotivoEntregaCodigo | null = e.expiraEm <= now || (otp && otp.expiraEm <= now) ? 'expirado' : otp?.usadoEm ? 'usado' : otp && otp.tentativas >= 5 ? 'esgotado' : !otp || !conta || (!destinatario && otp.email !== conta.email) || otp.criadoEm.getTime() !== e.criadoEm.getTime() || otp.expiraEm.getTime() !== e.expiraEm.getTime() ? 'substituida' : null;
        if (motivo) { await terminal(tx, e.id, now, 'cancelada', motivo); return { tipo: 'canceladas' as const }; }
        if (e.tentativas >= 5) { await terminal(tx, e.id, now, 'falhou', 'tentativas_esgotadas'); return { tipo: 'falhas' as const }; }
        let mensagem: MensagemCodigo | undefined;
        const cifrador = e.chaveId && opcoes.chaves.cifradores.get(e.chaveId);
        if (!cifrador) motivo = 'chave_ausente';
        else if (e.dominioRemetente !== opcoes.dominioRemetente) motivo = 'canal_incompativel';
        else try { mensagem = cifrador.decifrar(e.envelope, { id: e.id, codigoId: e.codigoId }); } catch { motivo = 'payload_invalido'; }
        if (mensagem && (mensagem.destinatario !== otp!.email || mensagem.expiraEm !== e.expiraEm.toISOString() || sha256(`${mensagem.destinatario}:${mensagem.codigo}`) !== otp!.codigoHash)) motivo = 'payload_invalido';
        if (motivo || !mensagem) { await tx.update(entregasCodigo).set({ estado: 'pendente', leaseToken: null, leaseExpiraEm: null, motivo: motivo ?? 'payload_invalido', atualizadoEm: now, ordemFila: ordemNova }).where(eq(entregasCodigo.id, e.id)); return { tipo: 'bloqueadas' as const }; }
        const token = randomUUID();
        await tx.update(entregasCodigo).set({ estado: 'enviando', tentativas: e.tentativas + 1, leaseToken: token, leaseExpiraEm: new Date(now.getTime() + 60000), atualizadoEm: now, motivo: null }).where(eq(entregasCodigo.id, e.id));
        return { tipo: 'claim' as const, token, mensagem };
      });
      if (claim.tipo !== 'claim') { resumo[claim.tipo]++; continue; }
      let erro: unknown;
      let falhou = false;
      try { await opcoes.canal.enviar(claim.mensagem); } catch (e) { falhou = true; erro = e; }
      const resultado = await db.transaction(async tx => {
        const { entrega: e } = await travar(tx, item.contaId, item.id);
        const now = opcoes.relogio.agora();
        if (!e || e.estado !== 'enviando' || e.leaseToken !== claim.token || !e.leaseExpiraEm || e.leaseExpiraEm <= now) return 'ignoradas' as const;
        if (!falhou) { await terminal(tx, e.id, now, 'aceita', null); return 'aceitas' as const; }
        if (erro instanceof ErroCanalEmail && erro.tipo === 'permanente') { await terminal(tx, e.id, now, 'falhou', 'permanente'); return 'falhas' as const; }
        if (e.tentativas >= 5) { await terminal(tx, e.id, now, 'falhou', 'tentativas_esgotadas'); return 'falhas' as const; }
        const delay = [5000, 30000, 120000, 300000][e.tentativas - 1]!;
        await tx.update(entregasCodigo).set({ estado: 'pendente', leaseToken: null, leaseExpiraEm: null, motivo: 'temporario', atualizadoEm: now, proximaTentativaEm: new Date(Math.min(e.expiraEm.getTime(), now.getTime() + delay)), ordemFila: ordemNova }).where(eq(entregasCodigo.id, e.id));
        return 'retentativas' as const;
      });
      resumo[resultado]++;
    }
    return resumo;
  } catch { throw new ErroCanalEmail('temporario'); }
}
