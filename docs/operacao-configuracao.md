# Configuração da API

As variáveis são validadas na inicialização, antes da conexão com o banco, dos jobs e da abertura da porta. Erros de configuração interrompem a inicialização sem imprimir o valor informado.

| Variável | Desenvolvimento e teste | Produção |
| --- | --- | --- |
| `NODE_ENV` | `development` (padrão) ou `test` | `production` |
| `DATABASE_URL` | Opcional; ausente usa PGlite local. Se informada, deve ser URL PostgreSQL válida. | Obrigatória, URL PostgreSQL válida. |
| `PORT` | Inteiro de 1 a 65535; padrão `3333`. | Obrigatória, inteiro de 1 a 65535. |
| `BILLING_PROVIDER` | `mock` (padrão). Valores desconhecidos são rejeitados. | Obrigatório um provedor real suportado; nenhum está implementado atualmente. |
| `JOBS` | `off` desativa o agendamento de cobrança; outro valor o mantém ativo. | `off` não dispensa a validação de billing. |

Exemplo local sem banco externo: `NODE_ENV=development`, `PORT=3333`, `BILLING_PROVIDER=mock`, sem `DATABASE_URL`. Para um banco PostgreSQL, configure a URL por meio do gerenciador de segredos do ambiente; não a registre no repositório nem em logs.

**Produção está bloqueada:** o único provedor implementado é o mock, que não é permitido em produção. É necessário implementar e validar um provedor real antes de iniciar a API em produção. Esta validação é apenas parte de P0-07-C; configuração do app, e-mail e cobrança real ainda dependem de trabalho posterior. Não representa homologação, implantação, backup ou teste de pagamento real.
