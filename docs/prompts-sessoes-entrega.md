# Prompts até o MVP na Play

Versão de 19/11/2026. Continua o [CP 165](checkpoints-roadmap.md#cp-165-n2-conectar-com-mercado-pago-oauth-no-servidor-e-gateways-do-lojista-18112026). As versões anteriores (N1–N4, M1–M5, blocos 1 a 23) estão no histórico do git.

**O que é o MVP (decisão do usuário em 19/11/2026):** o app **publicado na Google Play e aberto a qualquer pessoa**, com 3 lojistas que ajudam a melhorar o produto. O MVP inclui:
- as funções de PDV que o plano promete funcionando;
- os pagamentos integrados do lojista;
- a **cobrança da assinatura dentro do app**.

A cobrança pode estrear desligada, em modo gratuito por configuração, e ser ligada depois sem nova versão.

## Respostas do usuário (19/11/2026)

**Conta da Play (lida no Console em 19/11):**
- conta **pessoal**, criada em **29/10/2026**, ainda sem nenhum app;
- já tem perfil para pagamentos, mas falta cadastrar a forma de recebimento e aderir à taxa de serviço de 15%;
- o status de comerciante está pendente, com prazo até fev/2027;
- a verificação de desenvolvedor Android, com o registro do nome do pacote, também está pendente.

**Teste fechado obrigatório:** conta pessoal criada depois de 13/11/2023 precisa de **12 testadores por 14 dias seguidos** antes de pedir acesso à produção ([ajuda da Play](https://support.google.com/googleplay/android-developer/answer/14151465)). O usuário vai **juntar 12 conhecidos**: os 3 lojistas mais amigos e família com Android. Como esse prazo é o gargalo, o teste fechado começa **no início do prompt 1**, com o AAB atual, e as versões novas entram na mesma faixa.

**Demais decisões:**
- **Design:** direção **B · Solar Balcão** do protótipo v2.2.
- **Fiado no checkout (P3):** backlog, porque depende de cadastro de cliente na venda.
- **Comerciante:** usar o CNPJ do usuário, se a Play aceitar numa conta pessoal; o agente pergunta o número na sessão, sem gravá-lo no repositório. Se não aceitar, declarar comerciante e distribuir só no Brasil.
- **Cobrança:** modelo **Free + Pago** (o pago para escalar). O usuário ainda está definindo as regras. O app estreia todo gratuito, e a cobrança fica pronta e desligada, para ser ligada depois.
- **Maquininhas dos lojistas:**
  - Mercado Pago e InfinitePay: integrar;
  - Point: só se o modelo for Point Smart ou Pro, e o agente pergunta;
  - Stone e outras: confirmação manual identificada.

**Como usar:** uma sessão nova em **Opus 5.5** para cada prompt, na ordem. O Opus orquestra e revisa; o trabalho vai para subagentes. Se a sessão encher o contexto ou parar no meio, abra outra e cole **o mesmo prompt**: ele retoma do último checkpoint.

| # | Prompt | O que fica com você |
|---|---|---|
| 1 | Teste fechado já + produto completo | Criar o app e o teste fechado no Console, convidar os 12 testadores, conectar o celular por USB, digitar as senhas da chave e autorizar o deploy e os pagamentos reais de R$ 1,00 |
| 2 | Publicar na Play | Status de comerciante, ficha e pedido de produção no Console, autorizar produção |
| 3 | Rodada do MVP (repetível) | Relatar o que os lojistas disseram e decidir quando ligar a cobrança |

## Já feito

- **Núcleo de PDV homologado no Android:** venda, caixa por usuário, offline, equipe, estoque, fiado, lojas, suporte, privacidade e restauração (CPs 105–157).
- **Produção:**
  - produção zerada, API implantada e versão 0.1.19 com catálogo gratuito (CP 161);
  - Pix do Mercado Pago e "Conectar com Mercado Pago" prontos no servidor, ainda sem telas (CPs 164–165);
  - pacote de design e protótipo v2.2 aguardando a escolha da direção (CPs 159–163).

## Regras

1. **Leitura:** ler `AGENTS.md`, o roadmap e o último checkpoint. No arquivo de checkpoints, buscar por número em vez de ler tudo.
2. **Branch e autorizações:**
   - trabalhar na branch atual, sem criar branch nem worktree;
   - commit e push estão autorizados, com CI acompanhado até o resultado;
   - deploy, produção, dados apagados e qualquer valor real só com autorização do usuário na sessão.
3. **Segredos:** nenhum segredo, token, chave ou código de acesso em arquivo ou na conversa. O usuário digita senhas e códigos direto no app, no terminal ou no painel.
4. **Testes:** todo cenário e todo defeito vira teste automatizado. O que roda sem rede externa entra no CI. O aparelho, via `scripts/pdv-android-ui.py --fisico` e `scripts/fluxos/`, fica só para o que precisa de aparelho.
5. **Subagentes:**
   - Sonnet 5.5 para código e varreduras, Opus 5.5 para dinheiro, produção e arquitetura, Haiku 5.5 para tarefas mecânicas;
   - nunca dois subagentes escrevendo nos mesmos arquivos;
   - o orquestrador revisa o diff e roda os testes antes de aceitar.
6. **Checkpoint:** a cada entrega, registrar o checkpoint seguinte (maior número mais um), com o tipo da evidência, e atualizar o roadmap. Não pedir licença para o que o prompt já descreve.

Decisões que continuam valendo:
- catálogo só com fontes gratuitas;
- sem contato com provedores, e o que a documentação pública não proíbe é permitido;
- o dinheiro dos pagamentos cai na conta do próprio lojista;
- a conta "Loja Teste M4" pode ser zerada;
- o usuário testa a cobertura de aparelhos.

## 1. Teste fechado já e produto completo

```text
Siga as regras de docs/prompts-sessoes-entrega.md. Leia os CPs 158–165, docs/pacote-melhorias-design.md, docs/pesquisa-pagamentos.md e docs/produto-planos-e-cobranca.md.

Objetivo: deixar o app completo para a Play aberta, com design final, pagamentos integrados do lojista e cobrança da assinatura no app, ligável por configuração. Você é o orquestrador; distribua o trabalho em subagentes paralelos sem sobrepor arquivos.

0. Primeiro, o teste fechado, porque o prazo de 14 dias só começa quando os 12 testadores entram:
   - guiar o usuário no Console: criar o app (pacote br.com.pdv.mobile), registrar o pacote na verificação de desenvolvedor Android, ficha mínima, segurança de dados, URL de privacidade e classificação;
   - enviar para a faixa de teste fechado o AAB de produção mais recente aprovado (0.1.19 ou posterior);
   - montar a lista de testadores com os e-mails que o usuário digitar no Console, fora do repositório;
   - preparar uma mensagem curta de convite com o link de opt-in;
   - registrar no checkpoint a data em que o 12º testador entrou e a data prevista para pedir produção.
   Em seguida, conferir o que o plano anunciado promete e listar as lacunas que um lojista novo encontraria (cadastro, primeira venda, caixa, estoque, fiado, equipe, lojas, relatórios, suporte). Decisões já tomadas: direção visual B · Solar Balcão, e fiado no checkout (P3) no backlog.

1. Em paralelo, só servidor e pacotes:
   a) InfinitePay: Checkout Integrado com o handle do lojista, aviso sem assinatura confirmado sempre por payment_check, reaproveitando a base do Mercado Pago (idempotência, estados, reconciliação). Estorno fica manual identificado.
   b) Assinatura pela Google Play Billing no modelo Free + Pago, com limites e preço do plano pago configuráveis no catálogo PLANOS (packages/shared). Perguntar ao usuário se as regras do Free e do Pago já estão definidas; senão, deixar configuráveis e com o Free como padrão para todos. Num desenho próprio, sem forçar a interface BillingProvider de cartão:
      - validar o purchaseToken, liberar só em estado comprado e confirmar a compra em até 3 dias;
      - notificações em tempo real duplicadas e fora de ordem;
      - teste grátis, atraso, cancelamento e reativação;
      - bloqueio que preserva consulta, recuperação e exportação, sem nunca limitar vendas;
      - modo gratuito por configuração no servidor, que é o padrão.
      Escolher a biblioteca compatível com Expo 58 e React Native 0.88 e com a versão exigida hoje pela Play.
   c) Stone, InfiniteTap e outras maquininhas: confirmação manual identificada, com o motivo tirado da documentação. Perguntar se o lojista do Mercado Pago usa Point Smart ou Pro; só nesse caso integrar o Point por API.

2. Em ondas, no app, depois de aprovada a direção visual:
   - integrar o pacote de design na direção B · Solar Balcão (tokens, marca, componentes e telas operacionais), corrigindo os defeitos de layout com fonte grande e tela pequena;
   - em seguida, as telas novas: conectar maquininha (Mercado Pago e InfinitePay), QR do Pix e status do pagamento na venda, paywall e assinatura, e a lacuna da etapa 0 que impeça o uso.

3. Fechar a versão:
   - typecheck e testes;
   - CI;
   - deploy da API em homologação e depois em produção, com backup antes e autorização;
   - versionCode novo, AAB e APK universal, com o usuário digitando as senhas da chave;
   - enviar o AAB novo para a mesma faixa de teste fechado.

4. No aparelho por USB:
   - instalar e rodar os fluxos de scripts/fluxos/ e um cadastro do zero;
   - um Pix de R$ 1,00 no Mercado Pago e um pagamento de R$ 1,00 na InfinitePay, cada um com autorização;
   - o paywall com um testador de licença da Play, se o app já estiver no Console; senão, deixar para o prompt 2.

Pronto quando: teste fechado com 12 testadores e data prevista registrada; versão nova na faixa de teste com CI verde e API implantada; pagamentos confirmados automaticamente no aparelho; cobrança testada e desligada por configuração; lacunas resolvidas ou registradas com o motivo.
```

## 2. Publicar na Play

```text
Siga as regras de docs/prompts-sessoes-entrega.md. Leia docs/play-console-teste-interno.md e o último checkpoint. Pré-requisito: prompt 1 concluído.

Objetivo: o app publicado na Google Play, aberto a todos, com os 3 lojistas usando.

1. Conferir no Console se os 12 testadores completaram 14 dias seguidos. Se não, informar quantos dias faltam e parar. Depois, pedir o acesso à produção, respondendo o questionário com o que os testadores relataram.
   Antes de vender, completar no Console:
   - status de comerciante: perguntar o CNPJ do usuário e verificar se a conta pessoal aceita usá-lo; senão, comerciante com distribuição só no Brasil;
   - forma de recebimento no perfil para pagamentos;
   - adesão à taxa de serviço de 15%.
2. Ficha completa redigida em docs/:
   - textos e capturas geradas no aparelho pelo driver, com dados sintéticos;
   - segurança de dados, declaração de recursos financeiros, classificação, URLs de privacidade e exclusão;
   - produtos e planos da assinatura.
   Guiar o usuário passo a passo no Console. Nenhuma chave no repositório.
3. Com um testador de licença no aparelho, testar compra, teste grátis, renovação, falha de pagamento, cancelamento, reembolso e restauração. O agente conduz o app e o usuário confirma na folha da Play. Conferir as notificações no servidor e voltar a cobrança ao modo gratuito se o usuário quiser estrear sem cobrança.
4. Perguntar se a cópia externa de backup entra antes de abrir ao público.
5. Liberar em produção com lançamento gradual, conferir saúde da API, cadastro real e a instalação pelos 3 lojistas.

Pronto quando: app publicado e instalável por qualquer pessoa, lojistas usando, e versão, SHA e procedimento de retorno registrados.
```

## 3. Rodada do MVP (repetível)

```text
Siga as regras de docs/prompts-sessoes-entrega.md. Leia o último checkpoint e docs/monitoramento-piloto.md.

Objetivo: acompanhar o MVP no ar e melhorar o app com os lojistas.

1. Rodar o monitoramento: API, e-mail, filas, backup, erros e avaliações da Play.
2. Ler os relatos do usuário e os diagnósticos do suporte. Separar defeitos de melhorias e priorizar o que causa perda ou duplicação financeira, acesso indevido, queda ou pagamento não confirmado.
3. Corrigir com subagentes, cada correção com teste, e publicar nova versão em lançamento gradual com autorização.
4. Quando o usuário decidir, ligar a cobrança por configuração, conferindo antes o teste grátis e o bloqueio em uma conta de teste.
5. Na primeira rodada, combinar o critério de MVP estável; quando ele for atingido, montar a matriz de evidências e registrar o aceite somente com a confirmação do usuário.

Pronto quando: rodada registrada com o que foi corrigido, o que ficou para depois e o próximo passo.
```

## Fora do MVP

- TalkBack completo, disco cheio (F10), mudança de relógio, F13 com dois Androids reais e execução real do retorno da API (F19).
- E-mail separado por ambiente, alertas automáticos e fontes pagas de catálogo.
- Stone integrada, que depende de parceria.
- Fiado direto no checkout (P3), que depende de escolher o cliente na venda.
