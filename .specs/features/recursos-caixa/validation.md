# Validação recursos-caixa

**Veredito: PASS local**, sujeito às limitações abaixo. Verificador independente, não autor. Data: 2026-10-29. Fonte: `7d264f6`; diff: `cbbac4d..7d264f6`.

## Critérios de aceite

| AC | Resultado | Evidência e resultado esperado |
| --- | --- | --- |
| 1 | PASS | `apps/api/test/syncRecursosCaixa.test.ts:28` parametriza três planos, dois tipos e caixa novo/existente; linhas 33–41 usam data antiga e plano adulterado e exigem HTTP 200, `recurso_plano`, nenhuma aceita e snapshot inalterado. Linhas 43–44 exigem aceitação e evento completo com caixa e loja corretos nos outros planos. |
| 2 | PASS | `apps/api/test/syncRecursosCaixa.test.ts:56` confirma downgrade local; linhas 59–69 exigem replay, omissão, fechamento, histórico completo e pull. Linhas 73–79 exigem rejeição sem alteração e posterior aceitação dos mesmos IDs após upgrade, sem duplicar histórico. Linhas 80–87 verificam fechamento e pull completo. Billing é mock local. |
| 3 | PASS | `apps/api/test/syncRecursosCaixa.test.ts:101` cria legado com caixa próprio e loja alheia; linha 104 enumera duplicatas, cada campo e vínculos, incluindo null versus vazio. Linhas 109–120 exigem rejeição, snapshot intacto, ausência de pai e ACK; linhas 125–132 comprovam progresso e replay do vizinho. Linhas 142–152 verificam prioridade de loja, origem e fechamento; linha 108 inclui ACK anterior. |
| 4 | PASS | `apps/api/test/syncRecursosCaixa.test.ts:160` inclui dois novos eventos, um sem disputa. Linhas 165–181 usam duas instâncias e observação por PID/advisory antes da vencedora; linhas 189–193 exigem 409, erro e mensagem exatos, snapshot e rollback do evento sem disputa. Linhas 194–203 exigem retry com rejeição individual, progresso do vizinho e preservação da vencedora. Trigger é removido no finally, linhas 204–211. |
| 5 | PASS local | Gates reproduzidos abaixo; sensor matou sete mutantes comportamentais. Diff adiciona o teste e não altera testes anteriores. Os gates globais foram informados pelo gestor, não reproduzidos por este verificador. O teste de concorrência PostgreSQL é condicionalmente ausente em PGlite, pois depende do PostgreSQL. |

## Gates

- Reproduzido: `syncRecursosCaixa.test.ts sync.test.ts syncOrigem.test.ts --maxWorkers=1`: PGlite 37/37, PostgreSQL dedicado 39/39, três arquivos em cada.
- Reproduzido: `npm run typecheck -w @pdv/api`, exit 0.
- Informado pelo gestor, não reproduzido nesta revisão: API 408 PGlite / 464 PostgreSQL, mobile 434, shared 150 e typechecks todos PASS. Não se infere execução própria desses gates.
- O diff não remove nem altera testes anteriores; contagem global anterior não foi reproduzida.

## Sensor de discriminação P0

Cada mutação foi aplicada isoladamente em arquivo exportado de `7d264f6`, executando o teste novo no PostgreSQL dedicado com `maxWorkers=1`. Todas falharam por asserção comportamental, não por setup.

| Mutação em `apps/api/src/servicos/sync.ts` | Resultado e asserção que falhou |
| --- | --- |
| Linha 225: desativar capacidade | Morto: `syncRecursosCaixa.test.ts:39`, esperava `recurso_plano`; 5 falhas, 11 passaram. |
| Linha 217: remover guarda de duplicata | Morto: `syncRecursosCaixa.test.ts:109`, esperava apenas ACK anterior; 1 falha, 15 passaram. |
| Linha 222: remover comparação de caixa | Morto: `syncRecursosCaixa.test.ts:126`, esperava `movimento_invalido`; 1 falha, 15 passaram. |
| Linha 222: remover comparação de loja | Morto: `syncRecursosCaixa.test.ts:109`, esperava apenas ACK anterior; 1 falha, 15 passaram. |
| Linha 222: remover comparação de motivo | Morto: `syncRecursosCaixa.test.ts:109`, esperava apenas ACK anterior; 1 falha, 15 passaram. |
| Linha 225: aplicar capacidade também a histórico confirmado | Morto: `syncRecursosCaixa.test.ts:59`, esperava replay e omissão aceitos; 1 falha, 15 passaram. |
| Linha 258: exigir apenas `inseridos.length === 0` | Morto: `syncRecursosCaixa.test.ts:189`, esperava 409 e recebeu 200; 1 falha, 15 passaram. |

Resultado: 7/7 mortos; nenhum sobrevivente. Tentativas de shell para leitura e preparação falharam por expansão de variáveis/escaping e foram descartadas, não contabilizadas como mutantes. A cópia foi removida após remover junctions individualmente; porcelain antes e depois era idêntico: `M README.md` e `?? .specs/features/recursos-produto/`, ambos preexistentes.

## Qualidade e limites

O código compara identidade e conteúdo antes da escrita (`apps/api/src/servicos/sync.ts:216`), aplica capacidade somente a novos (`:224`) e exige contagem completa de `returning` (`:257`). Alterações de produção limitam-se ao serviço previsto; sem schema, provider, billing, jobs ou fluxo mobile alterados. A revisão não executou integração externa ou compra real e não declara o projeto pronto para produção. Estoque e demais capacidades continuam fora deste lote. A plataforma não fornece confirmação independente do modelo efetivo deste verificador.
