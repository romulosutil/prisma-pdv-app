# APK de produção: gerar e atualizar

Fluxo local preparado em31/10/2026 para PDV, pacote `br.com.pdv.mobile`, API `https://aladdin-pdv-api.jicnzg.easypanel.host`. Gera um candidato assinado; não publica, faz push, aciona deploy ou aprova produção automaticamente.

## Comandos do dia a dia

Na raiz do repositório, com as dependências e ferramentas locais já instaladas:

```powershell
# Reconstruir a versão atual, sem mudar sua numeração
rtk proxy npm.cmd run apk:producao -w @pdv/mobile

# Incrementar correção e compilar: 1.0.0/código7 → 1.0.1/código8
rtk proxy npm.cmd run apk:producao -w @pdv/mobile -- --bump patch

# Incrementar funcionalidade: 1.0.1 → 1.1.0
rtk proxy npm.cmd run apk:producao -w @pdv/mobile -- --bump minor

# Incrementar versão principal: 1.1.0 → 2.0.0
rtk proxy npm.cmd run apk:producao -w @pdv/mobile -- --bump major
```

Usar um comando por vez. A primeira versão definitiva é1.0.0/código7, registrada em `apps/mobile/release.json`. Esse arquivo é a fonte de versão da produção; não editar app.json, package.json ou eas.json para incrementar uma release. O script atualiza versão e código juntos, com lock e substituição atômica do JSON.

Se quiser apenas incrementar antes de revisar/commitar, acrescentar `--version-only` ao comando com `--bump`. Se o build falhar depois de incrementar, a versão nova permanece: corrigir a causa e executar **sem --bump** para tentar a mesma versão novamente. Não incrementar a cada tentativa.

O APK sai em `builds/pdv-<versão>-<código>.apk`, junto do JSON público com hash, certificado, API, versão e origem. Reconstruir a mesma versão pode substituir esses dois artefatos após verificação. As substituições são atômicas individualmente, não como um par: após queda/interrupção, repetir o build e conferir o SHA256 contra o JSON antes de entregar. Nunca considerar arquivo de um build interrompido como release aprovada.

## O que o comando garante

- Seleciona perfil production, nome PDV e pacote definitivo. Recusa conflito com homologação, ferramentas de teste habilitadas e API divergente da autorizada.
- Usa HTTPS e o servidor publicado com acesso sem cobrança. O aplicativo não contém segredo SMTP, senha de banco ou chave da API Resend.
- Não carrega `.env`. A configuração pública gravada em Expo Constants contém somente perfil, API, ferramentas desligadas e código da versão.
- Refaz o bundle JavaScript com `:app:createBundleReleaseJsAndAssets --rerun`, preservando cache nativo e limitando memória/concorrência. O pacote shared e mudanças de ambiente não ficam dependentes do cache Gradle do bundle.
- Usa a chave definitiva e confere seu certificado com `apps/mobile/signing-public.json`. Recusa chave diferente, estado parcial, permissões indevidas ou ausência do backup na máquina.
- Inspeciona assinatura real, pacote, versões, ausência de debuggable, bundle/API/marcador público e ausência de arquivos ou senhas de assinatura nos assets. Não imprime senhas nem as passa nos argumentos do keytool/Gradle.
- Registra commit-base e dirty reais. Dirty=true não representa build de uma árvore limpa; para uma release comercial, fechar o commit revisado e reconstruir o candidato correspondente.

O processo não faz login nem cria conta na API durante o build. A saúde HTTPS foi consultada sem mutações. Testar o aplicativo conectado será uma ação posterior no aparelho.

## Chave de assinatura e backup

Primeira chave criada localmente por autorização do usuário: PKCS12, RSA4096, alias `pdv-release`. Certificado público SHA256:

```text
5946ef5ffcb70cd44540b440ff5525cf4ef2bc4bd54808b96581b9514d9aef99
```

Arquivos privados, **fora do repositório**:

```text
C:/Users/Ronal/.pdv-signing/prisma-pdv/production.p12
C:/Users/Ronal/.pdv-signing/prisma-pdv/credentials.json
```

O segundo arquivo contém a senha aleatória e é privado tanto quanto a chave. Não enviar pelo chat, commitar, anexar ao relatório, copiar para o APK ou armazenar publicamente. A pasta e os dois arquivos usam ACL restrita ao usuário e SYSTEM; OWNER RIGHTS é aceito somente se o proprietário corresponde ao usuário. ACEs permissivas inesperadas interrompem o build.

**Backup externo cifrado desses dois arquivos ainda depende do usuário.** Guardar a pasta em cofre ou arquivo cifrado fora deste computador e testar sua recuperação em ambiente isolado antes de distribuir a primeira release. Não foi contratado serviço nem enviado segredo externamente.

