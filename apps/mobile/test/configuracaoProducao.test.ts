import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import configure from '../app.config';
import release from '../release.json';

const originalEnv = { ...process.env };
const originalRelease = { ...release };
const config: ExpoConfig = { name: 'Outro', slug: 'pdv-mobile', scheme: 'outro', version: '0.1.3', android: { package: 'outro.pacote', versionCode: 4 }, extra: { existente: true } };
const context = { config } as ConfigContext;

beforeEach(() => {
  process.env = { ...originalEnv, PDV_BUILD_PROFILE: 'production', EXPO_PUBLIC_FERRAMENTAS_TESTE: '0', EXPO_PUBLIC_API_URL: originalRelease.apiUrl };
  delete process.env.PDV_APK_HOMOLOGACAO;
});
afterEach(() => { process.env = { ...originalEnv }; Object.assign(release, originalRelease); });

describe('configuração do APK de produção', () => {
  it('fixa identidade, versão e código, sem mutar a entrada ou adicionar segredos', () => {
    const snapshot = structuredClone(config);
    const result = configure(context);
    expect(result).toMatchObject({ name: 'PDV', slug: 'pdv-mobile', scheme: 'pdv', version: originalRelease.version, android: { package: 'br.com.pdv.mobile', versionCode: originalRelease.versionCode } });
    expect(result.extra).toEqual({ existente: true, pdvBuild: { profile: 'production', apiUrl: originalRelease.apiUrl, toolsEnabled: false, versionCode: originalRelease.versionCode } });
    expect(config).toEqual(snapshot);
  });

  it('recusa conflito de perfil e ferramentas de teste ligadas ou indefinidas', () => {
    process.env.PDV_APK_HOMOLOGACAO = '1';
    expect(() => configure(context)).toThrow();
    delete process.env.PDV_APK_HOMOLOGACAO;
    for (const value of ['1', '', 'false']) {
      process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE = value;
      expect(() => configure(context)).toThrow();
    }
    delete process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE;
    expect(() => configure(context)).toThrow();
  });

  it('recusa URL ausente, divergente ou insegura', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(() => configure(context)).toThrow();
    process.env.EXPO_PUBLIC_API_URL = 'https://example.com';
    expect(() => configure(context)).toThrow();
    for (const value of ['https://example.com', 'http://example.com', 'https://localhost', 'https://localhost.', 'https://interno', ' https://example.com', 'https://192.168.1.1', 'https://172.16.1.1', 'https://user:pass@example.com', 'https://example.com/?', 'https://example.com/#', 'inválida']) {
      release.apiUrl = value;
      process.env.EXPO_PUBLIC_API_URL = value;
      expect(() => configure(context)).toThrow();
    }
  });

  it('recusa versões e códigos inválidos', () => {
    for (const value of ['0.9.9', '1.0', '01.0.0', '1.0.0-beta', '-1.0.0']) {
      release.version = value;
      expect(() => configure(context)).toThrow();
    }
    release.version = originalRelease.version;
    for (const value of [0, 6, -1, 1.5, 2100000001]) {
      release.versionCode = value;
      expect(() => configure(context)).toThrow();
    }
  });
});
