# Fase 1 — Cobrança manual demonstrável

## Problem Statement
A API já recusa Tap/provedores, mas o cliente oferece conexões e confirmação simulada. Alinhar o caminho visível de cobrança ao escopo manual e entregar acesso local para avaliação humana.

## Out of Scope
Sem redesenho, migração de banco, caixaId, sync, compra real, preços novos ou alteração de dados históricos. SQLite nativo/Android e oferta geral de funcionalidades futuras continuam nas fases seguintes.

## Assumptions & Open Questions
| Assumption | Chosen default | Rationale |
|---|---|---|
| Pagamento | Dinheiro, Pix estático e crédito/débito manual, provedor null/omitido | Escopo autorizado; API já revalida |
| Integrações | Desligadas em todos os planos/ambientes; singleton do app indisponível | Não prometer efeito que só o simulador produz |
| Legado | Ler/preservar confirmados; não apagar nem converter pendências integradas | Recuperação sem perda |
| Checkpoint | Navegador localhost em origem separada; parar para usuário | Feedback visível sem publicar ou alterar instalação existente |
Open questions: none para esta fase local. Controle Goal pausado não impede a tarefa autorizada nesta conversa; não afirmar retomada automática.

## User Stories
Como operador único, quero registrar recebimentos confirmados manualmente, sem que uma simulação conclua minha venda.

Acceptance Criteria:
1. WHEN a cobrança é aberta em qualquer plano ou com preferências antigas de conexão, o cliente SHALL oferecer somente dinheiro/cartão manual/Pix estático/divisão, sem Tap, Pix automático ou convite para conectar provedores. Rotas diretas de integração SHALL não iniciar simulador nem registrar recebimento. Ajustes e textos de planos SHALL não prometer essas integrações.
2. WHEN alguém tenta registrar nova parcela/venda integrada por chamada direta, fachada durável, repositório e conclusão SQLite SHALL rejeitar antes de persistir/publicar; o singleton de provedores SHALL não simular sucesso. Leitura/retry de venda já concluída e dados legados SHALL permanecer preservados; não apagar nem converter parcela antiga. Testes isolados da classe simulador continuam possíveis, sem torná-la singleton do app.
3. WHEN dinheiro/cartão manual/Pix estático/divisão são confirmados, o fluxo SHALL conservar parcelas, saldo, troco, conclusão única e histórico; dados existentes e preços SHALL não mudar. Testes de domínio/componentes/SQLite afetados, shared e tipos SHALL passar. Prova web SHALL ser registrada como web, nunca como Android/integração real.
4. WHEN a fase termina, revisor novo SHALL confrontar os critérios e sensor comportamental; gestor SHALL entregar commit, URL local e roteiro, atualizar checkpoint e parar para validação humana, sem começar fase 2.

## Requirement Traceability
| ID | Critérios | Status |
|---|---|---|
| UI-01 | 1 | Implementado e gates locais PASS; revisão independente pendente |
| MANUAL-01 | 2,3 | Implementado e gates locais PASS; revisão independente pendente |
| CHECK-01 | 4 | Planejado |

## Execution Plan
1. Gestor define helper compartilhado e testes puros; dois executores independentes implementam domínio e interface em arquivos disjuntos. Gestor revisa persistência, integra e roda gates do escopo. Um commit integrado da fase, incluindo status/evidências curtas.
2. Revisor novo verifica fase/sensor; gestor confere interface local, registra checkpoint e aguarda usuário. Nenhuma fase posterior começa automaticamente.

## Evidências da implementação

Mobile: regressão 452/41 arquivos antes da inclusão da sexta verificação de onboarding; alvo final de interface 6/6. Shared 156/11 arquivos. Typecheck de todos os workspaces PASS; mobile repetido após ajuste do teste PASS. Um runner por vez. Sem alteração de API/DB/migrações.

| AC / resultado exigido | Assertiva localizada | Resultado |
|---|---|---|
| 1: métodos e rotas manuais, preferências antigas | test/fase1Interface.test.ts:86 `expect(tiles.map((e) => e.props.titulo)).toEqual(['Pix', 'Cartão', 'Dinheiro', 'Dividir pagamento'])`; :100–104 PixEstatico/Redirect; :112 meios em Ajustes; :125 onboarding manual | PASS |
| 2: rejeição antes de persistência/publicação | test/fase1Dominio.test.ts:38–39 rejeição/estado idêntico/sem salvar; :45–46 repo; :55–61 snapshot SQLite idêntico | PASS |
| 2: preservar história/retry e bloquear singleton | test/fase1Dominio.test.ts:90–101 igualdade de registro/venda/banco; :116–118 singleton indisponível | PASS |
| 3: split, troco e conclusão única | test/fase1Dominio.test.ts:71 pagamentos manuais com troco500; :72 mesma venda; :73 outbox1; testes existentes carrinhoDuravel/checkoutSqlite/useCobranca | PASS |
| 4: revisão e checkpoint humano | validation.md e docs/fases-e-checkpoints.md | Pendente |

Mapeamento reverso: todos os casos de fase1Interface atendem AC1; fase1Dominio atende AC2/3; capacidades.test.ts:5,10–13 prova política AC1/2. Nenhum caso fora do contrato. Testes usam convenção test/**/*.test.ts do projeto. Asserções de valores/estado e snapshots complementam spies; mocks de componentes não constituem prova visual nem integração real. Adequação local aceita, dependente de revisão/sensor independente e checkpoint.
