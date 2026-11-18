# N2: Pix do Mercado Pago (servidor)

Versão de 18/11/2026 (America/Sao_Paulo). Só o servidor (`apps/api`) e o contrato (`packages/shared`). Telas do app ficam para depois da integração do pacote de design. Base: [pesquisa de pagamentos](pesquisa-pagamentos.md) e a sessão N2 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md).

| Situação | Evidência |
|---|---|
| Construído | Rotas, máquina de estados, webhook, conciliação, sync, OAuth com PKCE e renovação; migrações `0013_light_annihilus.sql` e `0014_productive_elektra.sql`. |
| Validado localmente | Testes automatizados com o provedor simulado (PGlite; o CI repete em PostgreSQL). |
| Validado externamente | **Não.** Falta rodar `scripts/homologar-mercadopago-pix.mts` com a conta de teste do Mercado Pago (modo OAuth e modo token). |
| Aprovado pelo usuário | **Não.** |

## Decisões

1. **OAuth é o caminho do lojista** (decisão do usuário, 18/11/2026): o dono toca em "Conectar Mercado Pago", entra na própria conta do Mercado Pago e autoriza a **aplicação da plataforma**. Nenhum lojista cria aplicação de desenvolvedor. O **modo token** (colar o Access Token da própria aplicação) continua como opção avançada e é o caminho da homologação em sandbox. Tokens, refresh tokens, segredos e o `code_verifier` ficam cifrados (AES-256-GCM, chave `PDV_PAGAMENTOS_CHAVE`, AAD com loja, registro e campo). Nenhuma rota, página ou log os contém.
2. **Confirmação só pela consulta** `GET /v1/orders/{id}` com o token do lojista. O corpo do webhook nunca confirma nada e nada é casado por valor. Paga = `status: processed` + `status_detail: accredited` + mesma order + `external_reference` igual ao id do pagamento + `total_paid_amount` igual ao valor (centavos exatos) + `total_amount` igual ao valor.
3. **Uma cobrança por pagamento da venda.** O id da cobrança é o `pagamentoId` gerado no aparelho; `external_reference` = esse UUID (36 caracteres; o limite documentado é 64). `X-Idempotency-Key` = `pdv-pix-<pagamentoId>` (44 caracteres), sempre com o mesmo corpo, guardado na cobrança.
4. **Vencimento** `PT30M` no pagamento (mínimo documentado), sem `expiration_time` no nível da order.
5. **`payer.email`**: vem de `PDV_MP_PAYER_EMAIL`. Sem ele, a cobrança responde 503 `pagador_nao_configurado` em vez de inventar um endereço. **Pendente de decisão do usuário** (qual e-mail usar; o PDV não coleta o do cliente). O script de homologação usa o e-mail de exemplo da documentação, `test_payer@example.com`, só na conta de teste.
6. **Sem janela de `ts` no webhook.** A documentação não define tolerância e o Mercado Pago reenvia a cada 15 minutos; um aviso válido repetido só dispara uma consulta idempotente.
7. **Desconectar apaga a credencial** e mantém cobranças e eventos. Toda consulta, cancelamento e aviso usa a conexão **ativa da loja** (não a que criou a cobrança): enquanto a loja está desconectada, a cobrança fica pendente sem chamar o provedor; ao reconectar (nova URL de webhook), consulta, conciliação e avisos voltam a confirmá-la. É seguro porque a confirmação exige a mesma order e a mesma `external_reference`. Se o lojista reconectar com outra conta do Mercado Pago, as orders antigas respondem 404 e ficam pendentes até o fim da janela.

## OAuth (aplicação da plataforma)

