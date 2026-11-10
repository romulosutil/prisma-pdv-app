# Prompts por sessão até a entrega

Versão de 10/11/2026, baseada no [roadmap](roadmap-app-completo.md) e nos CPs 100–103. Cada bloco é uma sessão nova do Claude Code: copie o texto do bloco e cole como primeira mensagem.

**Como usar:** rode uma sessão por vez, na ordem. Todas escrevem no mesmo arquivo de checkpoints e na mesma branch, e rodar em paralelo causa conflito. As exceções estão em "Blocos opcionais".

| Tipo | O que significa |
|---|---|
| Agente | A sessão trabalha sozinha |
| Você + celular | A sessão guia, você executa no aparelho e relata |
| Aprovação | A sessão prepara e para antes da ação irreversível |

| Bloco | Etapa | Passos da lista | Tipo | Precisa de |
|---|---|---|---|---|
| 1. Preparar a 0.1.11 | R5 | 1 | Agente | Nada |
| 2. Limpar a homologação | R5 | 2 | Aprovação | Acesso SQL administrativo |
| 3. Separar o e-mail | R0 | 3 | Aprovação | Conta de e-mail própria |
| 4. Ciclo e acesso no Samsung | R0 | 4, 5 | Você + celular | Samsung |
| 5. APK e auditoria no aparelho | R5 | 14, 15 | Você + celular | Samsung |
| 6. Dono e dois operadores | R1, R2, R3, R5 | 6, 7, 9, 17, 18 | Você + celular | Dois celulares |
| 7. Gestão no aparelho | R4 | 11, 12 | Você + celular | Dois celulares |
| 8. Falhas no aparelho | R3, R5 | 10, 16 | Você + celular | Celular de teste |
| 9. Restauração e retorno | R2, R5 | 8, 19, parte do 22 | Aprovação | Banco isolado, celular substituto |
| 10. Dependências | R5 | 20 | Agente | Nada |
| 11. Suporte e operação | R5 | 21, parte do 22 | Você + celular | Responsável definido |
| 12. Catálogo (pode ficar para depois) | R4 | 13 | Você + celular | 100 produtos, 4G |
| 13. Aceite do piloto | R5 | 23 | Aprovação | Blocos 1–11 concluídos |
| 14. Play Billing | R7 | 24 | Agente | Bloco 13, conta na Play |
| 15. Regras comerciais | R7 | 26, 27 | Agente | Bloco 14 |
| 16. AAB e ficha da Play | R7 | 28, 29 | Aprovação | Conta na Play |
| 17. Homologação na Play | R7 | 25, 30 | Você + celular | Testadores |
| 18. Publicação | R7 | 31 | Aprovação | Bloco 17 |
| 19. Conector e Pix Mercado Pago | R6 | 32, 33, 34 | Agente | Bloco 13, conta de teste |
| 20. Cartão, exceções e estorno | R6 | 35–38, 39 | Agente | Bloco 19 |
| 21. InfinitePay | R6 | 39 | Agente | Bloco 20, resposta do provedor |
| 22. Stone | R6 | 39 | Agente | Bloco 20, aprovação de parceria |
| 23. Encerramento | Todas | 40 | Aprovação | Todos os anteriores |

O bloco 5 vem antes do multioperador, ao contrário da ordem R0–R5, porque um defeito de instalação ou scanner invalidaria as rodadas maiores.

## Regras comuns

Todos os prompts mandam seguir esta seção.

1. Ler `AGENTS.md`, o estado inicial de `docs/roadmap-app-completo.md`, o checkpoint mais recente de `docs/checkpoints-roadmap.md` e os documentos citados no bloco.
2. Trabalhar na branch atual, sem criar branch ou worktree. Preservar alterações de outros trabalhos.
3. Fazer commit ou push somente se o bloco autorizar. Produção só muda com autorização explícita do usuário na própria sessão.
4. Antes de apagar ou sobrescrever dados, mostrar o alvo e o impacto e aguardar confirmação.
5. Não registrar segredos, tokens, chaves ou códigos de acesso. Código de acesso é digitado pelo usuário direto no aparelho.
6. Separar as evidências: teste local, CI, HTTP, emulador, Android físico por relato e aceite do usuário são coisas diferentes.
7. Em teste físico, orientar um passo por vez, informar o resultado esperado, aguardar o relato e não inferir o que não foi relatado. Nunca repetir uma operação financeira para contornar divergência.
8. Marcar `[x]` no roadmap somente com a implementação e a validação exigidas concluídas. Avanço parcial fica descrito com as pendências.
9. Se um cenário falhar, registrar o defeito, corrigir só o que estiver no escopo e repetir os cenários afetados. Mudança de runtime exige nova versão rastreável.
10. Ao terminar, registrar o próximo checkpoint, com número igual ao maior existente mais um, e informar o link, o resultado e o próximo passo.

