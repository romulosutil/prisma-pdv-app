# Limites compartilhados de autenticação

## Problem Statement

P0-03-B exige conter emissão e tentativas entre instâncias. Hoje reenviar código cria uma linha com tentativas zeradas e não existe limite de emissão/IP. Este lote estabelece a proteção compartilhada antes de abrir a recuperação por substituição de aparelho.

## Out of Scope

Entrega real de e-mail, recuperação por aparelho perdido, proxy de produção, captcha, cadastro de conta, sync e publicação. Código de desenvolvimento continua explícito; produção continua sem código na resposta. O lote não conclui P0-03 global nem comprova entrega de mensagens.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Armazenamento | PostgreSQL existente; tabela limites_auth sem serviços adicionais | Partilhar estado e preservar arquitetura |
| Janela | 15 minutos a partir do primeiro uso, reset inclusivo aos 900000ms | Política reversível e testável |
| Emissão por email | Até 3 aceitas/janela, intervalo mínimo 60s | Evitar inundação e reenvio contínuo |
| Emissão por IP | Até 20 requisições válidas/janela, inclusive desconhecidas e barradas por email | Evitar enumeração em massa |
| Login | Até 50 requisições válidas/IP/janela e 5 falhas/email/janela | Reemissão não renova orçamento de erros |
| Identidade IP | request.ip, trustProxy desativado como hoje | Não confiar em X-Forwarded-For arbitrário |
| Privacidade | Chave SHA256 com operação e identificador; sem email/IP/código/token em texto na tabela | Minimizar retenção direta; hash não é anonimização |
| Relógio | Relogio injetado; consultar depois da trava; recuo não libera orçamento | Manter testes existentes e negar abertura precoce |
| Retenção | Preparar procedimento para excluir somente janelas inativas há mais de 24h | Não alterar jobs de cobrança nem apagar estado vivo |

Open questions: none para código local. Identificação do proxy confiável e política de relógios sincronizados exigem inventário externo antes da implantação.

## User Stories

Como dono, quero receber e usar um código sem que reenvios liberem mais tentativas de adivinhação. Como operador do serviço, quero o mesmo limite com duas instâncias e sem revelar a existência da conta.

Acceptance Criteria:
1. WHEN duas instâncias disputam a mesma chave, o serviço SHALL confirmar no máximo o orçamento permitido no banco, inclusive na criação concorrente da linha; reiniciar a instância SHALL preservar os contadores.
2. WHEN o mesmo email solicita código antes de 60s ou depois de 3 emissões em 15min, a API SHALL responder 429 com erro limite_autenticacao e mensagem Muitas tentativas. Aguarde alguns minutos e tente novamente.; emissão recusada SHALL não invalidar o código anterior nem gerar novo código. Aos 60s SHALL permitir se houver orçamento e aos 15min SHALL iniciar nova janela.
3. WHEN um IP faz 20 requisições de código válidas em 15min, a próxima SHALL responder o mesmo 429 mesmo com emails diferentes/desconhecidos ou X-Forwarded-For alterado; outro IP SHALL ter orçamento independente. Em produção emails conhecidos/desconhecidos SHALL seguir os mesmos status 204/429 e corpo vazio no sucesso.
4. WHEN existem 5 falhas de login de um email na janela, qualquer código SHALL receber 401 codigo_invalido até expirar a janela, mesmo após emissão de novo código e em outra instância/IP. Código incorreto/ausente/expirado/usado e conta inexistente SHALL consumir falha; erro de vínculo/limite de aparelho após código correto SHALL preservar código e orçamento de falhas.
5. WHEN um IP faz 50 logins com corpos válidos em 15min, o próximo SHALL responder 429 limite_autenticacao antes de criar sessão, mesmo com outros emails ou código correto; a tentativa anterior bem-sucedida SHALL continuar válida e outro IP SHALL permanecer independente.
6. WHEN uma operação é negada por autenticação ou regra de aparelho, a transação SHALL confirmar os contadores aplicáveis e não criar sessão indevida; falha inesperada de banco SHALL retornar erro sem autorizar login/emissão; êxito SHALL continuar consumindo o código uma vez e preservar expiração de 10min e limite por código de 5 erros.
7. WHEN limites são persistidos, a tabela SHALL conter somente chave opaca, instantes e contagem; email/IP/código/token SHALL não existir em texto no registro. Falha de validação de corpo SHALL manter 400 requisicao_invalida e não emitir código.
8. WHEN o relógio recua ou aguarda trava, o serviço SHALL não reabrir janela antes do prazo e SHALL avaliar o prazo após adquirir a trava. O procedimento de retenção SHALL preservar todas as janelas ativas e ser preparado sem execução externa.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| RATE-01 | 1, 7, 8 | P0-03-B armazenamento compartilhado | pending |
| RATE-02 | 2, 3 | P0-03-B emissão | pending |
| RATE-03 | 4, 5, 6 | P0-03-B tentativas | pending |
