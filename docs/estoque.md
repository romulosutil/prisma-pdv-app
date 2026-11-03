# Estoque por movimentos

Ao concluir uma venda, os itens com controle de estoque baixam a quantidade vendida. Cancelar a venda repõe essa quantidade uma vez. Carrinho aberto e pagamento parcial não baixam o estoque. A venda pode continuar com saldo zero ou negativo; o checkout e a divisão de pagamento mostram um aviso.

## Cadastro e correções

Em Produtos, informe o estoque atual em unidades ou quilos, com até três casas decimais. Campo vazio deixa o produto sem controle. O mínimo continua definindo o filtro “Estoque baixo”.

Depois de ativar o controle, alterar o saldo registra um ajuste com data, quantidade e motivo opcional. Sem motivo informado, o registro recebe “Ajuste manual do saldo”. Use esse campo para entradas, perdas ou contagem física. O histórico do produto mostra saldo inicial, ajustes, vendas e cancelamentos; “Ver todos os movimentos” amplia os10mais recentes.

Salvar nome, preço ou outro metadado sem tocar no estoque não cria ajuste. Uma correção usa a diferença em relação ao saldo visto ao abrir o formulário: se o formulário mostrou10, a correção foi para14 e ocorreu uma venda2 durante o preenchimento, o saldo fica12. Vendas e ajustes feitos em outro aparelho entram na próxima sincronização.

Esvaziar o campo desativa o controle, conservando a base e os movimentos. Vendas concluídas enquanto desativado não baixam estoque. Reativar ajusta ao novo saldo informado. A unidade de um produto que já tem base de estoque permanece fixa; outro tipo de unidade exige novo cadastro.

## Migração e operação offline

O saldo cadastrado antes desta entrega é o ponto de partida. Vendas históricas sem marcador não são descontadas retroativamente e seu cancelamento não acrescenta uma reposição presumida. Itens avulsos também não movimentam estoque.

O saldo é calculado pelos registros persistidos: base + ajustes − itens controlados de vendas concluídas. O cancelamento conserva a baixa no histórico e registra a reposição. UUIDs dos ajustes, vendas e itens impedem contagem repetida. Não se sincroniza o saldo exibido como uma nova contagem absoluta; o servidor une os eventos de correção.

No Android, a classificação do item para controle é gravada na mesma transação da venda, itens, pagamentos e outbox. Queda antes do commit preserva o rascunho; resposta perdida depois do commit recupera a mesma venda. Operações offline ainda não enviadas permanecem somente no aparelho de origem e seguem os limites de recuperação já documentados.

## Atualização

1. Fazer backup conforme o procedimento operacional do projeto.
2. Atualizar a API antes do app. A migração `0008_lyrical_blindfold.sql` acrescenta `produtos.ajustes_estoque`, `produtos.estoque_ativo` e `itens_venda.controla_estoque`, sem alterar os saldos ou recontar vendas.
   A migração `0009_vengeful_champions.sql` acrescenta índice de loja/produto nos itens para conferir os limites do saldo composto.
3. Atualizar os aparelhos antes de usar o controle como referência operacional. O novo app depende da API que preserva os novos campos. Apps antigos exibem o saldo base; o servidor classifica os itens das novas vendas desses clientes, mas eles não projetam o saldo local.
4. Conferir em Android físico: saldo10, venda2, reinício e saldo8; cancelamento e saldo10; venda fracionária; aviso de negativo; dois aparelhos offline e atualização sobre dados existentes.

Esta entrega é local. Nenhum deploy, migração na VPS ou APK novo foi produzido. Automação com HTTP/PostgreSQL/SQLite e inspeção visual web são evidências locais, sem substituir a homologação Android.

As quantidades conservam precisão inteira em milésimos. Um ajuste, conclusão ou cancelamento que ultrapasse o limite de inteiro seguro é recusado antes de gravar; a parcela recebida permanece recuperável. O operador pode corrigir o saldo e retentar. A API devolve `estoque_fora_do_limite`, mantendo a operação local para revisão.

## Verificação

Testes do recurso: `packages/shared/test/estoque.test.ts`, `apps/api/test/syncEstoque.test.ts` e `apps/mobile/test/estoque{Persistencia,Interface,Sync}.test.ts`. Contrato, decisões e relatório independente em `.specs/features/estoque-movimentos/`.
