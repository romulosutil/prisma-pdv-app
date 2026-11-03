# Roadmap do PDV completo com caixa por usuário

Referência: 01/11/2026. Objetivo: colocar o Android em uso real, com várias empresas isoladas, vários usuários por loja e caixa separado por usuário, e depois concluir as integrações e os recursos de gestão. Este roadmap amplia o escopo inicial de uma loja, um operador e um aparelho. As etapas abaixo são entregas planejadas; componentes existentes serão aproveitados e homologados.

O primeiro marco é um PDV conectado, com login real, vários operadores, vendas e caixa individuais, sincronização e recuperação. Dinheiro, Pix estático e cartão manual permitem esse marco enquanto pagamentos integrados e cobrança de assinatura seguem suas próprias etapas.

<a id="revisao-de-prontidao-para-r6"></a>

## Situação real e pendências antes da R6

**Revisão de 03/11/2026: o projeto está na homologação acumulada de R0–R5. O critério para iniciar R6 ainda não foi atendido.** A implementação local de uma etapa não conclui seu critério de avanço. R6 depende de R3 homologada e piloto estável; não há evidência registrada desse piloto. Esta revisão complementa o CP 025, sem invalidar as entregas locais: [CP 026](checkpoints-roadmap.md#cp-20261103-026-revisao-de-prontidao-para-r6).

**Base conectada preparada em 03/11:** fontes R1–R5 fixados na branch exclusiva `codex/pdv-homologacao-real`; candidato `a987c31` aprovado no CI remoto (592 API/PostgreSQL 17, 556 mobile/SQLite, 172 shared, tipos, ferramentas e imagem/isolamento) e implantado somente em homologação. Sete grupos do smoke HTTP autenticado passaram: conta vazia/sem cobrança, equipe/lojas/suporte, reserva concorrente, catálogo real, venda/estoque/reenvio, movimentos/isolamento e fechamento/relatório/exportação. Backups locais anterior e com schema R5 comprovados; restauração atual ainda pendente. [CI e backup, CP 032](checkpoints-roadmap.md#cp-20261103-032-ci-da-hora-real-e-backup-r5-aprovados) · [fluxo externo, CP 033](checkpoints-roadmap.md#cp-20261103-033-fluxo-financeiro-externo-aprovado).

O candidato Android atual **0.1.9/versionCode 10 está gerado, com diagnóstico e pronto para reteste supervisionado no celular**, em `builds/pdv-homologacao-0.1.9.apk`, SHA256 `5fe5118f97dee38c4f92710f9ab433d8f4e7d61cc0cd89d50945ff28ee8448f0`. Os 18 achados da auditoria receberam tratamento nos fontes; CI do commit `df41823` aprovado com 597 API/PostgreSQL 17, 578 mobile e 172 shared (1.347 casos), tipos, ferramentas e imagem/isolamento. API de homologação no mesmo commit, cadastro verificado e recusa de criação sem prova conferidos por HTTPS. APK assinado, R8/shrink ativos com mapping, permissões revistas, diagnóstico local presente, 299 fontes sem divergência e alinhamentos verificados. Export de produção sem telemetria aprovado, sem publicação/implantação em produção. Scanner com R8, teclado/TalkBack, SecureStore, destinatário de arquivos, novo OTP externo e ciclo financeiro/offline ainda exigem execução física; nenhum aceite humano foi inferido. Base de homologação não foi limpa. [Entrega atual, CP 045](checkpoints-roadmap.md#cp-20261103-045-apk-019-pronto-para-reteste) · [matriz dos 18 achados](correcoes-auditoria-0.1.9.md) · [roteiro de reteste](roteiro-piloto-android.md#reteste-das-correções-da-auditoria-na-019). Artefatos anteriores preservados.

**Retorno físico da 0.1.9, 03/11:** diagnóstico recebido com 293 eventos no Samsung SM-S938B/Android 17; login aceito pela API, nova solicitação de código 429 ainda na entrada e chegada posterior à dashboard. Usuário confirmou leitura do código, sem identificação do produto; catálogo respondeu 404 e outra entrada foi considerada EAN inválido. Problema grave no login relatado, comportamento específico em esclarecimento e conclusão de navegação em investigação. Sync final ocioso/zero pendências/rejeições, sem prova do ciclo financeiro; tela branca não pode ser avaliada apenas pelos eventos. [CP 047 e limites](checkpoints-roadmap.md#cp-20261103-047-diagnostico-fisico-019-e-investigacao-do-login). Nenhum cenário completo ou aceite encerrado.

**Correção local do acesso validada:** após esclarecimento do usuário e [diagnóstico CP 048](checkpoints-roadmap.md#cp-20261103-048-causas-do-cadastro-tardio-e-login), e-mail é conferido na primeira tela, CPF/CNPJ após OTP nessa mesma tela antes da loja, e login conclui navegação fora do Stack remontado. Checagem final e prova permanecem na API; novo gate exige verificação antecipada. Evidências locais consolidadas: 593 casos mobile (incluindo cinco HTTP localhost repetidos fora da restrição do sandbox), 41 API/PGlite, tipos e duas ferramentas aprovados; [CP 050](checkpoints-roadmap.md#cp-20261103-050-correcao-local-do-acesso-validada). Fontes locais diferem do APK 0.1.9 existente; API externa sem esta correção. CI PostgreSQL/API de homologação, novo APK/versionamento e [reteste físico](roteiro-piloto-android.md#reteste-ajuste-acesso-pos-019) continuam pendentes; nenhum cenário completo ou aceite encerrado.

| Etapa | O que tem evidência | O que falta para encerrar |
|---|---|---|
| R0 | API conectada, login/recuperação por HTTP, separação do banco de homologação e restauração do schema R0 | APK físico, limites/expiração externos e fechamento do isolamento de credenciais; SMTP de homologação ainda compartilha credencial/cota |
| R1 | Identidades/vínculos/permissões implantados em homologação, CI e contratos HTTP aprovados | Dono + dois usuários com OTP externo, isolamento e SecureStore no Android |
| R2 | CI PostgreSQL aprovado; reserva concorrente, caixa/movimentos e contagem comprovados por HTTP externo | Ciclo financeiro com dois operadores em dois celulares e preservação do histórico no aparelho |
| R3 | Filas/recuperação locais e CI aprovados; reenvio externo idempotente e hora real da API comprovados | Queda/reinício/reconexão/recuperação físicos e tratamento operacional dos conflitos; exportar uma pendência não a resolve |
| R4 | Gestão implantada, CI aprovado; estoque/relatório e EAN real conferidos por HTTP | Ciclo físico de gestão/fiado/filiais; amostra de 100 produtos e p95 em 4G continuam abertos |
| R5 | API df41823 compatível/cadastro verificado, CI PostgreSQL/imagem e 1.347 casos aprovados; 18 achados tratados e APK 0.1.9/R8 inspecionado | Limpeza de homologação, reteste da tela branca/diagnóstico no Samsung, restauração atual, cenários F01–F19, atendimento e aceite humano |
| R6/R7 | Integrações planejadas | R6 aguarda piloto estável; R7 depende também da decisão de cobrança/distribuição |

**Compatibilidade atual:** homologação no commit `df418233899256e33ba3d7c8e5c92fa164ac5185`, com implantação automática desativada e ambiente/fonte preservados. HTTPS confirmou saúde 200 com hora precisa, contrato 1/cadastro verificado e criação sem prova recusada com 400, sem enviar e-mail nem criar conta. CI e implantação nos [CPs 043–045](checkpoints-roadmap.md#cp-20261103-043-ci-e-api-019-em-homologacao); smoke financeiro autenticado anterior permanece como histórico do CP 033. Produção preservada, sem promoção desta rodada.

O APK 0.1.6 e suas evidências do CP 025 foram preservados como histórico. A versão 0.1.7 reúne R1–R5 e a correção de hora; não é necessário gerar um APK histórico para cada etapa. Os itens que combinam geração e homologação continuam abertos pela parte física. Mudanças posteriores nos fontes exigem reavaliar o artefato e as verificações afetadas.

**Orientação do primeiro teste, 03/11:** o APK 0.1.7 não inclui a captura automática de diagnóstico da demo. O piloto combina funcionamento físico, integridade e usabilidade; logs da API e resumo técnico manual do suporte têm alcance limitado. Perguntas e formato de relato registrados no [roteiro](roteiro-piloto-android.md#captura-de-erros-na-017-e-perguntas-do-primeiro-teste) e no [CP 035](checkpoints-roadmap.md#cp-20261103-035-captura-de-erros-e-perguntas-do-piloto). Nenhum cenário físico ou aceite foi concluído por essa revisão documental.

**Primeiro retorno físico, 03/11:** usuário interrompeu o teste da 0.1.7 no Samsung S25 Ultra/Android 17: acesso sem código, nome não sugerido, abertura de caixa não localizada e tela piscando. Piloto não aprovado; cenário financeiro/offline não executado. Diagnóstico de homologação, correções e limpeza da base de teste solicitados; investigação iniciada, sem declarar correção validada no aparelho. [CP 036](checkpoints-roadmap.md#cp-20261103-036-primeiro-relato-fisico-017-e-correcao-em-andamento).

**Candidato 0.1.8 em preparação:** diagnóstico local exportável exclusivo de homologação, abertura de caixa na dashboard e sincronização sem overlay integral construídos e com regressões locais aprovadas. Limpeza autorizada ainda não executada: backup solicitado, conclusão não conferida e acesso administrativo indisponível; SQL com proteção por banco/backup preparado. [CP 037](checkpoints-roadmap.md#cp-20261103-037-diagnostico-018-e-correcao-local-do-fluxo). Preservar o app 0.1.7 no aparelho até orientação de atualização/coleta; nenhum resultado físico novo ou aceite inferido.

**Entrega posterior da 0.1.8/versionCode 9:** APK assinado/verificado em `builds/pdv-homologacao-0.1.8.apk`, SHA256 `339620752c4a8f25d2d1c2a2ac6814ae424a3695719551fa1921b3f16f1fd02e`, 297 fontes conferidos sem divergências, 562 testes mobile locais e duas ferramentas aprovados. Export próprio de produção sem diagnóstico também aprovado. Correção da piscada e compartilhamento ainda exigem reteste no Samsung; cadastro existente/sessão preservada e novo cadastro têm caminhos diferentes de OTP. A base **não foi limpa**: falta acesso SQL verificável e confirmação do arquivo de backup. Atualização não descarta dados/filas locais. [CP 039](checkpoints-roadmap.md#cp-20261103-039-entrega-018-validada-localmente-e-limpeza-pendente) · [artefato e limites](r5-piloto-backup-suporte.md#candidato-conectado-018-com-diagnostico). Nenhum checkbox físico/comercial encerrado.

**Auditoria estática posterior, 03/11:** [relatório da 0.1.8](auditoria-estatica-android-0.1.8.md) com inventário de campos/scroll, 18 achados (5 P1/13 P2), recomendações e 24 cenários UAT. Hash e 297 fontes do APK reconferidos sem divergência; tipos API/mobile/shared, assinatura, alinhamento ZIP e ELF ARM64 de 16 KB aprovados localmente. **Não apto para piloto aberto com usuários reais/operação comercial**: corrigir rejeição não tratada na gestão, escopo da chave Pix para operadores, pausa Android da câmera, vida útil de JSON compartilhado e resolver comprovação de e-mail no cadastro antes da ampliação. Pode apoiar reteste técnico supervisionado em homologação com dados de teste, sem afirmar aceite físico. Demais achados de teclado, fluxo/estoque e hardening devem ser tratados nos cenários afetados. Fontes runtime não alterados por esta auditoria; limpeza, restauração atual e aceite continuam pendentes. [CP 040](checkpoints-roadmap.md#cp-20261103-040-auditoria-estatica-android-018-e-parecer-de-uat).

Ordem para fechar as pendências, vinculada aos checklists existentes:

1. **Concluir acesso e instalação físicos:** a versão rastreável, o PostgreSQL dedicado/CI e a implantação com migrações R1–R5 já foram comprovados. Usar o APK exato para repetir autenticação externa, limites, dono + dois usuários, atualização e SecureStore. Um CI antigo ou `/saude` 200 não substituem esses cenários.
2. **Comprovar integridade financeira e isolamento:** executar F04–F14 com dono, dois operadores, duas empresas e pelo menos dois celulares, incluindo reserva concorrente, transferências, estoque/fiado, fechamento, reenvio e encerramento forçado. Comparar IDs e centavos entre aparelho, API e relatórios.
3. **Fechar recuperação e conflitos:** restaurar backup do schema atual em destino novo e vazio e executar F15/F19. Demonstrar como o operador retoma após os conflitos de turno. Vendas fora da janela offline de sete dias não têm aceite excepcional nesta versão; definir o tratamento comercial autorizado e seus limites antes da expansão, sem alterar payloads, descartar filas ou prometer recuperação do que nunca foi enviado. Ver [procedimento de pendências](revisao-pendencias-sync.md).
4. **Concluir o restante da homologação:** executar F01–F03 e F16–F18, medir catálogo/4G e verificar suporte, jobs, e-mail, execução/retenção efetiva de backup e retorno compatível. Designar atendimento e concluir as definições operacionais/políticas já abertas em R5; concluir a avaliação de dependências conforme o alcance real, sem tratar a auditoria anterior como limpa.
5. **Registrar piloto e decisão de avanço:** completar resultados F01–F19 com APK/SHA/API/executor/evidência, corrigir defeitos e repetir os cenários afetados; definir e registrar o período/amostra de operação observada e o aceite humano. Só então revisar a entrada na R6. Não há duração/amostra de estabilidade nem aceite registrados hoje.

Pendência de evidência não significa defeito já observado. A ausência de teste físico, porém, impede afirmar que o núcleo está homologado. Os checkboxes locais abaixo mantêm seu escopo declarado; não representam aprovação externa ou do usuário. Cópia externa de backup e alertas continuam no backlog autorizado e **não são bloqueios do MVP**. Pagamentos manuais e acesso gratuito continuam válidos; desktop e fiscal mantêm escopo posterior.

## A API do projeto

A API é o servidor do próprio PDV em `apps/api`, feito com Node.js, Fastify, Drizzle e PostgreSQL. O app Android chama esse servidor por HTTPS para cadastrar contas, autenticar usuários, sincronizar produtos/vendas/caixas, recuperar acesso e consultar o catálogo. Não se trata de uma API de pagamento contratada.

O destino documentado é o serviço `pdv-api`, com banco `pdv-postgres`, no projeto `aladdin` do EasyPanel. O endereço registrado é `https://aladdin-pdv-api.jicnzg.easypanel.host`. Na geração do APK 0.1.4, esse host não resolveu no ambiente de compilação; a etapa R0 deve confirmar o endereço e a saúde reais.

O endereço entra no app por `EXPO_PUBLIC_API_URL`. O APK 0.1.4 foi gerado sem essa variável e usa `BackendLocal`: conta, assinatura e catálogo demonstrativos, sem comunicação com a nuvem. Já existem implementações HTTP e de sincronização no projeto; sua ausência nesse APK não significa que precisem ser reescritas.

Resend é o serviço externo de envio de e-mail, e Open Food Facts é uma fonte externa de catálogo. Integrações de pagamento são outro conjunto de serviços, ainda desativadas no fluxo atual.

## O que já existe e o que precisa evoluir

| Área | Base existente | Próxima entrega |
|---|---|---|
| Android | APKs internos conectados, SQLite, SecureStore, produtos, venda e caixa | Homologar o candidato atual no aparelho |
| Acesso | Cadastro, OTP, identidades, vínculos, convites e seleção implementados na API e app | Homologar funcionários com e-mails próprios e Android real |
| Identidades | Usuário separado de empresa e múltiplos vínculos implementados | Homologar isolamento, alternância e recuperação físicos |
| Caixa | R2 construída e validada localmente: turno por usuário, reserva, entradas/saídas, transferências e conferência | Homologar migração/concorrência externa e ciclo físico no Android |
| Autorização | Dono/gerente/operador e permissões por operação no servidor, validados em CI | Homologar UI/dados baixados no Android com cada papel |
| Sincronização | R3 construída e validada localmente: filas/perfis isolados, autorização offline, revalidação, conflitos e restauração | Homologar concorrência externa, SecureStore e recuperação no Android físico |
| Pagamentos | Dinheiro, Pix estático e cartão manual | Processamento externo real e conciliação |
| Assinatura | Simulador e modo de acesso liberado sem cobrança na API | Usar gratuidade real inicialmente; integrar cobrança quando ativada |
| Gestão | R4 construída e validada localmente: movimentos de estoque, relatórios/CSV, clientes/fiado e filiais | Homologar migração/concorrência externa, amostra de catálogo/4G e ciclo físico no Android |

## Modelo de empresas e usuários

Uma empresa mantém seus usuários, lojas, produtos e registros financeiros. Empresas diferentes nunca compartilham esses dados. Dentro da mesma loja, os produtos são compartilhados e as vendas e movimentos conservam a identificação de quem os realizou.

Cada pessoa terá uma identidade própria de acesso e um vínculo com a empresa/loja, contendo papel e permissões. O mesmo usuário poderá participar de mais de uma empresa ou loja e escolher onde trabalhar depois de se autenticar. Isso exige evoluir o login atual, que procura a conta empresarial pelo e-mail do responsável.

| Papel | Acesso planejado |
|---|---|
| Dono | Gerencia empresa, lojas, usuários e permissões; acompanha todos os caixas e autoriza ajustes |
| Gerente | Acompanha e confere os caixas das lojas permitidas; aprova operações conforme permissão |
| Operador | Vende e movimenta seu próprio caixa; consulta seus turnos e solicita operações restritas |

O gerente será um papel novo. A API deve validar cada ação e o vínculo vigente; esconder um botão não substitui autorização. Intervenções de dono/gerente no caixa de outra pessoa identificam tanto o responsável pelo caixa quanto o autor da intervenção.

## Regras do caixa separado

Cada abertura cria um turno de caixa com `contaId`, `lojaId`, `operadorId`, `aparelhoId` e `caixaId`. Vendas, parcelas, movimentos e fechamento pertencem explicitamente a esse turno. O aparelho registra a origem; o operador identifica o responsável financeiro.

No mesmo aparelho, trocar de usuário deve abrir o perfil financeiro correspondente. Para vendas simultâneas, cada operador usa seu aparelho. Quando houver uma gaveta física compartilhada, a passagem de numerário entre responsáveis exige registro de transferência ou troca de turno.

| Operação | Comportamento planejado |
|---|---|
| Abertura | Registra o troco inicial e inicia o turno do usuário |
| Entrada ou suprimento | Adiciona dinheiro externo à gaveta, com valor, origem e motivo; não entra como venda |
| Sangria | Retira dinheiro para cofre ou depósito, identificando destino e responsável |
| Retirada | Registra outra saída, como despesa ou retirada do responsável, com categoria, motivo e autorização |
| Transferência | Saída de um caixa e entrada em outro com o mesmo identificador, sem contar como receita |
| Fechamento | Registra esperado, contado, diferença e conferente; mantém o turno encerrado imutável |
| Correção | Novo evento vinculado ao original, com motivo e autor; preserva o lançamento original |

Sangria e retirada são duas categorias de saída. Uma saída física gera um único lançamento. A regra proposta para diferenciar os nomes é destino cofre/depósito versus outras finalidades.

O dinheiro esperado é: **troco inicial + recebimentos líquidos em dinheiro + suprimentos + transferências recebidas − sangrias − retiradas − transferências enviadas − devoluções efetivamente pagas em dinheiro**. Pix e cartão aparecem nos totais de vendas, mas não aumentam o dinheiro da gaveta.

Exemplo: Ana abre com R$ 100, vende R$ 200 em dinheiro, recebe R$ 50 de suprimento, faz sangria de R$ 80 e retirada de R$ 20. Seu esperado é R$ 250. Bruno abre com R$ 60 e vende R$ 40 em dinheiro: seu esperado é R$ 100. Os dois saldos continuam separados; o dono consegue consultar o consolidado.

A destinação do dinheiro no encerramento deve ser registrada sem descontar a mesma saída duas vezes. A conferência guarda o valor contado antes da destinação final e informa quanto foi recolhido e quanto permaneceu como troco. Cancelar uma venda não comprova devolução bancária ou saída de dinheiro; quando houver devolução, ela terá registro próprio. Fechamentos anteriores não serão recalculados por eventos posteriores.

## Ordem das entregas

| Etapa | Entrega | Depende de | Critério para avançar |
|---|---|---|---|
| R0 | API e ambiente real de testes | Configuração existente | HTTPS saudável, banco persistente, envio de e-mail e APK conectado comprovados |
| R1 | Vários usuários e empresas isoladas | R0 | Dono convida dois usuários; cada um entra com credencial própria e só acessa os vínculos permitidos |
| R2 | Caixa individual e movimentos completos | R1 | Dois operadores vendem, fazem entradas/saídas e fecham com saldos separados e trilha de autoria |
| R3 | Sincronização e recuperação com vários usuários | R2 | Queda, reenvio, alternância e troca de aparelho preservam valores e identidades, sem duplicação |
| R4 | Estoque, catálogo, relatórios, fiado e lojas | R3 | Movimentos e relatórios conferem com o histórico de cada loja e operador |
| R5 | Piloto Android com pagamentos manuais | R0 a R4 | Artefato conectado passa nos roteiros físicos e no ciclo completo de operação e recuperação |
| R6 | Pagamentos integrados reais | R3 e piloto estável | Provedor confirma e reconcilia pagamentos, estornos e respostas perdidas |
| R7 | Assinatura real e liberação completa | Piloto estável; canal de distribuição definido | Compra, renovação, cancelamento e recuperação de licença homologados, se a cobrança for ativada |

R0 a R5 entregam o núcleo operacional. R6 e R7 completam as integrações; o acesso gratuito e os pagamentos manuais continuam sendo modos válidos de operação. Cada etapa termina com uma versão demonstrável, resultados de testes e pendências atualizadas.

## Checkpoint obrigatório a cada avanço

Por instrução do usuário em 01/11/2026, toda entrega coerente, correção ou avanço parcial deve atualizar este roadmap e gerar um registro no [histórico de checkpoints](checkpoints-roadmap.md), antes de encerrar a resposta ou iniciar o próximo lote. Não esperar a etapa inteira terminar para registrar o que foi construído.

O checkpoint identifica etapa, data, entrega, arquivos/versão/commit quando disponíveis, testes e resultados, limitações, pendências e próximo passo. A resposta de entrega deve indicar o registro e seu link.

Tarefas parciais permanecem abertas, com o avanço descrito. Marcar `[x]` somente após atender à implementação e à validação exigidas. Separar evidência local, externa, Android físico e aceite humano; não presumir aprovação do usuário. R0 continua em homologação conforme seu relatório; R1, R2, R3 e a implementação de R4 estão construídas e validadas localmente, com homologação pendente; R4 conserva a medição de catálogo em campo/4G aberta. R5 tem implementação local e APK interno preparados, aguardando homologação externa/física; R6 e R7 permanecem planejadas.

## R0 Colocar a API e o app conectado em funcionamento

Em execução em 01/11/2026: [evidências, ambientes e pendências de R0](r0-api-apk-conectado.md). APIs saudáveis, banco de homologação separado e APK conectado 0.1.5 gerado. Login por e-mail e restauração em nova instalação aprovados por HTTP com o `BackendHttp` do app; reuso do código recusado e venda de R$ 7,00 recuperada sem duplicação. Marcar os cenários físicos e operacionais somente após sua comprovação.

Avanço de 01/11/2026, 21h40: **[restauração do backup aprovada](r0-restauracao-backup.md)** em PostgreSQL separado e previamente vazio. As 24 tabelas e os 38 registros conferem com a origem por contagem e checksum; estrutura, sequências, IDs e venda de R$ 7,00 preservados, sem divergências de integridade. O destino foi desativado após a validação. Registro: [CP 20261101 002](checkpoints-roadmap.md#cp-20261101-002-restauracao-real-do-backup-r0).

Decisão do usuário em 01/11/2026: priorizar o MVP e a validação do produto. **Cópia externa e alertas de falha de backup/saúde passam para o [backlog após validação](#backlog-apos-validacao-do-produto)** e deixam de bloquear o MVP. Os backups locais e healthchecks existentes ficam preservados. R0 continua em homologação, com teste físico Android e demais verificações funcionais ainda abertas. Todos os serviços do PDV devem usar o prefixo `pdv-`; essa regra não altera serviços de outros produtos. Registro: [CP 20261101 003](checkpoints-roadmap.md#cp-20261101-003-foco-no-mvp-e-backlog-operacional).

- [x] Confirmar serviço, domínio, HTTPS, migrações e `/saude` com consulta ao PostgreSQL; registrar o commit implantado.
- [ ] Separar dados e credenciais de desenvolvimento, homologação e produção. Não importar a semente fictícia para contas reais.
- [ ] Homologar envio e recebimento do código de acesso, validade, reenvio, limitação de tentativas e recuperação.
- [x] Validar o modo de acesso liberado sem cartão e sem cobrança, já previsto na API. O app conectado deve sair do cadastro diretamente para a operação quando receber esse acesso.
- [x] Criar perfis de build explícitos para demo local, homologação conectada e produção. No modo conectado, falha de rede não pode ativar silenciosamente o backend simulado.
- [ ] Gerar APK conectado, cadastrar uma conta e comprovar venda manual sincronizada e restauração em instalação autorizada.
- [x] Preparar backup e testar restauração antes de usar dados comerciais. Arquivo de homologação restaurado em banco isolado e comparado com a origem; [evidência externa](r0-restauracao-backup.md).

Cópia fora da VPS e alertas foram adiados por decisão de escopo, sem marcação de conclusão; sua execução está no backlog abaixo.

## R1 Implementar acesso individual e permissões

**Construída e validada localmente em 01/11/2026; homologação pendente.** Identidades, equipe/convites, gerente, permissões no servidor, seleção de vínculo e perfis locais entregues. Regressão: 506 testes API, 511 mobile e 169 shared aprovados (1.186), tipos dos três workspaces e bundle Android/Hermes aprovados. [Relatório e roteiro de homologação](r1-equipe-permissoes.md) · [CP 008](checkpoints-roadmap.md#cp-20261101-008-isolamento-do-diagnostico-e-validacao-final-r1).

Os itens marcados abaixo representam implementação e validação automatizada local. O serviço externo e o APK 0.1.5 permanecem na versão de R0; não há homologação física nem aceite humano de R1. O histórico incremental está nos CPs 004 a 008. Perfis na mesma instalação/loja conservam o aparelho; pausados têm cofre e dados próprios, e o logout offline mantém apenas a revogação protegida para a reconexão. A alternância exige conexão nesta etapa. Exportação e limpeza de diagnóstico também são restritas ao perfil; eventos legados sem autoria ficam preservados sem serem atribuídos.

- [x] Criar identidade de usuário e vínculos com empresas/lojas; permitir convite, aceitação, suspensão e desligamento de operador.
- [x] Migrar o dono atual para a nova identidade, preservando IDs de conta, loja, operador, vendas e caixas. Não compartilhar a credencial do dono com funcionários.
- [x] Adaptar OTP, sessões, recuperação e limites de autenticação ao usuário e ao vínculo selecionado. Validar no servidor qualquer troca de empresa, loja ou papel.
- [x] Criar telas de equipe, convites, seleção de empresa/loja e alternância de operador no aparelho.
- [x] Evoluir SecureStore e estado local para múltiplas sessões e perfis. Pausar um perfil pode manter sua sessão protegida; sair deve revogar a sessão e interromper seu uso em segundo plano.
- [x] Separar rascunhos, parcelas, turno e preferências pessoais por usuário. Manter produtos e configurações da loja no escopo compartilhado correto.
- [x] Substituir a exigência global de dono no push por autorização por operação: vender, movimentar o próprio caixa, cadastrar produto, cancelar, retirar dinheiro, conferir outro caixa e administrar equipe. Na fronteira de R1, a saída disponível era sangria; retirada completa e intervenção em outro caixa foram acrescentadas na entrega local de R2 abaixo.
- [x] Filtrar também consultas, pull, exportações e diagnósticos por permissão. O operador não deve baixar dados financeiros de outros usuários para depois apenas escondê-los na interface.

- [ ] Implantar a migração/API em homologação e validar o fluxo com OTP externo e PostgreSQL independente.
- [ ] Gerar o APK conectado desta entrega e homologar dono + dois usuários em Android físico, incluindo SecureStore, alternância, suspensão e isolamento; registrar o aceite humano separadamente.

## R2 Implementar caixa por usuário

**Construída e validada localmente em 02/11/2026; homologação pendente.** API, mobile e contrato v2 entregues. Regressão completa: **514 testes API, 518 mobile e 170 shared — 1.202 aprovados**; tipos dos três workspaces e bundle Android/Hermes aprovados. [Relatório, arquivos e roteiro](r2-caixa-por-usuario.md) · [CP 011](checkpoints-roadmap.md#cp-20261102-011-entrega-local-e-conferencia-do-roadmap-r2).

Os itens marcados abaixo representam implementação e validação automatizada local, com PostgreSQL embarcado/PGlite, SQLite real e HTTP local. O exemplo Ana R$ 250/Bruno R$ 100 foi comprovado. **Não houve deploy, APK novo, Android físico, PostgreSQL independente nem aceite humano desta entrega.** Incrementos: CPs 009 e 010, preservados no histórico.

- [x] Trocar a seleção atual por loja/aparelho pela seleção de turno do operador na loja, mantendo a origem do aparelho.
- [x] Implementar reserva de turno no servidor para impedir dois caixas ativos do mesmo usuário na mesma loja. Abertura e transferência de aparelho exigem conexão; o turno já autorizado continua vendendo offline.
- [x] Permitir fechamento offline com estado pendente; impedir outra reserva para o usuário até o servidor confirmar o fechamento. Exibir essa restrição na interface.
- [x] Versionar os contratos de movimentos para incluir retirada, transferência, categoria/destino, autor, responsável pelo caixa e eventual aprovador.
- [x] Persistir movimentos como eventos identificados e imutáveis, com correções por novos eventos e confirmação idempotente. Não sobrescrever o conjunto de movimentos pelo último aparelho que sincronizou.
- [x] Criar telas de abertura, entrada, sangria, retirada, histórico e fechamento por usuário; incluir limites e aprovação de saídas conforme permissão. Saídas são limitadas pelo saldo disponível e pelo recurso do plano; intervenção autorizada identifica o gestor e o responsável.
- [x] Implementar transferência entre caixas com débito e crédito atômicos e autorização dos responsáveis. A transferência entre caixas exige rede nesta primeira entrega; consentimento do destinatário expira em cinco minutos.
- [x] Criar visão do dono/gerente com caixas abertos, valores por operador, pendências conhecidas, diferenças e conferências. Intervenções exigem motivo. O painel mostra valores confirmados; pendências offline de outro aparelho só se tornam conhecidas após conexão.
- [x] Migrar histórico com operador conhecido sem alterar totais. Dados sem autoria comprovada ficam identificados como legados, sem atribuição inventada. Duplicatas históricas são preservadas e bloqueiam nova reserva até regularização.

- [ ] Implantar R1/R2 e a migração 0009 em homologação; validar preservação do histórico, reserva concorrente e rollback em PostgreSQL independente.
- [ ] Gerar APK conectado desta versão e homologar dono + dois operadores em Android físico, incluindo modo avião, SecureStore, transferências, troca de aparelho e contagem; registrar o aceite humano separadamente.

Retomar o turno em outro aparelho pressupõe sincronizar e interromper o anterior, com confirmação explícita. Conflitos entre intervenção remota e fechamento offline ficam preservados como pendência, bloqueando nova reserva; R3 abaixo acrescenta indicação explícita, exportação e encaminhamento à conferência auditada, além da recuperação por perfil. O [relatório](r2-caixa-por-usuario.md#limitações-e-próximos-ambientes) detalha os limites de R2. O bundle exportado não equivale a APK instalado.

## R3 Sincronização, uso offline e recuperação sem misturar usuários

**Construída e validada localmente em 02/11/2026; homologação pendente.** Quarta entrega funcional: autorização offline de sete dias por perfil/aparelho, retomada com filas/rascunhos separados, revalidação antes do envio, remoção de cache alheio após redução de permissão e recuperação somente do confirmado. Regressão: **514 testes API, 531 mobile e 170 shared — 1.215 aprovados**; tipos dos três workspaces e bundle Android/Hermes aprovados. [Relatório, política, evidências e roteiro físico](r3-sincronizacao-offline-recuperacao.md) · [CP 015](checkpoints-roadmap.md#cp-20261102-015-entrega-local-de-sincronizacao-offline-e-recuperacao-r3).

Os itens marcados representam implementação e testes automatizados locais com SQLite real, HTTP local/injetado e PGlite. **Não houve deploy, APK novo, Android físico, PostgreSQL independente ou aceite humano.** Incrementos nos CPs 012 a 014. Somente o perfil ativo sincroniza; pausados preservam credenciais e pendências. Perfis legados sem registro de autorização precisam de uma primeira revalidação online. Vencimento e retrocesso observado do relógio impedem novas operações; cobranças já iniciadas conservam as parcelas e podem ser concluídas. Uma revalidação de rede lenta não bloqueia a escrita offline.

- [x] Gravar venda, parcelas, movimentos e outbox na mesma transação SQLite aplicável; interromper a UI antes de anunciar sucesso quando a escrita falhar.
- [x] Vincular cada pendência ao usuário e ao turno originais. O envio deve usar a sessão correspondente, nunca trocar a autoria para o usuário atualmente visível.
- [x] Permitir alternância entre operadores já autorizados com pendências duráveis, sem misturar filas. Bloquear alternância durante escrita, cobrança ou confirmação em andamento; guardar os rascunhos antes de pausar o perfil.
- [x] Tratar token vencido/revogado de um perfil sem travar os demais; manter suas operações preservadas e indicar a reautenticação necessária.
- [x] Autorizar offline apenas perfis previamente autenticados, por um prazo definido; revalidar permissões na reconexão. Revogação remota não é instantânea em aparelho desconectado.
- [x] Testar dois usuários, dois aparelhos, reconexões em ordens diferentes, confirmação perdida, cursor paginado, relógio divergente e venda antiga rejeitada. Evidência automatizada local; aparelhos simulados com instalações SQLite independentes.
- [x] Impedir reabertura e alteração silenciosa de turno fechado. Conflitos ficam visíveis para conferência e correção auditada.
- [x] Restaurar apenas dados confirmados no servidor; identificar separadamente o que ficou pendente no aparelho perdido. Exibir o estado de backup/sincronização de cada perfil. No substituto, quantidade e conteúdo nunca enviados são desconhecidos; a interface não promete sua recuperação. O indicador é de sincronização; backup externo segue no backlog.

- [ ] Homologar migrações/API R1–R3 e concorrência em PostgreSQL independente, com usuários e aparelhos autorizados distintos.
- [ ] Gerar APK conectado e executar o roteiro físico de queda/reinício/disco cheio/alternância/SecureStore/relógio/recuperação; registrar resultados físicos e aceite humano separadamente.

Conflitos preservam os originais locais e remotos e continuam bloqueando nova reserva até a revisão. A conferência/correção segue os eventos auditados de R2 e o [procedimento de pendências](revisao-pendencias-sync.md); não há aceite excepcional automático nem alteração do fechamento original para obter confirmação.

## R4 Completar gestão e catálogo

**Implementação construída e validada localmente em 02/11/2026; homologação pendente.** Movimentos de estoque, política de negativo/offline, relatórios/CSV, clientes/fiado e filiais entregues no servidor e no app conectado. Regressão: **525 testes API, 540 mobile e 172 shared — 1.237 aprovados**, tipos dos três workspaces e bundle Android/Hermes aprovados. Open Food Facts reconheceu três produtos públicos por HTTPS (231–933 ms; cache próprio 1–2 ms), sem comprovar a amostra de campo ou o p95 em 4G. [Relatório, política, evidências e roteiro](r4-gestao-catalogo-fiado-lojas.md) · [CP 020](checkpoints-roadmap.md#cp-20261102-020-entrega-local-de-gestao-r4).

Itens marcados representam implementação e validação automatizada local. Nenhuma API remota ou APK foi atualizado, nenhum Android físico foi testado e não há aceite humano. O checklist de catálogo e as homologações abaixo permanecem abertos. Saldos exibem o confirmado; recebimentos de fiado e ajustes são online. Cancelamento comercial, devolução de estoque e devolução financeira são eventos separados. A autoria de intervenção/cancelamento não troca o responsável financeiro do filtro. O histórico incremental está nos CPs 016 a 019.

- [x] Gerar entradas, baixas por venda, devoluções e ajustes de estoque como movimentos identificados. Em vários aparelhos, o saldo não pode depender de sobrescrever o estoque no cadastro por data da última edição.
- [x] Definir tratamento de estoque negativo e conflito de vendas offline; exibir divergências. Não prometer reserva global em tempo real quando os aparelhos estiverem desconectados.
- [ ] Homologar catálogo próprio e Open Food Facts com produtos reais, prazo de resposta e cadastro manual quando a consulta falhar. Avaliar outra fonte somente se a cobertura medida justificar. **Parcial:** integração/fallback/cache validados localmente e fumaça HTTPS de três produtos aprovada; falta amostra de 100 itens físicos, conferência dos rótulos e p95 em 4G. Nenhuma fonte adicional contratada.
- [x] Entregar relatórios por turno, usuário, período, loja e meio de pagamento, com vendas, cancelamentos, devoluções, suprimentos, sangrias, retiradas e diferenças separados.
- [x] Exportar os mesmos filtros e totais em CSV. Diferenciar venda realizada, recebimento e movimentação de gaveta para evitar dupla contagem.
- [x] Implementar clientes e fiado: saldo, vencimento, recebimentos parciais, histórico e cancelamentos; recebimento em dinheiro deve indicar o caixa que recebeu.
- [x] Implementar cadastro e seleção de lojas, vínculos e permissões por loja e consolidado do dono. Cada loja mantém caixas, estoque e configurações próprios.
- [x] Atualizar oferta, limites e descrições de plano conforme a disponibilidade real; retirar promessas de recursos ainda não entregues.

- [ ] Implantar migração/API R1–R4 em homologação preservando backup e validar concorrência em PostgreSQL independente, estoque negativo/reenvio, recebimentos contra o mesmo saldo e isolamento/consolidado de filiais.
- [ ] Gerar APK conectado e executar o ciclo físico com dono, gerente e dois operadores: estoque, fiado parcial/estorno/cancelamento, turno receptor, CSV/compartilhamento, alternância de lojas, queda/reinício e SecureStore; registrar o aceite humano separadamente.

## R5 Homologar o piloto Android e a operação

**Atualização de 03/11/2026:** candidato **0.1.9/versionCode 10 pronto para reteste físico supervisionado**, após tratamento dos 18 achados, CI df41823 (597 API/PostgreSQL 17, 578 mobile, 172 shared), API de homologação compatível e APK com R8/diagnóstico/permissões/mapping/299 fontes conferidos. [Matriz](correcoes-auditoria-0.1.9.md) · [CP 045](checkpoints-roadmap.md#cp-20261103-045-apk-019-pronto-para-reteste). Pronto para reteste não equivale a piloto comercial aprovado: leitura real com R8, IME/TalkBack, SecureStore, compartilhamento, OTP externo novo, recuperação e F01–F19 permanecem abertos. APKs 0.1.6–0.1.8 e seus relatos foram preservados como histórico; produção não promovida e R6 não iniciada.

**Implementada e validada localmente em 02/11/2026 — sexta entrega solicitada; homologação externa/física pendente.** Suporte, políticas, exportação autorizada e pedido de análise de exclusão construídos. Regressão: API 531, mobile 546, shared 172 aprovados; seis novos casos adicionais aprovados na revisão final (1.255 distintos no conjunto), tipos e ferramentas aprovados. APK interno 0.1.6/versionCode 7, assinatura de teste verificada e bundle sem simuladores/ferramentas. SHA256 APK `e6170b3b7e5fd2e40efdcff8d832fc5167baed3482c403bfadbeb9f757bcb2ff`. [Relatório R5](r5-piloto-backup-suporte.md) · [CP 025](checkpoints-roadmap.md#cp-20261102-025-apk-interno-e-entrega-local-r5). APIs saudáveis ainda sem rotas R5 (404); ADB sem aparelhos. PostgreSQL independente/restauração atual, CI remoto, atendimento humano e retorno compatível permanecem abertos. Cópia externa e alertas seguem no backlog já autorizado.

Entregas locais adicionais, sem equivalência a homologação física/externa:

- [x] Construir e testar protocolo pessoal idempotente, resumo técnico opcional, exportação autorizada, pedido de análise de exclusão e retenção de suporte; políticas acessíveis sem sessão/licença.
- [x] Retirar implementações de demonstração/ferramentas do bundle conectado e validar host, recursos e grafo de fontes; preparar versão 0.1.6/versionCode 7 com assinatura de produção separada.
- [x] Preparar e testar ferramentas de comparação de restauração e inspeção de release; documentar atendimento/incidente, monitoramento manual, retorno compatível e [matriz física](roteiro-piloto-android.md), mantendo cenários ainda não executados abertos.
- [x] Auditar estaticamente o candidato 0.1.8 nos cinco pilares solicitados, inventariar entradas/scroll e registrar parecer do APK e cenários UAT; [relatório e limites](auditoria-estatica-android-0.1.8.md), CP 040. Este item conclui a análise, sem concluir correções ou testes físicos.
- [ ] Corrigir/validar os cinco P1 da auditoria 0.1.8 (H01, C01, C03, S04, N01), tratar os P2 dos fluxos incluídos e gerar novo APK rastreável antes de ampliar o piloto para usuários/dados reais. Repetir verificações afetadas e aceite físico; snippets são propostas não aplicadas.

- [ ] Testar o APK exato em aparelhos reais: instalação, atualização da 0.1.4, câmera/scanner, permissões, SecureStore, exportação e acessibilidade.
- [ ] Simular encerramento forçado durante parcela e conclusão, disco cheio, rede intermitente, reinício do aparelho e atualização com pendências.
- [ ] Fazer um ciclo completo com dono e dois operadores: abertura, venda, entrada, sangria, retirada, fechamento, conferência e consolidado.
- [ ] Confirmar que entrada/sangria/retirada de Ana não mudam o caixa de Bruno; tentativas diretas pela API também devem ser recusadas quando indevidas.
- [ ] Restaurar um backup do servidor e recuperar uma conta em aparelho substituto, conferindo IDs, quantidades, valores e pendências.
- [x] Concluir regressão da API em banco de teste dedicado e sem competição com o build; executar tipos, testes mobile/shared, testes PostgreSQL/SQLite e checks do CI.
  - Correção `a987c31`, CI 41574379311 aprovado: API 592/PostgreSQL 17 dedicado, mobile 556/SQLite e shared 172; tipos, ferramentas e imagem/isolamento aprovados. Essa validação não conclui Android físico. CI anterior e reabertura para a correção estão nos CPs 029–032. Inspeção anterior de alcance dos advisories não encontrou biblioteca com aviso direto no JS embarcado/API; saneamento das ferramentas e análise nativa permanecem pendentes.
- [ ] Remediar as dependências alcançáveis pelo runtime e repetir as verificações afetadas; remover simuladores e ferramentas de teste do build de produção.
- [ ] Disponibilizar suporte, privacidade, termos, exportação e solicitação de exclusão. Definir retenção, acesso a diagnósticos e procedimento de incidente.
- [ ] Validar monitoramento de API, e-mail, jobs, filas e backup, além do retorno à versão anterior compatível com o banco.

## R6 Integrar pagamentos reais

**Planejada; critério de entrada ainda não atendido.** Antes da implementação, concluir a [revisão de prontidão e as pendências do piloto](#revisao-de-prontidao-para-r6), com evidências de R3 e piloto estável. O APK interno e os testes locais de R5 não substituem esse resultado.

- [ ] Escolher o primeiro provedor conforme acesso à API/SDK, credenciais, aparelhos e fluxo de homologação; começar por uma integração completa.
- [ ] Implementar Pix dinâmico, confirmação autenticada no servidor, expiração e conciliação. Confirmar por evento/consulta do provedor, sem botão de simulação.
- [ ] Implementar cartão integrado e Tap/NFC somente nos aparelhos e fluxos suportados pelo provedor. Usar os componentes de captura/tokenização do provedor.
- [ ] Tratar valor divergente, confirmação tardia, pagamento duplicado, resposta perdida, venda abandonada e pagamento dividido.
- [ ] Implementar estorno real e seus estados; separar solicitação, confirmação financeira e cancelamento comercial.
- [ ] Vincular a conta recebedora ao estabelecimento correto. Vários caixas internos não significam automaticamente várias contas bancárias recebedoras.
- [ ] Habilitar cada meio somente após homologação; manter dinheiro, Pix estático e cartão manual como alternativas identificadas.

## R7 Concluir assinatura e distribuição

- [ ] Manter o acesso liberado sem cobrança enquanto essa for a política comercial. Não converter contas gratuitas em pagantes automaticamente.
- [ ] Definir o canal de distribuição e o mecanismo de compra aplicável; então implementar provedor real no lugar de `MockBillingProvider` e da tokenização simulada.
- [ ] Homologar compra, renovação, falha de pagamento, cancelamento, reembolso, restauração e notificações duplicadas ou fora de ordem.
- [ ] Validar cupom, preço vigente, licença offline e limites de usuários/lojas/aparelhos sem cortar o acesso ao histórico financeiro.
- [ ] Garantir que bloqueio comercial impeça novas operações conforme a política, preservando consulta, recuperação e exportação permitidas.
- [ ] Publicar o artefato verificado com assinatura de distribuição, versão rastreável e implantação da API compatível.

Desktop e emissão fiscal ficam como frentes seguintes, com requisitos, integração e homologação próprios. Não serão tratados como recursos prontos pela conclusão do Android.

<a id="backlog-apos-validacao-do-produto"></a>

## Backlog após validação do produto

Priorizar esta frente após validar o MVP, conforme decisão do usuário em 01/11/2026. Estes itens permanecem não implementados e não bloqueiam o MVP.

- [ ] Configurar destino externo ao servidor para os backups do PDV, com credenciais próprias e retenção definida; comprovar envio e restauração a partir desse destino.
- [ ] Configurar alertas de falha/atraso de backup e testar sua entrega ao destinatário autorizado.
- [ ] Configurar alertas de indisponibilidade/recuperação das APIs e testar a detecção e a entrega, incluindo falha da VPS quando houver monitor externo.
- [ ] Definir destino e destinatário no momento da retomada. A inspeção desta rodada encontrou apenas Local Disk e nenhum canal de notificações; nenhum serviço, destino externo ou canal foi criado.

Nomes dos futuros serviços do PDV começam com `pdv-`. Backups locais, teste de restauração e healthchecks já realizados permanecem registrados nos relatórios de R0.

## Critérios de conclusão

O núcleo operacional estará concluído quando R0 a R5 passarem no ambiente conectado e no Android real. O conjunto completo do escopo Android incluirá R6 e, caso a cobrança seja ativada, R7. A cada entrega, registrar versão do app, commit da API, ambiente, cenário e resultado.

- [ ] Duas empresas não acessam dados uma da outra.
- [ ] Dois operadores da mesma loja têm caixas, parcelas e movimentos separados; o gestor acessa o consolidado conforme permissão.
- [ ] Suprimento, sangria, retirada e transferência mantêm autoria e alteram o saldo uma única vez.
- [ ] Operações offline sobrevivem a reinício e sincronizam sem mudar de usuário, turno ou valor.
- [ ] Fechamentos e ajustes preservam o histórico, inclusive após cancelamentos e recuperação.
- [ ] Backup restaurado e aparelho substituto recuperam os dados confirmados sem inventar a recuperação de pendências locais.
- [ ] Recursos anunciados funcionam com serviços reais ou são explicitamente apresentados como operação manual.
- [ ] Não há defeito aberto de perda/duplicação financeira, acesso indevido entre usuários ou cobrança incorreta.

## Relação com os planos existentes

O [plano de produção](plano-implementacao-producao.md) mantém o detalhamento e as evidências das entregas anteriores. R1/R2 ampliam seu escopo original de operador único; R3 reaproveita os blocos de persistência/sync; R5 reúne homologação, operação e requisitos mínimos de suporte; R6/R7 completam pagamentos e cobrança. Os [checkpoints anteriores](fases-e-checkpoints.md) continuam como histórico de validação.

Referências técnicas: [API](../apps/api/README.md), [implantação no EasyPanel](deploy-easypanel.md), [catálogo EAN](produto-catalogo-ean.md), [schema do servidor](../apps/api/src/db/schema.ts), [seleção atual do caixa](../apps/mobile/src/dados/caixa.ts) e [autorização atual do push](../apps/api/src/servicos/sync.ts).

### Correção da auditoria 0.1.8 — candidato 0.1.9

03/11/2026, 12h30: usuário informou instalação e recebeu primeira rodada guiada de acesso, estabilidade visual, scanner/teclado e diagnóstico. Resultados físicos e confirmação da versão instalada ainda pendentes; nenhum PASS/aceite inferido. [CP 046](checkpoints-roadmap.md#cp-20261103-046-instalacao-relatada-e-reteste-guiado).

- [x] Construir os 18 tratamentos, validar regressões/CI, implantar a API compatível de cadastro verificado somente em homologação e gerar/inspecionar APK 0.1.9 com diagnóstico/R8. [Matriz de correções](correcoes-auditoria-0.1.9.md) · [CP 045](checkpoints-roadmap.md#cp-20261103-045-apk-019-pronto-para-reteste). Correções de UI/nativas seguem para confirmação física; este item não conclui o aceite do piloto.
- [ ] Executar o reteste físico da 0.1.9 no Samsung, incluindo leitura real com R8, teclado/fonte/TalkBack, OTP novo, compartilhamento e ciclo financeiro/offline; registrar evidência e aceite nos cenários afetados.
- [x] Construir o tratamento dos 18 achados nos fontes 0.1.9/10 e executar validação local: API 538/PGlite, mobile 575 + 3 casos adicionais, shared 172, duas ferramentas e tipos PASS. Cadastro com prova anterior à sessão construído; backup pré-migração comprovado. Estado intermediário documentado no [CP 042](checkpoints-roadmap.md#cp-20261103-042-cadastro-verificado-e-regressoes-locais), sucedido pelo CI/implantação/artefato dos CP 043–045.
- [x] Executar CI PostgreSQL 17/imagem no commit df41823 e implantar a API compatível somente em homologação, preservando ambiente/fonte/backups. Saúde/hora e recusa de cadastro sem prova conferidas por HTTPS, sem envio de e-mail/conta; [CP 043](checkpoints-roadmap.md#cp-20261103-043-ci-e-api-019-em-homologacao). APK R8 e reteste físico continuam pendentes.
- [x] Gerar e inspecionar APK interno 0.1.9/10 com diagnóstico, R8/shrink, mapping, assinatura, manifesto/permissões, bundle e 299 fontes sem divergência; hash e limites no [CP 044](checkpoints-roadmap.md#cp-20261103-044-apk-019-otimizado-gerado). Export de produção sem diagnóstico e conferência documental final concluídos no CP 045; nenhum checkbox físico/aceite encerrado.
