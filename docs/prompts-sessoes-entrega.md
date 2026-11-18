# Próximos prompts até o MVP funcionar

Versão de 17/11/2026, simplificada pelo usuário. Continua o CP 158 e o CP 159 de [checkpoints-roadmap.md](checkpoints-roadmap.md). As versões anteriores (M1–M5, P1–P5, E1–E4 e os blocos 1 a 23) estão no histórico do git.

**Foco:** validar pagamento e fazer o MVP funcionar. Nada de escopo complexo.

## Decisões do usuário (17/11/2026)

- **Fontes de catálogo: só gratuitas.** Sem contrato e sem token pago.
- **Provedores de pagamento: sem contato.** Tudo se descobre pela documentação pública. O que a documentação não proíbe nem exige como regra é tratado como permitido.
- **Conta de teste da produção ("Loja Teste M4"): pode ser zerada** (confirmado).
- **Play só com o app pronto.** O lojista disponível será testador enquanto o piloto roda sem cobrança.
- **Cobertura de dispositivos:** o usuário testa pessoalmente.
- **Design:** outro agente trabalha no [pacote de melhorias de design](pacote-melhorias-design.md). Não mexer em telas, tema, assets, `tokens.ts` nem `paginasPublicas.ts` até esse pacote estar integrado. Pagamento e catálogo começam pelo servidor.
- **Modelos:** o orquestrador pode ser o Sonnet 5.5, mas o que mexe em produção, dinheiro ou contrato vai para subagentes Opus 5.5.

## Situação

| O quê | Situação | Registro |
|---|---|---|
| Blocos 1–7 e sessões M1–M3 | Concluídos | CPs 105–155 |
| M4 (produção e AAB 0.1.18) | Pronto; só falta o Console da Play, que passa para o fim | CPs 156, 157 |
| Toast de licença | Correção de uma causa provável, testada; falta confirmar no aparelho | CP 158 |
| Pesquisa de catálogo e rascunhos de contato | Feitas; os rascunhos não serão enviados | CP 158 |
| Pesquisa de pagamentos, catálogo gratuito e script para zerar a conta | Em andamento com subagentes Opus | CP 159 |

## Próximos prompts, em ordem

| # | Sessão | Modelo | O que fica com você |
|---|---|---|---|
| N1 | Fechar a base e gerar a 0.1.19 | Sonnet 5.5 orquestra, Opus 5.5 no que mexe em produção | Digitar as senhas da chave e testar no aparelho |
| N2 | Pagamento: Pix do Mercado Pago | Opus 5.5 | Conta de teste e uma cobrança pequena, com sua autorização |
| N3 | Pagamento: Checkout da InfinitePay (Stone e InfiniteTap ficam manuais identificados) | Opus 5.5 | Um pagamento real de R$ 1,00 na InfinitePay, com sua autorização |
| N4 | Fechar o MVP: Play, lojista testador e aceite | Sonnet 5.5 nas rodadas, Opus 5.5 no aceite | Console da Play, uso com o lojista e o aceite |

N2 e N3 só mexem em telas depois de o pacote de design estar integrado.

## Depois do MVP (não bloqueia)

- **P1.** Assinatura do lojista pela Play (Google Play Billing).
- **P2.** Publicação aberta e teste fechado da Play.
- **P5.** Encerramento com os critérios do roadmap.
- **Backlog:** acessibilidade e fonte grande (F18); disco cheio (F10) e mudança de relógio; F13 com dois Androids; e-mail separado por ambiente; cópia externa de backup e alertas; execução real do retorno da API (F19); fontes pagas de catálogo.

## Regras comuns

