# Operação, backup, suporte e incidentes do piloto

## Responsabilidade e acesso

Antes de iniciar o piloto, o responsável pelo produto deve designar quem consulta diariamente os protocolos e quem executa mudanças de infraestrutura. Essa escala e o aceite operacional ainda estão pendentes; o código não os substitui. Não há notificação automática ao atendente nesta versão. O app informa atendimento manual sem prazo garantido.

Operadores/donos consultam somente seus protocolos no app. Atendimento administrativo é feito por pessoa autorizada no console PostgreSQL já protegido pelo EasyPanel, sem criar porta pública ou chave de administração no APK. Consultar primeiro apenas ID, tipo, estado e data; abrir mensagem/diagnóstico do protocolo específico somente para a finalidade do atendimento. Não copiar mensagens para logs ou repositório. Registrar executor, instante, motivo, protocolo e decisão em registro restrito de atendimento. O app não concede ao dono acesso às mensagens dos funcionários.

Para responder, após conferir o protocolo e sua conta/loja/operador no console autorizado, executar transação parametrizada que atualize **um único ID**, com estado `em_analise` ou `concluido`, `resposta` revisada e `atualizado_em=now()`. Não usar resposta SQL montada por interpolação de mensagem. Confirmar `RETURNING id, estado, atualizado_em` e rollback se não houver exatamente uma linha. A pessoa vê a resposta ao atualizar o atendimento. Essa resposta é comunicação a uma pessoa: somente o atendente autorizado a realiza; os scripts desta entrega não enviam mensagens.

Pedido `exclusao` é uma solicitação de análise do titular autenticado, não autorização para apagar automaticamente a empresa inteira, dados de terceiros ou histórico financeiro. Conferir identidade, escopo solicitado, dados compartilhados, exportação, obrigações aplicáveis e impacto nos registros; responder escopo e prazo antes de qualquer execução autorizada. Não truncar tabelas, alterar eventos imutáveis ou usar o botão de zerar dados. Não há rotina automática de exclusão comercial nesta versão. A versão das políticas identifica o texto apresentado, não constitui prova de aceite jurídico. Revisão das políticas e identificação formal do responsável pelo tratamento permanecem necessárias antes da expansão comercial.

## Retenção

| Dado | Tratamento implementado/procedimento |
|---|---|
| Protocolo aberto/em análise | Preservar até resolução; limite de dez abertos por vínculo; consultar os cem mais recentes |
| Protocolo concluído | Remover após 90 dias: startup e job diário com `JOBS` ativo; leitura também limpa os expirados daquele perfil |
| Histórico comercial/identidade | Preservar durante operação e análise de pedido; decisão de exclusão e eventual retenção documentadas por caso; sem limpeza comercial automática |
| Diagnóstico de teste | Ausente do build conectado; resumo técnico pessoal enviado somente com opção ligada. Mensagem livre pode conter dados digitados pelo usuário e exige revisão |
| Exportação de suporte | JSON temporário no cache até retorno da folha de compartilhamento; apagado no `finally`. Se o processo morrer antes, pode permanecer no cache até limpeza do SO/app; destinatário conserva a cópia que receber |
| Backup local | Sete cópias diárias configuradas. Exclusão na origem não apaga retroativamente uma cópia; aguardar rotação e preservar somente pelo prazo necessário |
| Logs operacionais | Guardar somente agregados/identificadores necessários; não registrar OTP, tokens, corpo de requisição nem mensagens de suporte. Definir/verificar retenção do agregador antes da expansão; configuração não comprovada nesta entrega |

## Verificação diária sem novos alertas

