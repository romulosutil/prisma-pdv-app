# Pagamentos manuais: PASS

Data 2026-10-29. Verificador independente, nao autor. Fonte spec.md/design.md; diff 2743cd9..1b960b2; fonte 1b960b2. Selecao efetiva do modelo Terra Medio nao confirmavel neste processo.

## Criterios
| AC | Resultado e evidencia |
|---|---|
| 1 | PASS. apps/api/test/syncPagamentosManuais.test.ts:46 gera meios/provedores nos tres planos; linha 52 inclui split. apps/api/test/syncPagamentosManuais.test.ts:56 expect(res.corpo.aceitas).toEqual([]); :57 expect(res.corpo.rejeitadas).toEqual(rejeitadas.map(m => ({ id: m.id, motivo: 'pagamento_indisponivel' }))); :58 expect(await snapshot()).toEqual(antes). Corpo forjado e data anterior em :48. :65 aceita vizinhos por IDs; :66 rejeita split; :68 e :70 comparam estado completo apos retry. |
| 2 | PASS. apps/api/test/syncPagamentosManuais.test.ts:59 constroi quatro meios manuais e :61 split. :73 expect(resposta.corpo.aceitas).toEqual(corrigidas.map(m => m.id)); :74 expect(resposta.corpo.rejeitadas).toEqual([]); :76 expect(await snapshot()).toEqual(final). Mesmo IDs corrigidos em :62, retry em :77-78; snapshot completo definido em :22-39. |
| 3 | PASS. Fixture SQL local em apps/api/test/syncPagamentosManuais.test.ts:84. :93 expect(...corpo.aceitas).toEqual([ack.id]); :94 snapshot anterior; :96 expect(...corpo.rejeitadas).toEqual([{ id: alterada.id, motivo: 'venda_imutavel' }]); :100 aceita [replay.id, cancelamento.id]; :102-106 exigem filhos anteriores, pai anterior com status cancelada e versao 2, mudanca e ACKs exatos. |
| 4 | PASS local. apps/api/test/syncPagamentosManuais.test.ts:116 expect(res.corpo.rejeitadas).toEqual([{ id: m.id, motivo: 'assinatura_suspensa' }]); :125-135 exige loja_invalida, origem_invalida para aparelho/operador, venda_fora_da_janela_offline e venda_inconsistente; :117,136 exigem snapshot anterior. Gates amplos abaixo sao relato do gestor. |

apps/api/src/servicos/sync.ts:163 coloca guarda apos consistencia e antes de insert no ramo novo, sem flag ou excecao por plano. Offline valido existente: apps/api/test/syncRecursosProduto.test.ts:199.

## Gates
Os quatro alvos syncPagamentosManuais, syncValoresVenda, syncOrigem e sync com maxWorkers=1: PGlite URL vazia 4 arquivos/36 testes PASS; PostgreSQL dedicado 4 arquivos/37 testes PASS. npm run typecheck -w @pdv/api PASS. Gestor informou API 436/PGlite ou 495/PostgreSQL, mobile 434, shared 150 e typecheck total PASS; nao reproduzidos aqui. Diferenca de 59 e condicional ao PostgreSQL, nao somar variantes.

## Sensor P0
Scratch de git archive 1b960b2 sob TEMP verificado, junction apenas dependencias, shared real intocado, PGlite e um worker. Em cada caso syncPagamentosManuais.test.ts saiu 1 com AssertionError comportamental:
| Mutacao | Evidencia | Resultado |
|---|---|---|
| Remover guarda | 3 falhas: aceitas com 12 elementos versus [] | Detectada |
| Somente Tap | 3 falhas: aceitas com 9 elementos versus [] | Detectada |
| Somente provedor | 3 falhas: aceitas com 1 elemento versus [] | Detectada |
| Somente primeira parcela | 3 falhas: aceitas com 1 elemento versus [] | Detectada |
| Guarda antes do ramo historico | 3 falhas de igualdade em motivos/resultado historico e prioridades | Detectada |

Uma execucao inicial descartada: impressao falhou por encoding do console; nao contada como deteccao. Junction removida separadamente e scratch removido apos verificacao do prefixo TEMP. Porcelain antes e depois: somente M README.md preexistente.

## Auditoria e limites
docs/auditoria-autorizacao-capacidades-api.md confrontado com registro em apps/api/src/servidor.ts:76 e definicoes nas rotas conta, recuperacao, assinatura, catalogo, sync e dev. Inventario e testes referenciados sustentam fechamento LOCAL P0-04-C/AC-P0-04-2 apos este PASS. Nenhuma rota de provisionamento adicional de loja/operador, fiado ou relatorio avancado identificada. Guardas de dono nas escritas de assinatura, confirmacao de catalogo e revogacao de aparelho; sync aplica suas proprias politicas.

Limites priorizados: P0-02-F recuperacao de pendencias; P0-04-D/E caixa/fechamento/ajustes; P0-06-B capacidades globais, UI e adapters; P0-05 e homologacoes permanecem abertos. Testes locais nao provam recebimento fisico, Android, cobranca ou integracao real nem producao. Alteracao funcional minima e localizada; testes mapeiam criterios e verificam estado. Sem tasks.md formal; plano no spec.
