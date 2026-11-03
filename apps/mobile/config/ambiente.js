/** Usado pelo Expo no build e pelo app. Nenhum segredo pertence a esta configuração. */
function resolverAmbiente({ ambiente, urlApi, ferramentasTeste, desenvolvimento }) {
  const nome = ambiente;
  if (!['demo', 'homologacao', 'producao'].includes(nome)) {
    throw new Error('Defina EXPO_PUBLIC_AMBIENTE: demo, homologacao ou producao.');
  }
  const url = (urlApi || '').trim();
  if (nome === 'demo') {
    if (url) throw new Error('O perfil demo não pode receber EXPO_PUBLIC_API_URL.');
    return { ambiente: nome, modo: 'demo', urlApi: undefined };
  }
  let destino;
  try { destino = new URL(url); } catch { throw new Error('O perfil conectado exige EXPO_PUBLIC_API_URL HTTPS válida.'); }
  if (destino.protocol !== 'https:' || destino.username || destino.password || destino.search || destino.hash || destino.pathname !== '/') {
    throw new Error('Use uma origem HTTPS sem credenciais, caminho, query ou fragmento.');
  }
  if (ferramentasTeste) throw new Error('Ferramentas de teste não são permitidas em perfis conectados.');
  return { ambiente: nome, modo: 'http', urlApi: destino.origin };
}
module.exports = { resolverAmbiente };
