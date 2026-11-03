# R0 — API e APK conectado

Execução: 01/11/2026 (America/Sao_Paulo). App 0.1.5, versionCode 6. Esta entrega corresponde à primeira etapa solicitada pelo usuário: API funcionando, APK conectado e login real. R1 (equipe/permissões) não foi implementada aqui.

## Ambientes

| Destino | API | Banco | Evidência |
|---|---|---|---|
| Produção existente | `https://aladdin-pdv-api.jicnzg.easypanel.host` | `aladdin/pdv-postgres`, banco `pdv` | `/saude` 200 com consulta ao PostgreSQL |
| Homologação nova | `https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host` | `aladdin/pdv-postgres-homologacao`, banco `pdv_homologacao` | `/saude` 200; cadastro, push/pull e logout executados |
| Demo local | Sem API | Dados no aparelho | Perfil explícito `demo`/`teste` |

As duas APIs usam o commit `bc786bc86abac934754ee1dd35d8524f9c04c9c1`, branch de entrega `codex/pdv-deploy`, Dockerfile da raiz e migrações no startup. O [CI 41161659608](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41161659608) terminou com sucesso, incluindo tipos, shared, API com PostgreSQL, mobile, imagem e deploy. A inspeção final do EasyPanel confirmou esse SHA nos dois serviços.

Homologação tem banco, usuário, senha e chave de cifra próprios; o PostgreSQL não publica porta externa. Nenhum banco ou dado da demo foi copiado. O mesmo remetente e credencial SMTP já configurados no serviço original foram reaproveitados; uma credencial Resend exclusiva de homologação continua pendente. Não guardar credenciais, tokens ou OTP neste relatório.

Ambas as APIs usam `NODE_ENV=production`, `BILLING_PROVIDER=disabled` e `JOBS=on`. A cobrança não é agendada; o worker de códigos continua ativo. A licença tem status `liberada`, sem cartão/fatura. O código de acesso tem prazo de dez minutos e uso único.

## Build

Os perfis `demo`, `homologacao` e `producao` são explícitos em `apps/mobile/eas.json`. `teste` herda `demo`. O Expo valida a configuração ao gerar o projeto, e a instância do app a valida novamente. Configuração conectada sem URL HTTPS interrompe a carga; falha de rede permanece um erro HTTP, sem criação de conta ou semente demo. Produção rejeita ferramentas de teste.

O APK de homologação usa outro nome, scheme e pacote Android. Isso preserva a demo instalada e impede importar seus dados no teste conectado. A geração local é reproduzível com `scripts/build-android.ps1 -Perfil homologacao`; logs, APK, SHA256, assinatura e metadados ficam na pasta ignorada `builds/`. O script valida o host no bundle final e a ausência das strings de diagnóstico. A assinatura local é de testes (Android Debug).

Build final: **Gradle BUILD SUCCESSFUL em 7m03s**, 657 tarefas. Artefato `builds/pdv-homologacao-0.1.5.apk`, 74.551.315 bytes; pacote `br.com.pdv.mobile.homologacao`, versionName `0.1.5`, versionCode `6`, minSdk 24 e targetSdk 36, ARM32/ARM64. Assinatura APK v2 válida, Android Debug. SHA256: `4f1bf47acd7c1a2d6eecabc9bdf5fd9cb5a1f150a3323871d1b34ce64dec3641`. O bundle extraído do APK contém o host de homologação e não contém as strings das ferramentas de diagnóstico verificadas pelo script. Os arquivos `pdv-homologacao-0.1.5-{build,prebuild}.log`, `-assinatura.txt`, `-metadados.txt` e `.apk.sha256` guardam as evidências locais.

Foram comparados por SHA256 **255 arquivos** de app, src, assets, config e shared entre o checkout e a cópia `C:/p`, sem divergências. O inventário está em `builds/fontes-apk-homologacao-0.1.5.json`. Os tipos foram conferidos novamente ao final; `git diff --check` passou. O daemon Gradle foi encerrado após a compilação.

## Resultados até aqui

