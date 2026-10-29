import { configurarCatalogoEan } from '@/servicos/catalogoEan';
import { novoId } from '@/util/ids';
import { criarArmazenamento } from './armazenamentoPlataforma';
import { Dados } from './dados';

const urlApi = process.env.EXPO_PUBLIC_API_URL;
const armazenamento = criarArmazenamento();

/** Instância única do app. `EXPO_PUBLIC_API_URL` definida liga a API; sem ela o app roda 100% local (demo). */
export const dados = new Dados(armazenamento, novoId, urlApi);

// O catálogo de códigos de barras usa a mesma API e a mesma sessão; sem API, fica a base simulada.
let escopoCatalogo: string | null | undefined;
function configurarCatalogoDaConta(): void {
  const escopo = dados.armazenamentoDaLoja.obterEscopo();
  if (escopo === escopoCatalogo) return;
  escopoCatalogo = escopo;
  configurarCatalogoEan(urlApi ? { urlApi: urlApi.replace(/\/+$/, ''), obterToken: () => dados.conta.obter().sessao?.token ?? null, aoSessaoInvalida: (token) => dados.conta.invalidarSessao(token), armazenamento: dados.armazenamentoDaLoja } : null);
}
configurarCatalogoDaConta();
dados.conta.assinar(configurarCatalogoDaConta);