## Bloco 1. Preparar a 0.1.11

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: tornar a versão 0.1.11 rastreável, com commit e CI próprios, antes de novos testes físicos.

Esta sessão está autorizada a fazer commit e push na branch atual. Não abrir PR, não implantar e não mexer em produção.

1. Revisar o git status e o diff. Conferir que não há segredo nem artefato de builds/.
2. Rodar localmente os testes e a checagem de tipos do mobile e corrigir apenas falhas reais.
3. Agrupar as alterações em commits coerentes. As alterações atuais incluem a correção da lista de produtos, a mensagem de login, testes novos, docs e scripts.
4. Disparar o CI da mesma forma registrada no CP 051 e acompanhar até o resultado.
5. Conferir se o bundle do APK 0.1.11 já entregue corresponde aos fontes commitados. Se não corresponder, gerar nova versão e dizer ao usuário qual APK instalar.

Pronto quando: commits feitos, CI com resultado registrado, e o checkpoint disser qual SHA e qual APK valem para os testes físicos.
```

## Bloco 2. Limpar a homologação

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: decidir e, se confirmado, executar a limpeza da base de homologação do PDV. Operação destrutiva. Nunca tocar em produção.

Atenção: scripts/limpar-homologacao-piloto.sql foi escrito em 03/11 e exige o backup pdv-pre-reset-debug-018-20261103. Esse backup é anterior aos testes no Samsung de 04/11 (CPs 094–100), e a limpeza apagaria também a conta em uso no Samsung e a conta sintética do emulador.

1. Conferir, somente com leitura, o destino pdv_homologacao e a contagem por tabela. Se não houver acesso administrativo verificável, parar e informar (ver CP 039).
2. Fazer um backup novo e comprovar o arquivo.
3. Atualizar a guarda do script para esse backup, mantendo a recusa a qualquer outro banco.
4. Mostrar ao usuário as contagens, o que será perdido e o efeito no aparelho: os dados locais do app precisarão ser reiniciados e o teste físico recomeça do zero.
5. Executar somente após confirmação do usuário nesta sessão. Conferir depois a saúde da API e as contagens.

Pronto quando: limpeza concluída e comprovada, ou decisão de não limpar registrada com o motivo.
```

## Bloco 3. Separar o e-mail

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: isolar a credencial e a cota de e-mail entre desenvolvimento, homologação e produção (item aberto de R0).

1. Inventariar onde a configuração SMTP é lida e o que cada ambiente usa, sem imprimir valores.
2. Propor ao usuário o provedor e o remetente por ambiente. Serviços novos usam o prefixo pdv-.
3. Listar o que o usuário precisa criar. Ele insere as credenciais diretamente no ambiente, sem colar nesta conversa.
4. Aplicar em homologação, implantar somente lá e comprovar o envio real de um código por HTTPS.
5. Deixar o passo de produção documentado, sem executar.

Pronto quando: homologação usa credencial própria com envio comprovado e a etapa de produção está descrita.
```

## Bloco 4. Ciclo e acesso no Samsung

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/roteiro-piloto-android.md, docs/ciclo-venda-caixa-offline-emulador.md e o CP 100.

Objetivo: guiar o usuário no ciclo completo de um operador no Samsung, com a versão definida no bloco 1.

Se a base não foi limpa, retomar da venda em Pix manual do CP 100, sem refazer o que já foi conferido. Se foi limpa, começar por cadastro e produto novos.

Cobrir, nesta ordem:
1. Venda em Pix manual, cartão manual e pagamento dividido.
2. Entrada, sangria e retirada.
3. Modo avião, venda offline, reinício e reconexão sem duplicação.
4. Fechamento com diferença e conferência no servidor.
5. Leitura real de código de barras com a câmera.
6. Login: código expirado, reenvio, limite e recuperação por código.
7. Restauração da conta confirmada em nova instalação autorizada.

Sempre que possível, conferir o resultado também pela API de homologação, sem acessar armazenamento privado do aparelho.

Pronto quando: cada ponto tiver resultado registrado (aprovado, falhou ou não executado) e os itens de R0 estiverem atualizados.
```

