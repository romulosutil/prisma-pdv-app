import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { gerarId } from '@pdv/shared';
import type { Conexao } from '../src/db/conexao';
import {
  abrirBanco, chamar, contaEmTeste, criarAmbiente, criarConta, enviar, INICIO, mutacao, produto, reautenticar, venda,
  type Ambiente,
} from './ajuda';

/**
 * Valida scripts/zerar-conta-teste-producao.sql sobre o schema real (mesmas migrações do deploy).
 * PGlite por padrão; PostgreSQL local dedicado com PDV_TEST_POSTGRES_URL (CI). O bloco exclusivo do
 * psql (\if/\echo) é removido e as variáveis :'x' viram literais, como o psql faria; a trava do nome
 * do banco é trocada pelo nome do banco de teste (o teste da trava usa o nome original `pdv`).
 */
const AQUI = dirname(fileURLToPath(import.meta.url));
const ARQUIVO_SCRIPT = resolve(AQUI, '../../../scripts/zerar-conta-teste-producao.sql');
const LOJA_TESTE = 'Loja Teste M4';

/** Tabelas com FK (direta ou indireta) para contas/lojas: precisam terminar vazias. */
const TABELAS_DA_CONTA = [
  'contas', 'lojas', 'operadores', 'aparelhos', 'sessoes', 'recuperacoes_aparelho', 'produtos', 'vendas',
  'itens_venda', 'pagamentos_venda', 'caixas', 'movimentos_caixa', 'auditoria_caixa', 'catalogo_ean_confirmacoes',
  'mudancas', 'mutacoes_aplicadas', 'assinaturas', 'faturas', 'eventos_cobranca', 'testes_usados',
  'movimentos_estoque', 'clientes', 'eventos_fiado', 'solicitacoes_suporte', 'usuarios', 'codigos_login', 'entregas_codigo',
  'conexoes_pagamento', 'cobrancas_pagamento', 'eventos_cobranca_pagamento',
];

type Linha = Record<string, unknown>;
interface Params { loja_nome: string; lojas: string; vendas: string; caixas: string }
const PADRAO: Params = { loja_nome: LOJA_TESTE, lojas: '1', vendas: '1', caixas: '1' };

let banco: Conexao;
let amb: Ambiente;
let original: string;
let nomeBanco: string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cliente = () => (banco.db as any).$client;
const usaPostgres = () => Boolean(process.env.PDV_TEST_POSTGRES_URL);

async function linhas(consulta: string): Promise<Linha[]> {
  return usaPostgres() ? [...(await cliente().unsafe(consulta))] : (await cliente().query(consulta)).rows;
}
const exec = async (comandos: string, onNotice?: (m: string) => void) => {
  if (usaPostgres()) await cliente().unsafe(comandos);
  else await cliente().exec(comandos, { onNotice: (n: { message: string }) => onNotice?.(n.message) });
};

const literal = (v: string) => `'${v.replace(/'/g, "''")}'`;
function prepararScript(p: Params, bancoExigido = nomeBanco): string {
  let s = original.replace(/-- psql:inicio[\s\S]*?-- psql:fim\r?\n/, '').replace(/^\\set ON_ERROR_STOP on\r?\n/m, '');
  for (const [k, v] of Object.entries(p)) s = s.split(`:'${k}'`).join(literal(v));
  s = s.replace("current_database() <> 'pdv'", `current_database() <> ${literal(bancoExigido)}`);
  return s;
}

async function rodarScript(p: Params = PADRAO, bancoExigido?: string): Promise<string[]> {
  const avisos: string[] = [];
  if (usaPostgres()) {
    // Como o psql: uma conexão só, que o script controla com BEGIN/COMMIT. O pool do cliente da API
    // recusa transação manual (UNSAFE_TRANSACTION); fechar a conexão desfaz uma transação abortada.
    const sessao = postgres(process.env.PDV_TEST_POSTGRES_URL!, { max: 1, onnotice: (n) => avisos.push(String(n.message)) });
    try { await sessao.unsafe(prepararScript(p, bancoExigido)); } finally { await sessao.end(); }
    return avisos;
  }
  try { await exec(prepararScript(p, bancoExigido), (m) => avisos.push(m)); } catch (erro) {
    try { await exec('ROLLBACK'); } catch { /* já fora da transação */ }
    throw erro;
  }
  return avisos;
}

/** Contagem de todas as tabelas públicas + histórico de migrações + catálogo compartilhado. */
async function foto() {
  const tabelas = (await linhas(`SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`)).map((l) => String(l.table_name));
  const contagens: Record<string, number> = {};
  for (const t of tabelas) contagens[t] = Number((await linhas(`SELECT count(*) AS n FROM public."${t}"`))[0]!.n);
  return {
    contagens,
    migracoes: await linhas('SELECT id, hash, created_at::text AS c FROM drizzle.__drizzle_migrations ORDER BY id'),
    catalogo: await linhas('SELECT ean, nome, fonte, confianca FROM catalogo_ean ORDER BY ean'),
    limites: await linhas('SELECT chave, usos FROM limites_auth ORDER BY chave'),
    contas: await linhas('SELECT id, email, documento FROM contas ORDER BY id'),
  };
}

