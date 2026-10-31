# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Exigir rollback da credencial anterior e dos contadores quando a rotacao de credencial falhar.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: limites-auth
- evidence: validation.md AC6 emissao (auth)
- last seen: 2026-10-29T04:22:41Z

### L-002 - Testar o limite proprio de cada credencial com o orcamento agregado ainda disponivel.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `auth` · harmful: 0
- features: limites-auth
- evidence: validation.md AC6 teto proprio OTP (auth)
- last seen: 2026-10-29T04:22:41Z

### L-003 - Teste filtros de autorizacao com registros elegiveis e inelegiveis na mesma consulta.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC2 (api)
- last seen: 2026-10-29T05:50:17Z

### L-004 - Compare registros completos antes e depois de conflitos que devem preservar estado.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC3 (api) (+1 more)
- last seen: 2026-10-29T05:54:34Z

### L-005 - Isole cada evento de invalidacao para provar seu efeito independentemente de eventos anteriores.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC4-iniciacao (api)
- last seen: 2026-10-29T05:50:18Z

### L-006 - Asserte status e codigo exatos em cada caminho de rejeicao previsto no contrato.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC4-expiracao (api)
- last seen: 2026-10-29T05:50:18Z

### L-007 - Teste revogacao de multiplas sessoes e os vinculos persistidos da operacao.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC5-traco (api)
- last seen: 2026-10-29T05:54:33Z

### L-008 - Asserte status e estado completo para rejeicoes de replay com parametros diferentes.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC6-alvo (api)
- last seen: 2026-10-29T05:54:33Z

### L-009 - Compare registros completos do perdedor em conflitos de concorrencia.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC6-perdedor (api)
- last seen: 2026-10-29T05:54:34Z

### L-010 - Force alteracoes concorrentes enquanto a operacao aguarda a trava para testar revalidacao.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC7-trava (api)
- last seen: 2026-10-29T05:54:34Z

### L-011 - Teste replay contra revogacao de cada vinculo e substituicao do identificador da sessao.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `api` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC7-replay (api)
- last seen: 2026-10-29T05:54:35Z

### L-012 - Verifique que mensagens locais de erro nao variam com o conteudo do servidor.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC9-mensagens (mobile)
- last seen: 2026-10-29T05:58:36Z

### L-013 - Teste preflight com pendencias duraveis nao carregadas antes de cada chamada remota.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC10-sqlite (mobile)
- last seen: 2026-10-29T05:58:36Z

### L-014 - Teste cada componente do vinculo e a ordem de validacao antes da persistencia segura.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC11-vinculos (mobile)
- last seen: 2026-10-29T05:58:37Z

### L-015 - Teste adocao parcial contra contexto externo sem sessao e divergencias individuais de identidade e perfil.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC11-adocao (mobile)
- last seen: 2026-10-29T05:58:37Z

### L-016 - Asserte os dados e avisos especificos exigidos na confirmacao da interface.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `mobile` · harmful: 0
- features: recuperacao-aparelho
- evidence: AC12-texto (mobile)
- last seen: 2026-10-29T05:58:38Z

### L-017 - Verifique arquivos novos com git diff --cached --check após stage ou git diff --check no intervalo de commits, pois o diff não staged os omite.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `git` · harmful: 0
- features: canal-email
- evidence: .specs/features/canal-email/revisao-contrato.md:15 (git)
- last seen: 2026-10-29T06:33:26Z

### L-018 - Teste a autorização de loja para cada entidade financeira do push, sem usar provas de produto como substituto de vendas.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `sync` · harmful: 0
- features: valores-venda
- evidence: .specs/features/valores-venda/validation.md:7 (sync)
- last seen: 2026-10-29T13:24:14Z

### L-019 - Compare instantes ISO numericamente e teste representações com precisão fracionária diferente nos ajustes após fechamento.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `apps/mobile/src/telas/caixa` · harmful: 0
- features: fase-2-caixa
- evidence: apps/mobile/test/fase2Interface.test.ts:21 (apps/mobile/src/telas/caixa)
- last seen: 2026-10-30T19:25:38Z

### L-020 - Ao restaurar instalação, preserve caixas históricos e teste uma nova venda com caixa e origem do aparelho atual.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `apps/mobile/src/dados` · harmful: 0
- features: fase-3-sync
- evidence: apps/mobile/test/syncIntegracao.test.ts:163 (apps/mobile/src/dados)
- last seen: 2026-10-30T22:47:52Z

### L-021 - Ao registrar autorização para uma nova fase, atualizar também o resumo de acompanhamento do plano para não contradizer o checkpoint e o estado atual.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `docs` · harmful: 0
- features: fase-4a-email-local
- evidence: docs/plano-implementacao-producao.md:17 (docs)
- last seen: 2026-10-31T01:28:00Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
