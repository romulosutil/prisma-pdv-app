import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { gerarId, type Sessao } from '@pdv/shared';
import { criarSessao } from '../src/auth';
import { aparelhos, eventosFiado, movimentosEstoque, operadores, produtos, usuarios } from '../src/db/schema';
import type { Conexao } from '../src/db/conexao';
import { abrirBanco, chamar, contaEmTeste, criarConta, criarAmbiente, enviar, INICIO, NUMEROS, mutacao, produto, venda, type Ambiente } from './ajuda';

let banco: Conexao, amb: Ambiente;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });
const post = (s: Sessao, url: string, corpo: unknown) => chamar(amb, 'POST', url, { token: s.token, corpo });
const get = (s: Sessao, url: string) => chamar(amb, 'GET', url, { token: s.token });
async function funcionario(dono: Sessao) {
  const usuarioId = gerarId(), operadorId = gerarId(), aparelhoId = gerarId();
  await amb.db.insert(usuarios).values({ id: usuarioId, email: `${usuarioId}@exemplo.com`, nome: 'Ana', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(operadores).values({ id: operadorId, usuarioId, contaId: dono.contaId, lojaId: dono.lojaId, nome: 'Ana', papel: 'operador', criadoEm: INICIO, atualizadoEm: INICIO });
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: dono.contaId, lojaId: dono.lojaId, nome: 'Ana', criadoEm: INICIO, ultimoAcessoEm: INICIO });
  return criarSessao(amb.db, { contaId: dono.contaId, lojaId: dono.lojaId, operadorId, aparelhoId }, INICIO);
}
async function prepararFiado(s: Sessao) {
  const clienteId = gerarId();
  expect((await post(s, '/clientes', { id: clienteId, nome: 'João', contato: 'Contato informado' })).status).toBe(200);
  const cx = (await post(s, '/caixas/reservar', { id: gerarId(), trocoInicialCentavos: 1000 })).corpo;
  const v = venda(s, { caixaId: cx.id, fiado: { clienteId, vencimento: '2026-03-09', valorCentavos: 500 }, pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 200, trocoCentavos: 0 }] });
  expect((await enviar(amb, s, [mutacao('venda', v)])).corpo.rejeitadas).toEqual([]);
  return { v, cx, clienteId };
}

it('baixas simultâneas somam, replay não duplica e cadastro antigo não sobrescreve saldo', async () => {
  const dono = await contaEmTeste(amb, 'pro'), ana = await funcionario(dono);
  const p = produto(dono.lojaId, { estoque: 1000 });
  expect((await enviar(amb, dono, [mutacao('produto', p)])).corpo.rejeitadas).toEqual([]);
  const vender = (s: Sessao) => venda(s, { itens: [{ id: gerarId(), produtoId: p.id, descricao: p.nome, precoUnitarioCentavos: 700, quantidadeMilesimos: 1000, totalCentavos: 700 }] });
  const v1 = vender(dono), v2 = vender(ana), m1 = mutacao('venda', v1), m2 = mutacao('venda', v2);
  const rs = await Promise.all([enviar(amb, dono, [m1]), enviar(amb, ana, [m2])]);
  expect(rs.map(r => r.corpo.rejeitadas)).toEqual([[], []]);
  await enviar(amb, dono, [m1, mutacao('venda', v1)]);
  amb.relogio.avancarHoras(1);
  await enviar(amb, dono, [mutacao('produto', { ...p, nome: 'Novo nome', atualizadoEm: amb.relogio.agora().toISOString(), estoque: 999000 })]);
  const estado = (await get(dono, '/estoque')).corpo;
  expect(estado.saldos[0]).toMatchObject({ saldoMilesimos: -1000, negativo: true, nome: 'Novo nome' });
  expect(estado.movimentos).toHaveLength(3);
  const req = { id: gerarId(), produtoId: p.id, tipo: 'devolucao', quantidadeMilesimos: 500, motivo: 'Produto retornou', itemVendaId: v1.itens[0]!.id };
  expect((await post(dono, '/estoque/movimentos', req)).status).toBe(200);
  expect((await post(dono, '/estoque/movimentos', req)).status).toBe(200);
  expect((await post(dono, '/estoque/movimentos', { ...req, id: gerarId(), quantidadeMilesimos: 600 })).status).toBe(409);
  expect((await post(ana, '/estoque/movimentos', { ...req, id: gerarId() })).status).toBe(403);
  const cancelada = { ...v1, status: 'cancelada' as const };
  expect((await enviar(amb, dono, [mutacao('venda', cancelada)])).corpo.rejeitadas).toEqual([]);
  expect((await get(dono, '/estoque')).corpo.saldos[0].saldoMilesimos).toBe(-500);
});

