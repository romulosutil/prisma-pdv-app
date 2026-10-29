# Plano de implementação para produção

Data de referência: 28/10/2026.

Status: implementação local em andamento sob Goal persistente. Checkpoints, decisões e retomada em .specs/STATE.md. Somente itens com evidências estão verificados; homologação externa e critérios globais permanecem pendentes. O projeto ainda não está pronto para produção.

## Objetivo e escopo

Colocar o PDV Android em operação comercial com vendas duráveis, recuperação de dados, autenticação real, assinatura validada e uma versão de produção homologada.

Escopo inicial autorizado para a primeira versão: uma loja, um operador, um aparelho, cadastro de produtos, venda por unidade/peso/valor avulso, caixa, histórico, exportação, sincronização e recuperação. Pagamentos iniciais: dinheiro, cartão registrado manualmente e Pix estático confirmado pelo operador. Decisão AD-001 registrada; aplicar às capacidades e à oferta em P0-06-B/P1-10-A.

Manter Fastify, Drizzle/PostgreSQL, Expo/React Native e o domínio em `packages/shared`. Evoluir os contratos compartilhados e os repositórios existentes. Recursos não entregues devem ficar fora da oferta e da navegação de produção.

### Como acompanhar

- IDs `P0-01-A` identificam tarefas; IDs `AC-P0-01-1` identificam critérios de aceite.
- Marcar uma tarefa apenas quando o resultado correspondente estiver implementado e verificado.
- Marcar um critério apenas com evidência: teste, comando e resultado, ou roteiro manual com versão do artefato e aparelho/ambiente.
- Registrar evidências na seção final; a existência de testes antigos não comprova os novos critérios.
- Rotas identificadas como propostas ainda precisam ser implementadas. Detalhar schemas Zod, erros e compatibilidade na tarefa correspondente.
- Usar erros estáveis com mensagens em português, conforme o padrão da API.

## P0 — bloqueadores de produção

### Ordem de execução e dependências

Os números preservam a lista priorizada original. A sequência abaixo respeita as dependências técnicas.

| Etapa | Bloco | Dependências para concluir | Resultado |
|---|---|---|---|
| 1 | P0-01 — Persistência e recuperação | Nenhuma | Operação local durável |
| 2 | P0-03 — Acesso, aparelho e sessão | P0-01 para integração local | Conta e credenciais reais |
| 3 | P0-04 — Integridade financeira e autorização | P0-03 para identidade e permissões | Servidor valida operações |
| 4 | P0-02 — Sincronização e restauração | P0-01, P0-03 e P0-04 | Dados recuperáveis no servidor |
| 5 | P0-05 — Assinatura real | P0-03 e contratos de licença | Acesso vinculado à compra real |
| 6 | P0-06 — Pagamentos e escopo comercial | P0-01, P0-04 e decisão de escopo | Nenhum recebimento simulado |
| 7 | P0-07 — Implantação e operação | Pode começar antes; homologação depende dos blocos anteriores | Ambiente recuperável e monitorado |
| 8 | P0-08 — Publicação e homologação | Todos os P0; mínimos de P1-10 e P1-11 | Artefato apto ao lançamento |

### P0-01 — Persistência transacional e recuperação da venda

**Situação:** os repositórios gravam JSON no AsyncStorage; `Persistido.modificar` muda a memória antes de confirmar a gravação. Carrinho e parcelas recebidas ficam em memória.

**Arquivos de referência:** `apps/mobile/src/dados/{armazenamento,observavel,vendas,carrinho,dados}.ts`, `apps/mobile/src/telas/pagar/useCobranca.ts` e `apps/mobile/test/{repositorios,carrinho,fluxo}.test.ts`.

**Tarefas**

- [x] **P0-01-A:** definir schema SQLite versionado para produtos, caixas, vendas, itens, pagamentos, venda em andamento e outbox, com partição por conta/loja e IDs estáveis.
- [x] **P0-01-B:** implementar migração idempotente dos dados atuais, preservando a origem até validar contagens e totais; manter um adaptador explícito para testes/navegador sem fallback silencioso no Android de produção.
- [ ] **P0-01-C:** substituir a gravação de agregados críticos por transações; confirmar sucesso na interface somente após persistência e tratar disco cheio, falha de escrita e leitura inválida.
- [ ] **P0-01-D:** persistir venda em andamento e cada parcela recebida; retomar o checkout após reinício e concluir com o mesmo ID, inclusive se o processo cair entre gravação e navegação.
- [ ] **P0-01-E:** gravar a venda concluída e sua mutação de saída na mesma transação; conservar vínculos com pagamentos e caixa, conforme P0-04.

**Critérios de aceite**

