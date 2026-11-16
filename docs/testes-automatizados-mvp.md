# Matriz de testes automatizados do MVP

- **Objetivo:** mostrar, por cenário e defeito já executados no piloto (F01–F19 e CPs 115–148), o que um teste automatizado já cobre, o que deve virar teste e o que só uma pessoa verifica.
- **Data e sessão:** atualizado em 16/11/2026, [CP 150](checkpoints-roadmap.md) (matriz criada na sessão M1, [CP 149](checkpoints-roadmap.md)).
- **Regra:** só vale `coberto` quando o teste existe no repositório e está citado como `arquivo::teste`. Os arquivos `piloto*.test.ts` entregues na M1 existem e passam localmente; a execução completa no CI ainda não foi registrada.
- **Contagem (104 itens):** 69 `coberto`, 13 `automatizável`, 13 `somente humano`, 8 `backlog`, 1 `não aplicável`.

## Níveis (regra 5)

| Nível | Onde roda | No CI hoje |
|---|---|---|
| unitário | `packages/shared/test`, `apps/mobile/test` (Jest) | sim |
| integração API | `apps/api/test` com PostgreSQL isolado | sim |
| script HTTP | `scripts/homologar-*.mts` contra uma API | sim, pelo passo "HTTP homologation scenarios against local API" (`scripts/homologar-local.mjs`, API local descartável com PGlite) |
| fluxo driver | `scripts/fluxos/` com `scripts/pdv-android-ui.py` e `scripts/regressao-aparelho.py` no aparelho | só o driver e os fluxos offline (passo "Android driver and flows (offline)"); a execução no aparelho não roda no CI e só foi validada em `--simular` |
| humano | pessoa ou agente no aparelho, com julgamento | não |

Classificações: `coberto`, `automatizável`, `somente humano`. Também aparecem `backlog` (decisão do usuário) e `não aplicável`.

Arquivos entregues na M1: `apps/api/test/{pilotoCaixaValores,pilotoIsolamento,pilotoTurnoDisputado,pilotoReenvio,pilotoGestaoConcorrente}.test.ts`, `apps/mobile/test/{pilotoDurabilidade,pilotoAtualizacao,pilotoUxCp148}.test.ts`, `scripts/test/test_pdv_android_ui.py`, `scripts/homologar-local.mjs`, `scripts/homologar-local-api.mts`, `scripts/fluxos/` e `scripts/regressao-aparelho.py`.

## F01 e CP 115 — câmera, leitor e primeiro produto

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F01-a | Câmera negada: digitar o código adiciona o produto, sem câmera por trás | F01, CP 143 | coberto | unitário | `apps/mobile/test/scannerCiclo.test.ts::permissão com rejeição informa erro e digitação abre formulário em sheet, sem câmera por trás` | Também visto no aparelho (CP 143, CP 145 A01). |
| F01-b | Selo "Leitor ativo" não aparece sem permissão de câmera | CP 143/144, corrigido no CP 146 | coberto | unitário | `scannerCiclo.test.ts::sem permissão de câmera o selo não diz "Leitor ativo"; com permissão diz` | Verificado no Samsung na 0.1.13. |
| F01-c | Câmera é desmontada ao ir ao fundo e volta ao retornar | CP 145 C01 | coberto | unitário | `scannerCiclo.test.ts::Android desmonta a sessão ao pausar e ao ir ao fundo; retoma apenas ativo` | Cliente de câmera real só por `dumpsys media.camera` (humano). |
| F01-d | Leitura real de EAN com a câmera no APK com R8 | F01, CP 144 (S01) | somente humano | humano | — | Depende de câmera e embalagem físicas. |
| F01-e | Lanterna acende | F01, CP 144 | somente humano | humano | — | Relato do usuário. |
| F01-f | Bip único, sem duplicação | F01, CP 144/145 | somente humano | humano | — | Sem resposta registrada; continua pendente. |
| F01-g | Manifesto instalado sem áudio, armazenamento amplo e biometria | F01, CP 143, CP 145 S02 | automatizável | unitário | planejado: verificação do `app.json` no gate `scripts/verificar-release-mobile.mjs` | Hoje só por `dumpsys package`. Nenhum teste cita `RECORD_AUDIO`. |
| F01-h | "Ligar lanterna" ainda aparece com a câmera desligada | CP 146 | automatizável | unitário | planejado: `scannerCiclo.test.ts` | Não corrigido, baixo risco. |
| CP115-a | Crash nativo `addViewAt` ao salvar o primeiro produto com catálogo vazio | CP 115/117 | somente humano | humano | — | Intermitente, causa não provada, 1 tentativa sem recorrência na 0.1.12 (CP 143). Teste Jest não reproduz Fabric. |
| CP115-b | Regressão: salvar o primeiro produto em conta nova sem entrada no buffer de crash | CP 115, CP 143 | automatizável | fluxo driver | planejado: `scripts/fluxos/` (produto primeiro, lê `logcat -b crash`) | **Fora da lista do item 3.** |
| CP115-c | `useVoltar` (replace e back em quadros separados) e `removeClippedSubviews` das listas | CP 139 | automatizável | unitário | planejado em `apps/mobile/test` | **Fora da lista do item 3.** CP 139: nenhum teste cobre `useVoltar`. |

