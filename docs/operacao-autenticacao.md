# Operação da autenticação

Contrato de limites da API implementado e revisado localmente em `.specs/features/limites-auth/`. Este documento prepara a operação; não confirma implantação, entrega de e-mail ou recuperação do aparelho perdido.

## Limites

Os limites usam o PostgreSQL da API. Todas as instâncias devem apontar para o mesmo banco de escrita. A janela de 15 minutos começa no primeiro consumo da chave e é renovada no primeiro consumo após seu vencimento. Uma verificação sem consumo preserva um piso temporal; recuar o relógio não permite apagar esse piso nem reabrir orçamento antes do prazo.

| Operação | Orçamento na janela | Observação |
|---|---|---|
| Pedir código por e-mail normalizado | 3 emissões | Intervalo mínimo de 60 segundos entre emissões aceitas |
| Pedir código por IP | 20 requisições com corpo válido | Conta desconhecida e pedido barrado pelo e-mail também consomem |
| Erros de login por e-mail normalizado | 5 erros | Reenviar código e trocar de IP não zeram o orçamento |
| Login por IP | 50 requisições com corpo válido | Inclui sucesso, código inválido e bloqueio de aparelho |

Emissão ou IP acima do orçamento retornam `429 limite_autenticacao`, com a mensagem “Muitas tentativas. Aguarde alguns minutos e tente novamente.”. O bloqueio de erros por e-mail retorna o mesmo `401 codigo_invalido` de um código incorreto. Não há extensão da janela por pedidos recusados. Um código continua válido por dez minutos, uma utilização e no máximo cinco erros próprios; o orçamento do e-mail também precisa estar disponível.

Sucesso na emissão em produção tem resposta `204` vazia tanto para e-mail conhecido quanto desconhecido. Desenvolvimento ainda devolve o código de contas existentes para testes locais. Isso não é entrega de e-mail: o provedor e a homologação real continuam pendentes. Nunca usar o modo de desenvolvimento como ambiente de produção.

Erros esperados de autenticação e de vínculo de aparelho confirmam os contadores antes de devolver a resposta. Falha inesperada do banco impede autenticação e desfaz a transação. Não há fallback de limite em memória. Os registros de limite guardam chave SHA256 por operação/identificador e instantes/contagem, sem código ou token. Hash de e-mail/IP não é anonimização.

## Proxy e relógio

A API continua com `trustProxy` desativado. O IP é `request.ip`; cabeçalhos `X-Forwarded-For` enviados pelo cliente não escolhem o orçamento. Isso segue a configuração do [Fastify](https://fastify.dev/docs/latest/Reference/Server/#trustproxy).

Antes de implantar atrás de proxy, inventariar os endereços/hops confiáveis, bloquear acesso direto à API e preparar configuração explícita com teste do IP observado. Não ativar `trustProxy: true` indiscriminadamente. Sem essa etapa, usuários atrás do mesmo proxy compartilham o limite de IP; os limites por e-mail continuam separados.

As instâncias usam `Relogio` injetado, hoje relógio do processo. Sincronizar e monitorar relógios é pré-condição operacional pendente. Recuo não renova a janela. A consulta de prazo ocorre depois de adquirir a trava. PostgreSQL mantém a [trava de linha até terminar a transação](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS).

## Retenção preparada

Não executar em produção neste Goal. Após revisar o ambiente, preparar uma tarefa periódica com credencial restrita e métricas, excluindo apenas janelas inativas há mais de 24 horas. Usar lotes pequenos; não truncar a tabela e não excluir janelas ativas para desbloquear usuário.

```sql
BEGIN;
WITH expiradas AS (
  SELECT chave FROM limites_auth
  WHERE janela_inicio < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND (ultimo_uso_em IS NULL OR ultimo_uso_em < CURRENT_TIMESTAMP - INTERVAL '24 hours')
  ORDER BY janela_inicio
  LIMIT 1000
  FOR UPDATE SKIP LOCKED
)
DELETE FROM limites_auth WHERE chave IN (SELECT chave FROM expiradas);
COMMIT;
```

Preparar monitoramento agregado de `429`, `401`, falhas de banco e crescimento da tabela, sem registrar código, token, corpo de login ou identificador bruto como rótulo de métrica. Proteção de borda contra volume de corpos inválidos e cardinalidade abusiva de e-mails ainda faz parte da operação a preparar. O cadastro de conta não foi alterado por este lote.

## Lacunas que permanecem

Credenciais/domínio/provedor de e-mail; entrega e retentativa reais; proxy e relógios do ambiente; recuperação autenticada de aparelho perdido com limite ocupado; homologação Android. Não marcar P0-03 integral nem liberar produção com base somente nestes limites.
