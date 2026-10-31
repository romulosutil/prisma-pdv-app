# Validação independente: build de produção

**Data:** 2026-10-31
**Escopo:** alterações de preparação desde `0bc0907` e candidato local reconstruído.
**Veredito:** PASS para preparação local e inspeção estática do candidato. Uso em aparelho, distribuição e critérios externos permanecem pendentes.

## Critérios e evidências

| Critério | Evidência | Resultado |
| --- | --- | --- |
| AC1: identidade, versão, API autorizada e ferramentas desligadas | `apps/mobile/app.config.ts:11`–`apps/mobile/app.config.ts:29`; `apps/mobile/test/configuracaoProducao.test.ts:18`–`apps/mobile/test/configuracaoProducao.test.ts:46` | PASS na configuração: fixa a URL autorizada e recusa também URL divergente com variável coincidente; runner fixa a URL em `apps/mobile/scripts/build-producao.py:58`. |
| AC2: incremento conjunto, reconstrução e concorrência | `apps/mobile/scripts/build-producao.py:46`–`apps/mobile/scripts/build-producao.py:87`; `apps/mobile/scripts/test_build_producao.py:27`–`apps/mobile/scripts/test_build_producao.py:59` | Parcial: incremento, leitura sem escrita, limite inicial e lock cobertos; alteração concorrente fora do lock não foi exercitada. |
| AC3: chave estável, estado parcial e segredos | `apps/mobile/scripts/assinatura_producao.py:17`–`apps/mobile/scripts/assinatura_producao.py:51`; `apps/mobile/scripts/test_assinatura_producao.py:17`–`apps/mobile/scripts/test_assinatura_producao.py:80` | Preparação em fixtures: reuso, estado parcial, diretório externo, certificado divergente e ACL com terceiro ou proprietário divergente cobertos. Gestor informou geração e reuso da chave real e inspeção da ACL; este revisor não acessou os arquivos privados. |
| AC4: signing, cache e inspeção reais | `apps/mobile/scripts/build-producao.py:143`, `apps/mobile/scripts/build-producao.py:233`, `apps/mobile/scripts/build-producao.py:243`; `apps/mobile/scripts/perfil_nativo.py:53`; `apps/mobile/scripts/test_build_producao.py:69` | PASS para o candidato local: inspeção independente abaixo; gestor relatou build estável com cache após primeiro build recusar fontes alteradas. |
| AC5: guia e estado externo | `docs/build-producao.md:9`–`docs/build-producao.md:27`, `docs/build-producao.md:41`–`docs/build-producao.md:60`, `docs/build-producao.md:76`–`docs/build-producao.md:90` | Guia revisado: comandos, backup privado, inspeção e roteiro físico presentes. Backup externo, restauração e teste físico permanecem pendentes. |

## Testes e sensor

`python -m unittest test_build_producao test_assinatura_producao`: 14 aprovados, 0 falhas, 0 skips. `npm exec --workspace apps/mobile -- vitest run test/configuracaoProducao.test.ts`: 4 aprovados. Sensor executado em módulos Python compilados em memória, com fixtures temporárias, sem alterar o código real:

| Mutação | Resultado |
| --- | --- |
| `versionCode += 1` alterado para `+= 0` em `apps/mobile/scripts/build-producao.py:71` | Detectada por `apps/mobile/scripts/test_build_producao.py:32` e `apps/mobile/scripts/test_build_producao.py:52`. |
| Reuso de chave desativado em `apps/mobile/scripts/assinatura_producao.py:62` | Detectada por `apps/mobile/scripts/test_assinatura_producao.py:33`. |
| Removida toda a validação da API em `apps/mobile/scripts/build-producao.py:58` | Inicialmente sobreviveu; após correção, detectada por `apps/mobile/scripts/test_build_producao.py:44`–`apps/mobile/scripts/test_build_producao.py:50`. |
| Removida a guarda da flag em `apps/mobile/app.config.ts:13` por plugin Vite temporário em memória | Detectada: marcador `SENSOR_FLAG_APPLIED`, seguido de `AssertionError` em `apps/mobile/test/configuracaoProducao.test.ts:32` (1 falha esperada, 3 passaram). SHA-256 da fonte antes e depois: `0cf114aba5f9a0f67fcbc65e111fd1f85c7397c3f5e8ab2218a74cb664dff56f`. Configuração temporária removida. |

