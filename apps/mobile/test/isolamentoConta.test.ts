import { describe, expect, it } from 'vitest';
import { ArmazenamentoEscopo } from '../src/dados/armazenamentoEscopo';
import { Persistido } from '../src/dados/observavel';
import type { IdentidadeLocal } from '../src/dados/estadoConta';
import { ArmazenamentoMemoria } from './ambiente';

const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const identidade = (n: number): IdentidadeLocal => ({ contaId: id(n), lojaId: id(n + 1), aparelhoId: id(n + 2), operadorId: id(n + 3) });
const A = identidade(1), B = identidade(11);
const endereco = (i: IdentidadeLocal, chave: string) => 'conta:' + JSON.stringify([i.contaId, i.lojaId]) + ':' + chave;
const valores: Record<string, unknown> = {
  produtos: [{ id: id(30), nome: 'Produto A' }], vendas: [{ id: id(31), total: 2500 }],
  caixas: [{ id: id(32), saldo: 1000 }], assinatura: { assinatura: { contaId: A.contaId }, licenca: { contaId: A.contaId } },
  preferencias: { tema: 'A' }, chavePix: 'pix-a',
};
class Repo extends Persistido<string[]> {
  constructor(armazenamento: ArmazenamentoEscopo) { super(armazenamento, 'produtos', []); }
  adicionar(v: string) { return this.modificar(atual => [...atual, v]); }
}
function criar() {
  const base = new ArmazenamentoMemoria(); let atual = A;
  const escopo = new ArmazenamentoEscopo(base, () => atual, false);
  return { base, escopo, trocar: (i: IdentidadeLocal) => { atual = i; } };
}
function barreira() {
  let liberar!: () => void; const espera = new Promise<void>(r => { liberar = r; });
  let iniciado!: () => void; const iniciou = new Promise<void>(r => { iniciado = r; });
  return { espera, liberar, iniciado, iniciou };
}
describe('isolamento por conta', () => {
  it('isola produtos, vendas, caixas, licença, preferências e Pix e recupera A', async () => {
    const { base, escopo, trocar } = criar();
    for (const [chave, valor] of Object.entries(valores)) await escopo.gravar(chave, valor);
    trocar(B);
    for (const chave of Object.keys(valores)) expect(await escopo.obter(chave)).toBeNull();
    for (const chave of Object.keys(valores)) expect(await base.obter(endereco(A, chave))).toEqual(valores[chave]);
    trocar(A);
    for (const [chave, valor] of Object.entries(valores)) expect(await escopo.obter(chave)).toEqual(valor);
  });
  it('atribui legado somente à primeira conta sem apagar origem e não ressuscita após remoção', async () => {
    const { base, escopo, trocar } = criar(); await base.gravar('produtos', valores.produtos);
    expect(await escopo.obter('produtos')).toEqual(valores.produtos);
    expect(await base.obter('produtos')).toEqual(valores.produtos);
    trocar(B); expect(await escopo.obter('produtos')).toBeNull();
    trocar(A); await escopo.remover('produtos'); expect(await escopo.obter('produtos')).toBeNull();
    expect(await base.obter('produtos')).toEqual(valores.produtos);
  });
  it('recusa licença legada de outra conta sem alterar origem', async () => {
    const { base, escopo } = criar(); const legado = { assinatura: { contaId: B.contaId }, licenca: { contaId: B.contaId } };
    await base.gravar('assinatura', legado);
    await expect(escopo.obter('assinatura')).rejects.toThrow();
    expect(await base.obter('assinatura')).toEqual(legado); expect(await base.obter(endereco(A, 'assinatura'))).toBeNull();
  });
  it('carregar B ausente redefine o snapshot inicial', async () => {
    const { escopo, trocar } = criar(); const repo = new Repo(escopo);
    await repo.adicionar('A'); expect(repo.obter()).toEqual(['A']); trocar(B);
    await repo.carregar(); expect(repo.obter()).toEqual([]);
    trocar(A); await repo.carregar(); expect(repo.obter()).toEqual(['A']);
  });
  it('leitura atrasada de A falha sem publicar em B', async () => {
    const { base, escopo, trocar } = criar(); await escopo.gravar('produtos', ['A']);
    const repo = new Repo(escopo); const gate = barreira(); const original = base.obter.bind(base);
    base.obter = async <T>(chave: string): Promise<T | null> => {
      const valor = await original<T>(chave);
      if (chave === endereco(A, 'produtos')) { gate.iniciado(); await gate.espera; }
      return valor;
    };
    const pendente = repo.carregar(); await gate.iniciou; trocar(B); gate.liberar();
    await expect(pendente).rejects.toThrow(); expect(repo.obter()).toEqual([]);
    await repo.carregar(); expect(repo.obter()).toEqual([]);
  });
  it('gravação atrasada de A falha sem publicar em B, mas preserva o destino A', async () => {
    const { base, escopo, trocar } = criar(); const repo = new Repo(escopo); const gate = barreira(); const original = base.gravar.bind(base);
    base.gravar = async <T>(chave: string, valor: T): Promise<void> => {
      if (chave === endereco(A, 'produtos')) { gate.iniciado(); await gate.espera; }
      await original(chave, valor);
    };
    const pendente = repo.adicionar('A'); await gate.iniciou; trocar(B); gate.liberar();
    await expect(pendente).rejects.toThrow(); expect(repo.obter()).toEqual([]);
    expect(await base.obter(endereco(A, 'produtos'))).toEqual(['A']);
    await repo.carregar(); expect(repo.obter()).toEqual([]);
    trocar(A); await repo.carregar(); expect(repo.obter()).toEqual(['A']);
  });
});
