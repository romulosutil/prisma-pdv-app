# Validação: entrega de código

**Veredito: PASS local.** Verificação independente de `dc6ef3e..5651212`, HEAD `5651212`, contra os nove critérios da especificação. P0-03-A externo permanece pendente por credenciais, domínio e destinatário autorizados. Não se comprovou caixa de entrada, implantação ou entrega única.

## Critérios e evidências

Asserções abaixo foram executadas; referências a fonte são inspeção. Mocks e integração local são identificados.

| AC | Resultado esperado e evidência | Resultado |
|---|---|---|
| 1 | Conhecido/desconhecido: `expect([r.statusCode, r.body]).toEqual([204, ''])` em `apps/api/test/emailEmissaoCodigo.test.ts:28`; um OTP e uma fila em :30–36. Substituição e invalidação em :117–119. Seis falhas de cifra/escrita: 503, `codigo_indisponivel`, ausência de segredo e `expect(await snapshot()).toEqual(antes)` em :179–181. Orçamento preservado :102–103. Inspeção: transação `apps/api/src/rotas/conta.ts:74`, inserções :81–96. | PASS |
| 2 | Dev conhecido: 200, seis dígitos e fila vazia `apps/api/test/emailEmissaoCodigo.test.ts:42`; sem OTP em logs :50–51. Consumo e quinta falha: `['cancelada','usado',null]` e `['cancelada','esgotado',null]` :61–64; recuperação e rollback :80–81, :138–146. Inspeção da validade de dez minutos `apps/api/src/rotas/conta.ts:25`; uso único `apps/api/test/emailEntregaIntegracao.test.ts:56`; cinco tabelas financeiras preenchidas e preservadas :45, :57. | PASS |
| 3 | Vínculos, chave, estado e domínio `apps/api/test/emailEmissaoCodigo.test.ts:32`; hash e ausência de código/email na linha :35–36. Terminal exige envelope, chave, token e lease nulos `apps/api/test/emailFilaCodigo.test.ts:44`; unicidade e FKs no PostgreSQL :380–385. Valores iniciais e prazo inspecionados em `apps/api/src/email/filaCodigo.ts:19`. | PASS |
| 4 | PostgreSQL: dois workers aguardam conta `expect(esperas).toHaveLength(2)` e blockers em `apps/api/test/emailFilaCodigo.test.ts:338–340`; relógio avançado resulta em uma expiração e zero envios :345–347. Sucessor tem token diferente :159–161; antigo retorna `ignoradas=1` e `expect(aposAntigo).toEqual(claimNova)` enquanto sucessor ainda envia :163–165. Fairness: 20 bloqueados, depois uma aceita, sem adiar as demais :96–101. Canal mock. Inspeção: conta antes da fila `apps/api/src/email/filaCodigo.ts:31–33`, relógio após trava :63–64, rede após transação :79–84. | PASS |
| 5 | Usado/esgotado/expirado: três canceladas e zero envios `apps/api/test/emailFilaCodigo.test.ts:208–211`. Domínio/payload bloqueados: zero envios, motivos, envelope e tentativa/prazo preservados :192–195; envelope recuperado :287–292. Cancelamento durante envio impede ACK antigo :112–114. Inspeção das verificações de conta, datas, hash e payload `apps/api/src/email/filaCodigo.ts:67–76`. Canal mock. | PASS |
| 6 | Prazos, cinco mensagens idênticas e terminal `['falhou','tentativas_esgotadas',5,null]` em `apps/api/test/emailFilaCodigo.test.ts:66–75`; erro permanente :244–246. Trigger SQL PostgreSQL falha ACK no banco, preserva lease/envelope e recupera sem novos OTP/entrega :358–366. TCP local derruba conexão após DATA: dois códigos e Message-IDs iguais, um OTP/entrega e prazo original `apps/api/test/emailEntregaIntegracao.test.ts:66–71`. Este último simula perda de resposta SMTP, distinto do trigger de ACK no banco. | PASS |
| 7 | Ring antigo/novo e cifra independente `apps/api/test/emailConfiguracaoEntrega.test.ts:39–50`; erros sanitizados :53–65. Guarda recusa chave ausente e aceita depois de drenar `apps/api/test/emailFilaCodigo.test.ts:269–276`; domínio divergente não altera pendência :255–256. Bootstrap mock confirma expirar/validar/servir `apps/api/test/emailBootstrap.test.ts:31–39` e billing mock recusado :25–27. Migrador mock confirma fechamento na falha `apps/api/test/conexaoCleanup.test.ts:24–28`. Barreira operacional externa não executada. | PASS local |
| 8 | Limites 4999/5000 e timer desarmado `apps/api/test/jobsEmail.test.ts:12–22`; não sobrepõe e parar aguarda :30–39; falha recupera e não loga segredo :51–53. JOBS off e shutdown por mocks `apps/api/test/emailBootstrap.test.ts:44–45,57`. Sinais apenas inspecionados em `apps/api/src/index.ts:3–6`; sem execução de processo real. | PASS local |
| 9 | UI renderiza texto condicional `apps/mobile/test/recuperacaoTela.test.ts:36`, fonte `apps/mobile/app/(onboarding)/entrar.tsx:155`. Fastify inject, PostgreSQL dedicado e SMTP TCP loopback: resposta uniforme, mensagem recebida, login 200 e reutilização 401 `apps/api/test/emailEntregaIntegracao.test.ts:48–56`; cinco tabelas preenchidas e snapshot igual :45,57; retry e mesmo ID :69–71. Homologação externa não executada. | PASS local |

