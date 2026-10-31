# Checkpoint do APK Android

Checkpoint entregue em31/10/2026, após compilação e inspeção iniciadas em30/10/2026. Aguardando o teste físico do usuário; não iniciar outra fase automaticamente.

## Versão e alcance

Aplicativo **PDV Teste**, pacote `br.com.pdv.homologacao`, versão `0.1.4`. Identidade separada do aplicativo anterior `br.com.pdv.mobile`: a instalação anterior não é o destino desta build e seus dados não são importados automaticamente. APK ARM64 para Android de 64 bits, Android 7/API24 ou superior, confirmado no manifesto compilado.

Modo local/offline confirmado com o usuário enquanto a VPS ainda não tem API HTTPS. Ferramentas e cartões de teste estão habilitados, sem envio de e-mail nem cobrança real. Dados desta demonstração ficam neste aplicativo. Recuperação em outro aparelho, sincronização com a VPS e Resend não são exercitados por este APK.

O build usa a variante release com bundle embutido e chave de debug do template, exclusivamente para homologação. Não é artefato assinado para distribuição comercial. Minificação permanece desabilitada conforme a configuração existente de proteção do scanner. O aviso preexistente do Expo sobre ausência de `expo-system-ui` está registrado; aparência das barras/tema do sistema precisa de observação no celular.

## Instalação e teste em 10–15 minutos

1. Copiar `builds/pdv-teste-5.apk` para o celular e abrir o instalador do Android. Conferir o nome **PDV Teste**. Manter o aplicativo anterior instalado; não desinstalar nem limpar seus dados para este teste.
2. Criar uma conta fictícia nesta demonstração. Se aparecer cartão no onboarding, usar o botão **Usar** do cartão de teste aprovado `4242`; não informar cartão real. O teste da assinatura aqui é simulado.
3. Criar um produto de R$25 e abrir caixa com zero de troco. Desligar Wi-Fi e dados móveis para os passos seguintes.
4. Iniciar a venda desse produto, escolher dividir pagamento e registrar R$10 em dinheiro. Conferir recebido R$10 e saldo R$15.
5. Fechar completamente o app, inclusive removendo-o da lista de recentes. Abrir novamente e retomar a venda. Conferir produto, total R$25, parcela R$10 e saldo R$15. Esse teste de fechamento manual não equivale a injetar falha em cada escrita.
6. Concluir os R$15 por cartão manual ou Pix estático fictício, sem realizar transação bancária. Conferir uma única venda no histórico e recibo R$25. Fechar/abrir mais uma vez e verificar que não duplicou.
7. Conferir caixa esperado R$10 se o restante foi por cartão/Pix. Fechar contando R$10 e verificar o fechamento depois de reabrir o app.
8. Cadastrar um produto com o código de barras de uma embalagem física. Abrir o leitor, permitir câmera e ler a embalagem pelo menos cinco vezes, afastando-a entre leituras. Conferir produto correto, uma inclusão por leitura e que o scanner não depende do botão de simulação. Digitar código ou usar **Simular bip** não comprova a câmera.
9. Criar outro rascunho R$25/parcela R$10, fechar o app e instalar `builds/pdv-teste-6.apk` sobre **PDV Teste**, sem desinstalar. Conferir conta, produto, venda, fechamento e rascunho R$10/R$15. Os dois APKs usam o mesmo certificado e códigos5/6, verificados. A preservação efetiva ainda precisa do celular; este teste não demonstra migração do pacote antigo nem recuperação por backup do Android.

## O que registrar

Modelo do celular, versão Android, APK utilizado e resultado de cada passo. Em falha, registrar a ação e a mensagem apresentada; não enviar OTP, tokens, chave de API, números de cartão reais ou dados de clientes. A integridade de SecureStore/backup exige inspeção própria; o simples fato de abrir o app não comprova ausência de segredos nos logs.

| Critério físico | Estado |
| --- | --- |
| Instalação e abertura sem Metro | Pendente no celular |
| Parcela R$10/saldo R$15 após fechar e reabrir | Pendente no celular |
| Conclusão única e caixa | Pendente no celular |
| Scanner com câmera real | Pendente no celular |
| Atualização preservando dados | Pendente no celular |
| SecureStore, logs e backup nativos | Pendente |
| Recuperação e sync conectados | Bloqueados até API HTTPS e nova rodada |

## Reprodução local

Guia permanente, incluindo instalação, versões e prevenção das falhas encontradas: [build Android local](build-android-local.md).