## Bloco 5. APK e auditoria no aparelho

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/roteiro-piloto-android.md (F01, F02, F03, F18), docs/correcoes-auditoria-0.1.9.md e docs/auditoria-estatica-android-0.1.8.md.

Objetivo: comprovar no celular o APK exato e as correções da auditoria.

1. Conferir o SHA do APK que será instalado.
2. Guiar: instalação limpa, negar e depois conceder a câmera, scanner, permissões e sessão preservada ao reabrir.
3. Guiar a atualização a partir da versão anterior, sem perder dados. Perguntar ao usuário se alguém ainda usa a 0.1.4; se não, registrar F03 como não aplicável com essa justificativa.
4. Guiar exportação e compartilhamento.
5. Guiar acessibilidade: TalkBack, fonte maior, redução de movimento, teclado e tela pequena.
6. Repetir as verificações marcadas para confirmação física na matriz de correções.

Pronto quando: F01, F02, F03 e F18 e as verificações da auditoria tiverem resultado registrado.
```

## Bloco 6. Dono e dois operadores

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/roteiro-piloto-android.md (F04–F08, F13) e docs/revisao-pendencias-sync.md.

Pré-requisito: dois celulares Android e três e-mails acessíveis. Sem o segundo celular, parar e informar.

Objetivo: comprovar em aparelhos reais a separação de usuários e de caixas.

1. Dono convida dois usuários. Cada um entra com o próprio código. Testar alternância, suspensão e pausa/logout.
2. Cada operador abre o caixa, vende, faz entrada, sangria e retirada, e fecha conforme F05–F07.
3. Confirmar que o movimento de um operador não altera o caixa do outro. Verificar também pela API que a tentativa direta é recusada, e que uma segunda empresa não acessa os dados.
4. Transferência entre operadores, troca de aparelho e contagem.
5. Dois aparelhos tentando reservar o mesmo turno (F13) e modo avião com dois operadores.
6. Comparar IDs e centavos entre aparelho, API e relatório consolidado.

Pronto quando: F04–F08 e F13 tiverem resultado registrado e os itens correspondentes de R1, R2, R3 e R5 estiverem atualizados.
```

## Bloco 7. Gestão no aparelho

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/roteiro-piloto-android.md (F14) e docs/produto-planos-e-cobranca.md.

Objetivo: comprovar a gestão em aparelho real com dono, gerente e dois operadores.

Primeiro, verificar quais recursos os planos anunciam. Filiais e fiado são obrigatórios se fizerem parte dos planos; caso contrário, perguntar ao usuário se ficam ocultos ou fora da promessa.

1. Estoque: baixa única, estoque negativo e reenvio sem duplicar.
2. Fiado: parcial, estorno e cancelamento.
3. Recebimentos concorrentes contra o mesmo saldo e turno receptor.
4. CSV e compartilhamento.
5. Alternância de lojas e consolidado, com isolamento entre filiais.

Pronto quando: F14 e os itens abertos de R4 tiverem resultado, ou exclusão decidida pelo usuário e registrada.
```

## Bloco 8. Falhas no aparelho

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/roteiro-piloto-android.md (F09–F12).

Objetivo: comprovar que venda e caixa sobrevivem a falhas reais, usando conta e dados de teste.

1. Encerramento forçado depois de registrar uma parcela e antes da conclusão (F09).
2. Disco cheio em aparelho descartável (F10). Se o usuário não tiver um aparelho descartável, perguntar se aceita fazer no emulador e registrar essa limitação.
3. Rede intermitente, modo avião, encerramento forçado e reinício (F11).
4. Atualização com venda, fechamento e gestão pendentes (F12).
5. Alternância de usuário e mudança de relógio durante pendências.

Pronto quando: F09–F12 tiverem resultado, sem perda ou duplicação não explicada.
```

## Bloco 9. Restauração e retorno

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/r5-piloto-backup-suporte.md e docs/roteiro-piloto-android.md (F15, F19).

Objetivo: comprovar que o sistema se recupera com o schema atual. Somente homologação e banco isolado.

1. Gerar um backup novo e restaurar em PostgreSQL isolado e vazio. Comparar contagens, IDs e valores usando as ferramentas de comparação do repositório.
2. Guiar a recuperação da conta em aparelho substituto, conferindo IDs, quantidades, valores e pendências.
3. Comprovar o retorno à versão anterior compatível da API.
4. Se existir instalação antiga com histórico, comprovar o legado. Se não existir, registrar como não aplicável, com confirmação do usuário.

