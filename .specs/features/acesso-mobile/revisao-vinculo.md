# Revisão independente do vínculo por conta — PASS no recorte local

A correção fecha a janela anteriormente apontada: apps/mobile/src/dados/dados.ts:189 inicia o bloqueio antes de esperar gravações e consultar pendências; o bloqueio permanece durante mapeamento, backend e aplicação do acesso. dados.ts:175 libera no finally, inclusive em caso de falha. A segunda verificação permanece como defesa adicional. A revisão não identificou outro achado bloqueante no recorte examinado.

## Evidências

- apps/mobile/test/aparelhosPorConta.test.ts:65 suspende o login no backend e verifica que produto e carrinho de A são recusados, sem escrita, até a troca concluir; :86 verifica liberação após falhas de backend e perfil.
- apps/mobile/test/aparelhosPorConta.test.ts:12 verifica IDs distintos, normalização e persistência após reinício; :21 preserva instalação global 7 e legado autorizado 42; :28 cobre concorrência dentro de uma instância do repositório.
- apps/mobile/test/aparelhosPorConta.test.ts:32 e :38 verificam mapa inválido ou falha de escrita sem chamada ao backend; :44 verifica recusa por pendências preexistentes; :52 rejeita aparelho divergente; :58 cobre pendências carregadas antes de iniciar.
- apps/mobile/test/trocaContasApi.test.ts:52 exercita A → B → A em Fastify/PGlite e SQLite, com recriação de Dados e checagem de aparelho ativo por conta; :85 verifica ausência de chamadas e preservação para rascunho preexistente.
- apps/mobile/test/instalacao.test.ts:47 mantém a asserção de um único ID nos três logins concorrentes da mesma conta; :108 verifica separadamente instalação global 7 e aparelho legado 42. apps/mobile/test/acessoMobile.test.ts:34 inicializa a instalação e :39 devolve o aparelho solicitado na fixture. A verificação de resposta divergente permanece coberta em aparelhosPorConta.test.ts:52.
- apps/mobile/app/_layout.tsx:90 detecta mudança de escopo para limpar navegação; :115 recria a pilha pelo par conta/loja. O comportamento visual e histórico no dispositivo não foram comprovados nesta revisão.
- rtk proxy npm run test --workspace=@pdv/mobile -- test/aparelhosPorConta.test.ts test/trocaContasApi.test.ts test/instalacao.test.ts --maxWorkers=1: 3 arquivos, 28 testes passaram.
- rtk proxy npm run typecheck --workspace=@pdv/mobile: passou.
- Reexecução incluindo acessoMobile.test.ts e os três arquivos acima: 4 arquivos, 43 testes passaram.

Limites: execução Node com API em processo, PGlite, SQLite e cofre simulado; não comprova Android físico ou cofre real. Não foi executado sensor de mutação. A concorrência de repositórios independentes sobre o mesmo armazenamento não foi comprovada; os testes exercitam a fila de uma instância.