- [ ] **AC-P0-01-1:** ao reiniciar o app depois de receber uma parcela de R$ 10,00 numa venda de R$ 25,00, ele recupera itens, parcela e saldo de R$ 15,00.
- [ ] **AC-P0-01-2:** ao interromper a conclusão em cada fronteira de escrita, existe uma única venda concluída com sua outbox, ou um rascunho recuperável; não há venda parcial nem duplicada.
- [ ] **AC-P0-01-3:** ao falhar a persistência, a tela informa a falha, preserva a possibilidade de recuperação e não apresenta a venda como concluída.
- [ ] **AC-P0-01-4:** executar a migração duas vezes preserva IDs, quantidades, valores e vínculos; dados inválidos geram diagnóstico e recuperação, sem limpeza automática da origem.

**Verificação:** testes de repositório com falhas de armazenamento e migração; integração com SQLite real; reinício forçado em Android durante pagamento dividido e conclusão.

### P0-02 — Sincronização completa e recuperação em outro aparelho

**Situação:** a API tem push/pull e idempotência; o cliente ainda não envia produtos, vendas e caixas. A regra atual rejeita vendas com mais de sete dias.

**Arquivos de referência:** `apps/api/src/{rotas,servicos}/sync.ts`, `packages/shared/src/contrato.ts`, `apps/mobile/src/servicos/backend{,Http}.ts`, `apps/mobile/src/dados/dados.ts`, `apps/mobile/src/telas/caixa/StatusSincronizacao.tsx` e `apps/api/test/sync.test.ts`. Novos módulos: serviço de sincronização e repositório da outbox no mobile.

**Tarefas**

- [ ] **P0-02-A:** integrar todas as mutações locais à outbox de P0-01, incluindo exclusão de produto, cancelamento de venda e movimentos/fechamento do caixa.
- [ ] **P0-02-B:** implementar envio ordenado com IDs estáveis, confirmação individual, timeout e retentativas com espera progressiva; não remover pendências antes da confirmação do servidor.
- [ ] **P0-02-C:** implementar pull paginado, aplicação transacional das mudanças e avanço do cursor somente após gravação local; não usar o cursor do push para saltar mudanças não recebidas.
- [ ] **P0-02-D:** definir e testar resolução de conflitos, inclusive a divergência entre a documentação de conflito por campo e o upsert atual por produto; proteger mutações locais ainda não confirmadas durante o pull.
- [ ] **P0-02-E:** implementar restauração autenticada num aparelho autorizado, execução ao abrir/retomar o app e indicação real de pendências, falhas e última sincronização concluída.
- [ ] **P0-02-F:** criar tratamento recuperável para rejeições permanentes e vendas antigas: manter conteúdo local, mostrar motivo e disponibilizar exportação/procedimento autenticado de revisão, sem aceitar qualquer retroação de data automaticamente.

**Critérios de aceite**

- [ ] **AC-P0-02-1:** após criar produto, vender, cancelar outra venda e fechar caixa offline, reiniciar e reconectar, o servidor recebe cada evento uma única vez, mesmo com perda da resposta e reenvio.
- [ ] **AC-P0-02-2:** um pull com mais de 500 mudanças recupera todas as entidades; queda entre aplicação e atualização do cursor não causa perda ou duplicação.
- [ ] **AC-P0-02-3:** o aparelho autorizado de recuperação recebe os dados confirmados no servidor; a UI distingue esses dados das operações ainda pendentes no aparelho de origem.
- [ ] **AC-P0-02-4:** uma venda legítima enviada após oito dias continua preservada e acessível para recuperação; a rejeição não elimina a venda nem bloqueia todas as outras pendências.
- [ ] **AC-P0-02-5:** edição concorrente de produto e fechamento/cancelamento repetidos seguem a regra documentada e mantêm os mesmos totais após reconexão.

**Verificação:** testes integrados mobile/API com desconexão, respostas perdidas, paginação e conflitos; repetir contra PostgreSQL real e restaurar em instalação limpa autorizada.

### P0-03 — Login real, identidade do aparelho e sessões

**Situação:** o envio de código por e-mail não existe; o login gera um novo `aparelhoId`; a sessão não tem expiração/revogação no fluxo atual e o token fica no armazenamento comum.

**Arquivos de referência:** `apps/api/src/{auth.ts,rotas/conta.ts,db/schema.ts}`, `apps/mobile/src/dados/{conta,dados,instancia}.ts`, `apps/mobile/src/servicos/backend{,Http}.ts` e `apps/api/test/conta.test.ts`.

**Tarefas**

