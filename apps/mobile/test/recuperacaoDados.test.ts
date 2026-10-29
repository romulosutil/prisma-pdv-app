import { describe, expect, it, vi } from 'vitest';
import { Dados } from '../src/dados/dados';
import { ErroBackend } from '../src/servicos/backend';
import { ArmazenamentoMemoria, criarContadorDeIds } from './ambiente';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const perfil = { contaId: id(2), lojaId: id(3), operadorId: id(4), email: 'ana@exemplo.com', nomeResponsavel: 'Ana', nomeLoja: 'Loja', papel: 'dono' as const };
const sessao = { token: 'sessao-secreta', contaId: id(2), lojaId: id(3), operadorId: id(4), aparelhoId: id(1) };
function montar() {
  const base = new ArmazenamentoMemoria(); const dados = new Dados(base, criarContadorDeIds(), 'http://api.local');
  const iniciar = vi.spyOn(dados.backend, 'iniciarRecuperacao').mockImplementation(async req => ({ id: id(9), token: 'a'.repeat(43), expiraEm: '2026-10-29T12:05:00.000Z', perfil, aparelhoNovoId: req.aparelhoId, aparelhoNovoNome: req.aparelhoNome, aparelhos: [{ id: id(6), nome: 'Antigo', ultimoAcessoEm: '2026-10-28T12:00:00.000Z' }] }));
  const confirmar = vi.spyOn(dados.backend, 'confirmarRecuperacao').mockImplementation(async () => ({ ...sessao, aparelhoId: iniciar.mock.calls[0]![0].aparelhoId }));
  const obter = vi.spyOn(dados.backend, 'obterPerfil').mockResolvedValue(perfil);
  vi.spyOn(dados.assinatura, 'sincronizar').mockResolvedValue();
  return { base, dados, iniciar, confirmar, obter };
}
function pendente<T>() { let resolver!: (valor: T) => void; const promessa = new Promise<T>(r => { resolver = r; }); return { promessa, resolver }; }