## F02, F03 e F12 — atualização e migração

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F02-a | Migração do armazenamento local preserva agregado e origem e é repetível | F02, CP 142 | coberto | unitário | `apps/mobile/test/sqliteArmazenamento.test.ts::migra, repete e reabre sem perder agregado ou origem`; `sqliteSchema.test.ts::inicializa duas vezes e persiste ao reabrir arquivo` | Não prova a atualização do APK, só o esquema de dados. |
| F02-b | Atualização por cima conserva pacote, certificado e hash instalado | F02, CP 142 | somente humano | humano | — | ADB: `versionName`, `firstInstallTime`, SHA256 do `base.apk`. |
| F02-c | Caixa, vendas e pendência sobrevivem à atualização e saem uma única vez | F02, CP 142 | coberto | unitário | `apps/mobile/test/pilotoAtualizacao.test.ts::F12: a migração de schema preserva IDs, valores e autoria de cada perfil`; `pilotoAtualizacao.test.ts::F12: nenhum envio sai com o token ou o operador de outro perfil` | Atualização simulada rebaixando o arquivo para `user_version = 1`; o APK real é F02-b (humano). Parcelas nunca foram exercitadas no aparelho; o pagamento dividido tem F09-c. |
| F03-a | Migração da 0.1.4 sem semente demo | F03, CP 140 | não aplicável | — | — | Usuário declarou que ninguém usa a 0.1.4. |
| F12-a | Pendências de venda, fechamento e gestão preservadas ao atualizar e migrar | F12 | coberto | unitário | `pilotoAtualizacao.test.ts::F12: a migração de schema preserva IDs, valores e autoria de cada perfil`; `pilotoAtualizacao.test.ts::F12: pendências de um perfil não aparecem para outro, nem em venda, fila ou comando de gestão` | Também: `sqliteArmazenamento.test.ts::migra, repete e reabre sem perder agregado ou origem`. Migração simulada; atualização do APK no aparelho segue humana. |
| F12-b | Nenhum envio com a identidade de outro perfil depois da atualização | F12 | coberto | unitário | `pilotoAtualizacao.test.ts::F12: nenhum envio sai com o token ou o operador de outro perfil` | Também: `sincronizacao.test.ts::descarta resposta de credencial anterior e compartilha voo`. |
| F12-c | Comando de gestão pendente é reaplicado uma só vez | F12 | coberto | unitário | `apps/mobile/test/gestaoIntegracao.test.ts::R4: resposta de recebimento perdida mantém chave, bloqueia fechamento e reinicia com um só crédito` | Sem o ciclo "instalar nova versão"; esse trecho é F12-a. |

## F04 — convite, OTP, alternância e logout

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F04-a | Dono convida dois usuários, cada um aceita com OTP próprio e vê só seus dados | F04, CP 147 | coberto | integração API | `apps/api/test/equipe.test.ts::dono convida dois usuários; cada pessoa aceita com OTP próprio e recebe apenas seus dados financeiros` | |
| F04-b | Alternância entre perfis com filas e rascunhos separados | F04, CP 147 | coberto | unitário | `apps/mobile/test/equipeApiIntegracao.test.ts::API + %s: dois operadores alternam com filas e rascunhos separados, sincronizam e o dono confere ambos` | `it.each` sqlite e navegador. |
| F04-c | Suspensão bloqueia o perfil sem afetar os outros | F04, CP 147 | coberto | unitário | `equipeApiIntegracao.test.ts::suspensão impede retomar sem afetar outro perfil; cobrança em andamento impede alternância; logout elimina a sessão pausada`; API: `equipe.test.ts::gerente confere a loja autorizada, sem administrar equipe ou acessar outra empresa; suspensão revoga a sessão` | Mensagem exata e novo código após retomar: só visto no aparelho. |
| F04-d | Perfil pausado fica em cofre separado e um 401 não o apaga | F04, CP 147 | coberto | unitário | `apps/mobile/test/sessaoSegura.test.ts::guarda perfil pausado em cofre separado e um 401 da credencial ativa não o apaga` | Reinício do app com perfil ativo: só no aparelho. |
| F04-e | Logout impede uso imediato e mantém só a revogação pendente | F04, CP 147 | coberto | unitário | `equipeApiIntegracao.test.ts::logout offline impede uso local imediatamente e mantém somente no cofre a revogação pendente até reconectar` | Tela "Entre novamente" após reinício: só no aparelho. |
| F04-f | Operador com "Fazer sangria no próprio caixa" registra sangria e retirada; sem ela, é recusado | F04/F05, CP 147 | coberto | integração API | `equipe.test.ts::autoriza abertura/suprimento próprios e exige permissão de saída; gerente não movimenta caixa alheio sem contrato de intervenção`; `caixaUsuario.test.ts::nega autoria forjada, saída sem permissão e fechamento incoerente sem alterar eventos` | |
| F04-g | OTP chega ao e-mail real e é digitado no aparelho | F04, CP 133/147 | somente humano | humano | — | Entrega real de e-mail; a fila e o contrato têm testes próprios (`emailFilaCodigo.test.ts`). |
| CP133-a | Tela "Entre novamente" parece travada; botão principal "Enviar código" pouco evidente | CP 133 | somente humano | humano | — | Causa não estabelecida; julgamento de UX. |
| CP133-b | Código expirado é recusado depois de 10 minutos | CP 133/134 | coberto | integração API | `apps/api/test/recuperacaoAparelho.test.ts::código expira exatamente após dez minutos` | Mensagem na tela só por relato (CP 134). |
| CP133-c | Bloqueio por cinco erros de código e limite de envios | CP 138 item 6 | coberto | integração API | `recuperacaoAparelho.test.ts::limite próprio de cinco tentativas permanece mesmo com orçamento de email disponível`; `limitesAuthRotas.test.ts::aplica cooldown e orçamento compartilhado sem invalidar código recusado` | No aparelho foi dispensado pelo usuário (CP 138). |