it('falha na baixa desfaz venda, itens, pagamentos e saldo na mesma transação', async () => {
  const s = await contaEmTeste(amb, 'pro'), p = produto(s.lojaId, { estoque: 2000 });
  await enviar(amb, s, [mutacao('produto', p)]);
  await amb.db.execute(sql.raw("CREATE FUNCTION falhar_estoque_r4() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo = 'venda' THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$"));
  await amb.db.execute(sql.raw('CREATE TRIGGER falhar_estoque_r4 BEFORE INSERT ON movimentos_estoque FOR EACH ROW EXECUTE FUNCTION falhar_estoque_r4()'));
  try {
    const v = venda(s, { itens: [{ id: gerarId(), produtoId: p.id, descricao: p.nome, precoUnitarioCentavos: 700, quantidadeMilesimos: 1000, totalCentavos: 700 }] });
    expect((await enviar(amb, s, [mutacao('venda', v)])).status).toBe(500);
    expect((await get(s, '/estoque')).corpo.saldos[0].saldoMilesimos).toBe(2000);
    expect((await get(s, '/sync/pull?desde=0')).corpo.mudancas.filter((m: any) => m.entidade === 'venda')).toHaveLength(0);
  } finally {
    await amb.db.execute(sql.raw('DROP TRIGGER falhar_estoque_r4 ON movimentos_estoque'));
    await amb.db.execute(sql.raw('DROP FUNCTION falhar_estoque_r4()'));
  }
});

it('fiado parcial recebe no turno, impede excesso, estorna sem editar e cancela só após devolver', async () => {
  const s = await contaEmTeste(amb, 'pro'), { v, cx } = await prepararFiado(s);
  const req = { id: gerarId(), vendaId: v.id, valorCentavos: 300, meio: 'dinheiro', caixaId: cx.id, motivo: 'Parcial' };
  expect((await post(s, '/fiado/recebimentos', { ...req, caixaId: null })).status).toBe(400);
  expect((await post(s, '/fiado/recebimentos', req)).status).toBe(200);
  expect((await post(s, '/fiado/recebimentos', req)).status).toBe(200);
  expect((await post(s, '/fiado/recebimentos', { ...req, valorCentavos: 301 })).status).toBe(409);
  expect((await post(s, '/fiado/recebimentos', { ...req, id: gerarId() })).status).toBe(409);
  expect((await get(s, '/fiado')).corpo.titulos[0]).toMatchObject({ saldoCentavos: 200, recebidoCentavos: 300, vencido: true });
  expect((await get(s, '/caixas')).corpo[0].saldoCentavos).toBe(1500);
  expect((await enviar(amb, s, [mutacao('venda', { ...v, status: 'cancelada' })])).corpo.rejeitadas[0].motivo).toBe('fiado_com_recebimentos');
  const estorno = { id: gerarId(), recebimentoId: req.id, caixaId: cx.id, motivo: 'Dinheiro devolvido ao cliente' };
  expect((await post(s, '/fiado/estornos', estorno)).status).toBe(200);
  expect((await post(s, '/fiado/estornos', estorno)).status).toBe(200);
  expect((await post(s, '/fiado/estornos', { ...estorno, id: gerarId() })).status).toBe(409);
  expect((await get(s, '/caixas')).corpo[0].saldoCentavos).toBe(1200);
  expect((await enviar(amb, s, [mutacao('venda', { ...v, status: 'cancelada' })])).corpo.rejeitadas).toEqual([]);
  expect((await get(s, '/fiado')).corpo.titulos[0]).toMatchObject({ saldoCentavos: 0, cancelado: true });
  expect(await amb.db.select().from(eventosFiado)).toHaveLength(2);
});

it('recebimentos concorrentes respeitam o saldo e falha na gaveta reverte o recebimento', async () => {
  const s = await contaEmTeste(amb, 'pro'), { v, cx } = await prepararFiado(s);
  const req = { vendaId: v.id, valorCentavos: 400, meio: 'pix', caixaId: null, motivo: 'Pix recebido' };
  const rs = await Promise.all([post(s, '/fiado/recebimentos', { ...req, id: gerarId() }), post(s, '/fiado/recebimentos', { ...req, id: gerarId() })]);
  expect(rs.map(r => r.status).sort()).toEqual([200, 409]);
  await amb.db.execute(sql.raw("CREATE FUNCTION falhar_fiado_r4() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo = 'recebimento_fiado' THEN RAISE EXCEPTION 'falha simulada'; END IF; RETURN NEW; END $$"));
  await amb.db.execute(sql.raw('CREATE TRIGGER falhar_fiado_r4 BEFORE INSERT ON movimentos_caixa FOR EACH ROW EXECUTE FUNCTION falhar_fiado_r4()'));
  try {
    expect((await post(s, '/fiado/recebimentos', { ...req, id: gerarId(), valorCentavos: 100, meio: 'dinheiro', caixaId: cx.id })).status).toBe(500);
    expect((await get(s, '/fiado')).corpo.titulos[0].saldoCentavos).toBe(100);
  } finally {
    await amb.db.execute(sql.raw('DROP TRIGGER falhar_fiado_r4 ON movimentos_caixa'));
    await amb.db.execute(sql.raw('DROP FUNCTION falhar_fiado_r4()'));
  }
});

