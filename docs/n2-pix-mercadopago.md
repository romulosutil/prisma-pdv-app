# N2: Pix do Mercado Pago (servidor)

Versão de 18/11/2026 (America/Sao_Paulo). Só o servidor (`apps/api`) e o contrato (`packages/shared`). Telas do app ficam para depois da integração do pacote de design. Base: [pesquisa de pagamentos](pesquisa-pagamentos.md) e a sessão N2 de [prompts-sessoes-entrega.md](prompts-sessoes-entrega.md).

| Situação | Evidência |
|---|---|
| Construído | Rotas, máquina de estados, webhook, conciliação, sync, migração `0013_light_annihilus.sql`. |
| Validado localmente | Testes automatizados com o provedor simulado (PGlite; o CI repete em PostgreSQL). |
| Validado externamente | **Não.** Falta rodar `scripts/homologar-mercadopago-pix.mts` com a conta de teste do Mercado Pago. |
| Aprovado pelo usuário | **Não.** |

## Decisões

1. **Credencial do próprio lojista** (Access Token da aplicação dele no Mercado Pago), sem OAuth e sem parceria. O dono cola o token e, de preferência, a assinatura secreta do webhook. Os dois ficam cifrados (AES-256-GCM, chave `PDV_PAGAMENTOS_CHAVE`, AAD com loja, conexão e campo). Nenhuma rota os devolve e nenhum log os registra.
2. **Confirmação só pela consulta** `GET /v1/orders/{id}` com o token do lojista. O corpo do webhook nunca confirma nada e nada é casado por valor. Paga = `status: processed` + `status_detail: accredited` + mesma order + `external_reference` igual ao id do pagamento + `total_paid_amount` igual ao valor (centavos exatos) + `total_amount` igual ao valor.
3. **Uma cobrança por pagamento da venda.** O id da cobrança é o `pagamentoId` gerado no aparelho; `external_reference` = esse UUID (36 caracteres; o limite documentado é 64). `X-Idempotency-Key` = `pdv-pix-<pagamentoId>` (44 caracteres), sempre com o mesmo corpo, guardado na cobrança.
4. **Vencimento** `PT30M` no pagamento (mínimo documentado), sem `expiration_time` no nível da order.
5. **`payer.email`**: vem de `PDV_MP_PAYER_EMAIL`. Sem ele, a cobrança responde 503 `pagador_nao_configurado` em vez de inventar um endereço. **Pendente de decisão do usuário** (qual e-mail usar; o PDV não coleta o do cliente). O script de homologação usa o e-mail de exemplo da documentação, `test_payer@example.com`, só na conta de teste.
6. **Sem janela de `ts` no webhook.** A documentação não define tolerância e o Mercado Pago reenvia a cada 15 minutos; um aviso válido repetido só dispara uma consulta idempotente.
7. **Desconectar apaga a credencial** e mantém cobranças e eventos. Toda consulta, cancelamento e aviso usa a conexão **ativa da loja** (não a que criou a cobrança): enquanto a loja está desconectada, a cobrança fica pendente sem chamar o provedor; ao reconectar (nova URL de webhook), consulta, conciliação e avisos voltam a confirmá-la. É seguro porque a confirmação exige a mesma order e a mesma `external_reference`. Se o lojista reconectar com outra conta do Mercado Pago, as orders antigas respondem 404 e ficam pendentes até o fim da janela.

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
| `GET /pagamentos/mercadopago/conexao` | dono | `{ conectada, webhookPath, temSegredoWebhook, conectadaEm, atualizadaEm }` |
| `PUT /pagamentos/mercadopago/conexao` | dono | `{ accessToken, segredoWebhook? }`. Confere o token com `GET /users/me` (só a recusa 401/403 bloqueia). 201 na primeira vez; 200 na troca, mantendo a URL do webhook. |
| `DELETE /pagamentos/mercadopago/conexao` | dono | Desliga e apaga a credencial. 204. |
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
- `MP_TESTE_ACCESS_TOKEN` — só para o script de homologação, na máquina de quem roda.

## Passo a passo do lojista (webhook)

1. No painel do Mercado Pago, em **Suas integrações**, abrir a aplicação (Checkout API) e copiar o **Access Token** (de teste ou de produção).
2. No PDV (tela a construir depois do pacote de design), o dono cola o token. A API devolve o `webhookPath`.
3. Em **Configurar notificações / Webhooks**, escolher o modo (Teste ou Produção), colar `https://<endereço da API>` + `webhookPath`, marcar o evento **Order (Mercado Pago)** e salvar.
4. Revelar a **assinatura secreta** gerada e colá-la no PDV (`segredoWebhook`). Sem ela os avisos são recusados e a confirmação depende só da consulta do app e da conciliação.
5. Opcional: usar **Simular notificação** com o id de uma order real; uma order desconhecida recebe 200 sem efeito.
6. A conta precisa ter chave Pix cadastrada para receber Pix.

## Simulado e pendente

- **Simulado (testes automatizados, sem rede):** reconexão sem cobrança órfã, recuo e parada da conciliação, limite por loja, 429 por loja, evento único para falhas repetidas, alerta preservado em corrida, rajada de avisos, conexões simultâneas, corrida entre webhook/consulta/conciliação/cancelamento, criação idempotente, falha 5xx e timeout com a order criada, isolamento entre lojas, conexão só do dono, credencial cifrada, webhook válido/inválido/ausente/sem segredo, avisos duplicados e fora de ordem, valor a mais e a menos, pagamento tardio após expiração e após cancelamento, cancelar order já paga, conciliação sem webhook e com 429, limite de 3 s na consulta, sync aceito e recusado, Pix manual inalterado, HMAC.
- **Pendente de validação externa (NÃO VERIFICADO):**
  - fluxo real com a conta de teste: rodar `node --import tsx scripts/homologar-mercadopago-pix.mts` com `MP_TESTE_ACCESS_TOKEN`; evidência em `builds/n2-mercadopago-pix-homologacao.json`;
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
