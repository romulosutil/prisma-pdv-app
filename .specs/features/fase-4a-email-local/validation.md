# Validação independente — Fase 4A e-mail local

**Data:** 2026-10-30
**Diff de código:** `28497b9..79fe157`
**Verificador:** agente independente, diferente do implementador; modelo/nível efetivo solicitado Terra Médio não verificável nesta sessão.
**Veredito:** PASS para a preparação local — regressão completa não aprovada e homologações externas pendentes.

**Result**: PASS

## Critérios e evidências

| AC | Resultado e evidência |
|---|---|
| 1 | PASS. `apps/api/test/homologacaoEmail.test.ts:39` matriz de ambiente, confirmação, host/banco/query/hash; `:48` mensagem fixa e `:49` banco/transporte não chamados. Guarda em `apps/api/src/homologacaoEmail.ts:19`. |
| 2 | PASS. `apps/api/test/homologacaoEmail.test.ts:43` matriz SMTP, senha e ring inválidos com as mesmas asserções de ausência de efeitos em `:48`; perfil validado em `apps/api/src/homologacaoEmail.ts:25`. |
| 3 | PASS local. `apps/api/test/homologacaoEmail.test.ts:53` ordem de limpeza, guarda, listen e agendamento; `:54` relógio real, fontes vazias e dev desabilitado; `:56` host/porta exatos; `:58` cobrança ausente; `:60` argumentos do worker. Fixture restrita pelo guard de `apps/api/src/homologacaoEmail.ts:19`; bootstrap normal mantém guarda de produção em `apps/api/src/configuracao.ts:38`. |
| 4 | PASS local. `apps/api/test/homologacaoEmail.test.ts:65` ordem e chamada única; `:70` fechamento espera drain; `:74` erro sanitizado e limpeza; `:80`–`:112` falhas de inicialização e encerramento. `apps/api/src/jobsEmail.ts:25` aguarda tarefa ativa. |
| 5 | PASS. `apps/api/test/servidorRotasDev.test.ts:15` e `:20` verificam 404 com false e padrão anterior; `:35` verifica ambas 404 em produção mesmo com true. |
| 6 | PASS quanto ao roteiro: `docs/operacao-email-resend.md:23`–`:31` usa placeholders, `:60` distingue JOBS, `:62`–`:65` descreve env-file e comando, `:69` preserva ambiente demo e `docs/fases-e-checkpoints.md:123` registra limites. `.gitignore:5` ignora env-file. Divergência de estado no plano indicada abaixo. Nenhum envio externo demonstrado. |

## Gate e limites

- Independente: `npx vitest run test/homologacaoEmail.test.ts test/servidorRotasDev.test.ts --maxWorkers=1` em `apps/api`: **30/30, 2 arquivos**, sem skips; repetido na cópia isolada com igual resultado.
- Evidência relatada pelo gestor, não repetida aqui: 126/7 direcionados, 40/4 PostgreSQL e SMTP TCP local e tipos API aprovados; smoke no banco novo vazio `pdv_homologacao_email`, saúde 200 e ambas `/dev` 404, sem OTP nem envio externo. Não comprova Resend.
- Regressão completa API **não aprovada**: OOM/erros de workers Windows; repetição PGlite 242/469 e 19 erros. Não foi reexecutada por limitação de memória. Não existe `tasks.md` nesta feature para identificar gate Build ou comparação formal da contagem anterior; o plano da spec define testes direcionados e tipos como verificação local.
- Limpeza Docker informada pelo gestor: cache 22,73 GB → 0, imagens 31 → 16, 28 containers (9 ativos) e 25 volumes preservados. Não reexecutada por este revisor.

## Sensor em scratch

Worktree descartável em TEMP, baseline 30/30. Seis alterações comportamentais independentes foram detectadas: dispensar confirmação; aceitar host SMTP incorreto; habilitar /dev no launcher; ouvir em 0.0.0.0; omitir await do drain; permitir /dev em produção. Cada uma falhou com 1 caso e 29 aprovados. Uma sétima alteração apenas removeu a checagem redundante `url.pathname`: sobreviveu, pois a regex anterior ainda rejeita o banco incorreto; não representa bypass comportamental e não é contada entre as seis. Scratch removido após excluir junction de `node_modules` separadamente, com alvo absoluto confirmado sob TEMP. Porcelain imediatamente antes/depois da limpeza igual; alteração adicional de `docs/plano-implementacao-producao.md` desde o baseline inicial foi edição simultânea informada pelo gestor, não pelo sensor.

## Qualidade e pendências

Revisão do diff e bootstrap normal: mudanças focadas no launcher e opção explícita, sem alteração no caminho normal de inicialização; testes apontam resultados concretos. Não foi executado UAT por ser infraestrutura local. Resend Verified, credencial, destinatário autorizado, entrega/login reais, Android e produção permanecem pendentes. Nenhum teste local envia ao Resend.

1. **Achado menor corrigido:** o resumo em `docs/plano-implementacao-producao.md:17` condicionava a fase 4 ao checkpoint 3, em contradição com a autorização posterior. Após correção pelo gestor, registra checkpoint entregue e autorização para a preparação local, coerente com `docs/plano-implementacao-producao.md:93` e `docs/fases-e-checkpoints.md:26`, sem presumir homologações externas. Revisão apenas documental; código não mudou e sensor/suítes não foram repetidos.

Critérios 1–5 e roteiro AC6 têm evidência para a preparação local. Este PASS não aprova a regressão completa nem homologa Resend, Android ou produção. Nenhuma alteração de implementação, spec ou tarefas foi feita por este revisor. Não foi registrada lição em arquivo separado porque o escopo de escrita autorizado se limitou a este relatório.
