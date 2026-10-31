import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';
import release from './release.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const baseExpoConfig: ExpoConfig = {
    ...config,
    name: config.name ?? appJson.expo.name,
    slug: config.slug ?? appJson.expo.slug,
  };
  if (process.env.PDV_BUILD_PROFILE === 'production') {
    if (process.env.PDV_APK_HOMOLOGACAO === '1') throw new Error('Produção não pode usar o perfil de homologação.');
    if (process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE !== '0') throw new Error('Ferramentas de teste devem estar desativadas em produção.');
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.version) || Number(release.version.split('.')[0]) < 1) throw new Error('Versão de produção inválida.');
    if (!Number.isSafeInteger(release.versionCode) || release.versionCode < 7 || release.versionCode > 2100000000) throw new Error('Código de versão de produção inválido.');
    let url: URL;
    try { url = new URL(release.apiUrl); } catch { throw new Error('URL de produção inválida.'); }
    const host = url.hostname.toLowerCase();
    const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)?.slice(1).map(Number);
    const privateIpv4 = ipv4 && (ipv4[0] === 0 || ipv4[0] === 10 || ipv4[0] === 127 || (ipv4[0] === 169 && ipv4[1] === 254) || (ipv4[0] === 172 && ipv4[1]! >= 16 && ipv4[1]! <= 31) || (ipv4[0] === 192 && ipv4[1] === 168) || (ipv4[0] === 100 && ipv4[1]! >= 64 && ipv4[1]! <= 127));
    if (release.apiUrl !== 'https://aladdin-pdv-api.jicnzg.easypanel.host' || url.protocol !== 'https:' || /\s/.test(release.apiUrl) || !host.includes('.') || url.username || url.password || release.apiUrl.includes('?') || release.apiUrl.includes('#') || host.replace(/\.$/, '') === 'localhost' || host.replace(/\.$/, '').endsWith('.localhost') || host.replace(/\.$/, '').endsWith('.local') || host.startsWith('[') || privateIpv4 || process.env.EXPO_PUBLIC_API_URL !== release.apiUrl) {
      throw new Error('URL de produção inválida ou divergente.');
    }
    return {
      ...baseExpoConfig,
      name: 'PDV', scheme: 'pdv', version: release.version,
      android: { ...config.android, package: 'br.com.pdv.mobile', versionCode: release.versionCode },
      extra: { ...baseExpoConfig.extra, pdvBuild: { profile: 'production', apiUrl: release.apiUrl, toolsEnabled: false, versionCode: release.versionCode } },
    };
  }
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
