# Recuperação de aparelho

Spec: spec.md. Decisão autorizada pelo usuário para escolhas reversíveis, sem perguntas opcionais. Preservar Fastify/Drizzle/PostgreSQL, shared e Expo/SQLite/cofre.

## Architecture Overview

Escolha: OTP -> desafio restrito -> confirmação explícita -> sessão. Alternativas de mesmo escopo: colocar escolha no próprio login/OTP simplifica tabela, mas acopla validade de prova à confirmação e complica retry; cifrar token de resposta no banco facilita replay, mas introduz chave de servidor/rotação ainda inexistentes. Usar desafio opaco e derivação estável evita token em claro no banco e mantém recuperação de resposta perdida.

## Components and contracts

Shared em contrato.ts:
- IniciarRecuperacaoReqSchema = LoginReqSchema; tipo IniciarRecuperacaoReq.
- AparelhoRecuperacaoSchema: id UUID, nome não vazio, ultimoAcessoEm ISO.
- RecuperacaoAparelhoSchema: id UUID, token base64url43, expiraEm ISO, perfil PerfilResSchema com papel dono, aparelhoNovoId UUID, aparelhoNovoNome não vazio, aparelhos array não vazio de AparelhoRecuperacao. IDs candidatos únicos e diferentes do novo. Tipo RecuperacaoAparelho.
- ConfirmarRecuperacaoReqSchema estrito: id UUID, token base64url43, aparelhoSubstituidoId UUID, confirmar literal true; tipo ConfirmarRecuperacaoReq. Resposta = SessaoSchema.

Rotas públicas:
- POST /auth/recuperacao recebe IniciarRecuperacaoReq e retorna200 RecuperacaoAparelho.
- POST /auth/recuperacao/confirmar recebe ConfirmarRecuperacaoReq e retorna200 Sessao.
-401 codigo_invalido na iniciação,401 recuperacao_invalida na confirmação;429 limite_autenticacao em ambos.409 aparelho_em_uso/aparelho_revogado/aparelho_ja_autorizado/recuperacao_desnecessaria na iniciação;409 recuperacao_desatualizada/limite_aparelhos na confirmação.400 padrão de schema.

Backend expõe iniciarRecuperacao(req):Promise<RecuperacaoAparelho> e confirmarRecuperacao(req):Promise<Sessao>. Error codes locais para409 limite_aparelhos/aparelho_revogado/aparelho_ja_autorizado/recuperacao_desnecessaria/recuperacao_desatualizada só são aceitos do HTTP409; mensagens locais fixas.401 público nunca chama callback de sessão inválida. BackendLocal recusa, sem alterar dados.

Dados expõe iniciarRecuperacao(email,codigo):Promise<Omit<RecuperacaoAparelho,'token'>>, confirmarRecuperacao(aparelhoSubstituidoId):Promise<void> e cancelarRecuperacao():void. Guarda desafio bruto privado só em memória. Preflight da conta antes de iniciar e de confirmar; filaAcesso genérica pode devolver valor. Login/cadastro/logout/cancelar incrementam geração e descartam desafio; capturar geração/identidade e descartar respostas antigas. Confirmar mantém desafio para retry após falha e limpa somente após aplicar sessão/perfil com sucesso. Validar DTO de origem para não aceitar desafio/sessão de outro vínculo. Não mudar identidade local antes da confirmação.

UI integra a tela entrar: erro de limite identificado pelo código409 exato oferece iniciar; mostra nome real da loja/email e candidatos; escolha + BottomSheet de confirmação explicam que revoga acesso anterior e não transfere vendas. Desabilitar ações concorrentes, cancelar/alterar email limpam a tentativa. Usar componentes existentes; testes de hooks reais/hosts simulados, Android pendente.

## Data Models

Tabela recuperacoes_aparelho: id UUID PK; token_hash text unique; conta_id/loja_id/operador_id FKs; aparelho_novo_id UUID; aparelho_novo_nome text; aparelhos_permitidos jsonb string[]; criado_em/expira_em; invalidado_em/confirmado_em opcionais; aparelho_substituido_id e sessao_id FKs opcionais. Índice conta_id para invalidação de pendências. Nenhum segredo bruto, nenhuma exclusão financeira.

Iniciação consome login_ip e verifica/contabiliza falha_email via mesmo helper do login, com locks limites -> conta. Extrair validação OTP para servicos/codigoLogin.ts, reusada pelo login, preservando guards e clocks atuais. OTP correto só é consumido depois das verificações de vínculo/capacidade e insert do desafio. Código novo invalida desafios pendentes na mesma transação de emissão; falha faz rollback também dessa invalidação.

Confirmação: consumir login_ip; achar conta pelo id+hash; lock conta antes de lock do desafio; amostrar relógio depois. Verificar validade5min, dono/loja, snapshot, alvo ainda ativo e novo UUID não ocupado; revalidar capacidade com totalAtivos-1. Revogar alvo e sessões, inserir novo aparelho, criar sessão, marcar confirmação no mesmo commit. Erros esperados retornam ErroApi antes de lançar fora da transação para confirmar contadores; erro inesperado lança e reverte tudo.

Token final: sha256('pdv:recuperacao:sessao:v1:' + tokenDoDesafio). Esse token tem domínio distinto do desafio e não existe no banco como sessão antes da confirmação. Exportar constante de30dias da auth e permitir criarSessao receber token interno explícito para esse caso (nenhuma entrada pública escolhe esse token). Guardar só hashes; sessao_id no desafio permite replay verificar sessão/aparelho ainda válidos, retornar o mesmo DTO e nunca renovar expiração/reviver revogação. Uma confirmação idêntica é leitura idempotente após a primeira; alvo diferente é409. Após cinco minutos, inclusive confirmado, pedir código e fazer login normal no UUID estável; não prometer replay infinito.

## Code Reuse Analysis

limitarAuth e locks de conta atuais; criarSessao e exigirSessao; PerfilResSchema; Dados.preflightTroca/aplicarAcesso e ContaRepo/cofre; InstalacaoRepo.aparelhoDaConta; componentes Banner/Botao/Campo/BottomSheet; fixtures de banco/SQLite/React existentes. P0-02 restauração será outro lote.

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
|---|---|---|---|
| OTP duplicado em novas rotas | apps/api/src/rotas/conta.ts:104 | Divergir teto próprio/email/rollback | Extrair helper mínimo e manter todos testes existentes |
| Replay vira nova sessão | apps/api/src/auth.ts:23 | Vários tokens e perda de resposta | Token final estável e sessao_id, mesma expiração, não reviver revogada |
| Revogação sem prova de consentimento | nova rota confirmar | Perder acesso do aparelho legítimo | Snapshot de IDs + literaltrue + confirmação UI |
| Perfil/sessão misturados ou pendências perdidas | apps/mobile/src/dados/dados.ts:168 | Finanças em conta errada | Preflight antes de ambas fases, geração e validação de vínculo |
| Segredo em armazenamento comum | novo desafio mobile | Credencial reutilizável exposta | Privado em memória; sessão final usa cofre existente |
| E-mail e restauração inexistentes | rotas conta e sync mobile | Falsa recuperação comercial | Escopo do aceite somente local, informar que acesso não transfere vendas, manter globais pendentes |

## Research

[OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) orienta tokens aleatórios, expiração e uso único. [Node crypto](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback) fornece randomBytes. A escolha de derivar um token de sessão com domínio distinto a partir do segredo aleatório é decisão local sujeita à revisão, não alegação de protocolo padronizado ou homologado. Travas seguem documentação PostgreSQL17 já registrada em AD-020.
