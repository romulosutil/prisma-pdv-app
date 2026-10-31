# Execução

Premissas e critérios em spec.md. Alterações limitadas a shared/assinatura, catálogo e contratos; persistência e cobrança da API; fluxo de contratação e gestão mobile; testes e documentação desta entrega. README preexistente fica preservado.

1. Domínio de cupons e cálculo mensal → shared/src/{cupons,assinatura,planos,contrato,index}.ts, shared/test/cupons.test.ts → testes shared e typecheck → feat(billing): add lifetime subscription discounts
2. Persistir cupom e cobrar no servidor → api/src/{db/schema,rotas/assinatura,servicos/assinatura,servicos/cobranca}.ts, migração Drizzle e api/test/cupons.test.ts → integração direcionada → feat(api): persist subscription coupons
3. Ofertar plano único e cupom no app/demo → mobile onboarding, ajustes/assinatura, servicos/{assinatura,backendLocal}, nucleo/rascunho e testes de assinatura → regressão, typecheck e export web → feat(mobile): simplify subscription checkout

Testes existentes preservam compatibilidade legada; testes novos provam oferta atual e descontos. Verificador independente ao final.

T1 concluído: 165 testes shared aprovados, typecheck aprovado. ASSIN-01 em cupons.test.ts:9; ASSIN-02/03 em :13-16; ASSIN-04 em :20-32; ASSIN-05 em :37; ASSIN-06 (resumo de domínio) em :42. Cada teste novo corresponde a esses critérios; nenhum teste existente modificado.

T2 concluído: 54 testes API direcionados aprovados em PostgreSQL local dedicado pdv_test:55441, um worker; typecheck API aprovado. api/test/cupons.test.ts prova catálogo (:29), persistência (:48), valor cobrado em todos os caminhos (:53-77), falha sem consumo (:34-41). Teste antigo do catálogo foi atualizado para a nova oferta explicitamente solicitada; expectativas financeiras legadas preservadas. Tentativas PGlite falharam por reserva de memória e não contam como validação.

T3 concluído: typecheck de todos os workspaces aprovado; 51 testes mobile em nove arquivos aprovados, incluindo dois testes da tela real de cupom com hooks React. cupons.test.ts:31-47 prova preço cobrado, reinício e reativação; :53-61 prova falhas; :65-77 prova recuperação. cupomTela.test.ts:35-50 prova resumo/envio/remoção; :53-67 prova edição e inválido. Nenhum teste financeiro antigo alterado. Documentação atual em docs/assinatura-unica-e-cupons.md.

Regressão ampla da API foi interrompida: outros arquivos usam PGlite diretamente e voltaram a exceder a reserva de memória; também apresentaram falhas fora do escopo de assinatura. Não conta como gate aprovado nem foi alterada para esta entrega. Os 54 testes direcionados do escopo passaram; revisão deve verificar somente esta entrega e registrar a limitação.

Verificação visual parcial: navegação Início → Ajustes → Assinatura no Metro8088 sem erro de renderização; conta de homologação legada preservada. Testes de tela exercitam a nova contratação sem alterar essa conta ou seus recebimentos. Android físico e matriz completa de tamanhos/temas não executados.
