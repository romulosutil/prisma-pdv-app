# Prompts por sessão até a entrega (MVP)

Versão de 16/11/2026, enxuta para chegar ao piloto. Continua o [CP 148](checkpoints-roadmap.md#cp-20261116-148-bloco-7-gestao-f14-no-samsung-e-na-api-com-segundo-aparelho-por-http). As versões anteriores, com os blocos 1 a 23, estão no histórico do git.

**Por que mudou:** o usuário pediu foco em MVP. Os blocos 1 a 7 foram concluídos, e o que sobrou foi reagrupado em **cinco sessões até o piloto com lojistas** (M1–M5). Cobrança, maquininhas e publicação aberta ficam para depois do piloto (P1–P5). O restante vai para o backlog. Cada sessão transforma em **teste automatizado** tudo o que executar ou encontrar, para que o próximo reteste seja um comando e não um roteiro manual.

**Como usar:** escolha no app o modelo indicado, copie o bloco e cole como primeira mensagem de uma sessão nova. Rode uma sessão por vez, na ordem.

## Situação

| O quê | Situação | Registro |
|---|---|---|
| Blocos 1–7 (versão de 10/11) | Concluídos | CPs 105–148 |
| Limites herdados | F18 adiado (backlog), F13 sem dois Androids reais, F17 parcial, aceite humano pendente | CPs 145, 147, 148 |

## Caminho até o piloto

| Sessão | Tipo | Modelo | O que fica com você |
|---|---|---|---|
| M1. Testes automatizados e correções | Agente (+ aparelho no fim) | Opus 5.5 | Nada além de manter o aparelho conectado |
| M2. Falhas e restauração | Agente + aparelho | Opus 5.5 | Confirmar ações no servidor de homologação |
| M3. Pronto para o lojista | Agente + aparelho | Sonnet 5.5 | Indicar quem atende o suporte |
| M4. Piloto no ar | Aprovação | Opus 5.5 | Ações no Play Console e autorização de produção |
| M5. Piloto e aceite | Você + agente | Sonnet 5.5 nas rodadas, Opus 5.5 no aceite | Usar com os lojistas, relatar e dar o aceite |

## Depois do piloto

| Sessão | Junta os antigos blocos | Modelo |
|---|---|---|
| P1. Cobrança na Play | 14, 15 | Opus 5.5 |
| P2. Publicação aberta | 16, 17, 18 | Opus 5.5 |
| P3. Mercado Pago | 19, 20 | Opus 5.5 |
| P4. InfinitePay e Stone | 21, 22 | Opus 5.5 |
| P5. Encerramento | 23 | Opus 5.5 |

**Backlog (não bloqueia o MVP):** acessibilidade e layout em fonte grande e tela pequena (F18, CPs 144–145); catálogo por EAN (antigo bloco 12); disco cheio (F10) e mudança de relógio; F13 com dois Androids reais; e-mail separado por ambiente (antigo bloco 3); cópia externa de backup e alertas; execução real do retorno da API (F19), que no MVP fica só documentada.

## Regras comuns

1. Ler `AGENTS.md`, o roadmap, o último checkpoint e só os documentos citados no bloco. Em `docs/checkpoints-roadmap.md`, buscar por número de CP em vez de ler o arquivo inteiro.
2. Branch atual, sem criar branch ou worktree. **Commit e push na branch atual estão autorizados ao fim de cada sessão**, com o CI acompanhado até o resultado. Sem PR. Deploy e produção só com autorização explícita do usuário na sessão.
3. Antes de apagar ou sobrescrever dados (banco, app, aparelho), mostrar o alvo e o impacto e aguardar confirmação. Nunca repetir uma operação financeira sem antes conferir se ela foi gravada.
4. Nenhum segredo, token ou código de acesso em arquivos ou na conversa. O código de acesso é digitado pelo usuário; se ele autorizar na sessão, o agente usa caixa de e-mail descartável, como nos CPs 147 e 148, sem imprimir o código.
5. **Teste automatizado primeiro.** Todo cenário executado e todo defeito encontrado vira teste automatizado, no nível mais barato que o cubra:
   - teste unitário em `packages/shared` ou `apps/mobile`;
   - teste de integração da API com PostgreSQL isolado;
   - script HTTP `scripts/homologar-*.mts`;
   - fluxo do driver versionado em `scripts/fluxos/`.
   Testes que rodam sem rede externa entram no CI (`.github/workflows/pdv.yml`). O aparelho fica só para o que precisa de aparelho, e o passo humano só para o que precisa de uma pessoa.
6. Aparelho: qualquer Android, via ADB e `scripts/pdv-android-ui.py --fisico`, agindo só no pacote `br.com.pdv.mobile.homologacao`. Restaurar toda configuração alterada e registrar fabricante, modelo e versão do Android, sem número de série.
7. **Escopo MVP:** corrigir só o que bloqueia o piloto, ou seja, perda ou duplicação financeira, acesso indevido, queda do app ou fluxo principal impedido. O resto vai para o backlog do roadmap, com referência ao CP. Mudança de runtime exige nova versão (versionCode) e CI.
8. Evidência com tipo: teste automatizado, CI, HTTP, aparelho via ADB, relato do usuário ou aceite. Marcar `[x]` no roadmap só com a implementação e a validação concluídas.
9. Ao terminar, registrar o checkpoint seguinte (maior número mais um), atualizar o roadmap e responder com o link, o resultado e o próximo passo. Não pedir licença para executar passos já descritos no bloco.

## M1. Testes automatizados e correções

**Modelo:** Opus 5.5, que orquestra e revisa, com a escrita dos testes delegada a subagentes Sonnet 5.5.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: transformar em testes automatizados tudo o que os blocos 4 a 7 identificaram e corrigir o que bloqueia o piloto.

1. Levantar, dos CPs 115, 129, 133, 138 e 142–148 e de docs/roteiro-piloto-android.md (F01–F17), os cenários executados e os defeitos. Classificar cada um como já coberto por teste, automatizável (com o nível da regra 5) ou somente humano. Salvar a matriz em docs/testes-automatizados-mvp.md.
2. Escrever os testes que faltam, começando por integridade financeira e acesso:
   - F05–F07: valores de caixa;
   - F08: isolamento;
   - F09 e F11: parcela durável, encerramento forçado, resposta perdida e reenvio sem duplicar;
   - F12: pendências ao atualizar;
   - F13: reserva de turno disputada e transferência;
   - F14: estoque, fiado e recebimentos concorrentes.
   Levar ao CI os cenários de scripts/homologar-equipe.mts e scripts/homologar-gestao.mts que rodam contra a API local.
3. Versionar em scripts/fluxos/ os fluxos do driver usados nos blocos 5 a 7 (abrir caixa, vender, entrada, sangria, retirada, venda offline, fechar) e um comando que rode a regressão no aparelho. Corrigir a ação airplane do driver para desligar também Wi-Fi e dados (CP 145, item d).
4. Corrigir os achados de UX do CP 148 (folha de confirmação e carrinho reaberto) se forem pequenos, com teste. Se não forem pequenos, mandar para o backlog.
5. Rodar typecheck, testes e CI. Se o runtime mudou, gerar nova versão, instalar no aparelho conectado e rodar os fluxos.

Pronto quando: matriz salva, testes novos aprovados no CI, fluxos versionados e, se houve nova versão, regressão no aparelho registrada.
```

## M2. Falhas e restauração

**Modelo:** Opus 5.5. Motivo: julgar perda ou duplicação e mexer em banco.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/roteiro-piloto-android.md (F09, F11, F12, F15, F19) e docs/r5-piloto-backup-suporte.md.

Objetivo: comprovar no aparelho que venda e caixa sobrevivem a falhas, e que a base pode ser restaurada.

1. No aparelho conectado, usando os fluxos de M1:
   - F09: encerramento forçado no meio de uma venda com pagamento dividido e logo após a conclusão;
   - F11: modo avião, encerramento forçado, reinício e rede intermitente;
   - F12: atualizar o APK com venda e fechamento pendentes.
2. F15: gerar um backup novo, restaurar em PostgreSQL isolado e vazio e comparar com scripts/comparar-restauracao.mjs. Mostrar o alvo e aguardar confirmação antes de qualquer ação no servidor.
3. Recuperar a conta numa reinstalação limpa do app e conferir IDs, valores e pendências.
4. F19: documentar o retorno da API para a imagem anterior, com o tempo estimado, sem executar.
5. Cada falha encontrada vira teste automatizado (regra 5).

Pronto quando: F09, F11, F12 e F15 tiverem resultado e a restauração e o retorno estiverem documentados com o tempo gasto.
```

## M3. Pronto para o lojista

**Modelo:** Sonnet 5.5. Motivo: roteiro definido, sem decisão de arquitetura.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/r5-piloto-backup-suporte.md e docs/roteiro-piloto-android.md (F16, F17).

Objetivo: deixar suporte, privacidade e dependências prontos para lojistas reais.

1. Dependências: rodar npm audit nos workspaces e corrigir só o que for de severidade alta ou crítica e alcançável em runtime (scripts/verificar-alcance-audit.mjs). Registrar os demais avisos. Atualização de versão principal precisa de confirmação.
2. Perguntar ao usuário quem atende o suporte e registrar, sem dados pessoais desnecessários.
3. No aparelho, cobrir:
   - F16: envio de suporte, políticas sem sessão e exclusão de conta;
   - F17: o que falta, ou seja, exportação JSON, expiração e limpeza.
   Cada cenário vira teste automatizado.
4. Privacidade e exclusão de conta exigidas pela Play: URL pública sem login, caminho no app e link na web. Corrigir o que faltar.
5. Escrever um roteiro curto de monitoramento diário para o piloto (scripts/verificar-operacao.mjs: API, e-mail, filas e backup), com responsável.

Pronto quando: dependências decididas, F16 e F17 com resultado, URLs públicas funcionando e roteiro registrado.
```

## M4. Piloto no ar

**Modelo:** Opus 5.5. Motivo: produção e Play Console.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101 e scripts/build-android.ps1.

Objetivo: colocar o app nas mãos dos lojistas do piloto pelo teste interno da Google Play, sem cobrança.

1. Perguntar ao usuário:
   - quantos lojistas e quais e-mails de testador ele vai cadastrar (não registrar os e-mails no repositório);
   - se o piloto usa a API de produção (recomendado com dados reais) ou a de homologação;
   - confirmar que a cobrança fica desligada por configuração.
2. Gerar o AAB de produção (pacote br.com.pdv.mobile, target API exigida hoje pela Play, R8 com o leitor funcionando). Instalar o APK universal derivado dele no aparelho e rodar os fluxos de M1.
3. Se for produção: backup, deploy do SHA aprovado no CI com o procedimento de retorno pronto e conferência de saúde. Cada etapa só com autorização explícita.
4. Conferir a regra atual do teste interno da Play e listar, passo a passo, o que o usuário faz no Console: criar o app, Play App Signing, ficha mínima, segurança de dados, URL de privacidade, envio do AAB para o teste interno e lista de testadores. Nenhuma chave entra no repositório.
5. Confirmar com um testador a instalação pela Play e um cadastro real.

Pronto quando: lojistas instalando pelo teste interno, API conferida e versão, SHA e procedimento de retorno registrados.
```

## M5. Piloto e aceite

**Modelo:** Sonnet 5.5 nas rodadas durante o piloto e Opus 5.5 na rodada de aceite.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: acompanhar o piloto com lojistas e decidir o aceite.

1. Na primeira rodada, combinar com o usuário o critério de piloto estável (período, número de vendas, ausência de defeito crítico) e o tratamento das vendas fora da janela offline de sete dias. Registrar.
2. Em cada rodada: executar o roteiro de monitoramento de M3, ler os relatos do usuário e os históricos de diagnóstico enviados pelo suporte, transformar cada problema em teste automatizado e corrigir os críticos com nova versão no teste interno.
3. Na rodada de aceite: montar a matriz F01–F17 com APK, SHA, API, aparelho, tipo de evidência e resultado, e listar os defeitos abertos. Não recomendar aceite com perda ou duplicação financeira, acesso indevido ou queda aberta.
4. Registrar o aceite humano somente com a confirmação explícita do usuário na sessão.

Pronto quando: aceite registrado e P1–P4 liberadas, ou lista objetiva do que falta.
```

## P1. Cobrança na Play

**Modelo:** Opus 5.5.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/produto-planos-e-cobranca.md, os CPs 101 e 102, apps/api/src/billing.ts e packages/shared/src/billing.ts. Pré-requisito: aceite do piloto (M5); sem ele, parar e informar.

Objetivo: assinatura dentro do app por Google Play Billing, com a oferta vigente, teste grátis e as regras comerciais.

1. Propor o desenho antes do código. A interface BillingProvider atual é voltada a cartão e não deve ser forçada a modelar a Play. Escolher a biblioteca compatível com Expo 58 e React Native 0.88 e conferir a versão exigida hoje pela Play.
2. No servidor: validar o purchaseToken, liberar acesso só em estado comprado, confirmar a compra em até três dias e tratar notificações em tempo real duplicadas e fora de ordem.
3. Regras comerciais:
   - cupom e preço vigente;
   - licença offline;
   - limites de usuários, lojas e aparelhos, sem nunca limitar vendas;
   - bloqueio por falta de pagamento que preserve consulta, recuperação e exportação.
4. Testes automatizados de cada estado e transição: teste grátis, ativo, atraso, cancelado e reativado. O modo sem cobrança continua por configuração.
5. Listar o que o usuário cria no Console. Não ativar cobrança em ambiente real.

Pronto quando: implementação e testes aprovados no CI e lista do Console entregue.
```

## P2. Publicação aberta

**Modelo:** Opus 5.5.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Pré-requisito: P1 concluída.

Objetivo: homologar a assinatura real e publicar na Play. Cada ação em produção só com autorização explícita.

1. Ficha completa em docs/: textos, segurança de dados, declaração de recursos financeiros, classificação e capturas geradas no aparelho pelo driver, com dados sintéticos.
2. Perguntar o tipo e a data de criação da conta da Play e conferir a regra atual de teste fechado (por exemplo, 12 testadores por 14 dias em conta pessoal). Se for exigido, orientar e registrar a data prevista.
3. Com testador de licença no aparelho, o agente conduz o app e o usuário confirma na folha da Play: compra, teste grátis, renovação, falha de pagamento, cancelamento, reembolso e restauração. Conferir as notificações no servidor.
4. Perguntar se a cópia externa de backup deve vir antes de abrir para clientes pagantes.
5. Backup, deploy da API compatível, conferência de saúde e lançamento gradual orientado ao usuário.

Pronto quando: app publicado, API de produção conferida e versão, SHA e procedimento de retorno registrados.
```

## P3. Mercado Pago

**Modelo:** Opus 5.5.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia os CPs 101 e 103 e o item R6 do roadmap. Pré-requisito: aceite do piloto (M5).

Objetivo: tela "Conectar minha maquininha" e integração completa do Mercado Pago, mantendo a confirmação manual identificada como alternativa.

1. Reconferir a documentação atual. Conexão por OAuth, com cada lojista recebendo na própria conta e tokens guardados no servidor com renovação.
2. Pix por POST /v1/orders, com external_reference ligado à venda, chave de idempotência e QR no PDV. Webhook com assinatura validada e consulta da order como confirmação, sem casar por valor.
3. Point por API: valor divergente, confirmação tardia, pagamento duplicado, resposta perdida, venda abandonada e pagamento dividido.
4. Estorno real, separando solicitação, confirmação financeira e cancelamento comercial.
5. Testes automatizados de cada caso, inclusive avisos duplicados e fora de ordem, e validação no aparelho com conta de teste. Credenciais inseridas pelo usuário no ambiente. Nenhum pagamento real sem autorização na sessão.

Pronto quando: fluxo completo em homologação e meios homologados listados.
```

## P4. InfinitePay e Stone

**Modelo:** Opus 5.5.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101. Pré-requisito: P3 concluída. Perguntar ao usuário o que cada provedor respondeu; seguir só com os que tiverem resposta ou parceria aprovada.

Objetivo: acrescentar os conectores sobre a base da P3.

1. InfinitePay:
   - deeplink para o InfiniteTap com retorno ao PDV, deixando claro que a confirmação é só no aparelho;
   - Checkout em QR com order_nsu da venda, webhook paid e confirmação por payment_check;
   - estorno sem API, com orientação ao lojista;
   - sem sandbox, então todo valor real exige autorização na sessão.
2. Stone: escolher entre Connect e SDK com leitor Bluetooth conforme a documentação liberada; confirmar a autorização por lojista; cobrança, confirmação, estorno e conciliação; homologação exigida pela Stone.
3. Testes automatizados de cada caso e limites descritos na própria tela de conexão.

Pronto quando: cada conector testado ou o motivo da não integração registrado.
```

## P5. Encerramento

**Modelo:** Opus 5.5.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: verificar se a entrega está concluída.

1. Conferir os oito critérios de conclusão do roadmap, com evidência.
2. Confirmar que todo recurso anunciado funciona com serviço real ou aparece claramente como operação manual.
3. Listar o que ficou fora e o backlog restante.
4. Registrar a conclusão somente com a confirmação do usuário.

Pronto quando: critérios marcados com evidência ou lista objetiva do que falta.
```

## Opcional, a qualquer momento

**Modelo:** Haiku 5.5.

```text
Leia o CP 101 de docs/checkpoints-roadmap.md. Redija, sem enviar, uma mensagem curta para cada provedor (Mercado Pago, InfinitePay e Stone) perguntando: se uma software house pode atender vários lojistas, cada um com a própria conta; como é a autorização; se existe aviso ao servidor para toda venda da conta, inclusive maquininha fora de integração; e como funcionam homologação e estorno. Salve em docs/contato-provedores.md, sem dados pessoais ou credenciais.
```
