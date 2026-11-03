# R1 — Equipe, convites e permissões

Implementação no checkout em 01/11/2026 (America/Sao_Paulo), referente à segunda entrega funcional do roadmap. O código da API e do mobile foi alterado; os serviços externos e o APK 0.1.5 de R0 continuam na versão anterior. Construído e validado localmente não significa implantado, testado em Android físico ou aprovado pelo usuário.

## Fluxo de uso

1. O dono acessa **Ajustes → Equipe da loja → Convidar pessoa**, informa nome/e-mail pessoal, escolhe operador ou gerente e confere as permissões.
2. O vínculo fica convidado por sete dias. O dono orienta a pessoa a abrir o app e entrar com aquele e-mail; não há disparo automático de mensagem de convite.
3. A pessoa pede o código de acesso por e-mail. O servidor comprova a identidade com o OTP e lista somente os vínculos ativos e convites válidos daquela pessoa.
4. Com mais de um vínculo, a pessoa escolhe empresa/loja. Convite único ou múltiplo exige **Aceitar convite e entrar**. Código errado, expirado, reutilizado ou pertencente a outra pessoa não autoriza o acesso.
5. Em **Ajustes → Usuários neste aparelho**, outro perfil entra ou retoma sua sessão protegida. A retomada consulta o vínculo no servidor. Sem conexão, a alternância não é liberada nesta etapa.
6. O dono pode suspender, retomar, desligar, renovar convite ou alterar papel/permissões. Alterações revogam as sessões daquele vínculo. Desligar conserva a identidade e o histórico; um novo convite reutiliza o vínculo, sem reatribuir suas vendas.

## Política entregue

| Ação | Dono | Gerente padrão | Operador padrão |
|---|---|---|---|
| Vender | Sim | Sim, autoria própria | Sim, autoria própria |
| Abrir, suprir e fechar caixa próprio | Sim | Sim | Sim |
| Cadastrar/editar/excluir produto e confirmar EAN | Sim | Sim | Não |
| Cancelar venda | Sim | Sim, com autoria do cancelamento | Não |
| Fazer sangria própria | Sim | Sim | Não |
| Consultar vendas/caixas dos outros na loja | Sim | Sim | Não |
| Administrar equipe, aparelhos e cobrança | Sim | Não | Não |

O dono pode configurar as permissões dos funcionários. Administração da equipe não pode ser concedida a gerente/operador. Permissão de consulta de caixas não permite movimentar o caixa de outra pessoa pelo contrato atual. Retirada completa, transferências, reserva de turno e intervenções auditadas serão entregues em R2.

A API consulta o vínculo vigente, valida origem de vendas/caixas e autoriza cada operação. O pull restringe registros financeiros no SQL antes da paginação; o funcionário não recebe registros dos colegas para apenas escondê-los na tela. Gerente com consulta ampliada recebe apenas a loja autorizada. Dados de cartão e cupom da assinatura são removidos da resposta de funcionários. CSV e contagens usam o perfil selecionado. O diagnóstico de testes grava autoria de perfil nos eventos e filtra exportação, quantidade e limpeza por empresa/loja/operador; eventos legados sem autoria ficam preservados, sem exportação atribuída. Não foram criadas rotas de exportação global.

## Modelo e preservação

- `usuarios` identifica a pessoa pelo e-mail normalizado; `operadores` representa o vínculo com empresa/loja, papel, permissões e estado. Uma pessoa pode participar de várias empresas/lojas.
- A migração `0008_mute_maddog.sql` cria as identidades dos donos e associa os vínculos existentes, sem mudar os IDs de conta, loja, operador, aparelho, vendas ou caixas. Sessões legadas sem identidade comprovada são revogadas; seu histórico não é atribuído a alguém inventado.
- OTP mantém dez minutos, uso único, cinco erros e os limites compartilhados existentes. Em modo de e-mail, a fila cifra e entrega o código ao destinatário pessoal, preservando os testes da fila e a ausência do código nas respostas de produção. Recuperação que substitui aparelho continua exclusiva do dono.
- A instalação usa o mesmo ID de aparelho para os perfis da mesma loja. Empresas/lojas diferentes conservam os vínculos de aparelho exigidos pelo servidor. Trocar usuário não consome nova vaga de aparelho naquela loja.
- SQLite/navegador separam rascunhos, parcelas, vendas, caixas, outbox, cursores e preferências por perfil. O dono conserva a partição legada. Produtos têm origem compartilhada no servidor e cache por perfil; chave Pix/cache EAN usam o escopo da loja.
- No Android, a sessão ativa e as pausadas usam o adapter de cofre, sem token na metadata comum ou SQLite financeiro. A credencial ativa não é duplicada como perfil pausado. A validação automatizada usa cofre de teste; o SecureStore real exige homologação física.
- Pausar preserva rascunho e outbox. Recebimento parcial impede alternância. Só o perfil ativo sincroniza usando sua sessão, e respostas de outro contexto são descartadas. A retomada faz revalidação online; política de alternância offline e cenários amplos de falhas permanecem em R3.
- Sair bloqueia novas operações e sincronização local imediatamente. Se a chamada remota falhar, o cofre mantém uma fila exclusiva de logout; o app repete a revogação ao iniciar/voltar ao primeiro plano. Essa credencial não aparece como perfil retomável. A revogação remota só é confirmada quando há conexão.

