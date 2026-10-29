# Entrega durável do código de acesso

## Problem Statement

Conectar a base SMTP/cifra aceita em canal-email à emissão existente. Hoje /auth/codigo não envia e-mail. Persistir OTP e entrega cifrada atomicamente, processar com recuperação de falhas e preservar os limites/revogação/arquitetura já entregues.

## Out of Scope

Credenciais, domínio ou destinatário externo; contratação; produção/publicação; billing real; restauração/sync de vendas; prometer caixa de entrada ou entrega SMTP única. Testar com Fastify, PostgreSQL dedicado e SMTP TCP locais; mocks usados para forçar fronteiras não comprovam protocolo externo.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Modos | desenvolvimento legado ou smtp explícito; produção exige smtp | Não ativar envio/fallback silencioso |
| Payload | Envelope AES256GCM existente e ID de chave; sem email/OTP extra em claro na fila | Retentar o mesmo código sem armazená-lo em claro |
| Chaves | KEY_ID ativa e KEYS JSON com1..4 chaves externas32bytes | Preservar antigas durante rotação |
| Claim | Lease60s e UUID de fencing, conta antes da fila | Coordenar instâncias sem segurar transação durante SMTP |
| Tentativas | Máximo5; após falha temporária aguardar5/30/120/300s | Recuperação limitada pela validade original10min |
| Garantia | Aceitação SMTP; retry com mesmo código/Message-ID | Perda de ACK pode duplicar mensagem; não duplicar credencial |
| Estado terminal | aceita/cancelada/falhou; limpar envelope/chave/lease | Reduzir retenção de material de autenticação |
| Domínio do Message-ID | Persistir domínio do remetente na entrega e bloquear canal de domínio diferente | Retry não muda Message-ID depois de reconfigurar remetente |
| Falta de chave | Bootstrap recusa pendência ativa sem chave; worker mantém cifrado até correção/expiração | Não descartar silenciosamente rotação pendente |

Open questions: none para o lote local. Provider/credenciais/domínio/destinatário autorizado seguem indisponíveis externamente. O controle do Goal foi consultado em29/10 e retornou blocked; ferramentas não permitem retomada pelo agente. O usuário pediu continue e a execução local permanece autorizada, sem marcar objetivo completo ou simular alteração do controle.

## User Stories

Como dono, quero que o código seja enviado mesmo após reinício do serviço e retentado quando o SMTP falhar. Como operador do serviço, quero diagnóstico sem segredo e rotação de chave sem destruir entregas pendentes.

Acceptance Criteria:
1. WHEN emissão smtp recebe email conhecido ou desconhecido, ela SHALL responder204 sem código/perfil/existência no corpo; para conhecido SHALL gravar OTP e uma entrega cifrada no mesmo commit, preservando orçamentos existentes e invalidando código/desafio/entregas anteriores. Falha de cifra/insert SHALL reverter todo o commit, inclusive contadores e invalidações, e devolver503 codigo_indisponivel local sem log do erro original.
2. WHEN o modo desenvolvimento é usado fora de produção, o contrato legado200/codigo ou204 desconhecido SHALL continuar explícito, sem fila/envio e sem logar OTP. Login/recuperação SHALL conservar validade10min, teto5/uso único e limites compartilhados. Consumir OTP ou atingir sua quinta falha SHALL cancelar entrega pendente na mesma transação, sem apagar finanças.
3. WHEN a fila persiste uma entrega, ela SHALL ter código único por codigoId, conta vinculada e envelope/IDchave sem OTP/destinatário em claro adicional; estado inicial pendente/tentativas0/prazo original e domínio de remetente fixo para o Message-ID. Estado terminal SHALL limpar envelope/chave/token/prazo de lease e conservar somente metadados não sensíveis (IDs, estado, domínio público do remetente, instantes, contadores e motivo local).
4. WHEN dois workers concorrem, somente um SHALL reivindicar a entrega antes da lease60s; claim SHALL travar conta antes da fila e ler relógio depois das travas. SMTP SHALL executar fora da transação. Lotes limitados SHALL progredir além de registros bloqueados, mesmo com relógio parado, sem adiar disponibilidade para outro worker compatível. Retomada após lease vencida SHALL usar outro token e fencing SHALL impedir ACK/falha antigos de sobrescrever o sucessor.
5. WHEN iniciar envio, o worker SHALL revalidar OTP/conta/vínculo/hash/prazo/uso/tentativas e payload normalizado. Expirado/usado/substituído/esgotado SHALL cancelar sem chamar canal. Nova emissão/consumo durante envio SHALL cancelar/fence o registro, sem prometer desfazer mensagem já enviada. Chave ausente/payload indecifrável/canal de outro domínio SHALL bloquear sem SMTP nem consumir tentativa, manter envelope até correção/expiração e usar motivo local sem segredo, sem adiar proximaTentativaEm para não impedir outro worker compatível.
6. WHEN canal falha temporariamente, a fila SHALL retentar com o mesmo payload/Message-ID e prazos5/30/120/300s, sem renovar expiraEm; quinta falha SHALL encerrar falhou. Erro permanente SHALL encerrar imediatamente. Uma falha de ACK no banco após SMTP aceito SHALL deixar operação recuperável pela lease; repetir pode reenviar a mesma mensagem, sem gerar OTP ou entrega novos.
7. WHEN reiniciar ou trocar chaves, configuração SHALL validar modo/JSON1..4/chave ativa/base64canônico32 e SMTP antes de abrir banco; produção SHALL recusar desenvolvimento e conservar bloqueio de billingmock. Antes de servir/agendar SHALL limpar expiradas sem chave/rede e recusar pendência não expirada incompatível com modo desenvolvimento, chave ausente ou domínio diferente. Rotação SHALL permitir ler chave antiga e emitir com nova; remover antiga somente após resolver pendências e interromper todos os emissores antigos conforme roteiro de manutenção; o lote local testa a drenagem e a guarda de bootstrap, sem alegar barreira externa executada. Nunca gerar chave de produção automaticamente ou expor chave/OTP/password em erros/logs.
8. WHEN scheduler executa a cada5s, passadas SHALL não se sobrepor no processo, falha SHALL liberar próxima passada e ser registrada sem erro original, e parar SHALL desarmar timer e aguardar passada ativa antes de fechar banco. JOBS=off SHALL preservar fila sem iniciar worker; operação/manutenção documentadas sem afirmar homologação externa.
9. WHEN app solicita código, o texto SHALL indicar solicitação/possível chegada para email cadastrado, sem afirmar entrega concluída. WHEN testes integram Fastify/PostgreSQL/SMTP locais, eles SHALL comprovar emissão204 uniforme, código recebido no protocolo autentica uma vez, retry/ACK perdido usa mesmo código/ID e operações financeiras permanecem iguais. Roteiro externo SHALL continuar não executado.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| DELIVERY-01 | 1,2,3 | P0-03-A emissão atômica | pending |
| DELIVERY-02 | 4,5,6 | P0-03-A processamento recuperável | PASS local T2; composição SMTP T5 pending |
| DELIVERY-03 | 7,8 | P0-03-A/P0-07-F configuração/ciclo | parser/scheduler T3 PASS; bootstrap T4 pending |
| DELIVERY-04 | 9 | P0-03-A integração local e comunicação | pending |
