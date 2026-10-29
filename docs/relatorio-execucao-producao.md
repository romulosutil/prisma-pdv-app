# Checkpoint da execução do plano de produção

Referência: 29/10/2026, após recuperação consentida do aparelho perdido, até70886f9. Goal persistente **ativo**. Este checkpoint não encerra o trabalho executável e não aprova produção.

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

O escopo de uma loja, operador e aparelho com dinheiro/cartão manual/Pix estático está registrado em AD-001 e P0-06-A. As capacidades e a oferta ainda precisam refletir essa decisão em P0-06-B/P1-10-A.

## Verificação executada

| Comando | Resultado final | Ambiente e limite |
|---|---|---|
| `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1` | 433 testes, 39 arquivos, passou | Node24; SQLite real; API Fastify/PGlite em processo nos testes de integração; cofre e hosts nativos simulados |
| `rtk proxy npm run test --workspace=@pdv/shared -- --maxWorkers=1` | 148 testes, 10 arquivos, passou | Node |
| `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1` | 185 testes PGlite e193 PostgreSQL, 12 arquivos, passou | PostgreSQL17 local dedicado via PDV_TEST_POSTGRES_URL. Oito cenários adicionais só entram com PostgreSQL; há testes unitários sem banco e migração legada em PGlite |
| `rtk proxy npm run typecheck` | Passou nos três workspaces | TypeScript |
| `rtk git diff --check` | Passou | Árvore da entrega |
| Validadores da skill para spec/tasks/state aplicáveis | Passaram | Evidências em `.specs/` |

Total das três suítes finais usando API/PostgreSQL: **774 testes aprovados** (193 API,433 mobile,148 shared). Com API/PGlite, a alternativa é766; não somar as duas execuções da API como casos distintos. Nenhum teste registrado foi pulado. Nenhuma contagem comprova Android, entrega de e-mail, Google Play ou produção.

O verificador final de recuperação executou as quatro variantes completas acima, typecheck todos e diff--check após os reforços T6/T7, então ainda no working tree. Depois confirmou igualdade dos cinco arquivos testados com os commits82970f6/70886f9; não se afirma nova execução após os commits. O gestor leu as fontes críticas, a migração e os diffs de testes e repetiu37 alvos API/PostgreSQL e80 nos quatro arquivos mobile. O relatório independente identifica o conteúdo executado em recuperacao-aparelho/validation.md.

O primeiro comando padrão da suíte API esgotou memória com workers paralelos. O mesmo conjunto passou com `--maxWorkers=1`. Dois cenários comerciais que avançam mais de 30 dias passaram a renovar explicitamente a sessão pelas rotas de autenticação; as expectativas financeiras foram preservadas.

PostgreSQL foi criado num container descartável com porta vinculada somente a loopback e banco dedicado `pdv_test`. O helper recusa URL fora de loopback ou com outro banco, pois executa TRUNCATE. O container exato criado para este Goal foi parado e removido com seus volumes ao fim da verificação. Não houve alteração em banco externo.

No lote de limites, foi criado outro container próprio: `codex-prisma-pdv-auth-pg`, id `ec55d9072c81ad93e60e3ed3c59f86a9c76edecbcddae8ef57c26c6dd54b5b80`, imagem `postgres:17-alpine`, porta `127.0.0.1:52490`. Ele também foi parado e removido com volumes depois de liberar os testes. Nenhum container de outros projetos foi alterado. As execuções PostgreSQL foram serializadas após uma possível interferência inicial no banco compartilhado de teste; duas repetições exclusivas e revisões posteriores passaram.

Na recuperação, o container próprio `codex-prisma-pdv-recovery-pg`, id `1d781cefcfb6ea9ac8f4ecff55229c4d34eed2127fa5547635eb1abc5c6f9de0`, PostgreSQL17/porta127.0.0.1:59584/banco pdv_test foi usado exclusivamente por um executor/revisor por vez. Após liberar todos os testes, o gestor conferiu ID/imagem/porta/volume, parou e removeu somente esse container com seu volume anônimo. Nenhum banco externo foi alterado.

