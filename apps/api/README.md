# @pdv/api

API do PDV: Fastify 5 + TypeScript + Drizzle ORM (dialeto Postgres). O domínio (planos, assinatura, licença, billing mock, contrato zod) vem de `@pdv/shared`.

Homologação em 03/11/2026: R1–R5 no candidato `a987c31`, PostgreSQL 17/CI e fluxo HTTP financeiro aprovados. Cobrança desativada por padrão; simulador somente por escolha explícita em desenvolvimento/teste e proibido em produção. Respostas fornecem `x-pdv-agora` para novas operações do app conectado. Android físico e demais pendências constam no [roadmap](../../docs/roadmap-app-completo.md).

## API

### Como rodar

```
npm run dev -w @pdv/api        # tsx watch, porta 3333 (PORT), banco PGlite em apps/api/.data
npm run start -w @pdv/api      # sem watch
npm run test -w @pdv/api       # vitest: PGlite em memória, RelogioFalso, MockBillingProvider
npm run typecheck -w @pdv/api
npm run db:generate -w @pdv/api  # gera a migração em drizzle/ depois de mudar src/db/schema.ts
```

As migrações em `drizzle/` são aplicadas na inicialização.

| Variável | Efeito |
|---|---|
| `PORT` | Porta HTTP (padrão 3333). |
| `DATABASE_URL` | Postgres (postgres.js). Sem ela, usa PGlite em `.data/pglite`. Obrigatória com `NODE_ENV=production`. |
| `NODE_ENV=production` | Não registra `/dev/*`, desliga o CORS e não devolve o código de login na resposta. |
| `BILLING_PROVIDER` | `mock` por padrão, recusado em produção. `disabled` concede acesso sem cobrança, cartão ou faturas; é o modo de produção inicial. Novos gateways entram em `src/billing.ts`. |
| `JOBS=off` | Não agenda o job de cobrança (que roda a cada hora). |

Fora de produção o relógio do servidor anda em tempo real e pode ser avançado por `POST /dev/relogio/avancar`.

### Rotas

Erros: `{ "erro": "codigo_estavel", "mensagem": "Texto em português" }`. Rotas marcadas com (auth) pedem `Authorization: Bearer <token>`.

| Rota | O que faz |
|---|---|
| `GET /saude` | `{ status: "ok" }` |
| `GET /planos` | Catálogo `PLANOS`, em ordem. |
| `POST /contas` | Cria conta + loja + operador dono + aparelho + sessão. 409 `email_ja_cadastrado`, `documento_ja_cadastrado`, `aparelho_em_uso`. |
| `POST /auth/codigo` | `{ email }`: gera código de 6 dígitos (10 min). Fora de produção responde `{ codigo }` e loga; em produção, 204. |
| `POST /auth/vinculos` | E-mail pessoal + código: lista somente vínculos ativos/convites válidos da pessoa. Não cria sessão nem consome o código. |
| `POST /auth/login` | E-mail + código + aparelho e `operadorId` selecionado; convite exige `aceitarConvite: true`. 401 `codigo_invalido` (5 erros bloqueiam o código); 409 `limite_aparelhos`, `selecionar_vinculo`, `aceitar_convite`. |
| `GET /conta` (auth) | Identidade pessoal e papel/permissões no vínculo da sessão. |
| `GET /equipe` (auth, dono) | Usuários e convites da loja atual. |
| `POST /equipe/convites` (auth, dono) | Nome, e-mail pessoal, papel gerente/operador e permissões opcionais; convite de sete dias, sem envio automático de mensagem. |
| `PUT /equipe/:id` (auth, dono) | Altera estado, papel ou permissões; revoga sessões do vínculo e conserva histórico. |
| `POST /auth/logout` (auth) | Revoga a sessão atual. |
| `GET /assinatura` (auth) | Assinatura + licença. Conta sem assinatura vem como `sem_assinatura`. |
| `POST /assinatura` (auth) | Plano + token do cartão; inicia o teste. 402 `cartao_recusado`; 409 `teste_ja_usado` (um por CPF/CNPJ e por cartão), `assinatura_existente`. |
| `POST /assinatura/trocar-plano` (auth) | Upgrade cobra a prorata e vale na hora; downgrade fica agendado. 402 `pagamento_recusado`. |
| `PUT /assinatura/cartao` (auth) | Verifica e troca o cartão; inadimplente ou suspensa cobra na hora e reativa. |
| `POST /assinatura/cancelar` (auth) | Cancela; o acesso vai até o fim do teste ou do período pago. |
| `POST /assinatura/reativar` (auth) | `{ planoId }`: reassina. Fora do teste e do período pago, cobra antes de liberar. |
| `POST /sync/push` (auth) | Mutações da outbox, idempotente pelo `id`. Rejeições: `limite_plano`, `assinatura_suspensa` (venda nova), `venda_imutavel`, `caixa_fechada`, `loja_invalida`, `nao_encontrado`, `exclusao_nao_permitida`. |
| `GET /sync/pull?desde=<cursor>` (auth) | Até 500 mudanças depois do cursor. Repetir com o cursor devolvido enquanto vierem 500. |
| `POST /dev/relogio/avancar` | `{ dias }`. Só fora de produção. |
| `POST /dev/jobs/cobranca` | Roda o job de cobrança agora e devolve o resumo. Só fora de produção. |

