# Correções da auditoria Android — candidato 0.1.9

Referência: 03/11/2026, America/Sao_Paulo. Continuação da [auditoria 0.1.8](auditoria-estatica-android-0.1.8.md). **0.1.9 pronta para reteste supervisionado no celular**, com os 18 tratamentos construídos e as verificações locais/CI/artefato concluídas abaixo. Nenhum teste Android físico ou aceite novo inferido; APK 0.1.8 preservado. [CP 045](checkpoints-roadmap.md#cp-20261103-045-apk-019-pronto-para-reteste).

| Achado | Tratamento nos fontes | Estado de validação |
|---|---|---|
| A01 | Digitação sem câmera usa o mesmo sheet rolável; remove formulário absoluto | Exercitado por teste de scanner; reteste físico pendente |
| A02 | Campos/cabeçalhos de busca dentro do ListHeaderComponent | Cabeçalho de busca conferido no teste de inclusão; reteste físico pendente |
| A03 | Corpo e CTA em KeyboardAvoidingView; behavior Android e sheet limitado/rolável | Teclado/fonte/TalkBack físicos pendentes |
| H01 | Leitura de pendência protegida, finally não propaga, trava/ref e proteção de desmontagem | Regressão montagem/finally PASS |
| H02 | Catch de acessibilidade, câmera e clipboard | Rejeição do bridge de permissão exercitada; tipos/CI PASS; módulos reais pendentes |
| H03 | Whitelist e mensagens locais de e-mail/documento | Dois cenários 409 PASS |
| C01 | Desmontagem de CameraView por pausa, sheet e AppState; lanterna desligada junto | Dois testes de ciclo/permissão simulados PASS; físico pendente |
| C02 | 16 coleções de gestão/turnos com páginas de 25 itens | Teste 1.000 clientes e última página PASS; desempenho físico pendente |
| C03 | JSON temporário único, retenção de 1 h e limpeza posterior | Três cenários de arquivo/destino/expiração simulados PASS; destino Android real pendente |
| S01 | R8/shrink habilitados para novo release | Build/mapping PASS, 9.519 classes renomeadas; MLKit/câmera/JNI protegidos; scanner físico pendente |
| S02 | Armazenamento amplo/biometria bloqueados | Manifesto do APK sem READ/WRITE_EXTERNAL_STORAGE ou biometria/fingerprint; físico pendente |
| S03 | Aviso explícito de pendências somente no aparelho | Política de recuperar somente sincronizado preservada; F15/F19 pendentes |
| S04 | API/UI de desafio de e-mail vinculado a aparelho, uso único/10 min/5 tentativas/rate limit; fila cifrada sem criar empresa antes da prova; migração 0012 | Cinco cenários de API em modo email PASS; API implantada em homologação e recusa sem prova conferida por HTTPS; novo OTP externo/Android pendentes |
| S05 | CSV usa a mesma retenção/limpeza de exportações JSON | Cenários de retenção/limpeza restrita PASS; físico pendente |
| N01 | Confere identidade da loja antes/depois da gravação, preserva partição do operador | Dono/gerente/operador e callback de loja antiga PASS |
| N02 | Entrada de estoque só no cadastro novo; existente conectado usa preço e direciona à gestão | Regressão de produto existente/preço sem saldo absoluto PASS |
| N03 | Aguarda inclusão durável/resultado; mantém tela/peso em erro e trava por ref | Dois casos de persistência/trava/peso e cabeçalho rolável PASS |
| N04 | Remove promessa de ROI restrita; orienta um código por vez e conferência do produto | Câmera física pendente; não promete filtro geométrico |

Validação local até CP 042: API 46 arquivos/538 testes em PGlite PASS; mobile completo 68 arquivos/575 testes PASS fora da restrição de localhost, mais dois arquivos/três casos adicionados depois PASS; shared 17 arquivos/172 casos PASS; duas ferramentas PASS; tipos dos três workspaces PASS. Logs em `builds/pdv-019-*`. Falhas anteriores de sandbox/timeout e de fixture de fontes no teste de câmera foram preservadas e distinguidas da rodada aprovada.

**CI externo e implantação, CP 043:** commit `df418233899256e33ba3d7c8e5c92fa164ac5185`, branch `codex/pdv-homologacao-real`; [CI 41658558931](https://github.com/romulosutil/prisma-pdv-app/actions/runs/41658558931) aprovado: API 46 arquivos/597 casos em PostgreSQL 17, mobile 70 arquivos/578 casos, shared 17 arquivos/172 casos, duas ferramentas, tipos, imagem e isolamento. São 1.347 casos nas três suítes. API implantada somente em homologação, ambiente/fonte preservados e auto deploy false. HTTPS confirmou saúde/hora, cadastro verificado contrato 1 e recusa 400 de cadastro sem prova, sem e-mail enviado/conta criada. Evidências `builds/pdv-019-ci-{aprovado.log,resultado.json}` e `pdv-019-http-compatibilidade.json`. Sem aceite físico.

S04 exige prova no modo de envio real de e-mail, obrigatório pelo bootstrap em produção. O modo desenvolvimento/demo mantém o fixture legado isolado sem canal real; ao fornecer um desafio nele, a mesma validação de prova é aplicada. Não existe fallback de email para desenvolvimento em produção. O novo script de build exige `/auth/cadastro/configuracao` com contrato 1 e verificação ativa antes de compilar o conectado. O código digitado só fica em memória e no POST de confirmação; diagnóstico não registra corpos HTTP. Nenhum segredo foi colocado na configuração pública.

Backup anterior à migração confirmado no painel: `pdv-pre-cadastro-verificado-019-20261103`, arquivo `aladdin/pdv-postgres-homologacao/2026-11-03T14:48:18.870Z.sql.gz`, 20,8 kB, Success às 14:48:20 UTC (11:48:20 em São Paulo). É evidência de criação do backup, sem inferir restauração. Base de homologação não foi limpa.

## Artefato entregue e limites do reteste

- APK: `builds/pdv-homologacao-0.1.9.apk`, 64.622.028 bytes; versão 0.1.9/versionCode 10, pacote `br.com.pdv.mobile.homologacao`.
- SHA256: `5fe5118f97dee38c4f92710f9ab433d8f4e7d61cc0cd89d50945ff28ee8448f0`. Assinatura interna v2, mesmo certificado da 0.1.8, permitindo atualização sem limpar dados. Não é assinatura de distribuição em loja.
- Build Gradle SUCCESS/exit 0 em 8m44s, R8/shrink executados; 299 fontes/configurações sem divergência, runtime igual a df41823. Mapping de 92.549.712 bytes, SHA256 `53e375148581a15360d454c6b4f0d47751442c365217bc2db8f16120381e9cfa`; 12.414 classes no mapping, 9.519 renomeadas. Nomes de BarhopperV3, CommonComponentRegistrar e ExpoCameraView preservados. Isso não substitui ler um código real com MLKit no Samsung.
- Bundle exato: 4.286.368 bytes, SHA256 `e7accd84e11ed783784e8d012f367858588120dcb46a32dff741e88d8ee0cf96`, 1.891 módulos; gate PASS, host de homologação e diagnóstico local presentes, implementações demo pesquisadas ausentes. MinSdk 24/target 36/compile 37, ARM32/ARM64, zipalign 16 KB e 29/29 ELF ARM64 com alinhamento mínimo de 16 KB PASS.
- Export Android/Hermes de produção, somente para inspeção: 4.269.596 bytes, SHA256 `c6ea3be37a1daf6af131809947d153c8a60f655754bcd416663233ea92bd4b82`, 1.888 módulos; gate PASS sem telemetria de homologação. Não é APK nem publicação/deploy de produção. A API de produção foi preservada.
- Evidências locais: `builds/pdv-homologacao-0.1.9-*`, `auditoria-estatica-019-evidencias.json`, `pdv-019-{conferencia-final.json,manifesto-binario.txt,r8-alinhamento.json,producao-verificacao.json}`. Documentos versionáveis em `docs/`; artefatos grandes locais ignorados pelo Git.

Atualizar sem desinstalar e executar [o roteiro da 0.1.9](roteiro-piloto-android.md#reteste-das-correções-da-auditoria-na-019). O diagnóstico continua local, manual/exportável e exclusivo de homologação, sem corpos HTTP, OTP, credenciais, nomes/textos pessoais ou envio remoto automático. Novo cadastro exige OTP de e-mail; sessão preservada e login existente seguem caminhos distintos. Câmera com R8, teclado/fonte/TalkBack, SecureStore, compartilhamento recebido e primeiro OTP externo devem ser verificados no celular. S03 foi tratado com aviso e política explícita, sem prometer restaurar pendências nunca enviadas; N04 retirou a promessa falsa da moldura, sem alegar filtro geométrico. Restauração atual, F01–F19 e piloto comercial/aceite continuam abertos. Este candidato pronto para reteste não significa aprovação comercial.

## Ajuste de acesso após o retorno físico

O [CP 047](checkpoints-roadmap.md#cp-20261103-047-diagnostico-fisico-019-e-investigacao-do-login) recebeu diagnóstico 0.1.9 e o usuário esclareceu a trava tardia de CPF/e-mail e erro após optar pelo login. Correção **somente local**, posterior ao artefato acima, nos [CPs 048–050](checkpoints-roadmap.md#cp-20261103-050-correcao-local-do-acesso-validada): e-mail conferido na primeira tela; OTP e CPF/CNPJ conferidos nessa mesma etapa antes da loja; criação repete prova e duplicidade. Login/reautenticação/recuperação passam a concluir a navegação mesmo com remontagem, com formulário bloqueado durante finalização. Diagnóstico novo distingue motivos fixos, sem dados pessoais. O gate do próximo APK exige API com verificação antecipada.

As evidências de equivalência das 299 fontes referem-se à construção histórica da 0.1.9, não aos fontes locais posteriores. Novo CI PostgreSQL, API de homologação, APK/versionamento, inspeção e [reteste físico do ajuste](roteiro-piloto-android.md#reteste-ajuste-acesso-pos-019) continuam pendentes. Nenhum checkbox físico ou aceite foi concluído por essa correção local.


**Entrega posterior, 03/11 às 15h13:** API de homologação 84dd0dc e APK 0.1.10/11 entregues após CI de 1.367 casos, assinatura/bundle/300 fontes/alinhamentos conferidos. Os estados de preparação acima são históricos. [CP 054](checkpoints-roadmap.md#cp-20261103-054-apk-0110-entregue-para-reteste) · [reteste](roteiro-piloto-android.md#reteste-ajuste-acesso-pos-019). SHA256 `4e32a8cd6f372b9bac7c622d30848c3773a8c4283bb8ac0dd598bb781be6ffdb`; físico/aceite pendentes.
