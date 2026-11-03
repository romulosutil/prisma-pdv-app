import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ArmazenamentoEscopo } from '../src/dados/armazenamentoEscopo';
import { ArmazenamentoMemoria } from './ambiente';
const m = vi.hoisted(() => ({ dados: null as any, identidade: null as any }));
vi.mock('@/dados/hooks', () => ({ useDados: () => m.dados, useConta: () => ({ identidade: m.identidade }) }));
import { useChavePix } from '../src/telas/pagar/chavePix';
let hook: ReturnType<typeof useChavePix>, r: ReactTestRenderer;
function Tela() { hook = useChavePix(); return null; }
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => { if (r) await act(async () => r.unmount()); });
it.each(['dono', 'gerente', 'operador'])('salva e recarrega a chave da loja no perfil %s', async papel => {
  m.identidade = { contaId: 'empresa', lojaId: 'loja', operadorId: papel, papel };
  const base = new ArmazenamentoMemoria();
  const armazenamento = new ArmazenamentoEscopo(base, () => m.identidade, false);
  m.dados = { armazenamentoDaLoja: armazenamento, conta: { obter: () => ({ identidade: m.identidade }) } };
  await act(async () => { r = create(React.createElement(Tela)); });
  await act(async () => { expect(await hook.salvar('caixa@example.com')).toBe(true); });
  expect(hook.chave?.chave).toBe('caixa@example.com');
  expect(await armazenamento.obter('chavePix')).toMatchObject({ chave: 'caixa@example.com' });
});
it('callback antigo não grava chave na nova loja', async () => {
  m.identidade = { contaId: 'empresa', lojaId: 'loja', operadorId: 'op', papel: 'operador' };
  const armazenamento = new ArmazenamentoEscopo(new ArmazenamentoMemoria(), () => m.identidade, false);
  m.dados = { armazenamentoDaLoja: armazenamento, conta: { obter: () => ({ identidade: m.identidade }) } };
  await act(async () => { r = create(React.createElement(Tela)); });
  const salvar = hook.salvar;
  m.identidade = { ...m.identidade, lojaId: 'outra' };
  await expect(salvar('caixa@example.com')).rejects.toThrow('loja mudou');
  expect(await armazenamento.obter('chavePix')).toBeNull();
});
