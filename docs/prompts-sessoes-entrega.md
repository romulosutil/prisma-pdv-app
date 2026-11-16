# Prompts por sessão até a entrega

Versão de 15/11/2026. Substitui a versão de 10/11/2026 (no histórico do git) e continua do [CP 140](checkpoints-roadmap.md#cp-20261110-140-bloco-5-iniciado-apk-0112-conferido-e-f03-nao-aplicavel). Base: [roadmap](roadmap-app-completo.md) e CPs 100–140. Cada bloco é uma sessão nova do Claude Code: copie o texto do bloco e cole como primeira mensagem.

**O que mudou nesta versão:** os testes no aparelho passam a ser **conduzidos pelo agente** via ADB, em **qualquer Android** (qualquer marca, ou emulador quando o bloco permitir). Você conecta o aparelho e faz só o que exige uma pessoa: digitar código de acesso, apontar a câmera para um produto real, avaliar o que se ouve ou vê (TalkBack, lanterna), agir em contas e consoles, autorizar pagamentos reais e aprovar. Os blocos mantêm a numeração da versão anterior, porque os checkpoints a usam.

**Como usar:** rode uma sessão por vez, na ordem. Todas escrevem no mesmo arquivo de checkpoints e na mesma branch, e rodar em paralelo causa conflito. As exceções estão em "Blocos opcionais".

**Modelo:** escolha o modelo da sessão no app antes de colar o prompt. A coluna "Modelo" indica o recomendado. Nas sessões em Opus 5.5, a sessão orquestra e revisa, e a execução pesada vai para subagentes Sonnet 5.5 (código e varreduras) ou Haiku 5.5 (tarefas mecânicas), conforme as instruções globais. Se a cota de Opus acabar, os blocos 6, 8, 13, 15 e 23 podem rodar em Sonnet 5.5, registrando a troca no checkpoint. Os blocos 9, 14 e 18 a 22 ficam em Opus 5.5.

## Situação

| Bloco | Situação | Registro |
|---|---|---|
| 1. Preparar a 0.1.11 | Concluído | CPs 105 e 106 |
| 2. Limpar a homologação | Concluído | CP 107 |
| 3. Separar o e-mail | Encerrado sem mudança, por decisão do usuário; item de R0 segue aberto | CPs 108 e 109 |
| 4. Ciclo e acesso no aparelho | Encerrado com limites; nenhum item marcado | CP 138 |
| 5. APK e auditoria no aparelho | **Em andamento**: APK 0.1.12 conferido, F03 não aplicável | CPs 139 e 140 |

## Próximos blocos

| Tipo | O que significa |
|---|---|
| Agente | A sessão trabalha sozinha, sem aparelho |
| Agente + aparelho | A sessão conduz o aparelho pelo ADB; você conecta e faz só os passos humanos indicados |
| Aprovação | A sessão prepara e para antes da ação irreversível |

| Bloco | Etapa | Tipo | Modelo | Precisa de | O que fica com você |
|---|---|---|---|---|---|
| 5. APK e auditoria (retomada) | R5 | Agente + aparelho | Sonnet 5.5 | 1 Android com depuração | Código de acesso, ler 1 código de barras real, lanterna, ouvir o TalkBack |
| 6. Dono e dois operadores | R1, R2, R3, R5 | Agente + aparelho | Opus 5.5 | 2 Android, ou 1 Android + emulador | Códigos de acesso de 3 e-mails |
| 7. Gestão no aparelho | R4 | Agente + aparelho | Sonnet 5.5 | Igual ao bloco 6 | Decidir filiais e fiado |
| 8. Falhas no aparelho | R3, R5 | Agente + aparelho | Opus 5.5 | 1 Android + emulador | Nada, salvo aprovar o aparelho de cada cenário |
| 9. Restauração e retorno | R2, R5 | Aprovação | Opus 5.5 | Banco isolado, 2º aparelho ou emulador | Aprovar cada ação em ambiente compartilhado |
| 10. Dependências | R5 | Agente | Sonnet 5.5 | Nada | Aprovar atualização de versão principal |
| 11. Suporte e operação | R5 | Agente + aparelho | Sonnet 5.5 | 1 Android | Indicar o responsável pelo suporte |
| 12. Catálogo (pode ficar para depois) | R4 | Agente + aparelho | Sonnet 5.5 | Lista de EANs, 4G | Lista de EANs e cerca de 10 leituras com a câmera |
| 13. Aceite do piloto | R5 | Aprovação | Opus 5.5 | Blocos 5–11 | O aceite |
| 14. Play Billing | R7 | Agente | Opus 5.5 | Bloco 13, conta na Play | Criar itens no Console |
| 15. Regras comerciais | R7 | Agente | Opus 5.5 | Bloco 14 | Nada |
| 16. AAB e ficha da Play | R7 | Aprovação | Sonnet 5.5 | Conta na Play | Ações no Console |
| 17. Homologação na Play | R7 | Agente + aparelho | Sonnet 5.5 | Testadores | Confirmar compras na folha da Play, testadores |
| 18. Publicação | R7 | Aprovação | Opus 5.5 | Bloco 17 | Autorizar cada etapa de produção |
| 19. Conector e Pix Mercado Pago | R6 | Agente + aparelho | Opus 5.5 | Bloco 13, conta de teste | Credenciais de teste no ambiente |
| 20. Cartão, exceções e estorno | R6 | Agente + aparelho | Opus 5.5 | Bloco 19, maquininha | Passar o cartão de teste |
| 21. InfinitePay | R6 | Agente + aparelho | Opus 5.5 | Bloco 20, resposta do provedor | Autorizar cada valor real |
| 22. Stone | R6 | Agente + aparelho | Opus 5.5 | Bloco 20, parceria aprovada | Passar o cartão de teste |
| 23. Encerramento | Todas | Aprovação | Opus 5.5 | Todos os anteriores | A conclusão |

## Regras comuns

Todos os prompts mandam seguir esta seção.

1. Ler `AGENTS.md`, o estado inicial de `docs/roadmap-app-completo.md`, o checkpoint mais recente de `docs/checkpoints-roadmap.md` e os documentos citados no bloco.
2. Trabalhar na branch atual, sem criar branch ou worktree. Preservar alterações de outros trabalhos.
3. Fazer commit ou push somente se o bloco autorizar. Produção só muda com autorização explícita do usuário na própria sessão.
4. Antes de apagar ou sobrescrever dados, inclusive desinstalar o app ou limpar seus dados no aparelho, mostrar o alvo e o impacto e aguardar confirmação.
5. Não registrar segredos, tokens, chaves ou códigos de acesso. O código de acesso é digitado pelo usuário direto no aparelho ou no prompt de um script `scripts/homologar-*.mts`, nunca na conversa. O agente para na tela do código e continua quando o usuário disser que digitou.
6. Separar as evidências: teste local, CI, HTTP, emulador, **Android físico conduzido pelo agente (ADB)**, Android físico por relato e aceite do usuário são coisas diferentes. Cada resultado no checkpoint diz qual foi.
7. Nunca repetir uma operação financeira para contornar divergência. Antes de refazer um passo interrompido, conferir pelo histórico do app, pela tela ou pela API se ele já foi gravado.
8. Marcar `[x]` no roadmap somente com a implementação e a validação exigidas concluídas. Avanço parcial fica descrito com as pendências.
9. Se um cenário falhar, registrar o defeito, corrigir só o que estiver no escopo e repetir os cenários afetados. Mudança de runtime exige nova versão rastreável.
10. Ao terminar, registrar o próximo checkpoint, com número igual ao maior existente mais um, e informar o link, o resultado e o próximo passo.

### Regras do aparelho

11. **Qualquer Android serve.** Identificar com `python scripts/pdv-android-ui.py --listar` ou `scripts/coletar-piloto-android.ps1` e registrar fabricante, modelo, versão do Android e SDK. Não registrar número de série; o inventário usa o hash. Não assumir marca, launcher ou idioma do sistema; se um passo depender do fabricante, dizer qual alternativa foi usada.
12. **O agente conduz.** Usar o ADB e o driver `scripts/pdv-android-ui.py` (`--dispositivo <serial>`; `--fisico` para aparelho real) para instalar, conferir o hash instalado, tocar, digitar, rolar, forçar encerramento, alternar modo avião, ler a tela e capturar evidências em `builds/`. Pedir ao usuário só os passos humanos do bloco, um por vez, com o resultado esperado, e não inferir o que não foi relatado.
13. **Só o app de homologação.** Agir apenas no pacote `br.com.pdv.mobile.homologacao`. Não abrir outros apps, contas ou arquivos pessoais. Diálogos do sistema (permissão, compartilhamento) só quando o passo pedir.
14. **Configuração do aparelho volta ao normal.** Anotar o valor original antes de mudar fonte, animações, tamanho de tela, modo avião, rede ou permissões, restaurar ao final e listar no checkpoint. Relógio, disco cheio e limpeza de armazenamento só em emulador ou em aparelho que o usuário declarar descartável.
15. **Emulador no lugar de um aparelho real** só quando o bloco permitir e o usuário aprovar na sessão, registrando a troca como limite da evidência.
16. Se o ADB perder o aparelho, pedir para reconectar e retomar do último passo confirmado, aplicando a regra 7.

## Bloco 5. APK e auditoria no aparelho (retomada)

**Modelo:** Sonnet 5.5. Motivo: roteiro definido e muitos passos de ADB; o commit e o CI seguem o padrão do bloco 1.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia os CPs 139 e 140, docs/roteiro-piloto-android.md (F01, F02, F18), docs/correcoes-auditoria-0.1.9.md e docs/auditoria-estatica-android-0.1.8.md.

Objetivo: comprovar no aparelho conectado o APK 0.1.12 e as correções da auditoria, conduzindo pelo ADB. F03 já está registrado como não aplicável (CP 140).

Esta sessão está autorizada a fazer commit e push na branch atual somente para tornar a 0.1.12 rastreável. Não abrir PR, não implantar e não mexer em produção.

1. Rastreabilidade: revisar o diff, commitar a 0.1.12 (app.json, ListaVendas, TelaBusca, useVoltar), o driver scripts/pdv-android-ui.py e as docs pendentes. Disparar o CI como no CP 105/106 e registrar o resultado. Se o bundle do APK não corresponder aos fontes commitados, gerar nova versão antes de seguir.
2. Identificar o aparelho (regra 11) e o que está instalado: pacote de homologação, versão e SHA256 do base.apk.
3. F02, atualização sem perda: se não houver a 0.1.11 instalada, instalá-la (com confirmação) e criar dados: caixa aberto, venda sincronizada e uma venda pendente em modo avião. Atualizar com adb install -r para a 0.1.12, conferir versão e hash instalados, e conferir que vendas, caixa e pendência continuam. Sair do modo avião e confirmar um único envio.
4. F01, instalação limpa: com confirmação, desinstalar só o pacote de homologação e instalar a 0.1.12. Negar a câmera no diálogo do sistema, comprovar a digitação manual, conceder e abrir o leitor. Passos humanos: ler um código de barras real e confirmar se a lanterna acende. Conferir que não há bip duplicado e que o manifesto instalado não pede áudio.
5. Crash do primeiro produto (CP 115): em conta nova com catálogo vazio (o usuário digita o código), salvar o primeiro produto e ler adb logcat -b crash antes e depois. Registrar se a correção defensiva da 0.1.12 resolveu ou não.
6. F18: com valores originais anotados, aplicar fonte máxima, remover animações e reduzir o tamanho de tela. Percorrer abertura de caixa, venda, fechamento e suporte com capturas, conferindo botões cortados e rótulos de acessibilidade em todos os elementos clicáveis. Testar navegação por teclado (TAB/ENTER). Passo humano: ativar o TalkBack e percorrer abertura e venda, relatando o que foi anunciado. Restaurar tudo.
7. Exportação e compartilhamento: gerar a exportação, abrir o seletor, cancelar e compartilhar de novo para um destino local disponível, conferindo arquivo, conteúdo sem credenciais e limpeza local.
8. Repetir as verificações da matriz de correções que dependem de aparelho e marcar cada uma com a evidência obtida.

Pronto quando: 0.1.12 com commit e CI registrados; F01, F02, F18, crash do primeiro produto e verificações da auditoria com resultado e tipo de evidência; configuração do aparelho restaurada.
```

## Bloco 6. Dono e dois operadores

**Modelo:** Opus 5.5. Motivo: duas contas e dois aparelhos ao mesmo tempo, conciliação de centavos e tentativa de acesso indevido.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia docs/roteiro-piloto-android.md (F04–F08, F13) e docs/revisao-pendencias-sync.md.

Pré-requisito: dois aparelhos no ADB e três e-mails acessíveis ao usuário. O segundo aparelho pode ser emulador, se o usuário aprovar (regra 15). Sem dois aparelhos, parar e informar.

Objetivo: comprovar a separação de usuários e de caixas, conduzindo os dois aparelhos pelo driver (--dispositivo de cada um).

1. Dono convida dois usuários. Cada um entra com o próprio código, digitado pelo usuário. Testar alternância, suspensão e pausa/logout.
2. Executar os roteiros F05–F07 com os valores exatos do roteiro em cada aparelho: abertura, vendas, entrada, sangria, retirada e fechamento.
3. Confirmar pela tela que o movimento de um operador não altera o caixa do outro. F08 por HTTP com scripts/homologar-*.mts (o usuário digita o código no prompt do script): tentativa direta recusada e segunda empresa sem acesso.
4. Transferência entre operadores, troca de aparelho e contagem.
5. F13: os dois aparelhos tentam reservar o mesmo turno. Repetir com modo avião nos dois.
6. Comparar IDs e centavos entre as telas dos aparelhos, a API e o relatório consolidado.

Pronto quando: F04–F08 e F13 tiverem resultado e tipo de evidência, e os itens correspondentes de R1, R2, R3 e R5 estiverem atualizados.
```

## Bloco 7. Gestão no aparelho

**Modelo:** Sonnet 5.5. Motivo: roteiro definido sobre a base do bloco 6.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia docs/roteiro-piloto-android.md (F14) e docs/produto-planos-e-cobranca.md.

Objetivo: comprovar a gestão com dono, gerente e dois operadores, nos aparelhos do bloco 6.

Primeiro, verificar quais recursos os planos anunciam. Filiais e fiado são obrigatórios se fizerem parte dos planos; caso contrário, perguntar ao usuário se ficam ocultos ou fora da promessa.

1. Estoque: baixa única, estoque negativo e reenvio sem duplicar.
2. Fiado: parcial, estorno e cancelamento.
3. Recebimentos concorrentes contra o mesmo saldo, um por aparelho, e turno receptor.
4. CSV e compartilhamento, comparando o arquivo com a tela.
5. Alternância de lojas e consolidado, com isolamento entre filiais, conferido também pela API.

Pronto quando: F14 e os itens abertos de R4 tiverem resultado, ou exclusão decidida pelo usuário e registrada.
```

## Bloco 8. Falhas no aparelho

**Modelo:** Opus 5.5. Motivo: provocar falhas no ponto exato e julgar se houve perda ou duplicação.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia docs/roteiro-piloto-android.md (F09–F12).

Objetivo: comprovar que venda e caixa sobrevivem a falhas, usando conta e dados de teste. O agente provoca as falhas pelo ADB no ponto exato.

1. F09: forçar o encerramento logo depois de registrar uma parcela e antes da conclusão; repetir logo após concluir.
2. F10, disco cheio: no emulador ou em aparelho declarado descartável (regra 14). Registrar qual foi usado.
3. F11: modo avião com turno reservado, venda, encerramento forçado, reinício e rede intermitente (alternar modo avião em intervalos curtos).
4. F12: com venda, fechamento e gestão pendentes, atualizar o APK (próxima versão, ou reinstalação -r da mesma, registrando qual) e retomar cada perfil.
5. Alternância de usuário durante pendências no aparelho real; mudança de relógio somente no emulador.

Pronto quando: F09–F12 tiverem resultado, sem perda ou duplicação não explicada.
```

## Bloco 9. Restauração e retorno

**Modelo:** Opus 5.5. Motivo: banco e ambiente compartilhado, com operação destrutiva possível.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia docs/r5-piloto-backup-suporte.md e docs/roteiro-piloto-android.md (F15, F19).

Objetivo: comprovar que o sistema se recupera com o schema atual. Somente homologação e banco isolado.

1. Gerar um backup novo e restaurar em PostgreSQL isolado e vazio. Comparar contagens, IDs e valores com scripts/comparar-restauracao.mjs e os SQL de verificação.
2. Recuperar a conta em aparelho substituto (outro Android ou emulador, regra 15), conferindo pela tela IDs, quantidades, valores e pendências.
3. Comprovar o retorno à versão anterior compatível da API.
4. Se existir instalação antiga com histórico, comprovar o legado. Se não existir, registrar como não aplicável, com confirmação do usuário.

Antes de qualquer ação em ambiente compartilhado, mostrar o alvo e aguardar confirmação.

Pronto quando: F15 e F19 tiverem resultado e o procedimento estiver documentado com o tempo gasto.
```

## Bloco 10. Dependências

**Modelo:** Sonnet 5.5. Motivo: análise e correções pontuais; versão principal só com confirmação.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: concluir a análise das dependências alcançáveis em runtime (item aberto de R5).

1. Levantar os avisos atuais de API, mobile e pacotes compartilhados, incluindo dependências nativas Android e ferramentas pendentes.
2. Classificar cada aviso pelo alcance real em runtime (scripts/verificar-alcance-audit.mjs).
3. Corrigir o que for alcançável, com o menor impacto possível. Atualização que mude comportamento ou versão principal precisa de confirmação.
4. Rodar testes e tipos. Se o runtime mudar, indicar quais cenários de aparelho precisam ser repetidos.

Pronto quando: houver um relatório em docs/ com decisão por aviso e testes aprovados.
```

## Bloco 11. Suporte e operação

**Modelo:** Sonnet 5.5. Motivo: roteiro definido e documentação.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia docs/r5-piloto-backup-suporte.md e docs/roteiro-piloto-android.md (F16, F17).

Objetivo: deixar suporte e operação prontos para o piloto.

1. Perguntar ao usuário quem atende o suporte e registrar o responsável, sem dados pessoais desnecessários.
2. Conduzir no aparelho: suporte, políticas sem sessão, exclusão, resumo opcional, resposta perdida e exportação (F16, F17).
3. Validar o monitoramento manual de API, e-mail, jobs, filas e backup (scripts/verificar-operacao.mjs), com um roteiro de frequência e responsável.
4. Levantar o que falta para a privacidade e a exclusão atenderem à Google Play: URL pública sem login, caminho no app e link na web. Corrigir ou listar para o bloco 16.

Alertas automáticos e cópia externa estão no backlog por decisão do usuário e não entram aqui.

Pronto quando: F16 e F17 tiverem resultado, com responsável e roteiro registrados.
```

## Bloco 12. Catálogo (pode ficar para depois)

**Modelo:** Sonnet 5.5. Motivo: medição por script e pelo driver; a parte só de API caberia no Haiku.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia docs/produto-catalogo-ean.md.

Objetivo: medir a cobertura real do catálogo por código de barras.

1. Pedir ao usuário uma lista de 100 EANs de produtos físicos, digitada ou em fotos dos códigos.
2. Medir pela API (scripts/homologar-catalogo.mts) cobertura e acerto do nome. O usuário confirma só os nomes duvidosos.
3. Medir o tempo no aparelho em 4G digitando os EANs pelo driver, e calcular o p95.
4. Passo humano: cerca de 10 leituras com a câmera, para comparar com a digitação.
5. Verificar o cadastro manual quando a consulta falha. Recomendar se vale outra fonte, sem contratar nada.

Pronto quando: amostra medida e recomendação registrada.
```

## Bloco 13. Aceite do piloto

**Modelo:** Opus 5.5. Motivo: consolidação de todas as evidências e recomendação de aceite.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Objetivo: consolidar o piloto e obter a decisão do usuário sobre avançar.

1. Montar a matriz F01–F19 com APK, SHA, API, aparelho (fabricante, modelo, Android), executor (agente via ADB, usuário, emulador), evidência e resultado.
2. Listar defeitos abertos e cenários a repetir. Não aprovar com defeito aberto de perda ou duplicação financeira, acesso indevido ou cobrança incorreta.
3. Perguntar ao usuário qual período ou amostra de uso conta como piloto estável, e o tratamento das vendas fora da janela offline de sete dias.
4. Conferir o período observado e apresentar a recomendação, incluindo se a cobertura de aparelhos (marcas e versões do Android) é suficiente.
5. Registrar o aceite humano somente com a confirmação explícita do usuário nesta sessão.

Pronto quando: aceite registrado e R6/R7 liberadas, ou lista objetiva do que falta.
```

## Bloco 14. Play Billing

**Modelo:** Opus 5.5. Motivo: desenho novo de cobrança, servidor e estados da assinatura.

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

**Modelo:** Opus 5.5. Motivo: regras de bloqueio que não podem cortar acesso ao histórico financeiro.

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

**Modelo:** Sonnet 5.5. Motivo: script de build, conferências e redação da ficha.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia o CP 101 e scripts/build-android.ps1.

Objetivo: deixar o app pronto para envio à Google Play.

1. Acrescentar a geração de AAB de produção ao script, mantendo os APKs de homologação.
2. Conferir target API exigida, pacote de produção br.com.pdv.mobile, ausência de diagnóstico e R8 com scanner funcionando. Instalar o APK universal derivado do AAB em um aparelho conectado e abrir o leitor pelo driver.
3. Preparar a configuração da chave de envio e do Play App Signing. Nenhuma chave entra no repositório.
4. Redigir em docs/ os textos da ficha, segurança de dados, declaração de recursos financeiros e classificação. Gerar as capturas da ficha no aparelho pelo driver, com dados sintéticos.
5. Conferir URL pública de privacidade e exclusão de conta no app e na web.
6. Listar o que só o usuário pode fazer no Console, incluindo verificação do desenvolvedor, e parar antes de enviar qualquer coisa.

Pronto quando: AAB gerado e inspecionado, textos e capturas prontos e lista de ações do usuário entregue.
```

## Bloco 17. Homologação na Play

**Modelo:** Sonnet 5.5. Motivo: roteiro guiado com testadores e conferência no servidor.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho.

Pré-requisito: blocos 14 a 16 concluídos e o app enviado ao Console pelo usuário.

Objetivo: homologar a assinatura real e cumprir o teste fechado, se a conta exigir.

1. Perguntar o tipo e a data de criação da conta. Pessoal criada após 13/11/2023 exige ao menos 12 testadores por 14 dias contínuos; conferir a regra atual antes de orientar.
2. Com um testador de licença no aparelho, o agente conduz o app até cada compra e o usuário confirma na folha da Play. Cobrir compra, teste grátis, renovação, falha de pagamento, cancelamento, reembolso e restauração.
3. Conferir se a oferta de teste exige forma de pagamento e registrar o resultado.
4. Confirmar no Console a taxa aplicável.
5. Verificar no servidor as notificações duplicadas ou fora de ordem.

Pronto quando: cada cenário tiver resultado registrado e o prazo do teste fechado estiver cumprido ou com data prevista.
```

## Bloco 18. Publicação

**Modelo:** Opus 5.5. Motivo: produção, com autorização a cada etapa.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md.

Pré-requisito: blocos 13 e 17 concluídos.

Objetivo: publicar o app e colocar a API de produção compatível no ar. Ação em produção: apresentar o plano e aguardar a autorização explícita do usuário antes de cada etapa.

1. Conferir o SHA da API, o AAB, as variáveis de produção e o e-mail, sem imprimir segredos. Serviços novos usam o prefixo pdv-.
2. Perguntar ao usuário se a cópia externa de backup deve ser feita antes de abrir para clientes pagantes. Hoje os backups ficam no mesmo servidor.
3. Fazer backup e implantar a API, com o procedimento de retorno pronto.
4. Conferir saúde, cadastro real e compra de teste em produção.
5. Orientar o usuário a liberar a versão em lançamento gradual e acompanhar erros.

Pronto quando: app publicado, API de produção conferida e versão, SHA e procedimento de retorno registrados.
```

## Bloco 19. Conector e Pix Mercado Pago

**Modelo:** Opus 5.5. Motivo: arquitetura do conector, OAuth, webhook e idempotência de pagamento.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia os CPs 101 e 103 e o item R6 do roadmap.

Pré-requisito: aceite do piloto registrado. Sem ele, parar e informar.

Objetivo: criar a base para o lojista escolher o provedor e entregar a primeira integração completa.

1. Desenhar a tela "Conectar minha maquininha", com um único fluxo de venda e um conector por provedor. Marca não integrada, falha ou falta de internet mantêm a confirmação manual identificada.
2. Conexão por OAuth, com cada lojista recebendo na própria conta. Tokens guardados no servidor, com renovação.
3. Pix por POST /v1/orders, com external_reference ligado à venda e chave de idempotência. Mostrar o QR no PDV.
4. Webhook com assinatura validada e consulta da order como confirmação. A venda conclui sozinha, sem casar por valor.
5. Expiração, conciliação e testes automatizados, incluindo aviso duplicado e fora de ordem. Validar o fluxo no aparelho pelo driver, pagando com o usuário de teste do provedor.

Reconferir a documentação atual antes de implementar. Credenciais de teste são inseridas pelo usuário direto no ambiente.

Pronto quando: fluxo completo em homologação, testado com conta de teste do provedor.
```

## Bloco 20. Cartão, exceções e estorno

**Modelo:** Opus 5.5. Motivo: exceções de pagamento e estorno real.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia o CP 101 e o item R6 do roadmap.

Pré-requisito: bloco 19 concluído.

Objetivo: completar a integração do Mercado Pago.

1. Maquininha Point por API. Verificar antes o que muda no uso da maquininha e os modelos compatíveis.
2. Tratar valor divergente, confirmação tardia, pagamento duplicado, resposta perdida, venda abandonada e pagamento dividido. O agente provoca as falhas no aparelho; o usuário só passa o cartão de teste quando pedido.
3. Estorno real, separando solicitação, confirmação financeira e cancelamento comercial.
4. Vincular a conta recebedora ao estabelecimento correto. Vários caixas não significam várias contas.
5. Liberar cada meio somente depois de homologado, mantendo dinheiro, Pix estático e cartão manual identificados.

Não fazer pagamento real sem autorização do usuário na sessão.

Pronto quando: cada cenário tiver resultado em homologação e os meios homologados estiverem listados.
```

## Bloco 21. InfinitePay

**Modelo:** Opus 5.5. Motivo: webhook sem assinatura e testes com valor real.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia o CP 101.

Pré-requisito: bloco 20 concluído. Perguntar ao usuário o que a InfinitePay respondeu sobre software house e aviso por conta.

Objetivo: acrescentar o conector da InfinitePay usando a base existente.

1. Aproximação no celular por deeplink para o InfiniteTap, com retorno ao PDV. A confirmação é só no aparelho, então a interface e o registro devem deixar esse nível claro.
2. Link do Checkout exibido como QR, com order_nsu da venda, webhook paid e confirmação por payment_check, já que o webhook não tem assinatura.
3. Registrar que estorno não tem API e orientar o lojista.
4. Não há sandbox: qualquer teste com valor real exige autorização do usuário na sessão.

Pronto quando: conector testado, com limites descritos na própria tela de conexão.
```

## Bloco 22. Stone

**Modelo:** Opus 5.5. Motivo: integração nova com homologação do provedor.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md, inclusive as regras do aparelho. Leia o CP 101.

Pré-requisito: bloco 20 concluído e parceria aprovada pela Stone. Sem aprovação, parar e informar.

Objetivo: acrescentar o conector da Stone usando a base existente.

1. Com a documentação e as credenciais liberadas, definir o caminho: Connect com pedido na maquininha ou SDK com leitor Bluetooth.
2. Confirmar como cada lojista autoriza a própria conta.
3. Implementar cobrança, confirmação, estorno e conciliação conforme o caminho escolhido.
4. Executar a homologação exigida pela Stone e registrar o resultado.

Pronto quando: conector homologado e liberado somente para os meios aprovados.
```

## Bloco 23. Encerramento

**Modelo:** Opus 5.5. Motivo: verificação final dos critérios de conclusão.

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

**Modelo:** Haiku 5.5. Motivo: só redação curta.

```text
Leia o CP 101 de docs/checkpoints-roadmap.md. Redija, sem enviar, uma mensagem curta para cada provedor (Mercado Pago, InfinitePay e Stone) perguntando: se uma software house pode atender vários lojistas, cada um com a própria conta; como é a autorização; se existe aviso ao servidor para toda venda da conta, inclusive maquininha fora de integração; e como funcionam homologação e estorno. Salve em docs/contato-provedores.md, sem dados pessoais ou credenciais.
```

### Cópia externa de backup e alertas

**Modelo:** Sonnet 5.5. Motivo: configuração com credenciais e comprovação.

Está no backlog por decisão do usuário. Rode somente quando decidir priorizar. A recomendação é antes do bloco 18.

```text
Siga as regras comuns de docs/prompts-sessoes-entrega.md. Leia a seção de backlog do roadmap.

Objetivo: configurar a cópia externa dos backups do PDV e os alertas de falha.

1. Perguntar ao usuário o destino, a retenção e quem recebe os alertas. Serviços novos usam o prefixo pdv-.
2. Configurar em homologação, com credenciais próprias inseridas pelo usuário.
3. Comprovar o envio, a restauração a partir do destino externo e a entrega de um alerta de teste.

Preservar os backups locais existentes. Pronto quando: envio, restauração e alerta estiverem comprovados.
```
