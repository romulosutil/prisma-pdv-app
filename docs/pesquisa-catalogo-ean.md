# Pesquisa: fontes de catálogo por EAN para o MVP — v0.1

Data: 17/11/2026 (America/Sao_Paulo) · Tipo: pesquisa, sem alteração de código · Status: **levantamento em fonte oficial + amostra pequena de cobertura; nada contratado, nada aprovado pelo usuário**

Contexto: o usuário definiu como obrigatório no MVP a "API lendo os produtos completamente" (alta cobertura de EANs brasileiros) com fontes pagas/freemium incorporadas ao plano pago. Hoje o reconhecimento usa catálogo próprio + Open Food Facts ([produto-catalogo-ean.md](produto-catalogo-ean.md)). Preço de venda vigente: **R$ 49,90/mês** (assinatura única de 30/10/2026, [assinatura-unica-e-cupons.md](assinatura-unica-e-cupons.md)); com o cupom VITALICIO50, R$ 24,95. Os planos antigos (Essencial R$ 19,90, Negócio R$ 34,90) estão só como histórico em [produto-planos-e-cobranca.md](produto-planos-e-cobranca.md).

Convenção: **NÃO VERIFICADO** = não encontrado em fonte oficial ou não testado. Nenhum número abaixo foi estimado sem dizer que é premissa.

## 0. Resumo

1. **Duas das cinco fontes indicadas não estão no README da public-apis** (ver seção 1): "API de Produtos (Seu Negócio na Nuvem)" e "API GTIN (Open Source Community Brasil)". A primeira existe como serviço no ar (achei por sondagem de domínio, não pelo README); a segunda **não foi encontrada em lugar nenhum**.
2. **Cobertura medida (20 EANs, amostra pequena):** DotCompany reconheceu 19/20 com nome correto; Open Food Facts 8/20 (100% dos alimentos e bebidas, 0% de limpeza, higiene e bazar); a API de Produtos do Seu Negócio na Nuvem tem registro de 19/20, mas **só 2/20 com nome** (é base fiscal, não de nomes). SI5 Global e Cosmos **não foram medidos** (exigem credencial).
3. **Custo:** DotCompany cobra R$ 0,04 por consulta com resultado, sem mensalidade. Com 150 consultas externas por loja por mês, são R$ 6,00 (12% de R$ 49,90; 24% de R$ 24,95). Com 600, são R$ 24,00 e o plano com cupom fica negativo. O catálogo próprio compartilhado entre lojas é o que segura o custo, **mas os termos da DotCompany parecem proibir exatamente isso** (seção 2.5).
4. **Recomendação:** ordem próprio → Open Food Facts → DotCompany (pago) → SI5 Global (gratuito, 30/dia) como segunda opinião. Contratar agora só a DotCompany pré-paga (mínimo R$ 169) **depois de resposta escrita sobre cache compartilhado**; criar token gratuito da SI5 e medir 100 EANs. Não contratar Cosmos nem a licença do banco completo agora.

## 1. Verificação da lista da public-apis

Fonte: `https://raw.githubusercontent.com/public-apis/public-apis/master/README.md` (último commit do README em 15/11/2026, `d6dab92`). Também baixei o README em 01/01/2022, 01/01/2024, 01/01/2025 e 01/01/2026 (commits `8f5e8be`, `82218c7`, `fde9b2b`, `675a4e6`).

| Indicada | No README? | Resultado |
|---|---|---|
| (a) Open Food Facts | **Sim**, seção Food & Drink: `[Open Food Facts](https://world.openfoodfacts.org/data) \| Food Products Database \| No \| Yes \| Unknown` (sem chave, HTTPS, CORS desconhecido). Presente nos cinco snapshots. | Confirmada. |
| (b) API de Produtos (Seu Negócio na Nuvem) | **Não.** Busca por "Seu Neg", "Nuvem", "Produtos", "GTIN", "negócio" no README atual e nos quatro snapshots: nenhuma ocorrência. Nenhum PR/commit do repositório menciona o nome (busca no GitHub). | **Não está na lista.** Existe um serviço com esse nome em `https://api-produtos.seunegocionanuvem.com.br/` (inferência por sondagem de domínio; não é entrada do README). |
| (c) API GTIN (Open Source Community Brasil) | **Não.** Mesmas buscas, sem ocorrência. Buscas na web e no GitHub por "API GTIN" + "Open Source Community Brasil": nada. | **NÃO ENCONTRADA.** Pedir ao usuário o link de origem. |
| (d) SI5 Global | **Não** no README oficial. Consta no fork/lista paralela `marcelscruz/public-apis` (`SI5 Global \| ... \| apiKey \| Yes`). | Existe e está no ar (`https://global.si5.com.br`). |
| (e) DotCompany API | **Não** em nenhuma das listas consultadas. | Existe e está no ar (`https://dotcompany.com.br/api`). |