**Fluxo:**
1. `POST /pagamentos/mercadopago/oauth/inicio` (só o dono) cria um `state` aleatório de 32 bytes (só o hash SHA-256 é gravado), ligado à loja, ao dono e a 10 minutos de validade, e um `code_verifier` de 64 caracteres (cifrado). Um novo início invalida os `state` pendentes da loja. Devolve `{ url }`: `https://auth.mercadopago.com/authorization?client_id&response_type=code&platform_id=mp&state&redirect_uri&code_challenge&code_challenge_method=S256` (sem escopo; o Mercado Pago concede `read write offline_access`; nada é acrescentado ao `redirect_uri`).
2. O Mercado Pago redireciona para `GET /pagamentos/mercadopago/oauth/retorno?code&state` (pública). O `state` é consumido de forma atômica antes de tudo, mesmo que algo falhe depois. Falham, com a mesma página genérica: `state` ausente, desconhecido, já usado, substituído ou vencido; quem iniciou não é mais o dono ativo da loja; retorno sem `code` válido (inclusive `error=`); troca recusada.
3. Troca em `POST https://api.mercadopago.com/oauth/token` (JSON): `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier` (com PKCE) e `test_token`. Grava access token, refresh token, `expires_in` (180 dias), `user_id` e `live_mode` na conexão da loja (`modo = oauth`). Se a loja já tinha conexão (token ou OAuth), a mesma linha é trocada, então as cobranças pendentes continuam confirmando, e as que vinham falhando voltam à fila na hora.
4. A página de retorno é HTML mínimo em português, sem recursos externos, sem token, `state`, `code` nem ids, com `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e CSP `default-src 'none'`. Nada da query é refletido. A linha de acesso dessa rota não vai para o log (ela teria `code` e `state`).

**Renovação:** o refresh token gira a cada uso.
- O job (a cada hora, com `JOBS` ligado) renova quem vence em até 30 dias e apaga `state` com mais de 1 dia. O token vencido é renovado antes do uso.
- Só um **401** provoca uma renovação e uma nova tentativa, e nunca se o token foi renovado há menos de 5 min (evita girar o refresh em laço). Um **403** (`acesso_negado`) nunca renova: segue o recuo normal de falha da cobrança.
- Uma renovação por vez por conexão (trava curta); quem chega durante a renovação espera e usa o token novo. Toda gravação exige a mesma `versao_token` e a conexão ativa; desconectar e trocar a credencial incrementam a versão, então uma renovação em curso nunca grava tokens numa conexão desligada nem sobrescreve um refresh token mais novo.
- Falha passageira da renovação com o token ainda válido: o token atual continua em uso. A conexão recua (5 min, 10 min… até 12 h) e não ocupa a vez das outras no job.
- Renovação sem resposta gravada (timeout, queda do processo com a trava vencida): fica registrada (`refresh_sem_resposta_em`). Se a próxima renovação receber `invalid_grant`, o motivo gravado é `refresh_girado_sem_resposta` (o Mercado Pago pode ter girado o refresh sem que a resposta chegasse); senão, `refresh_recusado`. Por isso a antecedência de 30 dias continua: sobra tempo para pedir nova autorização antes do vencimento.
- `invalid_grant` na renovação: a conexão fica `reautorizacaoNecessaria: true` no `GET /pagamentos/mercadopago/conexao`. Cobranças pendentes não mudam de estado e não há novas chamadas ao provedor; criar cobrança responde 409 `mercadopago_reautorizar`. Ao autorizar de novo, tudo volta à fila.
- Não existe endpoint de revogação para integradores. O vendedor pode desfazer o vínculo no Mercado Pago (troca de senha e antifraude também apagam tokens); isso aparece como `invalid_grant` na próxima renovação.

**Webhook da plataforma:** `POST /webhooks/pdv-mercadopago`, assinado com `PDV_MP_WEBHOOK_SECRET` (mesmas regras de HMAC).
- A order é procurada em todas as lojas (índice em `lower(pedido_provedor_id)`) e confirmada pelo GET com o token **atual da loja dona da cobrança**.
- O `user_id` do corpo nunca decide; se diverge do usuário da conexão, só fica registrado (`usuario_divergente_no_aviso`).
- `mp-connect` (vínculo/desvínculo, payload não documentado): a assinatura não cobre o corpo nem a query além de `data.id`, então é só uma dica. Agenda uma conferência barata (`GET /users/me`) no próximo job, uma por conexão, sem mexer no vencimento nem nos tokens; só um 401 nessa conferência leva à renovação (e o `invalid_grant`, à nova autorização). Outros tópicos: 200 sem efeito.
- A conexão OAuth não usa a URL por conexão: lá ela responde 401, porque não há segredo próprio.

**Risco aceito no MVP (fixação de sessão):** quem tem uma URL de autorização gerada para a própria loja pode enviá-la a outra pessoa; se essa pessoa autorizar, a conta do Mercado Pago dela fica ligada à loja de quem enviou. O impacto se limita a cobranças Pix dessa loja que pagam **para a conta da vítima**. Nenhum dado, token ou dinheiro da vítima fica acessível a quem enviou. O `state` de uso único, ligado à loja e ao dono, impede que uma URL conecte outra loja. Mitigação futura (com as telas): mostrar ao dono a identidade da conta conectada (nome/e-mail do Mercado Pago, obtidos com o próprio token) e pedir confirmação no app antes de ativar a conexão.

**O que o dono da plataforma configura uma vez no painel de desenvolvedor do Mercado Pago:**
1. Criar a aplicação do produto (Checkout API / pagamentos online), com credenciais de teste e de produção.
2. Cadastrar a **Redirect URL** exatamente igual a `PDV_MP_REDIRECT_URI` (`https://<API>/pagamentos/mercadopago/oauth/retorno`).
3. Escolher PKCE: se ligado no painel, o Mercado Pago passa a exigir; deixar `PDV_MP_OAUTH_PKCE` igual (padrão ligado).
4. Em **Webhooks**, cadastrar `https://<API>/webhooks/pdv-mercadopago` nos modos Teste e Produção, evento **Order (Mercado Pago)** (e, se quiser, `mp-connect`), salvar e copiar a assinatura secreta para `PDV_MP_WEBHOOK_SECRET`.
5. Guardar `client_id` e `client_secret` em `PDV_MP_CLIENT_ID` e `PDV_MP_CLIENT_SECRET` no ambiente do `pdv-api`, nunca no repositório.