## F05, F06 e F07 — valores do caixa

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F05-a | Ana: abrir 100, vender 200, suprir 50, sangrar 80, retirar 20 dá 250; Bruno: 60 + 40 dá 100 | F05, CP 147 | coberto | integração API | `apps/api/test/pilotoCaixaValores.test.ts::F05: esperado da Ana é 25000 com entrada, sangria e retirada, e o do Bruno é 10000`; `apps/api/test/caixaUsuario.test.ts::reserva idempotente impede dois turnos do mesmo usuário e preserva saldos de Ana e Bruno` (saldos 25000 e 10000) | |
| F05-b | Uma saída física corresponde a um único evento (sem duplicar movimento) | F05, CP 129/147 | coberto | integração API | `apps/api/test/syncRecursosCaixa.test.ts::rejeita duplicatas, divergências e vínculos sem impedir vizinhos ou ACK anterior`; `pilotoCaixaValores.test.ts::F05: cada movimento gera exatamente um evento, com tipo, valor e autoria de quem operou`; `pilotoCaixaValores.test.ts::F05: repetir o mesmo movimento (resposta perdida ou reenvio do caixa inteiro) não conta duas vezes` | |
| F05-c | Bruno não vê nada da Ana antes de abrir o próprio turno | F05, CP 147 | coberto | integração API | `caixaUsuario.test.ts::reserva idempotente impede dois turnos do mesmo usuário e preserva saldos de Ana e Bruno` (lista da Ana só com o turno dela) | A tela "0 vendas" do Bruno é humana. |
| F06-a | Pix manual 10 e cartão manual 20: total comercial 230 e gaveta continua 250 | F06, CP 147 | coberto | integração API | `pilotoCaixaValores.test.ts::F06: total comercial da Ana é 23000 e a gaveta continua em 25000`; `pilotoCaixaValores.test.ts::F06: Pix e cartão manuais não geram movimento de gaveta e não alteram o caixa do Bruno` | Também: `syncPagamentosManuais.test.ts::rejeita todas as combinações indisponíveis e aceita manuais em ${plano}`. |
| F06-b | Pagamento integrado não é aceito; nenhuma confirmação bancária é simulada | F06, CP 147 | coberto | integração API | `syncPagamentosManuais.test.ts::rejeita todas as combinações indisponíveis e aceita manuais em ${plano}`; `apps/mobile/test/fase1Interface.test.ts::ignora o provedor em rotas diretas e não inicia simulador` | |
| F07-a | Fechamento com contado 245 dá −5 e Bruno 100 dá 0 | F07, CP 147 | coberto | integração API | `pilotoCaixaValores.test.ts::F07: fechar Ana contando 24500 dá diferença -500 e Bruno contando 10000 dá 0, persistidas no banco` | Também: `caixaUsuario.test.ts::reserva idempotente…` (diferença −100). |
| F07-b | Resultado "bate, sobra ou falta" e texto | F07, CP 147 | coberto | unitário | `apps/mobile/test/caixaLogica.test.ts::detecta quando bate, sobra ou falta`; `escreve o resultado com texto` | |
| F07-c | Recolhimento e troco não descontam o esperado duas vezes | F07, CP 147 | coberto | integração API | `pilotoCaixaValores.test.ts::F07: recolhimento e troco da saída final não alteram esperado nem diferença, e não são descontados duas vezes` | |
| F07-d | Conferência do dono grava autoria própria e preserva a da Ana | F07, CP 147 | coberto | integração API | `caixaUsuario.test.ts::troca de aparelho preserva origem e recusa o aparelho anterior; conferência não altera fechamento`; `pilotoCaixaValores.test.ts::F07: turno fechado é imutável, mas a conferência do dono acrescenta auditoria sem trocar o conferente do fechamento` | |
| F07-e | Consolidado: vendas 270, esperado 350, contado 345, linhas por operador e turno | F07, CP 147 | coberto | integração API | `pilotoCaixaValores.test.ts::F07: consolidado do dono tem vendas 27000, esperado 35000, contado 34500 e diferença -500` | Também: `gestao.test.ts::relatório separa venda, dívida e recebimento; aplica filtros por evento e nega consolidado ao operador`. |
| F07-f | Conciliação de IDs e centavos entre tela, API e relatório | F07, CP 147 | automatizável | script HTTP | `scripts/homologar-equipe.mts`, no CI pelo passo "HTTP homologation scenarios against local API" (`scripts/homologar-local.mjs`) | O script roda no CI (F08: 37 PASS/1 SKIP). A conferência contra a tela continua humana; nenhum check dele foi mapeado a este item. |

## F08 — isolamento

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F08-a | Operador não lê nem escreve o caixa de outro operador (pull, relatório, movimento, conferência, troca de aparelho, `sync/push` de fechamento) | F08, CP 147 | coberto | integração API | `apps/api/test/pilotoIsolamento.test.ts::F08: %s lista, baixa e relata somente o que é dela, sem dados de %s`; `pilotoIsolamento.test.ts::F08: %s não registra movimento, conferência nem troca de aparelho no turno de %s`; `pilotoIsolamento.test.ts::F08: %s não fecha, cancela nem lança venda no turno de %s pelo sync`; `pilotoIsolamento.test.ts::F08: sem token ou com token inválido nenhuma rota financeira responde` | `it.each` Ana/Bruno nos dois sentidos. Também no CI: `scripts/homologar-equipe.mts` via `homologar-local.mjs`. |
| F08-b | Empresa B não vê nem escreve nos turnos, equipe, aparelhos e relatórios de A | F08, CP 147 | coberto | integração API | `pilotoIsolamento.test.ts::F08: B não lê turnos, vendas, movimentos, equipe, aparelhos nem relatórios de A, e A não lê os de B`; `pilotoIsolamento.test.ts::F08: B não escreve em turnos, vendas, equipe nem aparelhos de A, e o estado de A permanece idêntico` | Também: `apps/api/test/sync.test.ts::o cursor é por loja: uma conta não vê nem mexe nos dados da outra`. |
| F08-c | Empresa não vaza dados entre lojas e empresas no relatório e no consolidado | F08/F14, CP 148 | coberto | integração API | `apps/api/test/gestao.test.ts::lojas têm vínculo próprio do dono, limite transacional e nenhum vazamento entre empresas` | |
| F08-d | Perfis separados no aparelho (produtos, vendas, caixas, Pix) | F04/F08 | coberto | unitário | `apps/mobile/test/isolamentoConta.test.ts::isola produtos, vendas, caixas, licença, preferências e Pix e recupera A` | |

