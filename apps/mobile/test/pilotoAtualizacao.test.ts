// Piloto F12 (docs/roteiro-piloto-android.md, linha 46): atualizar o APK com venda, fechamento de turno e comando de
// gestão pendentes, e retomar cada perfil.
//
// Já existia e NÃO é repetido: sqliteSchema.test.ts (migração idempotente, atomicidade e recusa de versão futura),
// isolamentoConta.test.ts (isolamento de metadados por conta com ArmazenamentoMemoria), syncPersistencia.test.ts
// ("isola contas": produtos de duas contas) e sincronizacao.test.ts (descarta resposta de credencial anterior).
// Nenhum deles cobria venda + fechamento + comando de gestão de DOIS operadores e do dono ao mesmo tempo, atravessando a
// migração de schema, nem o conteúdo exato de cada envio (token x operador).
//
// Como "schema anterior" é simulado: o app grava os dados e o arquivo SQLite é rebaixado para PRAGMA user_version = 1
// (o schema 1 e o 2 têm as mesmas tabelas: a migração 2 só avança a versão, ver schema.ts). O app "novo" abre o arquivo e a
// migração real (inicializarSchema) o leva a VERSAO_SCHEMA.
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ComandoGestaoSchema, type Caixa, type ComandoGestao, type Sessao, type SyncPushReq, type SyncPushRes, type Venda } from '@pdv/shared';
import { ArmazenamentoEscopo } from '../src/dados/armazenamentoEscopo';
import { CarrinhoDuravel } from '../src/dados/carrinhoDuravel';
import { escopoDoPerfil, IdentidadeLocalSchema } from '../src/dados/estadoConta';
import { ArmazenamentoSqlite } from '../src/dados/sqlite/armazenamentoSqlite';
import { CheckoutSqlite } from '../src/dados/sqlite/checkoutSqlite';
import { VERSAO_SCHEMA } from '../src/dados/sqlite/schema';
import { RepositorioSyncSqlite } from '../src/dados/sqlite/syncSqlite';
import type { EntradaSync } from '../src/dados/syncTipos';
import type { Backend } from '../src/servicos/backend';
import { SincronizacaoServico } from '../src/servicos/sincronizacao';
import { ArmazenamentoMemoria } from './ambiente';
import { sqliteBanco } from './sqliteBanco';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const AGORA = '2026-11-16T12:00:00.000Z';
const base: Pick<Sessao, 'contaId' | 'lojaId' | 'aparelhoId'> = { contaId: id(1), lojaId: id(2), aparelhoId: id(3) };
const dono: Sessao = { ...base, token: 'token-dono', operadorId: id(10), papel: 'dono' };
const ana: Sessao = { ...base, token: 'token-ana', operadorId: id(20), papel: 'operador' };
const bruno: Sessao = { ...base, token: 'token-bruno', operadorId: id(30), papel: 'operador' };
const perfis = { dono, ana, bruno };
type Nome = keyof typeof perfis;
const nomes = Object.keys(perfis) as Nome[];

const comandos: Partial<Record<Nome, ComandoGestao>> = {
  ana: { acao: 'estoque', dados: { id: id(901), produtoId: id(902), tipo: 'entrada', quantidadeMilesimos: 5000, motivo: 'Reposição da Ana' } },
  dono: { acao: 'cliente', dados: { id: id(903), nome: 'Cliente do dono', contato: '11999990000' } },
};

const pastas: string[] = [];
const abertos: DatabaseSync[] = [];
afterEach(() => {
  for (const raw of abertos.splice(0)) { try { raw.close(); } catch { /* já fechado */ } }
  for (const pasta of pastas.splice(0)) rmSync(pasta, { recursive: true, force: true });
});

interface Aparelho { caminho: string; legado: ArmazenamentoMemoria }
function aparelho(): Aparelho {
  const pasta = mkdtempSync(join(tmpdir(), 'pdv-atualizacao-')); pastas.push(pasta);
  return { caminho: join(pasta, 'dados.sqlite'), legado: new ArmazenamentoMemoria() };
}