1. Ler `AGENTS.md`, o roadmap, o último checkpoint e só os documentos citados no bloco. Em `docs/checkpoints-roadmap.md`, buscar por número de CP em vez de ler o arquivo inteiro.
2. Branch atual, sem criar branch ou worktree. **Commit e push na branch atual estão autorizados ao fim de cada sessão**, com o CI acompanhado até o resultado. Sem PR. Deploy e produção só com autorização explícita do usuário na sessão.
3. Antes de apagar ou sobrescrever dados (banco, app, aparelho), mostrar o alvo e o impacto e aguardar confirmação. Nunca repetir uma operação financeira sem antes conferir se ela foi gravada.
4. Nenhum segredo, token ou código de acesso em arquivos ou na conversa. O código de acesso é digitado pelo usuário; se ele autorizar na sessão, o agente usa caixa de e-mail descartável, como nos CPs 147 e 148, sem imprimir o código.
5. **Teste automatizado primeiro.** Todo cenário executado e todo defeito encontrado vira teste automatizado, no nível mais barato que o cubra (unitário, integração da API, script HTTP em `scripts/homologar-*.mts` ou fluxo do driver em `scripts/fluxos/`). Testes que rodam sem rede externa entram no CI.
6. Aparelho: qualquer Android, via ADB e `scripts/pdv-android-ui.py --fisico`. Para modo avião, usar cabo USB (o driver recusa em ADB por Wi-Fi). Restaurar toda configuração alterada e registrar fabricante, modelo e versão do Android, sem número de série.
7. **Escopo MVP:** corrigir só o que bloqueia o MVP, ou seja, perda ou duplicação financeira, acesso indevido, queda do app, pagamento não validado ou fluxo principal impedido. O resto vai para o backlog do roadmap, com referência ao CP. Mudança de runtime exige nova versão (versionCode) e CI.
8. Evidência com tipo: teste automatizado, CI, HTTP, aparelho via ADB, relato do usuário ou aceite. Marcar `[x]` no roadmap só com a implementação e a validação concluídas.
9. Ao terminar, registrar o checkpoint seguinte (maior número mais um), atualizar o roadmap e responder com o link, o resultado e o próximo passo. Não pedir licença para executar passos já descritos no bloco.
10. **Subagentes:** nunca dois escritores nos mesmos arquivos. Cada subagente recebe escopo, arquivos permitidos e proibidos e critério de pronto. O orquestrador revisa o diff e roda os testes antes de aceitar.

## N1. Fechar a base e gerar a 0.1.19

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 158 e o CP 159 de docs/checkpoints-roadmap.md.

Objetivo: deixar a base limpa e testada, com a 0.1.19 no aparelho.

1. Revisar e integrar o que os subagentes do CP 159 entregaram: catálogo com fontes gratuitas (apps/api e packages/shared) e script para zerar a conta de teste. Rodar typecheck e as suítes em série.
2. Zerar a conta de teste da produção ("Loja Teste M4"): o usuário já confirmou o alvo (1 conta, 1 loja, 1 venda, 1 caixa). Antes, ensaiar o script com psql real num banco descartável chamado pdv (o bloco \if do psql só foi testado simulado). Fazer o backup do pdv-postgres antes, rodar scripts/zerar-conta-teste-producao.sql pelo console com os parâmetros do procedimento em docs/zerar-conta-teste-producao.md e conferir que a produção ficou com 0 contas e as migrações intactas. Se algo divergir do esperado, parar e mostrar ao usuário.
3. Incluir na 0.1.19 a correção do toast e o catálogo gratuito. Se o pacote de design já estiver integrado e aprovado no CI, ele entra junto; se não, fica de fora. A atribuição da licença do Open Food Facts (campo `atribuicao` do contrato) é obrigatória e precisa aparecer na tela da sugestão do cadastro: fazer isso na tela já com o design integrado. Implantar a API (o catálogo novo só vale depois do deploy) com autorização do usuário, backup antes.
4. Rodar CI, gerar o AAB (o usuário digita as senhas da chave) e o APK universal, desinstalar o app no aparelho com autorização, instalar e refazer com o usuário o cadastro do zero (etapa do código, "Alterar dados", teclado, "Já tenho conta" fora da tela da loja).
5. Por cabo USB: rodar os fluxos de scripts/fluxos/ e a venda offline, e ler o diagnóstico do app para ver se o toast de licença voltou. Bipar 5 produtos diferentes e conferir o nome e a fonte sugeridos.
6. Cada falha vira teste automatizado.

