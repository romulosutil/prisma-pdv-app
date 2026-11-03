const path = require('node:path');
/** Em releases conectados, implementações de demonstração não entram no grafo Metro. */
function substituicoesRelease(raiz, ambiente) {
  if (!['homologacao', 'producao'].includes(ambiente)) return new Map();
  const arquivos = [
    ['src/servicos/backendLocal.ts', 'backendLocal.ts'],
    ['src/dados/semente.ts', 'semente.ts'],
    ['../../packages/shared/src/billing.ts', 'billing.ts'],
    ['src/componentes/FormularioCartao.tsx', 'FormularioCartao.tsx'],
    ['src/servicos/provedoresPagamento.ts', 'provedoresPagamento.ts'],
    ['src/servicos/catalogoDemo.ts', 'catalogoDemo.ts'],
    ['src/dados/relogio.ts', 'relogio.ts'],
    ['src/diagnostico/registro.ts', 'registro.ts'],
  ];
  return new Map(arquivos.map(([origem, destino]) => [path.resolve(raiz, origem), path.resolve(raiz, 'src/release', destino)]));
}
module.exports = { substituicoesRelease };
