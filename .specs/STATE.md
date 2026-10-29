# Execução do plano de produção

## Decisions

- AD-001 (28/10/2026): escopo autorizado: uma loja, um operador, um aparelho; dinheiro, cartão manual e Pix estático confirmado pelo operador. Integrações simuladas ficam fora da oferta de produção. Preservar Fastify, Drizzle/PostgreSQL, Expo/React Native e shared.
- AD-002: implementar em lotes locais com testes e revisão independente. Somente o gestor integra, atualiza o plano e cria commits. Sem push, publicação, produção, contratação ou cobrança real.
- AD-003: SQLite nativo versionado, chaves compostas conta/loja e IDs do domínio. JSON completo acompanha linhas normalizadas para preservar contratos existentes. Vendas antigas têm caixa_id nulo; vínculo ambíguo não será inventado.
- AD-004: preservar AsyncStorage de origem na migração. Dado inválido ou schema futuro deve interromper carga com erro recuperável, nunca iniciar vazio silenciosamente. Adaptadores de teste/browser são explícitos.
- AD-005: subagentes solicitados com `model=gpt-6.1-terra`, `reasoning_effort=medium`, sem herança de histórico. A ferramenta aceitou a seleção, mas retornou somente task_name; não expôs confirmação independente do modelo efetivo. Configuração do gestor Sol Alto é informada pelo usuário e não verificável por essa ferramenta.

## Handoff

- Goal persistente ativo: implementar `docs/plano-implementacao-producao.md` por dependências; não declarar produção pronta.
- Base: e024d45. Checkout existente; README.md já modificado pelo usuário e plano ainda não versionado no início. Preservar README, incluir plano solicitado no checkpoint.
- Frente atual: P0-01. Dois executores com arquivos disjuntos: schema SQLite e publicação durável de Persistido. Gestor prepara migração/integração e verifica resultados.
- `npm ci`: 685 pacotes instalados; audit inicial informa 13 vulnerabilidades (5 low, 4 moderate, 4 high), sem correção automática de versões. Test/typecheck iniciais falharam por falta de dependências, reexecutar após instalação.
- Próxima entrega: validar schema e Persistido; revisor novo; integrar migração preservando origem. Depois concluir checkout/outbox antes da integração de autenticação/sync.
- Bloqueios de homologação conhecidos: Android físico/artefato definitivo, credenciais de e-mail/Play, infraestrutura externa/backup/alertas. Ainda não inspecionados; não contam como testes executados.
