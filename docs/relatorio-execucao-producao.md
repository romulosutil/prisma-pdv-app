# Checkpoint da execução do plano de produção

Referência: 29/10/2026, após validação financeira e correção do arredondamento compartilhado, fonte e582c09. O Goal consta **active** na consulta mais recente; antes desta retomada a ferramenta havia retornado blocked, sem ação de retomada disponível ao agente. O gestor não alterou manualmente o controle. Objetivo persistente ainda não concluído. Este checkpoint não encerra o trabalho executável e não aprova produção.

## Entregas locais aceitas

| Commit | Entrega | Escopo no plano |
|---|---|---|
| 7c169d5 | Goal, decisões, contratos e critérios do primeiro lote | Coordenação |
| f0bd5a4 | Schema SQLite v1 com partição conta/loja, FKs e migração transacional | P0-01-A |
| 23ac272 | Publicação do estado somente depois de confirmar escrita, fila e erro de leitura | Parte P0-01-C |
| 62d1d6d | Migração idempotente de produtos/caixas/vendas, filhos normalizados e origem preservada; adapter nativo explícito | P0-01-B |
| fbd1a3c | Configuração da API validada antes de abrir banco/jobs/porta; mock bloqueado em produção | Parte P0-07-C |
| e9453f6 | Venda, itens, pagamentos, outbox e conclusão do rascunho no mesmo commit SQLite | Parte P0-01-D/E |
| e82d1b8 | Fachada durável, recuperação na carga, telas aguardando persistência e retry sem nova parcela | Parte P0-01-C/D |
| 9a122f2 | Identidade da instalação persistida antes do request, reutilizada em cadastro/login; migração de identidade legada | P0-03-C |
| a0be2d2 | Expiração de sessão em 30 dias, logout, perfil real, gestão/revogação de aparelhos, autorização e locks | Parte servidor P0-03-D/F |
| d3ad1f7 | Checkpoint anterior com testes e pendências | Documentação |
| c1f879c | Cofre nativo, migração/rotação e journal sem tokens na base comum | Parte P0-03-D |
| 5484025 | Endpoints de perfil/aparelhos/logout, callback401 e deadline HTTP completo | Parte P0-03-D/F |
| 41185d8 | Identidade sem credencial, reauth recuperável, isolamento e descarte de respostas antigas | Parte P0-03-D/E |
| cd9b513 | Telas de recuperação e aparelhos, Pix por conta e regressões React | Parte P0-03-F |
| cdb09b3 | Aparelho lógico por conta, instalação estável e bloqueio da troca durante handshake | Parte P0-03-C/E |
| b37c617 | Checkpoint de acesso mobile e verificador independente | Documentação |
| 8d81639 | Política, critérios e contratos dos limites compartilhados | P0-03-B planejamento |
| 3325a48 | Orçamento transacional no banco com trava, relógio após espera e piso temporal | P0-03-B armazenamento |
| fe56478 | Limites nas rotas, erros esperados confirmam contadores e retenção preparada | P0-03-B API |
| 355b89a | Mensagem local de espera em429 sem invalidar credencial | P0-03-B cliente |
| 1fb5255 | Provas isoladas do rollback de emissão e teto próprio do código legado | P0-03-B AC6 |
| a863dae | Checkpoint de limites compartilhados | Documentação |
| 04b314c | Decisões e critérios de recuperação por prova restrita | P0-03-F planejamento |
| b717dfc | Schemas públicos de desafio e consentimento | P0-03-F shared |
| 235363b | Transporte público, erros locais e recusa explícita no demo | P0-03-F cliente |
| 4a7184d | Desafio5min, substituição transacional, revogação e replay idempotente | P0-03-F API |
| a47cc81 | Geração, preflight, perfil/cofre e retry após aplicação parcial | P0-03-D/E/F Dados |
| 04c4922 | Triagem do audit, sem alteração de dependências | Preparação de remediação |
| 2f62ffb | Escolha e consentimento no login, retomada por visão somente em memória | P0-03-F UI |
| 82970f6 | Provas de filtros, estado integral, concorrência e replay | P0-03-F AC2–7 |
| 70886f9 | Provas de preflight SQLite, vínculos/cofre e textos da recuperação | P0-03-F AC9–12 |
| d3c0eca | Checkpoint da recuperação local verificada | Documentação |
| 1252ad8 | Contrato interno, erros locais e dependências SMTP fixadas | Parte P0-03-A |
| bf7b07f | AES256GCM com chave externa e AAD por entrega/código | Parte P0-03-A, preparação da fila |
| daa8af5 | Adapter SMTP com TLS verificado e protocolo local real | Parte P0-03-A |
| d63a917 | Correção de espaços finais no relatório do contrato | Gate documental |
| dc6ef3e | Checkpoint da base de e-mail validada | Documentação |
| 7971c7a | Contratos de fila, chaves, domínio e recuperação | P0-03-A planejamento |
| facef7f | Configuração do ring e scheduler recuperável | Parte P0-03-A/P0-07-F |
| 80da210 | Fila cifrada, migração0005, lease/fencing/retentativa/limpeza | Parte P0-03-A |
| b3bed4d | Emissão e consumo transacionais, resposta genérica e logs sem OTP | Parte P0-03-A |
| c7cbee0 | Prova discriminante com sucessor ainda enviando | P0-03-A fencing |
| 5651212 | Bootstrap/shutdown, cleanup do migrador, SMTP real local e texto honesto | P0-03-A integração local |
| 0584b03 | Checkpoint do fluxo de e-mail local verificado | Documentação |
| 9beba70 | Contratos de valor líquido, faixa e preservação histórica | P0-04-A planejamento |
| 610afad | Aritmética exata, rejeição antes da escrita e comparação financeira imutável | P0-04-A API |
| 933db20 | Provas de venda entre lojas e registro do gap de AC4 | P0-04-A verificação |
| 97cc292 | Checkpoint financeiro do servidor aceito | Documentação |
| 395c752 | Contrato da correção compartilhada | P0-04-A2 planejamento |
| e582c09 | Quociente/resto seguros e provas de checkout/outbox/API | P0-04-A2 |

