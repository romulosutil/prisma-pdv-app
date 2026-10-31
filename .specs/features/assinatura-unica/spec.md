# Assinatura única e cupons

## Problem Statement

A oferta inicial precisa de um único plano mensal de R$ 49,90, sete dias grátis e cupom de desconto recorrente. O gateway continua simulado.

## Goals

- Ofertar somente o Pro no onboarding e no catálogo público.
- Aplicar VITALICIO50 de forma durável, com mensalidade de R$ 24,95.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Mercado Pago e cobrança real | Integração solicitada para outra tarefa |
| Gestão administrativa de cupons | Catálogo em código atende esta etapa |
| Remover IDs legados | Preservar assinaturas e dados existentes |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Plano | Pro, 4990 centavos/mês | Reaproveita o plano existente nesse preço | Assumido |
| Código | VITALICIO50 | Nome explícito para o benefício solicitado | Assumido |
| Vitalício | 50% em todos os ciclos, inclusive reativação da mesma assinatura | Sem prazo ou contagem de cobranças |
| Legado | Contratos antigos seguem legíveis e operações antigas compatíveis; catálogo oferece apenas Pro | Não invalidar dados anteriores |
| Cadastro de cupom | Catálogo confiável no shared; cliente envia somente código | Não aceitar percentual fornecido pelo cliente |

**Open questions:** none.

## User Stories

### P1: Contratar e usar desconto

**User Story:** Como dono, quero experimentar o plano e aplicar meu cupom antes de cadastrar o cartão.

**Acceptance Criteria**:

1. The system SHALL publicar somente o plano Pro por 4990 centavos por mês no catálogo de contratação. (ASSIN-01)
2. WHEN o cartão é aprovado THEN the system SHALL iniciar sete dias grátis sem cobrança e preservar o paywall existente. (ASSIN-02)
3. WHEN VITALICIO50 é informado com espaços ou letras minúsculas THEN the system SHALL salvar o código normalizado, 50% e duração vitalícia na assinatura. (ASSIN-03)
4. WHEN uma cobrança dessa assinatura é devida THEN the system SHALL cobrar 2495 centavos na primeira cobrança, renovação, retentativa, recuperação com cartão novo e reativação. (ASSIN-04)
5. IF o código é desconhecido THEN the system SHALL recusar o início sem consumir o teste nem verificar/cobrar cartão. (ASSIN-05)
6. The system SHALL exibir preço final e desconto no checkout, confirmação e gestão, mantendo os cartões de teste disponíveis no app. (ASSIN-06)

**Independent Test:** Contratar em demo e API com VITALICIO50, avançar sete dias, renovar e reativar verificando preço e persistência.

## Edge Cases

- WHEN nenhum cupom é informado THEN the system SHALL cobrar 4990 centavos pelo Pro.
- WHEN a assinatura é relida após reiniciar o backend THEN the system SHALL preservar o desconto.
- IF o cartão é recusado THEN the system SHALL preservar a elegibilidade ao teste.
- WHILE o usuário edita o código the app SHALL retirar a prévia aplicada até nova confirmação.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ASSIN-01 | P1 | Execute | Implementing |
| ASSIN-02 | P1 | Execute | Implementing |
| ASSIN-03 | P1 | Execute | Implementing |
| ASSIN-04 | P1 | Execute | Implementing |
| ASSIN-05 | P1 | Execute | Implementing |
| ASSIN-06 | P1 | Execute | Implementing |

## Success Criteria

- Testes de domínio, API e demo aprovados e typecheck sem erros.
- Revisão independente com evidências por critério.