## Validação e próximos ambientes

Os resultados finais e o artefato de compilação ficam registrados no checkpoint de entrega. Testes específicos de R1:

Entrega local: [CP 007](checkpoints-roadmap.md#cp-20261101-007-entrega-local-de-r1), complementado pelo [CP 008](checkpoints-roadmap.md#cp-20261101-008-isolamento-do-diagnostico-e-validacao-final-r1). Suítes completas aprovadas: **API 506, mobile 511, shared 169 — total 1.186**. Tipos dos três workspaces aprovados. Após a revisão, também passaram 56 testes de autenticação/equipe/recuperação da API, 24 de integração/interface/fluxo mobile e os 31 de diagnóstico. A compilação Android/Hermes aprovou 1.900 módulos e gerou bundle final de 5.063.403 bytes; SHA256 `3367406b7c1923651ea0c9fb977c6da438ecd7b8373430fe5823d0e6054ca323`. Artefatos locais ignorados: `builds/r1-bundle/`, `builds/r1-export.log` e `builds/r1-validacao-local.json`. Isso valida o bundle, sem instalar ou gerar APK.

As primeiras tentativas de SMTP/HTTP/persistência e de emissão do bytecode sofreram restrições do sandbox. Os cenários afetados e a compilação passaram ao serem repetidos fora dessa restrição, sem afrouxar TLS, autenticação ou contratos. PostgreSQL usado nos testes locais é PGlite; não houve execução desta entrega contra o banco externo.

- `apps/api/test/equipe.test.ts`: dois funcionários, múltiplas empresas/lojas, aceite, uso único, suspensão, troca de permissões, desligamento, permissões por ação, autoria de cancelamento e entrega pessoal de OTP.
- `apps/api/test/migracaoEquipe.test.ts`: migração do banco legado, dados financeiros idênticos e sessões legadas sem identidade revogadas.
- `apps/mobile/test/equipeApiIntegracao.test.ts`: API com PostgreSQL embarcado, SQLite real/cofre de teste e adapter navegador; perfis, rascunhos, filas, produtos compartilhados, ID de aparelho, preferências, reinício, suspensão e revogação offline/reconexão.
- `apps/mobile/test/equipeTela.test.ts`: escolha de vínculo e aceite explícito na interface.
- `apps/mobile/test/sessaoSegura.test.ts` e `packages/shared/test/equipe.test.ts`: isolamento do cofre, recuperação após falha e política/contratos de permissões.

Roteiro de homologação externa/Android, ainda pendente:

1. Implantar a API com a migração em homologação, preservando backup e conferindo o dono/histórico existentes. Validar também PostgreSQL independente e concorrência real, além do PostgreSQL embarcado usado localmente.
2. Gerar APK conectado a essa versão da API. O APK 0.1.5 existente não contém R1; um bundle exportado também não equivale a APK instalado.
3. No APK exato, dono convida dois e-mails controlados pelo testador. Cada pessoa recebe seu OTP pelo SMTP externo, aceita o vínculo e entra com credencial própria.
4. Em um aparelho, alternar perfis e conferir SecureStore, rascunho, retorno do segundo plano, suspensão, logout e reconexão. Durante recebimento parcial, a troca precisa ser recusada.
5. Em dois aparelhos, criar vendas de cada operador e verificar na API/pull/CSV que cada funcionário recebe somente seus dados financeiros e que o dono/gerente autorizado confere o consolidado correto.
6. Tentar acesso direto a vínculo, loja, venda e caixa alheios sem permissão; suspender/desligar enquanto há sessão ativa. Registrar os resultados físicos e o aceite humano separadamente.

Cadastro completo de novas lojas, caixa individual com reserva no servidor e política offline não são concluídos por esta entrega. O modo demo continua sendo demonstrativo; equipe real depende do backend HTTP. Nenhum segredo, token ou código de acesso real integra estas evidências.
