# Ciclo de venda, caixa e offline no Android Emulator

Execução de 03/11/2026, America/Sao_Paulo. **Ciclo dirigido aprovado em Android emulado com API real de homologação.** Isso não encerra o piloto físico R5 nem representa aceite do usuário. [Conclusão, CP 093](checkpoints-roadmap.md#cp-20261103-093-ciclo-emulado-concluido-e-entrega-0111); histórico desde o [CP 083](checkpoints-roadmap.md#cp-20261103-083-ciclo-emulado-produto-persistido-e-crash-nativo). Resumo verificável: `builds/pdv-ciclo-resumo.json`, com 14 asserções das evidências nativas/API/artefatos aprovadas.

## Ambiente e artefatos

- AVD `pdv-acesso-api35-curto`, Android 15/API 35, x86_64, qemu=1, Android Emulator oficial 36.2.12/WHPX/SwiftShader. Fuso do AVD UTC; datas comerciais e deste documento em São Paulo.
- Pacote `br.com.pdv.mobile.homologacao`, release/R8, **0.1.11/versionCode 12**. Atualizado com `install -r`, sem desinstalar ou limpar dados. Sessão sintética previamente autenticada preservada; nenhum OTP verdadeiro lido nesta rodada.
- API HTTPS `https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host`; compatibilidade implantada registrada no CP054/84dd0dc. Não houve novo deploy ou alteração de produção/Samsung.
- APK efetivamente instalado: `builds/pdv-homologacao-0.1.11-emulador.apk`, SHA256 `e7fcd26bce85b31e8d1ab83efe77b28ba5679739fd7ce60487237a533baba6f7`, reconferido diretamente no `base.apk` instalado.
- APK para atualização interna ARM64/ARM32: `builds/pdv-homologacao-0.1.11.apk`, SHA256 `2df561ee3c7c6717aab82304e1dc4ff2ab5b9858b47aeb7e551e23bf648fe0c3`. Não instalado em aparelho físico nesta rodada.
- Ambos têm os mesmos 300 arquivos de fonte e bundle Hermes SHA256 `2b0ef95648b5699f3044fb5d9846abb69f57b468da966e3ac3b1d3817b2cad37`. Assinatura interna preservada; builds/gate de release aprovados. Nenhum CI/commit novo foi criado nesta execução.

## Resultado financeiro observado

Dados sintéticos, um operador e uma loja; Pix/cartão são registros **manuais de teste**, sem transferência ou aprovação bancária real. Produto principal: R$ 10, estoque inicial de 20 unidades. Um segundo produto de R$ 1, sem estoque/vendas, foi usado para retestar a lista.

| Referência | Quantidade | Total | Recebimento | Condição |
|---|---:|---:|---|---|
| 000001 | 1 | R$ 10 | Dinheiro 10; recebido 20/troco 10 | Online, ainda na 0.1.10 |
| 000002 | 1 | R$ 10 | Pix manual 10 | Online, 0.1.11 |
| 000003 | 1 | R$ 10 | Crédito manual 10 | Online, 0.1.11 |
| 000004 | 1 | R$ 10 | Dinheiro 5 + Pix manual 5 | Offline; force-stop após primeira parcela |
| 000005 | 2 | R$ 20 | Dinheiro 20 | Offline, 0.1.11 |

Total: **cinco vendas/R$ 60**, dinheiro 35/Pix 15/cartão 10. Entrada 50, sangria 8 e retirada 2, com origem/destino/motivo e autoria preservados.

`Gaveta esperada = 100 de abertura + 35 em dinheiro + 50 de entrada − 8 de sangria − 2 de retirada = R$175`.

Fechamento offline: contado 170, diferença −5, troco preservado 20/recolhido 150. Mesmo turno confirmado no painel do servidor: `01a1a41b-e7d2-7fc0-8fd6-c190998de9f2`. A destinação do contado não descontou novamente os movimentos. Após reconexão, estoque confirmado **14 unidades**, correspondendo às seis unidades vendidas.

## Cenários executados

| Caso | Resultado | Evidência em builds/ |
|---|---|---|
| Produto manual, preço/estoque e retorno à lista | PASS após correção do crash | `pdv-ciclo-regressao-primeiro-item-layout.json` |
| Atualização sem limpar sessão/produto/venda/turno | PASS | `pdv-ciclo-atualizacao-0111-layout.json` |
| Dinheiro com troco; Pix/cartão manuais e seus avisos | PASS | `pdv-ciclo-{dinheiro-troco,venda-pix-concluida,cartao-manual-aviso,venda-cartao-concluida}-layout.json` |
| Entrada50/sangria8/retirada2, sem misturar Pix/cartão à gaveta | PASS | `pdv-ciclo-movimentos-conferidos-layout.json` |
| Modo avião real, Wi-Fi desligado, nenhuma rede padrão | PASS | `pdv-ciclo-rede-offline.json` |
| Parcela5 preservada após force-stop, retomando falta5 | PASS | `pdv-ciclo-{parcela-offline-salva,parcela-retomada}-layout.json` |
| Venda dividida e venda20 concluídas offline | PASS | `pdv-ciclo-{dividida-offline-concluida,venda-offline-vinte-concluida}-layout.json` |
| Reabrir mesma imagem após interrupção do processo do AVD | PASS de preservação, causa externa inconclusiva | `pdv-ciclo-apos-reinicio-avd-offline-layout.json` |
| Reboot normal do Android, ainda sem rede | PASS | `pdv-ciclo-{reboot-normal-offline,gaveta-offline-175}-layout.json` |
| Fechamento offline e force-stop; alerta de confirmação pendente | PASS | `pdv-ciclo-fechamento-offline-{salvo,retomado}-layout.json` |
| Fila original preservada: duas vendas + fechamento | PASS:3 pendentes/0 revisão | `pdv-ciclo-fila-fechamento-offline-layout.json` |
| Reconexão e segunda sincronização forçada | PASS:0 pendentes/0 revisão | `pdv-ciclo-sync-{reconexao,repetida}-layout.json` |
| Cinco referências únicas/meios/horários/valores iguais antes/depois | PASS, comparação programática | `pdv-ciclo-referencias-comparadas.json` |
| Baixa única de estoque,20→14 | PASS | `pdv-ciclo-estoque-apos-sync-layout.json` |
| Painel HTTP do turno, eventos/autoria e destinação | PASS:175/170/−5;150/20 | `pdv-ciclo-{painel-caixa-confirmado,turno-confirmado-movimentos,turno-confirmado-destinacao}-layout.json` |
| Relatório HTTP, período03/11/2026, sem duplicação | PASS: vendas60/recebimentos60/entrada50/sangria8/retirada2/diferença−5 | `pdv-ciclo-relatorio-totais{1,2}-layout.json` |
| Mensagem pública de código inválido e sessão anterior preservada | PASS no APK novo, sem gerar/ler OTP | `pdv-ciclo-{login-codigo-invalido-corrigido,perfil-preservado-apos-401,dashboard-final}-layout.json` |

## Correção encontrada e validações locais

A 0.1.10 encerrou nativamente ao salvar o primeiro produto e voltar à lista: Fabric/`ReactClippingViewManager`/`addViewAt`, filho já associado a outro pai. O produto havia sido persistido. `ListaProdutos.tsx` passou a usar `removeClippedSubviews={false}`; o reteste na 0.1.11 de lista sem resultado→primeiro resultado salvou/retornou sem crash. [CP 083](checkpoints-roadmap.md#cp-20261103-083-ciclo-emulado-produto-persistido-e-crash-nativo) e [CP 085](checkpoints-roadmap.md#cp-20261103-085-atualizacao-e-correcao-nativa-validadas).

A correção da mensagem pública de código inválido do CP 081 também está nos dois APKs e passou no reteste nativo: e-mail sintético aleatório em `example.invalid`, não cadastrado; solicitação mascarada sem gerar/enviar OTP, conforme contrato da API; código fictício recusado com “Código inválido ou expirado. Confira o código ou solicite outro.”. Entrada adicional manteve o perfil anterior ativo, zero pendências/revisão e retorno à dashboard online com cinco vendas/R$ 60. Não valida expiração longa ou OTP válido de outra conta nesta rodada.

Regressão mobile: **600 casos/73 arquivos PASS** no conjunto das execuções. Primeiro lote completo: 578 PASS e 22 não executados por timeout de inicialização PGlite em duas suítes; repetição somente dessas duas, com um worker, 22/22 PASS. Os 81 dirigidos anteriores são subconjunto, não casos adicionais. Tipos mobile PASS. Cinco integrações localhost exigiram execução fora da restrição de rede do sandbox; sem banco remoto de teste. Logs `pdv-ciclo-{tipos,regressoes,integracao-liberada,mobile-completo,mobile-repeticao}.log`.

## Reprodução e limites

`scripts/pdv-emulador-ui.py` recebe arquivo JSON com ações nativas `tap`, `text`, `money`, `scroll`, `assert`, `row`, `snapshot`, `screenshot`, `stop`, `launch`. Exige qemu1 no emulador identificado; usa Android CLI oficial/ADB, sem banco privado, credenciais ou bypass de autenticação. Exemplo de verificação sem mutação financeira:

```json
[["assert","Dados confirmados no servidor"],["row","Aguardando confirmação","0"],["row","Preservados para revisão","0"],["snapshot","conferencia"]]
```

Executar no checkout com `python scripts/pdv-emulador-ui.py builds/pdv-ciclo-acoes.json`, usando a tela/estado apropriados. O arquivo de ações do teste contém etapas dependentes do estado; **não repetir pagamentos cegamente**. Snapshots são sanitizados; execuções posteriores são registradas em `builds/pdv-ciclo-execucoes.jsonl`. Interrupções de automação (rótulos/rolagem/transição/teclado/transporte ADB) foram reobservadas antes da continuação, preservando os lotes interrompidos no histórico.

O processo do AVD encerrou uma vez, causa não comprovada, distinto do crash nativo corrigido do app. Foi reaberta a mesma imagem sem limpeza/snapshot antigo; quatro vendas preservadas. Depois houve reboot normal independente, com as cinco vendas preservadas. Não esconder essa limitação do ambiente nem concluir ausência geral de crashes.

Continuam pendentes os cenários físicos F01–F19, scanner real, acessibilidade, dois operadores/aparelhos, concorrência/resposta perdida real, disco cheio, expiração de sete dias, atualização com fila pendente, restauração/aparelho substituto, exportação no destino e aceite humano. Foram conferidos o alerta e a confirmação de fechamento pendente; não houve nova reserva concorrente. A repetição nativa de sync não substitui o teste integrado de perda de resposta. Não foram extraídos UUIDs internos de todas as vendas do SQLite; compararam-se suas referências comerciais visíveis e o UUID do turno. Não há liberação automática de R6 nem implantação em produção.
