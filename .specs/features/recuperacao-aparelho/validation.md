# Validation: recuperação de aparelho

**Result**: PASS
**Data**: 2026-10-29
**Escopo**: validação local independente; não é aceite global P0-03 nem homologação de produção.
**Fonte**: diff `a863dae..70886f945a1efd5f95aff73d54c9c0d7b3e9ff7d`. A fonte de produção é a de `2f62ffb68c52cd6b5cdcac7964de1d54bd4f6c7a`: o diff até `70886f9` contém somente cinco arquivos de teste e os documentos `spec.md` e `tasks.md`. As provas adicionais foram executadas antes dos commits, no working tree; seu conteúdo corresponde aos testes commitados em `82970f6` (API) e `70886f9` (mobile), sem diff de teste pendente após os commits.

## Evidências por critério

| AC | Asserções verificadas | Resultado |
|---|---|---|
| 1 | `apps/api/test/recuperacaoAparelho.test.ts:503-504` exige cinco tentativas; :493 exige cinco falhas email; :311-328 cobre OTP próprio e prazo; :452 exige 429 na confirmação; :40-41 exige uso único. | PASS |
| 2 | `apps/api/test/recuperacaoAparelho.test.ts:34-37` exige hash e TTL 300000; :43-44 exige 401 para prova e token derivado; :517-520 compara candidatos exatos e snapshot excluindo aparelhos de outra loja/conta e revogado. `apps/api/src/rotas/recuperacao.ts:37` inspecionado para `randomBytes(32)` e base64url; `packages/shared/test/recuperacaoContrato.test.ts:35` valida formato. | PASS |
| 3 | `apps/api/test/recuperacaoAparelho.test.ts:100-105` exige 409, código, estado igual e OTP intacto para ativo; :421-429 exige o mesmo estado e códigos por revogado, outra conta/loja e vaga. | PASS |
| 4 | `apps/api/test/recuperacaoAparelho.test.ts:48-51` exige 400 e estado igual sem consentimento; :123-124 exige 401/`recuperacao_invalida` ao expirar; :523-539 insere OTP independente e exige invalidação da primeira prova, 401 e origem 200. | PASS |
| 5 | `apps/api/test/recuperacaoAparelho.test.ts:57-59` exige sessão de 30 dias e troca de acesso; :550-556 exige duas sessões anteriores revogadas e alvo/sessão/instante exatos; :232 compara registros financeiros. | PASS |
| 6 | `apps/api/test/recuperacaoAparelho.test.ts:61-69` compara replay e exige 409/estado igual para outro alvo; :210-213 exige respostas iguais e duas sessões em duas instâncias; :288-299 força disputa PostgreSQL e compara estado integral do perdedor e IP 1. | PASS |
| 7 | `apps/api/test/recuperacaoAparelho.test.ts:346-363` e :372-379 comparam estado em recusas; :559-578 exige 401 e estado igual após revogar aparelho ou mudar ID de sessão; :581-612 força alvo/plano alterado enquanto bloqueado, exige 409 e estado esperado; :398-405 verifica relógio após trava. | PASS |
| 8 | `apps/api/test/recuperacaoAparelho.test.ts:135-145` e :148-171 exigem 500, rollback integral e retry nas cinco fronteiras; :184-194 exige 500 e rollback para outra constraint; :295-299 demonstra conflito PK com IP retido. | PASS |
| 9 | `apps/mobile/test/backendRecuperacao.test.ts:21-35` exige seis mensagens exatas independentes de dois corpos; :43-52 exige DTO público sem Authorization; :61-63 preserva credencial em 401; :84-85 exige mensagem 429; :105-109 recusa demo sem escrita. | PASS |
| 10 | `apps/mobile/test/recuperacaoApiIntegracao.test.ts:132-159` usa SQLite com dados duráveis não carregados e exige bloqueio antes das duas chamadas e estado igual; `apps/mobile/test/recuperacaoDados.test.ts:25-29,215-220,251-263,266-278` cobre cópia sem segredo, serialização e invalidação de respostas antigas. | PASS |
| 11 | `apps/mobile/test/recuperacaoDados.test.ts:77-102` testa cada ID/papel divergente e ordenação antes de registrar; :168-198 exige rejeição de contexto sem sessão e geração cancelada; `apps/mobile/test/recuperacaoApiIntegracao.test.ts:80-88,115-129` exige perfil antes do cofre, retry igual após falhas e sessão única. | PASS |
| 12 | `apps/mobile/test/recuperacaoTela.test.ts:37-49` exige loja, email, aviso literal, escolha e oferta correta; :60-62 clique duplo; :98-115 retomada e bloqueio; :126-128 e :151-154 rejeitam visão e resultado antigos. Hosts são simulados. | PASS |
| 13 | `apps/mobile/test/recuperacaoApiIntegracao.test.ts:71-101` usa API em processo com PGlite, duas SQLite e cofre fake; exige uma autorização ativa, origem 401, produto/caixa preservados, total 2500, parcela 1000, saldo 1500, rascunho persistido e consultas financeiras iguais. | PASS local |

## Correções de prova reavaliadas

Os gaps anteriormente identificados foram confrontados individualmente com os testes T6/T7: candidatos inelegíveis; snapshots completos e status dos conflitos; invalidação por segunda iniciação e erro de expiração; múltiplas sessões e traço; replay e perdedor de corrida; barreiras para revogação e downgrade; revogação do novo aparelho e troca de ID; mensagens 409; preflight SQLite; validação e persistência do vínculo; adoção de contexto externo; email e aviso da UI. As novas asserções exigem os valores indicados acima. Nenhum gap anterior permanece aberto nesta revisão.

## Gates

Resultados da execução independente anterior aos commits, com os testes T6/T7 no working tree: API PostgreSQL dedicado `PDV_TEST_POSTGRES_URL` local em `127.0.0.1:59584/pdv_test`: 193/193; API PGlite: 185/185; mobile: 433/433; shared: 148/148. Comando `npm run test --workspace <workspace> -- --maxWorkers=1`; `npm run typecheck` e `git diff --check` também retornaram 0. Oito casos adicionais condicionais PostgreSQL não são registrados na variante PGlite. Nenhum teste registrado foi pulado. Gates não foram repetidos após os commits, pois o conteúdo dos testes executados permaneceu igual.

## Sensor

Sensor anterior executado sobre fonte de produção HEAD `2f62ffb68c52cd6b5cdcac7964de1d54bd4f6c7a`, inalterada neste lote: cinco mutantes mortos por asserção. TTL 600000 causou esperado 300000/recebido 600000; remoção da expiração causou esperado 401/recebido 200; ignorar revogação de sessão no replay causou esperado 401/recebido 200; remoção da geração fez promessas resolverem em vez de rejeitar; remoção da comparação de ID da visão chamou confirmação indevida. Scratch criado por git archive em TEMP; junção de node_modules removida separadamente; diretório removido após checagem de caminho. Porcelain real antes/depois do sensor: somente ` M README.md`. Sensor não foi repetido pois a fonte não mudou; os testes adicionais foram exercitados nos gates desta rodada.

## Limites

SMTP real, Android físico/Play, proxy e sync P0-02 continuam externos. Não se afirma restauração física nem produção. A triagem 04c492 não altera dependências nem resolve CVEs. O provedor não confirmou a seleção de modelo solicitada, conforme AD-005. Contagem pré-feature não foi medida, logo não se afirma delta histórico.
