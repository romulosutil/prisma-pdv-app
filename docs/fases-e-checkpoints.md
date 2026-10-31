# Fases e checkpoints de validação no app

Reorganização autorizada em 30/10/2026. O plano de produção continua sendo o inventário de requisitos; estas fases agrupam entregas que podem ser vistas e testadas. Implementações parciais não viram critérios concluídos sem evidência.

| Fase | Entrega visível | Roteiro do checkpoint | Relação com o plano |
|---|---|---|---|
| 1 — Cobrança manual | Checkout com dinheiro, cartão manual, Pix estático e divisão. Sem oferta de Tap/Pix automático ou conexões simuladas. | Criar venda de R$25; receber R$10 em dinheiro; conferir saldo; receber restante manualmente; conferir recibo e recarregar. | Parte P0-06-B/C; bases P0-01 já existentes |
| 2 — Venda e caixa consistentes | Vínculo explícito venda–caixa, recuperação durável e fechamento preservado com ajustes auditáveis. | Abrir caixa; vender; reiniciar durante pagamento; retomar sem duplicar; fechar; cancelar e conferir histórico. | P0-01-C/D/E, P0-04-D/E |
| 3 — Sincronizar e restaurar | Pendências reais, envio/ACK/retry, pull e recuperação autenticada. | Operar offline; reiniciar; reconectar; conferir servidor; restaurar instalação autorizada e identificar pendências não confirmadas. | P0-02 e fechamento das partes locais P0-03 |
| 4 — Homologar e preparar lançamento | Artefato Android, oferta fiel, acesso/assinatura reais e operação preparada para revisão. | Repetir jornada no artefato exato; revisar compra, e-mail, atualização, backup e atendimento. | P0-03/05/06/07/08 e mínimos P1 |

Decisão posterior ao checkpoint3: manter acesso por código de e-mail e usar **Resend via SMTP**, sem servidor de correio próprio na VPS. O usuário criou a conta e possui uma API key; nenhum segredo foi fornecido ou configurado. [Roteiro preparado](operacao-email-resend.md). A proposta intermediária de substituir o código por senha foi suspensa antes de qualquer alteração de código. Esta preparação não homologa entrega externa nem autoriza implantação/alterações em produção. Multiusuário continua fora do escopo inicial.

## Regra de execução

- Trabalhar somente na fase atual e parar no checkpoint para o usuário validar antes da próxima fase.
- Contrato curto e decisões no STATE; até dois executores independentes Terra Médio, arquivos separados. Gestor integra e faz commits.
- Testes direcionados durante o trabalho; regressão do escopo afetado uma vez na integração da fase, repetida somente por alteração/falha relevante. Uma suíte por vez por limite de memória.
- Um revisor novo ao final da entrega coerente. Não enfraquecer testes nem considerar simulação como integração real.
- Checkpoint contém commit, endereço/artefato acessível, roteiro de 5–10 minutos, testes realizados, limitações e itens a observar. Não avançar automaticamente após a entrega.
- Primeiro checkpoint no navegador local com componentes Expo; validação web não substitui SQLite nativo, Android ou provider real.
- Sem push, publicação, produção, contratação ou cobranças reais. Etapas externas são preparadas e registradas como pendentes.

## Estado

Atualização31/10/2026: usuário informou API HTTPS aladdin publicada por outra frente, confirmou primeira chave definitiva inexistente e autorizou fluxo de builds/decisões autônomas. Perfil production, chave local estável, incremento patch/minor/major e APK candidato conectado preparados; roteiro em [build de produção](build-producao.md). Chave privada fora do Git e certificado público fixado; nenhum push/deploy ou dado real alterado neste chat. Testes físicos, entrega OTP da VPS, recuperação conectada, backup externo e restauração continuam pendentes. Não confundir geração do candidato com liberação de produção.

