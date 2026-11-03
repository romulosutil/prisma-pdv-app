# R3 — Sincronização, uso offline e recuperação sem misturar usuários

Quarta entrega funcional do roadmap, construída em 02/11/2026 sobre a base `bc786bc`, sem commit próprio. Trabalhos anteriores preservados. A validação desta entrega é local: SQLite real, API HTTP local/injetada e PostgreSQL embarcado/PGlite. Não houve implantação, APK novo, teste Android físico nem aprovação humana.

## Comportamento e política offline

- Cada perfil conserva sessão no cofre, partição financeira, cursor, fila, rascunho, preferências e turno originais. Somente o perfil ativo sincroniza, com sua própria credencial; perfis pausados não enviam operações em segundo plano. Produtos confirmados da loja continuam compartilhados por pull autorizado, e Pix/cache de catálogo mantêm o escopo da loja.
- A autorização offline vale **sete dias desde a última autenticação/revalidação online bem-sucedida**, por empresa, loja, operador e aparelho. Retomar offline e reiniciar não renovam o prazo. Um perfil sem autorização anterior precisa de conexão; o mesmo se aplica a instalações legadas ainda sem esse registro.
- A retomada tenta validar o acesso no servidor. Somente falha de rede permite usar a autorização local ainda válida. Resposta inválida, suspensão ou revogação não ativam essa alternativa. Revogação remota só é conhecida ao reconectar; o prazo local limita essa exposição.
- O instante do último uso é persistido antes de novas gravações. Vencimento ou retrocesso observado do relógio impede novas operações até revalidar online. Esse mecanismo depende do relógio local e não representa uma prova temporal de hardware. O servidor continua validando datas e a janela de vendas segundo seu próprio relógio.
- Recebimentos já iniciados conservam parcelas e permitem concluir a venda mesmo após vencimento/revogação. Isso não autoriza novas vendas, alterações de produto ou movimentos de caixa. Limpar um checkout já concluído continua permitido.
- Escritas terminam antes de pausar um perfil; a transição bloqueia novas alterações, e a cobrança com parcelas impede alternância. Login/retomada são recusados durante confirmação em andamento. Rascunhos sem cobrança ficam gravados antes da pausa.
- Revalidação periódica aguarda a rede sem bloquear a gravação offline do perfil ativo. A aplicação de permissões e resultados locais é serializada com as escritas. Após perda de confirmação, os mesmos IDs e payloads são reenviados; não se troca a autoria para obter aceite.

## Permissões, conflitos e recuperação

Antes do push, a API confirma a identidade e as permissões atuais. O servidor também revalida a sessão dentro de suas transações. Um 401 retira somente a credencial correspondente; a fila permanece preservada e outro perfil autorizado continua utilizável. A tela de entrada oferece acesso a usuários/pendências, inclusive quando o perfil atual precisa de reautenticação.

Alterar papel/permissões revoga as sessões desse vínculo na API existente. Ao reautenticar, a redução de visibilidade financeira remove o cache alheio e reinicia o cursor sem produzir deletes remotos. O aumento de visibilidade também reinicia a leitura, recuperando registros anteriores ao cursor. A outbox original permanece intacta para confirmação ou rejeição individual. A remoção de pai/filhos no SQLite usa constraints diferidas até o commit; falhas revertem a transação inteira.

Venda, itens, pagamentos e outbox usam o commit do checkout SQLite já existente; movimentos e suas mutações compartilham a transação financeira. A interface publica sucesso somente após a persistência. Os testes anteriores de falha de gravação/commit e reinício foram preservados e incluídos na regressão.

Turnos fechados continuam imutáveis. Um fechamento offline que não contém uma intervenção remota confirmada é rejeitado, preservando o fechamento local e o histórico remoto para comparação. A tela explica o conflito, permite exportar o original e encaminha aos turnos confirmados. A conferência e as correções autorizadas de R2 acrescentam eventos com motivo, referência e autor; não reabrem ou sobrescrevem o fechamento original. Uma pendência ainda conflitante continua bloqueando nova reserva. **Não foi criado aceite excepcional automático, edição da data ou descarte da pendência para liberar a operação.** Seguir o [procedimento de revisão](revisao-pendencias-sync.md).

Uma instalação autorizada recupera somente dados confirmados no servidor. Rascunhos, vendas e movimentos nunca enviados do aparelho perdido têm quantidade e conteúdo desconhecidos no substituto. A tela de usuários informa, para cada perfil deste aparelho, pendentes, rejeitados, última sincronização completa e prazo offline. O resumo pausado é capturado na pausa, pois não há envio em segundo plano. Uma rodada com rejeições não avança a data de sincronização completa. Esses indicadores representam sincronização, sem afirmar que houve backup externo.

O modelo vigente admite um único dono por loja, cujo vínculo não pode ser criado/alterado pela administração de equipe. A partição legada do dono foi preservada; gerente e operadores continuam em partições individuais, inclusive após mudança de papel entre eles.

## Evidências locais

