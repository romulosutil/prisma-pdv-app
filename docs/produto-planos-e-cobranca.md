# Planos, preços e cobrança (Paywall) — v0.1

Dono: Produto · Status: **decidido para a versão de testes** (revisar antes do lançamento público)

## 1. Preços

Referência de mercado: o concorrente principal começa em **R$ 49,90/mês**. Nossa estratégia é **"o nosso plano mais completo custa o plano mais barato deles"**. O teto é R$ 49,90, e os dois planos abaixo dele servem de porta de entrada para o pequeno varejo (mercadinho, padaria, banca, loja de bairro).

| Plano | Mensal | Para quem | Papel na grade |
|---|---|---|---|
| **Essencial** | **R$ 19,90** | Lojista sozinho, 1 celular, sem maquininha integrada | Entrada: abaixo da barreira psicológica de R$ 20 |
| **Negócio** | **R$ 34,90** | Loja com 1–3 pessoas no balcão, usa Pix/maquininha | **Plano-alvo** (badge "Mais escolhido", pré-selecionado) |
| **Pro** | **R$ 49,90** | Loja que quer gestão: estoque, fiado, várias lojas | Âncora: igual ao preço de entrada do concorrente |

Racional:
- O Negócio fica em ~70% do Pro. A diferença de R$ 15 até o Pro é pequena, o que favorece o upgrade. A diferença de R$ 15 para baixo é grande o bastante para o Essencial parecer limitado.
- Final ,90 segue o padrão do varejo BR. Os preços são finais (sem "+ impostos").
- **Anual (fora da versão de testes)**: 2 meses grátis. Essencial R$ 199/ano, Negócio R$ 349/ano, Pro R$ 499/ano.
- Meta de mix: 20% Essencial · 60% Negócio · 20% Pro → ticket médio ≈ R$ 34,90.

## 2. Limites por plano

Princípio nº 1: **nunca limitar vendas**. Bloquear o caixa no meio do dia destrói confiança. Os limites ficam em capacidade (aparelhos, pessoas, catálogo) e em gestão.

| Recurso | Essencial | Negócio | Pro |
|---|---|---|---|
| Vendas | Ilimitadas | Ilimitadas | Ilimitadas |
| Produtos cadastrados | 500 | Ilimitados | Ilimitados |
| Aparelhos ativos (celular + desktop) | 1 | 3 | 10 |
| Operadores (login por PIN) | 1 | 3 | Ilimitados, com permissões |
| Lojas | 1 | 1 | 3 |
| Dinheiro, cartão (registro manual), Pix por chave/QR estático | ✓ | ✓ | ✓ |
| Integração InfinitePay / Mercado Pago (Tap no celular, Pix com confirmação automática) | — | ✓ | ✓ |
| Leitor de código pela câmera, atalhos, venda avulsa | ✓ | ✓ | ✓ |
| Estoque com alerta de mínimo | — | ✓ | ✓ |
| Caixa | Abertura/fechamento | + sangria e suprimento | + por operador |
| Histórico de vendas | 90 dias | 2 anos | Ilimitado |
| Relatórios | Resumo do dia | + semana/mês, por produto, exportar CSV | + curva ABC, margem, por operador |
| Fiado (contas a receber) | — | — | ✓ |
| Backup na nuvem e sincronização | ✓ | ✓ | ✓ |
| Suporte | Central de ajuda + e-mail | WhatsApp (horário comercial) | WhatsApp prioritário |

- **NFC-e / fiscal**: fora do MVP. Quando entrar, vai como add-on por volume, porque tem custo de SEFAZ/certificado.
- Os limites são **soft** na interface: ao atingir o limite, aparece um banner de upgrade, e nada é apagado nem bloqueado no meio de uma venda.
- A fonte da verdade é o catálogo `PLANOS` em `packages/shared`, consumido por API, App e Desktop. Nada de limite hardcoded em tela.

## 3. Fluxo do paywall (cartão + 7 dias grátis)