Atualização para o checkpoint Android em30/10/2026: usuário autorizou verificar recuperação e gerar APK, parando para testar no celular. A VPS e a assinatura são trabalhadas em outras frentes. API HTTPS ainda indisponível, confirmada pelo usuário; APK inicial será local/offline, com identidade separada. Recuperação automatizada passou33API/56mobile após fixture explícita de limite1, com revisão independente e sensor seguro. O antigo UAT A/B não pode ser confirmado porque o contêiner/abas não existem mais na retomada. Roteiro e andamento em [checkpoint do APK](checkpoint-apk.md). Nenhum critério global de Android ou recuperação externa foi marcado por preparação de build.

Fases1–2 aprovadas pelo usuário; em30/10/2026 autorizou “pode fazer a próxima etapa” após o checkpoint2. Fase3 implementada e revisada tecnicamente. Depois da conversa sobre redução de escopo, domínio e Resend, o usuário autorizou “conseguimos implementar o restante aqui enquanto isso?”. **Fase4A local iniciada**, preparando homologação de acesso enquanto faltam verificação externa e credenciais no ambiente. O controlador do Goal permanece pausado, sem comando de retomada disponível ao agente; a etapa atual foi autorizada diretamente na conversa. Não presumir aceites externos ou de Android.

## Fase 4 reduzida

| Bloco | Critério de saída e checkpoint | Dependências externas |
|---|---|---|
| 4A — Acesso | Launcher local isolado/testado e, depois, código recebido e login/recuperação reais. Modalidade comercial deve ser definida antes da assinatura. | Resend Verified, chave no ambiente e destino autorizado; assinatura real se lançamento pago. Piloto gratuito segue proposta, sem decisão presumida. |
| 4B — Servidor e recuperação | Configuração revisável, migrações e backup restaurado em ambiente isolado com tempos medidos. | Infraestrutura/segredos/destino de backup; implantação real fora da autorização atual. |
| 4C — Android | Jornada offline, scanner, retomada e atualização conservando dados no artefato candidato. | Aparelho, assinatura e canal de distribuição. |
| 4D — Suporte e oferta | Suporte, privacidade, termos, exportação, solicitação de exclusão, diagnóstico sanitizado e tratamento de pendências acessíveis. | Dados/canal efetivos de atendimento e textos revisados. |
| 4E — Liberação | Relatório relaciona commit, artefato, API, testes e pendências; revisão final. | Nenhuma liberação se houver critério obrigatório pendente. |

Preparação local não conclui os critérios externos. Cada entrega coerente tem checkpoint; ao surgir bloqueio, registrar e trabalhar nas partes independentes autorizadas. Não implementar multiusuário, pagamentos integrados ou expansão de relatórios neste corte.

## Checkpoint 1 — 30/10/2026

