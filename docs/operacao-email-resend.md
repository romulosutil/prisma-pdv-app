# Códigos de acesso pelo Resend

Decisão de 30/10/2026: usar Resend via SMTP para o acesso por código. O usuário informou que criou a conta e possui uma API key. A troca para senha foi suspensa antes de qualquer alteração de código. Não foi instalada infraestrutura de correio na VPS.

Estado: **configuração preparada; entrega externa não homologada**. O SMTP existente em `apps/api/src/email/smtp.ts` suporta TLS direto e autenticação. Não requer SDK Resend, migração ou alteração no app. Nenhuma credencial foi recebida, gravada ou testada nesta entrega.

Atualização posterior: nova captura do usuário mostra `prumo.services` **Verified**, com Forge Enabled. Arquivo local ignorado `apps/api/.env.resend.local` preparado com remetente, banco e SMTP corretos, uma chave de cifra aleatória de32bytes embase64 e marcador inicial para a API key em `SMTP_PASSWORD`. O usuário preencherá a chave diretamente no arquivo; não ler/imprimir seu conteúdo ao retomar. Nenhuma API key Resend foi recebida pelo chat, e o servidor de homologação não foi iniciado nesta atualização. O próximo passo continua sendo teste com destinatário autorizado, sem alegar entrega apenas pelo status Verified.

Atualização: usuário informou o domínio `prumo.services` e mostrou o painel Resend com status **Pending**, região São Paulo e Resend Forge desabilitado. Remetente inicial adotado: `acesso@prumo.services`, sujeito à verificação do domínio e teste externo. Em consulta pública pelo resolvedor1.1.1.1, `resend._domainkey.prumo.services` já retornou TXT DKIM; isso não valida a chave completa esperada pelo painel nem substitui seu status Verified. `send.prumo.services` retornou CNAME para `send.forge.rmta.net`, com SPF/MX no destino; comparar com os registros exatos de Enable Sending do domínio no painel antes de propor qualquer alteração, pois a captura não mostra essa seção. Nenhum DNS foi alterado.

## Dados que faltam

- Domínio ou subdomínio próprio adicionado e verificado em Domains no Resend.
- Endereço remetente nesse domínio, por exemplo `acesso@conta.seudominio.com.br`.
- API key com permissão de envio para o domínio escolhido, fornecida exclusivamente ao ambiente secreto da API.
- Destinatário de teste autorizado e ambiente isolado para homologação.

Adicionar exatamente os registros DNS apresentados pelo Resend para o domínio/subdomínio escolhido. Não substituir registros de e-mail existentes por exemplos genéricos. Desabilitar rastreamento de abertura e cliques para os códigos de acesso. O serviço envia mensagens; não é necessário configurar caixas de entrada dos usuários no Resend.

## Configuração preparada

Configurar estas variáveis somente no processo da API, por meio do gerenciador de segredos do ambiente. Os valores entre `<...>` abaixo são marcadores e não podem ser usados literalmente.

```dotenv
EMAIL_CODIGO_MODE=smtp
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_MODE=tls
SMTP_USER=resend
SMTP_PASSWORD=<API_KEY_RESEND>
SMTP_FROM=acesso@prumo.services
EMAIL_CODIGO_KEY_ID=resend-v1
EMAIL_CODIGO_KEYS={"resend-v1":"<CHAVE_ALEATORIA_BASE64_DE_32_BYTES>"}
```

`SMTP_PASSWORD` recebe a API key Resend. A chave em `EMAIL_CODIGO_KEYS` é outro segredo: 32 bytes aleatórios codificados em base64 para cifrar a fila local. Não reutilizar a API key como chave de cifra. Preservar essa chave entre reinícios; não gerar uma nova a cada inicialização. Se já houver entregas pendentes, seguir a rotação/drenagem de [operação do e-mail](operacao-email-codigo.md) antes de trocar chave ou domínio.

Não enviar segredos pelo chat, versionar arquivos com valores reais, colocá-los no aplicativo ou usar prefixo `EXPO_PUBLIC_`. O processo lê `process.env`; criar um arquivo `.env` isoladamente não faz o bootstrap carregá-lo. Injetar as variáveis pelo ambiente do serviço ou por um carregador explicitamente configurado. Não imprimir a configuração completa para diagnóstico.

O worker deve estar ativo: **`JOBS=off` também desliga o envio de códigos**. O bootstrap atual usa essa opção para os jobs de e-mail e de cobrança. Habilitar jobs em um ambiente compartilhado requer revisar ambos; não alterar um serviço em produção para realizar este teste.

O launcher `apps/api/scripts/checkpoint-sync.ts` e a demonstração em8087 continuam usando código de desenvolvimento e não executam o envio de e-mail. Não representam teste Resend. Preparar o ambiente de homologação separado antes de enviar mensagens reais.