O escopo de uma loja, operador e aparelho com dinheiro/cartão manual/Pix estático está registrado em AD-001 e P0-06-A. As capacidades e a oferta ainda precisam refletir essa decisão em P0-06-B/P1-10-A.

## Verificação executada

| Comando | Resultado final | Ambiente e limite |
|---|---|---|
| `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1` | 434 testes, 39 arquivos, passou | Node24; SQLite real; API Fastify/PGlite em processo nos testes de integração; cofre e hosts nativos simulados |
| `rtk proxy npm run test --workspace=@pdv/shared -- --maxWorkers=1` | 150 testes, 10 arquivos, passou | Node |
| `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1` | 361 testes PGlite e394 na variante com PostgreSQL,24arquivos, passou no conteúdoe582c09 | Variantes em série. A seleção PostgreSQL também contém unitários/PGlite; não são394testes de rede/banco |
| `rtk proxy npm run typecheck` | Passou nos três workspaces | TypeScript |
| `rtk git diff --check` | Passou | Árvore da entrega |
| Validadores da skill para spec/tasks/state aplicáveis | Passaram | Evidências em `.specs/` |

Total das três suítes completas mais recentes: **978 testes aprovados** usando a variante API com PostgreSQL (394 API,434 mobile,150 shared), fonte e582c09. A alternativa com API/PGlite soma945. Não somar variantes ou repetições. Os33casos condicionais PostgreSQL não se registram em PGlite. Nenhum teste registrado foi pulado nos gates finais. Nenhuma contagem comprova Android, entrega externa de e-mail, Google Play ou produção.

O verificador final de recuperação executou API185PGlite/193PostgreSQL, mobile433 e shared148, typecheck todos e diff--check após os reforços T6/T7, então ainda no working tree. Depois confirmou igualdade dos cinco arquivos testados com os commits82970f6/70886f9; não se afirma nova execução após os commits. O gestor leu as fontes críticas, a migração e os diffs de testes e repetiu37 alvos API/PostgreSQL e80 nos quatro arquivos mobile. O relatório independente identifica o conteúdo executado em recuperacao-aparelho/validation.md.