Abrir [app local](http://localhost:8086/), neste computador. Demonstração web com dados fictícios em origem separada; API externa desativada. Não usar cartão, chave Pix ou dados reais. A conta de teste já está aberta. O servidor foi deixado ativo ao entregar o checkpoint.

1. Em Ajustes, conferir Pix com confirmação manual, cartão da maquininha e dinheiro; não há botões de conexão.
2. Em Início → Valor avulso → Avulso, adicionar R$25 e tocar em Cobrar. Conferir os quatro meios: Pix, cartão, dinheiro e divisão.
3. Em Dividir pagamento → Outro valor, escolher R$10 → Dinheiro → Valor exato → Confirmar recebimento. Conferir pago R$10 e restante R$15.
4. Selecionar Pix. A chave fictícia `homologacao@example.invalid` já está cadastrada nesta demonstração. Conferir aviso de que o app não confirma pelo banco; apenas neste teste, tocar em Recebi o Pix.
5. Abrir recibo: total R$25, dinheiro R$10 e Pix R$15. Recarregar e conferir que a venda permanece concluída; Início deve mostrar a nova venda uma única vez.
6. Opcionalmente repetir com cartão manual ou dinheiro recebido R$30 para conferir troco R$5. Não realizar transação externa.

Conferência do gestor no navegador: venda `#000231` de R$25, parcelas R$10/R$15, recibo e recarga preservados; histórico passou de47 para48 vendas e deR$1284,50 paraR$1309,50. Pix estático exibiu confirmação explícita e aviso de conferência manual. Ajustes sem conexões. Dados e assinatura de teste são simulações locais, não integração real concluída.

Gates: mobile452/41arquivos antes da sexta verificação de onboarding; alvo final independente19/19 (13domínio+6interface). Shared156/11 e typecheck de todos os workspaces PASS; mobile repetido após correções PASS. Revisor novo:6/6 mutações comportamentais detectadas, scratch removido e README do usuário preservado. Evidências detalhadas em `.specs/features/fase-1-manual/validation.md`.

Validação humana desta demonstração concluída pelo usuário em30/10/2026, autorizando fase2. Ainda pendentes: Android/SQLite nativo e artefato distribuído; recuperação/sync e critérios globais do plano; credenciais e homologação externas de acesso, e-mail e assinatura. Nenhuma publicação/push/produção/cobrança real. Projeto não pronto para produção.

Se o servidor local encerrar, executar na raiz do repositório (Python e dependências locais já instalados):

```powershell
rtk proxy python -X utf8 -c "import os,subprocess; e=dict(os.environ,CI='1',EXPO_NO_TELEMETRY='1',BROWSER='none',EXPO_PUBLIC_API_URL='',EXPO_PUBLIC_FERRAMENTAS_TESTE='1',NODE_ENV='development'); raise SystemExit(subprocess.call(['rtk','proxy','npm.cmd','run','web','-w','@pdv/mobile','--','--port','8086','--localhost'],env=e))"
```

Esse processo usa um ambiente isolado para a demonstração e não altera configurações salvas do projeto. Ctrl+C encerra o servidor; não iniciar dois processos na mesma porta.

## Checkpoint 2 — 30/10/2026

Abrir [Caixa no app local](http://localhost:8086/caixa). Commits: `74d2c3a` contrato; `574e232` vínculo, persistência, API, migração e interface; `6681882` correção da comparação de instantes encontrada pela revisão. A URL continua na mesma origem de demonstração, preservando os testes que o usuário já fez. API externa desativada, nenhum pagamento ou estorno real.

O que conferir agora, em5–10min:

1. Rolar até Fechamentos anteriores: caixa terminado em `e64c061e` com esperado R$20 e contado R$20; cancelamento `#000233` aparece como ajuste comercial de -R$25 separado. O caixa anterior `9256b3ee` continua em R$100/R$100.
2. Abrir o ajuste para ver caixa vinculado, identificação do evento, data, operador, motivo e aviso de que não houve estorno bancário. Recarregar: os registros devem permanecer.
3. Abrir novo caixa com R$10 de troco. As vendas dos turnos anteriores não devem aumentar a gaveta. Vendas antigas sem vínculo são identificadas, sem associação presumida por horário.
4. Criar venda avulsa de R$25. Em divisão, receber R$10 em dinheiro; recarregar a página durante a cobrança e conferir recebido R$10/saldo R$15. Concluir os R$15 por cartão manual ou Pix estático fictício.
5. Conferir gaveta R$20 (troco10 + dinheiro10); fechar contando R$20. Em Vendas, cancelar a venda de teste; conferir evento e fechamento20/20 preservado, com ajuste separado. Não usar dados, pagamentos ou estornos reais.

Conferência realizada pelo gestor via navegador: passos acima completos na venda `#000233` (id `01a18e40-7632-78c9-ac36-7d536e9eebd1`), caixa `01a18e40-2b57-7e13-84fa-8573e64c061e`, cancelamento `01a18e41-b519-7afe-a8e9-e29089bc6201`. O teste preservou49 vendas anteriores; após a nova venda havia50, e após o cancelamento49 concluídas. Reload final após correção manteve os dois fechamentos e ajuste. Isso prova somente a demonstração web, sem atomicidade multichave do adaptador browser.

Evidência local adicional: SQLite real em arquivo, reabertura, rollback na outbox, vínculo conhecido/ausente/conflitante e corridas nas duas ordens; PostgreSQL17 dedicado com migração0006 e rejeições sem efeitos. Gates: mobile461/42 antes do teste temporal adicional, alvo final2/2; API443/32 em PGlite; shared159/12; todos os tipos PASS e mobile repetido após correção PASS; alvo final PostgreSQL6/6. Revisor independente: PASS, oito regressões comportamentais detectadas; relatório `.specs/features/fase-2-caixa/validation.md`. O PostgreSQL descartável foi removido; servidor web ficou ativo.

Limitações e próximos passos: homologação Android e artefato distribuído continuam pendentes. Envio automático da outbox, ACK, pull e restauração financeira serão a fase3 após sua avaliação; os testes locais da API não significam que esse fluxo já esteja conectado no app. E-mail, assinatura e infraestrutura reais seguem pendentes. **Parar aqui para o usuário validar; não iniciar fase3. Projeto não pronto para produção.**

## Checkpoint 3 — 30/10/2026

Abrir [Sincronização no app conectado local](http://localhost:8087/caixa/sync). Origem separada da demo8086, com APIHTTP real em127.0.0.1:3338 e PostgreSQL17 local na porta55441, banco `pdv_checkpoint_sync`. A conta fictícia `checkpoint-sync@example.invalid` já está aberta. Assinatura e código de desenvolvimento são fixtures; não há pagamento ou e-mail real. Não usar dados reais.

Commits: `d30ea9f` contrato; `8a0b3e5` outbox/motor/HTTP/pull/restauração/interface; `985c9b1` isolamento do caixa atual depois da restauração em aparelho autorizado. Revisão independente PASS nos caminhos verificados, seis regressões comportamentais detectadas e validação direcionada HTTP/PG5/5. O revisor não repetiu a regressão completa nem realizou auditoria integral de todos os caminhos.

Roteiro de5–10min:

1. Conferir zero em Aguardando confirmação, zero em Preservados para revisão e a data da última sincronização financeira. Tocar Sincronizar agora e conferir que os números permanecem coerentes.
2. Em Vendas, conferir a venda de teste de R$25 e troco R$5. É um registro efetivamente confirmado na API local; a demonstração antiga de8086 não foi importada.
3. Criar outra venda manual no caixa aberto, concluir e conferir a fila; tocar Sincronizar agora ou aguardar até15s com o app ativo. A fila deve zerar após o aceite do servidor.
4. Recarregar e conferir que vendas, vínculo e confirmação persistem. Repetir Sincronizar agora não deve duplicar vendas.
5. Se houver registro rejeitado em testes posteriores, conferir motivo, exportar para arquivo local e seguir [revisão de pendências](revisao-pendencias-sync.md). Não apagar nem alterar a data para forçar aceite.

Smoke do gestor: API desligada, abriu caixa com zero de troco e concluiu venda `01a18ef2-dc5d-723c-b114-dd3d75c4caaa` de R$25, recebidoR$30/trocoR$5. A tela mostrou2 pendências, preservadas após reload; PostgreSQL ainda tinha0vendas/0caixas/0ACK. Após reconectar e sincronizar: fila0, PG1venda25 vinculada/1caixa/2ACK, com data financeira atualizada. Reinício final usa o mesmo banco, sem semear outra cópia.

Gates finais: mobile489/47arquivos PASS, usando PostgreSQL no teste integrado e SQLite real; cinco casos HTTP/PG incluem resposta perdida após commit, restauração autenticada,503 alterações paginadas, venda8dias preservada com vizinho válido, conflito LWW e isolamento de caixa no aparelho restaurado (alguns casos agrupam cenários). Tipos todos PASS antes do seguimento e mobile repetido após ele PASS. Sensor inicial5/5 e seguimento1/1, scratch removido. Servidores foram pausados durante testes após um OOM e reiniciados, sem aumentar heap ou omitir casos. API/shared runtime permaneceram inalterados, exceto launcher exclusivamente local de revisão.

Ambiente de revisão deixado ativo: Metro8087 e API3338, container `pdv-fase3-pg`. `pdv_test` é descartável e exclusivo dos testes; `pdv_checkpoint_sync` contém a revisão interativa e não pode ser alvo de TRUNCATE dos testes. O container foi criado com --rm: encerrá-lo descarta estes dados fictícios; não confundir este ambiente com backup de produção. Outros projetos não foram tocados. Demo8086 conserva os dados anteriores no navegador, mas seu servidor foi pausado para liberar memória.

Reiniciar API se necessário: em `apps/api`, executar com ambiente somente development e URL do banco local dedicado:

```powershell
rtk proxy python -X utf8 -c "import os,subprocess; e=dict(os.environ,NODE_ENV='development',DATABASE_URL='postgres://pdv_test:pdv_fase3_local_test@127.0.0.1:55441/pdv_checkpoint_sync'); raise SystemExit(subprocess.call(['rtk','proxy','npx.cmd','--no-install','tsx','scripts/checkpoint-sync.ts'],env=e))"
```

Reiniciar web na raiz:

```powershell
rtk proxy python -X utf8 -c "import os,subprocess; e=dict(os.environ,CI='1',EXPO_NO_TELEMETRY='1',BROWSER='none',EXPO_PUBLIC_API_URL='http://127.0.0.1:3338',EXPO_PUBLIC_FERRAMENTAS_TESTE='1',NODE_ENV='development'); raise SystemExit(subprocess.call(['rtk','proxy','npm.cmd','run','web','-w','@pdv/mobile','--','--port','8087','--localhost'],env=e))"
```

Pendentes: sua avaliação; Android/artefato exato; e-mail, assinatura, infraestrutura, operação e canal de revisão reais. A aceitação excepcional de vendas antigas não foi implementada; conteúdo continua preservado e exportável. **Não iniciar fase4 automaticamente. Projeto não pronto para produção.**

## Checkpoint 4A local — preparação de acesso

### Seguimento autorizado — erro, envio e recuperação

Após aprovar o primeiro login real, o usuário autorizou este seguimento. Commit `adcda6e` acrescenta sete casos integrados preservando os dois anteriores, sem modificar runtime: errado/5erros, expiração exatamente10min/antesdolimite, reuso, recusaSMTPpermanente, retomada após recriar API e recuperação com OTP recebido no protocoloSMTP. Gate dos cinco arquivos:80/4PASS e falha de worker por memória na fila; fila48/48PASS isoladamente.128casos distintos executados e aprovados, semskip; não houve um único run conjunto verde. TiposAPI e, após recompor dependências, tiposAPI/mobile/shared PASS. SMTPloopback e relógio controlado não comprovam falha real do Resend nem reboot do sistema.

Incidente da primeira revisão: limpeza de worktree atravessou junctions e atingiu workspaces/arquivos ignorados. Fonte restaurada ao HEAD preservando README; dependências recompostas pelo lockfile; usuário resalvou o arquivo local de credenciais, validado sem expor valores. DadosPG conferidos intactos e rascunho web10/15 reaberto após reinício/reload. O primeiro sensor foi descartado. Nova revisão segura, somente emmemória, detectou cinco falhas comportamentais e preservou os hashes das fontes; PASS do escopo local/preparoUAT. Detalhes em `.specs/features/fase-4a-cenarios-acesso/incidente-revisao.md` e `validation.md`.

Checkpoint humano preparado: [A/origem](http://localhost:8088/pagar/dividir) conserva produto e venda25 confirmados no servidor, caixa aberto e outro rascunho25 com parcela10/saldo15 apenas local. [B/nova instalação](http://[::1]:8088/entrar) usa origem separada e mesmo servidor local. O usuário deve digitar o código recebido, entrar, escolher Recuperar acesso neste aparelho quando surgir o limite, selecionar o aparelho anterior e confirmar. Depois conferir produto/venda emB e rascunho ainda emA; caixa antigo deve ser histórico, sem adotar sua gaveta. **Não concluído até confirmação humana.**

Homologação ativa: API3339 sessão25938, Metro8088 sessão72621. A demo8087/API3338 continuam pausadas para poupar memória, com dados preservados. Nenhum contêiner/volume removido. Só e-mail é externo real; cartão/assinatura/dados de venda são fixtures. Não iniciar4B nem marcar P0-03 global por esses testes.

Atualização de envio externo: usuário confirmou chave salva e autorizou destinatário Gmail. Domínio Verified comprovado em captura. Homologação3339 e app8088 foram iniciados separadamente; conta/assinatura fictícias criadas no onboarding, sem cobrança real. Um código solicitado pela tela de entrada foi aceito pelo Resend na tentativa1, ID `ea79ddb5-8bbd-418a-9e4f-a26eb376fe8d`. **Recebimento e login aprovados pelo usuário: “Testei, deu certo”.** Metadados confirmam código consumido às22:37:09 em30/10/2026 (São Paulo) e nova sessão ativa. [App autenticado](http://localhost:8088/). Nenhum OTP/token/chave foi lido; nenhum aceite global alterado, pois demais cenários externos e Android continuam pendentes. Detalhes no roteiro Resend. API sessão24765, Metro sessão13001. Ambos usam o banco dedicado de homologação; demo8087 permanece preservada.

Autorizado pelo usuário enquanto prumo.services verifica no Resend. Código79fe157 prepara um ambiente local em3339 separado da demo8087, com SMTP/TLS, relógio real, fila de e-mail e sem rotas `/dev` ou jobs de cobrança. Banco novo `pdv_homologacao_email` criado no PostgreSQL local existente, com migrações atuais; contém fila vazia. O comando de homologação e o futuro app8088 **não foram deixados ativos com credenciais fictícias**.

Ver [configuração e comando](operacao-email-resend.md). Este lote não muda telas: a entrada por código já existe. Depois de domínio Verified, segredo no ambiente e destino autorizado, o checkpoint visível será cadastrar a conta de teste, sair, pedir o código, recebê-lo e entrar pela origem de homologação. A demo8087 conserva dados e continuará acessível após os testes; não usá-la como evidência de e-mail real.

Validação do gestor:126/7 testes de configuração/bootstrap/SMTP/rotas/jobs PASS;40/4 de emissão/login/integração com PostgreSQL e SMTP TCP local PASS; tiposAPI PASS. Smoke de composição real no banco novo: `/saude`200, ambas as rotas `/dev`404, worker sem entradas e desligamento concluído, sem solicitar código ou enviar e-mail ao Resend. Revisão independente30/30 e seis falhas comportamentais detectadas emscratch, removido sem alterar árvore real. Achado menor de resumo desatualizado no plano corrigido e revisado; validation.md e validate_state PASS para preparação local. Modelo Terra Médio solicitado, efetivo não confirmável.

API3338 retomada (saúde200), sessão42095; Metro8087 retomado, sessão21519. [App de demonstração](http://localhost:8087/) acessível; dados de origem e banco preservados. Sem mudança de interface neste lote. O servidor3339 foi desligado ao terminar o smoke e não faz envios externos.

Limitação: regressãoAPI completa NÃO aprovada nesta rodada. O Windows apresentou OOM/erros de workers; repetição emPGlite após pausar apenas API3338/Metro8087 terminou242/469 casos,19erros de workers. Não enfraquecer testes nem usar os alvos aprovados como prova da regressão completa. Android, assinatura, produção e entrega Resend continuam pendentes.

Limpeza Docker solicitada no meio da execução: cache22,73GB→0 e imagens31→16 (23,05GB→16,15GB). Preservados28contêineres,9ativos e25volumes; nenhum banco/volume apagado nem outro projeto parado. Prunes não compactam o arquivo de disco virtual do Docker no Windows. O container de revisão `pdv-fase3-pg` continua --rm: não encerrá-lo, pois seus dados fictícios seriam descartados.
