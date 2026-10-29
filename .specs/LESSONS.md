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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
