# Corte mínimo no serviço de sync

Recursos-produto aceito emf5195ad/cf8b826, dependência cumprida. AD039/040 registrados antes da delegação. Mesmo sync.ts exige execução sequencial. Arquivos futuros: sync.ts e novo syncPagamentosManuais.test.ts; documentos/commits pertencem ao gestor.

Em upsertVenda, preservar ramo existente de história/cancelamento e todas as prioridades de nova venda. Depois de vendaConsistente e antes de insert, se algum pagamento tem meio tap ou provedor diferente de null, retornar pagamento_indisponivel. Rejeitar o agregado inteiro; não filtrar/remover partes nem criar pagamento substituto automaticamente. Usar contrato existente; sem flags/env, provider, schema ou novo helper compartilhado de uso único. Futuro perfil global de capacidades poderá consumir política homologada em P0-06-B; este corte não entrega UI/adapters.

Controles positivos alteram explicitamente só o atributo indisponível, mantêm IDs e valores válidos e comparam estado completo, para provar que a recusa é de capacidade. Tap null precisa mudar para cartão manual; outro provedor precisa virar null. Não reescrever pendência automaticamente. Rejeição fica sem ACK; retry após correção explícita pode progredir. Mistura com parte indisponível depois da primeira detecta guarda incompleta.

História é seed SQL válido com pai/filhos e metadados completos, sem cobrança externa. Reenviar/cancelar mantém tudo exceto status/metadados de cancelamento já definidos; nova venda nunca recebe autorização só por copiar origem histórica. Nenhum provider é chamado por sync. Testes atuais de imutabilidade e origem são base de regressão; os novos cobrem especificamente história integrada e corte atual.

Não contornar gate de produção que recusa billing mock para simular homologação. Guarda independe de ambiente; revisão confere ausência de flag e testes de bootstrap existentes preservam bloqueio. Data antiga e plano alto não constituem prova de integração. Pagamentos manuais no servidor provam contrato/aritmética, não ação física do operador ou confirmação bancária.