## F09 e F11 — durabilidade, reenvio e offline

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F09-a | Parcela dividida e saldo reaparecem uma vez ao reabrir o arquivo | F09 | coberto | unitário | `apps/mobile/test/checkoutSqlite.test.ts::recupera parcela, itens e saldo após reabrir arquivo`; `carrinhoDuravel.test.ts::recupera pagamento parcial e recusa alteração ou descarte dos itens` | |
| F09-b | Conclusão após reinício mantém um ID e um total, sem venda duplicada | F09 | coberto | unitário | `checkoutSqlite.test.ts::conclui uma vez e recupera a mesma venda após perda da resposta`; `carrinhoDuravel.test.ts::reabre pagamento parcial e conclui uma única venda após falha e retry` | |
| F09-c | Encerramento forçado entre a parcela e a conclusão, depois de repetir logo após concluir | F09 | coberto | unitário | `apps/mobile/test/pilotoDurabilidade.test.ts::F09: parcela registrada antes do encerramento reaparece uma vez, com mesmo ID e valor, e a venda conclui sem duplicar`; `pilotoDurabilidade.test.ts::F09: depois de pagar, o encerramento não deixa mudar nem descartar o valor recebido`; `pilotoDurabilidade.test.ts::F09: encerramento logo após concluir deixa uma venda, a fila com os mesmos IDs e nenhuma segunda venda` | Encerramento simulado; F09 no aparelho segue PENDENTE. |
| F09-d | Servidor: reenviar venda, parcela, movimento ou fechamento com o mesmo ID não duplica | F09/F11 | coberto | integração API | `apps/api/test/pilotoReenvio.test.ts::F09: reenvio idêntico mantém uma venda, duas parcelas, valores iguais e a gaveta conta uma vez`; `pilotoReenvio.test.ts::F09: reenvio de parcela isolada já gravada não altera a venda nem a gaveta`; `pilotoReenvio.test.ts::F09: mesmo ID de venda com valores diferentes é recusado e o valor gravado não é sobrescrito`; `pilotoReenvio.test.ts::F11: reenvio de entrada, sangria e retirada não duplica e a gaveta conta uma vez`; `pilotoReenvio.test.ts::F11: fechamento reenviado não duplica e não altera esperado, contado nem diferença` | Também: `apps/api/test/sync.test.ts::reenviar a mesma mutação não duplica nem muda nada`. |
| F10-a | Disco cheio: parcela, venda, suporte e exportação falham explicitamente | F10 | backlog | — | — | Decisão do usuário (CP 149). |
| F11-a | Turno reservado, venda e fechamento offline; próxima reserva só depois de confirmar | F11, CP 129/142 | coberto | unitário | `apps/mobile/test/equipeApiIntegracao.test.ts::R2: abre online, vende e fecha offline; só reserva o próximo turno após confirmar vendas e fechamento` | |
| F11-b | Resposta perdida mantém ID e chave; reinício e reenvio não duplicam | F11, CP 129 | coberto | unitário | `equipeApiIntegracao.test.ts::R2: perda da resposta da abertura e da retirada conserva chaves; reinício e reenvio não duplicam`; `syncIntegracao.test.ts::envia operações offline por HTTP real, perde resposta e restaura sem duplicar`; `sincronizacao.test.ts::mantém ID após resposta perdida e respeita backoff até retry forçado`; `pilotoDurabilidade.test.ts::F11: venda e fechamento feitos offline sobrevivem ao reinício com mesmos IDs, valores e responsável` | Servidor, fora de ordem e conteúdo divergente: `apps/api/test/pilotoReenvio.test.ts::F11: lote com fechamento antes da venda e dos movimentos termina igual ao envio em ordem`; `pilotoReenvio.test.ts::F11: mesmo ID de movimento com conteúdo diferente é recusado sem sobrescrever`. |
| F11-c | Fila reabre com os mesmos IDs; edição pendente protegida | F11, CP 129 | coberto | unitário | `apps/mobile/test/syncPersistencia.test.ts::reabre fila, protege edição pendente e aplica remoto após último ACK`; `pilotoDurabilidade.test.ts::F11: reconexão intermitente reenvia os mesmos IDs, não duplica no servidor e só confirma com o ACK`; `pilotoDurabilidade.test.ts::F11: nada sai da fila sem confirmação, mesmo com sucessivas falhas de rede e reinícios` | |
| F11-d | Fechamento pendente impede outra reserva | F11 | coberto | integração API | `caixaUsuario.test.ts::reserva idempotente impede dois turnos do mesmo usuário e preserva saldos de Ana e Bruno` (409 com turno aberto) | |
| F11-e | Venda offline em modo avião, kill e reinício no aparelho enviada uma única vez | F11, CP 129/142/148 | automatizável | fluxo driver | `scripts/fluxos/venda-offline.json`, `scripts/fluxos/regressao.json` e `scripts/regressao-aparelho.py` | Versionado; execução no aparelho pendente (validado só em `--simular`, sem aparelho conectado). Executado à mão três vezes. A lógica de cliente e servidor tem F11-b, F11-c e F09-d. |
| F11-f | `airplane` do driver deixa o Wi-Fi ligado no Samsung | CP 142/145 (d) | coberto | unitário (driver) | `scripts/test/test_pdv_android_ui.py::AirplaneTest.test_on_desliga_aviao_wifi_e_dados`; `AirplaneTest.test_off_nao_liga_wifi_que_estava_desligado`; `AirplaneTest.test_off_mantem_aviao_se_ja_estava_ligado`; `AirplaneTest.test_off_sem_original_so_desliga_aviao`; `FluxosTest.test_venda_offline_tem_airplane_on_antes_e_off_depois_da_venda` | O airplane desliga também Wi-Fi e dados, guarda e restaura o estado original. Roda no CI (passo "Android driver and flows (offline)", 32 testes). Efeito no Samsung ainda não comprovado. |
| F11-g | Abertura offline recusada deixa abertura pendente local sem aviso e exige repetir o troco | CP 147 | automatizável | unitário | planejado em `apps/mobile/test` (caixa) | **Fora da lista do item 3.** Sem risco financeiro; o reenvio com o mesmo ID já é coberto por F11-b. |
| CP129-a | Sangria recusada no primeiro toque não grava; a segunda é nova entrada | CP 129/130 | coberto | integração API | `caixaUsuario.test.ts::nega autoria forjada, saída sem permissão e fechamento incoerente sem alterar eventos` | Recusa não deixa evento. Texto do erro não guardado: veja CP129-b. |
| CP129-b | Texto do erro da sangria não fica claro e não é guardado | CP 129/130 | automatizável | unitário | planejado: `apps/mobile/test/caixaTelas.test.ts` | **Fora da lista do item 3.** Achado de usabilidade. |
| CP129-c | Dois avisos de falha sem texto no histórico (09h17 e 09h23) | CP 129 | somente humano | humano | — | Sem causa conhecida. |
| CP130-a | Campo "Troco que permanece na gaveta" sem máscara de valor | CP 130 | automatizável | unitário | planejado: `apps/mobile/test/caixaTelas.test.ts` | **Fora da lista do item 3.** |