Em outro computador, restaurar os dois arquivos para a mesma pasta do usuário, proteger as permissões e instalar as ferramentas. O build confere a chave contra o certificado público registrado. Ele **não cria automaticamente outra chave** se os arquivos estiverem ausentes. Não trocar `signing-public.json` para contornar erro: recuperar a chave correta. A geração inicial foi feita uma única vez; atualizações reutilizam essa identidade.

## Ambiente e perfis nativos

Ferramentas e correções de caminhos longos: [guia Android local](build-android-local.md). JDK17, SDK37.0/build-tools37.0.0, NDK27.1, CMake3.31.6/Ninja1.12.1 e wrapper Gradle9.4.1. O comando procura a instalação `pdv-build` no AppData local; `--java-home` e `--android-home` permitem indicar caminhos explicitamente. Sem mudanças no PATH global.

O primeiro build de uma identidade pode recompilar o app nativo. A pasta Android de homologação anterior é preservada em `builds/native-cache/homologacao`; a produção mantém seu cache próprio. Apenas diretórios gerados com identidade reconhecida são movidos por renomeação dentro do workspace. Não apagar fontes, usar junctions, git clean ou limpeza recursiva para alternar perfis.

Para voltar ao fluxo antigo de PDV Teste, selecionar o cache antes de executar seu comando:

```powershell
rtk proxy python -X utf8 apps/mobile/scripts/perfil_nativo.py homologacao
```

O próximo build de produção seleciona seu perfil automaticamente. Ambos os runners usam `builds/.android-build.lock`; não executar simultaneamente. Se um processo terminar abruptamente e deixar lock, conferir o PID registrado e confirmar que não há build ativo antes de remover **somente esse arquivo**. Não remover a pasta builds ou os caches.

## Antes de liberar aos usuários

1. Conferir commit, manifesto, SHA256 e certificado. A build deve corresponder ao código revisado.
2. Instalar o candidato no aparelho e verificar cadastro/acesso liberado sem cartão, código recebido por e-mail, venda manual, caixa, offline/reinício e sincronização.
   Uma conta que existia somente na demonstração local não é automaticamente uma conta desta API. Não importar dados de demonstração como dados reais nem apagar a instalação anterior para contornar essa diferença.
3. Testar recuperação autenticada em outro aparelho, preservando os dados não sincronizados da origem. Nunca coletar OTP ou token pelo chat.
4. Na próxima versão, instalar sobre a produção anterior **sem desinstalar** e conferir dados e migrações. O pacote PDV Teste é separado e não vira automaticamente a instalação de produção.
5. Concluir backup externo da chave e do banco e testar restauração. O backup diário local da VPS, com sete cópias, não substitui essas provas.

Se existir um PDV antigo com o mesmo pacote, mas assinado com chave de debug, o Android pode recusar a substituição por assinatura diferente. Não desinstalar para contornar sem antes proteger/exportar e verificar os dados. A chave desta primeira produção permanece fixa para suas atualizações futuras.

O APK não atualiza sozinho e o deploy da API não gera APK. Distribuição direta, Play Store e CI para APK poderão usar este fluxo após revisão específica; nada disso foi publicado nesta entrega. Referências: [assinatura Android](https://developer.android.com/studio/publish/app-signing), [build local Expo](https://docs.expo.dev/guides/local-app-production/).

## Evidências desta preparação

Testes direcionados, revisão independente e manifesto do candidato são registrados em `.specs/features/build-producao/`. Instalação, scanner, SQLite/SecureStore, atualização e recuperação reais no celular permanecem pendentes até observação. Um APK assinado e uma API saudável não tornam o projeto inteiro pronto para produção.

Primeiro candidato: `builds/pdv-1.0.0-7.apk`, 52.299.100bytes, SHA256 `8a88b69766d782495b3e4cea6f59caa462476b422d797cc6bc74e2d34f7a91a2`. A preparação nativa inicial levou9m13s, mas não foi entregue porque houve ajustes de fonte durante a revisão; a passagem estabilizada levou1m18s e passou pela inspeção. Metadados e origem reais, inclusive dirty=true, em `.specs/features/build-producao/artefato.json`. O resultado físico e o recebimento de OTP desta VPS ainda não foram observados neste APK.

Após o commit3c1a730 dos scripts/assinatura, o mesmo comando foi executado novamente, sem --bump: completou em54s, substituiu os artefatos após inspeção e manteve versão1.0.0/código7, certificado e SHA256 idênticos. O manifesto final registra base3c1a730 e dirty=true; alterações preexistentes de README/teste de cupom e os documentos pendentes não foram incluídos ou revertidos para forçar uma árvore limpa. Commits deste fluxo:66e3789 (perfil/versões),3c1a730 (assinatura/runner) e documentação final do checkpoint.
