# Correções da auditoria Android — candidato 0.1.9

Referência: 03/11/2026, America/Sao_Paulo. Continuação da [auditoria 0.1.8](auditoria-estatica-android-0.1.8.md). Mudanças em construção; nenhum teste Android físico ou aceite novo inferido. APK 0.1.8 preservado.

| Achado | Tratamento nos fontes | Estado de validação |
|---|---|---|
| A01 | Digitação sem câmera usa o mesmo sheet rolável; remove formulário absoluto | Reteste físico pendente |
| A02 | Campos/cabeçalhos de busca dentro do ListHeaderComponent | Reteste físico pendente |
| A03 | Corpo e CTA em KeyboardAvoidingView; behavior Android e sheet limitado/rolável | Teclado/fonte/TalkBack físicos pendentes |
| H01 | Leitura de pendência protegida, finally não propaga, trava/ref e proteção de desmontagem | Regressão montagem/finally PASS |
| H02 | Catch de acessibilidade, câmera e clipboard | Testes nativos simulados/físicos pendentes |
| H03 | Whitelist e mensagens locais de e-mail/documento | Dois cenários 409 PASS |
| C01 | Desmontagem de CameraView por pausa, sheet e AppState; lanterna desligada junto | Dois testes de ciclo/permissão simulados PASS; físico pendente |
| C02 | 16 coleções de gestão/turnos com páginas de 25 itens | Teste 1.000 clientes e última página PASS; desempenho físico pendente |
| C03 | JSON temporário único, retenção de 1 h e limpeza posterior | Três cenários de arquivo/destino/expiração simulados PASS; destino Android real pendente |
| S01 | R8/shrink habilitados para novo release | Build otimizado e mapping pendentes |
| S02 | Armazenamento amplo/biometria bloqueados | Manifesto final e testes físicos pendentes |
| S03 | Aviso explícito de pendências somente no aparelho | Política de recuperar somente sincronizado preservada; F15/F19 pendentes |
| S04 | API/UI de desafio de e-mail vinculado a aparelho, uso único/10 min/5 tentativas/rate limit; fila cifrada sem criar empresa antes da prova; migração 0012 | Cinco cenários de API em modo email PASS; implantação/SMTP externo/Android pendentes |
| S05 | CSV usa a mesma retenção/limpeza de exportações JSON | Cenários de retenção/limpeza restrita PASS; físico pendente |
| N01 | Confere identidade da loja antes/depois da gravação, preserva partição do operador | Dono/gerente/operador e callback de loja antiga PASS |
| N02 | Entrada de estoque só no cadastro novo; existente conectado usa preço e direciona à gestão | Regressão de produto existente/preço sem saldo absoluto PASS |
| N03 | Aguarda inclusão durável/resultado; mantém tela/peso em erro e trava por ref | Dois casos de persistência/trava/peso e cabeçalho rolável PASS |
| N04 | Remove promessa de ROI restrita; orienta um código por vez e conferência do produto | Câmera física pendente; não promete filtro geométrico |

Validação local até CP 042: API 46 arquivos/538 testes em PGlite PASS; mobile completo 68 arquivos/575 testes PASS fora da restrição de localhost, mais dois arquivos/três casos adicionados depois PASS; shared 17 arquivos/172 casos PASS; duas ferramentas PASS; tipos dos três workspaces PASS. Logs em `builds/pdv-019-*`. Falhas anteriores de sandbox/timeout e de fixture de fontes no teste de câmera foram preservadas e distinguidas da rodada aprovada. CI PostgreSQL, build R8 e implantação ainda pendentes.

S04 exige prova no modo de envio real de e-mail, obrigatório pelo bootstrap em produção. O modo desenvolvimento/demo mantém o fixture legado isolado sem canal real; ao fornecer um desafio nele, a mesma validação de prova é aplicada. Não existe fallback de email para desenvolvimento em produção. O novo script de build exige `/auth/cadastro/configuracao` com contrato 1 e verificação ativa antes de compilar o conectado. O código digitado só fica em memória e no POST de confirmação; diagnóstico não registra corpos HTTP. Nenhum segredo foi colocado na configuração pública.

Backup anterior à migração confirmado no painel: `pdv-pre-cadastro-verificado-019-20261103`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-03T14:48:18.870Z.sql.gz`, 20,8 kB, Success às 14:48:20 UTC (11:48:20 em São Paulo). É evidência de criação do backup, sem inferir restauração. Base de homologação não foi limpa.
