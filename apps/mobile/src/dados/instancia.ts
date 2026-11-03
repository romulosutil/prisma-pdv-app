import { configurarCatalogoEan } from '@/servicos/catalogoEan';
import { novoId } from '@/util/ids';
import { criarArmazenamento } from './armazenamentoPlataforma';
import { Dados } from './dados';
import { resolverAmbiente } from '../../config/ambiente';

const configuracao = resolverAmbiente({
  ambiente: process.env.EXPO_PUBLIC_AMBIENTE,
  urlApi: process.env.EXPO_PUBLIC_API_URL,
  ferramentasTeste: process.env.EXPO_PUBLIC_FERRAMENTAS_TESTE === '1',
  desenvolvimento: __DEV__,
});
const urlApi = configuracao.urlApi;
const armazenamento = criarArmazenamento();

/** Configuração conectada inválida interrompe a carga; nunca ativa o backend demo. */
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