- [ ] **P0-03-A:** integrar provedor de e-mail transacional, entrega com retentativa e tratamento de falhas; não retornar/logar o código em produção nem revelar se a conta existe.
- [ ] **P0-03-B:** limitar emissão e tentativas por e-mail/IP, com armazenamento compartilhado entre instâncias, respostas estáveis e proteção contra reenvio contínuo que reinicie a contagem de tentativas.
- [x] **P0-03-C:** criar uma identidade persistente por instalação, reutilizada no cadastro/login; documentar reinstalação, substituição de aparelho e recuperação quando o limite estiver atingido.
- [ ] **P0-03-D:** proteger o token no armazenamento nativo; implementar duração, renovação ou nova autenticação, logout e revogação no servidor, compatíveis com a operação offline.
- [ ] **P0-03-E:** isolar os dados por conta/loja e impedir troca de conta com perda de operações pendentes; limpar a sessão em memória sem apagar vendas por efeito colateral.
- [ ] **P0-03-F:** adicionar consulta de perfil real e gestão mínima de aparelhos/sessões para substituir aparelho perdido; não gerar o nome da loja a partir do e-mail após login.

**Contratos propostos:** `POST /auth/logout` revoga a sessão atual; `GET /conta` devolve perfil e loja autorizados; `GET /aparelhos` lista aparelhos da conta; `DELETE /aparelhos/:id` revoga o aparelho e suas sessões, com autorização do dono. Definir schemas e erros no shared. Cadastro e login existentes passam a reutilizar o ID persistente.

**Critérios de aceite**

- [ ] **AC-P0-03-1:** um código recebido no e-mail autentica uma vez, expira após dez minutos e bloqueia após cinco erros; emissão abusiva recebe limitação também com duas instâncias da API.
- [ ] **AC-P0-03-2:** três logins na mesma instalação consomem um único aparelho; revogar o aparelho invalida seu acesso ao servidor.
- [ ] **AC-P0-03-3:** token expirado/revogado é rejeitado pelo servidor; o app solicita autenticação sem perder as operações locais pendentes.
- [ ] **AC-P0-03-4:** ao trocar da conta A para B, produtos, vendas, carrinho, licença e pendências de A não aparecem nem são enviados como dados de B.
- [ ] **AC-P0-03-5:** os fluxos de login e substituição de aparelho recuperam nome da loja e perfil reais; o token não é gravado no AsyncStorage ou nos logs.

**Verificação:** testes de autenticação, limites, revogação e isolamento; entrega de e-mail em homologação; login repetido e substituição de aparelho em Android.

### P0-04 — Integridade financeira, caixa e autorização no servidor

**Situação:** os schemas validam campos, mas o push recebe totais do cliente sem recalcular toda a consistência financeira. As vendas não têm vínculo explícito com caixa e o cálculo local usa a data de abertura.

**Arquivos de referência:** `packages/shared/src/{contrato,dinheiro}.ts`, `apps/api/src/{servicos/sync.ts,auth.ts,db/schema.ts}`, `apps/mobile/src/dados/{vendas,caixa}.ts`, `apps/api/test/sync.test.ts` e `apps/mobile/test/caixaLogica.test.ts`.

**Tarefas**

- [ ] **P0-04-A:** validar no servidor preços, quantidades, arredondamento, totais dos itens e da venda, parcelas e troco, rejeitando inconsistências com código estável.
- [ ] **P0-04-B:** validar vínculo de loja, aparelho e operador e permissões da operação; restringir a identidade de origem conforme sessão e distinguir restauração/reenvio de criação indevida por outro aparelho.
- [ ] **P0-04-C:** revalidar recursos e limites do plano na API, incluindo sangria/suprimento; manter o comportamento recuperável para vendas concluídas offline e para downgrade.
- [ ] **P0-04-D:** introduzir `caixaId` no contrato, bancos e checkout; definir migração de vendas antigas sem inventar associação quando houver ambiguidade; ordenar a sincronização para resolver os vínculos.
- [ ] **P0-04-E:** preservar o fechamento e registrar cancelamentos/ajustes posteriores como eventos auditáveis; não recalcular retroativamente o caixa fechado nem confundir cancelamento comercial com estorno bancário.

**Critérios de aceite**

- [ ] **AC-P0-04-1:** dois itens de R$ 10,00 e um de R$ 5,00 exigem total de R$ 25,00 e pagamentos líquidos de R$ 25,00; payload com R$ 24,99 é rejeitado sem escrita parcial.
- [ ] **AC-P0-04-2:** chamadas diretas com operador/aparelho de outra loja ou recurso não autorizado são rejeitadas, mesmo que a interface tenha sido contornada.
- [ ] **AC-P0-04-3:** vendas de dois caixas/aparelhos não se misturam no fechamento; reenviar a mesma operação não altera o resultado já consolidado.
- [ ] **AC-P0-04-4:** cancelar uma venda após o fechamento mantém o fechamento histórico e cria ajuste rastreável; eventual estorno financeiro tem estado próprio.

**Verificação:** testes de contratos, aritmética e autorização com payloads inválidos; integração de caixa/sync com PostgreSQL; conferência manual dos totais antes/depois de cancelamento.

### P0-05 — Assinatura real e licença