## F13 — turno disputado e transferência

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F13-a | Duas reservas do mesmo operador em aparelhos diferentes: só uma ativa | F13, CP 147 | coberto | integração API | `apps/api/test/pilotoTurnoDisputado.test.ts::F13: reservas simultâneas do mesmo operador em dois aparelhos confirmam só uma, em três rodadas`; `pilotoTurnoDisputado.test.ts::F13: dois aparelhos pretendendo o mesmo turno ao mesmo tempo: só um vence e só ele escreve` | Também: `caixaUsuario.test.ts::duas reservas concorrentes confirmam somente uma; o índice também protege escritas fora da rota`. |
| F13-b | Reserva do turno aberto a partir de outro aparelho dá 403 `proibido`, não o 409 do código | CP 147 | coberto | integração API | `pilotoTurnoDisputado.test.ts::F13: o 2º aparelho não reserva o turno aberto no 1º, nem outro turno, nem por reservas concorrentes` | Fixa o contrato real: 403 `proibido` no mesmo turno e 409 `conflito` em outro turno. |
| F13-c | Transferência exige consentimento do destino e é atômica | F13, CP 147 | coberto | integração API | `caixaUsuario.test.ts::transferência usa consentimento do destino e débito/crédito atômicos, sem revelar o caixa alheio`; `caixaUsuario.test.ts::falha ao creditar a transferência desfaz também o débito; autorização expirada não movimenta`; `pilotoTurnoDisputado.test.ts::F13: a transferência exige o consentimento explícito, o aparelho anterior correto e o próprio operador`; `pilotoTurnoDisputado.test.ts::F13: com consentimento a transferência move o titular, preserva a origem e a auditoria e é idempotente` | |
| F13-d | Aparelho antigo recusado depois da troca e não reabre o turno | F13, CP 147 | coberto | integração API | `caixaUsuario.test.ts::troca de aparelho preserva origem e recusa o aparelho anterior; conferência não altera fechamento`; `syncOrigem.test.ts::preserva origem histórica após troca e revogação do aparelho`; `pilotoTurnoDisputado.test.ts::F13: depois da transferência o aparelho antigo não escreve nem reabre o turno, e o novo escreve sem duplicar`; `pilotoTurnoDisputado.test.ts::F13: turno encerrado no aparelho novo não é reaberto nem transferido pelo aparelho antigo`; `pilotoTurnoDisputado.test.ts::F13: o retorno ao aparelho antigo é uma nova transferência consentida e devolve a escrita só a ele`; `pilotoTurnoDisputado.test.ts::F13: revogar o aparelho titular bloqueia a escrita dele e o 1º aparelho retoma o turno com consentimento` | Revogação do aparelho não titular: `pilotoTurnoDisputado.test.ts::F13: revogar o 2º aparelho (que não é titular) bloqueia toda escrita dele e não afeta o turno`. |
| F13-e | Retomada do turno no Samsung com "Confirmei a sincronização anterior" | F13, CP 147 | coberto | unitário | `apps/mobile/test/syncIntegracao.test.ts::restaura turno histórico sem adotá-lo automaticamente; retomada explícita preserva a origem` | A folha e o card na tela são humanos. |
| F13-f | Disputa entre dois Androids reais e modo avião nos dois | F13, CP 147 | somente humano | humano | — | Backlog (CP 149); a disputa por HTTP é F13-a. |