No canal de e-mail, o gestor executou o conjunto completo840/typecheck após os reforços e antes do commitdaa8af5, com o mesmo conteúdo de fonte/testes. O verificador final novo repetiu74 alvos de contrato/cifra/SMTP e typecheckAPI; os revisores por entrega também repetiram24/14/36 casos. Não se afirma repetição independente das suítes completas neste lote. Foram fixados nodemailer10.2.1, smtp-server3.21.1dev e tipos8.0.2/3.5.13; os installs continuaram informando13 entradas no audit, sem alegar remediação.

Na entrega integrada, o gestor rodou todas as suítes/tipos do conteúdo5651212. O verificador novo executou sete arquivos direcionados:92PGlite/117comPostgreSQL e13da tela; não repetiu as suítes completas e o relatório distingue suas execuções das do gestor. Bootstrap e migração em falha usam mocks explícitos; protocolo usa Fastify real por inject e SMTP TCP/PG locais reais. Cinco tabelas financeiras foram preenchidas e comparadas integralmente. A prova de fencing mantém o sucessor ainda enviando enquanto a resposta antiga termina, evitando que o estado terminal mascare a ausência da checagem de token.

Uma rodada ampla iniciada em paralelo excedeu a memória da máquina (Zone/heap) e foi interrompida, sem contar seus resultados como aprovação. Os runners da rodada foram encerrados; mobile/types que tinham terminado foram repetidos depois, e shared/API passaram em execuções seriais com um worker. Não se aumentou o heap nem se reduziu a suite para obter aprovação. Manter somente uma suite ativa por vez nesta máquina, inclusive variantes e workspaces.

O primeiro comando padrão da suíte API esgotou memória com workers paralelos. O mesmo conjunto passou com `--maxWorkers=1`. Dois cenários comerciais que avançam mais de 30 dias passaram a renovar explicitamente a sessão pelas rotas de autenticação; as expectativas financeiras foram preservadas.

PostgreSQL foi criado num container descartável com porta vinculada somente a loopback e banco dedicado `pdv_test`. O helper recusa URL fora de loopback ou com outro banco, pois executa TRUNCATE. O container exato criado para este Goal foi parado e removido com seus volumes ao fim da verificação. Não houve alteração em banco externo.

No lote de limites, foi criado outro container próprio: `codex-prisma-pdv-auth-pg`, id `ec55d9072c81ad93e60e3ed3c59f86a9c76edecbcddae8ef57c26c6dd54b5b80`, imagem `postgres:17-alpine`, porta `127.0.0.1:52490`. Ele também foi parado e removido com volumes depois de liberar os testes. Nenhum container de outros projetos foi alterado. As execuções PostgreSQL foram serializadas após uma possível interferência inicial no banco compartilhado de teste; duas repetições exclusivas e revisões posteriores passaram.

Na recuperação, o container próprio `codex-prisma-pdv-recovery-pg`, id `1d781cefcfb6ea9ac8f4ecff55229c4d34eed2127fa5547635eb1abc5c6f9de0`, PostgreSQL17/porta127.0.0.1:59584/banco pdv_test foi usado exclusivamente por um executor/revisor por vez. Após liberar todos os testes, o gestor conferiu ID/imagem/porta/volume, parou e removeu somente esse container com seu volume anônimo. Nenhum banco externo foi alterado.

Na entrega integrada de e-mail, o primeiro container próprio `codex-prisma-pdv-email-pg`, id `ffb058ed0c8722719a69f359711710d64f8bf140a31cf415e4427071ca930ae9`, usou127.0.0.1:63360/pdv_test. Após a rodada interrompida, havia zero conexões; ele foi removido com o volume e recriado no mesmo endereço com id `ac13ce979bec442d4a984f88213106523cbd11d590aeed1cdf24ae05bc93682e`, para uma validação limpa. Esse segundo container foi conferido e removido com seu volume após o verificador final liberar todos os runners. Nenhum container de outro projeto foi alterado.

## Revisão independente e falhas corrigidas

No lote financeiro, o gestor executou gates amplos seriais e revisou diretamente sync/persistência. O revisor independente reforçou rejeições isoladas e imutabilidade no mesmo status, nos extremos e no tamanho das listas. O verificador final encontrou falta de asserção de loja para vendas: provas de produto não a substituem.933db20 acrescentou três variantes entre lojas, todas com HTTP200, aceitas vazio, loja_invalida e snapshot de sete tabelas intacto. Reavaliação25PGlite/25PostgreSQL/typeAPI PASS;5ACs aceitos e9/9mutações detectadas emscratch, sem alterar árvore real. L018 é candidata, registrada pelo script. validate_state0. O PostgreSQL próprio317f7221b2f656ba7c710224a037a42c1774c4f65c28aee758690354d494dd88,127.0.0.1:58159/pdv_test, foi removido com volume após liberar runners.

