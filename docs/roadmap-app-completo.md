# Roadmap do PDV completo com caixa por usuário

Referência: 01/11/2026. Objetivo: colocar o Android em uso real, com várias empresas isoladas, vários usuários por loja e caixa separado por usuário, e depois concluir as integrações e os recursos de gestão. Este roadmap amplia o escopo inicial de uma loja, um operador e um aparelho. As etapas abaixo são entregas planejadas; componentes existentes serão aproveitados e homologados.

O primeiro marco é um PDV conectado, com login real, vários operadores, vendas e caixa individuais, sincronização e recuperação. Dinheiro, Pix estático e cartão manual permitem esse marco enquanto pagamentos integrados e cobrança de assinatura seguem suas próprias etapas.

<a id="revisao-de-prontidao-para-r6"></a>

## Situação real e pendências antes da R6

**Revisão de 03/11/2026: o projeto está na homologação acumulada de R0–R5. O critério para iniciar R6 ainda não foi atendido.** A implementação local de uma etapa não conclui seu critério de avanço. R6 depende de R3 homologada e piloto estável; não há evidência registrada desse piloto. Esta revisão complementa o CP 025, sem invalidar as entregas locais: [CP 026](checkpoints-roadmap.md#cp-20261103-026-revisao-de-prontidao-para-r6).

**Avanço de 03/11, 00h21:** preparação do candidato **0.1.7/versionCode 8** para teste do usuário com produto real, autorizada após o CP 026. Scanner sem imagem/leitura simulada; catálogo fictício/atraso isolados fora do release conectado, configuração ausente recusada; ambiente explícito inclusive em desenvolvimento e ferramentas recusadas nos perfis conectados; cobrança da API desativada por padrão. Tipos aprovados, 550 testes mobile aprovados no conjunto e 25 testes API dirigidos aprovados. CI/PostgreSQL independente, deploy e novo APK ainda pendentes neste incremento. Backup de homologação solicitado, sem comprovação de conclusão. [CP 027](checkpoints-roadmap.md#cp-20261103-027-candidato-real-sem-fallbacks-simulados). As evidências do APK 0.1.6 abaixo são históricas; os fontes atuais exigem o novo artefato.

**Avanço de 03/11, 00h28:** snapshot R1–R5 publicado na branch exclusiva `codex/pdv-homologacao-real`, commit `43efe11`. Backup pré-deploy comprovado no painel com arquivo de 11,2 kB e log Success. Primeiro CI executou 591 testes API em PostgreSQL 17: 586 passaram e cinco falharam por expectativas antigas de fixtures (billing padrão, coluna fiado e permissão de vender do operador). Fixtures corrigidas, preservando a prova de revogação explícita durante lock; 23 testes dirigidos locais aprovados. Nova execução PostgreSQL/CI ainda pendente, nenhum deploy realizado. [CP 028](checkpoints-roadmap.md#cp-20261103-028-snapshot-backup-e-correcao-das-fixtures-postgresql).

| Etapa | O que tem evidência | O que falta para encerrar |
|---|---|---|
| R0 | API conectada, login/recuperação por HTTP, separação do banco de homologação e restauração do schema R0 | APK físico, limites/expiração externos e fechamento do isolamento de credenciais; SMTP de homologação ainda compartilha credencial/cota |
| R1 | Identidades, vínculos, convites, permissões e perfis implementados/testados localmente | Migração/API implantadas, dono + dois usuários com OTP externo, isolamento e SecureStore no Android |
| R2 | Caixa individual, movimentos, transferências e cálculos testados localmente | Concorrência em PostgreSQL independente e ciclo financeiro em dois celulares, incluindo preservação do histórico |
| R3 | Filas por perfil, autorização offline, reenvio e recuperação do confirmado testados localmente | Queda/reinício/reconexão/recuperação físicos e tratamento operacional dos conflitos; exportar uma pendência não a resolve |
| R4 | Estoque, fiado, filiais, relatórios/CSV locais e consulta HTTPS de três produtos | Concorrência e ciclo físico de gestão; amostra de 100 produtos e p95 em 4G continuam abertos |
| R5 | Suporte, procedimentos, ferramentas e APK interno 0.1.6 preparados; regressão local registrada | API compatível, PostgreSQL/CI da versão candidata, restauração atual, cenários F01–F19, atendimento e aceite humano |
| R6/R7 | Integrações planejadas | R6 aguarda piloto estável; R7 depende também da decisão de cobrança/distribuição |

**Conferência desta revisão:** o painel informa homologação no commit R0 `bc786bc86abac934754ee1dd35d8524f9c04c9c1`, com implantação automática desativada. Em 02/11, 23h59min56s, America/Sao_Paulo, o verificador HTTPS confirmou `/saude` 200, rota de teste 404 e as duas rotas de suporte R5 404 em vez de 401: **FAIL de compatibilidade**, não indisponibilidade geral. Evidência sanitizada local: `builds/pre-r6-http-homologacao.json`. A primeira tentativa no sandbox falhou em DNS; a repetição com rede permitida produziu esses resultados. Nenhum deploy/migração foi executado nesta revisão.

O SHA256 do APK 0.1.6 foi recalculado e coincide com o CP 025; os **291 arquivos** do inventário de fontes também conferem, sem divergências. Ele é o candidato cumulativo para homologar R1–R5; não é necessário gerar um APK histórico para cada etapa. Os itens que combinam geração e homologação continuam abertos pela parte externa/física. Mudanças posteriores nos fontes exigem reavaliar o artefato e as verificações afetadas.

Ordem para fechar as pendências, vinculada aos checklists existentes:

1. **Fixar a versão candidata e validar servidor/banco:** identificar o conjunto R1–R5 atualmente sem commit próprio, executar a regressão em PostgreSQL dedicado e o CI correspondente, preservar backup e implantar somente em homologação com migrações até `0011`. Exigir compatibilidade HTTP e repetir autenticação externa/limites/isolamento. Um CI antigo ou `/saude` 200 não comprovam essa versão.
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
| Android | APK 0.1.4 local, SQLite, SecureStore, produtos, venda e caixa | APK conectado e homologado no aparelho |
| Acesso | Cadastro, OTP por e-mail, sessão, revogação e recuperação no servidor | Login próprio para cada funcionário, convites e seleção de vínculo |
| Identidades | Conta, loja, operador e aparelho já têm IDs | Separar usuário de empresa e permitir vários vínculos por usuário |
| Caixa | R2 construída e validada localmente: turno por usuário, reserva, entradas/saídas, transferências e conferência | Homologar migração/concorrência externa e ciclo físico no Android |
| Autorização | Papéis dono/operador no schema; push atual exige dono | Permissões completas para funcionário sem conceder acesso de dono |
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

**Implementada e validada localmente em 02/11/2026 — sexta entrega solicitada; homologação externa/física pendente.** Suporte, políticas, exportação autorizada e pedido de análise de exclusão construídos. Regressão: API 531, mobile 546, shared 172 aprovados; seis novos casos adicionais aprovados na revisão final (1.255 distintos no conjunto), tipos e ferramentas aprovados. APK interno 0.1.6/versionCode 7, assinatura de teste verificada e bundle sem simuladores/ferramentas. SHA256 APK `e6170b3b7e5fd2e40efdcff8d832fc5167baed3482c403bfadbeb9f757bcb2ff`. [Relatório R5](r5-piloto-backup-suporte.md) · [CP 025](checkpoints-roadmap.md#cp-20261102-025-apk-interno-e-entrega-local-r5). APIs saudáveis ainda sem rotas R5 (404); ADB sem aparelhos. PostgreSQL independente/restauração atual, CI remoto, atendimento humano e retorno compatível permanecem abertos. Cópia externa e alertas seguem no backlog já autorizado.

Entregas locais adicionais, sem equivalência a homologação física/externa:

- [x] Construir e testar protocolo pessoal idempotente, resumo técnico opcional, exportação autorizada, pedido de análise de exclusão e retenção de suporte; políticas acessíveis sem sessão/licença.
- [x] Retirar implementações de demonstração/ferramentas do bundle conectado e validar host, recursos e grafo de fontes; preparar versão 0.1.6/versionCode 7 com assinatura de produção separada.
- [x] Preparar e testar ferramentas de comparação de restauração e inspeção de release; documentar atendimento/incidente, monitoramento manual, retorno compatível e [matriz física](roteiro-piloto-android.md), mantendo cenários ainda não executados abertos.

- [ ] Testar o APK exato em aparelhos reais: instalação, atualização da 0.1.4, câmera/scanner, permissões, SecureStore, exportação e acessibilidade.
- [ ] Simular encerramento forçado durante parcela e conclusão, disco cheio, rede intermitente, reinício do aparelho e atualização com pendências.
- [ ] Fazer um ciclo completo com dono e dois operadores: abertura, venda, entrada, sangria, retirada, fechamento, conferência e consolidado.
- [ ] Confirmar que entrada/sangria/retirada de Ana não mudam o caixa de Bruno; tentativas diretas pela API também devem ser recusadas quando indevidas.
- [ ] Restaurar um backup do servidor e recuperar uma conta em aparelho substituto, conferindo IDs, quantidades, valores e pendências.
- [ ] Concluir regressão da API em banco de teste dedicado e sem competição com o build; executar tipos, testes mobile/shared, testes PostgreSQL/SQLite e checks do CI.
  - Regressão local PGlite/SQLite e tipos aprovados antes do build; PostgreSQL independente e CI remoto ainda pendentes. Inspeção de alcance dos advisories não encontrou biblioteca com aviso direto no JS embarcado/API; saneamento das ferramentas e análise nativa permanecem pendentes.
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
