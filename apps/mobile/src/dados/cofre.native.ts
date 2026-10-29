import * as SecureStore from 'expo-secure-store';
import type { CofreSessao } from './armazenamentoSessaoSegura';

const opcoes = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export const cofreNativo: CofreSessao = {
  obter: (chave) => SecureStore.getItemAsync(chave, opcoes),
  gravar: (chave, valor) => SecureStore.setItemAsync(chave, valor, opcoes),
  remover: (chave) => SecureStore.deleteItemAsync(chave, opcoes),
};
