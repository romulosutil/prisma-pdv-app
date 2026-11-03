# R2 — Caixa separado por usuário

Implementação local da terceira entrega funcional do roadmap, em 02/11/2026, sobre a base `bc786bc`, sem commit próprio. Alterações anteriores de R0/R1 preservadas. O serviço remoto e o APK 0.1.5 continuam na versão de R0; esta entrega não foi implantada nem homologada em Android físico e não tem aceite humano registrado.

## Comportamento entregue

- **Turno individual:** seleção por loja/operador, com aparelho de origem preservado e aparelho atual explícito. Dois usuários na mesma instalação não compartilham turno ou movimentos. O resumo principal mostra somente o usuário atual; o painel autorizado mostra os caixas da loja.
- **Abertura:** no modo HTTP, exige reserva online. Locks transacionais e índice parcial único impedem duas reservas ativas do mesmo operador/loja. A intenção local conserva o mesmo ID quando a resposta se perde; reenvio não abre outro caixa. A reserva continua ocupada até a confirmação do fechamento no servidor.
- **Entrada:** registra dinheiro externo, categoria, origem/responsável e motivo; não é receita de venda.
- **Sangria:** saída para cofre ou depósito. **Retirada:** despesa ou outra finalidade, registrada uma única vez. Saídas exigem `retirar_dinheiro`, recurso do plano e saldo suficiente. Sem essa permissão, a tela orienta a intervenção do dono/gerente autorizado. O limite financeiro entregue é o saldo disponível; não foi criada uma política adicional de tetos monetários por funcionário.
- **Autoria:** movimentos v2 identificam autor, responsável pelo turno, aparelho, categoria, origem/destino, motivo e eventual aprovador. Intervenções em turno alheio exigem `conferir_caixas` e `retirar_dinheiro`, usam a rota online e registram o gestor como autor/aprovador e o operador como responsável.
- **Histórico imutável:** IDs de eventos têm confirmação idempotente. Um snapshot antigo não apaga eventos confirmados; alterações em evento existente são recusadas. Correção gera outro evento com referência ao original e motivo. Fechamentos confirmados não são reabertos ou recalculados.
- **Fechamento offline:** grava contado, esperado, diferença, conferente, recolhido e troco restante. A contagem precede a destinação; recolhido/troco não são descontados novamente do esperado. A interface informa a confirmação pendente e a necessidade de sincronizar antes da próxima abertura. A fila envia todas as vendas vinculadas antes de enviar o fechamento, inclusive com mais de um lote de 100 operações.
- **Transferência:** online, com autorização prévia do responsável pelo destino, válida por cinco minutos. O responsável pela origem confirma a saída. Débito e crédito são gravados na mesma transação com o mesmo identificador; reenvio não duplica. A resposta ao operador da origem não entrega o histórico financeiro do destinatário.
- **Troca de aparelho:** retomada explícita online, com motivo e confirmação de que o anterior foi sincronizado e deixou de ser usado. Preserva o aparelho original, audita a troca e bloqueia novos envios do aparelho anterior para o turno reservado.
- **Conferência:** dono/gerente autorizado consulta valores confirmados por operador, diferenças, movimentos e auditoria; a conferência final acrescenta um registro com motivo sem alterar o fechamento.

## Cálculo e preservação

`saldoDoCaixa`, compartilhado entre mobile e servidor, soma troco inicial, recebimentos líquidos em dinheiro e entradas, e desconta saídas efetivas. Pix e cartão não aumentam a gaveta. `pagamento.valorCentavos` já é líquido; o troco informativo não é descontado outra vez. Cancelamento comercial conserva o numerário até existir uma devolução registrada. O exemplo do roadmap foi validado: Ana fecha com esperado de R$ 250,00 e Bruno com R$ 100,00.

A migração `0009_demonic_magdalene.sql` acrescenta metadados, reserva e auditoria sem alterar os IDs, valores ou eventos anteriores. Duplicatas de turnos abertos que já existam no legado ficam preservadas e impedem nova abertura até serem regularizadas; a migração não inventa fechamentos. Autoria adicional desconhecida permanece nula e identificada como legado. Uploads v1 ainda são aceitos para recuperar pendências antigas, com autorização/origem e proibição de criar outro turno aberto do mesmo responsável; o app conectado atualizado usa a reserva v2.

SQLite grava movimentos e suas mutações na transação financeira existente. A confirmação offline só é anunciada após a escrita local. Operações online têm comando durável por perfil; perda de resposta mantém a mesma chave, e movimentos/checkout ficam bloqueados até repetir a confirmação pela tela de turnos. As partições e credenciais de R1 são preservadas.