## F14 — estoque, fiado, CSV e filial

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F14-a | Baixa única de estoque; reenvio não duplica; baixas simultâneas somam | F14, CP 148 | coberto | integração API | `apps/api/test/gestao.test.ts::baixas simultâneas somam, replay não duplica e cadastro antigo não sobrescreve saldo`; `apps/api/test/pilotoGestaoConcorrente.test.ts::F14: a venda baixa o estoque uma vez e o reenvio não baixa de novo`; `pilotoGestaoConcorrente.test.ts::F14: venda e baixa de estoque simultâneas somam e o saldo final é exato` | |
| F14-b | Estoque negativo mostra divergência; ajuste usa diferença assinada com motivo | F14, CP 148 | coberto | unitário | `apps/mobile/test/gestaoTelas.test.ts::ajuste usa diferença assinada com motivo e expõe saldo negativo e retomada de comando`; API: `pilotoGestaoConcorrente.test.ts::F14: estoque pode ficar negativo com sinalização de divergência e ajuste com motivo o corrige` | A recusa sem motivo, com mensagem em português, é CP148-ux2. |
| F14-c | Devolução acima do vendido é recusada | F14, CP 148 | coberto | integração API | `apps/api/test/pilotoGestaoConcorrente.test.ts::F14: devolução acima do vendido é recusada, também quando somada a devoluções anteriores` | Regra em `apps/api/src/rotas/gestao.ts:65`. |
| F14-d | Fiado parcial, estorno único por original e cancelamento só após zerar | F14, CP 148 | coberto | integração API | `gestao.test.ts::fiado parcial recebe no turno, impede excesso, estorna sem editar e cancela só após devolver`; `pilotoGestaoConcorrente.test.ts::F14: fiado com entrada e saldo, recebimento parcial, estorno único e cancelamento só com líquido zerado` | Também: `pilotoGestaoConcorrente.test.ts::F14: operador não vê nem recebe o título de outro operador; o dono vê todos`. |
| F14-e | Recebimentos concorrentes contra o mesmo saldo respeitam o limite | F14, CP 148 | coberto | integração API | `gestao.test.ts::recebimentos concorrentes respeitam o saldo e falha na gaveta reverte o recebimento`; `pilotoGestaoConcorrente.test.ts::F14: dois recebimentos simultâneos que juntos passam do saldo recebem no máximo o saldo`; `pilotoGestaoConcorrente.test.ts::F14: dois recebimentos que cabem no saldo são aceitos juntos e zeram o título, nunca abaixo de zero`; `pilotoGestaoConcorrente.test.ts::F14: vários recebimentos simultâneos de aparelhos e turnos diferentes nunca passam do saldo` | |
| F14-f | Dinheiro do recebimento entra no turno do receptor | F14, CP 148 | coberto | integração API | `gestao.test.ts::relatórios atribuem recebimento ao período/turno receptor e consolidam lojas somente da empresa`; `pilotoGestaoConcorrente.test.ts::F14: o dinheiro do recebimento entra no turno do receptor e não no do dono do título`; `gestaoTelas.test.ts::recebimento parcial de fiado confirma antes de creditar o turno atual e mostra vencimento` | |
| F14-g | Idempotência do comando de gestão após falha de rede (mesma chave) | F14, CP 148 | coberto | integração API | `pilotoGestaoConcorrente.test.ts::F14: recebimento repetido com a mesma chave e conteúdo diferente não regrava o valor`; `pilotoGestaoConcorrente.test.ts::F14: recebimento repetido em corrida com o original aplica um efeito só`; `pilotoGestaoConcorrente.test.ts::F14: estorno repetido em corrida aplica um efeito só e a gaveta devolve uma vez`; `pilotoGestaoConcorrente.test.ts::F14: cliente repetido com o mesmo ID é idempotente e conteúdo diferente é recusado` | Cliente: `gestaoIntegracao.test.ts::R4: resposta de recebimento perdida mantém chave, bloqueia fechamento e reinicia com um só crédito`. |
| F14-h | CSV do relatório idêntico à API e à tela; consolidado idêntico | F14, CP 148 | coberto | script HTTP | `scripts/homologar-gestao.mts` (seção CSV, gerado pela mesma `csvRelatorio` do app), no CI pelo passo "HTTP homologation scenarios against local API"; tela: `gestaoTelas.test.ts::CSV exporta o resultado exibido mesmo se o usuário editar filtros sem gerar outro relatório` | Última execução local do F14: 162 PASS / 4 SKIP / 0 FAIL. |
| F14-i | Filial isolada, produto da filial não aparece na loja A, consolidado soma as lojas | F14, CP 148 | coberto | integração API | `gestao.test.ts::lojas têm vínculo próprio do dono, limite transacional e nenhum vazamento entre empresas`; mobile: `gestaoIntegracao.test.ts::R4: lojas alternam com OTP, estoque, Pix e pendência de gestão isolados por perfil` | |
| F14-j | Sessão da filial não escreve na loja A e limite de 3 lojas (SKIP no script) | CP 148 | automatizável | script HTTP | `scripts/homologar-gestao.mts` no CI | SKIP no CI; criar a 3ª loja fica para depois (a empresa local fica com 2 lojas). |
| F14-k | Ana e Bruno no isolamento da filial na tela | CP 148 | somente humano | humano | — | Cortado do escopo MVP pelo usuário. |
| F14-l | Concorrência real entre dois Androids | CP 148 | somente humano | humano | — | Só por HTTP até aqui (2º aparelho simulado). |
| CP148-ux1 | Depois de reiniciar, "Vender" reabre o carrinho de uma venda já concluída | CP 148, corrigido no CP 150 | coberto | unitário | `apps/mobile/test/pilotoUxCp148.test.ts::carrinho concluído e persistido é descartado ao carregar e uma nova venda começa vazia`; `pilotoUxCp148.test.ts::venda em andamento (não concluída) continua restaurada, com itens e pagamento parcial`; `pilotoUxCp148.test.ts::não duplica: carregar de novo não conclui a venda outra vez`; `pilotoUxCp148.test.ts::se a limpeza falhar, preserva o estado concluído em vez de perder dados` | Corrigido em `apps/mobile/src/dados/carrinhoDuravel.ts`. Aviso da última venda: veja Lacunas. |
| CP148-ux2 | Folha de confirmação (fiado, ajuste) não fecha com campo vazio e o erro fica atrás | CP 148, corrigido no CP 150 | coberto | unitário | `pilotoUxCp148.test.ts::UX2: vencimento vazio não abre a folha e mostra aviso em português`; `pilotoUxCp148.test.ts::UX2: vencimento válido abre a folha e a confirmação grava a venda`; `pilotoUxCp148.test.ts::UX2: falha na confirmação fecha a folha para o erro ficar visível`; `pilotoUxCp148.test.ts::UX2: recebimento de fiado sem motivo não abre a folha`; `pilotoUxCp148.test.ts::UX2: ajuste de estoque sem motivo não envia e mostra aviso em português` | Corrigido em `Fiado.tsx` e `Estoque.tsx`: a folha valida antes de abrir e fecha em erro; o ajuste exige motivo com mensagem em português. |
| CP148-ux3 | Placeholder do vencimento parece valor preenchido | CP 148, corrigido no CP 150 | coberto | unitário | `pilotoUxCp148.test.ts::UX3: o vencimento mostra um placeholder que não parece valor preenchido` | Placeholder agora "dd/mm/aaaa". |
| CP148-m1 | Notificações e chamadas cobrem toques durante a condução | CP 147/148 | somente humano | humano | — | Método: ativar "Não perturbar"; o driver confere o app em primeiro plano. |

