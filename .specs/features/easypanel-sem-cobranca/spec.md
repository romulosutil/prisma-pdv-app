# Implantação no EasyPanel com acesso sem cobrança

## Problem Statement

O usuário autorizou publicar no projeto aladdin existente para uso real do PDV sem cobrar assinatura por enquanto. Autorizou também CI e deploy automático após atualização da main. O bootstrap atual rejeita mock em produção; esse bloqueio deve permanecer, e o novo modo deve representar gratuidade sem simular pagamento.

## Goals

- [ ] API de produção com acesso liberado, autenticação SMTP real e persistência PostgreSQL.
- [ ] Fluxo mobile sem cartão ou mensalidade para contas liberadas.
- [ ] Imagem e CI com deploy da main somente após os gates.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Gateway, cobrança real, migração automática para plano pago | Usuário decidiu adiar; futura cobrança exige outro fluxo e consentimento. |
| Migrar contas/dados locais de teste | Banco da VPS será próprio; preservar demonstrações locais. |
| Alterar serviços já existentes ou contratar plano | Apenas serviços próprios do PDV dentro de aladdin. |
| Declarar homologação Android ou backup sem execução | Registrar evidências separadas e limites concretos. |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Uso | Real sem assinatura paga | Resposta explícita do usuário. | Sim |
| Oferta inicial | Plano pro atual com status liberada | Reutilizar recursos atuais sem redesenhar planos. | Premissa |
| Offline | Licença renovada por 7 dias em cada sincronização | Preservar janela operacional existente. | Código existente |
| Implantação | Serviços pdv-api e pdv-postgres em aladdin | Pedido explícito de reaproveitar projeto. | Sim |
| Integração contínua | GitHub Actions para main e PR, deploy só push main após gates | Pedido de CI e deploy automático. | Sim |

Open questions: none para implementação; segredos de infraestrutura serão inseridos no ambiente sem exposição em chat ou commits.

## User Stories

### P1: Operar sem cobrança

**Acceptance Criteria**

