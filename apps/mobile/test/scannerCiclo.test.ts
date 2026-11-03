import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ permissao: true, pedir: vi.fn(), toast: vi.fn(), ouvinte: null as any }));
vi.mock('expo-camera', () => ({ CameraView: 'camera', useCameraPermissions: () => [{ granted: m.permissao, canAskAgain: true }, m.pedir] }));
vi.mock('react-native', () => {
  class Value { constructor(_v: number) {} setValue() {} interpolate() { return 0; } }
  const animacao = () => ({ start() {}, stop() {} });
  return { View: 'view', TextInput: 'input', Pressable: 'pressable', Platform: { OS: 'android' }, StyleSheet: { create: (s: any) => s, absoluteFill: {} }, AccessibilityInfo: { announceForAccessibility() {} }, Animated: { Value, View: 'animated', timing: animacao, sequence: animacao, loop: animacao }, Easing: { inOut: () => 0, ease: 0 }, AppState: { currentState: 'active', addEventListener: (_: string, f: any) => { m.ouvinte = f; return { remove: vi.fn() }; } } };
});
vi.mock('@/dados/hooks', () => ({ usePreferencias: () => ({ preferencias: { lanterna: true, ignorarMesmoCodigoMs: 1000, vibrar: false, bipe: false } }) }));
vi.mock('@/tema', () => ({ cores: { bg: '#fff', ink: '#111', ink2: '#333', ink3: '#666', anil: '#00f', pitanga: '#f00', noite: '#000', surface: '#eee', manga: '#ff0' }, raio: { md: 16 }, texto: { corpoL: {} }, textoBotao: { S: {}, M: {} }, legendaForte: {} }));
vi.mock('@/tema/useFoco', () => ({ useFoco: () => ({}) }));
vi.mock('@/tema/useReducaoMovimento', () => ({ useReducaoMovimento: () => true }));
vi.mock('@/util/haptico', () => ({ toqueLeve() {} }));
vi.mock('@/componentes/bipe', () => ({ tocarBipe() {} }));
vi.mock('@/componentes/Toast', () => ({ useToast: () => ({ mostrar: m.toast }) }));
vi.mock('@/componentes/Botao', () => ({ Botao: 'botao' }));
vi.mock('@/componentes/BotaoIcone', () => ({ BotaoIcone: 'iconebotao' }));
vi.mock('@/componentes/Icone', () => ({ Icone: 'icone' }));
vi.mock('@/componentes/Texto', () => ({ Texto: 'texto' }));
vi.mock('@/componentes/BottomSheet', () => ({ BottomSheet: ({ visivel, children }: any) => visivel ? children : null }));
import { Scanner } from '@/componentes/Scanner';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let r: ReactTestRenderer;
beforeEach(() => { m.permissao = true; m.pedir.mockReset(); m.toast.mockReset(); });
afterEach(async () => { if (r) await act(async () => r.unmount()); });
const cameras = () => r.root.findAll(n => n.type === 'camera' as any);
it('Android desmonta a sessão ao pausar e ao ir ao fundo; retoma apenas ativo', async () => {
  const ler = vi.fn();
  await act(async () => { r = create(React.createElement(Scanner, { onLer: ler })); });
  expect(cameras()).toHaveLength(1);
  await act(async () => r.update(React.createElement(Scanner, { onLer: ler, pausado: true })));
  expect(cameras()).toHaveLength(0);
  await act(async () => r.update(React.createElement(Scanner, { onLer: ler, pausado: false })));
  await act(async () => m.ouvinte('background')); expect(cameras()).toHaveLength(0);
  await act(async () => m.ouvinte('active')); expect(cameras()).toHaveLength(1);
});
it('permissão com rejeição informa erro e digitação abre formulário em sheet, sem câmera por trás', async () => {
  m.permissao = false; m.pedir.mockRejectedValue(new Error('bridge'));
  await act(async () => { r = create(React.createElement(Scanner, { onLer: vi.fn() })); });
  expect(r.root.findAll(n => n.type === 'input' as any)).toHaveLength(0);
  const botao = (s: string) => r.root.findAll(n => n.type === 'botao' as any).find(n => n.props.rotulo === s)!;
  await act(async () => botao('Permitir câmera').props.onPress()); expect(m.toast).toHaveBeenCalled();
  await act(async () => botao('Digitar código').props.onPress());
  expect(r.root.findAll(n => n.type === 'input' as any)).toHaveLength(1); expect(cameras()).toHaveLength(0);
});
