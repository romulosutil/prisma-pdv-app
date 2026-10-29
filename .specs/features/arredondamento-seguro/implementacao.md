# Arredondamento seguro: execução pelo gestor

Assumimos o contrato numérico existente, sem alterar faixa, sinais, valores históricos ou schemas. Um comentário e uma expressão em dinheiro.ts removem a soma intermediária insegura. Apenas a função e os três arquivos de teste definidos na spec foram alterados; não há nova dependência nem BigInt no runtime shared/mobile.

## RED observado antes da correção

- Shared dinheiro:1falha/18passaram, esperado9007199254740 e recebido9007199254741.
- Checkout SQLite, seleção por nomefronteira: falhou ao concluir com pagamento incompleto, pois total arredondado excedia a parcela correta. Seis casos existentes de injeção de falha também correspondiam ao nome e passaram;11não selecionados. Essa execução RED filtrada não é gate de aprovação nem exclusão de testes. Gates finais usam arquivo/suítes inteiras sem filtro.
- API syncValoresVenda/PGlite:1falha/7passaram na asserção do valor compartilhado, antes de enviar payload. Nenhuma fonte corrigida ainda nessas três execuções.

## Adequação e rastreabilidade de testes

| Critério | Asserção e resultado derivado da spec | Avaliação |
|---|---|---|
| AC1 fronteiras/sinais | packages/shared/test/dinheiro.test.ts:77 expect(multiplicarPreco(preco*sinalPreco,sinalQuantidade)).toBe(esperado*sinalPreco*sinalQuantidade), cinco pares literais e quatro sinais; :89–:90 igualdade com oráculo e Object.is(valor,-0) falso | Necessário; resultado literal não deriva do código corrigido |
| AC2 faixa/oráculo | dinheiro.test.ts:85 oráculo BigInt sóteste, :96–:102 toThrow(RangeError) para entradas inválidas e produto excessivo; :94–:95 zero explícito sem -0 | Necessário; controles positivos na faixa e negativos fora dela |
| AC3 SQLite | apps/mobile/test/checkoutSqlite.test.ts:46 total9007199254740; :47–:48 itens/parcelas literais; :50 igualdade após reabrir, :51 contagens1/1/1/1, :55–:57 JSON de pai/filhos igual à venda/arrays, :59 outbox com dados da mesma venda | Necessário; arquivo SQLite real, sem mock de persistência; armazenamento de sessão de teste é memória declarada |
| AC3 API | apps/api/test/syncValoresVenda.test.ts:33 literal9007199254740; :40–:45 HTTP200/ACK/pull integral; :52–:55 motivo venda_inconsistente e snapshot7tabelas igual para valor9007199254741 | Necessário; Fastify inject e bancos reais locais, não prova Android/rede externa |

Mapeamento reverso: os dois novos testes de dinheiro mapeiam AC1/2; um novo checkout e um novo push mapeiam AC3. Nenhuma asserção anterior foi removida, afrouxada ou desabilitada. Não há teste novo sem critério. Diretrizes aplicadas: RTK.md e coding-principles.md da skill; estrutura existente de testes dos workspaces. Fontes de persistência/API permanecem iguais, gestor conferiu leitura dos registros normalizados e imutabilidade.

## Gates

Alvos após a correção: dinheiro19/19, checkout18/18, syncValoresVenda/PGlite8/8 PASS, sem filtro. Gates completos em série:150shared/10arquivos,434mobile/39arquivos,361API/PGlite e394API comPostgreSQL/24arquivos, typecheck todos PASS. Total978na variantePG ou945PGlite; não somar variantes. Fontes API/persistência não mudaram. Nenhum teste registrado pulado nos gates finais. Verificador independente posterior aprovou3ACs e sensor5/5 conforme validation.md, validate_state0; feature aceita localmente.