1. WHEN NODE_ENV=production e BILLING_PROVIDER=disabled são explícitos com banco e porta válidos, a configuração SHALL aceitar o modo sem cobrança; produção com mock ou billing omitido SHALL continuar recusada.
2. WHEN uma conta é criada nesse modo, a transação SHALL persistir assinatura pro com status liberada e cartão/cliente gateway nulos, sem fatura nem verificação de cartão.
3. WHILE uma assinatura está liberada, o domínio SHALL permitir acesso sem expiração comercial e sem cobrança devida após 90 dias; a licença offline SHALL durar 7 dias desde a emissão e exigir atualização ao vencer.
4. WHEN uma mutação de assinatura paga é chamada no modo disabled ou por uma conta liberada, a API SHALL responder409/cobranca_desativada após autenticação/dono, sem acessar o provider nem alterar a assinatura.
5. WHEN uma conta liberada sincroniza venda manual válida, a API SHALL aceitar a mutação; pedidos sem sessão SHALL responder401 e /dev/* SHALL responder404 em produção.
6. WHEN o bootstrap usa billing disabled, o servidor SHALL usar relógio real em produção e agendar e-mail sem agendar cobrança; o provider desativado SHALL rejeitar qualquer operação financeira chamada por engano.

### P1: Usar o aplicativo sem paywall

**Acceptance Criteria**

7. WHEN o cadastro HTTP termina, o app SHALL sincronizar a assinatura antes de continuar; contas liberadas SHALL ter acesso ao PDV e à configuração de recebimentos/câmera sem passar pelo cartão ou paywall pago.
8. WHILE a assinatura está liberada, Ajustes SHALL informar "Acesso liberado sem cobrança" e ocultar mensalidade, datas de cobrança, cartão, troca, cancelamento e reativação paga; links diretos para cartão SHALL redirecionar para início.

### P1: Publicar com CI

**Acceptance Criteria**

9. WHEN a imagem é construída na raiz, a imagem SHALL conter API/shared/migrações/tsx pelo lockfile, executar como usuário node e excluir .env, bancos locais, mobile, testes e .git do contexto.
10. WHEN um PR ou push na main executa o CI, o workflow SHALL verificar tipos, suítes shared/API/mobile em série com um worker e construir a imagem; deploy SHALL ocorrer somente após sucesso, em push main, com segredo dedicado e sem imprimi-lo.
11. WHEN a implantação for concluída, o serviço pdv-api em aladdin SHALL responder /saude por HTTPS com PostgreSQL persistente privado; serviços anteriores SHALL permanecer com suas configurações preservadas.

**Independent Test**: testes de domínio e integração HTTP/PGlite, bootstrap com dependências controladas, testes de navegação/renderização, build Docker e CI remoto; smoke da VPS sem ler OTP ou segredos.

## Edge Cases

- IF existe assinatura liberada e o modo de ambiente muda, a API SHALL não convertê-la automaticamente em assinatura paga.
- IF verificação, build ou deploy falha, o workflow SHALL falhar sem relatar implantação aprovada.
- WHEN o container recebe SIGTERM, a API SHALL drenar o worker e fechar HTTP/banco pelo encerramento existente.
- IF falta segredo ou acesso necessário à VPS/GitHub, a entrega SHALL registrar o bloqueio concreto, sem publicar com dados fictícios.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FREE-01 | AC1–6: API/domínio | Execute | Verified localmente |
| FREE-02 | AC7–8: mobile | Execute | Pending |
| DEPLOY-01 | AC9: imagem | Execute | Implementing |
| DEPLOY-02 | AC10: CI | Execute | Pending |
| DEPLOY-03 | AC11: VPS | Execute | Pending |

## Execution Plan

1. Modo de acesso liberado: domínio/shared, configuração/provider/bootstrap/API e testes correspondentes. Gate: testes direcionados shared/API e tipos; commit feat(api): support production access without billing.
2. Experiência mobile: carga da assinatura, fluxo e gestão de acesso com testes. Gate: testes mobile direcionados e tipos; commit feat(mobile): support access without subscription payments.
3. Imagem e integração contínua: Dockerfile/.dockerignore, workflow e operação documentada. Gate: regressão em série, Docker build/smoke, revisão independente com sensor em memória antes de publicar; commit ci(deploy): validate main and deploy pdv to easypanel.

### Progresso e cobertura local

- Passo1 concluído: 2 testes shared, 36 API em4arquivos e tipos dos três workspaces aprovados. Regresso completa e revisão independente ficam no passo3.
- AC1: acessoLiberado.test.ts valida retorno exato de produção disabled, rejeita mock/omitido e banco ausente; configuracao.test.ts preserva matriz anterior.
- AC2: acessoLiberado.test.ts consulta estado persistido e resposta HTTP, cartão/cliente nulos, faturas vazias e evento acesso_liberado_sem_cobranca.
- AC3: shared/test/acessoLiberado.test.ts verifica 90dias, cobrança nula e fronteira7/8dias; API chama processador após90dias e verifica faturas/estado.
- AC4: matriz de cinco rotas com409, código estável, assinatura inalterada e spies provider sem chamadas; modo alterado preserva acesso liberado.
- AC5: venda persistida/ACK,401 sem sessão,404 nas duas rotas/dev e204 sem corpo na solicitação de código inexistente.
- AC6: bootstrapSemCobranca.test.ts compara relógio real, modo explícito, listen e worker de e-mail ativo/cobrança ausente; provider verifica/cobra/estorna rejeitando.

Adequação: assertions derivam dos ACs; nenhuma alteração em testes existentes. O estado visual recebe apenas a nova entrada necessária para compilar o tipo de status.

## Success Criteria

- [ ] Gates locais e revisão independente aprovados.
- [ ] CI remoto aprovado e serviço HTTPS saudável com banco persistente.
- [ ] Evidências e pendências registradas, sem alegar funcionalidades externas não testadas.