**Situação:** só existe `MockBillingProvider`. O documento de produto registra Google Play Billing no Android e Asaas em sandbox; o papel do Asaas em site/desktop permanece aberto.

**Arquivos de referência:** `docs/produto-planos-e-cobranca.md`, `packages/shared/src/{assinatura,billing,licenca,contrato}.ts`, `apps/api/src/{billing.ts,jobs.ts,rotas/assinatura.ts,servicos/assinatura.ts,servicos/cobranca.ts}`, `apps/mobile/src/servicos/assinatura.ts` e telas de onboarding/assinatura.

**Tarefas**

- [ ] **P0-05-A:** detalhar o mapeamento de plano/produto/período do Google para assinatura/licença interna; compatibilizar trial, upgrade, downgrade, cancelamento, carência e política comercial com o canal real.
- [ ] **P0-05-B:** integrar compra e restauração no Android, incluindo compra pendente, cancelada pelo usuário e indisponibilidade do serviço; substituir o formulário de cartão mock no fluxo Play.
- [ ] **P0-05-C:** implementar validação da compra no backend, vínculo exclusivo à conta e confirmação da compra no provedor; nunca liberar assinatura paga com base apenas no estado enviado pelo cliente.
- [ ] **P0-05-D:** receber notificações autenticadas do provedor, consultar o estado oficial e aplicar renovação, suspensão, cancelamento, expiração e reembolso de forma idempotente e tolerante a eventos fora de ordem.
- [ ] **P0-05-E:** separar a cobrança gerenciada pelo Google do job de cobranças próprias; impedir débito adicional pelo mock/Asaas para uma assinatura Play e manter a licença offline coerente.
- [ ] **P0-05-F:** atualizar regras/textos e testar cenários com contas de teste da Play; documentar o fluxo de atendimento para compra não refletida no acesso.

**Contratos propostos:** endpoint autenticado de verificação/restauração da compra, com token de compra e identificação do produto; endpoint de notificações com autenticação do provedor. Definir nomes e schemas na tarefa P0-05-A, preservando `GET /assinatura` como leitura do estado consolidado.

**Critérios de aceite**

- [ ] **AC-P0-05-1:** compra pendente, token inválido ou compra vinculada a outra conta não liberam licença; compra válida é confirmada e libera o plano correto uma única vez.
- [ ] **AC-P0-05-2:** renovação, cancelamento, expiração, reembolso e restauração atualizam a licença sem depender de o app estar aberto; notificações repetidas não duplicam efeitos.
- [ ] **AC-P0-05-3:** nenhuma assinatura Play dispara cobrança própria; os textos mostram preço, período e cancelamento do canal efetivamente usado.
- [ ] **AC-P0-05-4:** perder conexão preserva o acesso dentro da validade da licença; vencer a janela exige conexão antes de nova venda, sem interromper venda já iniciada ou apagar dados.

**Verificação:** testes da máquina de estados e dos adapters; homologação Play com compra, restauração e eventos; revisão de duplicidade e licença offline.

### P0-06 — Pagamentos de produção e corte de escopo

**Situação:** Pix dinâmico e aproximação usam `SimuladorProvedores`, mesmo que os botões de simulação sejam escondidos.

**Arquivos de referência:** `apps/mobile/src/servicos/provedoresPagamento.ts`, `apps/mobile/src/telas/pagar/{meiosDisponiveis,PixEstatico,PixDinamico,TelaTap,useCobranca}.tsx` ou `.ts` conforme o módulo, e `apps/mobile/test/provedoresPagamento.test.ts`.

**Tarefas**

- [x] **P0-06-A:** registrar o escopo de lançamento. Recomendação: começar com recebimentos manuais/Pix estático e retirar integrações simuladas da oferta; integração real é obrigatória antes de anunciar confirmação automática ou Tap.
- [ ] **P0-06-B:** implementar configuração de capacidades e bloquear simuladores em produção, também por acesso direto à rota; conectar as capacidades às telas de planos, onboarding, ajustes e checkout.
- [ ] **P0-06-C:** homologar dinheiro, troco, cartão manual, Pix estático e pagamento dividido, com confirmação explícita pelo operador e recuperação de P0-01.
- [ ] **P0-06-D — condicional à oferta integrada:** escolher um provedor e implementar vínculo da cobrança à venda, referências persistentes, iniciação, consulta/retorno, confirmação confiável, expiração e conciliação após reinício.
- [ ] **P0-06-E — condicional à oferta integrada:** implementar cancelamento/estorno quando suportado e tratamento de cobrança paga sem venda concluída, resposta perdida e evento duplicado; homologar antes de habilitar.

**Critérios de aceite**

