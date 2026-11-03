# R4 — Estoque, catálogo, relatórios, fiado e várias lojas

Quinta entrega funcional do roadmap, construída em 02/11/2026 sobre a base `bc786bc`, sem commit próprio. Alterações de R0–R3 preservadas. A implementação foi construída e validada localmente; nenhum serviço remoto ou APK foi atualizado e não há aprovação humana registrada.

## Estoque por movimentos

A migração `0010_keen_arclight.sql` cria o histórico e transforma cada saldo controlado preexistente em um movimento inicial. IDs, quantidade, metadados e registros antigos são preservados; o evento da migração não inventa operador ou aparelho e não reaplica vendas antigas.

Novos produtos geram abertura identificada. Cada item de venda gera uma baixa única, dentro da mesma transação da venda, itens, pagamentos e confirmação da outbox. A exclusividade por item e a imutabilidade da venda impedem duplicação por novo ID de mutação ou ACK perdido. O lote aplica produtos antes de vendas; produto desconhecido é rejeitado e pode ser reenviado após confirmar o cadastro. Produto de outra loja é recusado.

Após criar o produto, o campo `estoque` recebido em edições do cadastro é uma projeção antiga, nunca uma ordem para substituir o saldo. Nome, preço e mínimo continuam editáveis conforme a permissão/plano. A unidade de um produto controlado não pode mudar. Na tela conectada, saldo é consultado e entradas/ajustes/devoluções usam a trilha, com autor, aparelho, motivo e ID de idempotência. Ajuste é uma **diferença assinada**, não a contagem final. Produto sem controle pode iniciar o controle por uma entrada/ajuste, usando zero como abertura conhecida.

Estoque negativo é permitido: duas vendas offline legítimas não são descartadas por disputar a última unidade. A API soma as baixas confirmadas e a tela mostra divergência/saldo negativo e mínimo. O operador confere fisicamente e o usuário autorizado registra um ajuste com motivo. Os números são o último saldo confirmado, sem promessa de reserva global; aparelhos desconectados não conhecem operações ainda não enviadas pelos demais. Cancelar comercialmente não comprova retorno da mercadoria. Devolução de estoque identifica o item vendido e a soma devolvida não pode ultrapassar a quantidade vendida. Devolução financeira é outro evento.

## Clientes e fiado

Clientes pertencem à loja. A venda conserva os itens, parcelas recebidas e um crédito imutável com cliente, vencimento e saldo original. Pagamentos na venda + crédito concedido = total da venda. A tela monta vendas fiadas com os produtos do catálogo e eventual entrada manual; não usa pagamento integrado. Vendas fiadas podem permanecer na outbox offline, conservando cliente já selecionado e IDs após reinício, como as vendas existentes.

O servidor revalida cliente, loja, plano, permissão, consistência financeira e origem. A venda é confirmada uma vez. Na gestão, o usuário vê saldo, vencimento, vencidos, quitação, cancelamento e recebimentos/estornos. Operador consulta seus títulos e eventos financeiros; dono/gerente com `conferir_caixas` veem os autorizados da loja. Nomes/contatos de clientes são cadastro compartilhado da loja; valores de outros responsáveis não são baixados para depois serem escondidos.

Recebimentos são **online**, parciais ou totais, limitados ao saldo sob a mesma trava transacional da conta/loja. Dinheiro exige turno v2 aberto do próprio receptor no aparelho atual. O crédito da gaveta e o evento de recebimento compartilham commit/rollback. O turno receptor fica explícito também quando difere do turno da venda. Pix/cartão têm confirmação manual fora do app, sem efeito sobre dinheiro na gaveta.

Correções de recebimento são estornos integrais referenciados, uma vez por original; para corrigir parcialmente, estorne o registro incorreto e registre o valor correto. O histórico original não muda. Dinheiro sai do turno atual com saldo suficiente e permissão de retirada. Estorno Pix/cartão é um registro manual depois de realizar e conferir a devolução externa; o app não executa estorno bancário. Recebimentos líquidos precisam estar zerados antes de cancelar a venda fiada. Cancelar zera o saldo devedor e preserva a entrada original até que sua devolução financeira seja registrada separadamente.

Os comandos de cliente, estoque, recebimento, estorno e loja persistem chave e payload **por perfil antes da rede**. Resposta perdida mantém a pendência, inclusive após reinício; a ação de retomar repete a mesma chave. Enquanto o resultado financeiro não foi reaplicado, o fechamento e novas operações são bloqueados. Recusa explícita 4xx libera o comando; falhas de rede/5xx preservam a chave. Sair/alternar não migra uma pendência para outro usuário ou loja.

## Relatórios e CSV

