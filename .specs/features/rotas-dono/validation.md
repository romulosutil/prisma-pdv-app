# Validação rotas-dono: PASS

Data: 2026-10-29. Verificador independente, não autor. Fonte c055910; diff c752743..c055910. Modelo solicitado: Terra médio; a interface de delegação não informa o modelo efetivamente executado, portanto não é possível confirmá-lo aqui.

## Critérios

| AC | Resultado e evidência |
|---|---|
| 1 | PASS. Sete rotas para operador e papel desconhecido: apps/api/test/rotasDono.test.ts:77-90 verifica 403, corpo exato e snapshot inalterado; :38-47 verifica três métodos e log do provider. Mesmo pedido com dono: :90-108 verifica status e estado, incluindo chamadas reais ao mock para cartão e cobrança (:93, :96, :99). |
| 2 | PASS. Ausente/inválida/vencida/revogada nas sete rotas: apps/api/test/rotasDono.test.ts:113-136 verifica 401, código e ausência de efeitos. Prazo entre hook e guarda: :183-205 verifica a fronteira exata, 401 e snapshots em assinatura e catálogo. DTO/parâmetros inválidos: :158-180 verifica 400 dono e 403 operador; parsing: :140-147. |
| 3 | PASS. apps/api/test/rotasDono.test.ts:239-278 observa bloqueio via pg_blocking_pids antes de alterar papel, sessão, aparelho ou prazo, verifica código e snapshot; exercita espera em conta e sessão. :289-300 impõe Serializable como default e trigger SQL exige Read Committed. :229-236 verifica 404 e snapshot para outra conta. A implementação toma locks antes do relógio e revalidação em apps/api/src/rotas/conta.ts:173-186. |
| 4 | PASS local. apps/api/test/rotasDono.test.ts:209-226 verifica leituras, logout próprio e restrição de aparelhos para operador; :90-108 verifica efeitos positivos. O diff não altera provider, jobs ou billing. Gates amplos registrados pelo gestor em execution.md; não foram reproduzidos nesta verificação. |

## Gates reproduzidos

- API alvo rotasDono, sessoes e syncSessao, maxWorkers=1: PGlite 38/38; PostgreSQL dedicado 59/59.
- Typecheck API: PASS.
- Suítes amplas registradas pelo gestor: API 392 PGlite e 447 PostgreSQL em 27 arquivos, teste adicional de precedência 24/30, mobile 434, shared 150 e typechecks. Estes números não foram reproduzidos aqui e não representam 393/448 em uma única invocação.
- Contagem anterior consolidada não foi reproduzida nesta revisão. Testes antigos não foram removidos nem alterados no diff.

## Sensor comportamental P0

Arquivo de teste: apps/api/test/rotasDono.test.ts. Os testes executaram no PostgreSQL local dedicado em cópia de git archive c055910, uma mutação por execução. Todas falharam por asserções comportamentais, não por setup/importação.

| Mutação | Resultado | Evidência observada |
|---|---|---|
| Remover guarda POST assinatura, apps/api/src/rotas/assinatura.ts:65 | Morta | 201 em vez de 403; 4 testes falharam |
| Remover guarda trocar plano, :109 | Morta | 200 em vez de 403; 3 falharam |
| Remover guarda cartão, :141 | Morta | 200 em vez de 403; 3 falharam |
| Remover guarda cancelar, :177 | Morta | 200 em vez de 403 e 200 em vez de 401; 3 falharam |
| Remover guarda reativar, :186 | Morta | 200 em vez de 403; 3 falharam |
| Remover guarda catálogo, apps/api/src/rotas/catalogo.ts:37 | Morta | 204 em vez de 403; 4 falharam |
| Remover pré-guarda aparelho, apps/api/src/rotas/conta.ts:173 | Morta | parâmetro inválido retorna 400 em vez de 403; 1 falhou |
| Remover revalidação interna, :181 | Morta | 204 em vez de 403/401 após espera; 5 falharam |
| Remover isolamento explícito, :186 | Morta | 500 em vez de 204 sob trigger; 1 falhou |
| Ler relógio antes dos locks, :178-181 | Morta | 204 em vez de 401 nos dois prazos; 2 falharam |

10/10 mortas. Preparação inicial do script de automação teve duas falhas de ambiente JavaScript antes de criar scratch ou executar testes; não contadas como mutações. Scratch removido, junctions removidas separadamente e caminho conferido sob TEMP. Porcelain antes/depois idêntico: apenas README.md previamente modificado.

## Qualidade e limites

As alterações são direcionadas às rotas e à autorização compartilhada; o preHandler antecede validação de domínio e a revalidação interna ocorre após os locks. Não encontrei falha acionável nos quatro critérios. Os testes de concorrência são condicionados ao PostgreSQL dedicado; PGlite não prova bloqueios. Billing é mock local, sem prova de integração real ou cobrança externa. Nenhuma operação de produção ou publicação foi executada.
