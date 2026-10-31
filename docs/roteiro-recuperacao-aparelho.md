# Homologação da recuperação de aparelho

Roteiro preparado, **ainda não executado em Android**. Login normal com código real Resend/Gmail já confirmado pelo usuário; a recuperação com esse serviço ainda aguarda o checkpoint humano. O contrato local está em `.specs/features/recuperacao-aparelho/`. A recuperação autoriza um aparelho substituto; restauração dos confirmados usa a sincronização implementada na fase3, não é comprovada apenas pelo login.

## Checkpoint web preparado em30/10/2026

- A/origem: `http://localhost:8088/pagar/dividir`, aparelho `01a18f98-8642-7e4f-ac4c-a82390cd6f58`, conta Loja de Homologação. Produto `01a18fa2-41cc-7ba2-80e3-d50cd26d9fa1`, preço2500; venda concluída `01a18fa2-ea9e-7643-ba60-f42284046228`, total2500, caixa `01a18fa2-78c2-78c5-802d-20a7514f7fd2`. Produto/venda/caixa chegaram por sync real: fila0 na tela e registros conferidos no PostgreSQL, sem semeadura direta.
- A também mantém OUTRO rascunho de25 com parcela emdinheiro10 e saldo15; reaberto após reinício/reload. Ele não está concluído nem transferido paraB e não pode ser apresentado como venda recuperada da nuvem.
- B/nova origem: `http://[::1]:8088/entrar`. O Metro com --localhost escuta::1; 127.0.0.1:8088 recusou a conexão e não foi usado. Origens têm armazenamento e identidade de instalação separados; mesmo servidor não significa mesmo aparelho lógico.
- O usuário deve digitar o código recebido emB, tocarEntrar, iniciar Recuperar acesso neste aparelho após o limite, escolher o aparelho listado e confirmar a substituição. Conferir produto e venda concluída emB, caixa de origem como histórico e rascunho com10/15 ainda emA após401. Não concluir a parcela restante só para terminar o teste.
- Conta, cartão e assinatura são fixtures locais; só o envio Resend é externo real. Não compartilhar OTP no chat. Recebimento/consentimento/substituição/restauração deste checkpoint continuam pendentes até observação; Android também pendente.
- Testes locais acrescentados: SMTP TCP, PostgreSQL e tempo controlado verificam erro/5tentativas/limite10min/reuso, recusa550, ACK perdido/recriação deAPI e recuperação com OTP do protocolo.128casos dos cinco arquivos tiveram execuções aprovadas, gate fatiado por memória; tipos todosPASS. Nova revisão segura PASS local, sensor5/5. Isso não prova falha/retentativa reais do Resend nem reboot do sistema operacional.

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
| Entrega real de código | Confirmada no login normal; pendente no checkpoint de recuperação | Resend/Gmail confirmado pelo usuário, código consumido e nova sessão às22:37:09; próximo OTP sem coleta no chat |
| Perfil e consentimento na instalação B | Pendente UAT web e Android | Origens A/B preparadas acima; registrar consentimento sem segredos |
| Uma substituição e revogação no servidor | Pendente homologação | IDs/horários/contagens, estado auditável do desafio, sem hashes/tokens |
| Parcela e saldo preservados em A após reinício/401 | Reinício web antes da revogação confirmado; pós401 e Android pendentes | Rascunho25, valores1000/1500 reapareceram apósreload; comparar após substituirA |
| Resposta perdida e retry | Pendente Android/rede | Mesma operação/alvo, uma sessão adicional, resultado observado |
| Cofre, logs e backup do artefato final | Pendente Android | Inspeção sanitizada e roteiro de reinício/atualização |
| Restauração de dados confirmados | Preparada; aguardaB | Produto/venda/caixa confirmados por sync na origem; comparar apósrecuperação, sem incluir rascunho não confirmado |

Os testes automatizados locais e as revisões têm seus próprios relatórios em `.specs/`; não preencher esta tabela com base neles. Aprovação de acesso não encerra P0-03 global nem libera produção.
