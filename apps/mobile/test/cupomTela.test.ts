import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ iniciar: vi.fn().mockResolvedValue(undefined), replace: vi.fn() }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: React.PropsWithChildren) => R.createElement('view', p, p.children), StyleSheet: { create: (v: unknown) => v } }; });
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn(), replace: m.replace }) }));
vi.mock('@/dados/hooks', () => ({ useDados: () => ({ relogio: { agora: () => new Date('2026-10-30T12:00:00Z') } }), useConta: () => ({ perfil: { nomeResponsavel: 'Teste' } }), useAssinatura: () => ({ servico: { iniciarTeste: m.iniciar } }) }));
vi.mock('@/nucleo/rascunho', () => ({ useRascunho: () => ({ rascunho: { planoId: 'pro' } }) }));
vi.mock('@/tema', () => ({ cores: { ink2: '#000', folha: '#080', anil: '#00f', anilSoft: '#eef' }, raio: { md: 8 } }));
vi.mock('@/componentes/CabecalhoEtapa', async () => { const R = await import('react'); return { CabecalhoEtapa: (p: object) => R.createElement('etapa', p) }; });
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: object) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: object) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Icone', async () => { const R = await import('react'); return { Icone: (p: object) => R.createElement('icone', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: React.PropsWithChildren) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: React.PropsWithChildren) => R.createElement('tela', p, p.children) }; });
vi.mock('@/componentes/FormularioCartao', async () => { const R = await import('react'); return { FormularioCartao: (p: { resumo?: React.ReactNode }) => R.createElement('formulario', p, p.resumo) }; });
import Tela from '../app/(onboarding)/cartao';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let r: ReactTestRenderer;
const campo = () => r.root.findByType('campo' as never);
const formulario = () => r.root.findByType('formulario' as never);
const textos = () => r.root.findAllByType('texto' as never).map((n) => React.Children.toArray(n.props.children).join('')).join('\n');
async function codigo(valor: string) { await act(async () => campo().props.onChangeText(valor)); }
async function clicar(rotulo: string) { await act(async () => r.root.findAllByType('botao' as never).find((n) => n.props.rotulo === rotulo)!.props.onPress()); }
afterEach(async () => { if (r) await act(async () => r.unmount()); vi.clearAllMocks(); });

describe('cupom no checkout', () => {
  it('mostra preço integral, aplica desconto, envia código e permite remover', async () => {
    await act(async () => { r = create(React.createElement(Tela)); });
    expect(textos()).toContain('A partir de 06/11: R$ 49,90/mês');
    await codigo(' vitalicio50 '); await clicar('Aplicar cupom');
    expect(campo().props.value).toBe('VITALICIO50');
    expect(textos()).toContain('50% de desconto vitalício');
    expect(textos()).toContain('A partir de 06/11: R$ 24,95/mês');
    await act(async () => formulario().props.aoEnviar('token'));
    expect(m.iniciar).toHaveBeenCalledWith('pro', 'token', 'VITALICIO50');
    expect(m.replace).toHaveBeenCalledWith('/teste-iniciado');
    await clicar('Remover cupom');
    expect(campo().props.value).toBe('');
    expect(textos()).toContain('A partir de 06/11: R$ 49,90/mês');
  });
  it('edição invalida prévia e bloqueia envio até aplicar ou remover código', async () => {
    await act(async () => { r = create(React.createElement(Tela)); });
    await codigo('VITALICIO50'); await clicar('Aplicar cupom');
    await codigo('INVALIDO');
    expect(textos()).toContain('A partir de 06/11: R$ 49,90/mês');
    await act(async () => formulario().props.aoEnviar('token'));
    expect(m.iniciar).not.toHaveBeenCalled();
    expect(m.replace).not.toHaveBeenCalled();
    expect(campo().props.erro).toBe('Aplique ou remova o cupom antes de continuar.');
    await clicar('Aplicar cupom');
    expect(campo().props.erro).toBe('Cupom inválido. Confira o código e tente novamente.');
    await codigo('');
    await act(async () => formulario().props.aoEnviar('token'));
    expect(m.iniciar).toHaveBeenCalledWith('pro', 'token', undefined);
  });
});