Antes de qualquer ação em ambiente compartilhado, mostrar o alvo e aguardar confirmação.

Pronto quando: F15 e F19 tiverem resultado e o procedimento estiver documentado com o tempo gasto.
```

## Bloco 10. Dependências

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: concluir a análise das dependências alcançáveis em runtime (item aberto de R5).

1. Levantar os avisos atuais de API, mobile e pacotes compartilhados, incluindo dependências nativas Android e ferramentas pendentes.
2. Classificar cada aviso pelo alcance real em runtime.
3. Corrigir o que for alcançável, com o menor impacto possível. Atualização que mude comportamento ou versão principal precisa de confirmação.
4. Rodar testes e tipos. Se o runtime mudar, indicar quais cenários físicos precisam ser repetidos.

Pronto quando: houver um relatório em docs/ com decisão por aviso e testes aprovados.
```

## Bloco 11. Suporte e operação

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/r5-piloto-backup-suporte.md e docs/roteiro-piloto-android.md (F16, F17).

Objetivo: deixar suporte e operação prontos para o piloto.

1. Perguntar ao usuário quem atende o suporte e registrar o responsável, sem dados pessoais desnecessários.
2. Guiar no Android: suporte, políticas sem sessão, exclusão, resumo opcional e exportação.
3. Validar o monitoramento manual de API, e-mail, jobs, filas e backup, com um roteiro de frequência e responsável.
4. Levantar o que falta para a privacidade e a exclusão atenderem à Google Play: URL pública sem login, caminho no app e link na web. Corrigir ou listar para o bloco 16.

Alertas automáticos e cópia externa estão no backlog por decisão do usuário e não entram aqui.

Pronto quando: F16 e F17 tiverem resultado, com responsável e roteiro registrados.
```

## Bloco 12. Catálogo (pode ficar para depois)

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/produto-catalogo-ean.md.

Objetivo: medir a cobertura real do catálogo por código de barras.

1. Preparar uma planilha de coleta para 100 produtos físicos: EAN, nome retornado, nome correto e tempo.
2. Guiar o usuário na leitura em 4G e calcular cobertura, acerto e p95.
3. Verificar o cadastro manual quando a consulta falha.
4. Recomendar se vale outra fonte. Não contratar nada.

Pronto quando: amostra medida e recomendação registrada.
```

## Bloco 13. Aceite do piloto

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: consolidar o piloto e obter a decisão do usuário sobre avançar.

1. Montar a matriz F01–F19 com APK, SHA, API, executor, evidência e resultado.
2. Listar defeitos abertos e cenários a repetir. Não aprovar com defeito aberto de perda ou duplicação financeira, acesso indevido ou cobrança incorreta.
3. Perguntar ao usuário qual período ou amostra de uso conta como piloto estável, e o tratamento das vendas fora da janela offline de sete dias.
4. Conferir o período observado e apresentar a recomendação.
5. Registrar o aceite humano somente com a confirmação explícita do usuário nesta sessão.

Pronto quando: aceite registrado e R6/R7 liberadas, ou lista objetiva do que falta.
```

## Bloco 14. Play Billing

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/produto-planos-e-cobranca.md, os CPs 101 e 102, apps/api/src/billing.ts e packages/shared/src/billing.ts.

Pré-requisito: aceite do piloto registrado. Sem ele, parar e informar.

Objetivo: implementar a assinatura dentro do app por Google Play Billing, com os planos de R$ 19,90, R$ 34,90 e R$ 49,90 e teste de 7 dias.

A interface BillingProvider atual é voltada a cartão (verificarCartao, cobrar, estornar) e não modela a Play. Propor o desenho antes de escrever código, sem forçar a Play nessa interface.

1. Escolher a biblioteca de Billing compatível com Expo 58 e React Native 0.88, conferindo a versão exigida hoje pela Play.
2. Compra no app, com o paywall e sem formulário de cartão na assinatura do build da Play.
3. No servidor: validar o purchaseToken, liberar acesso somente em estado comprado, confirmar a compra em até três dias e tratar notificações em tempo real, inclusive duplicadas e fora de ordem.
4. Manter o modo sem cobrança funcionando por configuração.
5. Testes automatizados de cada estado. Listar o que o usuário precisa criar no Console.

Commit somente se o usuário pedir. Não ativar cobrança em nenhum ambiente real.

Pronto quando: implementação com testes aprovados e lista de configuração do Console entregue.
```

