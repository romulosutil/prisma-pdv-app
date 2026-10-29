# Homologação da recuperação de aparelho

Roteiro preparado, **ainda não executado em Android ou serviço externo**. O contrato local está em `.specs/features/recuperacao-aparelho/`. A recuperação autoriza um aparelho substituto; a restauração de vendas depende de P0-02 e não é comprovada pelo login.

## Pré-condições e registro

- Usar somente ambiente de homologação e conta/destinatário de teste autorizados. Não executar em produção, contratar serviço ou efetuar cobrança real neste Goal.
- Registrar commit da API e do app, SHA256 do artefato, perfil de build, modelo/versão do Android, horário e responsável. Nunca anexar OTP, token de desafio, token de sessão ou conteúdo do cofre ao relatório.
- Configurar e comprovar entrega real de e-mail antes de marcar esse critério. Código devolvido/logado em desenvolvimento ou encontrado diretamente no banco não prova entrega.
- Usar o plano de um aparelho e pagamentos manuais/Pix estático. Billing mock é apenas dependência de testes locais e não comprova assinatura real.
- Preparar a instalação A como origem e B como instalação nova, com UUIDs distintos. Não limpar/reinstalar A para simular perda antes de preservar seus dados; a perda será simulada deixando A indisponível durante o acesso de B.

## Cenário principal

1. Em A, cadastrar um produto, abrir caixa e iniciar venda de R$25,00 com R$10,00 recebidos. Registrar o ID e saldo esperado de R$15,00, sem segredos.
2. Preparar também um registro já confirmado no servidor quando a sincronização real estiver disponível. Se P0-02 estiver pendente, marcar restauração como bloqueada; não semear dados diretamente no banco e chamar isso de sincronização homologada.
3. Em B, solicitar o código e validar a entrega na caixa de e-mail autorizada. Entrar deve identificar o limite ocupado e oferecer substituição.
4. Iniciar recuperação. Conferir nome real da loja/responsável, e-mail e identificação do aparelho anterior. Antes da confirmação, B não deve ter sessão de negócio nem acesso a dados privados.
5. Selecionar A, ler a explicação de revogação e ausência de transferência de vendas, e confirmar explicitamente. Registrar os IDs do desafio, alvo e novo aparelho e horário, sem tokens.
6. Confirmar acesso de B ao perfil real e apenas um aparelho ativo. A API deve rejeitar a sessão antiga de A; revogação no servidor não promete apagar dados ou encerrar operação offline imediatamente.
7. Reabrir A e conferir produto, caixa, itens, parcela recebida e saldo de R$15,00. Um401 deve solicitar autenticação preservando esses dados. Não confundir conclusão de checkout já iniciado com autorização para abrir novas vendas sem licença válida.
8. Quando P0-02 estiver homologado, conferir separadamente a restauração dos dados confirmados. Operações ainda somente em A não podem aparecer como transferidas sem envio/ack comprovados.

## Interrupção, erro e segurança

- Cancelar antes de confirmar: nenhuma revogação deve ser apresentada como feita. Uma prova já emitida pode ter consumido o OTP; pedir novo código deve obedecer os limites, sem gerar outro UUID lógico silenciosamente.
- Deixar a prova vencer cinco minutos e confirmar: deve haver erro, sem revogação nem sucesso fictício. Pedir outro código e recomeçar.
- Perder a resposta após enviar a confirmação consentida: retentar a mesma prova/alvo ainda dentro de cinco minutos deve recuperar a mesma sessão e somente uma substituição. Depois do prazo, usar novo código no UUID novo já salvo. Não afirmar que cancelar a tela desfaz um commit já enviado.
- Trocar para outra conta com pendências locais: bloquear antes de iniciar ou confirmar qualquer substituição remota. Identidade sem perfil verificado exige primeiro o login original.
- Testar resposta atrasada depois de cancelar/tentar outro e-mail e toques repetidos. A tentativa antiga não deve trocar o contexto nem apresentar sucesso na tentativa nova.
- Exercitar indisponibilidade de rede, falha recuperável de cofre/armazenamento e reinício no artefato exato. Preservar dados e possibilidade de nova autenticação; não remover o armazenamento como procedimento automático de correção.
- Conferir que AsyncStorage e logs da versão final não contêm tokens. A revisão local e o cofre simulado dos testes não substituem essa verificação no Android.

## Evidência a preencher

| Verificação | Estado | Evidência exigida |
|---|---|---|
| Entrega real de código | Pendente externo | Ambiente/provedor, destinatário autorizado, horários, resultado sem OTP |
| Perfil e consentimento na instalação B | Pendente Android | Artefato/commit/aparelho e captura sem segredos |
| Uma substituição e revogação no servidor | Pendente homologação | IDs/horários/contagens, estado auditável do desafio, sem hashes/tokens |
| Parcela e saldo preservados em A após reinício/401 | Pendente Android | Mesma venda, valores1000/1500 e registros locais |
| Resposta perdida e retry | Pendente Android/rede | Mesma operação/alvo, uma sessão adicional, resultado observado |
| Cofre, logs e backup do artefato final | Pendente Android | Inspeção sanitizada e roteiro de reinício/atualização |
| Restauração de dados confirmados | Bloqueada por P0-02 | Push/ack/pull reais e comparação de dados, sem mocks |

Os testes automatizados locais e as revisões têm seus próprios relatórios em `.specs/`; não preencher esta tabela com base neles. Aprovação de acesso não encerra P0-03 global nem libera produção.
