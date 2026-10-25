import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Armazenamento chave → JSON. Na versão de testes é o AsyncStorage (funciona no Expo Go e no
 * navegador); a troca por SQLite acontece antes do beta, sem mudar as telas.
 */
export interface Armazenamento {
  obter<T>(chave: string): Promise<T | null>;
  gravar<T>(chave: string, valor: T): Promise<void>;
  remover(chave: string): Promise<void>;
  /** Apaga tudo que o app gravou (usado só pelo "Zerar dados" do modo dev). */
  limpar(): Promise<void>;
}

const PREFIXO = 'pdv:';

export class ArmazenamentoAsync implements Armazenamento {
  async obter<T>(chave: string): Promise<T | null> {
    const bruto = await AsyncStorage.getItem(PREFIXO + chave);
    if (bruto === null) return null;
    try {
      return JSON.parse(bruto) as T;
    } catch {
      return null;
    }
  }

  async gravar<T>(chave: string, valor: T): Promise<void> {
    await AsyncStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  }

  async remover(chave: string): Promise<void> {
    await AsyncStorage.removeItem(PREFIXO + chave);
  }

  async limpar(): Promise<void> {
    // O diagnóstico da versão de testes sobrevive ao "Zerar dados" (ele é o que explica o que houve antes).
    const chaves = (await AsyncStorage.getAllKeys()).filter((c) => c.startsWith(PREFIXO) && c !== PREFIXO + 'diagnostico');
    await AsyncStorage.multiRemove(chaves);
  }
}