## Arquivos e validações

Principais arquivos: `packages/shared/src/{contrato,caixa}.ts`; `apps/api/src/{db/schema,servicos/sync,rotas/caixa,servidor}.ts`; migração 0009 e metadados; `apps/mobile/src/dados/{caixa,dados,hooks,armazenamentoEscopo}`, cliente HTTP/sincronização e telas em `src/telas/caixa`; rota `app/(tabs)/caixa/turnos.tsx`.

Evidências automatizadas:

| Cenário | Evidência |
|---|---|
| Ana/Bruno, reserva concorrente, autorização por ação, autoria e fechamento | `apps/api/test/caixaUsuario.test.ts` |
| Transferência idempotente, autorização expirada, saldo e rollback do débito quando o crédito falha | `apps/api/test/caixaUsuario.test.ts` |
| Snapshot antigo, evento imutável, correção referenciada, retomada e conferência | `apps/api/test/caixaUsuario.test.ts` |
| Preservação de histórico, metadados nulos e duplicatas legadas | `apps/api/test/migracaoCaixaUsuario.test.ts` |
| SQLite/API: offline, reinício, resposta perdida, bloqueio de pendência e mais de 100 vendas | `apps/mobile/test/equipeApiIntegracao.test.ts` |
| HTTP real, restauração e retomada do mesmo turno em outro aparelho | `apps/mobile/test/syncIntegracao.test.ts` |
| Autorização na tela, intervenção no turno selecionado e destinação do fechamento | `apps/mobile/test/caixaTelas.test.ts` |
| Cálculo com Pix/cartão, troco, cancelamento e devolução | `packages/shared/test/caixa.test.ts` |

Suítes completas: **API: 41 arquivos/514 testes; mobile: 56 arquivos/518 testes; shared: 16 arquivos/170 testes — total 1.202 aprovados**. Os 12 testes de interface/transporte também passaram no lote dedicado à mensagem de restrição do turno. Tipos dos três workspaces aprovados; mobile repetido após o último ajuste. `git diff --check` aprovado.

Bundle Android/Hermes: `builds/r2-bundle/_expo/static/js/android/entry-e21a15c48c972974544dbe2ff644af7c.hbc`, **5.120.460 bytes**, SHA256 `aec327087a0a95595b8d7020874f6f2110ce7ed994ba56b14101fafd7d743557`. Host de homologação documentado e marcadores de turnos, retirada e comandos pendentes conferidos. Log e relatórios locais ignorados em `builds/r2-*`; o bundle não é APK instalado.

Na primeira regressão houve timeouts por excesso de workers e restrições de SMTP/HTTP locais. As suítes foram repetidas com dois workers e permissão para esses servidores locais; não foram alteradas autenticação ou TLS para obter aprovação. Os testes de banco usam PostgreSQL embarcado/PGlite; concorrência em PostgreSQL independente exige homologação separada.

## Limitações e próximos ambientes

1. Implantar R1/R2 e a migração 0009 em homologação, com backup preservado. Conferir dados existentes e testar reserva simultânea, índice, locks e rollback em PostgreSQL independente.
2. Gerar APK conectado à API dessa versão e executar o ciclo com dono e dois operadores em Android físico. Validar SecureStore, alternância no mesmo aparelho, dois aparelhos, modo avião, retomada e contagem física; registrar o aceite humano separadamente.
3. O painel mostra o que o servidor já recebeu. Operações offline de outro aparelho são desconhecidas até a sincronização; não há promessa de saldo em tempo real desses aparelhos. A pendência de fechamento local aparece no aparelho responsável.
4. Intervenção remota durante fechamento offline pode produzir conflito explícito. Eventos e contagem ficam preservados e a nova reserva permanece bloqueada; a resolução assistida desses conflitos e o envio de pendências remanescentes do aparelho anterior continuam na frente de recuperação R3. Não há fechamento automático para encobrir divergências.
5. A autorização de transferência é trocada entre os responsáveis por um identificador copiado; não foram enviados e-mails ou mensagens externas. Alternância offline entre perfis continua em R3.

Histórico incremental: [CP 009](checkpoints-roadmap.md#cp-20261102-009-base-do-caixa-individual-r2), [CP 010](checkpoints-roadmap.md#cp-20261102-010-integracao-e-revisao-do-caixa-r2). Conclusão local e pendências finais: [CP 011](checkpoints-roadmap.md#cp-20261102-011-entrega-local-e-conferencia-do-roadmap-r2).
