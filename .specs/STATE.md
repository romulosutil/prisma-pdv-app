# Execução do plano de produção

## Decisions

- AD-001 (28/10/2026): escopo autorizado: uma loja, um operador, um aparelho; dinheiro, cartão manual e Pix estático confirmado pelo operador. Integrações simuladas ficam fora da oferta de produção. Preservar Fastify, Drizzle/PostgreSQL, Expo/React Native e shared.
- AD-002: implementar em lotes locais com testes e revisão independente. Somente o gestor integra, atualiza o plano e cria commits. Sem push, publicação, produção, contratação ou cobrança real.
- AD-003: SQLite nativo versionado, chaves compostas conta/loja e IDs do domínio. JSON completo acompanha linhas normalizadas para preservar contratos existentes. Vendas antigas têm caixa_id nulo; vínculo ambíguo não será inventado.
- AD-004: preservar AsyncStorage de origem na migração. Dado inválido ou schema futuro deve interromper carga com erro recuperável, nunca iniciar vazio silenciosamente. Adaptadores de teste/browser são explícitos.
- AD-005: subagentes solicitados com `model=gpt-6.1-terra`, `reasoning_effort=medium`, sem herança de histórico. A ferramenta aceitou a seleção, mas retornou somente task_name; não expôs confirmação independente do modelo efetivo. Configuração do gestor Sol Alto é informada pelo usuário e não verificável por essa ferramenta.
- AD-006: Expo SQLite ~58.0.14 conforme bundledNativeModules do Expo instalado e documentação oficial https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/. Conexão privada usa BEGIN EXCLUSIVE na mesma conexão, preservando PRAGMA foreign_keys; a transação exclusiva do Expo abre outra conexão. Browser continua adaptador Async explícito; erro nativo não ativa fallback.
- AD-007: marcador de migração exige igualdade de agregados e dos filhos normalizados. Revisão detectou que comparar apenas payload da venda era insuficiente; testes com remoção de item/pagamento reproduziram o defeito e passaram após correção.
- AD-008: configuração da API é validada antes de abrir banco/agendar jobs/listen. Enquanto só houver MockBillingProvider, produção falha explicitamente mesmo com JOBS=off; não se cria provedor fictício para passar o gate. NODE_ENV desconhecido é erro, valores sensíveis não entram em mensagens.

## Handoff

- Goal persistente ativo: implementar `docs/plano-implementacao-producao.md` por dependências; não declarar produção pronta.
- Base: e024d45. Checkout existente; README.md já modificado pelo usuário e plano ainda não versionado no início. Preservar README, incluir plano solicitado no checkpoint.
- Frente atual: P0-01-A/B e parte observável de C aceitos. Próximo lote: checkout persistido, ID estável e venda/outbox atômicos. Executor independente trabalha configuração da API (parte de P0-07-C, sem dependência do checkout).
- `npm ci`: 685 pacotes instalados; audit inicial informa 13 vulnerabilidades (5 low, 4 moderate, 4 high), sem correção automática de versões. Test/typecheck iniciais falharam por falta de dependências, reexecutar após instalação.
- Gates: typecheck todos passou; API 95 testes passou com --maxWorkers=1 (execução paralela padrão esgotou memória); mobile 213 e shared 136 antes T3; T3 final 23 específicos passou e typecheck mobile passou. Instalação expo-sqlite terminou: audit informa 9 vulnerabilidades (5 low, 4 high); análise/reprodução ainda pendente, sem npm audit fix automático.
- Commit T1 f0bd5a4, T2 23ac272; revisão parcial e revisão final em .specs/features/persistencia-base/. T3 inclui bloqueio de inicialização em caso de erro e opção de tentar novamente; UI ainda sem homologação em aparelho.
- T3 62d1d6d aceito. Configuração API: 17 testes e typecheck API passaram; revisão independente em .specs/reviews/configuracao-api.md. Produção bloqueada por ausência de billing real (bloqueio intencional). Ver docs/operacao-configuracao.md.
- Bloqueios de homologação conhecidos: Android físico/artefato definitivo, credenciais de e-mail/Play, infraestrutura externa/backup/alertas. Ainda não inspecionados; não contam como testes executados.