/** Uma instalação do app (versão do APK) sobre o mesmo arquivo e o mesmo armazenamento legado. */
function instalar(a: Aparelho, primeiroId: number) {
  const raw = new DatabaseSync(a.caminho); abertos.push(raw);
  let n = primeiroId; const novoId = () => id(++n);
  const armazenamento = new ArmazenamentoSqlite(async () => sqliteBanco(raw), a.legado);
  const agora = () => new Date(AGORA);
  armazenamento.configurarSync(novoId, agora);
  const repositorio = new RepositorioSyncSqlite(armazenamento, novoId, agora);
  let caixaId: string | null = null;
  const carrinho = new CarrinhoDuravel();
  carrinho.configurar(new CheckoutSqlite(armazenamento, novoId), { novoId, agora: () => AGORA, caixaId: () => caixaId });
  let atual: Sessao | null = null; let identidade = IdentidadeLocalSchema.parse(dono);
  const escopo = new ArmazenamentoEscopo(a.legado, () => identidade, true);
  return {
    raw, armazenamento, repositorio, carrinho, escopo, agora,
    /** Retoma um perfil: grava identidade e (se `comSessao`) a credencial, como o login/restauração faria. */
    async retomar(nome: Nome, comSessao = true) {
      const s = perfis[nome];
      identidade = IdentidadeLocalSchema.parse(s); atual = comSessao ? s : null;
      await a.legado.gravar('conta', comSessao ? { sessao: s } : { identidade, sessao: null, perfil: null });
      caixaId = null;
    },
    sessao: () => atual, vinculo: () => escopoDoPerfil(identidade),
    vincularCaixa: (c: string | null) => { caixaId = c; },
    versao: () => (raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    fechar: () => raw.close(),
  };
}
type Instalacao = ReturnType<typeof instalar>;

const caixaDe = (s: Sessao, n: number, fechar: boolean): Caixa => ({ id: id(n), lojaId: s.lojaId, aparelhoId: s.aparelhoId, operadorId: s.operadorId,
  versaoContrato: 2, contaId: s.contaId, abertura: { em: AGORA, trocoInicialCentavos: 0 },
  fechamento: fechar ? { em: '2026-11-16T13:00:00.000Z', esperadoCentavos: 1500, contadoCentavos: 1500 } : null, movimentos: [] });

/** Cada perfil termina o dia sem rede: turno, uma venda de 15,00 em dinheiro, fechamento; o resto fica na fila. */
async function expediente(app: Instalacao, nome: Nome, n: number) {
  await app.retomar(nome);
  await app.armazenamento.gravar('caixas', [caixaDe(perfis[nome], n, false)]);
  app.vincularCaixa(id(n));
  await app.carrinho.adicionarAvulso(1500, `Venda de ${nome}`);
  await app.carrinho.adicionarParcela({ meio: 'dinheiro', valorCentavos: 1500 });
  await app.carrinho.concluir();
  await app.carrinho.limpar();
  await app.armazenamento.gravar('caixas', [caixaDe(perfis[nome], n, true)]);
  const comando = comandos[nome];
  if (comando) await app.escopo.gravar('operacaoGestaoPendente', comando);
}

const resumo = (e: EntradaSync) => ({ id: e.mutacao.id, entidade: e.mutacao.entidade, operacao: e.mutacao.operacao, dados: e.mutacao.dados });

/** Servidor que registra, para cada ID de mutação, com quais tokens ele chegou. */
function servidor() {
  const porId = new Map<string, Set<string>>();
  const lotes: { token: string; ids: string[] }[] = [];
  const enviarMutacoes = async (req: SyncPushReq, token?: string): Promise<SyncPushRes> => {
    lotes.push({ token: token ?? '', ids: req.mutacoes.map((m) => m.id) });
    for (const m of req.mutacoes) porId.set(m.id, new Set([...(porId.get(m.id) ?? []), token ?? '']));
    return { aceitas: req.mutacoes.map((m) => m.id), rejeitadas: [], cursor: '1' };
  };
  const backend = { modo: 'http', enviarMutacoes, receberMudancas: async () => ({ cursor: '0', mudancas: [] }) } as unknown as Backend;
  return { backend, porId, lotes };
}
function sincronizador(app: Instalacao, srv: ReturnType<typeof servidor>) {
  return new SincronizacaoServico({ repositorio: app.repositorio, backend: srv.backend, sessao: app.sessao, vinculo: app.vinculo, agora: app.agora, aplicarLocal: (t) => t() });
}

/** Grava os três perfis num banco v1 e devolve o que cada um deixou pendente. */
async function prepararAparelhoAntigo(a: Aparelho) {
  const antigo = instalar(a, 1000);
  await expediente(antigo, 'dono', 70); await expediente(antigo, 'ana', 71); await expediente(antigo, 'bruno', 72);
  const pendencias = {} as Record<Nome, ReturnType<typeof resumo>[]>;
  for (const nome of nomes) { await antigo.retomar(nome); pendencias[nome] = (await antigo.repositorio.estado()).entradas.map(resumo); }
  antigo.raw.exec('PRAGMA user_version = 1'); // o APK anterior só conhecia o schema 1
  expect(antigo.versao()).toBe(1);
  antigo.fechar();
  return pendencias;
}

describe('F12: atualização do APK com pendências de venda, fechamento e gestão', () => {
  it('F12: a migração de schema preserva IDs, valores e autoria de cada perfil', async () => {
    const a = aparelho();
    const pendencias = await prepararAparelhoAntigo(a);
    for (const nome of nomes) {
      expect(pendencias[nome].map((p) => p.entidade).sort()).toEqual(['caixa', 'caixa', 'venda']); // abertura, fechamento, venda
    }
    const novo = instalar(a, 5000);
    await novo.retomar('ana');
    await novo.repositorio.estado(); // primeiro acesso ao banco dispara a migração
    expect(novo.versao()).toBe(VERSAO_SCHEMA);
    expect(VERSAO_SCHEMA).toBeGreaterThan(1);

    for (const nome of nomes) {
      await novo.retomar(nome);
      const depois = (await novo.repositorio.estado()).entradas.map(resumo);
      expect(depois).toEqual(pendencias[nome]); // mesmos IDs, mesma ordem, mesmo conteúdo
      const s = perfis[nome];
      for (const p of depois) expect(p.dados).toMatchObject({ operadorId: s.operadorId, aparelhoId: s.aparelhoId, lojaId: s.lojaId });
      const venda = depois.find((p) => p.entidade === 'venda')!.dados as Venda;
      expect(venda.totalCentavos).toBe(1500);
      expect(venda.pagamentos.map((p) => [p.meio, p.valorCentavos])).toEqual([['dinheiro', 1500]]);
      const fechamento = depois.map((p) => p.dados as Caixa).find((c) => 'fechamento' in c && c.fechamento);
      expect(fechamento?.fechamento).toMatchObject({ esperadoCentavos: 1500, contadoCentavos: 1500 });
      const guardadas = await novo.armazenamento.obter<{ vendas: Venda[] }>('vendas');
      expect(guardadas?.vendas.map((v) => v.id)).toEqual([venda.id]);
    }
    // Reabrir o app novo uma segunda vez (já migrado) é idempotente.
    novo.fechar();
    const reaberto = instalar(a, 6000);
    await reaberto.retomar('bruno');
    expect((await reaberto.repositorio.estado()).entradas.map(resumo)).toEqual(pendencias.bruno);
    expect(reaberto.versao()).toBe(VERSAO_SCHEMA);
  });

  it('F12: pendências de um perfil não aparecem para outro, nem em venda, fila ou comando de gestão', async () => {
    const a = aparelho();
    const pendencias = await prepararAparelhoAntigo(a);
    const novo = instalar(a, 5000);
    for (const nome of nomes) {
      await novo.retomar(nome);
      const minhas = (await novo.repositorio.estado()).entradas.map((e) => e.mutacao.id);
      const dosOutros = nomes.filter((n) => n !== nome).flatMap((n) => pendencias[n].map((p) => p.id));
      expect(minhas.filter((x) => dosOutros.includes(x))).toEqual([]);
      expect(minhas).toEqual(pendencias[nome].map((p) => p.id));
      const vendas = (await novo.armazenamento.obter<{ vendas: Venda[] }>('vendas'))!.vendas;
      expect(vendas.map((v) => v.operadorId)).toEqual([perfis[nome].operadorId]);
      const caixas = (await novo.armazenamento.obter<Caixa[]>('caixas'))!;
      expect(caixas.map((c) => c.operadorId)).toEqual([perfis[nome].operadorId]);
      // Comando de gestão pendente: do perfil que o criou, com o mesmo ID; invisível aos demais.
      const pendente = await novo.escopo.obter<ComandoGestao>('operacaoGestaoPendente');
      const esperado = comandos[nome];
      if (esperado) { expect(ComandoGestaoSchema.parse(pendente)).toEqual(esperado); expect(pendente?.dados.id).toBe(esperado.dados.id); }
      else expect(pendente).toBeNull();
    }
  });

  it('F12: nenhum envio sai com o token ou o operador de outro perfil', async () => {
    const a = aparelho();
    const pendencias = await prepararAparelhoAntigo(a);
    const novo = instalar(a, 5000);
    const srv = servidor();

    // Bruno entra primeiro; as pendências de Ana e do dono continuam intactas.
    await novo.retomar('bruno');
    await sincronizador(novo, srv).sincronizar({ forcar: true });
    expect((await novo.repositorio.estado()).entradas).toEqual([]);
    await novo.retomar('ana');
    expect((await novo.repositorio.estado()).entradas.map(resumo)).toEqual(pendencias.ana);
    await novo.retomar('dono');
    expect((await novo.repositorio.estado()).entradas.map(resumo)).toEqual(pendencias.dono);

    // Ana volta sem credencial (reautenticação): nada sai, nada se perde.
    await novo.retomar('ana', false);
    const lotesAntes = srv.lotes.length;
    await sincronizador(novo, srv).sincronizar({ forcar: true });
    expect(srv.lotes).toHaveLength(lotesAntes);
    expect((await novo.repositorio.estado()).entradas.map(resumo)).toEqual(pendencias.ana);
    await novo.retomar('ana');
    await sincronizador(novo, srv).sincronizar({ forcar: true });
    await novo.retomar('dono');
    await sincronizador(novo, srv).sincronizar({ forcar: true });

    for (const nome of nomes) {
      for (const p of pendencias[nome]) expect([...srv.porId.get(p.id) ?? []]).toEqual([perfis[nome].token]);
    }
    const todos = nomes.flatMap((n) => pendencias[n].map((p) => p.id));
    expect(srv.lotes.flatMap((l) => l.ids).sort()).toEqual([...todos].sort()); // cada ID chegou uma única vez
    for (const lote of srv.lotes) {
      const dono = nomes.find((n) => perfis[n].token === lote.token)!;
      expect(lote.ids.every((x) => pendencias[dono].some((p) => p.id === x))).toBe(true);
    }
    // Depois do ACK, o comando de gestão continua pertencendo só ao perfil que o criou.
    await novo.retomar('ana');
    expect((await novo.repositorio.estado()).entradas).toEqual([]);
    expect(ComandoGestaoSchema.parse(await novo.escopo.obter('operacaoGestaoPendente'))).toEqual(comandos.ana);
    await novo.retomar('bruno');
    expect(await novo.escopo.obter('operacaoGestaoPendente')).toBeNull();
  });
});
