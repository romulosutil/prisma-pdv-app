# Credencial nativa e recuperação de acesso mobile

## Problem Statement

Completar os fluxos locais P0-03-D/E/F sobre a base durável já aceita. Token deve sair do armazenamento comum, identidade financeira deve sobreviver a 401/logout/ausência de cofre, e login deve recuperar perfil real sem misturar contas ou abandonar pendências.

## Out of Scope

E-mail entregue em homologação, Play Billing, sync remoto completo, publicação e Android físico. Continuam obrigatórios no plano global. Browser permanece adapter explícito demonstrativo.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Identidade | Separada da credencial, persistida sem token | Permitir recuperação de dados mesmo sem cofre |
| Token nativo | SecureStore ~58.0.2, chave referenciada por UUID | Versão do Expo instalado e rotação recuperável |
| Migração | Gravar/verificar cofre antes de sanitizar conta legada | Falha não perde acesso/origem |
| Sessão inválida | Só 401 autenticado do token atual invalida credencial; 403 e login incorreto não | Não confundir permissão com sessão expirada |
| Pendências | Bloquear troca com rascunho/outbox ou dados locais ainda sem sync | Não transferir operações à outra conta |
| Logout offline | Sair localmente e informar que servidor não foi revogado | Não afirmar integração não verificada |

Open questions: none para as decisões reversíveis locais. Homologação nativa e credenciais externas seguem pendentes.

## User Stories

Como operador, preciso autenticar novamente preservando venda de R$25 com R$10 recebidos. Como dono, preciso recuperar meu nome de loja real e revogar aparelho perdido pelo app.

Acceptance Criteria:
1. WHEN a conta é gravada no Android, o token SHALL existir somente no cofre e em memória, nunca no valor enviado ao armazenamento comum nem em logs; migração legada SHALL validar o cofre antes de remover o token da origem.
2. WHEN escrita/leitura do cofre ou metadata falha, a operação SHALL preservar estado recuperável e emitir erro sanitizado; ausência de token no cofre SHALL manter identidade/perfil e solicitar nova autenticação, sem gerar token substituto.
3. WHEN uma chamada protegida responde 401 para o token atual, o app SHALL limpar a credencial em memória/durável e solicitar autenticação sem apagar produtos/vendas/caixas/rascunho/licença; 403 e 401 de login público SHALL não invalidar sessão existente.
4. WHEN um 401 antigo chega depois de novo login, o app SHALL manter o novo token; logout SHALL remover a credencial local e distinguir revogação confirmada no servidor de saída somente local.
5. WHEN login autentica, o app SHALL consultar GET /conta com o token recebido, validar identidade e usar o perfil real; falha dessa consulta SHALL não substituir o estado local anterior.
6. WHEN troca de conta ocorre sem pendências, produtos, vendas, caixa, licença, carrinho, chave Pix e preferências de A SHALL não aparecer como dados de B; respostas atrasadas de A SHALL não ser gravadas/publicadas como B.
7. WHILE existem parcelas/rascunho/outbox ou operações locais não confirmadas, login em outra conta SHALL ser recusado preservando identidade, dados e pendências; autenticação na mesma conta SHALL retomar o mesmo checkout de 2500/1000/1500.
8. WHEN o dono consulta ou revoga aparelho no mobile, o app SHALL usar os endpoints reais e refletir sucesso apenas após resposta; erro/403/rede SHALL ser mostrado sem simular revogação.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| ACCESS-01 | 1, 2 | P0-03-D (adapter de credencial; integração em andamento) | verified |
| ACCESS-02 | 3, 4, 5 | P0-03-D/F (sessão e perfil) | pending |
| ACCESS-03 | 6, 7 | P0-03-E | pending |
| ACCESS-04 | 8 | P0-03-F (aparelhos) | pending |
