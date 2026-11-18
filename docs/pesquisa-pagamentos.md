# Pesquisa: validar pagamento no MVP (Mercado Pago, InfinitePay, Stone)

- **Data da consulta:** 17/11/2026, America/Sao_Paulo. Somente documentação pública; nenhum provedor foi contatado; nenhuma API foi chamada.
- **Regra aplicada (usuário):** o que a documentação não proíbe nem exige é tratado como permitido; sem contrato novo; só recursos de conta comum do lojista.
- **Base no repositório:** `PagamentoVendaSchema` (`packages/shared/src/contrato.ts`) tem `meio` (`dinheiro`, `pix`, `cartao_credito`, `cartao_debito`, `tap`), `provedor` (`infinitepay`, `mercadopago` ou `null`) e valor/troco. Hoje `pagamentoManualDisponivel` só libera `provedor == null`, ou seja, confirmação manual. Não há campo de identificador externo nem de estado da cobrança. Stone não existe no enum. Contexto: [CP 101](checkpoints-roadmap.md#cp-20261110-101-google-play-planos-e-integracoes-definidos), [CP 103](checkpoints-roadmap.md#cp-20261110-103-escolha-da-maquininha-pelo-lojista-decidida) e R6 do [roadmap](roadmap-app-completo.md#r6-integrar-pagamentos-reais).

## Resumo

1. **Mercado Pago:** é o único com caminho completo e sem parceria: Pix dinâmico por `POST /v1/orders`, webhook assinado (HMAC), consulta `GET /v1/orders/{id}`, estorno por API e **sandbox que aprova Pix sem dinheiro**.
2. Cada lojista autoriza o nosso app por OAuth, um fluxo padrão com token de 180 dias e renovação. A documentação não cita aprovação prévia.
3. O Point (maquininha) do Mercado Pago também entra pela mesma Orders API e tem **terminal virtual de teste**. Exige Point Smart ou Point Pro em modo PDV.
4. **InfinitePay:** o Checkout Integrado cria um link (Pix + cartão) só com o `handle` ou a API key do lojista. O webhook **não é assinado**; a confirmação vem da consulta `payment_check` no servidor.
5. A InfinitePay **não tem sandbox**: o teste exige um pagamento real a partir de R$ 1,00, e o estorno só pode ser feito no app ou na conta web.
6. O InfiniteTap (aproximação no celular) devolve o resultado **somente ao aparelho**, por deeplink. A documentação não oferece aviso nem consulta no servidor.
7. **Stone:** o Connect (maquininha) exige o programa de parceiros, homologação e Partner Hub, e não tem sandbox. A API Banking/BaaS depende de convite da equipe Stone.
8. Por isso, a Stone **não tem caminho sem parceria** e fica como confirmação manual identificada no MVP.
9. Nenhum dos três documenta aviso de **toda** transação da conta. As confirmações valem só para cobranças criadas pela nossa integração, o que mantém a regra de não casar pagamento por valor.
10. **Recomendação:** (1) Pix do Mercado Pago, (2) Checkout InfinitePay com `payment_check`, (3) Point do Mercado Pago, se houver aparelho. Stone e InfiniteTap ficam como confirmação manual ou "confirmado no aparelho".

## Quadro comparativo

| Item | Mercado Pago | InfinitePay | Stone |
|---|---|---|---|
| Cobrança Pix sem parceria | Sim, Orders API | Sim, link do Checkout (cartão sempre ligado) | Não documentado para conta comum |
| Cartão sem maquininha | Online exige tokenização própria (fora do MVP) | Mesmo link do Checkout; InfiniteTap no celular | Não |
| Maquininha por API | Point Smart/Pro (modo PDV) | Não documentado | Connect, só para parceiro |
| Credencial | OAuth por lojista (ou o token do próprio lojista) | `handle` ou API key `inchk_` do lojista | Secret key emitida no Partner Hub |
| Confirmação autenticada | Webhook HMAC + GET da order | Webhook sem assinatura + `payment_check` | Webhook `Charge.Paid` (só para parceiro) |
| Sandbox sem dinheiro | Sim (Pix com `APRO`; Point com terminal virtual) | Não | Não (Connect testa em produção) |
| Estorno por API | Sim, `POST /v1/orders/{id}/refund` | Não (app/conta web) | Não (no POS ou no portal) |
| Aprovação prévia | Não citada | Não ("self-service") | Sim (parceria + homologação) |

## Mercado Pago

**Caminho mínimo (Pix):**
- **Criar a cobrança:** `POST https://api.mercadopago.com/v1/orders` com `X-Idempotency-Key` obrigatório.
  - Campos: `total_amount`, `external_reference`, `processing_mode`, `payer.email` e `transactions.payments[]` com `payment_method {id:"pix", type:"bank_transfer"}`.
  - A resposta traz `qr_code`, `qr_code_base64` e `ticket_url`, com estado `action_required`/`waiting_transfer`.
  - O `expiration_time` do pagamento aceita de 30 minutos a 30 dias; o padrão é 24 h.
  - Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix
- **Confirmar:**
  - Webhook do tópico `order`, configurado em Suas integrações (Teste/Produção). O `x-signature` traz `ts` e `v1`.
  - A validação é um HMAC-SHA256 do manifesto `id:[data.id];request-id:[x-request-id];ts:[ts];` com a assinatura secreta do app.
  - Responder 200/201 em até 22 s; sem resposta, há nova tentativa a cada 15 min. Existe o botão "Simular notificação".
  - Depois do aviso, conferir com `GET /v1/orders/{id}`. O estado `status_detail: expired` indica expiração.
  - Fontes: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications e https://www.mercadopago.com/developers/es/docs/your-integrations/notifications/webhooks
- **Credencial:**
  - OAuth com `authorization_code`: o lojista é levado a `https://auth.mercadopago.com/authorization?client_id=…&response_type=code&platform_id=mp&state=…&redirect_uri=…`.
  - A troca é feita em `POST https://api.mercadopago.com/oauth/token`. O token vale 180 dias, o `refresh_token` renova, o PKCE é opcional e `test_token=true` gera credencial de teste.
  - O `redirect_uri` precisa ser fixo e cadastrado no app. Para vários vendedores, a doc sugere `?client=` na URL do webhook.
  - Fontes: https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation e https://www.mercadopago.com.br/developers/pt/docs/security/oauth
- **Estorno:**
  - `POST /v1/orders/{order_id}/refund`, total (corpo vazio) ou parcial, com idempotência. Só vale para orders `processed`.
  - Cartão presencial pode ser estornado em até 90 dias.
  - O estado é conferido em `transactions.refunds.status`.
  - Fonte: https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/refund-order/post
- **Point:**
  - Order enviada pela API para Point Smart 1/2 ou Point Pro 2/3 em modo PDV, que aceitam cartão, QR e Pix.
  - Teste com o terminal virtual `SBX0000001` e estados simulados (`processed`, `refunded`, `expired`…). Conta de teste não processa pagamento real em terminal físico.
  - Fontes: https://www.mercadopago.com.br/developers/pt/docs/mp-point/overview e https://www.mercadopago.com.br/developers/pt/docs/mp-point/integration-test
- **Taxas:** a página de custos retornou 403 → NÃO VERIFICADO.

**Passos do nosso lado (em ordem):**
1. Criar a aplicação no painel do Mercado Pago, com credenciais de teste e de produção, URL de redirect e webhook `order`.
2. Criar a rota da API para OAuth: gerar `state`, receber o callback, trocar o código e guardar token/refresh cifrados e vinculados à `lojaId`.
3. Criar a cobrança no servidor: guardar uma `cobranca` com `external_reference = id do pagamento da venda`, idempotência, `order_id` e expiração.
4. Mostrar no app o QR/copia-e-cola e aguardar o estado no servidor (o app consulta a nossa API, nunca o provedor).
5. Criar o webhook: validar o HMAC, buscar `GET /v1/orders/{id}`, conferir `external_reference`, valor e conta, e marcar como confirmado de forma idempotente.
6. Criar o job de reconciliação para cobranças pendentes (GET), cobrindo aviso perdido, expiração e cancelamento.
7. Criar o estorno por API, com estados separados de solicitação e confirmação.
8. (Depois) Point, reaproveitando os mesmos passos de 3 a 7.

**Sem dinheiro:** passos 1 a 7 inteiros com credencial de teste (`payer.first_name: "APRO"` aprova o Pix sozinho) e o simulador de notificação. Point no terminal virtual.
**Exige valor real pequeno (com autorização do usuário):** um Pix de produção ponta a ponta na conta de um lojista real e o seu estorno; Point físico com cartão real.

## InfinitePay

**Caminho mínimo (Checkout Integrado, Pix + cartão):**
- **Criar o link:** `POST https://api.checkout.infinitepay.io/links`.
  - Campos: `items[]` (`quantity`, `price` em centavos, `description`), `order_nsu`, `webhook_url` e `redirect_url` opcional.
  - Basta o `handle` ou o cabeçalho `X-Api-Key: inchk_…`, gerado pelo próprio lojista em Configurações do Checkout (até 5 chaves).
  - As opções (`single_payment`, `valid_until`, `payment_methods_enabled`) exigem API key. O cartão fica sempre ligado; só o Pix pode ser desligado.
  - Não é possível cancelar um link; para limitar o prazo, usar `valid_until`.
  - Fonte: https://www.infinitepay.io/checkout-documentacao
- **Confirmar:**
  - Webhook com eventos `created`, `paid`, `settled`, `canceled`, `refunded` e `payment_failed`. **Não tem assinatura**, segundo a doc.
  - Validar cada aviso com `POST https://api.checkout.infinitepay.io/payment_check` (`handle`, `order_nsu`, `transaction_nsu`, `slug`). A resposta traz `success`, `paid`, `amount` e `paid_amount`.
  - O `paid_amount` pode ser maior que `amount` quando a taxa é repassada ao comprador.
  - Fonte: a mesma página.
- **Mostrar ao cliente:** o link pode ser exibido como QR na tela do PDV. O Pix aparece na página do comprador, ou seja, o cliente abre o link no próprio celular. Não documentado como proibido.
- **Estorno:** sem API; só no app ou na conta web. **Sandbox:** não existe; "Testar API" cria um link real, com mínimo de R$ 1,00.
- **Taxas:** "Pix grátis/taxa zero no Pix" (https://www.infinitepay.io/checkout). O cartão segue as taxas de Link de Pagamento do plano do lojista, que não estão na página → NÃO VERIFICADO.
- **Vários lojistas:** a doc diz que o mesmo handle/chave pode ser usado em vários sites e que o pagamento cai na conta dona da chave. Não proíbe uma software house usar chaves de vários lojistas → permitido pela regra do usuário. Split e subcontas não são suportados.
- **InfiniteTap:**
  - Deeplink `infinitepaydash://infinitetap-app` com `amount`, `payment_method` (`credit`/`debit`), `installments`, `order_id`, `result_url`, `app_client_referrer` e, opcionalmente, `handle`/`doc_number`.
  - O retorno vai **só para o aparelho** (`nsu`, `aut`, `card_brand`, `handle`…), sem webhook e sem consulta no servidor documentados.
  - Exige o app InfinitePay instalado e logado, além de uma transação inicial de valor baixo. Não exige API key nem aprovação.
  - Fontes: https://www.infinitepay.io/checkout-tap e https://www.infinitepay.io/desenvolvedores
- **Maquininha física:** não há integração documentada.

**Passos do nosso lado:**
1. Em "Conectar InfinitePay", o lojista cola o `handle` e, de preferência, a API key, guardados cifrados no servidor e vinculados à `lojaId`.
2. Criar o link no servidor com `order_nsu = id do pagamento`, `webhook_url` da nossa API, `single_payment: true` e `valid_until` curto.
3. Mostrar o link como QR e aguardar o estado no servidor.
4. Ao receber o webhook, não confiar no corpo: chamar `payment_check` e confirmar só com `paid: true` e o `order_nsu` igual ao nosso. Fazer de forma idempotente.
5. Criar a reconciliação para pendentes. O `payment_check` precisa de `slug`/`transaction_nsu`, que só chegam pelo webhook ou pelo redirect; sem aviso, o pagamento fica pendente e cai para conferência manual.
6. Estorno: registrar como "estorno manual feito no app InfinitePay", identificado.
7. (Opcional) InfiniteTap: gravar `nsu`/`aut` como "confirmado no aparelho pela InfinitePay", nível distinto da confirmação no servidor.

**Sem dinheiro:** só testes simulados do nosso lado (webhook falso → `payment_check` real responde `paid:false`).
**Exige valor real (com autorização):** um pagamento de R$ 1,00 por Pix (e outro por cartão, se for o caso) na conta do lojista, com estorno manual depois. O mesmo vale para o InfiniteTap.

## Stone

- **Connect (maquininha integrada ao PDV):**
  - "Para receber uma credencial de integração é necessário se cadastrar no nosso programa de parcerias". As etapas são integração, homologação com roteiro e liberação para produção pelo gerente comercial.
  - As chaves (secret key por Account e Stonecode) só existem depois do setup no Partner Hub. O webhook (`Charge.Paid`, `Charge.Refunded`) é configurado na ativação.
  - **Sem sandbox:** os testes acontecem em produção com valor simbólico e estorno no terminal. Não há API de estorno (só no POS ou no portal).
  - Aceita Pix (`"Type": "PIX"`) se o cliente tiver Conta Stone. Tem até 30 pedidos abertos por POS. Uma venda passada sem pedido fica sem vínculo.
  - Fontes: https://connect-stone.stone.com.br/docs/processo-de-integra%C3%A7%C3%A3o.md, https://connect-stone.stone.com.br/reference/autentica%C3%A7%C3%A3o-copy.md, https://connect-stone.stone.com.br/reference/autentica%C3%A7%C3%A3o-copy-1.md, https://connect-stone.stone.com.br/reference/webhook.md e https://connect-stone.stone.com.br/page/faq.md
- **Banking Gateway (BaaS):** tem BR Code dinâmico, webhook com JWT/criptografia e chaves de teste e produção. O acesso começa com "nossa equipe enviará um convite", e o webhook exige "entre em contato com nossa equipe". É um produto para quem oferece contas a terceiros, não para o lojista comum. Fontes: https://apidocs.baas.stone.com.br/docs/welcome-quickstart.md e https://apidocs.baas.stone.com.br/docs/returns-webhooks.md
- **API da Conta Stone para o próprio lojista (Pix com identificador):** o portal `docs.openbank.stone.com.br` não resolveu (DNS) em 17/11/2026 → NÃO VERIFICADO.
- **Conclusão:** sem parceria, contrato ou convite, a Stone não tem caminho documentado. No MVP, Stone = **confirmação manual identificada** (operador confirma e o app registra quem, quando e qual maquininha).

## Recomendação de escopo MVP mínimo

1. **Mercado Pago Pix (primeiro):** OAuth, order Pix, webhook HMAC + GET, reconciliação, expiração e estorno por API. Todo validável em sandbox. Precisa de um campo de identificador externo e de um estado de cobrança no pagamento (hoje inexistentes), além do provedor ligado à loja.
2. **InfinitePay Checkout (segundo):** link + `payment_check`, reaproveitando a mesma tabela de cobranças e o mesmo fluxo de tela. O estorno fica manual identificado. A validação exige R$ 1,00 real, com autorização do usuário.
3. **Mercado Pago Point (terceiro, opcional para o MVP):** só se o usuário tiver ou quiser um Point Smart/Pro. Validável no terminal virtual.
4. **Fica como confirmação manual identificada:** toda a Stone; maquininhas de qualquer marca fora da integração; o estorno InfinitePay; qualquer falha, falta de internet ou aviso perdido sem confirmação na consulta.
5. **Nível intermediário "confirmado no aparelho":** InfiniteTap, com `nsu`/`aut` do deeplink. Pode entrar depois; não é confirmação no servidor.
6. **Fora do MVP:** cartão online do Mercado Pago (exige tokenização própria) e casar pagamento por valor.

## Decisões que são do usuário

- Aprovar a ordem: Mercado Pago Pix → InfinitePay Checkout → Point (ou nenhum Point).
- Mercado Pago: OAuth (recomendado) ou o lojista colar o próprio token.
- Qual e-mail enviar em `payer.email`, já que o PDV não coleta e-mail do cliente.
- Autorizar transações reais pequenas (R$ 1,00) para a InfinitePay e para o Mercado Pago em produção, com estorno.
- Aceitar a Stone só com confirmação manual no MVP e o InfiniteTap como "confirmado no aparelho" (ou adiá-lo).
- Expiração padrão do Pix/link (sugestão: 15 a 30 min; o mínimo do Mercado Pago é 30 min).

## NÃO VERIFICADO

- Taxas do Mercado Pago para Pix e cartão (página de custos com 403) e taxas de cartão do Checkout InfinitePay.
- Se o app OAuth do Mercado Pago exige revisão ou aprovação antes de produção. A doc não cita; a etapa "Medir a qualidade da integração" existe, mas não foi lida.
- Se `payer.email` aceita um e-mail genérico da loja; se o Pix do Mercado Pago exige chave Pix cadastrada na conta online (citado só no overview do Point).
- Se o webhook do app OAuth recebe orders criadas com o token de cada vendedor sem configuração extra (a doc só sugere `?client=`).
- Se o `payment_check` da InfinitePay funciona para transações InfiniteTap; tolerância de horário (replay) no HMAC do Mercado Pago.
- Se existe API da Conta Stone para o próprio lojista (portal openbank fora do ar) e se a Stone oferece Tap to Pay para terceiros.
- Aviso de toda transação da conta (inclusive maquininha fora da integração) em qualquer provedor: não encontrado em nenhum dos três.
