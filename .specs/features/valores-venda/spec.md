# Valores da venda validados pelo servidor

## Problem Statement

P0-04-A: a API persiste os valores enviados pelo cliente sem conferir a aritmética. O contrato mobile já usa pagamentos líquidos; a fixture API de700 centavos usa1000+troco300 e deve ser corrigida para700+troco300, conservando as asserções comerciais. Não migrar dados históricos.

## Out of Scope

P0-04-B/C/D/E: autorização de origem/recursos, vínculo caixaId, ajustes e fechamento histórico. Não integrar pagamentos ou prometer cobrança real. Não alterar schemas/migrações/mobile/shared, janelas offline, preços de catálogo ou protocolo de ACK. Confirmação bancária e restauração permanecem pendentes.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Pagamento | valorCentavos líquido; recebido em dinheiro = valor + troco | VendasRepo, checkoutSqlite e useCobranca existentes |
| Precisão | Entradas inteiras seguras; produto preço*quantidade <= Number.MAX_SAFE_INTEGER; arredondamento meio para cima em milésimos com BigInt somente no servidor | Preservar faixa representável do cálculo mobile, sem float intermediário no servidor |
| Gratuidade | Ao menos um item; preço/total zero e pagamentos vazios ou parcelas zero são permitidos quando somam zero | Não inventar preço mínimo ausente do domínio |
| Legado | Reenvio/cancelamento com mesmo conteúdo financeiro armazenado continua válido, mesmo com aritmética histórica inválida | Não reescrever nem impedir leitura/cancelamento da história |
| Imutabilidade | Comparar total, origem, itens e pagamentos ordenados, incluindo IDs e todos os campos; criadaEm não é comparada pois o ingresso já limita relógio futuro | Timestamp armazenado nunca é reescrito; política de origem nova fica em B |
| Erros | Negativa/fração/unsafe no DTO continua HTTP400; inconsistência de negócio retorna motivo venda_inconsistente por mutação em HTTP200 | Preservar rejeição parcial e ACK existentes |

Open questions: none para este lote local. Decisões reversíveis autorizadas pelo usuário, sem pergunta opcional.

Follow-up executável descoberto durante a revisão do gestor: multiplicarPreco compartilhado produz9007199254741 para preço9007199254740499 e quantidade1, enquanto a fórmula exata exige9007199254740. Reprodução Node local registrada; a adição bruto+500 excede a precisão segura. O validador novo usa BigInt e rejeita o valor incorreto. Não alterar shared neste lote de ownership fixo: corrigir cálculo compartilhado com quociente/resto seguros em lote seguinte, antes de P0-04-B. Não considerar o caminho mobile integralmente validado nessa fronteira.

## User Stories

Como operador, quero que vendas corretas offline sejam preservadas e valores adulterados sejam rejeitados antes de gravar. Como gestor, quero preservar os registros históricos sem aceitar alterações financeiras por reenvio.

Acceptance Criteria:
1. WHEN uma venda nova é sincronizada, o servidor SHALL exigir ao menos um item, preços/totais não negativos e quantidades positivas inteiras seguras, produto preço*quantidade seguro e total do item igual a floor((preço*quantidade+500)/1000) calculado exatamente. A soma segura dos itens SHALL ser o total declarado. Casos499/500/501 milésimos de centavo SHALL resultar0/1/1. Inconsistência SHALL retornar venda_inconsistente sem gravar essa venda.
2. WHEN validar pagamentos novos, o servidor SHALL exigir valores/trocos não negativos inteiros seguros, soma segura dos valores líquidos igual ao total e troco zero em qualquer meio diferente de dinheiro. Valor+troco de cada parcela em dinheiro SHALL ser seguro. Venda de2500 com parcelas1000dinheiro+troco500 e1500Pix SHALL ser aceita;2499 ou2501 líquidos SHALL ser rejeitados. Zero total com item gratuito SHALL ser aceito, inclusive sem parcelas.
3. WHEN IDs de itens ou de pagamentos se repetem na mesma venda nova, a mutação SHALL ser rejeitada como venda_inconsistente antes de SQL. Rejeição financeira SHALL não criar venda/itens/pagamentos/mudança/ACK; caixas/movimentos e vendas anteriores SHALL permanecer iguais. Em lote misto, vizinhas válidas SHALL ser aceitas com dados/ACK próprios; corrigir e retentar o mesmo ID de mutação rejeitada SHALL funcionar sem duplicação.
4. WHEN uma venda já existe na loja autenticada, somente payload financeiro e origem de aparelho/operador idênticos SHALL permitir no-op de mesmo status ou transição concluida->cancelada; total, campo de item/parcela, IDs, ordem ou origem divergentes SHALL retornar venda_imutavel sem alterar a história. Reenvio com outra criadaEm SHALL conservar instante armazenado. Linha legada de aritmética inválida SHALL continuar legível e aceitar replay/cancelamento idênticos sem recalcular valores. Cancelada->concluida SHALL continuar rejeitada. Loja divergente SHALL conservar loja_invalida conforme guarda existente. ACK de um ID já aplicado conserva o no-op atual, mesmo se outro payload vier junto; nunca aplica nova escrita.
5. WHEN payload HTTP contém preço/valor negativo, fração, quantidade zero ou número além do inteiro seguro, o schema SHALL continuar responder400 e não gravar venda/filhos/mudança/ACK. Validação de negócio SHALL funcionar via Fastify e bancos locais reais PGlite/PostgreSQL, sem mocks de persistência. Testes existentes de janela offline, assinatura e cancelamento SHALL continuar passar sem remoção/enfraquecimento.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| VALUES-01 | 1,2 | P0-04-A/AC-P0-04-1 | Implementado/gates PASS; final pendente |
| VALUES-02 | 3,5 | P0-04-A rejeição sem parcial | Implementado/gates PASS; final pendente |
| VALUES-03 | 4 | P0-04-A preservação financeira | Implementado/gates PASS; final pendente |
