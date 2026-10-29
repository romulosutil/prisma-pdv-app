# Revisão de dados — ACCESS-02/03

Resultado da revisão: **PASS nos cenários comprovados; aprovação global pendente** de validação Android e do fluxo de duas contas na API real. Escopo: critérios 3–7 e camada de dados; UI fora desta revisão. Base d3ad1f7, T3 ainda em andamento. P0-02 permanece pendente.

## Reavaliação dos achados

- **PASS — logout atrasado**: pps/mobile/src/dados/dados.ts:220 captura o token e :226 invalida apenas esse token. pps/mobile/test/acessoMobile.test.ts:121 verifica que um login mais novo e seu cofre sobrevivem ao retorno atrasado.
- **PASS — assinatura atrasada entre lojas**: pps/mobile/src/servicos/assinatura.ts:64 captura vínculo antes do HTTP; sucesso, ausência e erro são descartados se mudou. :124 inclui escopo e conta; operações de alteração rejeitam mudança. pps/mobile/test/assinaturaEscopo.test.ts:29 e :34 verificam licença, ausência e rede tardias; :39 cobre criar e upgrade tardios. A antiga falha reportada não foi reproduzida nesses cenários.
- **PASS — falha de metadata no 401, com cofre disponível**: pps/mobile/src/dados/conta.ts:28 nega memória e tenta retirar somente o token rejeitado; pps/mobile/src/dados/armazenamentoSessaoSegura.ts:134 compara a credencial antes de removê-la. pps/mobile/test/acessoMobile.test.ts:171 confirma remoção do cofre, preservação e reinício exigindo reautenticação. Se metadata e cofre falharem simultaneamente, o código mantém a negação em memória mas não pode garantir exclusão durável; esse caso não foi demonstrado.

## Mapeamento dos critérios

- **3 — PASS nos cenários testados**: pps/mobile/src/servicos/backendHttp.ts:153 invalida somente 401 protegido com token; teste pps/mobile/test/acessoMobile.test.ts:79 cobre 401 público, 403 e preservação de produto, venda, caixa e rascunho; :150 verifica licença preenchida na memória e armazenamento após 401 e logout. Falha de metadata é coberta em :206.
- **4 — PASS nos cenários testados**: pps/mobile/test/acessoMobile.test.ts:105 verifica 401 antigo, :121 logout atrasado e :195 distingue saída online/offline. A integração real verifica revogação em pps/mobile/test/acessoApiIntegracao.test.ts:98.
- **5 — PASS nos cenários testados**: pps/mobile/src/dados/dados.ts:140 obtém perfil com o token recebido; :156 valida conta, loja e operador antes de aplicar. pps/mobile/test/acessoMobile.test.ts:54, :66 e :138 verificam perfil real, falhas e 401 do novo token preservando o anterior; pps/mobile/test/acessoApiIntegracao.test.ts:62 usa Fastify/PGlite em processo.
- **6 — PASS local nos cenários testados; PENDENTE na integração real**: pps/mobile/test/acessoMobile.test.ts:171 exerce Dados A→B→A sem pendências com SQLite real e HTTP/cofre fakes: licença preenchida, Pix e preferências de A não aparecem em B e são recuperados ao voltar; financeiros e carrinho iniciam vazios. pps/mobile/test/isolamentoConta.test.ts:31, :60 e :72 cobrem partições e operações atrasadas; assinatura e catálogo têm testes de respostas tardias. A API real ainda vincula aparelhoId a uma conta; a troca de duas contas na mesma instalação não foi comprovada e P0-03-E não está pronto globalmente.
- **7 — PASS no cenário exercitado**: pps/mobile/src/dados/dados.ts:173 bloqueia conservadoramente produtos, vendas, caixas, outbox ou rascunhos até P0-02 comprovar ack; congelamento e drenagem antecedem a conferência. pps/mobile/test/acessoMobile.test.ts:207 confirma recusa de B e checkout 2500/1000/1500 com uma venda e um outbox. pps/mobile/test/acessoApiIntegracao.test.ts:75 verifica expiração real de 31 dias, reentrada e conclusão. Cobertura não prova separadamente cada tabela nem todas as interleavings.

## Verificação e limites

Executados: 
tk proxy npm run test --workspace=@pdv/mobile -- test/acessoMobile.test.ts test/isolamentoConta.test.ts test/assinaturaEscopo.test.ts test/catalogoEscopo.test.ts --maxWorkers=1 (29/29) e 
tk proxy npm run test --workspace=@pdv/mobile -- test/acessoApiIntegracao.test.ts --maxWorkers=1 (3/3). SQLite real por node:sqlite; testes focados usam HTTP/cofre fakes. Integração usa Fastify/PGlite em processo, SQLite real e cofre fake; não comprova driver SQLite nativo, SecureStore ou ciclo de vida em Android físico. Sensor por mutação em cópia isolada não foi executado. Sem alterações na implementação.
