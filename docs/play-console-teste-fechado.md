# Play Console: Etapa 0 — Teste Fechado (12 testadores / 14 dias) e Lacunas do MVP

Referência: [CP 167](checkpoints-roadmap.md#cp-167-etapa-0-ativos-da-play-store-roteiro-de-teste-fechado-e-auditoria-de-lacunas-19112026) · [Roteiro anterior de teste interno](play-console-teste-interno.md).

> **Regra de segurança:** nenhum segredo, senha do keystore, código de acesso ou e-mail dos testadores entra neste repositório.

## 1. Gerar o AAB `0.1.23` (`versionCode 24`) no seu terminal

O código da `0.1.23` (com `com.android.billingclient:billing:8.3.0`) passou nas validações locais, no CI da API e nos smoke tests externos. Execute no seu terminal PowerShell na raiz do repositório (onde você digita a senha do keystore diretamente, sem gravar em lugar nenhum):

```powershell
pwsh scripts/build-android.ps1 -Perfil producao -Aab -Keystore <caminho-fora-do-repo>\pdv-upload.jks -Alias <seu-alias>
```

Ao final, confira os arquivos gerados em `builds/`:
- `builds/pdv-producao-0.1.23-aab.aab` (arquivo único para enviar ao Play Console)
- `builds/pdv-producao-0.1.23-aab.aab.sha256`
- `builds/pdv-producao-0.1.23-aab-manifesto.json` (confira `certificadoSha256`, `pacote: br.com.pdv.mobile`, `versionCode: 24`, `targetSdk: 36`)

---

## 2. Ativos visuais prontos da Direção B · Solar Balcão

Gerados em `builds/play-store/` por `scripts/gerar-assets-solar-balcao.mjs --apenas-play-store` (prints simulados gerados por `scripts/gerar-prints-play-store.mjs`):
- **Ícone da Play Store (`512×512` RGB, sem transparência):** `builds/play-store/icon-play-512.png`
- **Imagem de destaque / Feature Graphic (`1024×500` RGB):** `builds/play-store/feature-graphic-1024x500.png`
- **8 capturas de tela de telefone (`1080×1920` RGB, proporção 9:16 = `1,778:1`, sem transparência):**
  - `builds/play-store/captura-01-inicio.png` — Painel inicial com resumo de vendas do dia, turno em operação e atalhos
  - `builds/play-store/captura-02-vender.png` — Visor de código de barras e sacola de venda (`R$ 41,68`)
  - `builds/play-store/captura-03-cobrar.png` — Tela de cobrança com itens e meios de pagamento
  - `builds/play-store/captura-04-pix.png` — QR Code Pix demonstrativo integrado (Mercado Pago)
  - `builds/play-store/captura-05-dinheiro-troco.png` — Recebimento em dinheiro com cálculo de troco e teclado numérico
  - `builds/play-store/captura-06-caixa.png` — Resumo do caixa e conferência detalhada da gaveta
  - `builds/play-store/captura-07-produtos.png` — Catálogo de produtos com estoque e alertas
  - `builds/play-store/captura-08-sincronizacao.png` — Estado de sincronização confirmada com o servidor

---

## 3. Passo a passo no Google Play Console

### A. Criar o app e registrar o pacote
1. **Play Console > Todos os apps > Criar app:**
   - **Nome do app:** `Prisma PDV`
   - **Idioma padrão:** `Português (Brasil)`
   - **App ou jogo:** `App`
   - **Gratuito ou pago:** `Gratuito` (a assinatura futura no app usa Play Billing)
   - Marque as declarações e clique em **Criar app**.
2. **Verificação de desenvolvedor Android (registro do pacote):**
   - No menu de verificação / identidade do desenvolvedor Android, registre o nome de pacote **`br.com.pdv.mobile`**.
   - Ao enviar o primeiro `.aab`, o Google Play ativa automaticamente o **Play App Signing** e registra a impressão do certificado de upload (`certificadoSha256` do manifesto).

### B. Conteúdo do app (*Política e programas > Conteúdo do app*)
Preencha antes de publicar o teste fechado:
- **Política de privacidade:** `https://aladdin-pdv-api.jicnzg.easypanel.host/privacidade`
- **Exclusão de conta:**
  - URL da Web: `https://aladdin-pdv-api.jicnzg.easypanel.host/exclusao-de-conta`
  - Caminho no app: `Ajustes > Suporte e privacidade > Exclusão`
- **Detalhes do login (Acesso ao app):** *Sim* (algumas partes são restritas)
  - Preencher **Nome**: `Full Pro Review Account`, **Nome de usuário** com o e-mail configurado em `PDV_PLAY_REVIEW_EMAIL`, **Senha** com o PIN fixo de 6 dígitos configurado em `PDV_PLAY_REVIEW_CODE`, e instruções **em inglês** explicando:
    `"Tap 'Já tenho conta', enter the reviewer email above, tap 'Enviar código', then enter the reusable 6-digit PIN above in the 'Código' field (do not wait for an email) and tap 'Entrar' to access 'Loja Demo Prisma PDV' with full Pro features."`
  - Marcar a declaração de acesso completo a todos os recursos e conteúdos (inclusive pagos/Pro). *(Nunca registrar e-mail nem PIN reais neste repositório.)*
- **Anúncios:** *Não, meu app não contém anúncios.*
- **Classificação de conteúdo:** questionário na categoria *Utilitário, produtividade, comunicação ou outro*; responder **Não** para violência, conteúdo sexual, linguagem imprópria, drogas, jogos de azar e interação livre entre usuários; marcar **Sim** em compra de artigos digitais (assinatura Pro pela Play Billing) e **Não** para itens aleatórios pagos.
- **Público-alvo:** `18 anos ou mais`.
- **Recursos financeiros:** marcar que o app **não** oferece serviços financeiros, crédito, carteira, empréstimos ou intermediação bancária (apenas registro comercial de PDV; pagamentos integrados posteriores usam credenciais próprias do lojista diretamente para a conta dele).
- **Apps governamentais / Notícias / Saúde:** *Não*.
- **Segurança dos dados:**
  - Coleta dados? **Sim.** Compartilha com terceiros? **Não** (o envio de códigos por e-mail ocorre por operador contratado apenas para entrega técnica).
  - Criptografia em trânsito: **Sim (HTTPS)**.
  - Exclusão pelo usuário: **Sim** (URL `/exclusao-de-conta` e caminho no app).
  - Tipos marcados (obrigatórios/funcionais, exceto suporte opcional):
    - **Informações pessoais:** Nome, Endereço de e-mail, Outras informações (CPF/CNPJ da loja para identificação única) — Funcionalidade do app e gerenciamento da conta.
    - **Informações financeiras:** Outras informações financeiras (registros de vendas, itens, recebimentos e turnos de caixa da loja) — Funcionalidade do app.
    - **Mensagens:** Outras mensagens no app (solicitações enviadas ao suporte, opcionais) — Funcionalidade do app / Suporte.
    - **Informações e desempenho do app:** Diagnósticos opcionais enviados pelo usuário no suporte — Funcionalidade do app.
    - **IDs do dispositivo ou outros:** Identificador de aparelho gerado pelo app — Funcionalidade do app e segurança de sessão.
    - **Câmera / Fotos / Localização / Contatos:** Não coletados nem enviados (a câmera lê códigos de barras localmente no aparelho).

### C. Ficha mínima da loja (*Crescer > Presença na loja > Ficha principal da loja*)
- **Nome do app:** `Prisma PDV`
- **Descrição curta (até 80 caracteres):**
  `PDV no celular: venda rápido offline, controle caixa por operador e estoque.`
- **Descrição completa (sugestão enxuta para a ficha mínima):**
  `Prisma PDV é o frente de caixa feito para o balcão do pequeno comércio. Registre vendas pela câmera do celular, controle dinheiro, troco, Pix e cartão, separe turnos de caixa por operador e acompanhe o estoque mesmo sem internet. Quando voltar a conexão, tudo sincroniza com segurança para a sua loja.`
- **Ícone do app:** enviar `builds/play-store/icon-play-512.png`
- **Imagem de destaque:** enviar `builds/play-store/feature-graphic-1024x500.png`
- **Capturas de tela de telefone:** enviar as 8 imagens `builds/play-store/captura-01-inicio.png` até `builds/play-store/captura-08-sincronizacao.png` (`1080×1920` RGB)
- **Categoria:** `Empresa`
- **E-mail de contato:** `contato@prumo.services`

### D. Enviar AAB e montar a faixa de Teste Fechado (*Testar e lançar > Testes > Teste fechado*)
1. Em **Teste fechado**, crie/edite a faixa (**Países/regiões:** selecionar **Brasil**).
2. Clique em **Criar nova versão**, envie `builds/pdv-producao-0.1.23-aab.aab`:
   - **Nome da versão:** `0.1.23 (24)`
   - **Notas da versão:** `Versão inicial de teste fechado do Prisma PDV: cadastro, vendas offline, leitor por câmera, caixa por operador e estoque.`
3. Na aba **Testadores**, crie uma lista de e-mails (ex.: `Teste fechado MVP`), digite manualmente os **e-mails Google (mínimo 12 pessoas)** direto no Console (fora do repositório), salve e marque a lista.
4. Envie as alterações da faixa para revisão/publicação e, assim que o link aparecer na aba **Testadores**, copie o **link de participação (opt-in)** na Web ou Google Play.

---

## 4. Mensagem curta de convite para os testadores

> Oi! Estou testando meu aplicativo de vendas e caixa no celular, o **Prisma PDV**, e preciso da sua ajuda por **14 dias** para liberar a versão na Google Play.
>
> 1. Abra este link usando o mesmo e-mail Gmail da sua Play Store: **[COLAR LINK DE OPT-IN AQUI]**
> 2. Toque em **Aceitar convite / Tornar-se testador** e depois em **Fazer download no Google Play**.
> 3. Abra o app e crie uma conta de teste rápida (o código chega no seu e-mail) ou dê uma olhada nas telas. Não precisa pagar nada.
>
> Importante: mantenha o app instalado durante os 14 dias e, se puder, me conte o que achou fácil ou confuso. Muito obrigado!

---

## 5. Auditoria de lacunas para um lojista novo (etapa 0)

Inspeção direta do código atual (`0.1.19`) frente ao que o produto promete para o MVP na Play aberta:

| Área | Lacunas encontradas no código atual (`0.1.19`) | Onda/Etapa que resolve |
|---|---|---|
| **Cadastro e acesso** | Salto visual `2 de 6 → 5 de 6` em `loja.tsx:59` → `pagamentos.tsx:15` no modo liberado; em `criar-conta.tsx:106`, `"Solicitar outro código"` chama `voltarAosDados()` (apaga o desafio em vez de reenviar OTP), o botão voltar do cabeçalho sai da tela e `"Já tenho conta"` continua visível na etapa do OTP; `entrar.tsx:172,182` usa `'● '/'○ '` e papéis em minúscula; `pagamentos.tsx` só descreve meios manuais sem ligação para conectar maquininhas. | Etapas 2B-1 e 2C-1 |
| **Primeira venda** | `TelaPix.tsx` exibe apenas `<PixEstatico />` e `provedoresPagamento.ts:122-128` lança erro `"Pagamento integrado indisponível nesta fase"` (sem conexão com `/pagamentos/*` Mercado Pago nem InfinitePay); `TelaCartao.tsx` não identifica provedor/maquininha nem motivo documental; `TelaDinheiro.tsx` não é rolável e o `TecladoNumerico` (`minHeight: 64`) sobrepõe valores/chips em `360dp` ou fonte 2x; `AvisoDePausa` em `TelaVender.tsx:285` invade a busca em telas baixas; `TelaSucesso.tsx` não compartilha comprovante; `BarraInferior.tsx:147` corta `"Ajustes"` em `360dp + font_scale 2.0`. | Etapas 2A-2, 2B-1 e 2C-1 |
| **Caixa** | `ResumoCaixa.tsx:123-146` esconde `Entrada / Sangria / Retirada` abaixo de `Fechar caixa` e corta os rótulos lado a lado em `font_scale 2.0`; `MovimentoDeCaixa.tsx:50,119-124` mostra códigos técnicos (`cofre_deposito`, `reforco_troco`) e joga categoria/origem/motivo abaixo do teclado; `FecharCaixa.tsx:94` usa `<Campo keyboardType="decimal-pad">` sem máscara de centavos para o troco restante; `TurnosCaixa.tsx` expõe UUIDs crus e exige colar UUIDs em transferências e correções. | Etapa 2B-1 |
| **Estoque** | `Estoque.tsx` não tem busca nem filtros de divergência (`Negativos` / `Estoque baixo`), usa botões `<Botao rotulo="Selecionado: ...">`, exibe UUIDs e exige digitar `itemVendaId` na devolução; mensagens de plano citam `"Negócio"` em vez do modelo Free + Pago. | Etapa 2B-2 |
| **Fiado** | `Fiado.tsx` empilha 5 fluxos seguidos numa tela só com botões `"Selecionado: ..."`, campo de data sem máscara e histórico cru; fiado direto no checkout (P3) permanece no backlog por decisão do usuário. | Etapa 2B-2 (redesign da tela de gestão); P3 mantido no backlog |
| **Equipe** | `equipe.tsx` e `usuarios.tsx` herdam `gap: 0` de `TelaBase.tsx:49` (`ScrollView` sem `gap` padrão), exibem papéis sem capitalização e ações soltas sem `Cartao` ou `StatusPill`. | Etapas 2A-2 e 2B-2 |
| **Lojas** | `Lojas.tsx` lista filiais em `<Texto>` puro com papel em minúsculas, sem `Cartao` nem `StatusPill`. | Etapa 2B-2 |
| **Relatórios** | `Relatorios.tsx` empilha 4 listas paginadas de filtros com botões `"Selecionado: ..."` antes do resultado e mostra totais em linhas `<Texto>` planas sem separar visualmente Vendas Líquidas, Recebimentos Líquidos e Movimentação de Gaveta. | Etapa 2B-2 |
| **Suporte** | `Suporte.tsx` força o usuário a rolar todo o texto legal antes do formulário, usa input de 1 linha para mensagem de até 2000 caracteres, desabilita o envio abaixo de 10 caracteres sem explicar o mínimo e mostra protocolo UUID cru. | Etapa 2B-2 |
| **Assinatura e Paywall** | API e `packages/shared` ainda usam `MockBillingProvider` de cartão e `PLANOS_DISPONIVEIS = ['pro']`, sem integração com Google Play Billing (`Free + Pago`), sem confirmação em 3 dias/RTDN e sem modo gratuito padrão configurável explícito para o novo catálogo Free + Pago. | Etapas 1B e 2C-2 |
