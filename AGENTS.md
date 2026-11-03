# Instruções do projeto

@C:\Users\sutil\.codex\RTK.md

## Checkpoint obrigatório a cada avanço

- Antes de trabalhar, consultar o roadmap em `docs/roadmap-app-completo.md`, o checkpoint mais recente em `docs/checkpoints-roadmap.md` e as evidências da etapa relevante.
- A cada entrega coerente, correção ou avanço parcial, registrar um checkpoint antes de encerrar a resposta ou iniciar o próximo lote. Não esperar a fase inteira terminar.
- Registrar data em America/Sao_Paulo, etapa, o que foi construído, arquivos/versões/commit quando disponíveis, validações e seus resultados, limitações, pendências e próximo passo.
- Atualizar os itens correspondentes no roadmap. Marcar `[x]` somente quando a implementação e a validação exigidas estiverem concluídas. Avanço parcial fica registrado com as pendências explícitas.
- Distinguir construído, validado localmente, validado externamente e aprovado pelo usuário. Simulação, teste HTTP e teste em Android físico são evidências diferentes.
- Manter o histórico de checkpoints; correções referenciam o registro anterior. Não registrar segredos, tokens ou códigos de acesso.
- Na resposta de entrega, informar o checkpoint registrado e seu link, o resultado e o próximo passo. Não criar commits apenas para obter um identificador de checkpoint; usar versão, arquivos e evidências quando o trabalho ainda não estiver commitado.
- Preservar alterações de outros trabalhos e respeitar as autorizações vigentes. O registro do checkpoint não amplia o escopo autorizado.

## Escopo do MVP e nomes de serviços

- Usar o prefixo `pdv-` nos nomes dos serviços do PDV, inclusive recursos operacionais novos. Preservar os nomes dos serviços de outros produtos.
- Decisão do usuário em 01/11/2026: cópia externa de backup e alertas de falha de backup/saúde ficam no backlog após a validação do produto. Não são bloqueios do MVP; retomar sua configuração quando o usuário priorizar essa frente.
- Preservar os backups locais, healthchecks e evidências de restauração já existentes. O adiamento não autoriza excluir recursos ou dados.