it('relatório separa venda, dívida e recebimento; aplica filtros por evento e nega consolidado ao operador', async () => {
  const s = await contaEmTeste(amb, 'pro'), { v, cx } = await prepararFiado(s), ana = await funcionario(s);
  await post(s, '/fiado/recebimentos', { id: gerarId(), vendaId: v.id, valorCentavos: 300, meio: 'dinheiro', caixaId: cx.id, motivo: 'Parcial' });
  const consulta = '/relatorios?inicio=2026-03-10T00:00:00.000Z&fim=2026-03-11T00:00:00.000Z';
  const r = (await get(s, consulta)).corpo;
  expect(r.totais).toMatchObject({ venda: 700, fiado_emitido: 500, recebimento_venda: 200, recebimento_fiado: 300, suprimento: 0 });
  expect((await get(s, consulta + '&meio=dinheiro')).corpo.totais).toMatchObject({ venda: 200, fiado_emitido: 0, recebimento_venda: 200, recebimento_fiado: 300 });
  expect((await get(s, consulta + '&meio=pix')).corpo.linhas).toHaveLength(0);
  expect((await get(ana, consulta)).corpo.linhas).toHaveLength(0);
  expect((await get(ana, consulta + '&lojaId=todas')).status).toBe(403);
  expect((await get(ana, consulta + '&operadorId=' + s.operadorId)).status).toBe(403);
  expect((await get(ana, '/fiado')).corpo.titulos).toHaveLength(0);
});

it('lojas têm vínculo próprio do dono, limite transacional e nenhum vazamento entre empresas', async () => {
  const s = await contaEmTeste(amb, 'pro'), ana = await funcionario(s), outra = await contaEmTeste(amb, 'pro', NUMEROS.outroAprova);
  const req = { id: gerarId(), nome: 'Filial' };
  expect((await post(ana, '/lojas', req)).status).toBe(403);
  const r = await post(s, '/lojas', req);
  expect(r.status).toBe(200); expect(r.corpo.operadorId).not.toBe(s.operadorId);
  expect((await post(s, '/lojas', req)).corpo).toEqual(r.corpo);
  expect((await get(s, '/lojas')).corpo).toHaveLength(2);
  expect((await get(ana, '/lojas')).corpo).toHaveLength(1);
  expect((await post(outra, '/lojas', req)).status).toBe(409);
  expect((await get(outra, '/lojas')).corpo).toHaveLength(1);
  expect((await post(s, '/lojas', { id: gerarId(), nome: 'Terceira' })).status).toBe(200);
  expect((await post(s, '/lojas', { id: gerarId(), nome: 'Quarta' })).status).toBe(409);
  const p = produto(outra.lojaId, { estoque: 1000 }); await enviar(amb, outra, [mutacao('produto', p)]);
  expect((await post(s, '/estoque/movimentos', { id: gerarId(), produtoId: p.id, tipo: 'entrada', quantidadeMilesimos: 1000, motivo: 'Compra' })).status).toBe(404);
  expect((await get(s, '/relatorios?inicio=2026-03-10T00:00:00.000Z&fim=2026-03-11T00:00:00.000Z&lojaId=' + outra.lojaId)).status).toBe(403);
});

it('lote fora de ordem baixa depois do cadastro; produto desconhecido é rejeitado sem perder a venda', async () => {
  const s = await contaEmTeste(amb, 'pro'), p = produto(s.lojaId, { estoque: 1000 });
  const v = venda(s, { itens: [{ id: gerarId(), produtoId: p.id, descricao: p.nome, precoUnitarioCentavos: 700, quantidadeMilesimos: 1000, totalCentavos: 700 }] });
  const mv = mutacao('venda', v);
  expect((await enviar(amb, s, [mv])).corpo.rejeitadas).toEqual([{ id: mv.id, motivo: 'produto_nao_encontrado' }]);
  expect((await enviar(amb, s, [mv, mutacao('produto', p)])).corpo.rejeitadas).toEqual([]);
  expect((await get(s, '/estoque')).corpo.saldos[0].saldoMilesimos).toBe(0);
  expect((await amb.db.select().from(movimentosEstoque))).toHaveLength(2);
});

