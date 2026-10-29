# Canal SMTP e proteção do código

## Problem Statement

P0-03-A ainda não envia códigos. Preparar uma base verificável de SMTP e criptografia para a futura fila transacional, mantendo API, PostgreSQL e login existentes. A fila precisará reenviar o mesmo código sem armazená-lo em claro. Este lote entrega somente as duas capacidades internas e seus contratos.

## Out of Scope

Alterar /auth/codigo, agendar envio, criar fila/migração, contratar provedor, usar credenciais externas, enviar para destinatário real ou liberar produção. A integração com emissão, persistência e retentativa será outro lote. Aceitação por servidor SMTP local não é entrega externa nem prova de caixa de entrada. Não modificar billing/mock ou seu gate de produção.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Transporte | Nodemailer SMTP, configuração explícita | Preservar possibilidade de trocar provedor sem trocar arquitetura |
| Testes | smtp-server em TCP127.0.0.1/porta efêmera | Exercitar protocolo real local, sem serviço externo |
| TLS | starttls obrigatório ou TLS direto; certificado verificado | Não aceitar downgrade oportunista ou rejectUnauthorized=false |
| Modo local | Sem TLS/autenticação somente development/test e host literal127.0.0.1 ou::1 | Testes locais explícitos; proibir localhost/DNS para essa exceção |
| Proteção da fila futura | AES256GCM, chave32bytes externa, IV12bytes aleatório e tag16bytes | Reenvio exige recuperar código; hash sozinho não permite isso |
| Contexto criptográfico | IDs de entrega/código e versão1 em AAD | Evitar mover segredo cifrado entre registros |
| Limite de garantia | SMTP aceito, não entrega única | Timeout após aceitação pode causar duplicata; futuro retry preservará código/Message-ID |

Open questions: none para este lote reversível. Credenciais, domínio/remetente e destinatário autorizado continuam pendentes externamente. Não gerar chave de produção neste lote nem salvá-la no repositório.

## User Stories

Como dono, quero receber um código pelo canal configurado sem expor o segredo em logs ou armazenamento. Como operador do serviço, quero distinguir falha temporária de rejeição permanente e recuperar o mesmo payload após reinício com a chave correta.

Acceptance Criteria:
1. WHEN uma mensagem é aceita pelo contrato interno, ela SHALL conter somente id/codigoId UUID, destinatario válido normalizado, codigo de seis dígitos e expiraEm ISO em UTC com sufixoZ, normalizado com três dígitos de milissegundos por Date.toISOString (offsets não são aceitos); campos desconhecidos e entradas inválidas SHALL ser recusados com erro local sem refletir conteúdo.
2. WHEN o cifrador recebe chave externa base64 canônica de32bytes, ele SHALL cifrar todos os campos da mensagem com AES256GCM/IV aleatório12bytes/tag16bytes e AAD contendo versão1/id/codigoId; somente envelope versão/iv/tag/conteudo SHALL ser retornado e decifrar com os mesmos IDs/chave SHALL devolver exatamente a mensagem normalizada. Chave ausente/inválida SHALL falhar sem fallback.
3. WHEN o envelope, versão, IV, tag, ciphertext, IDs de contexto ou chave são adulterados, decifrar SHALL recusar com erro local sem expor chave/código/email/ciphertext ou devolver texto parcial; cifrar duas vezes SHALL produzir IV/envelope diferentes e nenhum campo em claro.
4. WHEN configurar SMTP, o parser SHALL exigir host, porta inteira1..65535, remetente de endereço único e modo starttls/tls/local; starttls/tls SHALL exigir usuário/senha. O modo local SHALL aceitar somente development/test com IP literal127.0.0.1 ou::1, sem credenciais; produção/host remoto/localhost nesse modo SHALL ser recusados. Configuração inválida SHALL falhar antes de conexão e não ativar fallback.
5. WHEN enviar mensagem válida, o adapter SHALL enviar um único envelope com remetente configurado e destinatário normalizado, assunto fixo "Seu código de acesso Prisma PDV", texto com código e expiração ISO, Message-ID estável `<codigo-ID_ENTREGA@DOMINIO_REMETENTE>`; não SHALL aceitar anexos/HTML/headers externos nem ler arquivos/URLs. Resolvido SHALL significar aceitação SMTP do destinatário, sem alegar entrega à caixa de entrada.
6. WHEN TLS é configurado, o adapter SHALL exigir STARTTLS ou TLS direto, verificar certificado e recusar servidor sem STARTTLS/certificado não confiável sem continuar em claro; logger/debug de SMTP SHALL estar desligados. DNS/conexão/greeting/socket SHALL usar5000ms cada, sem confundir esses limites com prazo total de entrega.
7. WHEN o servidor responde4xx ou ocorre indisponibilidade/timeout de conexão, enviar SHALL rejeitar como temporario;5xx e falha de autenticação/certificado SHALL rejeitar como permanente. Configuração/mensagem inválidas SHALL ter categorias próprias. Erros expostos SHALL conter somente tipo e mensagem local fixa, nunca resposta SMTP, stack/cause do provedor, destinatário, credenciais ou OTP.
8. WHEN os testes usam SMTP TCP local, eles SHALL verificar envelope/conteúdo/Message-ID estável, aceitação,4xx/5xx e recusa de TLS ausente/certificado inválido; cifrador SHALL ser exercitado sem mocks de crypto. Nenhuma evidência local SHALL marcar P0-03-A ou entrega externa como concluída.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| EMAIL-01 | 1 | P0-03-A contrato | PASS local T1, revisão-contrato.md |
| EMAIL-02 | 2,3 | P0-03-A segredo da futura fila | PASS local T2, revisão-cifrador.md |
| EMAIL-03 | 4,5,6,7,8 | P0-03-A adapter SMTP local | pending |
