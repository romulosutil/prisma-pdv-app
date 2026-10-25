import { configurarCatalogoEan } from '@/servicos/catalogoEan';
import { novoId } from '@/util/ids';
import { ArmazenamentoAsync } from './armazenamento';
import { Dados } from './dados';

const urlApi = process.env.EXPO_PUBLIC_API_URL;
const armazenamento = new ArmazenamentoAsync();

/** Instância única do app. `EXPO_PUBLIC_API_URL` definida liga a API; sem ela o app roda 100% local (demo). */
export const dados = new Dados(armazenamento, novoId, urlApi);

// O catálogo de códigos de barras usa a mesma API e a mesma sessão; sem API, fica a base simulada.
configurarCatalogoEan(
  urlApi ? { urlApi: urlApi.replace(/\/+$/, ''), obterToken: () => dados.conta.obter().sessao?.token ?? null, armazenamento } : null,
);