Novas vendas exigem fórmula exata do item, somas líquidas e troco seguro só em dinheiro; rejeição preserva dados anteriores e permite vizinhas válidas/retry. Replay/cancelamento compara origem e conteúdo ordenado completo, conservando valores históricos inclusive aritmética antiga inválida; criadaEm salva nunca é reescrita. Não há migração financeira neste lote. A fixture API foi alinhada ao app:700líquidos+troco300, preservando asserções comerciais. Ainda faltam autorização de novas origens/recursos, caixaId e ajustes auditáveis após fechamento.

Foi reproduzida e corrigida uma divergência no shared: preço9007199254740499/q1 produzia9007199254741 pela soma intermediária antiga; agora resulta9007199254740. e582c09 usa quociente/resto sem BigInt novo no runtime compartilhado/mobile. RED demonstrado em dinheiro, checkout e API antes da correção; gates completos posteriores passaram sem filtro. SQLite de arquivo compara pai/filhos/outbox depois de reabrir; Fastify e os dois bancos aceitam o valor e rejeitam o centavo excedente sem escrita. O verificador novo aprovou3ACs, repetiu19shared/18checkout/8API por banco e typecheck todos;5/5mutações da expressão emscratch foram detectadas por asserção, sem alterar árvore real. validate_state0. Sem sinal de lesson. PostgreSQL próprio4830b845ab8f4651595d8241485fcf12dc724a7de5ec020cda93ddf118e23d60,127.0.0.1:54433/pdv_test, foi removido com volume após liberação dos runners. Android não foi executado.

Cada entrega relevante teve revisor que não escreveu a implementação. Os relatórios estão em `.specs/features/` e `.specs/reviews/`.

- A migração comparava a venda em JSON sem detectar um filho normalizado ausente. A conferência agora valida contagens, posições, IDs e conteúdo; triggers que removem item/pagamento causam rollback.
- A retentativa na tela de recebimento tentava inserir novamente a parcela final já salva. Saldo zerado agora retenta somente a conclusão; há testes do hook com fachada real e adapters de UI simulados.
- JSON literal `null` podia gerar uma nova identidade silenciosamente. Agora ele é corrupção, preserva a origem e bloqueia a chamada ao backend.
- Login, emissão e revogação concorriam sem coordenação comum. Agora travam a mesma conta antes de ler/alterar código, aparelho e limite; consultam o relógio depois da trava.

Sensores em cópias temporárias confirmaram detecção de publicação antecipada e versão futura, ausência de escrita de outbox e remoção da trava de login. O revisor repetiu 12 testes de sessões no PostgreSQL local. Sem a trava de login, três falharam, incluindo duas aprovações concorrentes para limite de um aparelho. A árvore real permaneceu intacta.

No acesso mobile, as revisões também corrigiram invalidação de token novo por logout antigo, licença/catálogo de origem antiga, janela de escrita após preflight, lista e revogação atrasadas na tela de aparelhos e erro de gravação que deixava o formulário Pix ocupado. O teste React usa `react-test-renderer`19.3.0, dependência apenas de desenvolvimento e depreciada; hooks são reais, hosts nativos são simulados. Não é homologação de Android.

O verificador novo confrontou os oito critérios locais com asserções em arquivo/linha em `.specs/features/acesso-mobile/validation.md`. Em `git archive HEAD` isolado, retirou a guarda de token antigo e observou três falhas, incluindo 401/logout atrasados. Scratch descartado e Git real inalterado. O veredito é PASS do contrato local, sem aprovar P0-03 global.

No lote de limites, a revisão corrigiu abertura antecipada da janela após verificação sem consumo e recuo do relógio. Os testes confirmam emissão3/email com intervalo60s,20 pedidos/IP,5 falhas/email sem renovação pelo reenvio e50 logins/IP. Respostas401/409 esperadas confirmam contadores; falhas inesperadas no insert de código/sessão fazem rollback, sem invalidar código anterior nem criar sessão indevida. Duas instâncias Fastify compartilham o estado no PostgreSQL local.

