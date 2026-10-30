# Fases e checkpoints de validação no app

Reorganização autorizada em 30/10/2026. O plano de produção continua sendo o inventário de requisitos; estas fases agrupam entregas que podem ser vistas e testadas. Implementações parciais não viram critérios concluídos sem evidência.

| Fase | Entrega visível | Roteiro do checkpoint | Relação com o plano |
|---|---|---|---|
| 1 — Cobrança manual | Checkout com dinheiro, cartão manual, Pix estático e divisão. Sem oferta de Tap/Pix automático ou conexões simuladas. | Criar venda de R$25; receber R$10 em dinheiro; conferir saldo; receber restante manualmente; conferir recibo e recarregar. | Parte P0-06-B/C; bases P0-01 já existentes |
| 2 — Venda e caixa consistentes | Vínculo explícito venda–caixa, recuperação durável e fechamento preservado com ajustes auditáveis. | Abrir caixa; vender; reiniciar durante pagamento; retomar sem duplicar; fechar; cancelar e conferir histórico. | P0-01-C/D/E, P0-04-D/E |
| 3 — Sincronizar e restaurar | Pendências reais, envio/ACK/retry, pull e recuperação autenticada. | Operar offline; reiniciar; reconectar; conferir servidor; restaurar instalação autorizada e identificar pendências não confirmadas. | P0-02 e fechamento das partes locais P0-03 |
| 4 — Homologar e preparar lançamento | Artefato Android, oferta fiel, acesso/assinatura reais e operação preparada para revisão. | Repetir jornada no artefato exato; revisar compra, e-mail, atualização, backup e atendimento. | P0-03/05/06/07/08 e mínimos P1 |

## Regra de execução

- Trabalhar somente na fase atual e parar no checkpoint para o usuário validar antes da próxima fase.
- Contrato curto e decisões no STATE; até dois executores independentes Terra Médio, arquivos separados. Gestor integra e faz commits.
- Testes direcionados durante o trabalho; regressão do escopo afetado uma vez na integração da fase, repetida somente por alteração/falha relevante. Uma suíte por vez por limite de memória.
- Um revisor novo ao final da entrega coerente. Não enfraquecer testes nem considerar simulação como integração real.
- Checkpoint contém commit, endereço/artefato acessível, roteiro de 5–10 minutos, testes realizados, limitações e itens a observar. Não avançar automaticamente após a entrega.
- Primeiro checkpoint no navegador local com componentes Expo; validação web não substitui SQLite nativo, Android ou provider real.
- Sem push, publicação, produção, contratação ou cobranças reais. Etapas externas são preparadas e registradas como pendentes.

## Estado

Fase 1 implementada e revisada tecnicamente em `b105d1d`; **aguardando validação humana no app**. Fases 2–4 não iniciadas nesta reorganização. O controlador do Goal permanece pausado, sem comando de retomada disponível ao agente; a fase atual foi autorizada diretamente na conversa.

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

Ainda pendentes: validação do usuário, Android/SQLite nativo e artefato distribuído; recuperação/sync e critérios globais do plano; credenciais e homologação externas de acesso, e-mail e assinatura. Nenhuma publicação/push/produção/cobrança real. **Projeto não pronto para produção. Parar aqui antes da fase2.**

Se o servidor local encerrar, executar na raiz do repositório (Python e dependências locais já instalados):

```powershell
rtk proxy python -X utf8 -c "import os,subprocess; e=dict(os.environ,CI='1',EXPO_NO_TELEMETRY='1',BROWSER='none',EXPO_PUBLIC_API_URL='',EXPO_PUBLIC_FERRAMENTAS_TESTE='1',NODE_ENV='development'); raise SystemExit(subprocess.call(['rtk','proxy','npm.cmd','run','web','-w','@pdv/mobile','--','--port','8086','--localhost'],env=e))"
```

Esse processo usa um ambiente isolado para a demonstração e não altera configurações salvas do projeto. Ctrl+C encerra o servidor; não iniciar dois processos na mesma porta.
