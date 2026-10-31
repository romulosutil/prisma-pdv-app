# Fluxo simples de APK de produção

## Problem Statement

Preparar versões assinadas e conectadas da primeira instalação de produção, com comando simples para reconstruir ou incrementar versão. Usuário confirmou primeira chave definitiva inexistente, forneceu API HTTPS publicada e delegou decisões enquanto dorme. Não publicar, fazer push/deploy, contratar serviços ou escrever dados na API.

## Assumptions & Open Questions

| Item | Decisão |
| --- | --- |
| Identidade | PDV, br.com.pdv.mobile, scheme pdv; primeira versão1.0.0/código7 |
| Backend | https://aladdin-pdv-api.jicnzg.easypanel.host; sem cartão ou cobrança conforme servidor publicado |
| Segredo | Primeira chave PKCS12 local fora do repo em ~/.pdv-signing/prisma-pdv; senha aleatória, diretório privado, nunca imprimir/commitar |
| Distribuição | Somente APK candidato local; distribuição e uso físico aguardam usuário |
| Versões | release.json version/versionCode/apiUrl; rebuild não incrementa, --bump patch/minor/major incrementa ambos explicitamente |
| Nativo | Preservar projetos Android gerados em cache por perfil; mover somente diretórios reconhecidos dentro do workspace, sem recursão destrutiva/junctions/worktrees |
| Agentes | Terra Médio solicitado; ferramenta não confirma seleção efetiva |

Open questions: none. Backup externo da chave/banco, restauração e testes físicos ficam pendentes; não bloqueiam preparação local.

## User Stories

Como responsável, quero gerar o APK candidato com um comando e incrementar versões sem editar vários arquivos ou trocar a assinatura.

### Acceptance Criteria

1. WHEN o perfil production é selecionado, o app SHALL usar a identidade definitiva, versão do release.json e API HTTPS informada, recusando ferramentas de teste ligadas, URL inválida/divergente ou conflito com perfil de homologação.
2. WHEN uma versão é incrementada, o comando SHALL atualizar version e versionCode juntos, preservar os demais campos e recusar downgrade, formato inválido ou alteração concorrente; reconstrução simples SHALL preservar a versão.
3. WHEN a assinatura é preparada novamente, o processo SHALL reutilizar a mesma chave e certificado, recusar estado parcial sem sobrescrever e manter senhas fora de comandos/logs/Git/APK.
4. WHEN o APK é gerado, o processo SHALL aplicar release signing sem debug fallback, desativar ferramentas, refazer JS e reutilizar cache nativo; conferir certificado/pacote/versão/bundle/backend e produzir manifesto público com hash e origem reais.
5. WHEN a entrega é encerrada, o guia SHALL conter comandos de rebuild/bump, localização e procedimento de backup privado da chave, inspeção e roteiro físico; produção e critérios externos SHALL permanecer pendentes sem evidência.

## Passos atômicos

1. Configuração e versionamento → release.json, app.config.ts, configuração de Metro, package.json scripts, testes de configuração/versão → testes direcionados e tipos.
2. Assinatura e runner → scripts de assinatura/perfil nativo/build/versionamento e testes Python → fixtures temporárias sem segredos reais + build/inspeção local real, preservando Android anterior.
3. Revisão independente e checkpoint → manifesto público, guia, plano e STATE → revisão com sensor em memória, validate_state e commits locais; parar para teste humano.

## Out of Scope

Play Store, OTA, automação de publicação, mudanças na VPS ou dados reais, multiusuário, gateway e backup externo automático. Não reutilizar chave debug como chave definitiva. O APK de produção não atualiza automaticamente o pacote separado PDV Teste. Nenhuma credencial da API entra no APK.

## Requirement Traceability

| ID | Aceite e verificação |
| --- | --- |
| PROD-01 | AC1/2: configuração e incremento atômico |
| PROD-02 | AC3/4: chave estável, build e inspeção reais |
| PROD-03 | AC5: documentação e checkpoint explícito |

## Estado

Configuração, versionamento, assinatura e runner implementados: 8 testes de configuração e tipos de todos os workspaces passaram. Runner9, assinatura7 e regressão do script de teste4 passaram em execuções sequenciais. Chave real gerada fora do repositório e reutilizada com certificado5946ef5ffcb70cd44540b440ff5525cf4ef2bc4bd54808b96581b9514d9aef99; ACL verificada e certificado público fixado em signing-public.json. Saúde HTTPS200/statusok, sem mutações. Candidato1.0.0/code7 compilado com fonte estabilizada em1m18s e inspecionado; revisão independente final e testes físicos pendentes. Não homologado para produção.
