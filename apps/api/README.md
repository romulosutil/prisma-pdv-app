# @pdv/api

API do PDV: Fastify 5 + TypeScript + Drizzle ORM (dialeto Postgres). O domínio (planos, assinatura, licença, billing mock, contrato zod) vem de `@pdv/shared`.

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
| `BILLING_PROVIDER` | `mock` (padrão e único hoje). Novos gateways entram em `src/billing.ts`. |
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
| `POST /auth/login` | E-mail + código + aparelho. 401 `codigo_invalido` (5 erros bloqueiam o código); 409 `limite_aparelhos`. |
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