- [ ] **AC-P0-06-1:** com capacidades integradas desabilitadas, nenhum fluxo/rota de produção aprova recebimento por temporizador ou simulador; planos e telas não prometem os recursos desabilitados.
- [ ] **AC-P0-06-2:** dinheiro recebido de R$ 30,00 numa venda de R$ 25,00 registra R$ 25,00 líquidos e R$ 5,00 de troco; Pix estático e cartão manual exigem confirmação do operador.
- [ ] **AC-P0-06-3:** pagamento dividido recuperado após reinício não solicita novamente uma parcela já recebida e não permite concluir com saldo em aberto.
- [ ] **AC-P0-06-4 — se integração for habilitada:** somente confirmação verificável do provedor marca recebimento; interrupção entre pagamento e venda é conciliada sem cobrar ou registrar duas vezes.

**Verificação:** testes dos meios e capacidades; tentativa de abrir rotas desabilitadas; roteiro Android com pagamentos divididos; sandbox e transação controlada para qualquer integração habilitada.

### P0-07 — Implantação, backups e operação

**Situação:** há conexão PostgreSQL, migrações na inicialização e job em `setInterval`; não foi encontrada configuração de CI/implantação no repositório. A existência de serviços externos ainda precisa ser inventariada.

**Arquivos de referência:** `apps/api/src/{index.ts,jobs.ts,billing.ts,db/conexao.ts}`, `apps/api/drizzle/`, `apps/api/README.md` e `package.json`. Novos artefatos: configuração de build/deploy, CI, exemplo de ambiente sem segredos e runbook em `docs/`.

**Tarefas**

- [ ] **P0-07-A:** inventariar ambiente existente e documentar homologação/produção no Easypanel, versões de runtime, domínio, HTTPS, rede do banco, credenciais e configurações obrigatórias.
- [ ] **P0-07-B:** criar build/deploy reproduzível do monorepo com `npm ci`, shared e migrações; separar migração controlada da subida concorrente das réplicas e definir compatibilidade para atualização/retorno da API.
- [ ] **P0-07-C:** falhar de forma explícita em produção com API/billing/configuração inválidos; manter segredos fora do repositório, logs e variáveis públicas do app.
- [ ] **P0-07-D:** configurar backup criptografado, retenção e restauração; meta inicial proposta: perda máxima de uma hora dos dados já sincronizados e recuperação do serviço em até quatro horas, a validar em exercício.
- [ ] **P0-07-E:** adicionar logs estruturados sem dados sensíveis, rastreio de erros de app/API e alertas de indisponibilidade, falha de login, sync e eventos de assinatura; testar o recebimento de alertas.
- [ ] **P0-07-F:** tornar os jobs necessários recuperáveis após reinício e coordenados entre réplicas, com idempotência no banco/provedor; documentar desligamento, retomada e conciliação de execução interrompida.

**Critérios de aceite**

- [ ] **AC-P0-07-1:** uma implantação limpa sobe API e PostgreSQL reais com `/saude` funcional; configuração de produção inválida impede a inicialização em vez de ativar mock.
- [ ] **AC-P0-07-2:** restaurar um backup em ambiente isolado recupera contas, produtos, vendas, caixas e assinaturas dentro das metas registradas; o procedimento inclui reconectar/reconciliar aparelhos.
- [ ] **AC-P0-07-3:** executar duas instâncias e reiniciar uma durante um job não duplica cobranças/efeitos; falhas acionam um alerta verificável.
- [ ] **AC-P0-07-4:** atualização e retorno da versão da API são ensaiados com o schema correspondente, sem presumir que reverter código desfaz migração de banco.

**Verificação:** deploy em homologação, migração PostgreSQL real, restauração cronometrada, ensaio de duas réplicas e injeção de indisponibilidade. Backups do servidor não recuperam operações que nunca saíram do aparelho; a interface deve indicar pendências.

### P0-08 — Artefato de produção e homologação final

**Situação:** `eas.json` tem somente perfil de testes. O README documenta assinatura debug no APK local e histórico de falha do scanner com minificação.

**Arquivos de referência:** `apps/mobile/{eas.json,app.json}`, `apps/mobile/src/{dados/instancia.ts,util/ferramentasTeste.ts}`, `apps/mobile/test/flagFerramentasTeste.test.ts`, `README.md` e `docs/produto-catalogo-ean.md`.

**Tarefas**

- [ ] **P0-08-A:** criar perfil de produção com assinatura definitiva, artefato de distribuição, versionamento e API real; exigir configuração explícita para impedir demo por ausência de URL.
- [ ] **P0-08-B:** garantir que ferramentas de teste e adapters simulados não sejam alcançáveis em produção; verificar bundle e comportamento, não apenas ausência de botões.
- [ ] **P0-08-C:** adicionar CI com testes e checagem de tipos de todos os workspaces e integração PostgreSQL para os fluxos críticos; impedir liberação se houver falha.
- [ ] **P0-08-D:** executar a matriz final em aparelhos reais, incluindo um aparelho de menor capacidade, rede instável, permissão de câmera negada, reinício, atualização sobre dados antigos e recuperação de conta.
- [ ] **P0-08-E:** concluir os mínimos de oferta verdadeira, privacidade, suporte e ciclo de conta definidos em P1-10/P1-11; preencher os dados da publicação conforme o comportamento final do app.
- [ ] **P0-08-F:** fazer piloto controlado com lojistas, registrar defeitos por impacto e liberar gradualmente apenas com todos os critérios obrigatórios e evidências anexados.

