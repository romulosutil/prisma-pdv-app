import { gerarId } from '@pdv/shared';
import { getRandomBytes } from 'expo-crypto';

/** UUID v7 com bytes do `expo-crypto` (o Hermes não garante `crypto.getRandomValues`). */
export const novoId = (): string => gerarId({ bytesAleatorios: getRandomBytes });
