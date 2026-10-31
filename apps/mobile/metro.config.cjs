const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// A homologação local compartilha a memória com Gradle e o compilador Kotlin.
if (process.env.PDV_APK_HOMOLOGACAO === '1' || process.env.PDV_BUILD_PROFILE === 'production') config.maxWorkers = 1;

module.exports = config;