**Critérios de aceite**

- [ ] **AC-P0-08-1:** o artefato final tem assinatura definitiva, aponta para a API correta e não permite cartões mock, relógio de teste, reset de dados ou aprovações simuladas.
- [ ] **AC-P0-08-2:** o scanner lê código real fora da base demo no APK/AAB final instalado em Android, sem `Failed to initialize BarcodeAnalyzer`; o teste é repetido após mudança de minificação.
- [ ] **AC-P0-08-3:** atualizar a versão anterior conserva vendas, caixas, parcelas pendentes e identidade; os testes automatizados e a checagem de tipos passam no commit do artefato.
- [ ] **AC-P0-08-4:** a matriz final e o piloto não deixam defeitos abertos de perda/duplicação de venda, acesso entre contas, cobrança incorreta ou impossibilidade de login/recuperação; pendências menores têm responsável e impacto documentados.

**Verificação:** CI, inspeção do bundle e execução no artefato exato de distribuição. Registrar versão, commit, aparelho, ambiente e resultados.

## P1 — recursos condicionados à oferta e operação

P1 não significa que todos os itens podem esperar após o lançamento. Oferta verdadeira, privacidade e suporte mínimo são requisitos de P0-08; os demais blocos devem estar prontos antes de comercializar o recurso correspondente.

### P1-09 — Estoque e operação com múltiplos aparelhos

**Depende de:** P0-01, P0-02 e P0-04. O vínculo mínimo venda/caixa e a preservação do fechamento já pertencem ao P0-04.

**Referências:** `apps/mobile/src/dados/{produtos,vendas,caixa}.ts`, `apps/api/src/servicos/sync.ts`, `packages/shared/src/contrato.ts` e testes de caixa/sync.

**Tarefas**

- [ ] **P1-09-A:** modelar movimentos de estoque com origem e idempotência; implementar baixa na venda, reversão por cancelamento e ajustes/entradas com histórico.
- [ ] **P1-09-B:** definir estoque negativo e venda concorrente offline; sincronizar movimentos em vez de sobrescrever saldo absoluto entre aparelhos.
- [ ] **P1-09-C:** implementar operadores, permissões e seleção/escopo de caixa quando esses recursos forem ofertados; testar abertura/fechamento simultâneos.

**Critérios de aceite**

- [ ] **AC-P1-09-1:** estoque de 10 unidades, venda de 2 e cancelamento resultam em 10; reenviar os eventos não altera o saldo.
- [ ] **AC-P1-09-2:** dois aparelhos vendem offline e convergem para o saldo correto, sinalizando eventual saldo negativo conforme a política definida.
- [ ] **AC-P1-09-3:** cada operador/aparelho enxerga e movimenta somente os caixas autorizados; totais consolidados não contaminam a gaveta individual.

**Verificação:** testes de movimentos, concorrência e permissões; dois aparelhos em homologação.

### P1-10 — Planos coerentes e recursos de gestão

**Depende de:** P0-05 e P0-06; P1-09 quando houver oferta de estoque/múltiplos operadores.

**Referências:** `packages/shared/src/planos.ts`, `apps/mobile/src/util/planos.ts`, telas de onboarding/assinatura e `docs/produto-planos-e-cobranca.md`.

**Tarefas**

- [ ] **P1-10-A — obrigatório antes da publicação:** montar matriz recurso × implementado × plano × habilitado e revisar textos, preços e capacidades para que a oferta corresponda à versão entregue.
- [ ] **P1-10-B:** implementar downgrade com escolha de aparelhos, bloqueio de novas inclusões acima do limite e acesso preservado aos dados existentes, exportação e regularização.
- [ ] **P1-10-C — antes de ofertar:** implementar relatórios por período/produto, fiado, multiloja e permissões em entregas separadas, cada uma com contrato, autorização e critérios próprios.

**Critérios de aceite**

- [ ] **AC-P1-10-1 — obrigatório antes da publicação:** nenhum plano anuncia integração, estoque, fiado ou gestão avançada indisponível; testes verificam as capacidades efetivamente habilitadas.
- [ ] **AC-P1-10-2:** downgrade com 600 produtos para limite de 500 não apaga registros e permite consulta/exportação; novas inclusões e aparelhos seguem os limites publicados.
- [ ] **AC-P1-10-3:** relatórios, quando habilitados, conciliam totais com vendas/cancelamentos; fiado e multiloja só ficam disponíveis após aceite das respectivas entregas.

