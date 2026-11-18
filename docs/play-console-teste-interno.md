# Play Console: piloto pelo teste interno

Roteiro do M4 ([CP 156](checkpoints-roadmap.md#cp-156-m4-producao-reconciliada-e-implantada-e-aab-com-chave-de-upload-17112026)). Regras conferidas na documentação oficial da Google Play em 17/11/2026. Quem executa é o dono da conta de desenvolvedor. Nenhuma chave, senha ou e-mail de testador entra neste repositório.

## Antes de começar

- Arquivo a enviar: `builds/pdv-producao-<versão>-aab.aab`. O sha256 está no `.aab.sha256` ao lado. Envie **só o `.aab`**. O `-universal.apk` é assinado com a chave de debug e serve apenas para instalar em aparelho de teste.
- Pacote: `br.com.pdv.mobile`. Ele não muda depois do primeiro envio.
- Chave de upload: `pdv-upload.jks`, na sua pasta pessoal, com cópia e senha no seu gerenciador de senhas.
- URLs públicas, que já respondem em produção:
  - Política de privacidade: `https://aladdin-pdv-api.jicnzg.easypanel.host/privacidade`
  - Exclusão de conta: `https://aladdin-pdv-api.jicnzg.easypanel.host/exclusao-de-conta`
  - Termos: `https://aladdin-pdv-api.jicnzg.easypanel.host/termos`
- Nome do app: as políticas citam **"Prisma PDV"**. Use esse nome na ficha, porque a Play exige que a página de exclusão cite o nome do app ou do desenvolvedor como aparece na ficha. O nome sob o ícone no aparelho continua "PDV" até uma próxima versão.

## Passo a passo

1. **Criar o app:** Play Console > *Criar app*.
   - Nome: Prisma PDV.
   - Idioma padrão: português (Brasil).
   - Tipo: App.
   - Gratuito ou pago: Gratuito. Isso só define o preço do download. A assinatura futura pelo Play Billing não depende disso.
   - Aceite as declarações e crie.
2. **Play App Signing:** não há nada a fazer. App novo entra automaticamente quando você envia o primeiro AAB, e o Google gera e guarda a chave de assinatura do app. Depois do envio, anote a impressão SHA-256 do **certificado de upload** em *Testar e lançar > Configuração > Integridade do app*. Ela deve ser igual ao `certificadoSha256` do arquivo `builds/pdv-producao-<versão>-aab-manifesto.json`.
3. **Teste interno, envio do AAB:** *Testar e lançar > Testes > Teste interno > Criar nova versão*.
   - Envie o `.aab`.
   - Nome da versão: `0.1.17 (18)`, ou a versão do manifesto.
   - Notas da versão: "Piloto: vendas, caixa e estoque com pagamentos manuais."
   - *Avançar > Salvar > Publicar no teste interno*.
4. **Lista de testadores:** na mesma tela, aba *Testadores > Criar lista de e-mails*.
   - Nome da lista: "Piloto lojistas".
   - Adicione os e-mails da conta Google que cada lojista usa na Play Store do celular, até 100.
   - Salve e marque a lista.
   - Copie o **link de participação** (opt-in). No primeiro envio, ele pode levar algumas horas para funcionar.
5. **Conteúdo do app** (*Política > Conteúdo do app*). A documentação não deixa claro quais itens são obrigatórios já no teste interno. Preencha todos agora para não travar depois.
   - **Política de privacidade:** a URL de `/privacidade`.
   - **Acesso ao app:** "Todas ou algumas funcionalidades são restritas". Instrução: "Crie uma conta com qualquer e-mail; o código de acesso chega por e-mail." Não informe senha nem código.
   - **Anúncios:** não contém anúncios.
   - **Classificação de conteúdo:** questionário com categoria *Utilitário, produtividade, comunicação ou outro*. Responda "não" a violência, conteúdo sexual, jogos de azar e interação entre usuários.
   - **Público-alvo:** 18 anos ou mais.
   - **Recursos financeiros:** o app não oferece serviço financeiro. Ele registra vendas com pagamento manual e não processa Pix nem cartão.
   - **App governamental, saúde, notícias:** não.
   - **Exclusão de conta:** a URL de `/exclusao-de-conta`. Caminho no app: *Ajustes > Suporte e privacidade > Exclusão*.
   - **Segurança dos dados** (tabela abaixo).
6. **Ficha mínima** (*Crescer > Presença na loja > Ficha principal*):
   - nome Prisma PDV;
   - descrição curta e completa;
   - ícone 512×512 (`apps/mobile/assets/icon.png`, redimensionado);
   - imagem de destaque 1024×500;
   - 2 capturas de tela do celular;
   - e-mail de contato `contato@prumo.services`;
   - categoria *Empresa*.

   O teste interno pode funcionar antes da ficha completa, mas a ficha é exigida para o teste fechado e para a produção.
7. **Enviar o link aos lojistas.** Cada um deve:
   1. abrir o link no celular, logado com o e-mail que você cadastrou;
   2. tocar em *Aceitar convite / Tornar-se testador*;
   3. tocar em *Fazer download no Google Play* e instalar;
   4. abrir o app e criar a conta com o próprio e-mail. O código chega por e-mail.

## Segurança dos dados

Baseado nas políticas do app (`packages/shared/src/suporte.ts`) e nas permissões do manifesto (internet, estado da rede, câmera, vibração). Revise antes de enviar.

| Pergunta | Resposta |
|---|---|
| Coleta ou compartilha dados? | Sim, coleta. Não compartilha com terceiros: o envio de e-mail é feito por prestador de serviço em nome do app. |
| Criptografia em trânsito | Sim (HTTPS). |
| Usuário pode pedir exclusão | Sim (URL acima e caminho no app). |
| Informações pessoais | Nome, endereço de e-mail e outras informações (documento da empresa). Coletados, obrigatórios. Finalidade: funcionalidade do app e gerenciamento da conta. |
| Informações financeiras | Outras informações financeiras (registros de vendas e caixa da loja). Coletados, obrigatórios. Finalidade: funcionalidade do app. |
| Mensagens | Outras mensagens no app (solicitações de suporte). Coletadas, opcionais. Finalidade: suporte (funcionalidade do app). |
| Informações e desempenho do app | Outras informações de desempenho (resumo técnico opcional do suporte: versão, contagens, data de sincronização). Opcionais. |
| IDs do dispositivo ou outros | Identificação do aparelho. Coletada, obrigatória. Finalidade: funcionalidade do app e segurança. |
| Fotos, vídeos, localização, contatos | Não coletados. A câmera só lê o código de barras e nenhuma imagem é guardada ou enviada. |

## Depois do primeiro envio

- Confirmar com um lojista a instalação pela Play e um cadastro real. Registrar no checkpoint seguinte.
- Atualizações: aumente o `versionCode` em `apps/mobile/app.json`, gere o AAB de novo com o mesmo comando e crie uma nova versão no teste interno. Ela fica disponível em minutos.
- Chave de upload perdida: em *Integridade do app*, use a opção para pedir a troca da chave de upload.
- Produção aberta (sessão P2): conta pessoal criada após 13/11/2023 exige 12 testadores em teste fechado por 14 dias seguidos antes de pedir acesso à produção.
