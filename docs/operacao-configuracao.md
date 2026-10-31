# Configuração da API

As variáveis são validadas na inicialização, antes da conexão com o banco, dos jobs e da abertura da porta. Erros de configuração interrompem a inicialização sem imprimir o valor informado.

| Variável | Desenvolvimento e teste | Produção |
| --- | --- | --- |
| `NODE_ENV` | `development` (padrão) ou `test` | `production` |
| `DATABASE_URL` | Opcional; ausente usa PGlite local. Se informada, deve ser URL PostgreSQL válida. | Obrigatória, URL PostgreSQL válida. |
| `PORT` | Inteiro de 1 a 65535; padrão `3333`. | Obrigatória, inteiro de 1 a 65535. |
| `BILLING_PROVIDER` | `mock` (padrão) ou `disabled`. Valores desconhecidos são rejeitados. | `disabled` explícito libera operação sem cobrança. `mock` e valor omitido continuam recusados. |
| `JOBS` | `off` desativa o agendamento de cobrança; outro valor o mantém ativo. | `off` não dispensa a validação de billing. |

Exemplo local sem banco externo: `NODE_ENV=development`, `PORT=3333`, `BILLING_PROVIDER=mock`, sem `DATABASE_URL`. Para um banco PostgreSQL, configure a URL por meio do gerenciador de segredos do ambiente; não a registre no repositório nem em logs.

**Operação sem cobrança:** autorizada pelo usuário em30/10/2026. `NODE_ENV=production` com `BILLING_PROVIDER=disabled` concede acesso Pro com status `liberada` no cadastro, sem cartão ou fatura. Esse status não expira comercialmente; a licença offline continua exigindo sincronização a cada sete dias. O job de cobrança não é agendado; o worker de e-mail permanece ativo, exceto com `JOBS=off`. O provider desativado rejeita operações financeiras em vez de simular sucesso.

PostgreSQL, porta explícita, SMTP e chaves da fila continuam obrigatórios em produção. Rotas `/dev` continuam ausentes. Contas liberadas não migram automaticamente para cobrança quando o modo é alterado. Cobrança real permanece sem implementação/homologação. Ver [implantação no EasyPanel](deploy-easypanel.md) para CI, imagem e infraestrutura; este texto não comprova deploy, backup ou homologação Android.
