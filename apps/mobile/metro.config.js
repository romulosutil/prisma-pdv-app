const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { substituicoesRelease } = require('./config/isolamentoRelease');
const config = getDefaultConfig(__dirname);
const substituicoes = substituicoesRelease(__dirname, process.env.EXPO_PUBLIC_AMBIENTE);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolvido = context.resolveRequest(context, moduleName, platform);
  if (resolvido.type !== 'sourceFile') return resolvido;
  const destino = substituicoes.get(path.normalize(resolvido.filePath));
  return destino ? { type: 'sourceFile', filePath: destino } : resolvido;
};
module.exports = config;
