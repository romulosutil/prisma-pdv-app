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

Fase 1 em implementação. Fases 2–4 não iniciadas nesta reorganização. O controlador do Goal permanece pausado, sem comando de retomada disponível ao agente; a fase atual foi autorizada diretamente na conversa. O checkpoint continuará sendo uma parada para avaliação humana.