O README oficial tem outras entradas de código de barras (ProductGuru, Barcode Lookup, CartScout, UPC database, Noms), todas sem foco no Brasil e fora do escopo pedido. Não avaliei.

## 2. Levantamento por fonte (documentação oficial)

### 2.1 Open Food Facts (a)

| Item | Achado |
|---|---|
| No ar? | Sim. Durante o teste, os endpoints de **busca/listagem devolveram 503** (3 tentativas em ~10 min); a consulta por produto funcionou nas 20 chamadas. |
| Endpoint | `GET https://world.openfoodfacts.org/api/v2/product/{ean}.json` (docs: v3.6 é a atual, v2 está **deprecada** mas suportada). JSON. |
| Autenticação | Leitura sem chave. Exige `User-Agent` identificado no formato `AppName/Versão (e-mail de contato)`. Pede preencher um formulário de uso. |
| Limites | 15 req/min/IP para leitura de produto; 10 req/min/IP para busca; 503 por limites globais; ban de IP se abusar. Para "mais que algumas centenas" de produtos pedem baixar o dump (CSV/JSONL/Parquet) em vez de chamar a API. |
| Preço | Gratuito. |
| Cobertura declarada | Base colaborativa, sem garantia de exatidão ou completude. Contagem de produtos do Brasil: NÃO VERIFICADO (listagem deu 503). Só alimentos (bases irmãs: Open Beauty Facts e Open Products Facts, ver 3). |
| Campos | Nome, marca, quantidade, ingredientes, nutrição, fotos etc. Sem NCM. |
| Licença | Banco sob **ODbL**, conteúdo sob DbCL, imagens sob **CC BY-SA**. Uso comercial permitido. **Atribuição obrigatória** (texto sugerido: "Contains data from Open Food Facts, available under the Open Database License", com link). **Share-Alike:** quem usa publicamente uma versão adaptada do banco deve oferecê-la sob ODbL. Imagens podem ter direitos de terceiros (embalagem, marca). |
| Pode guardar em `catalogo_ean`? | Sim, a licença permite copiar e adaptar, **desde que** cumpra atribuição e o Share-Alike. O Share-Alike sobre um `catalogo_ean` que mistura fontes é ponto jurídico em aberto (NÃO VERIFICADO se o catálogo conta como "banco adaptado" usado publicamente). Mitigação: marcar `fonte='off'`, exibir atribuição, não copiar imagens, revisão jurídica. |
| SLA / LGPD | Sem SLA ("as is"). Só o EAN trafega; o app não envia dado do lojista. Editora francesa; lei aplicável francesa. |

### 2.2 API de Produtos, Seu Negócio na Nuvem (b)

| Item | Achado |
|---|---|
| No ar? | Sim (`api-produtos.seunegocionanuvem.com.br`). O domínio-pai é um site de ferramentas fiscais gratuitas (validadores, DANFE, CNPJ). |
| Endpoints | Documentados em `/exemplos-uso.php`: `GET /api/{ean}` (imagem em base64) e `GET /api/tributacao/{ean}` (NCM, CEST, alíquotas). A busca com nome é interna do site (`/?codigo_barras=` e `/?busca=1&termo=`), **sem documentação**. |
| Autenticação | Nenhuma. |
| Limites / preço | Nenhum documentado. FAQ: "totalmente gratuito para uso pessoal e comercial". |
| Cobertura | Sem número declarado. Medida: ver seção 3 (registro quase sempre, nome quase nunca). |
| Campos | NCM, CEST, alíquotas, `possui_imagem` + imagem WEBP em base64. Nome (`descricao`) vem **vazio na maioria**. Sem marca nem conteúdo. |
| Termos / licença / LGPD / SLA | **Nenhum documento encontrado** (sem termos, sem política, sem SLA). Contato só por WhatsApp. NÃO VERIFICADO se pode guardar e redistribuir; a frase do FAQ não substitui autorização escrita. Origem dos dados e das imagens: NÃO VERIFICADO. |