## Estados da cobrança

| Estado | Significado | Pode ir para |
|---|---|---|
| `criando` | Linha gravada; chamada ao provedor em curso (trava de 30 s) | `aguardando`, `erro_provedor`, `cancelada` |
| `erro_provedor` | Criação falhou; repetir o mesmo POST tenta de novo com a mesma chave | `aguardando`, `cancelada` |
| `aguardando` | Order criada, QR disponível | `paga`, `divergente`, `expirada`, `cancelada` |
| `expirada` | Provedor informou `canceled/expired` ou `failed/expired` | `paga_tardia`, `divergente` |
| `cancelada` | Venda abandonada (cancelamento confirmado pelo provedor, ou sem order criada) | `paga_tardia`, `divergente` |
| `paga` | Confirmada; **única** que pode entrar numa venda | final |
| `paga_tardia` | Paga depois de expirada/cancelada: aparece para o dono, nunca entra em venda; estorno manual no painel do Mercado Pago | final |
| `divergente` | Paga com valor ou referência diferente: aparece para o dono, nunca entra em venda | final |

- Toda escrita usa o estado lido como condição; numa corrida, relê e decide de novo. Aviso repetido ou fora de ordem nunca faz regredir.
- Estorno ou contestação vistos depois da confirmação (`refunded`, `charged_back`, `processed/partially_refunded`) viram `alerta` para o dono, sem desfazer a venda.
- Status desconhecido mantém o estado e fica registrado em `eventos_cobranca_pagamento`.

## Rotas

| Rota | Quem | O que faz |
|---|---|---|
| `GET /pagamentos/mercadopago/conexao` | dono | `{ conectada, modo, reautorizacaoNecessaria, webhookPath, temSegredoWebhook, conectadaEm, atualizadaEm }` (`webhookPath` só no modo token) |
| `POST /pagamentos/mercadopago/oauth/inicio` | dono | `{ url }` da tela de autorização. 503 `oauth_indisponivel` sem a configuração da plataforma. |
| `GET /pagamentos/mercadopago/oauth/retorno` | público (`state`) | Conclui o OAuth e devolve a página mínima (200 conectado; 400 falha genérica). |
| `POST /webhooks/pdv-mercadopago` | público (HMAC da plataforma) | Webhook das conexões OAuth. 503 sem `PDV_MP_WEBHOOK_SECRET`. |
| `PUT /pagamentos/mercadopago/conexao` | dono | Modo token (avançado): `{ accessToken, segredoWebhook? }`. Confere o token com `GET /users/me` (só a recusa 401/403 bloqueia). 201 na primeira vez; 200 na troca, mantendo a URL do webhook. |
| `DELETE /pagamentos/mercadopago/conexao` | dono | Desliga e apaga token, refresh token e segredo. 204. |
| `POST /pagamentos/cobrancas` | `vender` | `{ vendaId, pagamentoId, valorCentavos }`. 201 nova; 200 repetida; 409 `cobranca_conflitante` com outros dados ou outra loja; 409 `mercadopago_nao_conectado`. |
| `GET /pagamentos/cobrancas/:id` | `vender`, mesma loja | Estado; consulta o provedor no máximo a cada 3 s. QR só em `aguardando`. |
| `POST /pagamentos/cobrancas/:id/cancelar` | `vender`, mesma loja | Cancela a order (`POST /v1/orders/{id}/cancel`). `cannot_cancel_order`/`order_already_canceled` levam a uma consulta: se já foi paga, devolve `paga`. Falha do provedor → 502 e a cobrança continua pendente. |
| `GET /pagamentos/cobrancas?estado=` | dono | Até 200 cobranças da loja, sem QR. |
| `POST /webhooks/pdv-mercadopago/:conexaoPublicaId` | público (HMAC) | Assinatura inválida, ausente, conexão desconhecida ou sem segredo → 401. Order desconhecida → 200 sem efeito. Válido → consulta a order e responde 200. |

