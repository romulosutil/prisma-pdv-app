# Revisão: identidade de instalação

**Resultado: PASS** para o contrato local de identidade, após correção do tratamento de JSON literal 
ull. Esta revisão não aprova P0-03 como um todo nem valida Android ou API real.

## Evidências

- pps/mobile/src/dados/instalacao.ts:21-31 valida UUID, dá precedência à identidade salva, adota sessão legada somente na ausência e aguarda gravação antes de retornar. pps/mobile/src/dados/dados.ts:104-106,126-128 aguarda esse resultado antes de chamar o backend. pps/mobile/test/instalacao.test.ts:21-41,106-116 verifica três logins, cadastro, recriação, adoção legada e precedência do ID salvo.
- pps/mobile/src/dados/instalacao.ts:9-18 compartilha a operação pendente por instância; pps/mobile/test/instalacao.test.ts:44-50 confirma um único ID em chamadas concorrentes. A aplicação instancia um singleton em pps/mobile/src/dados/instancia.ts:10; concorrência entre instâncias independentes não é garantida.
- O achado anterior foi corrigido: pps/mobile/src/dados/armazenamento.ts:19-29 distingue chave ausente de JSON literal 
ull e rejeita este último; pps/mobile/test/persistidoDuravel.test.ts:117-122 verifica ausência de escrita ou remoção. pps/mobile/test/instalacao.test.ts:53-58 verifica preservação do conteúdo, ausência de geração de ID e de chamada ao backend para 
ull e outras corrupções. O SQLite delega identidade ao adaptador legado (pps/mobile/src/dados/sqlite/armazenamentoSqlite.ts:70-71,87-88).
- pps/mobile/test/instalacao.test.ts:61-69,79-103 verifica falhas de gravação, leitura e backend, preservação e retentativa com o ID salvo. A inicialização carrega a conta (pps/mobile/src/dados/dados.ts:85-89).
- docs/recuperacao-de-aparelho.md:3-7 cobre reinstalação, limite, recuperação pendente e preservação de vendas, conforme docs/plano-implementacao-producao.md:99.

## Verificação e limites

- 
tk proxy npm run test --workspace=@pdv/mobile -- test/instalacao.test.ts test/persistidoDuravel.test.ts — passou: 19 testes.
- 
tk proxy npm run typecheck --workspace=@pdv/mobile — passou após a correção do armazenamento.
- Os testes usam backend simulado (pps/mobile/test/instalacao.test.ts:11-16); não demonstram integração real com API ou Android. Não se avaliou isolamento entre contas ou recuperação de vendas. O contrato de armazenamento agora considera 
ull raiz inválido; a verificação nativa usa AsyncStorage simulado.
