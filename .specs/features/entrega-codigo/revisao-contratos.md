# Revisão independente dos contratos T1 — segunda reavaliação

Veredito: **PASS de planejamento para delegar T2/T3.** Revisão estática dos contratos; não é verificação da implementação, dos testes ou de integração.

- Retenção terminal: spec.md:34 agora admite explicitamente o domínio público e o estado entre os metadados conservados, compatível com a coluna obrigatória em design.md:11.
- Progresso dos lotes: design.md:11,24-26 define ordem persistida por sequência, rotação dos registros bloqueados sem adiar sua elegibilidade e cenário de 25 bloqueados mais um válido com limite 20 e relógio fixo. Esse cenário resolve a monopolização encontrada na revisão anterior; a concorrência e o comportamento real da sequência dependem dos testes de T2.
- Os três pontos originais continuam endereçados: domínio do Message-ID vinculado à entrega e verificado, guarda de pendências também em desenvolvimento, e procedimento de rotação que exige parar os emissores antigos (design.md:11,18-20,26,42,54-56). A barreira operacional externa permanece não executada.

A ordem conta → fila e o fencing de token/lease estão definidos em design.md:24-30. O PASS não afirma ausência de deadlocks na implementação futura nem aprovação final dos nove critérios; os gates e a verificação independente posteriores permanecem necessários.
