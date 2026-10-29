# Contrato de implementação

AD035/036 definidos pelo gestor antes da delegação. Uma função de negócio existente, sem novo serviço, schema ou contrato público. Alterações permitidas somente em servicos/sync.ts e no teste novo. Documentos e commits são do gestor.

## Ordem e invariantes

Conservar ordem já existente em upsertCaixa: loja do corpo, pai de outra loja, caixa fechado, origem da abertura. Depois, antes de construir/gravar campos do pai:

1. Rejeitar IDs repetidos no agregado como movimento_invalido, mesmo conteúdo idêntico.
2. Consultar movimentos pelos IDs globalmente, pulando consulta vazia. Índice por ID. Para cada confirmado, comparar caixaId, lojaId, tipo, valorCentavos, motivo e criadoEm.getTime() com Date do corpo. Qualquer divergência retorna movimento_invalido, sem revelar qual vínculo existe.
3. Separar movimentos novos dos históricos confirmados. Se há novos e !podeUsar(c.licenca.planoId, 'sangria_suprimento'), retornar recurso_plano. Não usar corpo, data antiga, aparelho anterior ou planoAgendado como fonte de capacidade. Não adicionar bloqueio por status que o shared não contém.
4. Gravar o pai como hoje. Inserir somente novos, mantendo campos completos, com onConflictDoNothing().returning({ id: movimentosCaixa.id }). Se quantidade retornada difere de novos.length, lançar ErroApi409/conflito_movimento com mensagem definida na spec. Exceção reverte toda transação aplicarPush, inclusive mutações válidas anteriores e sem ACK. Próximo retry verá o conflito já confirmado e retorna rejeição individual; vizinhos então podem progredir. Não fazer captura que converta essa exceção em null/ACK.
5. Registrar mudança do caixa como hoje. Históricos omitidos não são removidos. Não reescrever evento nem reinserir histórico. Caixa fechado conserva regra anterior, assim como ACK já aplicado antes do negócio.

## Concorrência e prova

Conta/sessão/advisory da loja continuam existentes; contas diferentes podem concorrer. Não adicionar locks globais de movimentos. O returning verifica persistência após ON CONFLICT e impede confirmação falsa. Prova PostgreSQL usa trigger local de teste em movimentos_caixa, condicionada à loja perdedora, bloqueando em advisory mantido pelo controle. Observador autocommit comprova PID bloqueado antes de executar/confirmar a outra conta. Trigger só em banco dedicado, removido no finally. A perdedora já terá consultado novidade; a vencedora confirma o ID; liberar controle deve produzir409 e rollback completo da perdedora. Snapshot do estado confirmado da vencedora antes de liberar a perdedora deve permanecer idêntico após409. Retentar original prova rejeição individual e progresso de vizinho, sem vazar outra loja.

## Validação

Teste deriva da spec, sem importar novo helper inexistente no RED. Ambos os bancos são reais locais; provider local simulado é só suporte de assinatura. Usar ajuda.ts, relógio controlado, inject, schemas e snapshots de pais/filhos/mudanças/ACKs/credenciais. Uma suíte global por vez, maxWorkers1. Não usar skip para erro nem reduzir testes. Capturar saída RED/GREEN real e comunicar contagens/limites ao gestor. Sem subdelegação, commits, Goaltools, credenciais externas ou produção.
