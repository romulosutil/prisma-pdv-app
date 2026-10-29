# Validação independente — CHECKOUT-02

Resultado: **PASS parcial** na integração revisada e nos testes Node; critérios globais e homologação Android não estão aprovados.

| Critério | Resultado | Evidência e limite |
|---|---|---|
| 4 — falha, estado confirmado e retentativa | **PASS parcial** | A fachada publica após salvar (`apps/mobile/src/dados/carrinhoDuravel.ts:55`); o hook informa erro sem navegar na falha (`apps/mobile/src/telas/pagar/useCobranca.ts:49`). Se a parcela final já está salva, `receber` retenta a conclusão sem duplicá-la (`apps/mobile/src/telas/pagar/useCobranca.ts:79`). Os dois casos são exercitados com fachada real e adaptadores de UI simulados (`apps/mobile/test/useCobranca.test.ts:66`, `:86`); navegação real e Android não foram executados. |
| 5 — proteger parcelas e impedir conclusão com saldo | **PASS parcial** | A fachada recusa alterações de itens e limpeza com parcelas (`apps/mobile/src/dados/carrinhoDuravel.ts:46`, `:69`); o serviço valida saldo na conclusão (`apps/mobile/src/dados/sqlite/checkoutSqlite.ts:117`). Não equivale à validação da UI em Android. |
| 6 — recuperar antes de liberar e impedir nova cobrança | **PASS parcial por inspeção** | `Dados.iniciar` aguarda recuperação para sessão existente (`apps/mobile/src/dados/dados.ts:93`); a raiz só libera após `iniciar` (`apps/mobile/app/_layout.tsx:36`, `:59`). A guarda redireciona conclusão à tela de sucesso (`apps/mobile/src/telas/pagar/GuardaCobranca.tsx:12`) e a fachada recusa mutações (`apps/mobile/src/dados/carrinhoDuravel.ts:41`). Sem teste de navegação ou reinício Android, não se declara aprovação global. |

## Evidências e limites

- O identificador, instante e caixa são fixados na abertura (`apps/mobile/src/dados/carrinhoDuravel.ts:49`); o recarregamento do repositório antecede a publicação da conclusão (`apps/mobile/src/dados/carrinhoDuravel.ts:79`). A escrita financeira preserva vínculos existentes por ID (`apps/mobile/src/dados/sqlite/financeiro.ts:63`); a regressão de cancelamento e regravação com caixa vinculado é coberta em `apps/mobile/test/checkoutSqlite.test.ts:136`. O contrato remoto de caixa pertence a P0-04.
- Adição anuncia após confirmação (`apps/mobile/src/telas/vender/useAdicionar.ts:14`); remoção mostra sucesso após confirmação (`apps/mobile/src/telas/vender/TelaVender.tsx:119`); nova venda aguarda limpeza (`apps/mobile/src/telas/pagar/TelaSucesso.tsx:44`). Inspeção estática, sem execução da UI real.
- SQLite é selecionado por `instanceof` (`apps/mobile/src/dados/dados.ts:73`). O adaptador browser é demonstrativo e não tem atomicidade entre chaves (`apps/mobile/src/dados/checkoutNavegador.ts:6`, `:18`); não é aprovado para produção.
- Esta revisão executou `npm run test --workspace apps/mobile -- test/useCobranca.test.ts test/checkoutSqlite.test.ts`: 19 testes passaram (2 do hook com mocks e 17 SQLite). O teste do hook exercita a fachada real, mas não monta React Native. O gestor informou anteriormente 7 testes de fachada, suíte mobile de 249 e typecheck passando; esta revisão não repetiu esses comandos nem executou Android.
- Troca de conta e autoria do checkout pertencem a P0-03; esta revisão não valida esse cenário.