1. Executar o verificador HTTPS nas APIs e guardar o JSON sanitizado. `/saude` valida consulta ao banco; rotas `/dev` devem permanecer ausentes; rotas de suporte sem sessão devem devolver 401 depois do deploy R5. Resposta 404 significa versão incompatível, não atendimento disponível.
2. Verificar no painel o estado do contêiner e logs de startup/jobs sem abrir variáveis secretas. `JOBS=on`; `BILLING_PROVIDER=disabled`. Logs `[email]` mostram agregados do worker; depois de 24 horas de execução o novo job informa `[suporte] retenção concluída`. Sem essa evidência, não declarar o worker saudável.
3. Executar [verificar-operacao.sql](../scripts/verificar-operacao.sql) no banco autorizado depois da migração R5. Investigar fila vencida, lease vencida sem recuperação, falha de entrega recente ou protocolo concluído expirado. Após SMTP aceitar, comprovar recebimento real no destinatário autorizado; aceitação SMTP não prova inbox. Não extrair OTP/envelope do banco.
4. No painel, conferir execução mais recente, arquivo, tamanho, destino e retenção do backup. Agendamento ativo sozinho não comprova sucesso. Investigar ausência/falha/atraso superior a 26 horas e proteger o último arquivo válido. Não retirar backups ou healthchecks existentes.
5. Registrar versão, instante e resultado. Alertas automáticos, destino externo e notificações da VPS continuam no backlog, por decisão do usuário; este procedimento de inspeção manual não os implementa nem os marca como concluídos.

## Restauração do schema atual

O teste R0 de 01/11 preserva seu valor histórico e não comprova as tabelas de R1–R5. Para nova evidência:

1. Usar homologação descartável com dono, dois operadores, fiado, transferências e protocolos. Pausar escritas durante backup e coleta da origem; não rodar jobs que mudem o snapshot. Registrar SHA da API e última migração.
2. Fazer backup local pelo agendamento/ação já existente. Confirmar sucesso, caminho e arquivo antes de restaurar. Criar destino **novo e vazio**, nome `pdv-postgres-restauracao-r5`, sem porta pública, credencial própria e sem API apontada para ele. Não reutilizar/sobrescrever produção, homologação ou o volume preservado R0.
3. Restaurar somente no destino confirmado; nunca passar URL comercial a ferramenta de teste. Executar [verificar-restauracao-r5.sql](../scripts/verificar-restauracao-r5.sql) na origem pausada e no restaurado via `psql -X -v ON_ERROR_STOP=1 -f ...`, guardando saídas separadas sem credenciais. Todas as tabelas são comparadas por contagem/checksum; definições, índices, restrições e sequências também. Integridade considera fiado e permite origem de aparelho distinta após transferência autorizada do turno.
4. `node scripts/comparar-restauracao.mjs builds/r5-origem.txt builds/r5-restaurado.txt builds/r5-restauracao.json` deve devolver PASS. Snapshot incompleto, tabela R5 faltante, integridade inválida ou divergência falham. Para histórico comercial legado já inconsistente, registrar/reconciliar a causa antes de usar o PASS; não ajustar linhas para satisfazer o comparador.
5. Com API isolada sobre a cópia, recuperar a conta por autenticação normal na instalação substituta, conferir IDs/quantidades/centavos e ausência de pendências nunca enviadas. Não registrar sucesso físico apenas porque os snapshots são iguais.
6. Desativar somente os serviços temporários dessa validação e manter evidência/volume conforme decisão autorizada; não excluir os backups anteriores. Registrar restauração/HTTP/Android/aceite separadamente.

## Incidente e retorno compatível

Perda, duplicação, acesso indevido ou confirmação financeira falsa: interromper novas operações na origem afetada e expansão do piloto, preservar fila/dispositivo/último backup, abrir protocolo e identificar empresa/loja/operador/turno/eventos sem compartilhar credenciais. Se houver acesso indevido, responsável autorizado revoga o acesso pelos fluxos existentes. Exportar somente o necessário por escolha explícita do titular. Comparar eventos originais e confirmados, documentar causa e correção com autoria; não apagar nem retaggear pendências.

Erro de implantação: manter banco/volumes, interromper promoção e preferir correção de versão. Não executar migração reversa destrutiva. R5 acrescenta suporte, mas R1–R4 alteram identidades/caixa/estoque: o antigo R0 não é fallback homologado para dados novos. Escolher artefato anterior que compreenda esses contratos e testar primeiro na cópia restaurada, inclusive venda/ACK perdido/fechamento/fiado/pull. Registrar versões antes/depois e critérios. Se não houver artefato compatível comprovado, manter o piloto parado e corrigir adiante. Restauração de backup sobre banco vivo perde operações posteriores e exige plano/decisão específica; não automatizar.

Retomar somente depois de reconciliar valores/IDs, repetir cenário afetado, verificar saúde/filas e obter decisão humana documentada. Nenhum retorno externo foi executado nesta entrega.