Sem `PDV_PAGAMENTOS_CHAVE`, todas respondem 503 `pagamentos_indisponiveis` e a API sobe normalmente (é o caso da produção hoje).

**Sync:** um pagamento `pix` + `mercadopago` só é aceito com cobrança desta loja, `paga`, sem alerta de estorno/contestação, com o mesmo `vendaId` e valor, troco 0 e ainda não vinculada; o vínculo (`vinculadaEm`) é gravado na mesma transação da venda. Sem cobrança nesta loja → `pagamento_indisponivel` (inclusive cobrança de outra loja). Cobrança existente que não cumpre as regras → `pagamento_nao_confirmado`. Qualquer outro provedor ou Tap continua `pagamento_indisponivel`; a confirmação manual (`provedor: null`) não mudou. O app precisa esperar `paga` antes de concluir a venda.

**Conciliação:** o job roda a cada 30 s (com `JOBS` ligado e chave presente) e confere as cobranças com `proxima_consulta_em` vencida, no máximo 5 por loja e 50 por passada, as mais atrasadas primeiro.

- Agenda: `aguardando` a cada 30 s até o vencimento + 5 min de carência; `expirada`/`cancelada` antes disso, a cada 10 min; depois do vencimento, intervalo igual ao tempo decorrido desde ele (de 1 min a 1 h). Parada definitiva 24 h após o vencimento: o estado fica como está, visível ao dono na lista.
- Falhas seguidas dobram o intervalo (60 s, 120 s, 240 s… até 1 h) e respeitam o `Retry-After`. Um 429 pula só a loja que o recebeu nesta passada; erro numa cobrança não interrompe as outras; o encerramento do serviço para a passada entre duas consultas.
- Falhas, avisos e observações repetidos atualizam um único evento (`repeticoes`, `ultimaEm`) em vez de criar uma linha por passada.
- Avisos do webhook usam o mesmo limite da consulta do app (uma consulta a cada 3 s por cobrança). Avisos em rajada só contam no evento.
- Toda escrita confere o estado e o alerta lidos: um alerta de estorno nunca volta a vazio e o status do provedor gravado nunca fica mais antigo que o já visto. Cobrança `paga` com alerta não entra em venda (`pagamento_nao_confirmado`).
- Duas primeiras conexões simultâneas: a segunda vira troca de credencial (sem erro 500).

## Variáveis de ambiente (só nomes)

- `PDV_PAGAMENTOS_CHAVE` — base64 de 32 bytes. Gerar com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` e guardar só no ambiente do serviço `pdv-api`. Trocar a chave torna as credenciais gravadas ilegíveis (o dono precisa conectar de novo).
- `PDV_MP_PAYER_EMAIL` — e-mail do pagador nas orders.
- `PDV_MP_CLIENT_ID`, `PDV_MP_CLIENT_SECRET`, `PDV_MP_REDIRECT_URI` — aplicação da plataforma (OAuth). Vão juntas; nenhuma = OAuth desligado (503 `oauth_indisponivel`), só parte delas ou formato inválido impede a partida. A redirect URI precisa ser https, sem query.
- `PDV_MP_WEBHOOK_SECRET` — assinatura secreta do webhook da aplicação da plataforma.
- `PDV_MP_OAUTH_PKCE` — `true` (padrão) ou `false`, igual à opção do painel.
- `PDV_MP_OAUTH_TEST_TOKEN` — `true` gera credenciais de teste na troca do código; recusado em produção.
- `MP_TESTE_ACCESS_TOKEN`, `PDV_HOMOLOG_PORTA` — só para o script de homologação, na máquina de quem roda.

## Passo a passo do lojista no modo token (avançado)

1. No painel do Mercado Pago, em **Suas integrações**, abrir a aplicação (Checkout API) e copiar o **Access Token** (de teste ou de produção).
2. No PDV (tela a construir depois do pacote de design), o dono cola o token. A API devolve o `webhookPath`.
3. Em **Configurar notificações / Webhooks**, escolher o modo (Teste ou Produção), colar `https://<endereço da API>` + `webhookPath`, marcar o evento **Order (Mercado Pago)** e salvar.
4. Revelar a **assinatura secreta** gerada e colá-la no PDV (`segredoWebhook`). Sem ela os avisos são recusados e a confirmação depende só da consulta do app e da conciliação.
5. Opcional: usar **Simular notificação** com o id de uma order real; uma order desconhecida recebe 200 sem efeito.
6. A conta precisa ter chave Pix cadastrada para receber Pix.

