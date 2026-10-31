# Assinatura única e cupons

Decisão de 30/10/2026: **um plano Pro por R$ 49,90/mês, com 7 dias grátis**, mantendo cartão obrigatório e paywall.

## Oferta

Catálogo público e onboarding oferecem somente Pro, via `PLANOS_DISPONIVEIS`. `PLANOS` mantém IDs antigos para compatibilidade de contratos e assinaturas anteriores, sem alterar faturas passadas.

Vendas, produtos e histórico ilimitados. Limites técnicos do Pro preservados: 10 aparelhos, operadores ilimitados e 3 lojas. A interface anuncia somente funcionalidades disponíveis. A gestão do Pro não mostra troca de plano; contas antigas podem migrar para Pro.

## Cupom criado

| Código | Desconto | Duração | Mensalidade atual |
| --- | --- | --- | --- |
| **VITALICIO50** | **50%** | **Vitalício** | **R$ 24,95** |

Aplicar na tela do cartão antes de iniciar o teste. Espaços externos e minúsculas são normalizados. A prévia mostra o valor final e a duração; editar o código retira a aplicação anterior. É necessário aplicar ou limpar o campo antes de continuar.

API e demo resolvem o código no catálogo confiável `packages/shared/src/cupons.ts`; o cliente envia somente o código, não controla o percentual. Cupom desconhecido é recusado antes de verificar cartão e não consome o teste. Para cadastrar outros cupons nesta etapa, adicionar entradas nesse catálogo e atualizar API/app. Não há painel administrativo.

O cupom é salvo na assinatura e não expira por tempo ou número de cobranças. Vale na primeira cobrança, renovação, retentativa, recuperação com cartão novo e reativação da mesma assinatura. Um cupom por assinatura, aplicado na contratação; aplicação posterior fica fora desta entrega.

## Paywall

1. Criar conta e loja → plano único → cartão e cupom opcional → teste iniciado → app.
2. **Hoje: R$ 0,00**. Primeira cobrança em cadastro + 7 dias, com valor final informado. Cancelamento sem multa.
3. Cartão recusado impede início do teste, sem consumir elegibilidade. A API mantém um teste por CPF/CNPJ e fingerprint.
4. Lembrete D-2 mostra valor com desconto. Primeira cobrança em D7; ciclo mensal começa no fim do teste.
5. Cancelar mantém acesso até fim do teste/período pago. Reativar preserva cupom e não concede novo teste.
6. Inadimplência mantém retentativas D+1, D+3 e D+5 e carência de sete dias antes da suspensão de novas vendas.
7. Licença offline e regras de acesso existentes permanecem. Cupom não altera limites nem permissões.

## Gateway simulado

Continua `MockBillingProvider`. **Não há cobrança real nem integração com Mercado Pago nesta entrega**; integração fica para outra tarefa.

Cartões continuam visíveis e preenchíveis no app com ferramentas de teste habilitadas:

| Cartão | Resultado |
| --- | --- |
| 4242 4242 4242 4242 | Aprova verificação e cobranças |
| 4000 0000 0000 0002 | Recusa na verificação |
| 4000 0000 0000 0341 | Verifica, mas recusa cobranças |

Validade futura, CVV 123 e nome preenchido. O app transmite somente token simulado. O relógio de teste em modo demo continua permitindo avançar dias.

## Persistência

Migração Drizzle `0007_sloppy_bedlam.sql` adiciona `assinaturas.cupom` JSONB, nulo para assinaturas anteriores. Snapshot inclui código, percentual e duração. Demo persiste o mesmo contrato localmente. Não há migração automática de planos antigos.
