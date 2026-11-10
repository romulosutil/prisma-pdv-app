import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { gerarId, MockBillingProvider, RelogioFalso } from '@pdv/shared';
import { eq } from 'drizzle-orm';
import { abrirBanco } from '../../api/test/ajuda';
import { emissaoTeste } from '../../api/test/emailFixture';
import { criarApp } from '../../api/src/servidor';
import { contas, codigosLogin, entregasCodigo, sessoes } from '../../api/src/db/schema';
import { Dados } from '../src/dados/dados';
import { ArmazenamentoMemoria } from './ambiente';
const m = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), rascunho: null as any }));
vi.mock('react-native', async () => { const R = await import('react'); return { View: (p: any) => R.createElement('view', p, p.children), StyleSheet: { create: (v: unknown) => v } }; });
vi.mock('expo-router', () => ({ useRouter: () => ({ push: m.push, replace: m.replace, back: m.back }) }));
vi.mock('@/dados/hooks', () => ({ useDados: () => real }));
vi.mock('@/tema', () => ({ cores: { ink2: 'ink' } }));
vi.mock('@/componentes/Botao', async () => { const R = await import('react'); return { Botao: (p: any) => R.createElement('botao', p) }; });
vi.mock('@/componentes/Campo', async () => { const R = await import('react'); return { Campo: (p: any) => R.createElement('campo', p) }; });
vi.mock('@/componentes/Texto', async () => { const R = await import('react'); return { Texto: (p: any) => R.createElement('texto', p, p.children) }; });
vi.mock('@/componentes/Banner', async () => { const R = await import('react'); return { Banner: (p: any) => R.createElement('banner', p) }; });
vi.mock('@/componentes/Chip', async () => { const R = await import('react'); return { Chip: (p: any) => R.createElement('chip', p) }; });
vi.mock('@/componentes/CabecalhoEtapa', async () => { const R = await import('react'); return { CabecalhoEtapa: (p: any) => R.createElement('cabecalho', p) }; });
vi.mock('@/componentes/TelaBase', async () => { const R = await import('react'); return { TelaBase: (p: any) => R.createElement('tela', null, p.children, p.rodape) }; });
import CriarConta from '../app/(onboarding)/criar-conta';
import Loja from '../app/(onboarding)/loja';
import { RascunhoProvider, useRascunho } from '@/nucleo/rascunho';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let banco: Awaited<ReturnType<typeof abrirBanco>>;
let app: Awaited<ReturnType<typeof criarApp>>;
let real: Dados;
let r: ReactTestRenderer | undefined;
function Capturar() { m.rascunho = useRascunho().rascunho; return null; }
const tela = (C: typeof CriarConta) => React.createElement(RascunhoProvider, null, React.createElement(C), React.createElement(Capturar));
const campo = (rotulo: string) => r!.root.findAll(n => n.type === ('campo' as any) && n.props.rotulo === rotulo)[0]!;
const botao = (rotulo: string) => r!.root.findAll(n => n.type === ('botao' as any) && n.props.rotulo === rotulo)[0]!;
const clicar = async (rotulo: string) => { await act(async () => { await botao(rotulo).props.onPress(); }); };
beforeEach(async () => {
 banco = await abrirBanco();
 app = await criarApp({ db: banco.db, relogio: new RelogioFalso(new Date()), billing: new MockBillingProvider(), emissaoCodigo: emissaoTeste, cobrancaDesativada: true, fontesEan: [] });
 vi.stubGlobal('fetch', async (entrada: string | URL | Request, init?: RequestInit) => {
  const url = new URL(typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url);
  const resposta = await app.inject({ method: (init?.method ?? 'GET') as 'GET' | 'POST', url: url.pathname, headers: Object.fromEntries(new Headers(init?.headers).entries()), ...(init?.body ? { payload: String(init.body) } : {}) });
  return new Response(resposta.statusCode === 204 ? null : resposta.body, { status: resposta.statusCode, headers: { 'content-type': 'application/json' } });
 });
 real = new Dados(new ArmazenamentoMemoria(), gerarId, 'http://api.local'); await real.iniciar();
},30000);
afterEach(async () => { if(r) await act(async () => r!.unmount()); r=undefined; vi.unstubAllGlobals(); vi.resetAllMocks(); await app?.close(); await banco?.fechar(); });
async function codigo(email: string) {
 const entregas = await banco.db.select({ entrega: entregasCodigo }).from(entregasCodigo).innerJoin(codigosLogin,eq(entregasCodigo.codigoId,codigosLogin.id)).where(eq(codigosLogin.email,email));
 const entrega = entregas[entregas.length-1]?.entrega;
 if(!entrega || emissaoTeste.modo!=='email') throw new Error('Fixture sem entrega.');
 return emissaoTeste.chaves.cifradores.get('teste')!.decifrar(entrega.envelope,{id:entrega.id,codigoId:entrega.codigoId}).codigo;
}
async function preencher(email: string) {
 await act(async () => { r=create(tela(CriarConta)); });
 await act(async () => {campo('Seu nome').props.onChangeText('Teste');campo('E-mail').props.onChangeText(email);campo('CPF ou CNPJ').props.onChangeText('529.982.247-25');});
 await clicar('Continuar e enviar código');
}
async function confirmar(email: string) {
 const otp=await codigo(email);
 await act(async () => campo('Código de confirmação do e-mail').props.onChangeText(otp));
 await clicar('Confirmar e continuar');
 return otp;
}
it('formulário com API real de teste recusa CPF duplicado depois de validar OTP e mantém a primeira tela',async()=>{
 const original=new Dados(new ArmazenamentoMemoria(),gerarId,'http://api.local'); await original.iniciar();
 const email='original-form@example.com'; const desafio=await original.pedirCodigoCadastro(email); const otp=await codigo(email);
 await original.verificarCadastro(email,'52998224725',desafio.desafioId,otp);
 await original.criarConta({email,documento:'52998224725',nomeResponsavel:'Original',nomeLoja:'Loja',tipoLoja:'Mercado'});
 await preencher('nova-form@example.com');
 expect(m.push).not.toHaveBeenCalled();expect(await banco.db.$count(contas)).toBe(1);
 await confirmar('nova-form@example.com');
 expect(campo('CPF ou CNPJ').props.erro).toContain('Já existe uma conta com este CPF/CNPJ');
 expect(m.push).not.toHaveBeenCalled();expect(real.conta.obter().sessao).toBeNull();
 expect(await banco.db.$count(contas)).toBe(1);expect(await banco.db.$count(sessoes)).toBe(1);
});
it('formulário com API real só cria conta após OTP e confirmação dos dados da loja',async()=>{
 const email='livre-form@example.com';await preencher(email);
 expect(await banco.db.$count(contas)).toBe(0);expect(m.push).not.toHaveBeenCalled();
 const otp=await confirmar(email);
 expect(await banco.db.$count(contas)).toBe(0);expect(m.push).toHaveBeenCalledWith('/loja');
 await act(async()=>r!.update(tela(Loja)));await clicar('Criar minha conta');
 expect(await banco.db.$count(contas)).toBe(1);expect(await banco.db.$count(sessoes)).toBe(1);
 expect(real.conta.obter().sessao).not.toBeNull();expect(m.replace).toHaveBeenCalledWith('/pagamentos');
 expect(JSON.stringify(m.rascunho)).not.toContain(otp);
});