### Sincronização

O cursor é uma sequência global (`mudancas.seq`): cada escrita sincronizável acrescenta uma linha por loja, e o pull lê só esse índice. Cada entidade aparece uma vez por página, no estado atual (produto excluído vira `operacao: "delete"`). O `cursor` do push é a posição atual do servidor; para ler as mudanças, o aparelho continua usando o cursor do seu último pull.

R1 autoriza o push por operação e filtra o pull no servidor: funcionário sem `conferir_caixas` recebe catálogo compartilhado e somente suas vendas/caixas. Gerente não ganha administração de equipe/aparelhos/cobrança. A migração `0008_mute_maddog.sql` preserva IDs e histórico do dono. [Fluxo, política, evidências e homologação pendente](../../docs/r1-equipe-permissoes.md).


### Gestão R4 (implementada e validada localmente)

| Rota protegida | Comportamento |
|---|---|
| `GET /estoque` | Projeção confirmada e histórico autorizado; negativo explícito. |
| `POST /estoque/movimentos` | Entrada/ajuste/devolução, ID estável, motivo e autoria; permissão de cadastro e recurso de estoque. |
| `POST /clientes` | Cadastro por loja, com ID idempotente. |
| `GET /fiado` | Clientes e títulos/eventos financeiros autorizados no servidor. |
| `POST /fiado/recebimentos` | Parcial/total, sem exceder saldo; dinheiro credita o turno receptor na mesma transação. |
| `POST /fiado/estornos` | Evento integral referenciado, sem alterar original; não executa estorno bancário. |
| `GET /lojas`, `POST /lojas` | Vínculos permitidos e cadastro de filial pelo dono, respeitando limite de plano. |
| `GET /relatorios/filtros` | Lojas, nomes e turnos permitidos; operador recebe somente o próprio vínculo/turnos. |
| `GET /relatorios` | Filtros `inicio`, `fim` (exclusivo), `lojaId` (ID ou `todas` para dono), `operadorId`, `caixaId`, `meio`; eventos e totais separados. |

`Venda.fiado` conserva cliente, vencimento e valor original; soma de parcelas recebidas + fiado = total da venda. Venda confirmada baixa estoque uma vez. O saldo existente não é substituído pelo cadastro. Migração `0010_keen_arclight.sql` registra abertura legada sem reaplicar vendas antigas. Gestão usa a mesma ordem de travas e autorização transacional da sincronização. Histórico, limites de operação e roteiro de homologação: [R4](../../docs/r4-gestao-catalogo-fiado-lojas.md).

### Suporte R5 (validação local)

| Rota protegida | Comportamento |
|---|---|
| `POST /suporte/solicitacoes` | UUID idempotente, tipo `suporte`/`exclusao`, mensagem, resumo opcional com schema fechado e versão das políticas. Dez solicitações abertas por vínculo. Não apaga dados. |
| `GET /suporte/solicitacoes` | Cem protocolos pessoais mais recentes da conta/loja/operador da sessão; resposta manual da equipe. Dono não recebe mensagens dos funcionários. |
| `GET /suporte/exportacao` | Dados confirmados da loja atual conforme permissão, finanças próprias sem `conferir_caixas`, identidade pessoal e protocolos próprios. Sem credenciais/cartões/sessões; não é backup restaurável. |

Migração aditiva `0011_condemned_unus.sql`. Retenção de protocolos concluídos há mais de 90 dias no startup e diariamente com jobs ativos, com drain no shutdown. Abertos/em análise preservados. [Procedimento de atendimento, retenção, monitoramento, backup e retorno compatível](../../docs/operacao-backup-suporte.md). Implantação externa e responsável pelo atendimento ainda exigem registro de homologação.