### 2.3 API GTIN, Open Source Community Brasil (c)

**NÃO ENCONTRADA.** Sem entrada no README, sem repositório ou site achado por busca. Nada a avaliar até o usuário indicar o link.

### 2.4 SI5 Global (d)

Fontes: `global.si5.com.br/documentacao`, `/precos/api`, `/privacidade`, `/licenca/catalogo/1.0` (versão 1.0 de 11/10/2026).

| Item | Achado |
|---|---|
| No ar? | Sim. |
| Endpoint | `GET https://global.si5.com.br/api/produtos/{ean}` (também busca por prefixo de código ou nome). JSON UTF-8. |
| Autenticação | **Bearer token obrigatório**; conta criada só por login Google; plano grátis sem cartão. Por isso não medi a cobertura (seção 3). |
| Planos (pré-pago, Pix/boleto/cartão, sem fidelidade) | Grátis: R$ 0, 30 consultas/dia, 1 token. **Básico: 100/dia, R$ 39,90/mês com o cupom SI5GLOBAL (lista R$ 59,90; cupom vale para assinaturas até 31/03/2027).** Start: 200/dia, R$ 199,99. Pro: 500/dia, R$ 399,99. Scale: 1.000/dia, R$ 799,99. Enterprise sob consulta. Anual = 10 meses. |
| Franquia | **Diária e por conta**, compartilhada entre tokens, renova à meia-noite (Brasília). Código não encontrado (404) **não gasta**. Estourou: HTTP 429. A própria doc tem uma inconsistência (diz 30/dia em um lugar e "100 por dia no plano Grátis" na tabela de erros). |
| Cobertura declarada | "27.518.405 produtos catalogados, 26.301.409 com imagem, 76.962 marcas" (home, 17/11/2026). Inclui móveis, livros etc. e produtos de outros países; "focado em produtos vendidos no Brasil". Mercearia 52.583, Bazar 50.751, Higiene e Beleza 47.675 (contagens por categoria na home). Cobertura de EANs 789 de mercadinho: NÃO VERIFICADO. |
| Campos | Nome, marca, categoria, **NCM**, **CEST**, peso, embalagem, **foto (URL WEBP)**, ingredientes, alérgenos, nutrição. Planos pagos: ficha fiscal (IBPT, IPI, PIS/COFINS, ST, IBS/CBS). Origem dos dados: "notas fiscais e catálogos de lojas e fabricantes". |
| Licença | **Permite** consultar, "armazenar, copiar, complementar, adaptar e exibir" os dados para preencher fichas em ERPs, e-commerces etc.; **uso comercial permitido**; após o fim do contrato pode continuar usando os dados obtidos. **Proíbe** raspagem e criar/alimentar/comercializar "catálogo, base ou API concorrente que ofereça a terceiros, como serviço autônomo" (cl. 3), ressalvado o funcionamento dos sistemas dos clientes. Imagens e marcas de terceiros seguem outras autorizações (cl. 4). Não exige atribuição. |
| Pode guardar em `catalogo_ean` e servir a outros lojistas? | **Provavelmente sim**, como parte do PDV (não como API autônoma de dados). A cláusula 3 deixa uma zona cinza se o `catalogo_ean` virar produto à parte. Confirmar por escrito. |
| SLA / LGPD | SLA só em Scale/Enterprise (termos NÃO VERIFICADOS). Política: guarda e-mail/nome da conta Google, tokens, e logs de chamadas por 12 meses. EAN não é dado pessoal. |

### 2.5 DotCompany API (e)

Fontes: `dotcompany.com.br/api`, `dotcompany.com.br/termos-api.html`, `app.dotcompany.com.br/publico/api-platform/migrar-de/cosmos-bluesoft`. Preços "conferidos em 16/10/2026" pela própria página.