Mesmo com SMTP configurado, `NODE_ENV=production` permanece bloqueado pelo billing mock. Não contornar essa proteção nem tratar a configuração Resend como liberação da aplicação.

## Checkpoint de homologação

### Preparação local enquanto o DNS verifica

O launcher `apps/api/scripts/checkpoint-email.ts` prepara um ambiente exclusivamente local, separado da demo financeira. Ele usa relógio real e agenda somente e-mail, com billing mock declarado como fixture, sem fontes externas de catálogo e sem rotas `/dev`. Não altera `iniciarApi.ts` nem a proteção de produção.

Para a futura execução, criar um banco local dedicado **`pdv_homologacao_email`**, separado de `pdv_checkpoint_sync` e `pdv_test`. O launcher exige URL PostgreSQL com host `localhost` ou `127.0.0.1`, nome exato e sem query/hash. Migrações existentes são aplicadas ao abrir esse banco. A API escuta somente `127.0.0.1:3339`.

Além das variáveis SMTP acima, configurar:

```dotenv
NODE_ENV=development
HOMOLOGACAO_EMAIL_CONFIRMAR=sim
DATABASE_URL=<URL_POSTGRES_LOCAL_DO_BANCO_pdv_homologacao_email>
```

Só definir a confirmação de envio depois de conferir o domínio Verified, o destinatário autorizado e a credencial. O código não consulta o status do domínio pela API Resend; essa verificação é um requisito operacional. O launcher local não usa `JOBS` e inicia somente seu próprio worker de e-mail. A opção `JOBS` descrita acima continua se aplicando ao bootstrap normal.

As variáveis podem ser injetadas pelo ambiente do processo. Para uso local com Node24, também é possível salvar os valores reais em **`apps/api/.env.resend.local`**, ignorado pelo Git, e executar a partir de `apps/api`:

```powershell
rtk proxy node --env-file=.env.resend.local --import tsx scripts/checkpoint-email.ts
```

Esse arquivo é preenchido pelo usuário localmente, sem enviar a chave pelo chat. Não há arquivo real com segredos nesta entrega. Preservar a chave de cifra entre reinícios e restringir acesso ao arquivo. O comando falha antes de abrir banco/transporte quando falta a confirmação ou a configuração é inválida.

O app para homologação deve usar outra origem, por exemplo8088, com `EXPO_PUBLIC_API_URL=http://127.0.0.1:3339` e ferramentas de teste desativadas. Não reconfigurar8087 nem reutilizar sua conta fictícia `.invalid` como destinatário. Sem API key/domínio verificado, não iniciar esse ambiente com credenciais fictícias para simular sucesso.

### Jornada externa, ainda pendente

1. Conferir o domínio verificado e o remetente no painel, sem registrar a API key.
2. Configurar o ambiente isolado com banco de homologação, relógio correto e worker ativo. Preservar o ambiente de demonstração e seus dados.
3. Solicitar um código de uma conta de teste existente em `POST /auth/codigo`. A resposta SMTP deve ser204 e não conter o código.
4. Acompanhar a fila pelos metadados sanitizados e a mensagem no painel Resend. Aceitação SMTP comprova apenas que o provedor aceitou o envio.
5. Conferir a chegada ao destinatário autorizado, inclusive pasta de spam, e usar o código na tela de entrada do app. Registrar apenas horários/resultado, sem código, tokens ou corpo da mensagem.
6. Conferir uso único, expiração em dez minutos, limites de tentativas e recuperação de acesso/aparelho. Confirmar que reenvio invalida o código anterior e que uma mensagem atrasada não renova sua validade.
7. Em ambiente isolado, verificar falha temporária e retomada do worker sem perder a fila. Uma resposta perdida pode resultar em mensagens repetidas com o mesmo código/Message-ID; não prometer entrega única pelo provedor.
8. Registrar versão/commit, ambiente, remetente, destino autorizado, resultado e pendências. Só marcar P0-03-A/AC relacionado depois das verificações externas correspondentes; a homologação Android continua separada.

Acompanhar os limites do plano na conta Resend. Cota ou rate limit esgotados podem impedir ou atrasar a entrega além da validade do código. Não fazer upgrade ou habilitar cobrança automática nesta etapa.

## Fontes

