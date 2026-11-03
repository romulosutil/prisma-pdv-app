/**
 * Ferramentas somente no perfil demo explícito. Desenvolvimento conectado também usa serviços reais.
 * O acesso precisa ser literal para o Expo inlinear a variável.
 */
export const FERRAMENTAS_TESTE: boolean = process.env.EXPO_PUBLIC_AMBIENTE === 'demo' && (__DEV__ || process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1');
