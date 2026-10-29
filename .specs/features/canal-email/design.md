# Base do canal de e-mail

Somente três módulos internos em apps/api/src/email, sem alterar dependências públicas ou rotas. O gestor mantém contrato.ts e commits. Dois executores Terra Médio trabalham em cifrador.ts e smtp.ts, com testes disjuntos. Fila/worker e configuração do bootstrap virão depois deste aceite.

## Contratos fixos

- contrato.ts: MensagemCodigoSchema estrito, expiraEm ISO UTC/Z normalizado com Date.toISOString e três dígitos de milissegundos (offsets recusados); lerMensagemCodigo(unknown) com erro local; MensagemCodigo; CanalCodigo.enviar(mensagem):Promise<void>; ErroCanalEmail(tipo). Tipos configuracao/mensagem_invalida/temporario/permanente com mensagens locais fixas, sem cause/contexto sensível.
- cifrador.ts: criarCifradorCodigo(chaveBase64:string):{cifrar(mensagem:MensagemCodigo):EnvelopeCodigo;decifrar(envelope:unknown,contexto:{id:string;codigoId:string}):MensagemCodigo}. EnvelopeCodigo={versao:1;iv:string;tag:string;conteudo:string}, strings base64 canônicas; limite de ciphertext4096bytes. Erros usam ErroCanalEmail: chave=configuracao, mensagem=mensagem_invalida, envelope/contexto/autenticação=permanente. Não devolver chave no objeto público. AAD UTF8 JSON.stringify(['prisma-pdv:email-codigo',1,id,codigoId]); UUIDs do payload devem corresponder ao contexto após decriptar. IV CSPRNG12, tag16, AES256GCM. Chave e binários com checagem canônica, sem Buffer.from permissivo sozinho.
- smtp.ts: lerConfiguracaoSmtp(env:NodeJS.ProcessEnv):ConfiguracaoSmtp e criarCanalSmtp(config:ConfiguracaoSmtp):CanalCodigo. Configuração retornada: {ambiente:'development'|'test'|'production';host:string;porta:number;remetente:string;modo:'starttls'|'tls'|'local';usuario?:string;senha?:string}. Fábrica revalida configuração recebida para não depender somente do parser. Env SMTP_HOST,SMTP_PORT,SMTP_FROM,SMTP_MODE,SMTP_USER,SMTP_PASSWORD,NODE_ENV. Nenhuma URL livre com query de opções Nodemailer. Modo local sem credenciais; modo seguro exige ambas. Tratar entrada inválida com erro configuracao. Campos secretos não entram em logs ou erros.
- Texto fixo do e-mail: `Seu código de acesso é CODIGO.\nEle expira em EXPIRA_EM.\nSe você não pediu este código, ignore esta mensagem.`. Assunto definido em AC5. Message-ID com id da entrega e domínio do remetente normalizado; repetir mensagem mantém ID/código. Não deduplicar dentro do adapter e não prometer exatamente uma entrega SMTP.
- Nodemailer pool=false; debug/logger=false; disableFileAccess/disableUrlAccess=true; timeouts DNS/conexão/greeting/socket5000ms; TLS rejectUnauthorized=true, mínimoTLS1.2; starttls requireTLS=true e opportunisticTLS=false, tls secure=true; local ignoreTLS=true só na exceção validada. Sem opções arbitrárias vindas do env.
- Classificação: responseCode400..499=temporario,>=500=permanente; EAUTH e falhas TLS/certificado=permanente; rede/timeout=temporario; fallback seguro para falha inesperada=temporario, sem anexar erro original. Aceito só se accepted contém o destinatário esperado e rejected vazio; caso contrário permanente. Erro exposto novo tem apenas tipo/message/name/stack própria local, sem response/cause do Nodemailer.

## Dependências e teste

NPM consultado em29/10/2026: nodemailer10.2.1 e smtp-server3.21.1 exigemNode>=20; runtime atualNode24. Tipos @types/nodemailer8.0.2 e @types/smtp-server3.5.13 serão verificados pelo typecheck; mismatch deve ser reportado, não contornado com any amplo. Gestor instala versões fixadas antes de delegar; somente ele modifica package/lock.

SMTPServer é dependência de teste, escuta somente IP literal de loopback/porta0; não envia mensagens para fora. Para TLS negativo usar servidor local com certificado não confiável e validar que não recebeu DATA; para STARTTLS ausente servidor oculta/desabilita upgrade. Sucesso TLS com domínio/certificado externo e caixa de entrada continua pendente. Sem Docker/PG necessários neste lote.

## Próxima integração

Fila transacional deverá persistir envelope cifrado junto com hash/OTP no mesmo commit, coordenar claims e retentativa entre instâncias, conferir validade/supersessão/uso antes de enviar, limpar material terminal e preservar Message-ID em ambiguidade. Essa decisão não implementa nem aprova tal fila. Rotação de chave não pode descartar silenciosamente segredos pendentes; será definida naquele contrato. /auth/codigo segue com comportamento anterior neste lote.

## Fontes primárias consultadas

- [Nodemailer SMTP](https://nodemailer.com/smtp): configuração de TLS, timeouts e debug. Opções escolhidas são política reversível do projeto.
- [Mensagem](https://nodemailer.com/message): envelope/campos e Message-ID.
- [Servidor de teste](https://nodemailer.com/extras/smtp-server): servidor de protocolo local, sem promessa de entrega externa.
- [Node24 crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html): Cipheriv, AAD/tag e verificação GCM; algoritmo/tamanhos definidos pelo projeto.
- [RFC5321](https://www.rfc-editor.org/rfc/rfc5321.html): aceitação SMTP e ambiguidade de duplicação após timeout. Message-ID estável não garante deduplicação no destino.