| Cenário | Teste |
|---|---|
| Prazo de sete dias, limite exato, reinício, isolamento por quatro IDs e retrocesso do relógio | `apps/mobile/test/acessoOffline.test.ts` |
| Ana e Bruno offline, filas/rascunhos separados, reinício, reconexão inversa e confirmação perdida | `apps/mobile/test/equipeApiIntegracao.test.ts`, nos adapters SQLite e navegador |
| Suspensão de um perfil, outro perfil operacional e pendência preservada | `apps/mobile/test/equipeApiIntegracao.test.ts` |
| Vencimento durante recebimento parcial; nenhuma nova venda autorizada | `apps/mobile/test/equipeApiIntegracao.test.ts` |
| Bloqueio de alternância durante push e gravação offline durante revalidação lenta | `apps/mobile/test/equipeApiIntegracao.test.ts` |
| Redução/promoção de gerente, limpeza de cache, rejeição preservada e novo pull completo | `apps/mobile/test/equipeApiIntegracao.test.ts`, SQLite e navegador |
| Dois operadores/aparelhos e restauração adicional sem inventar a venda não enviada | `apps/mobile/test/equipeApiIntegracao.test.ts` |
| Intervenção remota versus fechamento offline, exportação original e reserva bloqueada | `apps/mobile/test/equipeApiIntegracao.test.ts` |
| HTTP real, restauração paginada de 503 mudanças, venda de oito dias rejeitada e retomada explícita de aparelho | `apps/mobile/test/syncIntegracao.test.ts` |
| ACK inválido/perdido, cursor, troca de contexto, rollback e reinício | `sincronizacao.test.ts`, `syncPersistencia.test.ts`, `checkoutSqlite.test.ts`, `carrinhoDuravel.test.ts` |
| Relógio adiantado sem congelar edição posterior, janela antiga e autoria/turno imutáveis | `apps/api/test/sync.test.ts`, `syncCaixaVenda.test.ts`, `caixaUsuario.test.ts` |
| Acesso à alternância e ao diagnóstico de sync durante reautenticação | `apps/mobile/test/fluxoAcesso.test.ts` |

Regressão final: **API 41 arquivos/514 testes, mobile 57 arquivos/531 testes, shared 16 arquivos/170 testes: 1.215 aprovados.** Tipos dos três workspaces e `git diff --check` aprovados. A rodada concorrente inicial da API teve um timeout de cinco segundos na fila de e-mail; a repetição completa isolada passou sem mudar o runtime ou o teste da API. Fixtures mobile de autenticação anterior foram explicitadas e a expectativa de alternância durante commit foi atualizada conforme a política.

Bundle Android/Hermes: **1.910 módulos**, `builds/r3-bundle/_expo/static/js/android/entry-60c1bce1fcc88babc9ad0be1c719b365.hbc`, **5.141.844 bytes**, SHA256 `e1f6fc27060b561ed49f28dfeead369bf5b492b55f95cc2204a2a1f9fc942ed9`. Host de homologação e marcadores de autorização offline, resumo por perfil e conflito conferidos. Compilação com ferramentas de teste; não é APK nem evidência de execução física.

Registro: [CP 015](checkpoints-roadmap.md#cp-20261102-015-entrega-local-de-sincronizacao-offline-e-recuperacao-r3), após os incrementos CPs 012–014. Relatórios locais em `builds/r3-*-tests.json`, metadados em `builds/r3-validacao-local.json`, export Hermes em `builds/r3-bundle`, log em `builds/r3-export.log`. Esses arquivos são evidências locais ignoradas pelo Git; o relatório e os checkpoints ficam versionáveis.

## Arquivos principais

`apps/mobile/src/dados/acessoOffline.ts`, `dados.ts`, `armazenamentoEscopo.ts`, `vendas.ts`, `hooks.tsx`, `syncTipos.ts`, `syncAplicacao.ts`, `syncNavegador.ts` e `sqlite/syncSqlite.ts`; `src/servicos/sincronizacao.ts`, `src/nucleo/fluxo.ts`; `app/(onboarding)/entrar.tsx`, `app/ajustes/usuarios.tsx` e `src/telas/caixa/StatusSincronizacao.tsx`; testes/evidências acima. Não há nova migração ou serviço operacional em R3.

## Homologação pendente

1. Implantar a API/migrações de R1/R2 em homologação preservando backup; confirmar o servidor exato ao qual o APK se conecta. O bundle de R3 é compilação, não APK instalado.
2. Gerar APK conectado e validar no Android físico com dono, Ana e Bruno: autorizar perfis online, reservar turnos, desconectar, vender/movimentar, salvar rascunhos, alternar e reiniciar à força.
3. Repetir falha de escrita/disco cheio, recebimento parcial, rede intermitente, confirmação perdida, reconexões inversas, mudança de relógio e prazo expirado. Conferir valores, IDs e origem nas telas e no servidor.
4. Suspender um usuário enquanto o aparelho estiver offline; reconectar e comprovar reautenticação apenas desse perfil, sem apagar sua fila nem bloquear os demais. Reduzir/promover gerente e conferir o conteúdo efetivamente persistido/baixado.
5. Usar dois aparelhos físicos, simular a perda de um com pendência nunca enviada e recuperar em instalação autorizada: o registro confirmado deve aparecer, a pendência desconhecida não deve ser anunciada como recuperada. A retomada de turno reservado continua explícita.
6. Provocar intervenção remota contra fechamento offline; exportar os originais, comparar os históricos e seguir a conferência/correção auditada. Não liberar nova reserva enquanto o conflito estiver pendente.
7. Validar concorrência em PostgreSQL independente, SecureStore/exportação nativos e coletar aceite humano, separados das evidências automatizadas locais.

Backups locais e healthchecks foram preservados. Backup externo e alertas seguem no backlog após validação do produto, conforme o escopo do usuário.