| Item | Achado |
|---|---|
| No ar? | Sim. Operadora, segundo os termos: Associação VPC – Amigos de Deus (CNPJ 43.920.954/0001-25, Goiânia/GO). |
| Endpoint | `GET /api/v1/catalogo/gtin/{ean}` e `POST /api/v1/catalogo/gtin/batch` (até 100 GTINs), busca por nome, marcas, categorias, EAN de balança. Host de produção `api.dotcompany.com.br`. Demo pública sem chave: `GET https://app.dotcompany.com.br/api/catalogo/public/buscar?q={ean}` (o caminho em `dotcompany.com.br` redireciona para a página; usei `app.`). |
| Autenticação | Chave `dc_live_…` (Bearer). **Cadastro exige CNPJ válido.** Demo pública: sem chave. |
| Modelo e preço | **Pré-pago, sem mensalidade, sem franquia.** 1 crédito = R$ 0,01; **R$ 0,04 por consulta com resultado** (consulta sem resultado não cobra; no lote só o encontrado). Compra mínima **R$ 169** (desde 10/11/2026), até R$ 50.000; créditos não vencem; reembolso do não usado conforme CDC art. 49. Conta nova: 200 créditos (R$ 2,00) e 30 req/min. Demo grátis: 25 consultas/dia por IP. |
| Cobertura declarada | "1.9 mi de produtos, 575 mil com foto real, 15.996 marcas, 7 verticais" (autopeças, supermercado, açougue, bebidas, hortifrúti, higiene e limpeza) e 26 mil medicamentos com bula ANVISA. Percentual de EANs 789 cobertos: NÃO VERIFICADO (só a medição da seção 3). |
| Campos | Nome, marca, NCM, CEST, CST/CFOP de referência, peso e medidas **estimados**, foto (URL), IBPTAX. |
| Termos: o que permite | Licença de **uso** "limitada, não exclusiva, intransferível e revogável". Permite cadastrar/identificar produtos no seu sistema e "armazenar, no seu cadastro, os dados dos produtos que Você efetivamente comercializa/utiliza". Imagem: exibir e **cache técnico enquanto for cliente ativo**. |
| Termos: o que proíbe | Varredura em massa de GTINs; **"revender, redistribuir, sublicenciar ou disponibilizar os dados/imagens ... como produto próprio ou de terceiros"**; re-hospedar imagens como banco próprio; ao encerrar, **apagar os dados e imagens obtidos** (cl. 13). Licença do **banco completo: R$ 47.900** (uso interno amplo), mas continua vedando redistribuição a terceiros sem acordo escrito. |
| **Conflito com o nosso design** | O `catalogo_ean` compartilhado grava o resultado e o serve a **outros lojistas**. Isso é, em leitura direta, redistribuir a terceiros, e a regra de apagar ao encerrar colide com um catálogo que "aprende". **Não está claro**; precisa de resposta escrita (seção 6). |
| SLA / LGPD | "Não garantimos serviço ininterrupto"; há status page público e lista de subprocessadores (conteúdo NÃO VERIFICADO). Catálogo sem dados pessoais; trafega só o EAN. Reajuste de preço com aviso prévio. |

### 2.6 Cosmos / Bluesoft (fora da lista)

**NÃO VERIFICADO.** O site `cosmos.bluesoft.com.br` (inclusive `/robots.txt` e `/api-pricings`) respondeu 403 com desafio do Cloudflare ao acesso automatizado; não contornei. Só tenho a afirmação do [produto-catalogo-ean.md](produto-catalogo-ean.md) (acesso gratuito desativado em 01/10/2026), que **não consegui confirmar nem refutar**. Preços e franquias: precisam ser conferidos no navegador ou por contato comercial. Um guia da DotCompany ("migrar de Cosmos") confirma só que o endpoint do Cosmos é `GET api.cosmos.bluesoft.com.br/gtins/{ean}.json`; é fonte concorrente, não oficial.

## 3. Medição de cobertura (amostra pequena)

