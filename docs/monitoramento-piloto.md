# Monitoramento diário do piloto

Roteiro curto, manual, para o piloto com lojistas reais. Complementa [operacao-backup-suporte.md](operacao-backup-suporte.md) (incidente, retenção, restauração). Não há alertas automáticos: se ninguém rodar o roteiro, ninguém será avisado.

- **Responsável:** dono do produto. **Substituto:** a definir (sem substituto, o roteiro não roda em férias/ausência: registrar "não verificado" no diário).
- **Contato público do suporte:** contato@prumo.services (único canal divulgado nas páginas públicas).
- **Rotina:** ~10 min por dia, sugerido às 09h00 (America/Sao_Paulo), depois do backup agendado (produção 23h00, homologação 23h15 locais) e antes do horário de pico das lojas. Origem de produção: `https://aladdin-pdv-api.jicnzg.easypanel.host`.

| # | Verificação | Comando / onde | Esperado | Se falhar |
|---|---|---|---|---|
| a | API | `node scripts/verificar-operacao.mjs <origem> builds/operacao-AAAAMMDD.json` | `resultado: PASS`, saída 0 (`/saude` 200, `/dev` 404, `/suporte/*` 401) | Repetir uma vez. Persistindo, ver logs do contêiner no EasyPanel e aplicar "Se algo falhar" |
| b | Páginas públicas | Mesmo comando: casos `/privacidade`, `/exclusao-de-conta`, `/termos` | 200, `text/html`, contém contato@prumo.services | Sem rota implantada (404) conta como FAIL, não há estado "ainda não implantada". Corrigir/implantar antes de divulgar a ficha da Play; aplicar "Se algo falhar" se já divulgada |
| c | E-mail (códigos de login) | Console PostgreSQL do EasyPanel: `psql -X -f scripts/verificar-operacao.sql`; logs `[email]` do contêiner | `email_na_fila_mais_15min` 0, `email_falhou_24h` 0, `lease_vencida` 0, `email_aceito_smtp_24h` > 0 em dia de uso. Log `[email]` a cada ~5 s com `falhas:0` | Fila antiga ou falhas: aplicar "Se algo falhar". Não enviar e-mail de teste nem extrair código/envelope; SMTP aceitar não prova inbox: confirmar entrega só com destinatário autorizado que já esteja tentando entrar |
| d | Filas de suporte e sincronização | Mesmo SQL: `suporte_aberto_mais_24h`; protocolos abertos | `suporte_aberto_mais_24h` 0. Nenhum protocolo cita pendência de sincronização nunca enviada | Responder o protocolo (um ID por vez, conforme o procedimento) e, se citar venda/caixa pendente, aplicar "Se algo falhar". Mensagem só abre com finalidade de atendimento |
| e | Backup | Painel EasyPanel, serviço `pdv-postgres*`, aba de backups | Execução automática nas últimas 26 h, status Success, arquivo `.sql.gz` com tamanho plausível (dezenas de kB hoje; queda brusca é suspeita) | Achado conhecido (CP 107, CP 152): o log não mostra execuções automáticas, causa não determinada. Se não aparecer, fazer backup manual no agendamento existente, conferir arquivo e tamanho e registrar "manual". Não apagar backups nem retenção |
| f | Registro | Uma linha em [diario-piloto.md](diario-piloto.md) | Linha do dia preenchida | Dia sem rodar: registrar "não verificado" com o motivo |

## Passos do dia

1. Rodar (a) e (b) na produção; na homologação só se houver mudança recente.
2. Abrir o console PostgreSQL autorizado e rodar o SQL (c, d). É só leitura e imprime contagens e idades, sem dados pessoais.
3. Conferir logs `[email]` e o backup no painel (c, e).
4. Ler a caixa de contato@prumo.services e responder protocolos e e-mails de lojistas (o app não promete prazo; atendimento é manual).
5. Preencher o diário (f). Anotar versão da API/APK quando houver mudança, sem segredos, códigos ou e-mails de clientes.

## Se algo falhar

Parar a expansão do piloto (nenhum lojista novo, nenhuma atualização do APK). Preservar dados: não restaurar sobre banco vivo, não limpar filas, não apagar backups, fazer backup manual antes de qualquer mudança. Abrir incidente conforme [operacao-backup-suporte.md](operacao-backup-suporte.md) (seção Incidente), registrar causa e decisão humana antes de retomar.

## Limites

- Sem alertas automáticos e sem notificações da VPS: backlog por decisão do usuário em 01/11/2026. O roteiro depende de pessoa rodando.
- Sem cópia externa de backup: os backups ficam no disco local do servidor e uma falha do servidor perde dados e cópias juntos. Também em backlog, não bloqueia o MVP.
- O verificador HTTP não valida OTP, worker, backup, migrações nem Android físico; só o SQL e o painel cobrem fila e backup.
- Backup com status Success não prova restauração; a última restauração validada foi a do CP 152.