## F15, F16 e F17 — restauração, suporte e exportação

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F15-a | Comparador recusa snapshot parcial, tabela faltante e divergência | F15 | coberto | unitário | `scripts/test/operacao.test.mjs::comparador recusa snapshot parcial, tabela faltante, divergência e integridade inválida mesmo em cópias idênticas` | Roda no CI. |
| F15-b | Restaurar o dump atual em PostgreSQL isolado e comparar IDs, quantidades e valores | F15 | automatizável | script HTTP | planejado: sessão M2 com `scripts/verificar-restauracao*.sql` e `comparar-restauracao.mjs` | **Fora da lista do item 3.** F15 está PENDENTE. |
| F15-c | Instalação substituta recebe só o confirmado; pendência exclusiva da origem fica nela | F15, CP 137 | coberto | unitário | `equipeApiIntegracao.test.ts::R3: dois aparelhos de usuários diferentes recuperam somente o confirmado; fila perdida não é inventada`; `recuperacaoAparelho.test.ts::prova, confirma e repete a mesma substituição sem renovar a sessão` | Restauração por limpeza de dados no Samsung: CP 137 (humano). |
| F16-a | Pedido mantém protocolo; resposta perdida reenvia sem duplicar | F16 | coberto | unitário | `apps/mobile/test/suporte.test.ts::resposta perdida e reinício reenviam a mesma solicitação sem duplicar protocolo`; API: `suporte.test.ts::suporte exige sessão, mantém protocolo no replay e rejeita troca de conteúdo ou identidade` | |
| F16-b | Políticas sem sessão; nada é enviado nem excluído automaticamente | F16 | coberto | unitário | `apps/mobile/test/suporteTela.test.ts::políticas aparecem sem sessão e nenhum atendimento ou arquivo é enviado automaticamente`; `suporteTela.test.ts::exclusão envia pedido de análise com diagnóstico desligado por padrão e preserva arquivos` | |
| F16-c | Outro perfil e o dono não veem mensagens; resposta manual aparece após atualizar | F16 | coberto | integração API | `apps/api/test/suporte.test.ts::exportação e atendimento de operador excluem dados financeiros e protocolos de terceiros`; `suporte.test.ts::pedido de exclusão preserva conta e dados e a resposta da equipe é consultável`; mobile: `suporteTela.test.ts::resposta atrasada de Ana não reaparece após trocar para outro acesso` | Execução no aparelho: PENDENTE. |
| F17-a | Arquivo exportado fica legível depois do seletor; CSV não sobrescreve o JSON | F17, CP 145 | coberto | unitário | `apps/mobile/test/exportacoesNativas.test.ts::destino pode ler JSON após shareAsync resolver; CSV usa outro arquivo sem sobrescrever o JSON` | |
| F17-b | Seletor cancelado mantém o arquivo; limpeza só das exportações vencidas | F17, CP 145 | coberto | unitário | `exportacoesNativas.test.ts::erro do chooser não elimina arquivo que já possa estar sendo consumido; expira depois`; `limpa só exportações vencidas, preservando as recentes e outros arquivos do cache` | Expiração real de 1 h no cache do app não é inspecionável (humano). |
| F17-c | Conteúdo do CSV: uma linha por item, ponto e vírgula, fórmulas protegidas | F17, CP 145 | coberto | unitário | `apps/mobile/test/caixaLogica.test.ts::gera uma linha por item, com ; e vírgula decimal, e protege fórmulas` | |
| F17-d | Diagnóstico exportado sem token, JWT, CPF nem e-mail completos | F17, CP 145 | coberto | unitário | `apps/mobile/test/diagnostico.test.ts::remove tokens, JWT e pares token=valor`; `mascara documentos e e-mails em qualquer nível` | |
| F17-e | Destino de compartilhamento indisponível | F17, CP 145 | automatizável | unitário | planejado: `exportacoesNativas.test.ts` | **Fora da lista do item 3.** Não testado no aparelho nem aqui. |