**Verificação:** revisão da oferta no artefato final, testes dos limites e conciliação dos relatórios habilitados.

### P1-11 — Comunicação, privacidade e suporte

**Depende de:** P0-03 e P0-05 para comunicações reais. Os mínimos abaixo entram no aceite de P0-08.

**Referências:** `apps/api/src/servicos/cobranca.ts`, `apps/mobile/app/(tabs)/ajustes/index.tsx`, `apps/mobile/src/diagnostico/` e `docs/produto-planos-e-cobranca.md`.

**Tarefas**

- [ ] **P1-11-A — obrigatório antes da publicação:** publicar textos de privacidade/termos, canal de suporte e informações da cobrança real; disponibilizar acesso dentro do app e revisar obrigações aplicáveis ao canal escolhido.
- [ ] **P1-11-B — obrigatório antes da publicação:** implementar solicitação e tratamento de exclusão da conta, revogação de acesso e regras documentadas de retenção/exclusão; alertar e resolver operações não sincronizadas antes de qualquer descarte.
- [ ] **P1-11-C:** entregar lembretes e avisos de assinatura pelo canal definido, com retentativa, idempotência e estado de entrega; substituir o lembrete que hoje apenas grava log.
- [ ] **P1-11-D — obrigatório antes da publicação:** oferecer exportação acessível e diagnóstico de produção sanitizado para atendimento; definir procedimento de recuperação, incidente e cobrança contestada.

**Critérios de aceite**

- [ ] **AC-P1-11-1 — obrigatório antes da publicação:** usuário encontra suporte, termos, privacidade, exportação e solicitação de exclusão sem ferramentas de desenvolvimento.
- [ ] **AC-P1-11-2 — obrigatório antes da publicação:** solicitação de exclusão é rastreável, aplica a política de retenção e revoga acessos; a UI informa o destino das pendências e o estado da solicitação.
- [ ] **AC-P1-11-3:** lembrete de assinatura chega uma única vez por evento/canal ou fica pendente para retentativa; falha de entrega não impede cobrança/licença conforme regra publicada.
- [ ] **AC-P1-11-4 — obrigatório antes da publicação:** diagnóstico compartilhado não contém token, código de login, número completo de cartão ou CVV e mascara os dados pessoais definidos pela política.

**Verificação:** roteiro de suporte/exclusão/exportação, inspeção de diagnóstico e teste do canal de comunicação em homologação.

## P2 — expansão após estabilização

### P2-12 — Catálogo, desktop e novas capacidades

**Depende de:** P0 homologado; medir o catálogo pode começar antes, mas adicionar outra fonte não bloqueia cadastro manual.

**Referências:** `docs/produto-catalogo-ean.md`, `apps/api/src/fontes/openFoodFacts.ts`, `apps/api/src/servicos/catalogoEan.ts`, `apps/mobile/src/servicos/catalogoEan.ts` e `docs/arquitetura.md`.

**Tarefas**

- [ ] **P2-12-A:** medir reconhecimento e latência em 100 produtos reais, com resultados por categoria/fonte, conforme os critérios já documentados.
- [ ] **P2-12-B:** avaliar Cosmos pelo ganho de cobertura e custo por loja; integrar somente se necessário, mantendo cadastro manual e funcionamento offline.
- [ ] **P2-12-C:** planejar desktop e expansões de gestão após o piloto; criar critérios específicos antes de implementar cada entrega.
- [ ] **P2-12-D:** reavaliar emissão fiscal para o segmento/canal de venda pretendido; manter NFC-e fora deste escopo até haver decisão de produto e validação aplicável.

**Critérios de aceite**

- [ ] **AC-P2-12-1:** relatório identifica acertos, erros e latência; a meta documentada é pelo menos 70% de nomes corretos e p95 de até 1,5 s em 4G; resultado abaixo da meta gera ajuste da promessa de produto ou tarefa de melhoria.
- [ ] **AC-P2-12-2:** catálogo indisponível ou aparelho offline não impedem cadastro/venda manual, e eventual fonte paga respeita o orçamento aprovado para o plano.
- [ ] **AC-P2-12-3:** desktop e fiscal têm escopo e critérios próprios antes de serem anunciados como disponíveis.

**Verificação:** amostra reproduzível de catálogo, testes de indisponibilidade e revisão da oferta publicada.

## Validação e registro das entregas

Comandos existentes, a executar durante a implementação e antes da liberação:

```powershell
rtk proxy npm ci
rtk npm run test
rtk npm run typecheck
```

Os comandos atuais não substituem os testes de integração PostgreSQL, SQLite real, Google Play, restauração e aparelho físico definidos neste plano. Registrar novos comandos reproduzíveis no README e no CI quando forem implementados.

