import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RelogioFalso } from '@pdv/shared';
import { abrirPglite, type Conexao } from '../src/db/conexao';
import { limitesAuth } from '../src/db/schema';
import { limitarAuth, type TipoLimiteAuth } from '../src/servicos/limitesAuth';
import { abrirBanco, INICIO } from './ajuda';

let banco: Conexao;
beforeAll(async () => { banco = await abrirBanco(); });
afterAll(async () => { await banco.fechar(); });

describe('limites compartilhados de autenticação', () => {
  it.each([
    ['emissao_email', 3], ['emissao_ip', 20], ['falha_email', 5], ['login_ip', 50],
  ] as const)('aplica o orçamento de %s e reinicia aos 15 minutos', async (tipo, maximo) => {
    const relogio = new RelogioFalso(INICIO);
    const usar = (consumir = true) => banco.db.transaction((tx) => limitarAuth(tx, tipo, 'politica', relogio, consumir));
    for (let i = 0; i < maximo; i++) {
      relogio.definir(new Date(INICIO.getTime() + (tipo === 'emissao_email' ? i * 60_000 : 0)));
      expect(await usar()).toBe(true);
    }
    relogio.definir(new Date(INICIO.getTime() + 899_999));
    expect(await usar(false)).toBe(false);
    relogio.definir(new Date(INICIO.getTime() + 900_000));
    expect(await usar()).toBe(true);
  });

  it.each([['emissao_ip', 20], ['login_ip', 50]] as const)('limita %s no mesmo instante', async (tipo, maximo) => {
    const relogio = new RelogioFalso(INICIO);
    const usar = () => banco.db.transaction((tx) => limitarAuth(tx, tipo, 'ip-rapido', relogio));
    for (let i = 0; i < maximo; i++) expect(await usar()).toBe(true);
    expect(await usar()).toBe(false);
    relogio.definir(new Date(INICIO.getTime() + 900_000));
    expect(await usar()).toBe(true);
  });

  it('aplica 60 segundos, inclusive, e não libera com recuo', async () => {
    const relogio = new RelogioFalso(INICIO);
    const usar = () => banco.db.transaction((tx) => limitarAuth(tx, 'emissao_email', 'cooldown', relogio));
    expect(await usar()).toBe(true);
    relogio.definir(new Date(INICIO.getTime() - 1));
    expect(await usar()).toBe(false);
    relogio.definir(new Date(INICIO.getTime() + 59_999));
    expect(await usar()).toBe(false);
    relogio.definir(new Date(INICIO.getTime() + 60_000));
    expect(await usar()).toBe(true);
  });

  it('verifica sem consumir e preserva contadores após rollback', async () => {
    const relogio = new RelogioFalso(INICIO);
    const usar = (consumir = true) => banco.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'rollback', relogio, consumir));
    expect(await usar(false)).toBe(true);
    const chave = createHash('sha256').update('falha_email:rollback').digest('hex');
    expect((await banco.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)).toEqual({ chave, janelaInicio: INICIO, usos: 0, ultimoUsoEm: null });
    await expect(banco.db.transaction(async (tx) => {
      expect(await limitarAuth(tx, 'falha_email', 'rollback', relogio)).toBe(true);
      throw new Error('rollback');
    })).rejects.toThrow('rollback');
    for (let i = 0; i < 5; i++) expect(await usar()).toBe(true);
    expect(await usar(false)).toBe(false);
    relogio.definir(new Date(INICIO.getTime() - 900_000));
    expect(await usar()).toBe(false);
  });

  it('preserva a janela vazia reiniciada se o relógio recuar', async () => {
    const relogio = new RelogioFalso(INICIO);
    const sujeito = 'recuo-apos-verificacao';
    const usar = (consumir = true) => banco.db.transaction((tx) => limitarAuth(tx, 'falha_email', sujeito, relogio, consumir));
    expect(await usar()).toBe(true);
    const inicioNovaJanela = new Date(INICIO.getTime() + 900_000);
    relogio.definir(inicioNovaJanela);
    expect(await usar(false)).toBe(true);
    const chave = createHash('sha256').update('falha_email:' + sujeito).digest('hex');
    expect((await banco.db.select().from(limitesAuth)).find((linha) => linha.chave === chave)).toEqual({ chave, janelaInicio: inicioNovaJanela, usos: 0, ultimoUsoEm: null });
    relogio.definir(INICIO);
    for (let i = 0; i < 5; i++) expect(await usar()).toBe(true);
    const linhas = await banco.db.select().from(limitesAuth);
    expect(linhas.find((linha) => linha.chave === chave)).toEqual({ chave, janelaInicio: inicioNovaJanela, usos: 5, ultimoUsoEm: INICIO });
    relogio.definir(inicioNovaJanela);
    expect(await usar()).toBe(false);
  });

  it('inicia a janela no primeiro consumo depois de uma verificação antecipada', async () => {
    const relogio = new RelogioFalso(INICIO);
    const usar = (consumir = true) => banco.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'primeiro-consumo-tardio', relogio, consumir));
    expect(await usar(false)).toBe(true);
    relogio.definir(new Date(INICIO.getTime() + 899_999));
    for (let i = 0; i < 5; i++) expect(await usar()).toBe(true);
    relogio.definir(new Date(INICIO.getTime() + 900_000));
    expect(await usar()).toBe(false);
    relogio.definir(new Date(INICIO.getTime() + 1_799_998));
    expect(await usar()).toBe(false);
    relogio.definir(new Date(INICIO.getTime() + 1_799_999));
    expect(await usar()).toBe(true);
  });

  it('persiste apenas chave opaca e estado, compartilhado entre chamadas', async () => {
    const relogio = new RelogioFalso(INICIO);
    const sujeito = 'privado@exemplo.com';
    const tipo: TipoLimiteAuth = 'falha_email';
    await banco.db.transaction((tx) => limitarAuth(tx, tipo, sujeito, relogio));
    const linhas = await banco.db.select().from(limitesAuth);
    const chave = createHash('sha256').update(tipo + ':' + sujeito).digest('hex');
    expect(linhas.find((linha) => linha.chave === chave)).toEqual({ chave, janelaInicio: INICIO, usos: 1, ultimoUsoEm: INICIO });
    expect(JSON.stringify(linhas)).not.toContain(sujeito);
    for (let i = 0; i < 4; i++) expect(await banco.db.transaction((tx) => limitarAuth(tx, tipo, sujeito, relogio))).toBe(true);
    expect(await banco.db.transaction((tx) => limitarAuth(tx, tipo, sujeito, relogio))).toBe(false);
  });

  it('preserva o orçamento após reabrir o banco', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'pdv-limites-'));
    try {
      const primeira = await abrirPglite(pasta);
      const relogio = new RelogioFalso(INICIO);
      for (let i = 0; i < 5; i++) expect(await primeira.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'persistencia', relogio))).toBe(true);
      await primeira.fechar();
      const segunda = await abrirPglite(pasta);
      try {
        expect(await segunda.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'persistencia', relogio))).toBe(false);
      } finally { await segunda.fechar(); }
    } finally { await rm(pasta, { recursive: true, force: true }); }
  });
});

