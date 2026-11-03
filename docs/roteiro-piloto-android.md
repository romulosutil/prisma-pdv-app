# Roteiro físico do piloto R5

Estado inicial: **todos os cenários abaixo pendentes**. Executar com pessoas autorizadas, dados descartáveis em homologação e pelo menos dois celulares físicos; uma instalação substituta pode usar um terceiro aparelho ou perfil Android separado. Simulação em Node/SQLite, export Hermes, emulador e teste HTTP têm resultados próprios e não preenchem esta matriz.

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
| F17 | Compartilhar exportação confirmada e pendências; cancelar compartilhamento; testar indisponibilidade | Arquivo correto, sem credenciais; exportação confirmada não promete pendências; cache temporário removido após retorno | PENDENTE |
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
