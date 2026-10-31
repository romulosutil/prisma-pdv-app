import { afterEach, expect, it, vi } from 'vitest';
import { criarAcessoLiberado, gerarId, licencaDe, serializarAssinatura, serializarLicenca } from '@pdv/shared';
import { Dados } from '@/dados/dados';
import { ArmazenamentoMemoria } from './ambiente';

afterEach(() => vi.restoreAllMocks());
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
