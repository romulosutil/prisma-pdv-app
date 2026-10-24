import { novoId } from '@/util/ids';
import { ArmazenamentoAsync } from './armazenamento';
import { Dados } from './dados';

/** Instância única do app. `EXPO_PUBLIC_API_URL` definida liga a API; sem ela o app roda 100% local (demo). */
export const dados = new Dados(new ArmazenamentoAsync(), novoId, process.env.EXPO_PUBLIC_API_URL);
