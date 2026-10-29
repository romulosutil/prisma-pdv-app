# Revisão — configuração da API (P0-07-C)

**Resultado: PASS** para o escopo de configuração da API revisado; não é conclusão de P0-07 global.

## Evidências

- `apps/api/src/index.ts:11-16,23-24,35`: validação ocorre antes da abertura e migração do banco, agendamento e listen. Os módulos de conexão e jobs examinados efetuam esses efeitos dentro das funções chamadas posteriormente.
- `apps/api/src/configuracao.ts:10-40`: aceita somente ambientes conhecidos; exige URL PostgreSQL com hostname e porta inteira no intervalo em produção; rejeita todos os providers em produção, inclusive mock e com jobs desligados. Desenvolvimento e teste mantêm default mock e PGlite quando URL ausente.
- Erros de ambiente, URL e provider são mensagens constantes, sem interpolação dos valores. A fábrica de billing também não ecoa provider desconhecido.
- `apps/api/test/configuracao.test.ts`: 17 casos passaram, abrangendo defaults, URL, portas inválidas, ambiente com typo, providers, sanitização e JOBS=off.

## Comandos

- `rtk proxy npm run test --workspace=@pdv/api -- test/configuracao.test.ts --maxWorkers=1`: PASS, 17 testes.
- `rtk proxy npm run typecheck --workspace=@pdv/api`: PASS.

## Limitações

A ordem de inicialização foi inspecionada estaticamente; os testes exercitam o validador e a fábrica, não iniciam o entrypoint nem verificam efeitos por instrumentação. Nenhum serviço externo foi iniciado. Não há provider real implementado, portanto produção permanece bloqueada.