**Método.** 17/11/2026 à noite, 20 EANs-13 com dígito verificador validado por script. Só chamadas sem credencial, sem dado do lojista, `User-Agent: pdv-pesquisa`, abaixo de 25 chamadas por fonte, intervalos de 2,5 a 5 s. Seleção: 11 EANs colhidos de listagens do Brasil do Open Beauty Facts e do Open Products Facts (limpeza, higiene, bazar), 5 de exemplos das documentações da SI5 e da DotCompany (Coca-Cola 2 L, Moça, Ninho, Corn Flakes, sabonete Ypê) e 4 de memória (União, Soya, e dois que rotulei Brahma e Skol). **Os dois últimos estavam errados** (eu os rotulei Brahma e Skol; as fontes devolveram Guaraná Antarctica lata 350 ml e Antárctica Subzero 350 ml). O produto existe, só o meu rótulo estava errado; "nome correto" abaixo significa "nome coerente com o produto devolvido por pelo menos duas fontes ou pela embalagem conhecida".

**Esta é uma amostra pequena, enviesada para marcas grandes, e não substitui a amostra de 100 do critério de pronto.** SI5 Global não foi medida: exige token (login Google) e a licença proíbe raspar o site.

| Categoria (n) | Open Food Facts | Seu Negócio na Nuvem: registro / **com nome** | DotCompany |
|---|---|---|---|
| Bebida (3) | 3 / 3 | 3 / **0** | 3 / 3 |
| Mercearia (5) | 5 / 5 | 5 / **0** | 5 / 5 |
| Limpeza (4) | 0 / 4 | 4 / **0** | 4 / 4 |
| Higiene (4) | 0 / 4 | 3 / **1** | 3 / 4 (falhou: Tresemmé leave-in 250 ml) |
| Bazar (4) | 0 / 4 | 4 / **1** | 4 / 4 |
| **Total (20)** | **8 / 20 (40%)** | **19 / 20 registro; 2 / 20 nome (10%)** | **19 / 20 (95%)** |
| Nome correto | 8 de 8 (1 quantidade divergente) | 2 de 2 | 18 de 18 registrados; 1 reconhecido sem o nome gravado por falha minha |
| Latência (cliente: curl) | ~0,64 a 0,90 s | ~0,09 a 0,27 s | ~0,34 a 0,53 s |

Observações:

- **Open Food Facts:** devolveu 404 "found with a different product type" para os 11 itens não alimentícios que existem nas bases irmãs (a própria seleção veio de lá). Ou seja, para limpeza/higiene/bazar teria de consultar também Open Beauty Facts e Open Products Facts, cujos dados que vi são esparsos e com erros (nomes vazios, "Pilhs", "Panassonic"). Divergência de dados: óleo Soya aparece com "500ml" no OFF e "Garrafa 900ml" na DotCompany; o campo de quantidade da fonte colaborativa não é confiável, o que reforça a regra "sugestão, nunca imposição".
- **Seu Negócio na Nuvem:** o endpoint devolve um registro fiscal (NCM em 15/20, foto em 15/20) com `descricao` vazia na maior parte. Serve para NCM e foto, não para sugerir nome.
- **DotCompany:** 2 chamadas devolveram 429 (provável teto de rajada por minuto) e passaram na repetição. Atenção: as 4 primeiras chamadas feitas por um cliente Python (urllib) levaram ~42 s cada, enquanto as 19 por curl levaram menos de 0,6 s. A causa não foi investigada (pode ser artefato do cliente ou tratamento diferente por User-Agent/cabeçalho). **Isso precisa ser medido do servidor de produção contra a meta de p95 ≤ 1,5 s.** O limite diário de 25 consultas do endpoint foi consumido por completo.
- A base paga que mediu melhor foi a única que reconheceu tudo que é de loja de bairro (detergente Ypê, pilhas, palito de dente, filtro de papel), mas a amostra é pequena e o demo público pode não refletir a API paga (os termos dizem "mesma cobertura").

## 4. Modelo de custo

### Premissas (todas minhas, a validar no piloto)

