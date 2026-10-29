import { describe, it, expect } from 'vitest';
import { ArmazenamentoSessaoSegura, type CofreSessao } from '../src/dados/armazenamentoSessaoSegura';
import type { Armazenamento } from '../src/dados/armazenamento';

const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const sessao = { token: 'segredo', contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) };
const perfil = { nomeResponsavel: 'Ana', nomeLoja: 'Loja', email: 'a@b.com', aparelhoNome: 'Celular' };
class Base implements Armazenamento {
  dados = new Map<string, unknown>(); escritas: unknown[] = []; falhar = false; falharChave = ''; falharLimpar = false;
  async obter<T>(k: string) { return (this.dados.get(k) ?? null) as T | null; }
  async gravar<T>(k: string, v: T) { if (this.falhar || this.falharChave === k) throw Error('segredo'); this.escritas.push(v); this.dados.set(k, structuredClone(v)); }
  async remover(k: string) { this.dados.delete(k); }
  async limpar() { if (this.falharLimpar) throw Error('segredo'); this.dados.clear(); }
}
class Cofre implements CofreSessao {
  dados = new Map<string, string>(); falha: string | null = null;
  async obter(k: string) { if (this.falha === 'ler') throw Error('segredo'); return this.falha === 'verificar' ? null : this.dados.get(k) ?? null; }
  async gravar(k: string, v: string) { if (this.falha === 'gravar') throw Error('segredo'); this.dados.set(k, v); }
  async remover(k: string) { if (this.falha === 'remover') throw Error('segredo'); this.dados.delete(k); }
}
function criar() { const base = new Base(); const cofre = new Cofre(); let n = 10; return { base, cofre, adaptador: new ArmazenamentoSessaoSegura(base, cofre, () => id(n++)) }; }
const conta = { sessao, perfil };
describe('armazenamento seguro', () => {
  it('migra legado uma vez após verificar e nunca escreve token na base', async () => {
    const { base, cofre, adaptador } = criar(); base.dados.set('conta', conta);
    expect(await adaptador.obter('conta')).toMatchObject(conta);
    expect(await adaptador.obter('conta')).toMatchObject(conta);
    expect(cofre.dados.size).toBe(1); expect(base.escritas.filter(v => typeof v === 'object' && v !== null && 'versao' in v)).toHaveLength(1);
    expect(JSON.stringify(base.escritas)).not.toContain('segredo');
  });
  it.each(['gravar', 'verificar', 'ler'])('preserva legado em falha de cofre %s', async (falha) => {
    const { base, cofre, adaptador } = criar(); base.dados.set('conta', conta); cofre.falha = falha;
    await expect(adaptador.obter('conta')).rejects.toThrow(); expect(base.dados.get('conta')).toEqual(conta);
  });
  it('preserva origem quando metadata falha', async () => {
    const { base, adaptador } = criar(); base.dados.set('conta', conta); base.falhar = true;
    await expect(adaptador.obter('conta')).rejects.toThrow('armazenamento seguro'); expect(base.dados.get('conta')).toEqual(conta);
  });
  it('mantém identidade e perfil quando credencial falta e não toca outros dados', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('vendas', [25]); await adaptador.gravar('conta', conta); cofre.dados.clear();
    expect(await adaptador.obter('conta')).toMatchObject({ sessao: null, perfil, identidade: { contaId: id(1) }, reautenticacaoNecessaria: true });
    expect(await base.obter('vendas')).toEqual([25]);
  });
  it('persiste limpeza pendente e tenta novamente após logout', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('conta', conta); cofre.falha = 'remover';
    await adaptador.gravar('conta', { sessao: null, perfil, identidade: { contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) }, reautenticacaoNecessaria: true });
    expect(await base.obter('conta')).toMatchObject({ referenciaCredencial: null, referenciasParaExcluir: [id(10)] });
    cofre.falha = null; await adaptador.obter('conta'); expect(cofre.dados.size).toBe(0);
    expect(await base.obter('conta')).toMatchObject({ referenciasParaExcluir: [] });
  });
  it('serializa rotações concorrentes', async () => {
    const { cofre, adaptador } = criar(); await Promise.all([adaptador.gravar('conta', conta), adaptador.gravar('conta', { ...conta, sessao: { ...sessao, token: 'novo' } })]);
    expect(await adaptador.obter('conta')).toMatchObject({ sessao: { token: 'novo' } }); expect([...cofre.dados.values()]).toEqual(['novo']);
  });
  it.each([
    { referenciaCredencial: id(10), referenciasParaExcluir: [id(10)], identidade: sessao },
    { referenciaCredencial: null, referenciasParaExcluir: [id(10), id(10)], identidade: sessao },
    { referenciaCredencial: id(10), referenciasParaExcluir: [], identidade: null },
  ])('recusa metadados inconsistentes antes de remover credenciais', async (parte) => {
    const { base, cofre, adaptador } = criar();
    const meta = { versao: 1, perfil, reautenticacaoNecessaria: false, ...parte };
    base.dados.set('conta', meta); cofre.dados.set('pdv-sessao-' + id(10), 'segredo');
    await expect(adaptador.obter('conta')).rejects.toThrow('armazenamento seguro');
    expect(base.dados.get('conta')).toEqual(meta); expect(cofre.dados.size).toBe(1);
  });
  it('trata token vazio e identidade sem credencial como reautenticação', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('conta', conta);
    cofre.dados.set('pdv-sessao-' + id(10), '');
    expect(await adaptador.obter('conta')).toMatchObject({ sessao: null, perfil, reautenticacaoNecessaria: true });
    const meta = await base.obter<Record<string, unknown>>('conta');
    base.dados.set('conta', { ...meta, referenciaCredencial: null, reautenticacaoNecessaria: false });
    expect(await adaptador.obter('conta')).toMatchObject({ sessao: null, reautenticacaoNecessaria: true });
  });
  it('não remove credencial se limpeza da base falha', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('conta', conta); base.falharLimpar = true;
    await expect(adaptador.limpar()).rejects.toThrow('armazenamento seguro'); expect(cofre.dados.size).toBe(1);
    expect(await adaptador.obter('conta')).toMatchObject(conta);
  });
  it('registra referência antes do cofre e recupera dupla falha', async () => {
    const { base, cofre, adaptador } = criar(); base.falharChave = 'cofre_sessao_pendentes';
    await expect(adaptador.gravar('conta', conta)).rejects.toThrow(); expect(cofre.dados.size).toBe(0);
    base.falharChave = 'conta'; cofre.falha = 'remover';
    await expect(adaptador.gravar('conta', conta)).rejects.toThrow();
    expect(await base.obter('cofre_sessao_pendentes')).toEqual([id(11)]); expect(cofre.dados.size).toBe(1);
    cofre.falha = null; base.falharChave = ''; await adaptador.obter('conta'); expect(cofre.dados.size).toBe(0);
  });
  it('journal nunca exclui credencial ativa e dados inválidos não são usados', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('conta', conta);
    base.dados.set('cofre_sessao_pendentes', [id(10)]); await adaptador.obter('conta'); expect(cofre.dados.size).toBe(1);
    base.dados.set('cofre_sessao_pendentes', [id(10), id(10)]);
    await expect(adaptador.obter('conta')).rejects.toThrow(); expect(cofre.dados.size).toBe(1);
  });
  it('preserva referências após limpar quando cofre falha', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('conta', conta); cofre.falha = 'remover';
    await adaptador.limpar(); expect(await base.obter('cofre_sessao_pendentes')).toEqual([id(10)]);
    cofre.falha = null; await adaptador.obter('conta'); expect(cofre.dados.size).toBe(0);
  });
  it('retira token rejeitado mesmo quando falha a gravação dos metadados', async () => {
    const { base, cofre, adaptador } = criar(); await adaptador.gravar('conta', conta);
    base.falharChave = 'conta';
    await expect(adaptador.gravar('conta', { sessao: null, perfil, identidade: { contaId: id(1), lojaId: id(2), aparelhoId: id(3), operadorId: id(4) }, reautenticacaoNecessaria: true })).rejects.toThrow();
    await adaptador.retirarCredencial('segredo');
    expect(cofre.dados.size).toBe(0);
    expect(await adaptador.obter('conta')).toMatchObject({ sessao: null, identidade: { contaId: id(1) }, perfil, reautenticacaoNecessaria: true });
    expect(JSON.stringify(base.escritas)).not.toContain('segredo');
  });
  it('não retira novo token quando a rejeição é de token antigo', async () => {
    const { adaptador, cofre } = criar(); await adaptador.gravar('conta', conta);
    await adaptador.gravar('conta', { ...conta, sessao: { ...sessao, token: 'novo' } });
    await adaptador.retirarCredencial('segredo');
    expect(await adaptador.obter('conta')).toMatchObject({ sessao: { token: 'novo' } });
    expect([...cofre.dados.values()]).toEqual(['novo']);
  });
  it('sanitiza falha ao retirar credencial e mantém identidade', async () => {
    const { adaptador, cofre } = criar(); await adaptador.gravar('conta', conta); cofre.falha = 'remover';
    await expect(adaptador.retirarCredencial('segredo')).rejects.toThrow('armazenamento seguro');
    expect(await adaptador.obter('conta')).toMatchObject({ identidade: { contaId: id(1) }, perfil, sessao });
  });
});