- [SMTP Resend](https://resend.com/docs/send-with-smtp): host, usuário, API key como senha e TLS na porta465.
- [Domínios verificados](https://resend.com/docs/dashboard/domains/introduction): domínio próprio, subdomínios e rastreamento.
- [Operação da fila, chaves e retentativas](operacao-email-codigo.md).

Essas fontes foram conferidas em30/10/2026. Credenciais, domínio, destinatário e envio externo permanecem pendentes; a existência de uma API key informada pelo usuário não comprova permissão, verificação do domínio ou entrega.

## Evidências locais desta preparação

### Primeiro envio externo — recebimento e login confirmados

Seguimento de recuperação: usuário autorizou validar cenários e preparar B. Testes SMTP/PG locais aprovaram erros, bloqueio, prazo, reuso, recusa e retomada (incluindo recriação de instância de API), sem falhar deliberadamente o serviço Resend. EmB, origem independente `http://[::1]:8088/entrar`, foi solicitado um novo código ao mesmo destinatário autorizado, via tela do app. Não coletar OTP no chat. Recebimento deste código e recuperação consentida ainda aguardam usuário; ver roteiro-recuperacao-aparelho.md. A mantém rascunho de25 com10recebidos/15pendentes e dados confirmados no servidor.

Metadados desse envio: entrega `d0fe9008-ddca-48d4-adcc-d02f40b28f53`, aceita na tentativa1, solicitada30/10/2026 às23:02:32 (São Paulo), com validade original de dez minutos. Isso não comprova recebimento ou substituição. Ambiente retomado após incidente documentado e recuperação do arquivo pelo próprio usuário; a aceitaçãoSMTP comprova que a configuração recuperada foi usada, sem exibir a chave.

Após o usuário preencher a API key diretamente no arquivo local ignorado, o parser confirmou configuração válida sem exibir valores. Captura fornecida pelo usuário comprovou domínio Verified. Em30/10/2026, API local de homologação3339 iniciada com chave real (sessão24765) e app separado8088 (sessão13001), com destinatário Gmail autorizado explicitamente na conversa. Conta/loja fictícias criadas pelo onboarding, assinatura e cartão apenas fixtures locais, sem cobrança real. A demonstração8087 foi preservada.

Pelo app8088, a sessão foi encerrada e um único código solicitado na tela de entrada. A fila registrou entrega `ea79ddb5-8bbd-418a-9e4f-a26eb376fe8d` como **aceita**, tentativa1, sem motivo de falha. Isso comprova aceitação SMTP pelo Resend com a credencial configurada; não comprova chegada à caixa de entrada. Nenhum OTP, token de sessão ou API key foi lido/exibido.

O usuário confirmou “Testei, deu certo” após receber e digitar o código no próprio app. Consulta de metadados no servidor confirmou o código consumido em30/10/2026 às22:37:09 (America/Sao_Paulo) e uma nova sessão ativa criada após a solicitação. Não foi necessário ler código, token, chave ou caixa postal. O caminho real **app → API → fila → Resend → Gmail → login** tem confirmação humana e evidência do servidor; a tela voltou ao início em8088.

A chave de cifra deve continuar preservada; não imprimir o arquivo de ambiente ao retomar. Não marcar P0-03-A/AC global como concluído: faltam os demais cenários externos, inclusive falha/retentativa e recuperação de aparelho, além de Android. O primeiro login não comprova sozinho reuso bloqueado, expiração e bloqueio por erros no serviço externo. A versão Expo de desenvolvimento mantém avisos/ferramentas locais, não é artefato de produção homologado.

- `rtk proxy npm.cmd run test -w @pdv/api -- --maxWorkers=1 test/emailConfiguracaoEntrega.test.ts test/emailSmtp.test.ts`: **69 testes, dois arquivos PASS** em30/10/2026. Incluem validação da configuração, autenticação/TLS em servidor local e falhas de transporte. Nenhum envio a serviço externo.
- Parser `lerConfiguracaoEntregaCodigo` aceitou host `smtp.resend.com`, porta465, modoTLS, usuário `resend` e ring `resend-v1`, com segredos fictícios e sem abrir rede. Isso não comprova autenticação ou entrega pelo Resend.
- Nenhuma alteração de runtime, dependência, migração ou teste. A demonstração8087 não foi reconfigurada. Não há nova homologação Android ou de billing.
- Revisão independente `revisao_resend_config`: **PASS**, confrontando roteiro com SMTP/parser/bootstrap/OTP e fonte oficial. Terra Médio solicitado; a ferramenta não expõe confirmação do modelo efetivo. Revisão documental, sem sensor de mutação porque não houve mudança de comportamento, nem alegação de entrega real.
- Evolução4A, código79fe157:126/7 direcionados e40/4 PostgreSQL/SMTP local PASS, tiposAPI PASS. Smoke da composição real com banco novo vazio: saúde200, rotas `/dev`404, worker sem mensagens, nenhum envioResend. Revisão nova `revisor_fase4a_email`:30/30 e sensor6/6 comportamentais, PASS local após correção documental. Detalhes em `.specs/features/fase-4a-email-local/validation.md`. RegressãoAPI completa permanece sem aprovação por OOM/workers do Windows; não inferir seu resultado dos alvos verdes.
