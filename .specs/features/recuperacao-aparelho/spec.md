# Recuperação de acesso com aparelho perdido

## Problem Statement

P0-03-F ainda deixa o dono sem saída quando perdeu seu único aparelho e o login do novo recebe limite_aparelhos. A gestão privada exige uma sessão que ele não consegue criar. Implementar prova por código, autorização restrita de cinco minutos e substituição explicitamente confirmada, preservando finanças e a arquitetura existente.

## Out of Scope

Entrega real de e-mail (P0-03-A), restauração/sync de vendas (P0-02), reativação de aparelho revogado, alteração de plano, produção, publicação e homologação Android. O fluxo recupera acesso; não transfere operações guardadas somente na origem. Testes locais nunca contam como e-mail entregue ou recuperação física homologada.

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale |
|---|---|---|
| Autorização | Código existente seguido de desafio restrito com32bytes aleatórios e validade5min | Não liberar sessão de negócio antes do consentimento |
| Escopo do desafio | Conta/loja/dono, ID/nome novo e snapshot dos IDs ativos elegíveis | Não substituir aparelho diferente do exibido |
| Uso único | OTP consumido ao emitir desafio; uma única substituição por desafio | Impedir reutilizar prova para novos alvos |
| Retry | Repetir confirmação idêntica devolve a mesma sessão válida enquanto desafio não expirou | Resolver perda de resposta sem armazenar token em claro no servidor |
| Token final | SHA256 de domínio fixo + token secreto aleatório do desafio | Resultado estável de256bits; só é autorizado após insert da sessão no commit |
| Exclusão | Nenhuma tabela financeira/local é apagada pela recuperação | Preservar origem e futura restauração autenticada |
| Interface | Reusar login/componentes atuais e confirmação explícita | Sem nova navegação de negócio ou sistema visual |
| E-mail e Android | Pendentes externamente | Não bloquear implementação/verificação local independente |

Open questions: none para decisões reversíveis locais. Credenciais de e-mail, destinatário autorizado e aparelho físico não estão disponíveis/verificados.

## User Stories

Como dono com acesso ao e-mail, quero escolher o aparelho perdido e liberar minha instalação atual sem gerar assinatura ou apagar vendas. Como operador, quero retentar depois de uma resposta perdida sem revogar mais aparelhos ou criar sessões duplicadas.

Acceptance Criteria:
1. WHEN a recuperação é iniciada, o servidor SHALL validar o mesmo OTP e os mesmos orçamentos loginIP50/falhasEmail5 existentes, inclusive expiração10min, teto próprio5 e uso único; códigos incorretos SHALL confirmar a contagem antes do401 e não devolver perfil/aparelhos.
2. WHEN o OTP correto prova a conta com limite ocupado, a API SHALL devolver somente desafio restrito válido por300000ms, perfil real e aparelhos ativos da mesma loja; o banco SHALL guardar apenas seu hash e IDs/instantes, nunca o token bruto; token de desafio e token final derivado SHALL receber401 nas rotas privadas antes da confirmação.
3. WHEN o ID novo já está ativo, revogado ou vinculado a outra conta/loja, ou ainda existe vaga normal, a iniciação SHALL recusar com409 estável, sem consumir OTP nem alterar aparelhos/sessões; aparelho revogado SHALL nunca ser reativado silenciosamente.
4. WHEN novo código é emitido ou outra recuperação é iniciada na conta, desafios anteriores não confirmados SHALL ser invalidados; desafio desconhecido/token incorreto/expirado/inválido SHALL receber401 recuperacao_invalida sem revogar aparelho. Confirmação sem literal confirmar=true SHALL receber400 requisicao_invalida.
5. WHEN o dono confirma um ID incluído no snapshot e ainda ativo, a mesma transação SHALL revogar esse aparelho e todas as suas sessões, registrar um novo aparelho e uma sessão de30dias, respeitar limite atual e registrar alvo/sessão/instante de confirmação; tabelas financeiras SHALL manter os mesmos registros e valores.
6. WHEN a confirmação idêntica é reenviada ou concorre entre instâncias após perda da resposta, a API SHALL devolver os mesmos IDs/token enquanto válidos, com somente uma substituição e uma sessão adicional; mudar o alvo SHALL receber409 recuperacao_desatualizada e não produzir efeitos.
7. WHEN validade, revogação do alvo ou limite muda enquanto a confirmação aguarda a conta, o servidor SHALL revalidar após a trava; alvo já revogado/snapshot divergente/downgrade sem vaga SHALL recusar sem mudanças parciais. Replay após revogar a nova sessão/aparelho SHALL nunca recriar ou reativar acesso.
8. WHEN o banco falha em qualquer fronteira da confirmação, a API SHALL responder500 e preservar o aparelho anterior/sessões válidos, sem novo aparelho/sessão/confirmação parcial; retentar o mesmo desafio SHALL concluir uma vez. Erros esperados SHALL confirmar orçamento de IP e erros inesperados SHALL fazer rollback.
9. WHEN o mobile chama esses endpoints, o adapter HTTP SHALL enviar DTO público sem token da sessão anterior, validar resposta e não invalidar credencial por401 público;429 SHALL manter texto local. Demo SHALL recusar recuperação, sem simular servidor.
10. WHILE existem dados pendentes de outra conta, Dados SHALL bloquear iniciar e confirmar recuperação antes de qualquer chamada remota; desafio SHALL existir apenas em memória e a visão entregue à UI SHALL omitir token. Cancelar, mudar email, login ou logout SHALL invalidar a tentativa local e respostas antigas SHALL não substituir conta ou desafio novos.
11. WHEN a confirmação retorna uma sessão, o app SHALL validar aparelho/conta/loja/dono e consultar GET /conta antes de gravar pelo cofre existente; preservar UUID lógico escolhido antes da rede e permitir retry idêntico após falha de rede/perfil/persistência. Nenhum token de desafio ou sessão SHALL ir ao armazenamento comum.
12. WHEN login recebe409 limite_aparelhos, a UI SHALL oferecer recuperação e exibir perfil/aparelhos reais após prova, exigir escolha e confirmação explícita de um aparelho e explicar revogação/ausência de transferência de vendas. Cancelamento/erro/expiração SHALL não mostrar sucesso nem perder dados; respostas atrasadas e cliques repetidos SHALL não afetar nova tentativa.
13. WHEN duas instalações limpas usam API local real e SQLite, a substituta SHALL recuperar perfil real e acesso com um único aparelho ativo; a origem SHALL ter token rejeitado pelo servidor mantendo seu rascunho2500/1000/1500 e demais dados locais, e os registros financeiros já no servidor SHALL permanecer intactos.

## Requirement Traceability

| ID | Critérios | Plano | Status |
|---|---|---|---|
| RECOVERY-01 | 1,2,3,4 | P0-03-F prova e contrato restrito | pending |
| RECOVERY-02 | 5,6,7,8 | P0-03-F substituição transacional | pending |
| RECOVERY-03 | 9,10,11 | P0-03-D/E/F cliente e cofre | pending |
| RECOVERY-04 | 12,13 | P0-03-F fluxo e integração local | pending |
