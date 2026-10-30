# Validação independente — fase 1

Data: 2026-10-30. Diff: `828bc56..b105d1d`. Revisor sem autoria; a seleção efetiva de modelo Terra Médio não é verificável pelas informações disponíveis ao revisor.

**Veredito técnico: PASS**, condicionado ao checkpoint humano ainda pendente (AC4). Não é evidência de Android, SQLite nativo ou integração real. O gestor é responsável por registrar commit, URL, roteiro e resultado do checkpoint; fase 2 não foi revisada nem iniciada aqui.

## Critérios e evidências

| Critério | Resultado esperado e assertivas |
|---|---|
| AC1 oferta | Somente Pix, cartão, dinheiro e divisão: `apps/mobile/test/fase1Interface.test.ts:86` `expect(tiles.map((e) => e.props.titulo)).toEqual(['Pix', 'Cartão', 'Dinheiro', 'Dividir pagamento'])`; divisão `:94` espera `['Pix', 'Cartão', 'Dinheiro']`; preferência antiga conectada é fixture em `:51` e ajustes `:112` exige os três meios. Onboarding `:125` exige meios sempre ativos sem handlers. O checkout não consulta plano ou preferência. |
| AC1 rotas e planos | `apps/mobile/test/fase1Interface.test.ts:100` espera PixEstatico, `:103` e `:104` exigem Redirect para `/pagar`, e `:106` nenhum provider; `:119` impede Tap e automático nos destaques de todos os planos. `apps/mobile/app/(onboarding)/planos.tsx:66` substitui a descrição exibida. São testes de componentes com mocks, não inspeção visual. |
| AC2 rejeição | Fachada `apps/mobile/test/fase1Dominio.test.ts:38` rejeita e `:39` conserva estado, sem publicar ou salvar; repositório `:45` e `:46` rejeita sem persistir; SQLite `:55` e `:56` rejeita gravação com snapshot idêntico, `:60` e `:61` rejeita conclusão e preserva snapshot. Casos abrangem Pix com provider, cartão com provider e Tap. |
| AC2 legado/singleton | `apps/mobile/test/fase1Dominio.test.ts:59` lê rascunho integrado; `:90`–`:92` lê e repete conclusão histórica com snapshot idêntico; `:97` e `:101` verificam retry da fachada e repositório; `:117` e `:118` exigem erro nas operações Pix/Tap do singleton. Classe simuladora permanece disponível para testes isolados. |
| AC3 manual | `apps/mobile/test/checkoutSqlite.test.ts:73` exige saldo 1500; `:90`–`:93` total 2500, parcelas [1000,1500], identificação da conclusão e contagens [1,1,2,1]. `apps/mobile/test/fase1Dominio.test.ts:71` exige Pix e dinheiro com troco 500 e provider null; `:72` igualdade no retry e `:73` uma outbox. Diff não altera preços nem migrações. |
| AC4 revisão/checkpoint | Esta revisão e sensor estão registrados aqui. Checkpoint de interface e validação humana pendentes do gestor; não declarar a fase validada pelo usuário. |

## Gates e sensor

Executado neste revisor: `rtk npm test -w @pdv/mobile -- --maxWorkers=1 test/fase1Dominio.test.ts test/fase1Interface.test.ts`: 19/19 PASS, 2 arquivos. Gestor informou mobile 452/41 antes de adicionar o sexto teste de onboarding, shared 156/11 e typechecks de todos workspaces PASS, com mobile repetido após correção e interface final 6/6. Não reexecutei as suítes globais. Não há `tasks.md` nem comando de build gate formal nesta feature; contagem anterior à fase não foi levantada, portanto integridade por delta de testes não foi comprovada.

Sensor em arquivo `git archive b105d1d` em TEMP absoluto, uma suíte por vez e `--maxWorkers=1`. Baselines: mobile 19/19 e shared capacidades 6/6. Junctions de dependências apontavam ao checkout real; mutações de fronteira eram arquivos mobile do scratch e os dois mutantes do helper foram exercitados diretamente por `packages/shared/test/capacidades.test.ts` relativo ao scratch, evitando resolução do shared real.

| Falha injetada | Resultado comportamental |
|---|---|
| Remover guarda de adicionar parcela na fachada | Morta: 3 casos falharam porque promessa resolveu em vez de rejeitar (`fase1Dominio.test.ts:38`). |
| Remover guarda SQLite salvar | Morta: 3 casos falharam porque promessa resolveu em vez de rejeitar (`fase1Dominio.test.ts:55`). |
| Remover guarda SQLite concluir | Morta: 3 casos falharam porque venda foi retornada em vez de rejeitar (`fase1Dominio.test.ts:60`). |
| Remover guarda do repositório | Morta: 3 casos falharam porque venda foi retornada em vez de rejeitar (`fase1Dominio.test.ts:45`). |
| Aceitar qualquer provider no helper | Morta: 4 casos retornaram true em vez de false (`packages/shared/test/capacidades.test.ts:12`). |
| Aceitar Tap no helper | Morta: retorno true em vez de false (`packages/shared/test/capacidades.test.ts:10`). |

Seis mutações comportamentais válidas mortas, nenhuma sobrevivente. Também testei a guarda de conclusão da fachada: erro diferente provocado pelo stub de persistência; não conto essa tentativa como mutação comportamental válida. Trocar singleton pelo simulador falhou primeiro na assertiva de identidade de classe, portanto também não é contado como sensor comportamental. Junctions foram removidas separadamente antes de excluir o scratch após validar o caminho absoluto em TEMP. Baseline real: ` M README.md`, alteração prévia preservada; conferência final abaixo.

## Qualidade, limites e acompanhamento

O diff mantém as mudanças concentradas nas fronteiras e telas da fase; o fluxo integrado legado permanece no código, mas as rotas expostas redirecionam e o singleton está indisponível. As verificações automatizadas não substituem a conferência visual do gestor. O critério de checkpoint humano segue pendente. A ausência de `tasks.md`, de baseline quantitativo anterior e da confirmação do modelo são limitações de processo, não alegações de gate executado. Sem mutar `spec.md`, `STATE.md`, README ou arquivos de lições: esta revisão foi explicitamente limitada a este relatório.