Ferramentas oficiais instaladas em `C:/Users/Ronal/AppData/Local/pdv-build`, sem alterar PATH global. JDK17 Microsoft e Android command-line tools foram conferidos com SHA256 oficial. SDK API37.0, build-tools37.0.0, NDK27.1.12297006 e CMake3.31.6/Ninja1.12.1. A primeira tentativa com CMake3.22.1 falhou ao criar caminhos C++ longos no Windows; a nova tentativa usa ferramentas atualizadas, mantendo o cache e o código do produto. Compilação local conforme [guia do Expo](https://docs.expo.dev/guides/local-app-production/); compatibilidade de API37.0 documentada pelo [Android](https://developer.android.com/studio/releases).

Na raiz do repositório:

```powershell
rtk proxy python -X utf8 apps/mobile/scripts/build-apk-local.py --offline --java-home C:/Users/Ronal/AppData/Local/pdv-build/jdk/jdk-17.0.21.0.2+1 --android-home C:/Users/Ronal/AppData/Local/pdv-build/android-sdk
```

O script não carrega arquivos `.env`, não instala dependências, limita Gradle a um worker e verifica alterações nos arquivos selecionados de mobile/shared durante a compilação. Esses fingerprints excluem dependências e Android gerado; não são um hash integral de todas as entradas nem prova de build bit a bit reproduzível. APK e JSON de metadados ficam em `builds/`, ignorado pelo Git.

O bundle JavaScript é refeito a cada execução pelo `--rerun` da tarefa específica, preservando o cache nativo. A atualização inicial mostrou `createBundleReleaseJsAndAssets UP-TO-DATE`; a tarefa React Native não declara as variáveis EXPO_PUBLIC nem todos os fontes externos como entradas. Forçar só o bundle evita reutilizar configuração anterior ao trocar o backend. A opção é documentada nas [notas oficiais do Gradle](https://docs.gradle.org/7.6/release-notes.html).

## Evidências do artefato

| Arquivo | Uso | SHA256 |
| --- | --- | --- |
| builds/pdv-teste-5.apk | Instalação inicial, código5 | c852363caa12dfd0d572d3127fb5083c0d47efd34ef7defad0a092b30b3b073f |
| builds/pdv-teste-6.apk | Atualizar sem desinstalar, código6 | 173052b1c40c6dc2cf627c1cddeaa21374416bd9f801be6201cd82ef3be69506 |

Ambos têm52.310.792bytes, versão0.1.4, identidade/arquitetura/permissões verificadas e o mesmo certificado de teste. Manifesto público com hashes, origem e fingerprints: `.specs/features/checkpoint-apk/artefatos.json`. Inspeções completas e JSONs ficam ao lado dos APKs em builds/. Commits locais desta entrega até a preparação: de8fc6f (fixture/revisão recuperação) e2f8bff8 (configuração/ferramenta APK); correção de cache e checkpoint final seguem no commit de encerramento deste lote.

A execução final da atualização completou em57s com `:app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease`; o log confirma que o bundle executou, sem UP-TO-DATE nessa tarefa. O APK6 manteve o mesmo hash, pois o modo offline e o código do app não mudaram. Seu JSON registra base2f8bff8 e dirty=true, incluindo o ajuste do script ainda na árvore; não afirmar proveniência de árvore limpa. A integração HTTP/SaaS não foi testada por isso.

APK inicial: builds/pdv-teste-5.apk, 52.310.792 bytes, SHA256 c852363caa12dfd0d572d3127fb5083c0d47efd34ef7defad0a092b30b3b073f. Assinatura v2 verificada; certificado de teste SHA256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c. Manifesto: pacote br.com.pdv.homologacao, código5, versão0.1.4, mínimo24/alvo36, somente ARM64, não debuggable. Bundle assets/index.android.bundle e classes SQLiteModule/SecureStoreModule/CameraViewModule presentes; sem arquivo.env/keystore no ZIP e sem permissões de microfone/sobreposição/serviço em primeiro plano. Essa inspeção não comprova execução física.

O JSON do APK5 registra commit-base de8fc6f e dirty=true: as ferramentas e configurações ainda estavam na árvore de trabalho, depois incorporadas no commit2f8bff8. Não apresentar o APK5 como build de uma árvore limpa desse commit posterior. Fingerprints delimitados e comparação com a atualização serão registrados no manifesto de evidências. Assinatura com chave debug não autentica identidade comercial nem origem integral do build.

Gates desta entrega:33/33API PGlite,56/56mobile recuperação,4/4configuração,4/4Python; revisão independente repetiu33+3 e4+4 e detectou mutações de revogação e de URL HTTP em memória, sem alterações nas fontes. TiposAPI/mobile/shared pelo npm run typecheck passaram usando o TypeScript declarado em cada workspace. A execução direta de TypeScript5.9 transitivo da raiz usada pelo executor não é o gate mobile6.0.3 e gerou incompatibilidades de URL; nenhuma fonte foi alterada para acomodá-la. Não houve regressão completa nesta entrega.

Nenhum aceite de produção foi concedido.
