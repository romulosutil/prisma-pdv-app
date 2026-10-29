# Checkpoint da execução do plano de produção

Referência: 29/10/2026, após acesso mobile e limites compartilhados de autenticação. Goal persistente **ativo**. Este checkpoint não encerra o trabalho executável e não aprova produção.

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

O escopo de uma loja, operador e aparelho com dinheiro/cartão manual/Pix estático está registrado em AD-001 e P0-06-A. As capacidades e a oferta ainda precisam refletir essa decisão em P0-06-B/P1-10-A.

## Verificação executada

| Comando | Resultado final | Ambiente e limite |
|---|---|---|
| `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1` | 353 testes, 35 arquivos, passou | Node24; SQLite real; 5 cenários com API Fastify/PGlite em processo; cofre e hosts nativos simulados |
| `rtk proxy npm run test --workspace=@pdv/shared` | 136 testes, 9 arquivos, passou | Node |
| `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1` | 152 testes PGlite e156 PostgreSQL, 11 arquivos, passou | PostgreSQL17 local dedicado via PDV_TEST_POSTGRES_URL. Quatro cenários adicionais só entram com PostgreSQL; há testes unitários sem banco e migração legada em PGlite |
| `rtk proxy npm run typecheck` | Passou nos três workspaces | TypeScript |
| `rtk git diff --check` | Passou | Árvore da entrega |
| Validadores da skill para spec/tasks/state aplicáveis | Passaram | Evidências em `.specs/` |

Total das três suítes finais usando API/PostgreSQL: **645 testes aprovados** (156 API,353 mobile,136 shared). Com API/PGlite, a alternativa é641; não somar as duas execuções da API como casos distintos. O checkpoint anterior tinha612 no conjunto comparável com PGlite. Nenhuma contagem comprova Android, entrega de e-mail, Google Play ou produção.

O executor rodou as suítes completas API152/156 após os três testes adicionais. O gestor repetiu a suíte API antes desses testes, os15 testes finais de rotas no PGlite e a suíte mobile353/typecheck todos. O verificador final executou os três workspaces/typecheck em355b89a e repetiu os alvos27 PGlite/31 PostgreSQL em1fb5255. Essa última revisão mudou apenas testes, preservando a fonte já verificada; não se afirma uma repetição independente da suíte completa156 no último HEAD.

O primeiro comando padrão da suíte API esgotou memória com workers paralelos. O mesmo conjunto passou com `--maxWorkers=1`. Dois cenários comerciais que avançam mais de 30 dias passaram a renovar explicitamente a sessão pelas rotas de autenticação; as expectativas financeiras foram preservadas.

PostgreSQL foi criado num container descartável com porta vinculada somente a loopback e banco dedicado `pdv_test`. O helper recusa URL fora de loopback ou com outro banco, pois executa TRUNCATE. O container exato criado para este Goal foi parado e removido com seus volumes ao fim da verificação. Não houve alteração em banco externo.

No lote de limites, foi criado outro container próprio: `codex-prisma-pdv-auth-pg`, id `ec55d9072c81ad93e60e3ed3c59f86a9c76edecbcddae8ef57c26c6dd54b5b80`, imagem `postgres:17-alpine`, porta `127.0.0.1:52490`. Ele também foi parado e removido com volumes depois de liberar os testes. Nenhum container de outros projetos foi alterado. As execuções PostgreSQL foram serializadas após uma possível interferência inicial no banco compartilhado de teste; duas repetições exclusivas e revisões posteriores passaram.

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

## Pendências externas e limites

- Android e artefato final: não houve execução em aparelho. `adb` não foi encontrado no PATH. Reinício forçado, atualização, scanner, câmera e pagamentos manuais precisam de roteiro no artefato exato.
- E-mail: provider, credenciais, domínio e entrega em homologação ainda não estão integrados/verificados. A emissão de códigos atual não é entrega real.
- Proxy/relógios: request.ip usa a conexão observada, sem trustProxy; IP final do cliente e sincronização de relógios no ambiente de implantação ainda exigem inventário/teste. A retenção SQL foi preparada e testada localmente, sem agendamento externo. Limites por IP no proxy real não foram homologados.
- Google Play: produtos, credenciais, compra/restauração/notificações e contas de teste ainda não foram integrados/homologados. Mock não conta como assinatura real.
- Infraestrutura: inventário Easypanel, domínio/HTTPS, backups/restauração, alertas, réplicas e retorno de versão ainda não foram exercitados externamente.
- Produção recusa billing mock. É um bloqueio intencional; não deve ser contornado para implantar.
- SecureStore físico, fluxo visual/interativo e acessibilidade em Android ainda não foram executados. Se metadata e cofre falharem juntos ao retirar credencial, não há promessa de exclusão durável; acesso em memória é negado e finanças preservadas. Reset dev possui janela documentada para credencial órfã.
- O audit após instalar expo-sqlite informou 9 vulnerabilidades (5 low, 4 high). A classificação/remediação ainda é trabalho local pendente; nenhum `audit fix --force` foi aplicado.
- Nenhum push, publicação, contratação, cobrança real ou mudança de produção foi executado.

## Próximos lotes executáveis

1. Completar recuperação do dono quando o aparelho original está perdido e o limite está ocupado: o login do substituto ainda encontra `limite_aparelhos` e não dispõe de sessão privada para revogar o perdido. Preparar confirmação autenticada por código, substituição explícita e idempotente, sem apagar operações da origem nem reativar aparelho silenciosamente. Esse fluxo não foi dado como concluído pela gestão de aparelhos já entregue.
2. Implementar entrega transacional de e-mail, retentativa e tratamento de falha, deixando a homologação de entrega bloqueada enquanto faltarem configuração, destinatário de teste autorizado e acesso externos. Limites compartilhados de emissão/tentativas já estão comprovados localmente em P0-03-B; não repetir sua implementação. Integrar a recuperação autenticada aos mesmos limites, sem abrir orçamento paralelo.
3. P0-04: consistência financeira e autorização no servidor, vínculo caixaId no contrato/bancos/checkout e ajustes posteriores ao fechamento. O vínculo de caixa atual é local; não concluir P0-01-E integral antes desse contrato.
4. P0-02: outbox para todas as mutações, envio/ack/retry, pull paginado/cursor transacional, conflitos e recuperação autenticada.
5. Capacidades de produção e oferta coerente, assinatura real, build/CI, operação e mínimos P1 obrigatórios. Continuar as partes independentes enquanto homologações externas estiverem bloqueadas.

O plano principal mantém os critérios globais sem marcação quando falta verificação exigida. O adapter browser é demonstrativo e não possui a atomicidade multi-chave do SQLite nativo. O projeto **não está pronto para produção**.

## Retomada e agentes

O gestor centralizou integração, revisão direta de persistência/autenticação, plano e commits. Subagentes foram solicitados como `gpt-6.1-terra` com esforço `medium`; a ferramenta aceitou os parâmetros, mas só devolveu task_name, sem confirmação independente do modelo efetivo. Essa limitação está registrada em AD-005. Nenhum executor criou outros agentes ou commits.

Ler `.specs/STATE.md`, conferir Git e seguir pelo primeiro lote pendente. O README modificado antes do trabalho foi preservado e continua fora dos commits desta execução.
