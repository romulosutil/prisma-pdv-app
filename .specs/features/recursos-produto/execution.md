# Execução de estoque e limites

Implementação restrita a três linhas em upsertProduto, depois das guardas existentes e antes de qualquer escrita/contador. Sem recurso estoque, comparar ambos os valores com o confirmado ou null se novo; não limpar histórico automaticamente. Só sync.ts e teste novo syncRecursosProduto.test.ts. Gestor revisou diretamente persistência/sync e pediu reforços de prova antes do commit. Terra Médio solicitado, sem confirmação efetiva da plataforma.

## Evidências e gates

RED PGlite informado pelo executor:5falhas comportamentais de requisito e9sucessos, sem falha de setup usada como evidência. Log local temporário recursos-produto-red.txt. Erro intermediário teste_ja_usado veio de fixture que reutilizava cartão; conta auxiliar passou a criarConta sem assinatura, sem enfraquecer asserções.

Quick final59/PGlite e64/com PostgreSQL, quatro arquivos syncRecursosProduto/sync/syncOrigem/syncRecursosCaixa, typecheck API PASS. São22casos novos comuns e3PostgreSQL condicionais neste arquivo. O executor fechou clientes/apps no finally e liberou runner/banco. Gates amplos finais em série PASS: API430/PGlite ou489/com PostgreSQL,29arquivos; mobile434/39arquivos, shared150/10arquivos, typecheck todos. Total1073/PG ou1014/PGlite;59casos condicionais PG não se registram no PGlite, nenhum registrado pulado. Revisão independente pendente; não aceitar antes dela.

PG17 dedicado b81f1f09312cd7f2d75566619a1aed22f974221bdb26da8627f5901a3b387367,127.0.0.1:60139/pdv_test, volumefcc01c51f290093199651752496145c64ba90cb44c26581280238bbd72dae998. Seed SQL prepara499/500/501produtos válidos, não representa compra. Downgrade/upgrade trial e agendamento são rotas locais reais com billing mock; nenhuma compra externa. A troca controlada de plano após a prova do agendamento é fixture explícita, não renovação real. Nenhum ambiente de produção alterado.

## Adequação suficiente

