import { afterEach, expect, it, vi } from 'vitest';
import { criarAcessoLiberado, gerarId, licencaDe, serializarAssinatura, serializarLicenca } from '@pdv/shared';
import { Dados } from '@/dados/dados';
import { ArmazenamentoMemoria } from './ambiente';

afterEach(() => vi.restoreAllMocks());
it('a confirmação antecipada não prolonga a validade original do código', async () => {
  const dados = new Dados(new ArmazenamentoMemoria(), gerarId, 'https://api.example.com');
  const inicio = Date.now(), agora = vi.spyOn(Date, 'now').mockReturnValue(inicio), desafioId = gerarId();
  vi.spyOn(dados.backend, 'pedirCodigoCadastro').mockResolvedValue({ desafioId });
  vi.spyOn(dados.backend, 'verificarCadastro').mockResolvedValue();
  await dados.pedirCodigoCadastro('nova@example.com');
  agora.mockReturnValue(inicio + 540_000);
  await dados.verificarCadastro('nova@example.com', '52998224725', desafioId, '654321');
  expect(dados.cadastroConfirmado('nova@example.com', '52998224725')).toBe(true);
  agora.mockReturnValue(inicio + 600_001);
  expect(dados.cadastroConfirmado('nova@example.com', '52998224725')).toBe(false);
});
it('mantém a prova antecipada somente na memória, injeta na criação e a descarta após uso', async () => {
  const base = new ArmazenamentoMemoria(), dados = new Dados(base, gerarId, 'https://api.example.com');
  await dados.iniciar();
  const desafioCadastroId = gerarId();
  vi.spyOn(dados.backend, 'pedirCodigoCadastro').mockResolvedValue({ desafioId: desafioCadastroId });
  vi.spyOn(dados.backend, 'verificarCadastro').mockResolvedValue();
  await dados.pedirCodigoCadastro('nova@example.com');
  await dados.verificarCadastro('nova@example.com', '52998224725', desafioCadastroId, '654321');
  expect(dados.cadastroConfirmado('nova@example.com', '52998224725')).toBe(true);
  expect(dados.cadastroConfirmado('outra@example.com', '52998224725')).toBe(false);
  expect(dados.cadastroConfirmado('nova@example.com', '11144477735')).toBe(false);
  expect(JSON.stringify([...base.dados])).not.toContain('654321');
  expect(new Dados(base, gerarId, 'https://api.example.com').cadastroConfirmado('nova@example.com', '52998224725')).toBe(false);
  const criar = vi.spyOn(dados.backend, 'criarConta').mockImplementation(async req => ({ contaId: gerarId(), lojaId: gerarId(), operadorId: gerarId(), aparelhoId: req.aparelhoId, token: 'fixture' }));
  vi.spyOn(dados.assinatura, 'sincronizar').mockResolvedValue();
  await dados.criarConta({ email: 'nova@example.com', documento: '52998224725', nomeResponsavel: 'Ana', nomeLoja: 'Loja', tipoLoja: 'Mercado' });
  expect(criar).toHaveBeenCalledWith(expect.objectContaining({ desafioCadastroId, codigoCadastro: '654321' }));
  expect(dados.cadastroConfirmado('nova@example.com', '52998224725')).toBe(false);
  expect(JSON.stringify([...base.dados])).not.toContain('654321');
});

it('cancelar durante a verificação descarta resposta atrasada sem liberar cadastro', async () => {
  const dados = new Dados(new ArmazenamentoMemoria(), gerarId, 'https://api.example.com');
  let liberar!: () => void;
  let iniciou!: () => void; const pronto = new Promise<void>(resolve => { iniciou = resolve; });
  vi.spyOn(dados.backend, 'verificarCadastro').mockImplementation(() => { iniciou(); return new Promise<void>(resolve => { liberar = resolve; }); });
  const verificacao = dados.verificarCadastro('nova@example.com', '52998224725', gerarId(), '654321');
  const resultado = expect(verificacao).rejects.toMatchObject({ codigo: 'conflito' });
  await pronto; dados.cancelarCadastro(); liberar(); await resultado;
  expect(dados.cadastroConfirmado('nova@example.com', '52998224725')).toBe(false);
});
it('aguarda a licença HTTP concedida no cadastro antes de retornar ao onboarding', async () => {
  const dados = new Dados(new ArmazenamentoMemoria(), gerarId, 'https://api.example.com');
  await dados.iniciar();
  const contaId = gerarId(); const agora = new Date();
  const assinatura = criarAcessoLiberado({ id: gerarId(), contaId, agora });
  vi.spyOn(dados.backend, 'criarConta').mockImplementation(async req => ({ contaId, lojaId: gerarId(), operadorId: gerarId(), aparelhoId: req.aparelhoId, token: 'token-fixture' }));
  let entregar!: (valor: { assinatura: ReturnType<typeof serializarAssinatura>; licenca: ReturnType<typeof serializarLicenca> }) => void;
  let sinalizar!: () => void;
  const iniciou = new Promise<void>(r => { sinalizar = r; });
  const buscar = vi.spyOn(dados.backend, 'obterAssinatura').mockImplementation(() => { sinalizar(); return new Promise(r => { entregar = r; }); });
  let terminou = false;
  const cadastro = dados.criarConta({ nomeResponsavel: 'Maria', email: 'maria@example.com', documento: '12345678901', nomeLoja: 'Loja', tipoLoja: 'Mercado' }).then(() => { terminou = true; });
  await iniciou;
  expect(terminou).toBe(false);
  entregar({ assinatura: serializarAssinatura(assinatura), licenca: serializarLicenca(licencaDe(assinatura, agora)) });
  await cadastro;
  expect(buscar).toHaveBeenCalledTimes(1);
  expect(dados.assinatura.obter().assinatura).toMatchObject({ contaId, status: 'liberada', cartao: null });
  expect(dados.assinatura.obter().licenca?.status).toBe('liberada');
});