- `/saude` 200 nos dois domínios, com validação HTTPS normal; a restrição de rede local causou o erro de DNS anterior, não o serviço remoto.
- Nova conta de homologação: acesso Pro `liberada`, sem cartão; primeiro pull vazio (nenhum produto, venda ou caixa fictício).
- Produto de teste, caixa com R$ 10,00 de troco e venda manual de R$ 7,00: três mutações aceitas, sem rejeições; reenvio do lote aceito sem duplicar.
- Logout seguido de `/conta`: sessão recusada com 401.
- `/dev/relogio/avancar`: 404 no ambiente remoto.
- `/auth/codigo`: 204 com corpo vazio. Mensagem de `acesso@prumo.services` com assunto de código do Prisma PDV apareceu na caixa descartável do Temp Mail autorizada pelo usuário.
- A leitura da mensagem no navegador encontrou timeouts repetidos. Um redirecionamento de publicidade para `defensecore.live` foi bloqueado pela revisão automática; retornou-se somente ao Temp Mail autorizado, sem liberar o domínio externo. Um novo código foi solicitado ao mesmo destinatário, e a aba da mensagem ficou preservada para conclusão pelo usuário. Nenhum código foi extraído do banco ou devolvido pelo servidor para contornar a autenticação.
- **Login e restauração remotos aprovados às 21h29 de 01/11/2026 (São Paulo).** O primeiro código informado foi recusado com 401. Um novo código foi solicitado às 21h23 e informado pelo usuário, sem gravação no relatório. O `BackendHttp` do app autenticou outro ID de aparelho; `/conta` confirmou o destinatário e a licença permaneceu `liberada`. A reutilização desse código foi recusada com 401. O pull recuperou exatamente um produto, um caixa e uma venda de R$ 7,00, mantendo o caixa, o operador e o aparelho de origem; consulta com o cursor confirmado não repetiu dados. A sessão de teste foi encerrada no servidor ao terminar. Evidência sanitizada: `builds/r0-smoke-login.json`. O teste foi HTTP com o cliente real do app, sem execução física do APK.
- Tipos dos três workspaces aprovados. Mobile: 497/502 na restrição de rede, depois os cinco testes HTTP locais afetados passaram fora da restrição; total 502 aprovados. Shared: 167 aprovados. Testes novos incluem build sem ambiente/URL, URL insegura, mistura demo/API e falha de rede sem fallback.

## Backup e saúde

O banco de produção já possuía agendamento diário `0 2 * * *`, retenção de sete cópias. Homologação recebeu agendamento `15 2 * * *`, retenção de sete cópias e caminho próprio `aladdin/pdv-postgres-homologacao`. O primeiro backup imediato `r0-homologacao-20261101` teve seu arquivo e log de sucesso confirmados posteriormente na interface do painel.

**Restauração aprovada em 01/11/2026, 21h40:** foi gerado novo backup `r0-validacao-restauracao-20261101`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-02T00:34:21.633Z.sql.gz` (11,2 kB). A restauração no PostgreSQL novo e vazio `aladdin/pdv-postgres-restauracao-r0` terminou com sucesso às 21h38min32s. As 24 tabelas, 38 registros, oito migrações, estrutura e três sequências conferiram com a origem. IDs, autoria e venda de R$ 7,00 foram preservados, sem divergências de integridade. O serviço de destino foi desativado, com porta externa zero e volume mantido. [Roteiro, resultados e evidências](r0-restauracao-backup.md).

O único destino conectado foi identificado como **Local Disk**. Não há evidência de cópia fora da VPS. O conector executou o backup e a restauração; a interface do EasyPanel forneceu o caminho do arquivo e o log de conclusão. Produção e homologação permaneceram saudáveis, sem restauração sobre seus bancos.

O healthcheck Docker consulta `/saude` a cada 30 segundos, com timeout de cinco segundos e três falhas. Alertas externos de indisponibilidade, fila de e-mail e falha de backup não foram comprovados; exigem configurar/verificar um destino de notificações. O volume e a programação não substituem backup restaurado.

**Decisão de escopo em 01/11/2026:** o usuário adiou cópia externa e alertas de falha de backup/saúde para depois da validação do produto. Esses recursos estão no [backlog do roadmap](roadmap-app-completo.md#backlog-apos-validacao-do-produto), sem bloquear o MVP. A inspeção encontrou somente Local Disk e nenhum canal de notificações. Nenhuma configuração de infraestrutura foi alterada nesta rodada; os backups locais e healthchecks foram preservados. Serviços futuros do PDV usarão o prefixo `pdv-`.

## Pendências para concluir R0

- Complementar a homologação remota de expiração, limites de tentativas e substituição de aparelho no limite do plano. Envio, recebimento, login, reuso bloqueado e restauração normal em novo aparelho já foram comprovados; os cenários de expiração/limites também possuem testes automatizados, mas não foram todos repetidos no serviço remoto.
- Instalar o APK exato no Android, cadastrar/entrar com um e-mail controlado pelo testador, vender, sincronizar, reiniciar e restaurar em outra instalação autorizada. Nenhum Android estava conectado ao ADB na execução inicial. Não usar o e-mail descartável em uma conta comercial.
- Emitir credencial SMTP própria de homologação se for necessário isolamento completo de credenciais e cota do provedor.

As evidências HTTP não equivalem a teste físico do APK. R0 permanece em homologação até concluir os pontos aplicáveis acima.