/** Conta no formato da de produção, cobrindo todas as tabelas ligadas a ela. */
async function semearContaTeste() {
  const c = await contaEmTeste(amb); // conta + loja + dono + usuário + aparelho + sessão + assinatura + teste usado
  await exec(`UPDATE lojas SET nome = ${literal(LOJA_TESTE)} WHERE id = '${c.lojaId}'`);
  await reautenticar(amb, c); // codigos_login + nova sessão + limites_auth

  const p = produto(c.lojaId, { ean: '7891000100103', estoque: 5000 });
  const cx = { id: gerarId(), lojaId: c.lojaId, aparelhoId: c.aparelhoId, operadorId: c.operadorId,
    abertura: { em: INICIO.toISOString(), trocoInicialCentavos: 10000 }, fechamento: null, movimentos: [] };
  const v = venda(c, {
    caixaId: cx.id, totalCentavos: 5000,
    itens: [{ id: gerarId(), produtoId: p.id, descricao: 'Arroz', precoUnitarioCentavos: 5000, quantidadeMilesimos: 1000, totalCentavos: 5000 }],
    pagamentos: [{ id: gerarId(), meio: 'dinheiro', provedor: null, valorCentavos: 5000, trocoCentavos: 0 }],
  });
  const r1 = await enviar(amb, c, [mutacao('produto', p), mutacao('caixa', cx), mutacao('venda', v)]);
  expect(r1.corpo.rejeitadas).toEqual([]);
  const fechado = { ...cx, fechamento: { em: INICIO.toISOString(), esperadoCentavos: 15000, contadoCentavos: 15000 } };
  expect((await enviar(amb, c, [mutacao('caixa', fechado)])).corpo.rejeitadas).toEqual([]);

  const agora = `'${INICIO.toISOString()}'`;
  const [codigo] = await linhas(`SELECT id FROM codigos_login WHERE email = ${literal(c.email)} LIMIT 1`);
  const [sessao] = await linhas(`SELECT id FROM sessoes WHERE conta_id = '${c.contaId}' LIMIT 1`);
  const usuarioEquipe = gerarId(), operadorEquipe = gerarId(), conexaoPix = gerarId(), cobrancaPix = gerarId();
  await exec(`
    INSERT INTO movimentos_caixa (id, caixa_id, loja_id, tipo, valor_centavos, motivo, criado_em) VALUES
      ('${gerarId()}', '${cx.id}', '${c.lojaId}', 'suprimento', 2000, 'troco', ${agora}),
      ('${gerarId()}', '${cx.id}', '${c.lojaId}', 'sangria', 1500, 'cofre', ${agora}),
      ('${gerarId()}', '${cx.id}', '${c.lojaId}', 'retirada', 500, 'dono', ${agora});
    INSERT INTO auditoria_caixa (id, loja_id, caixa_id, autor_operador_id, tipo, dados, criado_em)
      VALUES ('${gerarId()}', '${c.lojaId}', '${cx.id}', '${c.operadorId}', 'conferencia', '{}', ${agora});
    INSERT INTO movimentos_estoque (id, loja_id, produto_id, tipo, quantidade_milesimos, motivo, criado_em)
      VALUES ('${gerarId()}', '${c.lojaId}', '${p.id}', 'entrada', 1000, 'compra', ${agora});
    INSERT INTO clientes (id, loja_id, nome, contato, criado_em) VALUES ('${gerarId()}', '${c.lojaId}', 'Zé', '11999999999', ${agora});
    INSERT INTO eventos_fiado (id, loja_id, venda_id, operador_id, aparelho_id, tipo, valor_centavos, meio, caixa_id, motivo, criado_em)
      VALUES ('${gerarId()}', '${c.lojaId}', '${v.id}', '${c.operadorId}', '${c.aparelhoId}', 'recebimento', 100, 'dinheiro', '${cx.id}', 'pagou', ${agora});
    INSERT INTO catalogo_ean (ean, nome, fonte, confianca, criado_em, atualizado_em)
      VALUES ('7891000100103', 'Arroz 5kg', 'proprio', 'confirmada', ${agora}, ${agora}) ON CONFLICT DO NOTHING;
    INSERT INTO catalogo_ean_confirmacoes (ean, loja_id, nome, nome_normalizado, criado_em)
      VALUES ('7891000100103', '${c.lojaId}', 'Arroz 5kg', 'arroz 5kg', ${agora});
    INSERT INTO solicitacoes_suporte (id, conta_id, loja_id, operador_id, aparelho_id, tipo, mensagem, versao_politicas, criado_em, atualizado_em)
      VALUES ('${gerarId()}', '${c.contaId}', '${c.lojaId}', '${c.operadorId}', '${c.aparelhoId}', 'suporte', 'ajuda', '1', ${agora}, ${agora});
    INSERT INTO recuperacoes_aparelho (id, token_hash, conta_id, loja_id, operador_id, aparelho_novo_id, aparelho_novo_nome,
        aparelhos_permitidos, criado_em, expira_em, aparelho_substituido_id, sessao_id)
      VALUES ('${gerarId()}', 'hash-${gerarId()}', '${c.contaId}', '${c.lojaId}', '${c.operadorId}', '${gerarId()}', 'novo',
        '[]', ${agora}, ${agora}, '${c.aparelhoId}', '${sessao!.id}');
    INSERT INTO entregas_codigo (id, conta_id, codigo_id, dominio_remetente, estado, criado_em, atualizado_em, expira_em, proxima_tentativa_em)
      VALUES ('${gerarId()}', '${c.contaId}', '${codigo!.id}', 'exemplo.com.br', 'aceita', ${agora}, ${agora}, ${agora}, ${agora});
    INSERT INTO usuarios (id, email, nome, criado_em, atualizado_em) VALUES ('${usuarioEquipe}', 'equipe@exemplo.com.br', 'Ana', ${agora}, ${agora});
    INSERT INTO operadores (id, conta_id, loja_id, nome, papel, usuario_id, estado, criado_em, atualizado_em)
      VALUES ('${operadorEquipe}', '${c.contaId}', '${c.lojaId}', 'Ana', 'operador', '${usuarioEquipe}', 'convidado', ${agora}, ${agora});
    INSERT INTO faturas (id, assinatura_id, conta_id, valor_centavos, tipo, status, chave_idempotencia, criado_em, atualizado_em)
      SELECT '${gerarId()}', id, conta_id, 4990, 'primeira', 'pendente', 'teste-${gerarId()}', ${agora}, ${agora}
        FROM assinaturas WHERE conta_id = '${c.contaId}';
    INSERT INTO codigos_login (id, email, finalidade, codigo_hash, expira_em, criado_em)
      VALUES ('${gerarId()}', 'equipe@exemplo.com.br', 'login', 'h', ${agora}, ${agora});
    INSERT INTO conexoes_pagamento (id, conta_id, loja_id, provedor, publico_id, token_envelope, ativa, criado_por, criado_em, atualizado_em)
      VALUES ('${conexaoPix}', '${c.contaId}', '${c.lojaId}', 'mercadopago', 'publico-${gerarId()}', '{"versao":1,"iv":"x","tag":"x","conteudo":"x"}', true, '${c.operadorId}', ${agora}, ${agora});
    INSERT INTO cobrancas_pagamento (id, conta_id, loja_id, conexao_id, venda_id, operador_id, aparelho_id, provedor, meio, valor_centavos, estado,
        chave_idempotencia, pedido, criado_em, atualizado_em)
      VALUES ('${cobrancaPix}', '${c.contaId}', '${c.lojaId}', '${conexaoPix}', '${gerarId()}', '${c.operadorId}', '${c.aparelhoId}', 'mercadopago', 'pix', 700,
        'aguardando', 'pdv-pix-${cobrancaPix}', '{}', ${agora}, ${agora});
    INSERT INTO eventos_cobranca_pagamento (id, cobranca_id, loja_id, tipo, dados, criado_em)
      VALUES ('${gerarId()}', '${cobrancaPix}', '${c.lojaId}', 'criada', '{}', ${agora});
  `);
  return c;
}

