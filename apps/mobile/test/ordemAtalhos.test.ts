import { describe, expect, it } from 'vitest';
import { moverNaOrdem, OrdemAtalhosRepo, ordenarPelaOrdem } from '@/dados/ordemAtalhos';
import { ProdutosRepo } from '@/dados/produtos';
import { criarAmbiente } from './ambiente';

describe('ordenarPelaOrdem / moverNaOrdem', () => {
  const itens = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('segue a ordem salva e põe os novos no final', () => {
    expect(ordenarPelaOrdem(itens, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b']);
    expect(ordenarPelaOrdem(itens, []).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('ignora ids de atalhos que não existem mais', () => {
    expect(ordenarPelaOrdem(itens, ['z', 'b', 'y', 'a']).map((i) => i.id)).toEqual(['b', 'a', 'c']);
  });

  it('move um item para cima ou para baixo sem passar das pontas', () => {
    expect(moverNaOrdem(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moverNaOrdem(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moverNaOrdem(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moverNaOrdem(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
    expect(moverNaOrdem(['a', 'b', 'c'], 'z', 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('OrdemAtalhosRepo', () => {
  async function cenario() {
    const amb = criarAmbiente();
    const produtos = new ProdutosRepo(amb, { lojaId: () => 'loja', planoId: () => 'negocio' });
    const ordem = new OrdemAtalhosRepo(amb.armazenamento);
    const pao = await produtos.criar({ nome: 'Pão francês', precoCentavos: 1690, atalho: true });
    const banana = await produtos.criar({ nome: 'Banana prata', precoCentavos: 699, atalho: true });
    const gelo = await produtos.criar({ nome: 'Saco de gelo 5kg', precoCentavos: 1200, atalho: true });
    const nomes = () => ordem.ordenar(produtos.atalhos()).map((p) => p.nome);
    return { amb, produtos, ordem, pao, banana, gelo, nomes };
  }

  it('sem posição salva, os atalhos ficam em ordem alfabética', async () => {
    const { nomes } = await cenario();
    expect(nomes()).toEqual(['Banana prata', 'Pão francês', 'Saco de gelo 5kg']);
  });

  it('leva um atalho ao primeiro lugar e guarda a ordem', async () => {
    const { ordem, produtos, gelo, nomes } = await cenario();
    await ordem.mover(produtos.atalhos(), gelo.id, -1);
    await ordem.mover(produtos.atalhos(), gelo.id, -1);
    expect(nomes()).toEqual(['Saco de gelo 5kg', 'Banana prata', 'Pão francês']);
  });

  it('atalho novo vai para o fim, em ordem alfabética, e o excluído some da ordem', async () => {
    const { ordem, produtos, gelo, banana, nomes } = await cenario();
    await ordem.mover(produtos.atalhos(), gelo.id, -1);
    await ordem.mover(produtos.atalhos(), gelo.id, -1);

    await produtos.criar({ nome: 'Ovos', precoCentavos: 900, atalho: true });
    await produtos.criar({ nome: 'Água', precoCentavos: 300, atalho: true });
    expect(nomes()).toEqual(['Saco de gelo 5kg', 'Banana prata', 'Pão francês', 'Água', 'Ovos']);

    await produtos.excluir(banana.id);
    expect(nomes()).toEqual(['Saco de gelo 5kg', 'Pão francês', 'Água', 'Ovos']);

    // A próxima mudança regrava só o que ainda é atalho.
    await ordem.mover(produtos.atalhos(), gelo.id, 1);
    expect(ordem.obter()).not.toContain(banana.id);
    expect(nomes()).toEqual(['Pão francês', 'Saco de gelo 5kg', 'Água', 'Ovos']);
  });

  it('a ordem sobrevive a reiniciar o app', async () => {
    const { amb, ordem, produtos, gelo } = await cenario();
    await ordem.mover(produtos.atalhos(), gelo.id, -1);
    const reaberta = new OrdemAtalhosRepo(amb.armazenamento);
    await reaberta.carregar();
    expect(reaberta.ordenar(produtos.atalhos()).map((p) => p.nome)).toEqual(['Banana prata', 'Saco de gelo 5kg', 'Pão francês']);
  });
});