- **Receita:** R$ 49,90/mês (preço cheio) e R$ 24,95/mês (cupom VITALICIO50). Caso extremo histórico: R$ 19,90.
- **Outros custos fixos por conta:** R$ 5,00/mês (infra + gateway, estimativa de [produto-planos-e-cobranca.md](produto-planos-e-cobranca.md), risco 3, "a validar"). Se a assinatura for cobrada pelo Google Play (15%, decisão de 24/10/2026): mais R$ 7,49 (sobre 49,90) ou R$ 3,74 (sobre 24,95). **Não está nas tabelas abaixo.**
- **q** = consultas externas por loja por mês, isto é, as que o catálogo próprio e o cache local **não** resolvem. Cenários 30, 150 e 600. Na prática o custo se concentra no primeiro mês (cadastro inicial) e cai depois.
- **f** = fração dessas consultas que já está no `catalogo_ean` por ter sido paga por outra loja. Só vale se os termos da fonte permitirem (DotCompany: incerto). Cenários 0% (pior caso: cada consulta paga, sem compartilhamento), 50%, 80%.
- Taxa de "achado" = 100% (pior caso; a amostra deu 95%, mas é de produtos populares). Consulta sem resultado não cobra na DotCompany nem na SI5.
- Uso uniforme no mês e no dia (picos de onboarding ficam fora do modelo).

### 4.1 DotCompany (R$ 0,04 por consulta com resultado)

Conta: custo por loja = 0,04 × q × (1 − f).

| q (consultas/loja/mês) | f = 0% | f = 50% | f = 80% |
|---|---|---|---|
| 30 | R$ 1,20 | R$ 0,60 | R$ 0,24 |
| 150 | R$ 6,00 | R$ 3,00 | R$ 1,20 |
| 600 | R$ 24,00 | R$ 12,00 | R$ 4,80 |

Peso no preço e margem restante (f = 0%, depois de R$ 5,00 de outros custos):

| q | Custo API | % de R$ 49,90 | Sobra com R$ 49,90 | % de R$ 24,95 | Sobra com R$ 24,95 | Sobra com R$ 19,90 |
|---|---|---|---|---|---|---|
| 30 | R$ 1,20 | 2,4% | R$ 43,70 | 4,8% | R$ 18,75 | R$ 13,70 |
| 150 | R$ 6,00 | 12,0% | R$ 38,90 | 24,0% | R$ 13,95 | R$ 8,90 |
| 600 | R$ 24,00 | 48,1% | R$ 20,90 | 96,2% | **− R$ 4,05** | **− R$ 9,10** |

Efeito do Open Food Facts na frente (gratuito): se ele resolver uma fração a das consultas, o custo cai para 0,04 × q × (1 − f) × (1 − a). Na amostra, a = 40% no geral (100% de alimentos/bebidas, 0% do resto), então com q = 600 e f = 0%: 0,04 × 600 × 0,6 = **R$ 14,40**. Premissa de mix de loja: NÃO VERIFICADA.

Fluxo de caixa: compra mínima R$ 169 = 4.225 consultas, créditos não vencem; é capital parado, não custo.

### 4.2 SI5 Global (franquia diária por conta, não por loja)

O custo é o plano que cobre o **pico diário da frota inteira**: consultas/dia = N lojas × q × (1 − f) ÷ 30. Custo por loja = preço do plano ÷ N. (Básico com o cupom, R$ 39,90; sem cupom, R$ 59,90.)

| Lojas (N) | q | f | Consultas/dia | Plano mínimo | Preço/mês | Por loja |
|---|---|---|---|---|---|---|
| 50 | 30 | 0% | 50 | Básico (cupom) | R$ 39,90 | R$ 0,80 |
| 50 | 150 | 0% | 250 | Pro | R$ 399,99 | R$ 8,00 |
| 50 | 150 | 50% | 125 | Start | R$ 199,99 | R$ 4,00 |
| 50 | 600 | 0% | 1.000 | Scale | R$ 799,99 | R$ 16,00 |
| 200 | 30 | 0% | 200 | Start | R$ 199,99 | R$ 1,00 |
| 200 | 150 | 0% | 1.000 | Scale | R$ 799,99 | R$ 4,00 |
| 200 | 150 | 50% | 500 | Pro | R$ 399,99 | R$ 2,00 |
| 200 | 600 | 0% | 4.000 | acima do Scale: Enterprise sob consulta | n/d | n/d |
| 1.000 | 30 | 0% | 1.000 | Scale | R$ 799,99 | R$ 0,80 |
| 1.000 | 150 | 0% | 5.000 | acima do Scale: Enterprise sob consulta | n/d | n/d |