A API retorna eventos, filtros efetivos, instante de confirmação e totais por categoria. Período é `[início, fim)`; a tela usa datas civis inclusivas de Brasília e converte a data final para o começo do próximo dia. Filtros: loja/filial/consolidado, responsável, turno e dinheiro/Pix/crédito/débito. Os seletores mostram nomes e turnos, incluindo usuários sem caixa. O filtro de usuário conserva o responsável financeiro original; autor de cancelamento/intervenção aparece separadamente na tela e no CSV. Operadores recebem somente seus dados; gerente somente sua loja autorizada; consolidado da empresa e outra filial são exclusivos do dono. Identificadores de outra empresa não ampliam a consulta.

- Venda realizada é o valor comercial original; cancelamento é separado no instante do evento. Recebimentos não desaparecem com o cancelamento.
- Crédito concedido não é um recebimento. Recebimento de fiado posterior entra no próprio período, usuário e turno receptor, sem criar outra venda.
- Suprimento, sangria, retirada, devolução em dinheiro, transferências, correções e diferença de fechamento ficam em categorias distintas. Transferência não é receita. Estorno de fiado é separado de devolução de venda.
- Em uma venda dividida, filtrar um meio considera somente sua parcela. Crédito ainda sem recebimento tem meio nulo; não aparece no filtro dinheiro/Pix/cartão.
- Vendas líquidas comerciais = realizadas − canceladas. Recebimentos líquidos = recebidos na venda + fiado − devoluções efetivamente registradas. Não somar essas medidas entre si ou aos movimentos de gaveta.

CSV exporta o mesmo snapshot de linhas, filtros e totais exibidos. Editar um controle sem gerar outro relatório não muda o arquivo do resultado anterior. Texto tem escape de aspas/separadores e neutralização de fórmulas; valores são centavos inteiros, inclusive negativos numéricos. IDs na exportação sustentam auditoria. Fechamentos históricos não são recalculados por eventos posteriores. Cancelamentos legados sem evento detalhado não ganham data/autor inventados; seu estado continua no histórico de vendas, e o relatório por evento inclui somente cancelamentos com evento conhecido.

## Lojas, vínculos e oferta

Dono cadastra filiais dentro do limite do plano (Pro: três lojas por empresa). Cada filial recebe outro vínculo do mesmo usuário dono; novos usuários são convidados após entrar na loja correspondente usando a equipe já entregue em R1. Suspensão e permissões continuam restritas ao vínculo da loja. Seleção usa código pessoal e os vínculos permitidos; perfis já autorizados podem ser retomados no aparelho. Cada loja tem identidade de aparelho, partição financeira, estoque, outbox, caixas, catálogo local e Pix próprios. O consolidado não transforma uma sessão de filial em permissão para escrever em outra loja.

A integração de pagamentos foi retirada dos recursos atualmente oferecidos. O identificador continua legível em contratos/licenças antigos. Pro descreve estoque, fiado, equipe, limite real de lojas e pagamentos manuais. Não houve mudança de preço, cobrança automática ou política de acesso liberado. Recursos atuais dependem também de permissão e licença; histórico não é apagado no downgrade.

## Catálogo: evidência técnica e limite de homologação

O caminho existente mantém catálogo próprio primeiro e Open Food Facts depois, com orçamento de dois segundos no servidor e 2,5 segundos no cliente. Falha, ausência ou timeout abrem cadastro manual com o código já preenchido. Preço é definido pela loja. Nome próprio confirmado exige concordância de duas lojas, conforme os testes existentes.

Em 02/11/2026, `scripts/homologar-catalogo.mts` executou três consultas HTTPS sequenciais de produtos públicos no serviço real e uma segunda leitura pelo cache próprio em PGlite temporário:

| EAN | Nome retornado | Primeira consulta | Cache próprio |
|---|---|---:|---:|
| 3017620422003 | Nutella | 933 ms | 2 ms |
| 5449000000996 | Coca-Cola Original | 236 ms | 1 ms |
| 7894900010015 | Coca Cola LT 350ml | 231 ms | 2 ms |

Três requisições externas; o cache não fez novas chamadas. Nenhum cadastro foi enviado ao serviço externo. A primeira execução com rede restrita confirmou a saída manual por falha; a repetição com HTTPS autorizado obteve os três nomes. Evidência local em `builds/r4-catalogo-externo.json`. A integração segue a [documentação oficial do Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/), com User-Agent identificado, seleção de campos e consultas limitadas. Em implantação, manter `OFF_USER_AGENT` com identificação/contato operacional reais.