| Critério | Asserção exata localizada | Resultado da spec |
|---|---|---|
| AC1, estoque/mínimo zero, positivo, negativo | apps/api/test/syncRecursosProduto.test.ts:35 matriz6campos/3planos;45 `expect(res.corpo.rejeitadas).toEqual([{ id: pedido.id, motivo: 'recurso_plano' }])`;46 aceitas[];47 snapshot;49 aceita;27 registro completo,30 mudança exata,31 ACK exato | Essencial nega qualquer valor não null; Negócio/Pro conservam campos. Extra plano e data de mutação antiga não liberam recurso |
| AC2, editar outros campos e preservar histórico | apps/api/test/syncRecursosProduto.test.ts:60 planoEssencial;63 aceita edição;64 helper confere linha/versão2/mudanças/ACK;68 motivo recurso_plano;69 snapshot;72 `expect(...mudancas.find(...)).toEqual({ entidade: 'produto', operacao: 'upsert', dados: { ...editado, versao: 2 } })` | Estoque/mínimo não mudam nem são apagados, nome/preço podem mudar, pull exato |
| AC2, mesmo pedido após upgrade, delete e restore | apps/api/test/syncRecursosProduto.test.ts:75 motivo;76 snapshot;77 planoNegócio;78 aceita mesmoID;79 helper versão3;82 snapshot retry;87 helper tombstone versão4;91 helper restauração versão5 | Recuperação sem duplicação; exclusão mantém valores históricos e restauração respeita campos |
| AC3, LWW e vizinhos | apps/api/test/syncRecursosProduto.test.ts:207 aceita três IDs;208 rejeitadas[];210 `expect(...produtos...).toEqual(linhaAntes)`;211 mudanças da entidade iguais;212 ACK antigo novo;213 helper vizinho;222 snapshot retry | Mutação antiga não altera entidade/mudança; vizinho null persiste de fato e ACK não duplica |
| AC3, prioridade loja/limite | apps/api/test/syncRecursosProduto.test.ts:237/249 loja_invalida;239/240 e251/252 pai/ACK ausentes;268/280 limite_plano;269/281 snapshot | Preservar motivos anteriores; recurso não esconde loja/limite, vizinhos completos em242/254 |
| AC4, fronteira e downgrade acima do teto | apps/api/test/syncRecursosProduto.test.ts:265 helper da edição real;268/269 nova ativação negada sem escrita;275 aceita uma restauração;276 linha/mudança/ACK completos;280/281 segunda restauração negada;282 tombstone preservado | Nenhum dado apagado no downgrade, edição/exclusão permitidas;500ativos após a vaga consumida. Base501 em sync.test.ts:169/170/174/178 e paginação182..185 |
| AC4, dois pushes/última vaga | apps/api/test/syncRecursosProduto.test.ts:159 `expect(bloqueados).toBe(true)` antes de liberar;162 HTTP200ambos;164 uma aceita;165 limite_plano;169 ID perdedor exato;170 total500;171..173 nenhum produto/ACK/mudança perdedor;175/176 e177 vencedor completo;179..182 somente mudanças esperadas | PIDs de clientes exclusivos em Lock/FOR UPDATE, sem usar sleep como prova; contagem não excede500 |
| AC5, plano corrente após espera | apps/api/test/syncRecursosProduto.test.ts:119 `expect(bloqueado).toBe(true)` antes da redução;123 HTTP200;124 motivo limite_plano/recurso_plano;125 snapshot;126 assinatura igual a anterior com só planoIdEssencial | Licença consultada após locks, nenhum efeito de pedido rejeitado |
| AC5, agendamento não antecipa corte | apps/api/test/syncRecursosProduto.test.ts:230 status200;231/232 estado ativa/Negócio/agendadoEssencial;238 aceita estoque;242 helper completo | Conversão local e rota de troca preparam estado válido; mantém recurso do plano atual |
| AC6, venda manual offline após downgrade | apps/api/test/syncRecursosProduto.test.ts:199 cria payload antes do avanço de1h;207 aceita;215 pai completo com criadoEmINICIO/atualizadoEmagora;216/217 filhos completos ordenados;218 ACK exato;219 mudança exata | Recurso de estoque não bloqueia venda manual já concluída dentro da janela, nem altera aritmética |
| AC6, gates/sensor | Quick e amplos PASS; sensor obrigatório no passo2 | Não aceitar antes de validation.md independente |

## Adequação necessária

| Grupo de testes/asserções | Requisito | Manter |
|---|---|---|
| Matriz34..54, helper26..31 | AC1 | Sim |
| Histórico56..93, helper64/79/87/91 | AC2 | Sim |
| LWW193..223, especialmente210..213 | AC3 eAC6 | Sim |
| Agendamento225..255 | AC3 eAC5 | Sim |
| Fronteira257..283 e base já existente sync.test.ts164..191 | AC4 | Sim; sem duplicar501 básico |
| Redução observada95..135 | AC5 | Sim |
| Última vaga137..191 | AC4 | Sim |
| Regressões globais e verificador | AC6 | Próximo passo obrigatório |

Diretrizes: ajuda.ts, syncSessao/syncOrigem/syncRecursosCaixa e coding-principles da skill. Estado real, não só spies ou aceitas. Instantes da venda offline são distintos; leitura de filhos ordenada por posicao. Clientes PostgreSQLmax1 dão PIDs conhecidos; ambos esperadores podem formar cadeia, sem exigir bloqueio direto de ambos pelo controle. Nenhum teste anterior removido/pulado/enfraquecido. Sem desvio do contrato, nova política de plano/status ou alteração da licença de venda. Corte de pagamentos integrados e capacidade/oferta mobile continuam futuros.

Veredito de adequação do gestor: AC1..5 e resultado de venda emAC6 têm asserções dos valores definidos, registros/filhos/mudanças/ACKs completos e ausência de efeitos. Nenhum teste novo sem requisito. Gates completos deAC6 PASS; sensor independente é próximo passo obrigatório antes do aceite.

Aceite posterior: fontef5195ad,6ACs PASS e5/5mutações comportamentais pelo verificador novo. Alvos59/PGlite64/PG/typeAPI repetidos, scratch removido, árvore preservada e validate_state0. Banco/volume efêmeros conferidos e removidos pelo gestor. C global continua aberto para corte manual de pagamentos/auditoria.