if (process.env.PDV_TEST_POSTGRES_URL) {
  it('serializa criação concorrente no PostgreSQL e respeita o orçamento', async () => {
    const relogio = new RelogioFalso(INICIO);
    const resultados = await Promise.all(Array.from({ length: 12 }, () =>
      banco.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'criacao-concorrente', relogio)),
    ));
    expect(resultados.filter(Boolean)).toHaveLength(5);
    expect(resultados.filter((resultado) => !resultado)).toHaveLength(7);
  });

  it('consulta o relógio depois de esperar a trava no PostgreSQL', async () => {
    const relogio = new RelogioFalso(INICIO);
    for (let i = 0; i < 5; i++) await banco.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'espera', relogio));
    let liberar!: () => void;
    let travado!: () => void;
    const liberacao = new Promise<void>((resolve) => { liberar = resolve; });
    const travaObtida = new Promise<void>((resolve) => { travado = resolve; });
    const primeira = banco.db.transaction(async (tx) => {
      await limitarAuth(tx, 'falha_email', 'espera', relogio, false);
      travado();
      await liberacao;
    });
    await travaObtida;
    let consultado = false;
    const segunda = banco.db.transaction((tx) => limitarAuth(tx, 'falha_email', 'espera', {
      agora: () => { consultado = true; return new Date(INICIO.getTime() + 900_000); },
    }));
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(consultado).toBe(false);
    } finally { liberar(); }
    await primeira;
    expect(await segunda).toBe(true);
    expect(consultado).toBe(true);
  });
}