`tasks.md` não estava presente no momento da revisão, portanto não foi possível executar um gate definido nele nem comparar contagens históricas. Gestor relatou aprovação dos alvos atuais: 9 runner, 7 assinatura, 4 legados e 8 configuração; os testes acima foram repetidos pelo revisor em estado anterior. Nenhum teste físico, restauração ou backup externo é alegado.

## Riscos adicionais identificados

- ACL de diretório reutilizado: corrigido com auditoria de proprietário e entradas Allow em `apps/mobile/scripts/assinatura_producao.py:17`–`apps/mobile/scripts/assinatura_producao.py:51`.
- Concorrência de runners: corrigida com lock compartilhado em `apps/mobile/scripts/perfil_nativo.py:11`, usado por `apps/mobile/scripts/build-apk-local.py:170` e pelo runner de produção.
- `apps/mobile/scripts/build-producao.py:260`: as substituições de APK e manifesto são separadas; interrupção entre elas pode deixar o par inconsistente. Comparar sempre o hash real do APK ao manifesto.

## Proteção para outra máquina

`apps/mobile/scripts/assinatura_producao.py:71` e `apps/mobile/scripts/assinatura_producao.py:84` recusam criar chave por padrão quando falta o backup; `apps/mobile/scripts/test_assinatura_producao.py:63` verifica que não cria diretório nem chama keytool. `apps/mobile/scripts/build-producao.py:114` compara pacote, alias e certificado ao registro público antes do build; `apps/mobile/scripts/test_build_producao.py:98` verifica recusa de certificado divergente. Fonte e teste foram inspecionados; a execução dos novos testes foi informada pelo gestor (9 runner e 7 assinatura). O backup externo cifrado e a restauração continuam não verificados.

## Inspeção independente do candidato

- `builds/pdv-1.0.0-7.apk`: 52.299.100 bytes; SHA-256 `8a88b69766d782495b3e4cea6f59caa462476b422d797cc6bc74e2d34f7a91a2`, igual ao JSON adjacente e a `.specs/features/build-producao/artefato.json`.
- `apksigner verify --verbose --print-certs`: assinatura v2 válida, um signatário; SHA-256 `5946ef5ffcb70cd44540b440ff5525cf4ef2bc4bd54808b96581b9514d9aef99`, igual a `apps/mobile/signing-public.json:4`.
- `aapt dump badging`: `br.com.pdv.mobile`, versão `1.0.0`, código `7`, minSdk `24`, arquitetura `arm64-v8a`; sem indicador `application-debuggable`.
- ZIP: quatro arquivos DEX e bundle JS presente; API autorizada encontrada no bundle. `assets/app.config` declara perfil `production`, API autorizada, `toolsEnabled: false` e código `7`. Não foram encontrados arquivos `.env`, keystore ou `credentials.json` pelos nomes verificados.
- Após o commit de código, o gestor reconstruiu sem `--bump`; versão `1.0.0`, código `7`, certificado, tamanho e SHA-256 permaneceram iguais. O hash foi recomputado independentemente e corresponde aos dois manifestos; `.specs/features/build-producao/artefato.json` registra `rebuildSameVersionVerified: true`.
- O manifesto final registra commit-base `3c1a7302d9aea00f3cd3480240a41e27456a7c6a` e `dirty: true`; não é evidência de árvore limpa. O runner verifica fontes e lockfile antes de entregar (`apps/mobile/scripts/build-producao.py:241`).
