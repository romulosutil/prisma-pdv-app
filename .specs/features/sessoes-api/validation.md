# Validação independente — sessões API

**PASS para os critérios 1–5 no escopo local, com ressalvas abaixo.** A trava comum na conta serializa emissão de código, login, limite e revogação.

## Critérios e evidências

1. **PASS.** `apps/api/src/auth.ts:21-24,40-46` define 30 dias e exige expiração estritamente futura, sessão e aparelho não revogados e relações consistentes; `apps/api/src/servidor.ts:81-87` aplica o hook às rotas privadas. `apps/api/test/sessoes.test.ts:40-48,108-115` verifica HTTP 200 imediatamente antes, 401 no limite e relações inconsistentes.
2. **PASS.** `apps/api/src/rotas/conta.ts:170-187` exige dono, restringe conta e loja e revoga aparelho e sessões; `apps/api/test/sessoes.test.ts:71-105` verifica 404 para outra conta, 403 para operador, rejeição dos tokens e substituição. As travas da conta em `conta.ts:103,182` serializam login e revogação; `sessoes.test.ts:171-182` testa dois logins pelo último lugar.
3. **PASS.** `conta.ts:166-168` revoga a sessão atual; `sessoes.test.ts:51-57` verifica 204 e independência do outro token.
4. **PASS.** `conta.ts:156-163,170-174` seleciona o perfil real e projeta aparelhos da conta e loja; `packages/shared/src/contrato.ts:133-135` define os schemas. `sessoes.test.ts:60-68` verifica os valores, isolamento entre contas e ausência de nomes de campos de segredo. O teste não cria duas lojas na mesma conta; o filtro por loja foi conferido no código.
5. **PASS.** `conta.ts:103,126-147,182-187` obtém a mesma trava por conta antes de consultar aparelho ou alterar sessões: se revogação confirmar primeiro, login vê aparelho revogado e a transação não consome código; se login adquirir primeiro, revogação subsequente revoga a sessão. `sessoes.test.ts:80-85,148-169` verifica recusa, código preservado e intercalação de revogação com login aguardando a trava no PostgreSQL local.

## Migração, fixtures e ressalvas

`apps/api/drizzle/0002_equal_bishop.sql:1-5` preenche `expira_em` antes de impor `NOT NULL`. `apps/api/test/migracaoSessoes.test.ts:5-18` aplica o SQL a tabelas legadas mínimas em PGlite e verifica 30 dias, revogações nulas e rejeição de inserção sem expiração; não exercita dados legados e migrador completo em PostgreSQL externo.

`apps/api/test/ajuda.ts:46-54,63` permite banco de testes local dedicado e faz TRUNCATE; os arquivos de teste precisam executar serialmente para evitar interferência. `ajuda.ts:116-124`, `assinatura.test.ts:114-120` e `cobranca.test.ts:267-273` reautenticam após avanço de tempo sem mudar as verificações financeiras.

O risco anteriormente apontado de corrida entre emissão e consumo foi tratado com a mesma trava em `conta.ts:74,103`; o relógio é lido após adquiri-la em `:76,106`. `sessoes.test.ts:126-146` verifica código expirado enquanto login aguarda a trava em PostgreSQL local.

## Comandos

- `rtk proxy npm run test --workspace=@pdv/api -- test/sessoes.test.ts test/migracaoSessoes.test.ts --maxWorkers=1`: PASS, 11 testes em PGlite.
- PostgreSQL 17 local isolado, `PDV_TEST_POSTGRES_URL` apontando para `127.0.0.1:53361/pdv_test`, `rtk proxy npm run test --workspace=@pdv/api -- test/sessoes.test.ts --maxWorkers=1`: PASS, 12 testes.
- Sensor em cópia temporária: removido somente `for('update')` do login; o mesmo comando PostgreSQL falhou em 3 de 12 testes. As duas barreiras detectaram ausência de espera pela trava; o teste de limite observou `[200, 200]` em vez de `[200, 409]`. A árvore real não foi alterada.
- `rtk proxy npm run typecheck --workspace=@pdv/api`: PASS na revisão anterior.
- `rtk proxy npm run typecheck --workspace=@pdv/shared`: PASS na revisão anterior.

Nenhum deploy, banco externo ou homologação Android foi realizado nesta revisão. A suíte global em PostgreSQL local foi executada pelo gestor, não por este revisor.
