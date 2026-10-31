# Execução

Premissas e critérios em spec.md. Alterações limitadas a shared/assinatura, catálogo e contratos; persistência e cobrança da API; fluxo de contratação e gestão mobile; testes e documentação desta entrega. README preexistente fica preservado.

1. Domínio de cupons e cálculo mensal → shared/src/{cupons,assinatura,planos,contrato,index}.ts, shared/test/cupons.test.ts → testes shared e typecheck → feat(billing): add lifetime subscription discounts
2. Persistir cupom e cobrar no servidor → api/src/{db/schema,rotas/assinatura,servicos/assinatura,servicos/cobranca}.ts, migração Drizzle e api/test/cupons.test.ts → integração direcionada → feat(api): persist subscription coupons
3. Ofertar plano único e cupom no app/demo → mobile onboarding, ajustes/assinatura, servicos/{assinatura,backendLocal}, nucleo/rascunho e testes de assinatura → regressão, typecheck e export web → feat(mobile): simplify subscription checkout

Testes existentes preservam compatibilidade legada; testes novos provam oferta atual e descontos. Verificador independente ao final.

T1 concluído: 165 testes shared aprovados, typecheck aprovado. ASSIN-01 em cupons.test.ts:9; ASSIN-02/03 em :13-16; ASSIN-04 em :20-32; ASSIN-05 em :37; ASSIN-06 (resumo de domínio) em :42. Cada teste novo corresponde a esses critérios; nenhum teste existente modificado.