## Revisão independente e falhas corrigidas

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

## Pendências externas e limites

- Android e artefato final: não houve execução em aparelho. `adb` não foi encontrado no PATH. Reinício forçado, atualização, scanner, câmera e pagamentos manuais precisam de roteiro no artefato exato.
- E-mail: provider, credenciais, domínio e entrega em homologação ainda não estão integrados/verificados. A emissão de códigos atual não é entrega real.
- Proxy/relógios: request.ip usa a conexão observada, sem trustProxy; IP final do cliente e sincronização de relógios no ambiente de implantação ainda exigem inventário/teste. A retenção SQL foi preparada e testada localmente, sem agendamento externo. Limites por IP no proxy real não foram homologados.
- Google Play: produtos, credenciais, compra/restauração/notificações e contas de teste ainda não foram integrados/homologados. Mock não conta como assinatura real.
- Infraestrutura: inventário Easypanel, domínio/HTTPS, backups/restauração, alertas, réplicas e retorno de versão ainda não foram exercitados externamente.
- Produção recusa billing mock. É um bloqueio intencional; não deve ser contornado para implantar.
- SecureStore físico, fluxo visual/interativo e acessibilidade em Android ainda não foram executados. Se metadata e cofre falharem juntos ao retirar credencial, não há promessa de exclusão durável; acesso em memória é negado e finanças preservadas. Reset dev possui janela documentada para credencial órfã.
- Audit classificado em docs/triagem-dependencias.md:13 entradas completas(5low/4moderate/4high),9 com omit-dev(5low/4high). Entradas propagadas não equivalem a CVEs independentes. Nenhuma dependência foi alterada, nenhuma remediação ou análise do alcance do APK concluída; nenhum `audit fix --force` aplicado.
- Nenhum push, publicação, contratação, cobrança real ou mudança de produção foi executado.

## Próximos lotes executáveis

1. Implementar entrega transacional de e-mail, retentativa e tratamento de falha P0-03-A, incluindo protocolo real em ambiente local. Homologação externa fica bloqueada enquanto faltarem configuração, destinatário de teste autorizado e acesso. Limites e recuperação usam os mesmos orçamentos já entregues; não abrir orçamento paralelo. Código devolvido em desenvolvimento não é entrega real.
2. P0-04: consistência financeira e autorização no servidor, vínculo caixaId no contrato/bancos/checkout e ajustes posteriores ao fechamento. O vínculo de caixa atual é local; não concluir P0-01-E integral antes desse contrato.
3. P0-02: outbox para todas as mutações, envio/ack/retry, pull paginado/cursor transacional, conflitos e recuperação autenticada. A recuperação de acesso entregue não substitui esse bloco.
4. Capacidades de produção e oferta coerente, assinatura real, build/CI, operação, remediação de dependências e mínimos P1 obrigatórios. Continuar as partes independentes enquanto homologações externas estiverem bloqueadas.

O plano principal mantém os critérios globais sem marcação quando falta verificação exigida. O adapter browser é demonstrativo e não possui a atomicidade multi-chave do SQLite nativo. O projeto **não está pronto para produção**.

## Retomada e agentes

O gestor centralizou integração, revisão direta de persistência/autenticação, plano e commits. Subagentes foram solicitados como `gpt-6.1-terra` com esforço `medium`; a ferramenta aceitou os parâmetros, mas só devolveu task_name, sem confirmação independente do modelo efetivo. Essa limitação está registrada em AD-005. Nenhum executor criou outros agentes ou commits.

Ler `.specs/STATE.md`, conferir Git e seguir pelo primeiro lote pendente. O README modificado antes do trabalho foi preservado e continua fora dos commits desta execução.