## Gates

Executados em série com `--maxWorkers=1`: sete arquivos `emailConfiguracaoEntrega`, `jobsEmail`, `emailFilaCodigo`, `emailEmissaoCodigo`, `emailBootstrap`, `conexaoCleanup`, `emailEntregaIntegracao`: PGlite **92/92**; PostgreSQL dedicado **117/117**; mobile `recuperacaoTela` **13/13**. Integração usa HTTP `app.inject` e SMTP TCP loopback. Bootstrap/migrador usam mocks; testes de fronteira usam canal mock. Não houve skip reportado.

Gates amplos relatados pelo gestor após conteúdo final, não repetidos por este verificador: API PGlite 351/22 arquivos, PostgreSQL 384/22, mobile 433/39, shared 148/10 e typecheck de todos PASS. Uma tentativa anterior concorrente excedeu memória, foi interrompida e não contada; repetições seriais passaram. Contagem total pré-feature não foi medida. O primeiro comando PGlite tentou limpar variável com sintaxe mal expandida, mas o resultado 92 corresponde à seleção PGlite; o sensor definiu explicitamente variável vazia. O banco dedicado foi liberado e deixado para o gestor limpar.

## Sensor comportamental

Scratch novo via `git archive HEAD`, junctions de dependências, cwd `apps/api` do scratch, `PDV_TEST_POSTGRES_URL` vazio e um runner por vez. Cada fonte foi restaurada antes do próximo mutante. Caminhos RUN e stack apontaram para scratch. Porcelain antes e depois da limpeza foi igual: somente ` M README.md` do usuário.

| Mutante | Asserção que falhou | Resultado |
|---|---|---|
| `jobsEmail.ts:22`, intervalo 5000→4999 | `jobsEmail.test.ts:14`, esperada uma chamada, obtidas duas | morto |
| `filaCodigo.ts:88`, remove comparação de token | `emailFilaCodigo.test.ts:163`, esperado `ignoradas=1`, obtido 0 nos três resultados antigos; rejeições posteriores também apareceram, mas a asserção discriminou | morto |
| `codigoLogin.ts:16`, omite cancelamento no consumo | `emailEmissaoCodigo.test.ts:61`, esperado cancelada/usado/null, obtida pendente | morto |
| `iniciarApi.ts:46`, omite validação de pendências | `emailBootstrap.test.ts:38`, promise resolveu em vez de rejeitar | morto |
| `db/conexao.ts:30`, :47, omite fechar após falha do migrador | `conexaoCleanup.test.ts:24`, esperada uma chamada, obtidas zero nos dois adapters | morto |

**Sensor: 5/5 mortos por falha de asserção.** Junções removidas separadamente; scratch removido após confirmar caminho absoluto sob TEMP. Nenhum runner permanece ativo.

## Limites

Diff focado em emissão, fila, configuração, ciclo, comunicação e testes da feature; nenhuma fonte foi alterada pelo verificador. A revisão visual interativa e a execução de sinais de processo não foram feitas. Integração local não demonstra recebimento externo, operação de produção nem barreira entre emissores antigos. Nenhuma falha local identificada justifica tarefa corretiva ou lesson candidata.