O verificador final de limites rejeitou inicialmente AC6 por ausência de duas provas, sem demonstrar defeito funcional. O commit1fb5255 acrescentou falha de emissão com/sem código anterior e código legado com quatro erros, isolando seu teto próprio do limite agregado por e-mail. A reavaliação aceitou os nove critérios. Cinco mutações em355b89a e outra em1fb5255 foram detectadas por asserções; nenhuma sobreviveu. O relatório `.specs/features/limites-auth/validation.md` identifica os HEADs e limites. Duas lições candidatas foram registradas pelo script da skill e não foram promovidas a orientações confirmadas.

Na recuperação, o OTP prova a conta e abre um desafio restrito de cinco minutos, sem acesso privado antes do consentimento. A confirmação trava a conta, revalida alvo/capacidade e revoga origem/todas as sessões, criando o novo acesso em um commit. Replay idêntico recupera a mesma sessão enquanto válida; não renova nem reativa acesso. Os testes com duas instalações SQLite e API real em processo preservam produto, caixa, parcela1000 e saldo1500 na origem e todas as tabelas financeiras do servidor. Não há promessa de transferência ou restauração de vendas no novo aparelho.

A revisão de Dados reproduziu um defeito: após registrar a nova identidade e falhar ao carregar seus dados, o retry ainda comparava o vínculo anterior. A adoção da própria aplicação parcial agora exige mesma tentativa/geração, sessão ausente e igualdade integral de identidade/perfil; outro contexto não é adotado. A UI retoma a visão sem segredo após remontagem, exige seleção/consentimento e protege callbacks atrasados. Cofre e hosts nativos continuam simulados nos testes.

O verificador final inicialmente manteve FAIL por lacunas de prova, sem novo defeito funcional demonstrado. Os reforços82970f6/70886f9 acrescentaram candidatos adversariais, snapshots integrais, múltiplas sessões, mudanças enquanto aguardava trava comprovada por pg_blocking_pids, preflight SQLite durável e validações antes do cofre. A reavaliação aprovou13ACs locais. Cinco mutações na fonte2f62ffb foram detectadas por asserções em scratch isolado: TTL, expiração, revogação em replay, geração e ID da visão. Essa fonte permaneceu igual nos commits de testes, por isso o sensor não foi repetido; a árvore real ficou intacta. validate_state passou. Lições da auditoria são candidatas, registradas pelo script da skill.

A base de e-mail tem contrato interno estrito, normalização UTC/Z e erros locais. AES256GCM protege o payload com chave externa32bytes, IV12 e AAD por IDs; teste independente com crypto nativo verifica o formato. SMTP remoto exige autenticação/TLS verificado; modo sem TLS só permite IP de loopback em dev/test. TCP local confirmou envelope/conteúdo/Message-ID,450/550,timeout real de saudação e AUTH com TLS confiável. Certificado/chave são fixtures públicas; só os filhos de teste recebem essa CA, sem alterar a confiança do Windows. No checkpoint da base, esse módulo ainda não estava ligado à rota/fila e não havia mensagem a destinatário externo.

A revisão direta corrigiu classificação de450 com texto mencionando TLS como erro permanente. As revisões também reforçaram prova independente de AAD, base64 canônico, resultado accepted/rejected e isolamento dos erros de TLS. O verificador final aprovou8ACs e detectou5mutações emscratchdaa8af5: AAD errado,IVfixo,base64não-canônico,certificadoignorado e remoção da guarda de aceitação. O único FAIL final foi por espaços finais em relatório; d63a917 corrigiu só documentação, diff--check passou e o revisor atualizou PASS sem repetir os gates/sensor. validate_state passou. Outros timeouts têm prova da opção5000ms, sem alegar expiração real de todos.

O fluxo de entrega agora integra a emissão à fila e ao bootstrap: OTP e envelope no mesmo commit,204uniforme, leases60s/fencing, cinco tentativas e limpeza do segredo no terminal. Rejeições falsy não são aceitas como sucesso. Testes com triggers SQL provam rollback preservando o código anterior ainda utilizável e a atomicidade do consumo em login/recuperação/quinta falha. Retentativa SMTP depois da conexão cair após DATA conserva código, Message-ID e validade; ela pode produzir mensagens duplicadas, não nova credencial. O domínio fica fixo na entrega e a retirada de chaves exige drenagem e barreira operacional entre emissores antigos, ainda não executada externamente.

