# F19 — Retorno da API de homologação à imagem anterior (documentado, não executado)

Versão de 16/11/2026, sessão M2 ([CP 152](checkpoints-roadmap.md#cp-20261116-152-m2-falhas-no-aparelho-restauracao-f15-e-retorno-f19-documentado)). Pela decisão do MVP ([prompts-sessoes-entrega.md](prompts-sessoes-entrega.md), backlog), **a execução real fica para depois do piloto**. Este documento é o roteiro para quando ela for autorizada. Nada aqui foi executado no servidor.

## Situação conferida em 16/11/2026

| Item | Valor | Como foi conferido |
|---|---|---|
| Serviço | `aladdin/pdv-api-homologacao`, fonte Git `romulosutil/prisma-pdv-app`, branch `codex/pdv-homologacao-real`, auto deploy desligado | [deploy-easypanel.md](deploy-easypanel.md) e painel |
| Imagem atual | `84dd0dc` (fix(ci): accept router segments…), implantada há 13 dias, build de 6 s no histórico | Histórico de implantação do painel |
| Código da API hoje | `apps/api/src`, `apps/api/drizzle` e `packages/shared/src` **sem diferença** entre `84dd0dc` e o HEAD da branch | `git diff --stat 84dd0dc HEAD -- …` vazio |
| Imagem anterior | `df41823` (fix(android): address audit and verify registration before sessions), build de 42 s no histórico | Histórico de implantação do painel |
| Migrações | 13 (0000–0012) nas duas imagens; banco com 13 em `drizzle.__drizzle_migrations` | `git ls-tree` e snapshot do F15 |
| Banco | `pdv-postgres-homologacao`, backup manual de 44,2 kB em 1 s; restauração isolada aprovada no F15 | CP 152 |

## Diferença entre as imagens e compatibilidade

- `df41823` → `84dd0dc` só altera `apps/api/src/rotas/cadastro.ts`: acrescenta `POST /auth/cadastro/verificar` e `verificacaoAntecipada: true` em `/auth/cadastro/configuracao`.
- **Sem migração no meio:** o retorno não exige migração reversa nem toca em dados. O Drizzle da imagem anterior encontra as mesmas 13 migrações e não aplica nada.
- **O que para de funcionar na imagem anterior:** cadastro de conta nova pelo APK 0.1.10 ou posterior (a verificação antecipada responde 404). `scripts/build-android.ps1` também recusa gerar APK contra ela.
- **O que continua:** login de contas existentes, venda, sincronização, caixa, fiado, gestão e suporte. São as mesmas rotas e o mesmo schema.
- **Não usar `a987c31` ou anterior:** essa imagem não tem a migração 0012, então o código seria mais velho que o schema. Esse caminho não foi comprovado e fica fora do roteiro.

## Roteiro (quando autorizado)

Pré-requisitos: autorização do usuário na sessão, janela sem cadastro novo (avisar os lojistas do piloto) e aparelhos com a fila zerada ou ao menos sincronizados.

| # | Passo | Tempo estimado |
|---|---|---|
| 1 | Registrar estado: `/saude` 200, header `x-pdv-agora`, `GET /suporte/solicitacoes` 401, imagem `84dd0dc` no histórico | 2 min |
| 2 | Backup manual de `pdv-postgres-homologacao` com nome `pdv-pre-retorno-f19-<data>` e conferir o log (caminho, tamanho, Success) | 1–2 min |
| 3 | (Recomendado) Ensaiar antes na cópia: religar `pdv-postgres-restauracao-r5`, restaurar o backup do passo 2 e subir uma API temporária `pdv-api-retorno-f19`, sem domínio público, apontando para a cópia, na imagem `df41823`. Repetir os passos 6–7 nela e desligar ao final | 20–30 min |
| 4 | Publicar a imagem anterior **sem force push**: criar a branch `codex/pdv-homologacao-retorno-df41823` em `df41823` e trocar a branch da fonte do serviço para ela. Alternativa, se o painel aceitar commit fixo: informar `df41823` na fonte | 2 min |
| 5 | Implantar e acompanhar os logs até "Server listening" e o healthcheck da imagem passar (build completo de 42 s no histórico) | 1–3 min |
| 6 | Conferir: `/saude` 200, `x-pdv-agora` presente, suporte 401 sem sessão, `/auth/cadastro/configuracao` **sem** `verificacaoAntecipada` (prova de que a imagem trocou) e logs sem erro de migração | 2 min |
| 7 | Repetir F05/F09/F15 resumidos: login de conta existente, venda em dinheiro, venda dividida, sincronizar ("Dados confirmados no servidor"), fechar caixa e conferir o esperado. Repetir o snapshot `verificar-restauracao-r5.sql` e comparar contagens e integridade com o passo 2 (só devem crescer as tabelas tocadas pelo teste) | 10–15 min |
| 8 | Voltar à imagem atual: trocar a fonte de novo para `codex/pdv-homologacao-real`, implantar e repetir o passo 6, agora **com** `verificacaoAntecipada: true` | 5 min |
| 9 | Registrar o checkpoint com versões antes e depois, tempos reais, backup usado e resultados. Apagar a branch temporária só com autorização | 5 min |

**Tempo estimado:** de 25 a 35 min sem o ensaio (passos 1, 2 e 4 a 9), ou de 45 a 65 min com o ensaio na cópia. A indisponibilidade da API em cada troca de imagem fica entre 1 e 3 min. Nesse intervalo os aparelhos continuam vendendo offline e reenviam depois, como comprovado no F11.

## Critérios de parada

- Erro de migração, `/saude` diferente de 200 ou divergência de contagem financeira: voltar imediatamente à imagem `84dd0dc` (passo 8). Não restaurar backup sobre o banco vivo sem uma decisão específica, porque isso perde as operações posteriores ([operacao-backup-suporte.md](operacao-backup-suporte.md#incidente-e-retorno-compatível)).
- Nunca executar migração reversa, `TRUNCATE`, force push ou alteração do ambiente (variáveis/segredos) como parte do retorno.

## Limites

- Os tempos vêm do histórico do painel (build de 6 s e de 42 s, backup em 1 s, restauração em menos de 1 min no F15) e não de uma execução do retorno.
- A compatibilidade foi conferida pelo diff de código e de migrações, não por teste da imagem `df41823` contra o banco atual.
- Produção (`pdv-api`) fica fora deste roteiro.
