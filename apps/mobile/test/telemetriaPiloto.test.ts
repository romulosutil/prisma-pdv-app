import { afterEach, expect, it, vi } from 'vitest';
import { RegistroPiloto, acaoSegura, camposErro, endpointSeguro, falhaAcessoSegura, LIMITE_EVENTOS, rotaSegura } from '@/telemetria/nucleo';
import { ArmazenamentoMemoria } from './ambiente';
const id = '00000000-0000-4000-8000-000000000001';
afterEach(() => vi.useRealTimers());

it('distingue conflitos de cadastro e limite de emissão sem aceitar texto livre no diagnóstico', async () => {
  vi.useFakeTimers(); const r = new RegistroPiloto(id); await r.iniciar(new ArmazenamentoMemoria(), () => null);
  r.registrar('http', { endpoint: endpointSeguro('/auth/cadastro/codigo'), status: 409, falhaAcesso: falhaAcessoSegura('documento_ja_cadastrado') });
  r.registrar('http', { endpoint: endpointSeguro('/auth/codigo'), status: 429, falhaAcesso: falhaAcessoSegura('limite_autenticacao') });
  r.registrar('http', { endpoint: '/contas', status: 409, falhaAcesso: falhaAcessoSegura('CPF=52998224725 email=ana@example.com') });
  r.registrar('acao', { acao: acaoSegura('Já tenho conta') }); await r.salvar();
  const eventos = r.exportar().eventos;
  expect(eventos[0]?.campos).toMatchObject({ endpoint: '/auth/cadastro/codigo', falhaAcesso: 'documento_ja_cadastrado' });
  expect(eventos[1]?.campos.falhaAcesso).toBe('limite_autenticacao'); expect(eventos[2]?.campos.falhaAcesso).toBeUndefined();
  expect(eventos[3]?.campos.acao).toBe('Já tenho conta');
  expect(JSON.stringify(eventos)).not.toMatch(/52998224725|ana@example.com/);
});

it('guarda somente campos permitidos e nunca exporta texto, credencial, documento ou identificador de perfil', async () => {
  vi.useFakeTimers(); const base = new ArmazenamentoMemoria(); const r = new RegistroPiloto(id);
  await r.iniciar(base, () => 'empresa/ana');
  r.registrar('http', { endpoint: '/contas', status: 409, token: 'segredo', documento: '12345678901', mensagem: 'Ana', corpo: { email: 'ana@example.com' } } as any);
  r.registrar('acao', { acao: acaoSegura('Cliente Ana 12345678901') });
  r.registrar('navegacao', { rota: rotaSegura('/produtos/00000000-0000-4000-8000-000000000002?token=segredo') });
  const e = new TypeError('CPF=12345678901 Bearer segredo'); e.stack = `${e.message}\n at fn (https://bundle:1:234)\n at nomePessoal (https://bundle:2:345)`;
  r.registrar('erro', camposErro(e)); await r.salvar();
  const json = JSON.stringify(r.exportar());
  for (const proibido of ['segredo', '12345678901', 'Ana', 'ana@example.com', 'empresa/ana', 'nomePessoal', 'https://bundle']) expect(json).not.toContain(proibido);
  expect(r.exportar().eventos[3]?.campos).toEqual({ erro: 'TypeError', posicoes: ['1:234', '2:345'] });
  expect(endpointSeguro('/catalogo/ean/7894900010015?email=ana@example.com')).toBe('/catalogo/ean');
  expect(endpointSeguro('/desconhecido/ana@example.com')).toBe('outro');
  expect(rotaSegura('/clientes/ana@example.com')).toBe('outra');
});

it('sobrevive ao reinício, limita o buffer e separa histórico de perfis sem perder eventos capturados durante a leitura', async () => {
  vi.useFakeTimers(); const base = new ArmazenamentoMemoria(); let perfil = 'ana'; const r = new RegistroPiloto(id);
  await r.iniciar(base, () => perfil);
  r.registrar('acao', { acao: 'Abrir caixa' }); perfil = 'bruno'; r.registrar('acao', { acao: 'Fechar caixa' }); await r.salvar();
  expect(r.exportar().eventos.map(e => e.campos.acao)).toEqual(['Fechar caixa']);
  perfil = 'ana'; const retomado = new RegistroPiloto('00000000-0000-4000-8000-000000000002');
  const inicio = retomado.iniciar(base, () => perfil); retomado.registrar('app', { etapa: 'inicio' }); await inicio;
  expect(retomado.exportar().eventos.map(e => e.tipo)).toEqual(['acao', 'app']);
  for (let i = 0; i < LIMITE_EVENTOS + 10; i++) retomado.registrar('sincronizacao', { pendentes: i });
  await retomado.salvar(); expect(retomado.exportar().eventos).toHaveLength(LIMITE_EVENTOS);
});

it('disco cheio e dados legados inválidos não quebram o app nem apagam o histórico em memória', async () => {
  vi.useFakeTimers(); const base = new ArmazenamentoMemoria(); const r = new RegistroPiloto(id);
  vi.spyOn(base, 'obter').mockRejectedValue(new Error('arquivo corrompido')); const salvar = vi.spyOn(base, 'gravar').mockRejectedValue(new Error('disco cheio'));
  await r.iniciar(base, () => null); r.registrar('erro', { erro: 'erro_js' }); await r.salvar();
  expect(r.exportar().eventos).toHaveLength(1); expect(r.exportar().persistenciaPendente).toBe(true);
  salvar.mockRestore(); await r.salvar(); expect(r.exportar().persistenciaPendente).toBe(false);
});
