const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// A homologação local compartilha a memória com Gradle e o compilador Kotlin.
if (process.env.PDV_APK_HOMOLOGACAO === '1') config.maxWorkers = 1;

module.exports = config;
