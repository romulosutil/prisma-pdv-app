/**
 * Liga as ferramentas de teste (cartões de teste, relógio de teste, simular bip/Pix/falha do Tap, zerar dados).
 * Ativas em desenvolvimento (`__DEV__`) ou quando o build recebe `EXPO_PUBLIC_FERRAMENTAS_TESTE=1`
 * (APK de testes, ver perfil `teste` em `eas.json`). O acesso precisa ser literal para o Expo inlinear a variável.
 */
export const FERRAMENTAS_TESTE: boolean = __DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1';
