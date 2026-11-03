const { resolverAmbiente } = require('./config/ambiente');

module.exports = ({ config }) => {
  const ambiente = resolverAmbiente({
    ambiente: process.env.EXPO_PUBLIC_AMBIENTE,
    urlApi: process.env.EXPO_PUBLIC_API_URL,
    ferramentasTeste: process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1',
    desenvolvimento: process.env.NODE_ENV !== 'production' && !process.env.EAS_BUILD_PROFILE,
  });
  const homologacao = ambiente.ambiente === 'homologacao';
  return {
    ...config,
    name: homologacao ? 'PDV Homologação' : config.name,
    scheme: homologacao ? 'pdv-homologacao' : config.scheme,
    android: { ...config.android, package: homologacao ? 'br.com.pdv.mobile.homologacao' : config.android.package },
    extra: { ...config.extra, ambiente: ambiente.ambiente, apiUrl: ambiente.urlApi ?? null },
  };
};