## Matriz de correções 0.1.9 (CP 145) e correções do CP 146

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| CP145-S04 | Cadastro exige prova de e-mail antes da loja | CP 145 | coberto | integração API | `apps/api/test/cadastroVerificado.test.ts::não cria empresa/usuário/sessão sem prova; emissão só enfileira código cifrado e sem conta` | OTP real entregue: humano (F04-g). |
| CP145-H03 | CPF repetido é recusado | CP 145 | coberto | integração API | `apps/mobile/test/cpfDuplicadoIntegracao.test.ts::mobile HTTP real recusa mesmo CPF normalizado com email novo antes da loja e também na criação final` | CP 145 não testou no aparelho. |
| CP145-H03b | E-mail já cadastrado: mensagem "Este e-mail já tem acesso" | CP 145 | coberto | integração API | `cadastroVerificado.test.ts::recusa email existente na emissão, sem novos desafios ou entregas` | Mensagem na tela só por captura. |
| CP146-a | Reabertura dos dados ao mudar densidade/configuração não repete `iniciar` ("Não foi possível abrir seus dados") | CP 144/146 | automatizável | unitário | planejado em `apps/mobile/test` (`abrirDados()` em `app/_layout.tsx`) | **Fora da lista do item 3.** CP 146: sem teste do remonte; hipótese de causa. |
| CP146-b | Mudança de tamanho de tela e de fonte ao vivo | CP 146 | somente humano | humano | — | Não testada no aparelho. |

## Backlog por decisão do usuário (F18, F19, acessibilidade)

| ID | Cenário ou defeito | Origem | Classificação | Nível | Onde | Observação |
|---|---|---|---|---|---|---|
| F18-a | TalkBack, maior fonte, redução de movimento, teclado e telas pequenas | F18, CP 144/145 | backlog | humano | — | Adiado em 15/11/2026. TalkBack nunca testado. |
| CP144-a | Fonte 2.0 e 360 dp: teclado cobre o valor e o "Valor exato" na cobrança em dinheiro | CP 144 | backlog | fluxo driver | planejado após o MVP: `scripts/fluxos/` | Layout; não bloqueia o MVP. |
| CP144-b | Fonte 2.0 e 360 dp: botão fixo do fechamento esconde o conteúdo e a tecla zero | CP 144 | backlog | fluxo driver | idem | |
| CP144-c | Barra inferior com "Ajustes" cortado; rótulos quebram dentro da palavra | CP 144 | backlog | fluxo driver | idem | |
| CP144-d | Botões Entrada/Sangria/Retirada cortados e ilustração sobre o campo de busca | CP 144 | backlog | fluxo driver | idem | |
| CP144-e | "Tentar novamente" cortado na base em 360 dp e fonte 2.0 | CP 144 | backlog | fluxo driver | idem | |
| F19-a | Retorno a uma versão de API compatível preserva migrações e histórico | F19 | backlog | script HTTP | — | Execução real do F19 fora do MVP (CP 149). |

## Passos de CI e fluxos que fecham a matriz

| Item | Estado | Cobre |
|---|---|---|
| Passo "HTTP homologation scenarios against local API" em `.github/workflows/pdv.yml`: `node scripts/homologar-local.mjs` sobe uma API local descartável com PGlite e roda `homologar-equipe` F08, `--f13`, `--troca-aparelho` e `homologar-gestao` F14 (5 seções) | entregue; última execução local: F08 37 PASS/1 SKIP, F13 25/1, troca 23/1, F14 162/4 SKIP, 0 FAIL; ainda sem execução registrada no CI | F08-a, F14-h (F07-f e F14-j seguem `automatizável`) |
| Passo "Android driver and flows (offline)": `python3 -B -m unittest discover -s scripts/test -p "test_*.py"` | entregue; 32 testes | F11-f (driver) e a validação offline dos fluxos |
| `scripts/fluxos/` (abrir-caixa, vender, entrada, sangria, retirada, venda-offline, fechar-caixa, regressao + README) e `scripts/regressao-aparelho.py` | entregue; validado só em `--simular`, sem aparelho conectado; execução no aparelho pendente | F11-e (base de F05–F07 no aparelho) |
| Correção do `airplane` do driver (Wi-Fi e dados, com estado original restaurado) | entregue em `scripts/pdv-android-ui.py`; efeito no Samsung ainda não comprovado | F11-f |

## Lacunas que ficam para depois

| Lacuna | Tipo | Referência |
|---|---|---|
| Bip único do leitor, leitura real, lanterna | somente humano | F01, CP 144/145 |
| Crash nativo do primeiro produto: causa não provada, uma tentativa sem recorrência | somente humano | CP 115, 117, 139, 143 |
| Hash, pacote e assinatura do APK instalado depois de atualizar | somente humano | F02, CP 142 |
| OTP por e-mail real e leitura da caixa de entrada | somente humano | F04, CP 133, 147 |
| Percepção de "travada" na tela "Entre novamente" e avisos de falha sem texto | somente humano | CP 129, 133 |
| Dois Androids reais: disputa de turno, troca de aparelho, concorrência de gestão, modo avião nos dois | somente humano | F13, F14, CP 147/148 |
| Isolamento da filial na tela para Ana e Bruno | somente humano | CP 148 |
| Expiração de 1 h do cache de exportação e destino indisponível | somente humano | F17, CP 145 |
| Condução com "Não perturbar" e checagem de chamadas | somente humano | CP 147/148 |
| F10 disco cheio | backlog | F10, CP 149 |
| F18 acessibilidade e layout em fonte 2.0 e 360 dp | backlog | F18, CP 144/145 |
| F19 retorno de API | backlog | F19, CP 149 |
| F15 restauração real em PostgreSQL isolado | automatizável, M2 | F15 |
| F09, F16 e F17 executados no aparelho (F09 e F16 PENDENTES; F17 só CSV) | somente humano | roteiro-piloto-android.md |
| Aceite humano de todos os cenários | somente humano | CP 147/148 |
| Itens H01, H02, C02, N01–N04 e S03 da matriz 0.1.9 sem prova física; não localizei teste por item | somente humano | CP 145, `correcoes-auditoria-0.1.9.md` |
| Após reiniciar com venda recém-concluída, o carrinho abre vazio sem aviso da última venda; mostrar "Última venda concluída" fica no backlog (CP 150) | backlog | CP 148 (ux1), CP 150 |