describe('Dados recuperação AC10 e AC11', () => {
  it('getter copia a visão sem segredo e mantém somente o alvo enviado da tentativa atual', async () => {
    const { dados, confirmar } = montar();
    expect(dados.obterRecuperacaoPendente()).toBeNull();
    await dados.iniciarRecuperacao(perfil.email, '123456');
    const primeira = dados.obterRecuperacaoPendente()!;
    expect(primeira.recuperacao).not.toHaveProperty('token');
    expect(primeira.aparelhoSubstituidoId).toBeNull();
    primeira.recuperacao.perfil.email = 'mudou'; primeira.recuperacao.aparelhos[0]!.id = id(77);
    expect(dados.obterRecuperacaoPendente()!.recuperacao.perfil.email).toBe(perfil.email);
    expect(dados.obterRecuperacaoPendente()!.recuperacao.aparelhos[0]!.id).toBe(id(6));
    confirmar.mockRejectedValueOnce(new ErroBackend('rede', ''));
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'rede' });
    expect(dados.obterRecuperacaoPendente()!.aparelhoSubstituidoId).toBe(id(6));
    dados.cancelarRecuperacao(); expect(dados.obterRecuperacaoPendente()).toBeNull();
  });
  it('omite segredo e protege desafio de mutação da visão; valida perfil antes do acesso', async () => {
    const { dados, base, iniciar, confirmar, obter } = montar();
    const visao = await dados.iniciarRecuperacao(perfil.email, '123456');
    expect(visao).not.toHaveProperty('token');
    visao.perfil.email = 'alterado@exemplo.com'; visao.aparelhos[0]!.id = id(7);
    await dados.confirmarRecuperacao(id(6));
    expect(confirmar).toHaveBeenCalledWith({ id: id(9), token: 'a'.repeat(43), aparelhoSubstituidoId: id(6), confirmar: true });
    expect(obter).toHaveBeenCalledWith(sessao.token);
    expect(dados.conta.obter().sessao?.aparelhoId).toBe(iniciar.mock.calls[0]![0].aparelhoId);
    expect(dados.conta.obter().perfil?.email).toBe(perfil.email);
    expect([...base.dados.values()].join('\n')).not.toContain('a'.repeat(43));
  });

  it('mantém tentativa e corpo idêntico após falha de rede e perfil', async () => {
    const { dados, confirmar, obter } = montar();
    await dados.iniciarRecuperacao(perfil.email, '123456');
    confirmar.mockRejectedValueOnce(new ErroBackend('rede', 'falhou'));
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'rede' });
    obter.mockRejectedValueOnce(new ErroBackend('rede', 'falhou'));
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'rede' });
    await expect(dados.confirmarRecuperacao(id(7))).rejects.toMatchObject({ codigo: 'conflito' });
    await dados.confirmarRecuperacao(id(6));
    expect(confirmar).toHaveBeenCalledTimes(3);
    expect(confirmar.mock.calls[0]).toEqual(confirmar.mock.calls[1]); expect(confirmar.mock.calls[1]).toEqual(confirmar.mock.calls[2]);
  });

  it('401 público invalida a prova e não tenta novamente', async () => {
    const { dados, confirmar } = montar(); await dados.iniciarRecuperacao(perfil.email, '123456');
    confirmar.mockRejectedValueOnce(new ErroBackend('nao_autorizado', '', 401));
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ status: 401 });
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'conflito' });
    expect(confirmar).toHaveBeenCalledTimes(1);
  });

  it.each(['sessao', 'perfil'])('recusa %s divergente antes de persistir', async (tipo) => {
    const { dados, confirmar, obter } = montar(); await dados.iniciarRecuperacao(perfil.email, '123456');
    if (tipo === 'sessao') confirmar.mockResolvedValueOnce({ ...sessao, aparelhoId: id(99) });
    else obter.mockResolvedValueOnce({ ...perfil, contaId: id(99) });
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    expect(dados.conta.obter().sessao).toBeNull();
  });

  it('recusa desafio de outra conta quando email já corresponde à identidade', async () => {
    const { dados, iniciar } = montar();
    await dados.conta.registrar({ ...sessao, contaId: id(80) }, { email: perfil.email, nomeResponsavel: 'Ana', nomeLoja: 'Loja', aparelhoNome: 'Novo' });
    await dados.iniciar();
    await expect(dados.iniciarRecuperacao(perfil.email, '123456')).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    expect(iniciar).toHaveBeenCalledTimes(1);
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'conflito' });
  });

  it('cancelamento invalida resposta atrasada e não publica desafio', async () => {
    const { dados, iniciar } = montar(); const bloqueio = pendente<Awaited<ReturnType<typeof dados.backend.iniciarRecuperacao>>>();
    iniciar.mockReturnValueOnce(bloqueio.promessa);
    const chamada = dados.iniciarRecuperacao(perfil.email, '123456');
    await vi.waitFor(() => expect(iniciar).toHaveBeenCalled());
    dados.cancelarRecuperacao();
    bloqueio.resolver({ id: id(9), token: 'a'.repeat(43), expiraEm: '2026-10-29T12:05:00.000Z', perfil, aparelhoNovoId: iniciar.mock.calls[0]![0].aparelhoId, aparelhoNovoNome: iniciar.mock.calls[0]![0].aparelhoNome, aparelhos: [{ id: id(6), nome: 'Antigo', ultimoAcessoEm: '2026-10-28T12:00:00.000Z' }] });
    await expect(chamada).rejects.toMatchObject({ codigo: 'conflito' });
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'conflito' });
  });

  it('identidade sem perfil é recusada antes da rede', async () => {
    const { dados, iniciar, base } = montar();
    const { token: _token, ...identidade } = sessao;
    await base.gravar('conta', { sessao: null, identidade, perfil: null, reautenticacaoNecessaria: true });
    await expect(dados.iniciarRecuperacao(perfil.email, '123456')).rejects.toMatchObject({ codigo: 'conflito' });
    expect(iniciar).not.toHaveBeenCalled();
  });

  it('falha de persistência mantém prova para retry idêntico', async () => {
    const { dados, confirmar } = montar(); await dados.iniciarRecuperacao(perfil.email, '123456');
    const registrar = vi.spyOn(dados.conta, 'registrar');
    registrar.mockRejectedValueOnce(new Error('cofre indisponível'));
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toThrow('cofre indisponível');
    await dados.confirmarRecuperacao(id(6));
    expect(confirmar.mock.calls[0]).toEqual(confirmar.mock.calls[1]);
    expect(dados.conta.obter().sessao?.token).toBe(sessao.token);
  });

  it('retenta após registrar a identidade e falhar ao carregar a loja', async () => {
    const { dados, confirmar, iniciar } = montar();
    await dados.iniciarRecuperacao(perfil.email, '123456');
    vi.spyOn(dados.produtos, 'carregar').mockRejectedValueOnce(new Error('falha ao carregar loja'));
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toThrow('falha ao carregar loja');
    expect(dados.conta.obter()).toMatchObject({ sessao: null, identidade: { contaId: perfil.contaId, aparelhoId: iniciar.mock.calls[0]![0].aparelhoId }, perfil: { email: perfil.email } });
    await dados.confirmarRecuperacao(id(6));
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(confirmar.mock.calls[0]).toEqual(confirmar.mock.calls[1]);
    expect(dados.conta.obter().sessao).toMatchObject({ token: sessao.token, contaId: perfil.contaId });
  });

  it('não adota conta externa publicada durante falha da aplicação', async () => {
    const { dados, confirmar } = montar(); await dados.iniciarRecuperacao(perfil.email, '123456');
    const externa = { ...sessao, token: 'token-externo', contaId: id(80), lojaId: id(81), operadorId: id(82), aparelhoId: id(83) };
    vi.spyOn(dados.produtos, 'carregar').mockImplementationOnce(async () => {
      await dados.conta.registrar(externa, { email: 'externa@exemplo.com', nomeResponsavel: 'Outra', nomeLoja: 'Outra', aparelhoNome: 'Outro' });
      throw new Error('falha após troca externa');
    });
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toThrow('falha após troca externa');
    expect(dados.conta.obter().sessao).toEqual(externa);
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'conflito' });
    expect(confirmar).toHaveBeenCalledTimes(1); expect(dados.conta.obter().sessao).toEqual(externa);
  });

  it('cancelar após início da aplicação conclui commit e serializa login seguinte', async () => {
    const { dados } = montar(); await dados.iniciarRecuperacao(perfil.email, '123456');
    const entrou = pendente<void>(); const liberar = pendente<void>();
    const original = dados.conta.registrar.bind(dados.conta);
    const ordem: string[] = [];
    vi.spyOn(dados.conta, 'registrar').mockImplementationOnce(async (s, p) => {
      ordem.push('aplicação iniciada'); entrou.resolver(); await liberar.promessa;
      await original(s, p); ordem.push('recuperação gravada');
    });
    const loginBackend = vi.spyOn(dados.backend, 'entrar').mockImplementation(async req => {
      ordem.push('login remoto');
      return { ...sessao, token: 'token-novo', aparelhoId: req.aparelhoId };
    });
    const confirmar = dados.confirmarRecuperacao(id(6)); await entrou.promessa;
    expect(dados.conta.transicao.obter()).toBe(true);
    dados.cancelarRecuperacao(); const login = dados.entrar(perfil.email, '123456');
    expect(loginBackend).not.toHaveBeenCalled(); expect(dados.conta.obter().sessao).toBeNull();
    liberar.resolver(); await confirmar;
    await login;
    expect(ordem).toEqual(['aplicação iniciada', 'recuperação gravada', 'login remoto']);
    expect(dados.conta.obter().sessao?.token).toBe('token-novo');
    expect(dados.conta.transicao.obter()).toBe(false);
  });

  it('novas pendências bloqueiam confirmação de outra conta antes da rede', async () => {
    const { dados, confirmar, iniciar } = montar();
    const local = { ...sessao, contaId: id(20), lojaId: id(21), operadorId: id(22), aparelhoId: id(23) };
    await dados.conta.registrar(local, { email: 'outra@exemplo.com', nomeResponsavel: 'Outra', nomeLoja: 'Outra', aparelhoNome: 'Novo' });
    await dados.iniciar();
    await dados.iniciarRecuperacao(perfil.email, '123456');
    await dados.carrinho.adicionarAvulso(2500, 'Pendente');
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'conflito' });
    expect(iniciar).toHaveBeenCalledTimes(1); expect(confirmar).not.toHaveBeenCalled();
  });

  it('pendências bloqueiam iniciação de outra conta antes da rede', async () => {
    const { dados, iniciar } = montar();
    const local = { ...sessao, contaId: id(20), lojaId: id(21), operadorId: id(22), aparelhoId: id(23) };
    await dados.conta.registrar(local, { email: 'outra@exemplo.com', nomeResponsavel: 'Outra', nomeLoja: 'Outra', aparelhoNome: 'Novo' });
    await dados.iniciar(); await dados.carrinho.adicionarAvulso(2500, 'Pendente');
    await expect(dados.iniciarRecuperacao(perfil.email, '123456')).rejects.toMatchObject({ codigo: 'conflito' });
    expect(iniciar).not.toHaveBeenCalled();
  });

  it('cancelar confirmação durante a rede impede aplicar resposta', async () => {
    const { dados, confirmar, obter, iniciar } = montar(); await dados.iniciarRecuperacao(perfil.email, '123456');
    const bloqueio = pendente<typeof sessao>(); confirmar.mockReturnValueOnce(bloqueio.promessa);
    const chamada = dados.confirmarRecuperacao(id(6));
    await vi.waitFor(() => expect(confirmar).toHaveBeenCalled());
    dados.cancelarRecuperacao(); bloqueio.resolver({ ...sessao, aparelhoId: iniciar.mock.calls[0]![0].aparelhoId });
    await expect(chamada).rejects.toMatchObject({ codigo: 'conflito' });
    expect(obter).not.toHaveBeenCalled(); expect(dados.conta.obter().sessao).toBeNull();
  });

  it('cancelar enquanto iniciação aguarda a fila impede chamada remota', async () => {
    const { dados, iniciar } = montar();
    const bloqueio = pendente<typeof sessao>(); const entrar = vi.spyOn(dados.backend, 'entrar').mockReturnValueOnce(bloqueio.promessa);
    const login = dados.entrar(perfil.email, '123456');
    await vi.waitFor(() => expect(entrar).toHaveBeenCalled());
    const chamada = dados.iniciarRecuperacao(perfil.email, '123456'); dados.cancelarRecuperacao();
    bloqueio.resolver({ ...sessao, aparelhoId: entrar.mock.calls[0]![0].aparelhoId });
    await login; await expect(chamada).rejects.toMatchObject({ codigo: 'conflito' });
    expect(iniciar).not.toHaveBeenCalled();
  });

  it.each(['login', 'logout', 'cadastro'])('%s invalida imediatamente resposta de recuperação pendente', async (acao) => {
    const { dados, iniciar } = montar();
    const bloqueio = pendente<Awaited<ReturnType<typeof dados.backend.iniciarRecuperacao>>>(); iniciar.mockReturnValueOnce(bloqueio.promessa);
    const chamada = dados.iniciarRecuperacao(perfil.email, '123456');
    await vi.waitFor(() => expect(iniciar).toHaveBeenCalled());
    vi.spyOn(dados.backend, 'entrar').mockRejectedValue(new ErroBackend('rede', 'falhou'));
    vi.spyOn(dados.backend, 'criarConta').mockRejectedValue(new ErroBackend('rede', 'falhou'));
    const outra = acao === 'login' ? dados.entrar(perfil.email, '123456') : acao === 'cadastro' ? dados.criarConta({ email: perfil.email, nomeResponsavel: 'Ana', nomeLoja: 'Loja', documento: '00000000001', tipoLoja: 'Mercado' }) : dados.sair();
    const req = iniciar.mock.calls[0]![0];
    bloqueio.resolver({ id: id(9), token: 'a'.repeat(43), expiraEm: '2026-10-29T12:05:00.000Z', perfil, aparelhoNovoId: req.aparelhoId, aparelhoNovoNome: req.aparelhoNome, aparelhos: [{ id: id(6), nome: 'Antigo', ultimoAcessoEm: '2026-10-28T12:00:00.000Z' }] });
    await expect(chamada).rejects.toMatchObject({ codigo: 'conflito' });
    if (acao !== 'logout') await expect(outra).rejects.toMatchObject({ codigo: 'rede' }); else await outra;
    await expect(dados.confirmarRecuperacao(id(6))).rejects.toMatchObject({ codigo: 'conflito' });
  });
});
