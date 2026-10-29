# Validação: acesso mobile

**Veredito: PASS para o contrato local**  
**Data:** 2026-10-29  
**Verificador:** independente dos autores  
**Diff:** `d3ad1f7..cdb09b3`; HEAD `cdb09b3e74d420b52496a45b3beb06d0436d71be`

Este resultado não aprova P0-03 global nem produção. Os testes executam em Node: cofre e fetch são fakes onde indicados; a API de integração é Fastify em processo com PGlite e SQLite; a tela usa renderer React e hosts React Native simulados. Cofre físico, Android físico, UAT visual/interativo e homologações externas permanecem pendentes.

## Tarefas

T1–T5 estão aceitas no recorte local em `tasks.md`, com as limitações externas expressas ali. A prova de duas contas inclui API em processo, não apenas controller simulado.

## Critérios e resultados observados

| AC | Resultado especificado e evidência de asserção | Resultado local |
|---|---|---|
| 1 | Cofre antes de remover legado: `apps/mobile/test/sessaoSegura.test.ts:33` verifica falha e `base.dados.get('conta')` igual à origem; `:28-29` verifica um valor no cofre e `JSON.stringify(base.escritas).not.toContain('segredo')`. Inspeção dos arquivos de cofre e conta não encontrou chamadas de log. Android/cofre físico não foram executados. | PASS local |
| 2 | `apps/mobile/test/sessaoSegura.test.ts:37` preserva origem em falha de metadata; `:41-42` exige sessão nula, perfil/identidade, reautenticação e vendas intactas; `:63-64` preserva metadata e cofre em falha; `:116-117` exige erro sanitizado e identidade. | PASS local |
| 3 | `apps/mobile/test/acessoMobile.test.ts:93-103` exige token mantido após login público/403, sessão nula e reautenticação após 401, e igualdade de carrinho e dados financeiros; `apps/mobile/test/backendAcesso.test.ts:43-46` exige callback não chamado em 403, 401 público e rede. `apps/mobile/test/acessoApiIntegracao.test.ts:83-87` confirma 401 da API em processo e preservação. | PASS local |
| 4 | `apps/mobile/test/acessoMobile.test.ts:118-119` exige token `mais-novo` em memória e cofre após 401 antigo; `:135-136` faz o mesmo para logout atrasado; `:238-240` exige `{ revogadaNoServidor: online }`, sessão nula e carrinho preservado. | PASS local |
| 5 | `apps/mobile/test/acessoMobile.test.ts:59-64` exige `Authorization: Bearer novo` e nomes reais; `:75-77` exige estado anterior intacto em falha; `apps/mobile/test/trocaContasApi.test.ts:70-73` verifica perfil e GET `/conta` 200 da API em processo. | PASS local |
| 6 | `apps/mobile/test/acessoMobile.test.ts:189-196` exige produtos, vendas, caixa, carrinho, licença e Pix vazios e preferências próprias de B; `apps/mobile/test/isolamentoConta.test.ts:69-70` e `:79-82` exigem que leitura/gravação atrasadas de A não publiquem em B. `apps/mobile/test/trocaContasApi.test.ts:62-65,70-81` verifica contas/aparelhos distintos e retorno A/B pela API em processo. | PASS local |
| 7 | `apps/mobile/test/trocaContasApi.test.ts:97-105` exige conflito, nenhuma chamada, contas/sessões inalteradas e checkout 2500/1500 preservado; `apps/mobile/test/acessoMobile.test.ts:254-265` exige conflito, mesmo carrinho e venda 2500 com pagamentos `[1000, 1500]` e outbox. | PASS local |
| 8 | `apps/mobile/test/backendAcesso.test.ts:16-20,54-56` verifica rotas/token e rejeição de resposta inválida/403; `apps/mobile/test/aparelhosTela.test.ts:68-80` exige ausência de sucesso antes de resposta, sucesso após confirmação, erro sem sucesso e lista preservada; `apps/mobile/test/acessoApiIntegracao.test.ts:103-107` confirma revogação na API e 401 subsequente. Rede e UI nativa reais não foram homologadas. | PASS local |

## Gates

- `rtk proxy npm run typecheck`: passou nos três workspaces.
- `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1`: 351 passaram, zero falhas ou skips (35 arquivos).
- `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1`: 125 passaram, zero falhas ou skips (9 arquivos).
- `rtk proxy npm run test --workspace=@pdv/shared`: 136 passaram, zero falhas ou skips (9 arquivos).
- Contagem total antes da feature não foi executada: não é possível afirmar delta. Diff adiciona testes e altera `instalacao.test.ts`; as expectativas antigas de aparelho global entre contas foram substituídas pelo contrato de aparelhos por conta (T5), não simplesmente removidas sem motivo.

## Sensor de discriminação

Cópia isolada criada por `git archive HEAD` em diretório temporário, com dependências por junction. Em `apps/mobile/src/dados/conta.ts:31` foi removida a comparação `tokenRejeitado !== atual.sessao.token`. `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1 test/acessoMobile.test.ts` falhou como esperado: três falhas, incluindo a asserção de token novo em `acessoMobile.test.ts:118`, logout atrasado em `:135` e preservação de sessão em `:147`. **1/1 mutação morta.** A cópia foi descartada; `git status --porcelain` antes e depois foi exatamente ` M README.md`. O sensor foi direcionado a uma falha de alto risco; não constitui execução completa de mutation testing.

## Qualidade e limites

O diff é concentrado em acesso, persistência, isolamento, testes e documentação pertinentes; foram examinados contratos de cofre, sessão, escopo e dispositivos e as asserções acima. Casos de cofre ausente/falha, metadata, 401/403, resposta tardia, pendências, troca e erro de revogação estão cobertos no recorte local. O teste de tela usa hosts simulados; não comprova interação, acessibilidade ou aparência em dispositivo. Nenhum UAT humano foi realizado. A validação não altera os estados do plano global.
