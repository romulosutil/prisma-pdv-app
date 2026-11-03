# Roteiro físico do piloto R5

Estado inicial: **todos os cenários abaixo pendentes**. Executar com pessoas autorizadas, dados descartáveis em homologação e pelo menos dois celulares físicos; uma instalação substituta pode usar um terceiro aparelho ou perfil Android separado. Simulação em Node/SQLite, export Hermes, emulador e teste HTTP têm resultados próprios e não preenchem esta matriz.

**Primeira execução relatada pelo usuário em 03/11/2026, APK 0.1.7:** Samsung S25 Ultra, Android 17 (informados pelo executor). Acesso seguiu sem código para onboarding/dashboard; produto sem nome sugerido; abertura de caixa não localizada; app “piscando”. Usuário interrompeu no passo 4, sem executar o ciclo financeiro/offline/fechamento. Resultado: **teste interrompido, piloto não aprovado**; não atribuir PASS integral a F01/F04 nem FAIL a cenários não executados. CPF já cadastrado relatado sem registrar o documento. Diagnóstico e limpeza da base de homologação solicitados para a próxima versão. Ver [CP 036](checkpoints-roadmap.md#cp-20261103-036-primeiro-relato-fisico-017-e-correcao-em-andamento).

## Preparação e identificação

1. Implantar a versão compatível de R1–R5 somente em homologação, com backup atual preservado e migrações até `0011`. `/saude` 200 não basta. Executar `node scripts/verificar-operacao.mjs https://aladdin-pdv-api-homologacao.jicnzg.easypanel.host builds/r5-http-homologacao.json`; exigir PASS e comprovar OTP real com destinatários autorizados. Não extrair código do banco.
2. Executar regressão em PostgreSQL 17 local **dedicado `pdv_test`**, sem build simultâneo: definir `PDV_TEST_POSTGRES_URL` apontando somente para localhost/pdv_test e executar testes API com `--maxWorkers=1`. O helper faz TRUNCATE. Nunca fornecer URL comercial, remota ou de homologação compartilhada.
3. Compilar `pwsh -File scripts/build-android.ps1 -Perfil homologacao`. Guardar APK, manifesto, SHA256, certificado/assinatura, inventário de fontes, logs, versão e commit/diff da API. Release interno é assinado para testes; não é distribuição comercial. Produção exige assinatura própria/EAS e definição de canal.
4. Vincular cada evidência ao SHA256 do APK **efetivamente instalado** e à versão da API. Registrar pacote, versão do Android/modelo, versão anterior e assinatura. `pwsh -File scripts/coletar-piloto-android.ps1 -Apk builds/pdv-homologacao-0.1.7.apk -Saida builds/r5-aparelho-ana.json` coleta inventário sem instalar. Serial sai somente como hash; não compartilhar logcat completo, tokens ou códigos.
5. Criar uma empresa e convidar Ana e Bruno com e-mails próprios. Criar outra empresa para testes de isolamento. Escolher responsável humano por execução, suporte e aceite; registrar referência, sem dados pessoais no repositório. Ao executar, substituir PENDENTE por PASS/FAIL com data America/Sao_Paulo, evidência, resultado observado e executor.

## Matriz física

| ID | Executar no APK identificado | Resultado exigido | Estado |
|---|---|---|---|
| F01 | Instalar limpo; negar e depois conceder câmera; ler EAN, digitar e usar lanterna | Sem duplicação de bip; recusa de câmera permite digitação; sem permissão de áudio | PENDENTE |
| F02 | Atualizar homologação 0.1.5/0.1.6 para 0.1.7, com dados sincronizados e fila pendente | Mesmo pacote/certificado; IDs/parcelas/caixa/filas preservados; repetir hash após instalação | PENDENTE |
| F03 | Testar migração da 0.1.4 em cópia autorizada, conservando a instalação original | Não importar semente demo para conta real; conta conectada em pacote de homologação separado. Atualização comercial da 0.1.4 exige roteiro/canal próprios | PENDENTE |
| F04 | Dono convida Ana/Bruno; login OTP, alternância, pausa/logout e reinício | SecureStore conserva apenas as sessões autorizadas; perfis e pendências separados; suspensão/revogação bloqueiam ao reconectar | PENDENTE |
| F05 | Ana: abrir 100, vender 200 em dinheiro, suprir 50, sangrar 80, retirar 20; Bruno: abrir 60, vender 40 | Esperado Ana R$ 250, Bruno R$ 100; uma saída física corresponde a um evento | PENDENTE |
| F06 | Ana vende 10 Pix manual e 20 cartão manual; conferir recebimentos fora do app | Total comercial Ana 230, gaveta continua 250. Não simular confirmação integrada | PENDENTE |
| F07 | Fechar Ana contando 245 e Bruno 100; informar recolhimento/troco e dono conferir | Diferenças −5/0; autoria preservada; saída final não descontada duas vezes; consolidado comercial 270, esperado 350, contado 345 | PENDENTE |
| F08 | Operador tenta consultar/alterar caixa alheio por UI e HTTP; empresa B tenta acessar A | API recusa; nenhum dado financeiro de outro operador baixado sem permissão; gestores somente no escopo permitido | PENDENTE |
| F09 | Forçar encerramento depois de registrar uma parcela dividida e antes da conclusão; repetir logo após concluir | Parcela reaparece uma vez; conclusão mantém um ID e um total, sem venda duplicada | PENDENTE |
| F10 | Em homologação descartável, encher espaço e tentar parcela, venda, suporte e exportação | Escrita falha explicitamente; não anuncia sucesso nem envia suporte antes de persistir; liberar espaço sem limpar app permite retomar | PENDENTE |
| F11 | Modo avião com turno reservado, venda, encerramento forçado, reinício completo e reconexão intermitente | Mesmos IDs, valores e responsáveis; resposta perdida não duplica; fechamento pendente impede outra reserva | PENDENTE |
| F12 | Atualizar APK com venda/fechamento/gestão pendentes; retomar cada perfil | Pendências originais preservadas; nenhum envio com identidade do novo perfil; comando online reaplicado uma vez | PENDENTE |
| F13 | Dois aparelhos tentam reservar turno do mesmo operador; transferência exige consentimento | Uma reserva ativa; transferências atômicas; retorno do aparelho antigo não reabre turno | PENDENTE |
| F14 | Estoque, fiado parcial/estorno, CSV e loja filial | Baixa única; fiado/recebimento separados; dinheiro no turno receptor; CSV corresponde à tela; filial isolada | PENDENTE |
| F15 | Restaurar dump atual em PostgreSQL isolado e vazio; recuperar conta na instalação substituta | IDs/quantidades/valores iguais por snapshot; substituto recebe só confirmados; pendências exclusivas da origem permanecem nela | PENDENTE |
| F16 | Suporte, políticas sem sessão, exclusão, resumo opcional e resposta perdida | Pedido mantém protocolo; sem exclusão automática; outro perfil/dono não vê mensagens; resposta manual aparece após atualizar | PENDENTE |
| F17 | Compartilhar exportação confirmada e pendências; cancelar compartilhamento; testar indisponibilidade | Arquivo correto, sem credenciais; exportação confirmada não promete pendências; arquivo permanece legível no destino após o chooser; limpeza local por expiração de 1 h, sem apagar imediatamente | PENDENTE |
| F18 | TalkBack, maior fonte, redução de movimento, teclado e telas pequenas | Abertura/venda/fechamento/suporte possíveis, rótulos e foco corretos; erros anunciados; botões não cortados | PENDENTE |
| F19 | Aplicar retorno a versão de API comprovadamente compatível no ambiente isolado | Migrações e histórico financeiro preservados; sem downgrade destrutivo; repetir F05/F09/F15 | PENDENTE |

## Fechamento do piloto

Não avançar com perda/duplicação financeira, acesso indevido, turno misturado ou confirmação falsa de pagamento. Registrar defeito e interromper a expansão, preservando o aparelho e o banco. Não mudar data/ID/payload para conseguir sincronizar. A revisão segue [o procedimento existente](revisao-pendencias-sync.md).

Registrar por cenário: ID, APK/SHA256, API/versão, aparelho/referência, instante, valores/IDs esperados e observados, evidência sanitizada, PASS/FAIL e pendência. Aceite do usuário é um registro separado; ausência de resposta não é aprovação. Somente após esses registros atualizar os checkboxes físicos de R0–R5.

## Primeiro teste do usuário com um produto real

Roteiro curto solicitado em 03/11/2026. **Execução no celular ainda pendente.** Usar o APK conectado 0.1.7 somente depois de seu manifesto indicar API compatível e das verificações de assinatura/bundle. Esse teste inicial com um celular cobre parte do piloto; não preenche automaticamente F01–F19.

1. Instalar **PDV Homologação** (`br.com.pdv.mobile.homologacao`). Ele fica separado da demo antiga. Se já houver homologação instalada, atualizar sem limpar dados; preservar qualquer fila pendente.
2. Criar uma conta para o teste com seu e-mail real, ou entrar na conta de homologação que já é sua. Quando houver solicitação de código, usar apenas o recebido no seu e-mail. Conta nova começa vazia, sem produtos, vendas ou caixa fictícios. O acesso está liberado sem cadastrar cartão.
3. Em Produtos, cadastrar pela câmera o código de barras da embalagem real. Permitir câmera quando solicitado pelo Android. Conferir o nome sugerido com o rótulo; se não houver sugestão, preencher o nome manualmente. O catálogo não fornece preço: informar seu preço e, se desejar controlar estoque, a quantidade inicial.
4. Abrir o próprio caixa com o troco informado. Na venda, ler a mesma embalagem, conferir produto, quantidade e total antes de concluir.
5. Registrar uma venda de teste com **dinheiro**, **Pix manual** ou **cartão manual**. Pix/cartão exigem conferência externa pelo operador; o app não processa nem confirma pagamento bancário. Se o objetivo for apenas experimentar o sistema, manter essa movimentação na conta de homologação.
6. Abrir o estado de sincronização e aguardar **zero pendências e zero rejeições**. Conferir a venda uma única vez no histórico, o estoque e o saldo do caixa. Pix/cartão não aumentam o dinheiro esperado da gaveta.
7. Fechar e abrir novamente o aplicativo, conferir os mesmos dados e fazer uma venda curta sem rede **com o turno já reservado**. Reconectar, sincronizar e verificar novamente IDs/totais e ausência de duplicação. Abrir um turno novo exige conexão.
8. Fechar o caixa informando o contado e conferir a diferença. Anotar o que funcionou ou falhou: versão do APK, modelo/Android, etapa, comportamento da câmera, sugestão do catálogo, preço/quantidade/total e estado da sincronização. Não compartilhar senha, OTP, token ou dados pessoais de clientes.

Se uma gravação falhar ou uma operação ficar rejeitada, conservar o aplicativo e a fila e registrar o erro. Não limpar dados nem reinstalar para tentar liberar o caixa. Conferir o [procedimento de pendências](revisao-pendencias-sync.md).

## Captura de erros na 0.1.7 e perguntas do primeiro teste

Esclarecimento de 03/11/2026, [CP 035](checkpoints-roadmap.md#cp-20261103-035-captura-de-erros-e-perguntas-do-piloto). O primeiro teste combina **funcionamento no Android físico, integridade dos registros e usabilidade**. Os resultados de CI/HTTP dos CPs 032–034 não substituem essa execução.

**Limite de diagnóstico do APK entregue:** a captura automática de console, erros JavaScript e navegação da demo está excluída do release conectado. `config/isolamentoRelease.js` substitui o registro por funções vazias de `src/release/registro.ts`; `_layout.tsx` condiciona a instalação da captura às ferramentas de teste/desenvolvimento. Não contar com envio automático de travamentos do celular ou gravação da sessão para esta versão. Isso foi conferido nos fontes e nas evidências estáticas do APK, sem teste físico nesta revisão.

A API é iniciada com logger habilitado e registra requisições e uma indicação sanitizada de erro interno, correlacionável por request ID. Esse mecanismo cobre o servidor, não os erros locais de câmera/interface nem uma falha sem rede; disponibilidade/retenção dos logs remotos não foram verificadas nesta revisão. Pendências/rejeições de sincronização são evidência operacional, não um histórico completo de erros.

Em **Suporte e privacidade**, o usuário pode enviar uma descrição e optar por **Incluir resumo técnico sem credenciais**: versão, ambiente, plataforma, contagens de pendências/rejeições e última sincronização. O envio é manual; o resumo não contém stack de travamento nem reproduz os passos realizados. Atendimento e compartilhamento nativos ainda dependem de homologação física.

Responder após executar o roteiro curto, indicando também quando uma parte não foi testada:

1. **Acesso:** instalou/atualizou e conseguiu entrar? Se solicitado, o código chegou ao e-mail? A conta nova estava vazia e o ambiente de homologação estava claro?
2. **Produto e câmera:** leu a embalagem real sem repetir a leitura? O nome sugerido conferia? Se não encontrou, conseguiu digitar/cadastrar? Preço e estoque ficaram como informou?
3. **Venda:** conseguiu abrir o caixa, adicionar o produto e concluir? Quantidade, total, pagamento e troco conferiram? Ficou claro que Pix/cartão são manuais?
4. **Persistência:** depois de fechar e abrir o app, produto, venda, estoque e caixa continuaram corretos, com uma única venda no histórico?
5. **Sem rede:** com o caixa já aberto online, conseguiu vender offline e reabrir o app? Ao reconectar, zeraram as pendências/rejeições e a venda apareceu uma única vez?
6. **Fechamento:** o esperado e o contado conferiram? Se houve diferença, o valor e a explicação fizeram sentido? Anotar os valores esperados e observados.
7. **Facilidade de uso:** em que tela hesitou, precisou de ajuda ou deu mais passos que esperava? Algum texto, botão, teclado ou tamanho de fonte atrapalhou?
8. **Uso na loja:** o que impediria usar esse fluxo no dia a dia e qual mudança seria a mais importante?

Para cada falha: informar modelo/Android, versão 0.1.7, horário aproximado com fuso, tela, passos, resultado esperado, resultado observado e mensagem exata; acrescentar captura ou vídeo curto se possível, sem dados pessoais/códigos de acesso. Informar se estava online/offline e as contagens da sincronização. Não marcar PASS por ausência de relato e não tratar o questionário como aceite humano. Próximo passo: receber os resultados e registrar apenas os cenários efetivamente observados.

## Reteste com diagnóstico na 0.1.8

Preparação após o teste interrompido da 0.1.7, [CP 037](checkpoints-roadmap.md#cp-20261103-037-diagnostico-018-e-correcao-local-do-fluxo). Usuário esclareceu que a piscada deixa **a tela inteira branca e depois retorna, em todas as telas**. A correção construída retira o overlay integral da sincronização periódica; o resultado no Samsung ainda deve ser observado.

O diagnóstico desta versão é local e exclusivo da homologação; não é gravação de tela nem acompanhamento remoto ao vivo. Na barra **Diagnóstico do teste ativo · Abrir**, usar **Copiar histórico do teste** ou **Exportar histórico do teste** logo após observar uma falha. O arquivo guarda os últimos 500 eventos, com horário, rotas sem IDs, ações conhecidas, status/duração HTTP, resultados técnicos do catálogo, sync e posições numéricas de erros JS; não guarda textos digitados, CPF/e-mail/OTP/token, nomes de clientes ou corpos das requisições. Histórico de outro perfil não é exportado. Pode haver perda dos últimos eventos em encerramento abrupto/falha de disco; falhas nativas não têm captura integral garantida. Compartilhamento e Android físico ainda precisam de validação no aparelho.

1. Atualizar o **PDV Homologação**, sem apagar a instalação que contém a evidência anterior. Conferir versão 0.1.8 e indicador de diagnóstico.
2. Com a conta já existente, observar a dashboard parada por pelo menos 45 segundos e navegar entre Produtos e Caixa. Informar se houve tela branca integral; exportar o diagnóstico após a observação.
3. Conferir que a dashboard oferece **Abrir caixa** quando não há turno aberto. Se já houver turno, consultar o caixa existente, sem criar outro para contornar pendência.
4. Ao consultar o produto, a falta de sugestão não prova defeito: o catálogo pode não ter esse código ou estar indisponível. O diagnóstico diferencia status 404, falha de rede, timeout, ausência de sessão e resposta inválida sem registrar a embalagem ou seu nome. Preenchimento manual continua disponível.
5. O cadastro novo abre uma sessão neste aparelho; entrada em conta existente exige OTP, e uma sessão válida preservada pode ser retomada sem novo código. Isso não é verificação do e-mail no cadastro. Registrar qual desses caminhos foi executado.
6. **Novo cadastro após limpeza:** aguardar confirmação da execução/conferência no banco `pdv_homologacao`. Backup foi solicitado e SQL protegido preparado, mas a limpeza ainda não foi executada. Atualizar o APK não limpa CPF no servidor nem descarta dados/filas do aparelho. Revisar evidências/pendências locais antes de definir um reinício da instalação de teste.

Depois de resolver a limpeza/acesso e coletar o reteste visual, repetir o ciclo financeiro do roteiro curto e registrar cada cenário físico com versão/evidência. Não ampliar o piloto enquanto a piscada e os impedimentos de uso não forem esclarecidos.

## Reteste das correções da auditoria na 0.1.9

Candidato 0.1.9/versionCode 10 entregue para reteste supervisionado, com diagnóstico local e R8. APK `builds/pdv-homologacao-0.1.9.apk`, SHA256 `5fe5118f97dee38c4f92710f9ab433d8f4e7d61cc0cd89d50945ff28ee8448f0`; API compatível no commit df41823. Instalar o arquivo exato após conferir o hash. [Matriz dos 18 achados](correcoes-auditoria-0.1.9.md). Os resultados físicos continuam PENDENTES; este roteiro complementa F01–F19 e preserva os relatos anteriores.

1. Atualizar o PDV Homologação sem desinstalar/limpar dados. Conferir versão 0.1.9 e o indicador de diagnóstico. Uma sessão válida preservada pode abrir diretamente; para conta existente use Entrar quando for solicitado. Novo cadastro agora exige o código enviado ao e-mail antes de criar empresa/sessão. A base do servidor não foi limpa: CPF/e-mail já cadastrado deve apresentar orientação de login, não iniciar uma conta duplicada.
2. Na dashboard, aguardar pelo menos 45 s, navegar entre Produtos/Caixa/Ajustes e voltar. Registrar qualquer tela branca ou interrupção; copiar o histórico logo depois. Conferir Abrir caixa quando fechado.
3. Ler embalagem real, permitir câmera, alternar lanterna, abrir digitação manual, buscar produto, navegar para pagamento e ir ao fundo/voltar. Conferir indicador de câmera ao pausar. R8 está ativo: validar especialmente se o código é de fato lido, não apenas se a imagem da câmera aparece. Ausência de sugestão no catálogo é uma etapa diferente da leitura do código. Apontar um código por vez e conferir o produto; a moldura não promete recorte geométrico.
4. Com a câmera negada, usar Digitar código; abrir teclado, aumentar fonte a 200% e testar os últimos campos/botões em cadastro, Pix, fechar caixa, movimento, fiado e suporte. Campo focado e CTA precisam permanecer alcançáveis por rolagem. Repetir com TalkBack quando possível.
5. Como operador/gerente e dono, salvar chave Pix válida e gerar QR; testar troca de perfil/loja sem herdar chave de outra loja. No cadastro rápido de produto existente, mudar preço; entrada de estoque segue pela gestão com motivo, sem oferecer edição de saldo absoluto.
6. Na venda, adicionar unidade e kg pela busca. Conferir inclusão antes de fechar a busca e o peso; em falha de gravação, a tela deve permanecer para correção. Fazer venda fictícia de valor conhecido, sincronizar até zero pendências/rejeições, reiniciar e conferir IDs/totais/estoque/caixa sem duplicação. Pix/cartão são registros manuais de pagamento verificado externamente.
7. Exportar diagnóstico JSON e CSV para um destino autorizado e abrir efetivamente o arquivo no aplicativo receptor, inclusive após voltar ao PDV. Cancelar o chooser não comprova envio. O arquivo temporário fica no cache por até a próxima limpeza após 1 h; não deve desaparecer no retorno imediato do chooser. Comparar arquivo/versão, sem compartilhar códigos de acesso ou dados reais de clientes.
8. Registrar aparelho/Android, versão, passo, esperado/observado e horário; copiar o diagnóstico após a falha. Não alterar IDs, horário de payload ou apagar filas para obter aprovação. Se houver perda/duplicação financeira, acesso indevido ou turno misturado, interromper a expansão e preservar a evidência.

Só depois desse reteste e dos demais cenários pendentes registrar aceite físico. A recuperação de dados já sincronizados e a restauração do backup atual continuam exigindo evidência própria; o backup do Android não recupera operações exclusivas do aparelho. Cópia externa/alertas do servidor continuam no backlog previamente autorizado.

<a id="reteste-ajuste-acesso-pos-019"></a>

## Reteste do ajuste de acesso posterior à 0.1.9

Correção local do [CP 050](checkpoints-roadmap.md#cp-20261103-050-correcao-local-do-acesso-validada). **Ainda não está no APK 0.1.9 entregue nem na API de homologação.** Executar somente depois de disponibilizar API com `verificacaoAntecipada: true` e novo APK rastreável, sem desinstalar ou limpar dados. Não marcar estes passos aprovados pela regressão automatizada.

1. Na primeira tela de cadastro, informar e-mail já cadastrado: recusa junto ao campo antes de abrir a etapa da loja; Já tenho conta abre o login, sem autenticar automaticamente.
2. Com e-mail próprio ainda livre e CPF/CNPJ de teste já cadastrado, solicitar e confirmar OTP: a recusa do documento aparece na primeira tela, sem pedir nome da loja ou criar conta/sessão. A consulta de documento exige prova válida de e-mail. Não enviar códigos no relato.
3. Com dados de teste novos, confirmar OTP na primeira tela; só então preencher a loja e criar. Não pedir outro OTP na loja. Voltar sem mudar dados reaproveita a confirmação dentro da validade original; mudar e-mail/documento exige confirmação. Ao expirar, voltar aos dados para nova prova.
4. Entrar em conta existente, reautenticar o mesmo perfil e trocar entre perfis autorizados: durante carregamento não aceitar reenvio de código; após sucesso navegar para o app automaticamente, inclusive após a tela ser recriada. Não precisar voltar manualmente até boas-vindas. Registrar versão e horário.
5. Código inválido/expirado deve manter a entrada sem sessão nova. Em recuperação, falha local deve permitir repetir o mesmo alvo; sucesso deve concluir a navegação. Demais testes de isolamento, SecureStore e recuperação física permanecem necessários.
6. Exportar o histórico manual depois de falha: o novo diagnóstico distingue rotas de cadastro, Já tenho conta e motivos técnicos fixos de recusa. Não inclui CPF, e-mail, OTP, corpos HTTP ou texto livre do servidor; não atribuir retrospectivamente motivos aos eventos `outro` da 0.1.9.