it('dívida é imutável; recebimento exige caixa próprio e aberto; push não pode fabricar crédito de fiado', async () => {
  const s = await contaEmTeste(amb, 'pro'), { v, cx } = await prepararFiado(s), ana = await funcionario(s);
  const alterada = { ...v, fiado: { ...v.fiado!, vencimento: '2030-01-01' } };
  expect((await enviar(amb, s, [mutacao('venda', alterada)])).corpo.rejeitadas[0].motivo).toBe('venda_imutavel');
  const req = { id: gerarId(), vendaId: v.id, valorCentavos: 100, meio: 'dinheiro', caixaId: cx.id, motivo: 'Parcial' };
  expect((await post(ana, '/fiado/recebimentos', req)).status).toBe(403);
  const falso = { id: gerarId(), tipo: 'recebimento_fiado', valorCentavos: 100, motivo: 'Falso', criadoEm: INICIO.toISOString() };
  expect((await enviar(amb, s, [mutacao('caixa', { ...cx, movimentos: [falso] })])).corpo.rejeitadas[0].motivo).toBe('recebimento_exige_rota_fiado');
  const fechado = { ...cx, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 1200, contadoCentavos: 1200, diferencaCentavos: 0, conferenteId: s.operadorId, recolhidoCentavos: 1200, trocoRestanteCentavos: 0 } };
  expect((await enviar(amb, s, [mutacao('caixa', fechado)])).corpo.rejeitadas).toEqual([]);
  expect((await post(s, '/fiado/recebimentos', req)).status).toBe(409);
  expect((await get(s, '/fiado')).corpo.titulos[0].saldoCentavos).toBe(500);
});

it('relatórios atribuem recebimento ao período/turno receptor e consolidam lojas somente da empresa', async () => {
  const s = await contaEmTeste(amb, 'pro'), { v, cx } = await prepararFiado(s);
  const filial = (await post(s, '/lojas', { id: gerarId(), nome: 'Filial' })).corpo;
  const aparelhoId = gerarId();
  await amb.db.insert(aparelhos).values({ id: aparelhoId, contaId: s.contaId, lojaId: filial.id, nome: 'Filial', criadoEm: INICIO, ultimoAcessoEm: INICIO });
  const sf = await criarSessao(amb.db, { contaId: s.contaId, lojaId: filial.id, operadorId: filial.operadorId, aparelhoId }, INICIO);
  const vf = venda(sf); expect((await enviar(amb, sf, [mutacao('venda', vf)])).corpo.rejeitadas).toEqual([]);
  amb.relogio.avancarDias(1);
  await post(s, '/fiado/recebimentos', { id: gerarId(), vendaId: v.id, valorCentavos: 300, meio: 'pix', caixaId: cx.id, motivo: 'Dia seguinte' });
  const segundoDia = '/relatorios?inicio=2026-03-11T00:00:00Z&fim=2026-03-12T00:00:00Z';
  expect((await get(s, segundoDia + '&caixaId=' + cx.id)).corpo.totais).toMatchObject({ venda: 0, recebimento_fiado: 300, recebimento_venda: 0 });
  const periodo = '/relatorios?inicio=2026-03-10T00:00:00Z&fim=2026-03-12T00:00:00Z';
  expect((await get(s, periodo)).corpo.totais.venda).toBe(700);
  const r = (await get(s, periodo + '&lojaId=todas')).corpo;
  expect(r.totais).toMatchObject({ venda: 1400, recebimento_fiado: 300, recebimento_venda: 900 });
  expect(new Set(r.linhas.map((l: any) => l.lojaId))).toEqual(new Set([s.lojaId, filial.id]));
});

it('cancelamento pelo dono aparece no relatório do responsável original com autoria separada', async () => {
  const s = await contaEmTeste(amb, 'pro'), ana = await funcionario(s), v = venda(ana);
  await enviar(amb, ana, [mutacao('venda', v)]);
  await enviar(amb, s, [mutacao('venda', { ...v, status: 'cancelada' })]);
  const consulta = '/relatorios?inicio=2026-03-10T00:00:00Z&fim=2026-03-11T00:00:00Z';
  const r = (await get(ana, consulta)).corpo;
  expect(r.totais).toMatchObject({ venda: 700, cancelamento: 700, recebimento_venda: 700 });
  expect(r.linhas.find((l: any) => l.categoria === 'cancelamento')).toMatchObject({ operadorId: ana.operadorId, autorOperadorId: s.operadorId });
  const opcoes = (await get(ana, '/relatorios/filtros')).corpo;
  expect(opcoes.usuarios.map((u: any) => u.id)).toEqual([ana.operadorId]);
  expect(opcoes.lojas.map((l: any) => l.id)).toEqual([s.lojaId]);
});
