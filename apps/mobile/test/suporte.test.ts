import { expect, it, vi } from 'vitest';
import { gerarId, VERSAO_POLITICAS, type Sessao, type SolicitarSuporte } from '@pdv/shared';
import { SuporteServico } from '@/servicos/suporte';
import { ArmazenamentoEscopo } from '@/dados/armazenamentoEscopo';
import { decidirRota } from '@/nucleo/fluxo';
import type { Backend } from '@/servicos/backend';
import { ArmazenamentoMemoria } from './ambiente';

const sessao = (): Sessao => ({ contaId: gerarId(), lojaId: gerarId(), operadorId: gerarId(), aparelhoId: gerarId(), token: gerarId(), papel: 'dono' });
const resposta = (req: SolicitarSuporte) => ({ ...req, estado: 'aberto' as const, resposta: null, criadoEm: '2026-11-02T12:00:00.000Z', atualizadoEm: '2026-11-02T12:00:00.000Z' });
it('resposta perdida e reinício reenviam a mesma solicitação sem duplicar protocolo', async () => {
  const s = sessao(), base = new ArmazenamentoMemoria();
  const armazenamento = new ArmazenamentoEscopo(base, () => s, true);
  const chamada = vi.fn().mockRejectedValueOnce(new Error('ACK perdido')).mockImplementation(async req => resposta(req));
  const backend = { modo: 'http', solicitarSuporte: chamada } as unknown as Backend;
  let suporte = new SuporteServico(backend, armazenamento, () => s, gerarId);
  await expect(suporte.enviar({ tipo: 'exclusao', mensagem: 'Analisar exclusão dos dados.', diagnostico: null })).rejects.toThrow();
  const salvo = await suporte.pendente(); expect(salvo?.versaoPoliticas).toBe(VERSAO_POLITICAS);
  suporte = new SuporteServico(backend, armazenamento, () => s, gerarId);
  await suporte.enviar(); expect(chamada.mock.calls[1]![0]).toEqual(salvo);
  expect(await suporte.pendente()).toBeNull(); expect(JSON.stringify([...base.dados])).not.toContain(s.token);
});
it('não envia nem remove solicitação de outro perfil durante resposta pendente', async () => {
  const a = sessao(), b = { ...a, operadorId: gerarId() }; let ativa = a;
  const armazenamento = new ArmazenamentoEscopo(new ArmazenamentoMemoria(), () => ativa, true);
  let resolver!: (v: any) => void;
  const chamada = vi.fn(() => new Promise<any>(r => { resolver = r; }));
  const suporte = new SuporteServico({ modo: 'http', solicitarSuporte: chamada } as unknown as Backend, armazenamento, () => ativa, gerarId);
  const envio = suporte.enviar({ tipo: 'suporte', mensagem: 'Conferir sincronização.', diagnostico: null });
  await vi.waitFor(() => expect(chamada).toHaveBeenCalledOnce());
  const original = await suporte.pendente(); ativa = b;
  expect(await suporte.pendente()).toBeNull();
  resolver(resposta(original!)); await expect(envio).rejects.toMatchObject({ codigo: 'conflito' });
  ativa = a; expect(await suporte.pendente()).toEqual(original);
});
it('falha de disco impede HTTP e chamadas simultâneas compartilham o mesmo envio', async () => {
  const s = sessao(), base = new ArmazenamentoMemoria(), chamada = vi.fn(async req => resposta(req));
  const suporte = new SuporteServico({ modo: 'http', solicitarSuporte: chamada } as unknown as Backend, base, () => s, gerarId);
  vi.spyOn(base, 'gravar').mockRejectedValueOnce(new Error('disco cheio'));
  await expect(suporte.enviar({ tipo: 'suporte', mensagem: 'Conferir registros.', diagnostico: null })).rejects.toThrow('disco cheio');
  expect(chamada).not.toHaveBeenCalled();
  const a = suporte.enviar({ tipo: 'suporte', mensagem: 'Conferir registros.', diagnostico: null });
  expect(suporte.enviar()).toBe(a); await a; expect(chamada).toHaveBeenCalledOnce();
});
it('políticas continuam acessíveis sem conta, com sessão vencida ou bloqueio comercial', () => {
  for (const temConta of [false, true]) expect(decidirRota({ temConta, assinatura: null, agora: new Date(), reautenticacaoNecessaria: true }, ['suporte'])).toBeNull();
});