Custo por consulta com a franquia **100% usada** (o melhor caso de cada plano): Básico R$ 39,90 ÷ 3.000 = **R$ 0,013** (lista R$ 59,90 = R$ 0,020); Start R$ 199,99 ÷ 6.000 = R$ 0,033; Pro R$ 399,99 ÷ 15.000 = R$ 0,027; Scale R$ 799,99 ÷ 30.000 = R$ 0,027. Contra R$ 0,04 da DotCompany, os planos Start+ só ganham se a frota usar mais de ~83% da franquia (Start: R$ 199,99 ÷ 0,04 = 5.000 de 6.000 consultas/mês). Como a franquia **não acumula**, e o uso real tem picos de onboarding, é fácil pagar por cota ociosa e ainda tomar 429 no pico.

### 4.3 Open Food Facts, Seu Negócio na Nuvem, SI5 grátis

Custo direto R$ 0. Limites: OFF 15 req/min/IP (a partir de um IP de servidor, ~21 mil/dia no teto; risco de ban se passar); SI5 grátis 30/dia por conta (~900/mês, serve a ~6 lojas a q = 150 ou a uma fila de "segunda opinião"); Seu Negócio na Nuvem sem limite documentado e sem garantia nenhuma.

### 4.4 Licença do banco completo da DotCompany

R$ 47.900 ÷ R$ 0,04 = **1.197.500 consultas** para empatar. Fora de cogitação no MVP, e ainda veda redistribuição a terceiros sem acordo escrito.

### 4.5 Leitura do modelo

- Até q = 150 sem compartilhamento, a DotCompany custa até 12% do preço cheio e cabe; com o cupom de 50% já pesa 24%.
- q = 600 sem compartilhamento inviabiliza a conta com cupom. Duas alavancas: OFF na frente (−40% na amostra) e catálogo compartilhado (se for permitido).
- A premissa que mais mexe no resultado (f, o compartilhamento) é justamente a que o contrato pode proibir. Sem ela, o custo de cada loja nova no primeiro mês é o de cadastrar o próprio estoque, uma vez.

## 5. Recomendação

**Ordem de consulta**

1. **Catálogo próprio** (`catalogo_ean`), incluindo o nome confirmado por 2 lojas.
2. **Open Food Facts** (grátis; resolve alimentos e bebidas). Identificar-se com `User-Agent` real (`pdv-.../versão (e-mail)`), exibir atribuição, gravar `fonte='off'`. Avaliar semear o `catalogo_ean` com o dump do Brasil em vez de chamar a API.
3. **DotCompany** (pago, R$ 0,04 só quando acha): melhor cobertura medida, inclusive limpeza e bazar.
4. **SI5 Global** (grátis, 30/dia) como segunda opinião para os 404 da DotCompany, após medir.
5. Fora da cadeia por ora: **Seu Negócio na Nuvem** (nome vem vazio, sem termos; no máximo NCM/foto, só com autorização escrita) e **Cosmos** (preço não verificado).

**Contratar agora**

- **DotCompany pré-paga, recarga mínima R$ 169** (≈ 4.225 consultas, não vencem), **somente depois** de resposta escrita sobre cache compartilhado (seção 6). Enquanto a resposta não vem, tratar o resultado como cache **por loja** (tabela separada), e só o **nome confirmado pelo lojista** entra no catálogo compartilhado.
- **SI5 Global: criar o token gratuito já** (custo R$ 0) e medir os mesmos 100 EANs do critério de pronto (4 dias dentro de 30/dia). Plano Básico (R$ 39,90 com cupom até 31/03/2027) só se a cobertura complementar justificar e só para o piloto (≈ 3.000 consultas/mês).

**Não contratar agora**

- Cosmos/Bluesoft (preço e franquia não verificados; cotar só se a cobertura medida de 1 a 4 ficar abaixo de 70%).
- SI5 Start/Pro/Scale (R$ 199,99 a R$ 799,99) e licença do banco da DotCompany (R$ 47.900).
- Seu Negócio na Nuvem e a "API GTIN (Open Source Community Brasil)" (não localizada).

**Riscos**