**Isso não mede cobertura de mercadinho nem p95 em 4G.** A amostra física de 100 itens (alimentos, bebidas, limpeza, higiene e bazar), conferência dos rótulos e medição em rede móvel continuam pendentes. Nenhuma outra fonte foi contratada ou adicionada; avaliar somente se a cobertura medida justificar.

## Validação e homologação

Regressão final: **API 43 arquivos/525 testes, mobile 60 arquivos/540 testes, shared 17 arquivos/172 testes: 1.237 aprovados.** Tipos dos três workspaces e `git diff --check` aprovados. Após a regressão global, oito testes dirigidos mobile (integração/telas) confirmaram a proteção contra confirmação simultânea de fiado e a apresentação final; dois dirigidos shared confirmaram contrato/CSV com autoria. Nenhum teste foi alterado para contornar TLS/autenticação. As primeiras rodadas restritas tiveram falhas de localhost/SMTP e banco temporário; as repetições com acesso local passaram. Fixtures antigas foram atualizadas para o campo nulo `fiado` e a política nova de estoque por movimentos.

Bundle Android/Hermes conectado de homologação: **1.921 módulos**, `builds/r4-bundle/_expo/static/js/android/entry-7fdb718ae0f392e837bf1b0e5c342ca8.hbc`, **5.213.210 bytes**, SHA256 `aa9503fff5db36853533a32831a450a5ae08a08b62023a0092d4f33441d40c3b`. Host `aladdin-pdv-api-homologacao.jicnzg.easypanel.host` e marcadores de comando durável, recebimento de fiado, opções de relatório e tela conferidos. Ferramentas de teste habilitadas. A primeira compilação falhou ao escrever bytecode no temporário do sandbox; a repetição com temporário dentro do workspace passou, sem modificar o runtime. Export não é APK nem execução física.

Evidências locais ignoradas pelo Git: `builds/r4-{api,mobile,shared}-tests.json`, `r4-{mobile,shared}-dirigidos.json`, `r4-validacao-local.json`, `r4-catalogo-externo.json`, `r4-export.log` e `r4-bundle`. Documentação e checkpoints permanecem versionáveis. Registro final: [CP 020](checkpoints-roadmap.md#cp-20261102-020-entrega-local-de-gestao-r4).

Evidência incremental: [CP 016](checkpoints-roadmap.md#cp-20261102-016-base-transacional-de-gestao-r4), [CP 017](checkpoints-roadmap.md#cp-20261102-017-telas-comandos-duraveis-e-lojas-r4) e [CP 018](checkpoints-roadmap.md#cp-20261102-018-revisao-adversa-catalogo-e-regressao-r4).

Testes principais: `apps/api/test/gestao.test.ts`, `migracaoGestao.test.ts`, regressões de sync/valores/recursos; `apps/mobile/test/gestaoIntegracao.test.ts`, `gestaoTelas.test.ts`, `gestaoDatas.test.ts`; `packages/shared/test/gestao.test.ts`; catálogo API/mobile existente. PGlite, SQLite, HTTP/SMTP local e HTTPS público são evidências diferentes de PostgreSQL independente e Android físico.

Roteiro pendente:

1. Preservar backup e implantar migração/API R1–R4 em homologação. Conferir abertura legada, versão e origem de dados. Validar concorrência em PostgreSQL independente, incluindo dois aparelhos vendendo o último item e dois recebimentos contra o mesmo saldo.
2. Gerar APK conectado e operar com dono, gerente e dois operadores. Criar filial, conceder vínculo, alternar, verificar produtos/Pix/filas/caixas e negar acesso fora das lojas permitidas. Dono confere o consolidado.
3. Executar venda parcialmente fiada, recebimento parcial em outro turno, fechamento, devolução referenciada, cancelamento e perda de resposta/reinício. Comparar saldo devedor, estoque, dinheiro esperado, eventos e CSV com os originais.
4. Realizar inventário negativo/divergente offline, devolver parte e ajustar com motivo; verificar que cancelar venda não repõe produto ou devolve dinheiro automaticamente.
5. Conferir leitores, datas, teclados, telas pequenas, leitor de tela, SecureStore, exportação/compartilhamento e captura de evidências no Android físico. Registrar aceite humano separadamente.
6. Medir a amostra física de 100 produtos e p95 em 4G; avaliar outra fonte apenas a partir dessa evidência.

Leituras de gestão consultam o histórico confirmado; a interface não promete acesso a recebimentos ainda desconhecidos de outro aparelho. Recebimentos/ajustes são online. Clientes novos também exigem conexão; vendas fiadas offline usam cliente previamente carregado/selecionado. Este lote não implementa cobrança integrada, estorno bancário, APK/piloto físico ou backup externo. Backups locais, healthchecks e backlog operacional permanecem preservados.
