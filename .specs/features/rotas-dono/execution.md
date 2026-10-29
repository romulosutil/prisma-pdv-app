# Guardas de dono: execução local

Implementação do gestor em quatro fontes e um teste, conforme AD033/034. Não altera schema, provider, jobs, sync ou DTO público. A consulta de sessão existente conserva todos os predicados. O helper novo nega qualquer papel diferente de dono. A revogação usa conta -> sessão, relógio posterior aos locks e Read Committed explícito. Leituras e logout conservam suas regras.

## Testes e evidências

RED antes da alteração das fontes: rotasDono23 casos,16 falhas comportamentais e7 sucessos. Seis escritas retornavam200/201/204 para não dono, papel desconhecido na revogação retornava400, DTO de operador retornava400 e duas requisições continuavam após vencer a sessão. Não houve falha de import usada como evidência.

Após implementação: alvo inicial PGlite23/23; PostgreSQL dedicado mais sessoes/syncSessao58/58; typecheck API zero. Gates completos da API passaram392/PGlite e447/com PostgreSQL,27 arquivos. Depois foram adicionadas verificações de precedência403 antes de DTO/params inválidos nas seis rotas que validam entrada, para detectar a retirada da pré-guarda de DELETE mesmo com guarda interna. Alvo final24/24 PGlite e30/30 PostgreSQL; fontes idênticas às dos gates completos. O controle positivo de revogação exige exatamente uma sessão alvo e seu instante de revogação, evitando every sobre coleção vazia. Mobile434/39arquivos, shared150/10arquivos e typecheck de todos passaram em série. Nenhum registrado pulado. A união dos gates completos mais o caso novo cobre393 API/PGlite ou448/com PG, mas a invocação ampla anterior contou392/447; não somar variantes. Não aceitar a feature antes do verificador independente.

PostgreSQL17 efêmero dedicado: container9857f5619843a12655bf5c175e3d0975daa043433889a70877874f7988a49b40,127.0.0.1:59743/pdv_test. Volume448f04b044285142341616cbe215dd36e050f656bb7be655f7935596e7138e69. Credencial somente local de teste. Nenhuma integração de cobrança real, entrega de e-mail externa ou alteração de produção.

## Adequação: suficiente

| Critério | Asserção localizada | Resultado da spec |
|---|---|---|
| AC1, sete escritas e dois papéis | apps/api/test/rotasDono.test.ts:84 `expect(negada.statusCode).toBe(403)`;85 `expect(negada.json()).toEqual({ erro: 'proibido', mensagem: 'Operação permitida somente ao dono.' })`;86 `expect(await snapshot()).toEqual(antes)` |403 exato,17 tabelas intactas e provider sem chamada/sem transação nova, assertions44..47 |
| AC1/4, controle positivo idêntico por rota | apps/api/test/rotasDono.test.ts:90 `expect(permitida.statusCode).toBe(...)`;92/95 `toMatchObject` conta/status/plano;98 last4=4444;101 cancelada;103 catálogo nome/loja/EAN;105/107/108 aparelho/sessão revogados | Mesmo pedido permitido ao restaurar dono, efeitos persistidos e mocks verificar/cobrar realmente chamados nos ramos comerciais |
| AC2, credencial ausente/inválida/vencida/revogada | apps/api/test/rotasDono.test.ts:133 `expect(resposta.statusCode).toBe(401)`;134 erro nao_autenticado;135 snapshot;136 provider.intacto |401 nas sete rotas sem efeitos |
| AC2, DTO e parsing | apps/api/test/rotasDono.test.ts:144 status400;146 status400;147 erro json_invalido;152 status403;154 snapshot | Dono400, não dono403 antes de domínio; parsing HTTP400 preservado |
| AC2, DTO/params das seis escritas com entrada | apps/api/test/rotasDono.test.ts:170 status400;176 status403;177 erro/mensagem exatos;178 snapshot | Dono400 para entrada inválida, operador403 antes do parsing de domínio, provider intacto |
| AC2, prazo exato entre hook e guarda | apps/api/test/rotasDono.test.ts:200/201 leituras INICIO/expiraEm;202 status401;203 erro;204 snapshot | Relógio só ativado após criarApp; negar antes de efeitos em assinatura e catálogo |
| AC3, espera e perda de papel/sessão/aparelho/prazo | apps/api/test/rotasDono.test.ts:261 `expect(bloqueada).toBe(true)` antes da mudança;276 status403 ou401;277 erro;278 snapshot esperado | Telemetria PG antes da alteração; preservar alvo e demais dados, exceto mudança intencional de controle |
| AC3, isolamento | apps/api/test/rotasDono.test.ts:299 `expect(resposta.statusCode).toBe(204)`;300 revogadoEm INICIO | Trigger SQL exige Read Committed apesar do default Serializable no cliente exclusivo |
| AC3, outra conta | apps/api/test/rotasDono.test.ts:234 status404;235 erro aparelho_nao_encontrado;236 snapshot | Sem acesso/escrita em alvo alheio |
| AC4, leitura/logout | apps/api/test/rotasDono.test.ts:215/216/218 status200;219 catálogo;220 lista403;221 snapshot;222 logout204;224 revogadaEm INICIO;225 leitura401 | Sem exigir dono para as leituras autorizadas e logout próprio |

## Adequação: necessária

| Grupo de teste/asserção | Requisito | Manter |
|---|---|---|
| rotasDono:78..108 negação e controle positivo, snapshots/provedor | AC1/4 | Sim |
| rotasDono:113..138 credenciais em todas as rotas | AC2 | Sim |
| rotasDono:140..156 DTO/parsing | AC2 | Sim |
| rotasDono:158..181 precedência sobre DTO/params | AC2 | Sim |
| rotasDono:183..207 prazo no hook/guarda | AC2 | Sim |
| rotasDono:209..227 leitura/logout | AC4 | Sim |
| rotasDono:229..237 alvo alheio | AC3 | Sim |
| rotasDono:240..310 espera/isolamento PostgreSQL | AC3 | Sim |

Inspeção do gestor: resultados exigidos coincidem com a spec; há estado real além de spies. Nenhum teste anterior removido, pulado ou enfraquecido. Padrões seguidos: ajuda.ts e syncSessao.test.ts, relógio controlado, Fastify inject, snapshot SQL, banco dedicado. Os seis casos condicionais de PostgreSQL só se registram com URL local explícita; não contam como executados no PGlite. Revisão independente ainda pendente.