Pronto quando: produção com 0 contas, onboarding conferido, toast sem recorrência (ou causa nova tratada) e versão, SHA e retorno registrados.
```

## N2. Pagamento: Pix do Mercado Pago

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/pesquisa-pagamentos.md (se não existir, parar e informar), os CPs 101 e 103 e o item R6 do roadmap.

Objetivo: o app confirmar de verdade que o cliente pagou o Pix pelo Mercado Pago, pelo caminho mínimo da documentação, com a confirmação manual identificada como alternativa.

1. Seguir o escopo recomendado na pesquisa. Não usar OAuth nem parceria se a documentação permitir o mais simples (por exemplo, o lojista informar a própria credencial). Credenciais só no servidor, inseridas pelo usuário no ambiente, nunca no repositório.
2. Servidor primeiro: criar a cobrança com chave de idempotência e referência ligada à venda; receber o aviso (webhook) com assinatura validada e confirmar consultando a cobrança no provedor, sem casar por valor. Tratar aviso duplicado e fora de ordem, valor divergente, pagamento tardio e venda abandonada.
3. Só depois da integração do pacote de design: o QR na tela de pagamento e a tela de conexão do lojista, mínimas.
4. Testes automatizados de cada caso com o provedor simulado, e validação com a conta de teste do Mercado Pago. Qualquer valor real só com a autorização do usuário na sessão.

Pronto quando: um Pix de teste é confirmado no servidor e a venda é marcada como paga sem ação manual, com os casos de falha testados.
```

## N3. Pagamento: Checkout da InfinitePay

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/pesquisa-pagamentos.md e o código da N2. Pré-requisito: N2 concluída.

Objetivo: o mesmo "pago de verdade" para a InfinitePay pelo Checkout Integrado, e deixar claro no app o que continua manual. Sem contatar provedores.

1. InfinitePay: o lojista informa o próprio handle ou chave; o servidor cria o link do Checkout (Pix e cartão), recebe o aviso (que não é assinado) e confirma sempre pela consulta payment_check, nunca pelo corpo do aviso. Reaproveitar a base da N2 (cobrança ligada à venda, idempotência, estados, reconciliação).
2. Sem ambiente de teste: todo valor real, mesmo R$ 1,00, exige a autorização do usuário na sessão. O estorno só existe no app da InfinitePay e aparece como manual identificado.
3. Stone e InfiniteTap: por documentação, a Stone não tem caminho sem parceria e o InfiniteTap devolve o resultado só ao aparelho. Ficam como confirmação manual identificada ("confirmado no aparelho"), escrito assim na própria tela, sem anunciar como integrado. Incluir a Stone no enum de provedores para o registro manual.
4. Point do Mercado Pago só entra se o usuário disser que tem ou quer um Point Smart ou Pro.
5. Testes automatizados com o provedor simulado e validação com a cobrança pequena autorizada.

Pronto quando: a InfinitePay está integrada e testada e o restante está registrado como confirmação manual com o motivo tirado da documentação.
```

## N4. Fechar o MVP: Play, lojista testador e aceite

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia docs/play-console-teste-interno.md e o CP 157.

Objetivo: colocar o app com o lojista testador e decidir o aceite.

1. Guiar o usuário no Console da Play: criar o app, enviar o AAB da versão aprovada, ficha mínima, segurança de dados, URL de privacidade e lista de testadores (e-mails fora do repositório).
2. Confirmar a instalação pela Play e um cadastro real com o lojista testador.
3. Rodadas: executar o roteiro de monitoramento (docs/monitoramento-piloto.md), ler os relatos do usuário e os diagnósticos do suporte, transformar cada problema em teste e corrigir os críticos com nova versão.
4. Rodada de aceite: matriz F01–F17 com APK, SHA, API, aparelho, tipo de evidência e resultado, e a lista de defeitos abertos. Não recomendar aceite com perda ou duplicação financeira, acesso indevido, queda ou pagamento não validado.
5. Registrar o aceite somente com a confirmação explícita do usuário.

Pronto quando: aceite registrado ou lista objetiva do que falta.
```