1. Boas-vindas → criar conta → dados da loja → **escolher plano** (Negócio pré-selecionado) → **cadastrar cartão** → "Seu teste grátis começou" → Início.
2. A tela do cartão mostra a cobrança de forma explícita: **"Hoje: R$ 0,00 · A partir de 30/10: R$ 34,90/mês · Cancele quando quiser, sem multa."** A data é a real (cadastro + 7 dias).
3. O cartão é validado no cadastro com uma autorização de valor zero/estornada no gateway. Recusou = não começa o teste.
4. **O teste libera o plano escolhido completo.** Só existe um teste por CPF/CNPJ e por cartão (fingerprint do gateway).
5. **Lembrete no D-2** (push, e-mail e banner no app): "Seu teste termina em 2 dias. Em 30/10 cobraremos R$ 34,90."
6. **D7**: primeira cobrança. O ciclo mensal ancora na data do fim do teste.
7. **Cancelar** pelo app em até 2 toques (Ajustes → Assinatura). Cancelar no teste não gera cobrança, e o acesso vai até o fim do teste. Depois da cobrança, o acesso vai até o fim do período pago. Reembolso integral se o pedido vier em até 7 dias da primeira cobrança.
8. **Upgrade**: imediato, com crédito proporcional. **Downgrade**: no próximo ciclo. Se o uso passar do novo limite (ex.: 600 produtos no Essencial), nada é apagado. Itens além do limite ficam só leitura, e o usuário escolhe quais aparelhos manter.
9. **Falha de pagamento (dunning)**: status `inadimplente`, com retentativas em D+1, D+3 e D+5 e banner pedindo para atualizar o cartão. **O app funciona normal por 7 dias.** Depois disso o status vira `suspensa`: não abre novas vendas, mas o usuário vê, exporta e paga. Os dados ficam guardados por 90 dias depois do cancelamento/suspensão.
10. **Offline**: o app é offline-first. A licença fica em cache no aparelho com `validaAte` (fim do período + carência). Sem sincronizar por mais de 7 dias, o app pede conexão antes de abrir uma nova venda (nunca no meio dela).

### Estados da assinatura (máquina de estados em `packages/shared`)
`sem_assinatura` → `em_teste` → `ativa` ⇄ `inadimplente` → `suspensa`
Qualquer estado → `cancelada` (com `acessoAte`). `cancelada` → `ativa` ao reassinar.

## 4. Gateway

- O código usa a interface `BillingProvider`. **A versão de testes usa `MockBillingProvider`**: cartão de teste `4242 4242 4242 4242` aprova e `4000 0000 0000 0002` recusa. Há um "relógio de teste" em Ajustes (só em dev) para avançar dias e ver teste → cobrança → falha.
- O número do cartão **nunca** passa nem fica salvo na nossa API. Em produção, o cartão é tokenizado pelo SDK do gateway direto no app. No mock, o app só envia últimos 4 dígitos, bandeira e token falso.
- **Decisão de 24/10/2026:** o gateway de testes (sandbox) é o **Asaas**, atrás da interface `BillingProvider`. No app Android a cobrança vai pelo **Google Play Billing** (`GooglePlayBillingProvider`), conforme o risco 1 abaixo. O papel do Asaas na produção (site e Desktop) fica a confirmar.
- Candidatos para produção (antes dessa decisão): Stripe Billing (trial, dunning e proration prontos) ou Asaas/Pagar.me (operação local). No futuro: **Pix Automático** como alternativa ao cartão.

## 5. ⚠️ Riscos abertos (decidir antes de publicar na Play Store)

1. **Política de cobrança do Google Play**: assinatura de software vendida *dentro* do app Android pode ser obrigada a usar o Google Play Billing (taxa de 15% em assinaturas). Opções: (a) contratar o plano pelo site/desktop e o app só faz login; (b) adapter `GooglePlayBillingProvider`; (c) programa de faturamento alternativo, se disponível no Brasil. A arquitetura já prevê o adapter. **Validar com jurídico/política vigente.** Decisão de 24/10/2026: seguir pela opção (b), Google Play Billing no app Android. Falta validar com a política vigente e fechar como o plano contratado no Google conversa com a licença da nossa API.
2. CDC (direito de arrependimento) e clareza da oferta: textos de cobrança revisados pelo jurídico.
3. Custo por conta (infra + taxa do gateway) precisa caber no Essencial. Estimativa a validar: ≤ R$ 5/mês.

## 6. Métricas

Início de teste / cadastro concluído · conversão teste→pago (meta ≥ 45%, típica de teste com cartão) · mix de planos · churn mensal (< 4%) · recuperação no dunning (≥ 50% das falhas) · upgrades Essencial→Negócio por limite atingido.