## Bloco 15. Regras comerciais

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/produto-planos-e-cobranca.md.

Pré-requisito: bloco 14 concluído.

Objetivo: fazer os limites e o bloqueio comercial funcionarem com a assinatura real.

1. Cupom e preço vigente. Verificar como cupons funcionam com a Play e propor ajuste caso o modelo atual não se aplique.
2. Licença offline e limites de usuários, lojas e aparelhos. Nunca limitar vendas (regra do catálogo PLANOS em packages/shared).
3. Bloqueio por falta de pagamento: impedir novas operações conforme a política, preservando consulta, recuperação e exportação.
4. Testes automatizados de transição: teste grátis, ativo, atraso, cancelado e reativado.

Pronto quando: regras implementadas e testadas, sem cortar acesso ao histórico financeiro.
```

## Bloco 16. AAB e ficha da Play

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101 e scripts/build-android.ps1.

Objetivo: deixar o app pronto para envio à Google Play.

1. Acrescentar a geração de AAB de produção ao script, mantendo os APKs de homologação.
2. Conferir target API exigida, pacote de produção br.com.pdv.mobile, ausência de diagnóstico e R8 com scanner funcionando.
3. Preparar a configuração da chave de envio e do Play App Signing. Nenhuma chave entra no repositório.
4. Redigir em docs/ os textos da ficha, segurança de dados, declaração de recursos financeiros e classificação.
5. Conferir URL pública de privacidade e exclusão de conta no app e na web.
6. Listar o que só o usuário pode fazer no Console, incluindo verificação do desenvolvedor, e parar antes de enviar qualquer coisa.

Pronto quando: AAB gerado e inspecionado, textos prontos e lista de ações do usuário entregue.
```

## Bloco 17. Homologação na Play

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Pré-requisito: blocos 14 a 16 concluídos e o app enviado ao Console pelo usuário.

Objetivo: homologar a assinatura real e cumprir o teste fechado, se a conta exigir.

1. Perguntar o tipo e a data de criação da conta. Pessoal criada após 13/11/2023 exige ao menos 12 testadores por 14 dias contínuos; conferir a regra atual antes de orientar.
2. Guiar, com testadores de licença: compra, teste grátis, renovação, falha de pagamento, cancelamento, reembolso e restauração.
3. Conferir se a oferta de teste exige forma de pagamento e registrar o resultado.
4. Confirmar no Console a taxa aplicável.
5. Verificar no servidor as notificações duplicadas ou fora de ordem.

Pronto quando: cada cenário tiver resultado registrado e o prazo do teste fechado estiver cumprido ou com data prevista.
```

## Bloco 18. Publicação

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Pré-requisito: blocos 13 e 17 concluídos.

Objetivo: publicar o app e colocar a API de produção compatível no ar. Ação em produção: apresentar o plano e aguardar a autorização explícita do usuário antes de cada etapa.

1. Conferir o SHA da API, o AAB, as variáveis de produção e o e-mail próprio, sem imprimir segredos. Serviços novos usam o prefixo pdv-.
2. Perguntar ao usuário se a cópia externa de backup deve ser feita antes de abrir para clientes pagantes. Hoje os backups ficam no mesmo servidor.
3. Fazer backup e implantar a API, com o procedimento de retorno pronto.
4. Conferir saúde, cadastro real e compra de teste em produção.
5. Orientar o usuário a liberar a versão em lançamento gradual e acompanhar erros.

Pronto quando: app publicado, API de produção conferida e versão, SHA e procedimento de retorno registrados.
```

## Bloco 19. Conector e Pix Mercado Pago

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia os CPs 101 e 103 e o item R6 do roadmap.

Pré-requisito: aceite do piloto registrado. Sem ele, parar e informar.

Objetivo: criar a base para o lojista escolher o provedor e entregar a primeira integração completa.

1. Desenhar a tela "Conectar minha maquininha", com um único fluxo de venda e um conector por provedor. Marca não integrada, falha ou falta de internet mantêm a confirmação manual identificada.
2. Conexão por OAuth, com cada lojista recebendo na própria conta. Tokens guardados no servidor, com renovação.
3. Pix por POST /v1/orders, com external_reference ligado à venda e chave de idempotência. Mostrar o QR no PDV.
4. Webhook com assinatura validada e consulta da order como confirmação. A venda conclui sozinha, sem casar por valor.
5. Expiração, conciliação e testes automatizados, incluindo aviso duplicado e fora de ordem.

