# Operação do código por e-mail

Roteiro preparado em 29/10/2026, ainda não executado em serviço externo. O fluxo foi integrado e aprovado nos nove critérios locais em `.specs/features/entrega-codigo/validation.md`, fonte5651212. Não usar este documento como aprovação de produção. O bootstrap continua recusando billing mock em produção.

Em30/10/2026, o usuário escolheu **Resend via SMTP** e informou possuir conta/API key. A retirada do e-mail e a troca para senha foram suspensas antes de editar código. Ver [configuração Resend e checkpoint externo](operacao-email-resend.md). Domínio/remetente, credencial no ambiente e entrega real continuam pendentes.

## Configuração a revisar

O modo de desenvolvimento preserva o código na resposta de teste e não envia e-mail. É o padrão somente fora de produção. Nesse modo, não definir variáveis de SMTP ou do ring de chaves como se estivessem habilitadas.

Para o modo SMTP, fornecer explicitamente, por um gerenciador de segredos autorizado:

- `EMAIL_CODIGO_MODE=smtp`.
- `EMAIL_CODIGO_KEY_ID`: identificador da chave ativa, sem segredo, com até 64 caracteres de letras, números, `_` ou `-`.
- `EMAIL_CODIGO_KEYS`: objeto JSON com uma a quatro chaves, indexadas pelos IDs; cada valor é base64 canônico de 32 bytes. Não colocar valores reais em arquivos versionados, logs, capturas ou mensagens.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_MODE`, `SMTP_USER` e `SMTP_PASSWORD`. Em serviço remoto, usar TLS direto ou STARTTLS obrigatório com autenticação e certificado verificado.

O modo SMTP sem TLS só existe para testes em IP literal de loopback, fora de produção e sem credenciais. Não é uma opção de implantação remota. As fixtures de certificado e chave em `apps/api/test/fixtures/email/` são públicas e não autenticam nenhum serviço real.

Ao iniciar, o serviço deve validar a configuração antes de abrir banco ou transporte. Depois de conectar ao banco, limpa entregas expiradas sem precisar de chave e verifica as pendências não expiradas. Mudar para desenvolvimento ou retirar chave/domínio ainda necessários deve recusar a inicialização, preservando a fila.

## O que cada estado significa

| Estado | Significado | Material de autenticação |
|---|---|---|
| pendente | Aguardando envio ou retentativa | Envelope cifrado e ID de chave |
| enviando | Um worker tem lease; a rede ocorre fora da transação | Envelope cifrado, ID de chave e token de posse |
| aceita | O canal aceitou o destinatário | Envelope, chave e lease removidos |
| cancelada | Código usado, substituído, esgotado ou expirado | Envelope, chave e lease removidos |
| falhou | Rejeição permanente ou tentativas esgotadas | Envelope, chave e lease removidos |

O registro mantém IDs, estado, domínio público do remetente, instantes, contadores e motivo local. A tabela não mantém destinatário ou OTP em claro adicional. Não exportar o envelope cifrado para diagnóstico comum.

Uma mensagem SMTP aceita pode falhar antes de chegar à caixa de entrada. Se a confirmação se perder, a retentativa pode gerar outra mensagem com o mesmo código e Message-ID. O OTP continua de uso único e com a validade original; o serviço não promete exatamente uma mensagem entregue.

## Retentativa e interrupção

A lease dura 60 segundos. Há até cinco tentativas, com intervalos de 5, 30, 120 e 300 segundos após falhas temporárias, sempre limitados à validade original de dez minutos. Rejeição permanente encerra a entrega. O worker antigo não pode sobrescrever o sucessor ou uma entrega cancelada.

Uma chave ausente, payload inválido ou canal de domínio incompatível bloqueia sem enviar nem consumir tentativa adicional. O material permanece cifrado para correção ou expiração. A ordem da fila é renovada sem adiar sua disponibilidade, para que outro worker compatível possa prosseguir.

`JOBS=off` desliga o agendamento; não é uma confirmação de entrega. Reiniciar o agendamento deve retomar pendências, sem gerar outro código. A parada do serviço deve desarmar o scheduler e aguardar sua passada ativa antes de fechar o banco. Falhas do banco depois da aceitação SMTP podem deixar uma lease recuperável.

## Trocar chaves ou remetente

Este procedimento exige inventário de todas as instâncias e controle do ponto de entrada, ainda não disponíveis neste Goal. Não foi executado externamente.

1. Distribuir o ring com chave antiga e nova em todas as instâncias, mantendo a antiga ativa. Conferir versões e saúde de cada instância.
2. Somente depois, trocar a chave ativa para a nova, preservando ambas durante a atualização. Instâncias antigas ainda podem ter emitido com a anterior.
3. Antes de retirar a chave antiga, suspender a emissão no ponto de entrada, interromper todos os emissores antigos e aguardar as requisições e workers ativos. Uma consulta do banco, sozinha, não prova que um emissor antigo vivo deixou de criar entregas.
4. Limpar expiradas e conferir que não há entrega ativa, lease ou envelope dependente da chave antiga. Inspecionar somente contagens e metadados, sem copiar códigos, tokens ou envelopes.
5. Reiniciar com o ring sem a chave antiga. A guarda de bootstrap deve recusar qualquer pendência incompatível. Só reabrir a emissão depois de conferir todas as instâncias.

Mudar o domínio de `SMTP_FROM` exige a mesma drenagem. Cada entrega fixa o domínio usado em seu Message-ID; um worker de outro domínio deve bloqueá-la, sem reescrever sua identidade. Manter o canal anterior até resolver as pendências. Alterar somente a parte local do remetente preserva o domínio do Message-ID, mas ainda exige validar a autorização do remetente no provedor.

## Homologação externa pendente

Registrar ambiente, versão/commit, remetente autorizado, destinatário de teste autorizado, horários e resultado sem segredos. Comprovar emissão de resposta genérica, chegada do código, login uma vez, expiração, retentativa, retomada e mensagens duplicadas em perda de confirmação. Conferir alertas e desligamento/retomada dos jobs.

Os testes locais usam PostgreSQL dedicado, Fastify e SMTP TCP de loopback; mocks específicos apenas forçam fronteiras de falha. Não substituem credenciais, configuração de domínio, entrega externa, monitoramento nem homologação Android.