1. **Termos da DotCompany vs. catálogo compartilhado e "apagar ao encerrar"**: pode forçar tabela por loja e elevar o custo (f = 0%).
2. **ODbL (Open Food Facts)**: atribuição obrigatória e Share-Alike; impacto sobre o `catalogo_ean` misto é ponto jurídico em aberto.
3. **Fornecedores pequenos**: DotCompany (operada por associação, sem SLA, preços mudam com aviso) e SI5 (franquia diária por conta, 429 no pico) podem mudar regras; a licença da SI5 é a mais explícita a favor do nosso uso. Dependência de uma única fonte paga é risco de continuidade.
4. **Latência**: ~42 s nas primeiras chamadas Python à DotCompany (causa desconhecida) e 503 recorrentes no OFF em listagens; a meta p95 ≤ 1,5 s e o timeout de 2 s exigem medição do servidor real, com fila/segundo plano para não bloquear o balcão.
5. **Picos de onboarding** estouram a franquia diária da SI5 e o teto de rajada da DotCompany (observei 429); precisa de fila e fallback para cadastro manual.
6. **Qualidade**: nomes de fontes colaborativas e quantidades divergentes (Soya 500 ml vs 900 ml); manter "sugestão, nunca imposição". Fotos de terceiros: não re-hospedar sem licença.
7. **Tarifa por consulta pode superar o preço com cupom** (q = 600, f = 0): precisa de teto de consultas por loja (a regra atual de 300/hora é só rate limit).

## 6. O que o usuário precisa decidir/contratar

1. **Autorizar** o contato escrito com a DotCompany perguntando: (a) pode gravar o resultado em um catálogo próprio compartilhado entre nossos clientes lojistas? (b) a obrigação de apagar ao encerrar vale para dados já confirmados por lojistas? (c) há SLA ou plano para volume? Sem "sim" a (a), adotar cache por loja.
2. **Contratar** DotCompany pré-paga (recarga mínima R$ 169), com **conta em CNPJ** (exigência do cadastro). Definir **teto mensal de consultas por loja** e orçamento de recarga.
3. **Criar** o token gratuito da SI5 Global (login Google) e **autorizar** a medição dos 100 EANs; decidir depois se vale o Básico a R$ 39,90 (cupom SI5GLOBAL, até 31/03/2027).
4. **Indicar a origem** da "API GTIN (Open Source Community Brasil)" (não encontrada) e da lista de onde saiu (b), que não está no README da public-apis.
5. **Pedir revisão jurídica** de ODbL/Share-Alike sobre o `catalogo_ean` misto e do uso de imagens de terceiros.
6. **Decidir** se aceita cotar Cosmos/GS1 Brasil caso a cobertura medida fique abaixo de 70%, e se a margem mínima aceitável com o cupom VITALICIO50 (R$ 24,95) entra como critério para o teto de consultas.
7. **Confirmar** se o preço de venda considerado nas contas (R$ 49,90 cheio, R$ 24,95 com cupom) e a taxa do Google Play (15%) entram na margem-alvo.

## 7. NÃO VERIFICADO (resumo)

- Entradas (b) "API de Produtos (Seu Negócio na Nuvem)" e (c) "API GTIN (Open Source Community Brasil)" na public-apis: **não existem no README**. (c) não localizada em lugar nenhum.
- Cosmos/Bluesoft: preços, franquias e a desativação do acesso gratuito em 01/10/2026 (site bloqueou acesso automatizado).
- Cobertura da SI5 Global para EANs 789 (exigiu token; não medida) e termos de SLA dos planos Scale/Enterprise.
- Termos, limites, SLA e origem dos dados da API de Produtos do Seu Negócio na Nuvem (não há documento).
- Contagem de produtos do Brasil no Open Food Facts (listagem retornou 503); licença das bases irmãs Open Beauty/Products Facts; enquadramento do `catalogo_ean` misto na ODbL.
- Percentual real de cobertura de EANs brasileiros de qualquer fonte (declarações são do fornecedor; a medição aqui é de 20 EANs).
- Conteúdo da status page e da lista de subprocessadores LGPD da DotCompany; se a API paga tem a mesma cobertura do demo gratuito.
- Causa da latência de ~42 s nas primeiras chamadas Python à DotCompany.
- Mix real de consultas externas por loja (q) e fração compartilhável (f); ambos são premissas.