### Matriz mínima de homologação

| Cenário | Critérios relacionados | Evidência exigida |
|---|---|---|
| Queda no pagamento dividido e na conclusão | P0-01, P0-06 | Testes com falhas + roteiro no Android |
| Offline, reenvio, mais de 500 mudanças e venda antiga | P0-02 | Integração + contagens/totais finais |
| Troca de conta, revogação e substituição de aparelho | P0-03 | Testes de isolamento + roteiro de recuperação |
| Totais adulterados, plano e identidades indevidas | P0-04 | Testes de API sem depender da UI |
| Renovação, cancelamento, reembolso e restauração | P0-05 | Eventos de homologação + licença resultante |
| Reinício de job, réplicas e backup | P0-07 | Logs sanitizados + tempos de restauração |
| Atualização e scanner no artefato final | P0-08 | Versão/commit + aparelho + resultado |
| Oferta, suporte, privacidade e exclusão | P1-10, P1-11 | Roteiro executado no artefato final |

### Registro de evidências

Evidências locais, com escopo limitado ao resultado descrito. Homologação Android, integração externa e critérios globais continuam pendentes. Revisões independentes e testes de regressão estão em .specs/.

| Tarefa/critério | Commit ou versão | Teste/comando/roteiro | Ambiente/aparelho | Resultado e evidência |
|---|---|---|---|---|
| P0-01-A | f0bd5a4 | sqliteSchema: 4 testes; typecheck mobile; revisao-t1-t2.md | Node 24, SQLite real | Schema v1, FKs, reabertura, rollback, versão futura |
| Parte P0-01-C | 23ac272 | persistidoDuravel: 6 testes na entrega; revisão T1/T2 | Node, storage fake explícito | Snapshot após escrita, falhas/fila/JSON inválido; não conclui bloco global |
| P0-01-B | 62d1d6d | sqliteArmazenamento: 13 testes; 23 específicos; revisão persistencia-base/validation.md | SQLite real, arquivo reaberto | Migração repetível, igualdade de contagens/totais/filhos, rollback, origem preservada e partição; Android pendente |
| Parte P0-07-C | fbd1a3c | configuracao: 17 testes e typecheck API; reviews/configuracao-api.md | Node | API valida antes de efeitos; produção bloqueada enquanto só existe billing mock |
| Parte P0-01-D/E, serviço | e9453f6 | checkoutSqlite: 17 testes; revisao-servico.md | SQLite real | R/R/saldoR, seis fronteiras de escrita, falha de COMMIT, outbox e conclusão únicas; caixa local preservado, contrato remoto P0-04 pendente |
| Parte P0-01-C/D, integração | e82d1b8 | 252 testes mobile; typecheck todos; checkout-duravel/validation.md | Node/SQLite; hook com adaptadores UI simulados | Fachada aguarda gravações; recuperação antes de liberar app; retry sem duplicar parcela; navegação inspecionada, Android ainda não executado |
| P0-03-C | commit desta entrega | 12 testes identidade + 7 storage; typecheck mobile; reviews/identidade-instalacao.md PASS local | Backend simulado explicitamente | UUID salvo antes do request e reutilizado; migração legada; corrupção/falhas não geram novo ID silenciosamente; reinstalação documentada, Android/API real pendentes |
| Parte P0-03-D/F, API | commit desta entrega | 125 testes API; 12 sessões repetidos pelo revisor + sensor sem lock; typecheck todos | PostgreSQL17 local; backfill legado em PGlite | Expiração30dias/logout/perfil/revogação, locks e autorização; credencial protegida e integração mobile ainda pendentes |

### Condição de liberação

- [ ] Todos os critérios P0 aplicáveis estão atendidos; condicionais de integração ficam explicitamente desabilitados e fora da oferta quando não implementados.
- [ ] Os mínimos obrigatórios de P1-10/P1-11 estão atendidos; recursos adicionais só são ofertados após seu aceite.
- [ ] O commit homologado corresponde ao artefato distribuído e ao contrato da API implantada.
- [ ] Restauração, monitoramento, recuperação de conta e suporte foram exercitados.
- [ ] Não há defeito aberto de perda/duplicação de dados, acesso entre contas, cobrança incorreta ou bloqueio de recuperação.
- [ ] A lista de pendências menores e o procedimento de resposta a incidente estão registrados.

## Referências

- [Arquitetura](arquitetura.md)
- [Planos e cobrança](produto-planos-e-cobranca.md)
- [Catálogo EAN e homologação do scanner](produto-catalogo-ean.md)
- [API](../apps/api/README.md)
- [Execução e APK de testes](../README.md)
- [Integração Google Play Billing](https://developer.android.com/google/play/billing/integrate)
- [Armazenamento protegido no Expo](https://docs.expo.dev/versions/latest/sdk/securestore/)
