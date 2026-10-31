import { afterEach, describe, expect, it } from 'vitest';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import configure from '../app.config';

const original = { ...process.env };
const config: ExpoConfig = { name: 'PDV', slug: 'pdv-mobile', scheme: 'pdv', version: '0.1.3', android: { package: 'br.com.pdv.mobile', versionCode: 4 } };
const context = { config } as ConfigContext;

afterEach(() => { process.env = { ...original }; });

describe('configuração do APK de teste', () => {
  it('preserva a configuração normal', () => {
    delete process.env.PDV_APK_HOMOLOGACAO;
    expect(configure(context)).toEqual(config);
  });

  it('usa nome e slug estáticos quando o contexto é parcial', () => {
    delete process.env.PDV_APK_HOMOLOGACAO;
    expect(configure({ config: { scheme: 'personalizado' } } as ConfigContext)).toMatchObject({
      name: 'PDV', slug: 'pdv-mobile', scheme: 'personalizado',
    });
  });

  it('isola pacote, nome e esquema sem alterar a configuração original', () => {
    process.env.PDV_APK_HOMOLOGACAO = '1';
    delete process.env.PDV_APK_VERSION_CODE;
    expect(configure(context)).toMatchObject({ name: 'PDV Teste', scheme: 'pdv-teste', version: '0.1.4', android: { package: 'br.com.pdv.homologacao', versionCode: 5 } });
    expect(config.android?.package).toBe('br.com.pdv.mobile');
  });

  it('permite versão de atualização e rejeita valores inválidos', () => {
    process.env.PDV_APK_HOMOLOGACAO = '1';
    process.env.PDV_APK_VERSION_CODE = '6';
    expect(configure(context).android?.versionCode).toBe(6);
    for (const value of ['4', '-5', '5.1', 'abc', '2100000001']) {
      process.env.PDV_APK_VERSION_CODE = value;
      expect(() => configure(context)).toThrow();
    }
  });
});
