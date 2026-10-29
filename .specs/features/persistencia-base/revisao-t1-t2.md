# Revisão independente parcial T1/T2

**Resultado: PASS parcial para os critérios 1–5, com limites abaixo.** Não aprova P0-01 integral nem substitui o gate completo de build. Modelo solicitado: Terra Médio; a ferramenta não fornece evidência do modelo efetivamente executado.

| Critério | Resultado e evidência |
|---|---|
| 1 | PASS: `sqliteSchema.test.ts` inicializa duas vezes, fecha e reabre um arquivo SQLite real, verifica payload, versão e foreign keys; versão 999 é rejeitada sem criar tabelas ou alterar versão. A consulta de reabertura não compara explicitamente o ID inserido, embora o schema o armazene como chave primária. |
| 2 | PASS: foreign keys compostas rejeitam caixa de outra conta e itens/pagamentos em outra partição; colisão de tabela durante migração reverte a tabela criada e mantém `user_version` em zero e a tabela anterior. |
| 3 | PASS: escrita bloqueada mantém snapshot e não notifica; falha rejeita, mantém snapshot e não notifica; próxima escrita funciona. A implementação pressupõe que transformações não mutem o snapshot recebido, conforme contrato de `Observavel`. |
| 4 | PASS: duas alterações concorrentes são compostas em ordem; teste encadeia escrita, carregamento, reinício e escrita, verificando o estado persistido final. A fila também é recuperada após falha de remoção. |
| 5 | PASS: JSON inválido gera erro genérico e não chama remoção nem gravação no teste de AsyncStorage simulado; a origem física nativa não foi exercitada. |

Comandos e resultados:

- `rtk npm run test --workspace=@pdv/mobile -- test/sqliteSchema.test.ts test/persistidoDuravel.test.ts`: 2 arquivos, 10 testes passaram; SQLite real via `node:sqlite`.
- `rtk npm run typecheck --workspace=@pdv/mobile`: exit 1 sem diagnóstico do wrapper. `rtk proxy npm run typecheck --workspace=@pdv/mobile`: `tsc --noEmit`, exit 0. A discrepância impede declarar que o comando literal do gate passou.
- Sensor de discriminação em cópia isolada em `%TEMP%`, usando os mesmos testes e dependências: inverter comparação de versão futura produziu 3 falhas, inclusive a rejeição de versão 999; publicar antes de gravar produziu 2 falhas, nos testes de escrita pendente e escrita falha. Uma primeira tentativa de mutação de publicação não alterou o arquivo por diferença de quebras de linha; foi descartada e repetida com verificação explícita da mutação.

Limites: sem execução Android/Expo, sem avaliação da migração de dados legados (critérios 6–7/T3), sem testes globais e sem comprovação da recuperação integral do checkout. O schema é fundação para P0-01-A e esta revisão cobre apenas a parte observável de P0-01-C.