Reconferir a documentação atual antes de implementar. Credenciais de teste são inseridas pelo usuário direto no ambiente.

Pronto quando: fluxo completo em homologação, testado com conta de teste do provedor.
```

## Bloco 20. Cartão, exceções e estorno

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101 e o item R6 do roadmap.

Pré-requisito: bloco 19 concluído.

Objetivo: completar a integração do Mercado Pago.

1. Maquininha Point por API. Verificar antes o que muda no uso da maquininha e os modelos compatíveis.
2. Tratar valor divergente, confirmação tardia, pagamento duplicado, resposta perdida, venda abandonada e pagamento dividido.
3. Estorno real, separando solicitação, confirmação financeira e cancelamento comercial.
4. Vincular a conta recebedora ao estabelecimento correto. Vários caixas não significam várias contas.
5. Liberar cada meio somente depois de homologado, mantendo dinheiro, Pix estático e cartão manual identificados.

Não fazer pagamento real sem autorização do usuário na sessão.

Pronto quando: cada cenário tiver resultado em homologação e os meios homologados estiverem listados.
```

## Bloco 21. InfinitePay

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101.

Pré-requisito: bloco 20 concluído. Perguntar ao usuário o que a InfinitePay respondeu sobre software house e aviso por conta.

Objetivo: acrescentar o conector da InfinitePay usando a base existente.

1. Aproximação no celular por deeplink para o InfiniteTap, com retorno ao PDV. A confirmação é só no aparelho, então a interface e o registro devem deixar esse nível claro.
2. Link do Checkout exibido como QR, com order_nsu da venda, webhook paid e confirmação por payment_check, já que o webhook não tem assinatura.
3. Registrar que estorno não tem API e orientar o lojista.
4. Não há sandbox: qualquer teste com valor real exige autorização do usuário na sessão.

Pronto quando: conector testado, com limites descritos na própria tela de conexão.
```

## Bloco 22. Stone

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101.

Pré-requisito: bloco 20 concluído e parceria aprovada pela Stone. Sem aprovação, parar e informar.

Objetivo: acrescentar o conector da Stone usando a base existente.

1. Com a documentação e as credenciais liberadas, definir o caminho: Connect com pedido na maquininha ou SDK com leitor Bluetooth.
2. Confirmar como cada lojista autoriza a própria conta.
3. Implementar cobrança, confirmação, estorno e conciliação conforme o caminho escolhido.
4. Executar a homologação exigida pela Stone e registrar o resultado.

Pronto quando: conector homologado e liberado somente para os meios aprovados.
```

## Bloco 23. Encerramento

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: verificar se a entrega está concluída.

1. Conferir cada um dos oito critérios de conclusão do roadmap, com evidência.
2. Confirmar que todo recurso anunciado funciona com serviço real ou aparece claramente como operação manual.
3. Listar o que ficou fora e o backlog restante.
4. Apresentar o resultado e registrar a conclusão somente com a confirmação do usuário.

Pronto quando: critérios marcados com evidência ou lista objetiva do que falta.
```

## Blocos opcionais

Estes podem rodar em paralelo aos demais, desde que não registrem checkpoint ao mesmo tempo que outra sessão.

### Contato com os provedores

```text
Leia o CP 101 de docs/checkpoints-roadmap.md. Redija, sem enviar, uma mensagem curta para cada provedor (Mercado Pago, InfinitePay e Stone) perguntando: se uma software house pode atender vários lojistas, cada um com a própria conta; como é a autorização; se existe aviso ao servidor para toda venda da conta, inclusive maquininha fora de integração; e como funcionam homologação e estorno. Salve em docs/contato-provedores.md, sem dados pessoais ou credenciais.
```

### Cópia externa de backup e alertas

Está no backlog por decisão do usuário. Rode somente quando decidir priorizar. A recomendação é antes do bloco 18.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia a seção de backlog do roadmap.

Objetivo: configurar a cópia externa dos backups do PDV e os alertas de falha.

1. Perguntar ao usuário o destino, a retenção e quem recebe os alertas. Serviços novos usam o prefixo pdv-.
2. Configurar em homologação, com credenciais próprias inseridas pelo usuário.
3. Comprovar o envio, a restauração a partir do destino externo e a entrega de um alerta de teste.

Preservar os backups locais existentes. Pronto quando: envio, restauração e alerta estiverem comprovados.
```