## Simulado e pendente

- **Simulado (testes automatizados, sem rede):** OAuth (URL e PKCE, `state` de uso único/vencido/ausente/desconhecido/substituído, `error=`, troca recusada, dono rebaixado, isolamento de loja, PKCE desligado, tokens cifrados, página sem segredos, troca de conexão token→OAuth com pendência, renovação pelo job com refresh girado, 401 → renovação e nova tentativa, `invalid_grant` → reautorização e retomada, renovações simultâneas, desconexão durante a renovação, 403 sem renovação, 401 logo após renovar, 401 na criação com a mesma chave, falha passageira mantendo o token, refresh sem resposta, recuo do job, limpeza de `state`, `state` de outra loja, log sem `code`/`state`, webhook da plataforma com o token da loja certa, segredo errado, `mp-connect`), reconexão sem cobrança órfã, recuo e parada da conciliação, limite por loja, 429 por loja, evento único para falhas repetidas, alerta preservado em corrida, rajada de avisos, conexões simultâneas, corrida entre webhook/consulta/conciliação/cancelamento, criação idempotente, falha 5xx e timeout com a order criada, isolamento entre lojas, conexão só do dono, credencial cifrada, webhook válido/inválido/ausente/sem segredo, avisos duplicados e fora de ordem, valor a mais e a menos, pagamento tardio após expiração e após cancelamento, cancelar order já paga, conciliação sem webhook e com 429, limite de 3 s na consulta, sync aceito e recusado, Pix manual inalterado, HMAC.
- **Pendente de validação externa (NÃO VERIFICADO):**
  - fluxo real com a conta de teste: rodar `node --import tsx scripts/homologar-mercadopago-pix.mts` com `MP_TESTE_ACCESS_TOKEN` (modo token) ou com `PDV_MP_CLIENT_ID`/`SECRET`/`REDIRECT_URI` (modo OAuth, com um vendedor de teste e um túnel https até a API local, ou depois do deploy); evidência em `builds/n2-mercadopago-pix-homologacao.json`;
  - se `APRO` aprova sozinho com o token OAuth de um vendedor de teste (o script relata `tempo_esgotado` como resultado próprio);
  - se as orders criadas com o token OAuth de cada vendedor geram aviso na URL da aplicação da plataforma (a documentação sugere uma URL para vários vendedores); a conciliação cobre a falta do aviso;
  - formato do aviso `mp-connect` (não documentado) e quando o access token antigo deixa de valer após a renovação;
  - nomes exatos dos parâmetros de erro no retorno do OAuth (tratados como falha genérica);
  - se `GET /v1/orders/{id}` aceita a credencial de teste (uma nota da documentação cita `401 invalid_credentials`; o script relata esse caso como `credencial_de_teste_recusada`);
  - tempo da aprovação automática com `APRO`;
  - se `GET /users/me` responde para tokens de aplicações Orders (só a recusa 401/403 bloqueia a conexão);
  - se `total_paid_amount` sempre vem preenchido no Pix pago (sem ele a cobrança fica `aguardando` e registra `valor_pago_ausente`);
  - se o reenvio da mesma `X-Idempotency-Key` com o mesmo corpo devolve a mesma order (a documentação só cita o 409 para corpo diferente);
  - assinatura de um aviso real e do "Simular notificação" (sem vetor oficial na documentação; o teste usa HMAC calculado de forma independente);
  - Pix de produção com valor real: só com autorização do usuário.
  - Corrida real de duas primeiras conexões: o PGlite serializa as transações, então o teste local não reproduz a violação do índice; o caminho é coberto pelo classificador do erro 23505 e roda de verdade só no PostgreSQL do CI.
- **Fora deste lote:** telas (QR e conexão), estorno por API, Point, InfinitePay, alertas por e-mail.

## Documentação consultada (18/11/2026)

- Pix pela Orders API: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
- Criar order: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/create-order/post
- Obter order: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/get-order/get
- Cancelar order: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/cancel-order/post
- Status da order: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/status/order-status
- Notificações (webhook, HMAC, manifesto): https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications e https://www.mercadopago.com.mx/developers/pt/docs/checkout-api-orders/notifications.md
- Teste do Pix (`APRO`): https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/pix
- OAuth (autorização, PKCE, troca e renovação; detalhes conferidos pelo pesquisador da sessão): https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation e https://www.mercadopago.com.br/developers/pt/docs/security/oauth