beforeAll(async () => {
  banco = await abrirBanco();
  original = await readFile(ARQUIVO_SCRIPT, 'utf8');
  nomeBanco = String((await linhas('SELECT current_database() AS n'))[0]!.n);
});
afterAll(async () => { await banco.fechar(); });
beforeEach(async () => { amb = await criarAmbiente(banco); });
afterEach(async () => { await amb.fechar(); });

describe('zerar conta de teste em produção', () => {
  it('o script é transacional, travado em `pdv`, sem TRUNCATE e sem tocar no histórico de migrações', () => {
    expect(original).toMatch(/^\\set ON_ERROR_STOP on$/m);
    expect(original).toContain("current_database() <> 'pdv'");
    expect(original).toMatch(/^BEGIN;$/m);
    expect(original).toMatch(/^COMMIT;$/m);
    const codigo = original.replace(/--.*$/gm, '');
    expect(codigo).not.toMatch(/\bTRUNCATE\b|\bDROP\b|\bALTER\b/i);
    expect(codigo).not.toMatch(/(DELETE\s+FROM|UPDATE)\s+drizzle/i);
    expect(codigo).not.toMatch(/(DELETE\s+FROM|UPDATE)\s+public\.(catalogo_ean|limites_auth)\b(?!_)/i);
    const preparado = prepararScript(PADRAO);
    expect(preparado.split(/\r?\n/).filter((l) => l.startsWith('\\'))).toEqual([]);
    expect(preparado).not.toMatch(/:'[a-z_]+'/);
  });

  it('cobre todas as tabelas do schema, exceto as preservadas de propósito (tabela nova exige revisão do script)', async () => {
    const todas = (await linhas(`SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`)).map((l) => String(l.table_name));
    expect(todas.filter((t) => !TABELAS_DA_CONTA.includes(t)).sort()).toEqual(['catalogo_ean', 'limites_auth']);
    for (const t of TABELAS_DA_CONTA) expect(original, t).toMatch(new RegExp(`DELETE FROM public\\.${t} `));
  });

  it('remove toda a conta de teste, preserva migrações, catálogo e limites, e permite recadastrar do zero', async () => {
    const c = await semearContaTeste();
    const antes = await foto();
    for (const t of TABELAS_DA_CONTA) expect(antes.contagens[t], t).toBeGreaterThan(0);
    expect(antes.contagens.vendas).toBe(1);
    expect(antes.contagens.caixas).toBe(1);
    expect(antes.contagens.movimentos_caixa).toBe(3);

    const avisos = await rodarScript();
    expect(avisos.join('\n')).toMatch(/Conta de teste removida: loja "Loja Teste M4", 1 loja\(s\), 1 venda\(s\), 1 caixa\(s\)/);

    const depois = await foto();
    for (const t of TABELAS_DA_CONTA) expect(depois.contagens[t], t).toBe(0);
    expect(depois.migracoes).toEqual(antes.migracoes);
    expect(depois.migracoes.length).toBeGreaterThan(0);
    expect(depois.catalogo).toEqual(antes.catalogo);
    expect(depois.catalogo).toHaveLength(1);
    expect(depois.limites).toEqual(antes.limites);

    // Idempotência: com 0 contas aborta com mensagem clara e não altera nada.
    await expect(rodarScript()).rejects.toThrow(/já está zerado/);
    expect(await foto()).toEqual(depois);

    // Recadastro do zero com o mesmo e-mail, documento e aparelho.
    const nova = await criarConta(amb, { email: c.email, documento: c.documento, aparelhoId: c.aparelhoId });
    expect(nova.contaId).not.toBe(c.contaId);
    expect((await chamar(amb, 'GET', '/assinatura', { token: nova.token })).status).toBe(200);
  }, 60_000);

  it('recusa nome de loja errado sem apagar nada', async () => {
    await semearContaTeste();
    const antes = await foto();
    await expect(rodarScript({ ...PADRAO, loja_nome: 'Loja Teste M5' })).rejects.toThrow(/não tem loja chamada "Loja Teste M5"/);
    expect(await foto()).toEqual(antes);
  }, 60_000);

  it.each([
    [{ vendas: '2' }, /vendas divergente: 1 \(esperado: 2\)/],
    [{ caixas: '0' }, /caixas divergente: 1 \(esperado: 0\)/],
    [{ lojas: '2' }, /lojas divergente: 1 \(esperado: 2\)/],
    [{ vendas: 'um' }, /devem ser inteiros/],
  ])('recusa contagem divergente %o sem apagar nada', async (troca, erro) => {
    await semearContaTeste();
    const antes = await foto();
    await expect(rodarScript({ ...PADRAO, ...troca })).rejects.toThrow(erro);
    expect(await foto()).toEqual(antes);
  }, 60_000);

  it('recusa quando há 2 contas e mantém a segunda conta intacta', async () => {
    await semearContaTeste();
    const outra = await criarConta(amb);
    expect((await enviar(amb, outra, [mutacao('produto', produto(outra.lojaId))])).corpo.rejeitadas).toEqual([]);
    const antes = await foto();
    expect(antes.contas).toHaveLength(2);
    await expect(rodarScript()).rejects.toThrow(/O banco tem 2 contas/);
    expect(await foto()).toEqual(antes);
    expect(await linhas(`SELECT nome FROM lojas WHERE conta_id = '${outra.contaId}'`)).toEqual([{ nome: 'Mercadinho da Maria' }]);
  }, 60_000);

  it('recusa banco com nome diferente de `pdv` sem apagar nada', async () => {
    await semearContaTeste();
    const antes = await foto();
    const exigido = nomeBanco === 'pdv' ? 'pdv_outro' : 'pdv';
    await expect(rodarScript(PADRAO, exigido)).rejects.toThrow(/Banco incorreto/);
    expect(await foto()).toEqual(antes);
  }, 60_000);
});
