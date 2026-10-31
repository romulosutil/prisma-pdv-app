import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseExpoConfig: ExpoConfig = {
    ...config,
    name: config.name ?? appJson.expo.name,
    slug: config.slug ?? appJson.expo.slug,
  };
  if (process.env.PDV_APK_HOMOLOGACAO !== '1') return baseExpoConfig;

  const rawVersionCode = process.env.PDV_APK_VERSION_CODE ?? '5';
  if (!/^[0-9]+$/.test(rawVersionCode) || !Number.isSafeInteger(Number(rawVersionCode)) || Number(rawVersionCode) < 5 || Number(rawVersionCode) > 2100000000) {
    throw new Error('PDV_APK_VERSION_CODE deve ser um inteiro decimal entre 5 e 2100000000.');
  }
  return {
    ...baseExpoConfig,
    name: 'PDV Teste',
    scheme: 'pdv-teste',
    version: '0.1.4',
    android: { ...config.android, package: 'br.com.pdv.homologacao', versionCode: Number(rawVersionCode) },
  };
};