O verificador final de entrega-codigo aprovou9ACs e matou5mutações por asserção em5651212: retirar fencing, omitir cancelamento no consumo, pular validação de pendências no bootstrap, antecipar o timer e ignorar cleanup de migração. Usou scratch isolado, junctions removidas separadamente e árvore real preservada. validate_state retornou0. Sinais de processo foram inspecionados no código, sem ensaio de processo/implantação. Nenhum envio a caixa de entrada externa foi realizado.

## Pendências externas e limites

- Android e artefato final: não houve execução em aparelho. `adb` não foi encontrado no PATH. Reinício forçado, atualização, scanner, câmera e pagamentos manuais precisam de roteiro no artefato exato.
- E-mail: emissão/fila/ciclo/SMTP integrados e verificados localmente. Provider/credenciais/domínio/destinatário, caixa de entrada, alertas e barreira operacional externa ainda não homologados. Roteiro em operacao-email-codigo.md, sem contratação ou mensagens externas.
- Proxy/relógios: request.ip usa a conexão observada, sem trustProxy; IP final do cliente e sincronização de relógios no ambiente de implantação ainda exigem inventário/teste. A retenção SQL foi preparada e testada localmente, sem agendamento externo. Limites por IP no proxy real não foram homologados.
- Google Play: produtos, credenciais, compra/restauração/notificações e contas de teste ainda não foram integrados/homologados. Mock não conta como assinatura real.
- Infraestrutura: inventário Easypanel, domínio/HTTPS, backups/restauração, alertas, réplicas e retorno de versão ainda não foram exercitados externamente.
- Produção recusa billing mock. É um bloqueio intencional; não deve ser contornado para implantar.
- SecureStore físico, fluxo visual/interativo e acessibilidade em Android ainda não foram executados. Se metadata e cofre falharem juntos ao retirar credencial, não há promessa de exclusão durável; acesso em memória é negado e finanças preservadas. Reset dev possui janela documentada para credencial órfã.
- Audit classificado em docs/triagem-dependencias.md:13 entradas completas(5low/4moderate/4high),9 com omit-dev(5low/4high). Entradas propagadas não equivalem a CVEs independentes. Nenhuma dependência foi alterada, nenhuma remediação ou análise do alcance do APK concluída; nenhum `audit fix --force` aplicado.
- Nenhum push, publicação, contratação, cobrança real ou mudança de produção foi executado.

## Próximos lotes executáveis

1. P0-04-B: autorização de loja/aparelho/operador no push, origem de novas operações e reenvio/restauração canônicos. Aritmética e arredondamento compartilhado A/A2 já aceitos localmente.
2. P0-04-C/D/E: capacidades, vínculo caixaId no contrato/bancos/checkout e ajustes após fechamento. O vínculo atual é local; não concluir P0-01-E integral antes desse contrato.
3. P0-02: outbox completa, envio/ack/retry, pull paginado/cursor transacional, conflitos e recuperação autenticada. A recuperação de acesso entregue não substitui esse bloco.
4. Homologação externa de e-mail quando houver acesso autorizado; capacidades/oferta, assinatura real, build/CI, operação, remediação de dependências e mínimos P1. Continuar as partes locais independentes enquanto faltarem acessos externos.

O plano principal mantém os critérios globais sem marcação quando falta verificação exigida. O adapter browser é demonstrativo e não possui a atomicidade multi-chave do SQLite nativo. O projeto **não está pronto para produção**.

## Retomada e agentes

O gestor centralizou integração, revisão direta de persistência/autenticação, plano e commits. Subagentes foram solicitados como `gpt-6.1-terra` com esforço `medium`; a ferramenta aceitou os parâmetros, mas só devolveu task_name, sem confirmação independente do modelo efetivo. Essa limitação está registrada em AD-005. Nenhum executor criou outros agentes ou commits.

Ler `.specs/STATE.md`, conferir Git e seguir pelo primeiro lote pendente. O README modificado antes do trabalho foi preservado e continua fora dos commits desta execução.
