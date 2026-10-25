# Reconhecimento de produto por código de barras — v0.1

Dono: Produto · Status: **API e app implementados com catálogo próprio + Open Food Facts; Cosmos pendente (plano pago); falta medir os critérios da seção 5** · Decisão de 24/10/2026

## 1. Duas capacidades diferentes

| Capacidade | O que é | Status |
|---|---|---|
| **Ler o código** | A câmera decodifica qualquer EAN-13, EAN-8, UPC-A, UPC-E ou Code 128, de qualquer produto, usando o ML Kit embutido no app (funciona offline) | **Pronta na versão de testes.** Tem que funcionar sempre: é bloqueante para qualquer build |
| **Reconhecer o produto** | A partir do código, sugerir nome, marca, conteúdo e foto para preencher o cadastro | **Pré-produção.** Na versão de testes é simulada (`apps/mobile/src/servicos/catalogoEan.ts`, poucos códigos de demonstração) |

O reconhecimento só **acelera o cadastro**. Venda e cadastro funcionam sem ele: o código não reconhecido vira um formulário com o código já preenchido.

## 2. Regras de produto

1. **Sugestão, nunca imposição.** Nome, marca e conteúdo vêm preenchidos e editáveis. O lojista confirma antes de salvar.
2. **Preço nunca vem de fora.** Cada loja define o próprio preço. O catálogo não guarda preço de ninguém.
3. **Rápido ou nada.** Se a consulta passar de 2,5 s ou o aparelho estiver offline, o formulário abre com o código preenchido e o campo de nome livre. Ninguém fica esperando no balcão.
4. **Catálogo que aprende.** Quando um lojista cadastra um código que nenhuma fonte conhece, o par código + nome confirmado alimenta o nosso catálogo. O próximo lojista já recebe a sugestão. Só o nome é compartilhado: preço, estoque e dados da loja ficam fora.
5. **Disponível em todos os planos.** É o que faz o cadastro bipando funcionar de verdade e reduz o abandono no primeiro dia. Não é diferencial de plano.

## 3. Fontes (em ordem de consulta)

| Ordem | Fonte | Custo | Cobertura no Brasil | Uso |
|---|---|---|---|---|
| 1 | **Catálogo próprio** (tabela `catalogo_ean` na nossa API) | Zero | Cresce com o uso | Sempre primeiro |
| 2 | **Open Food Facts** | Grátis e aberta (exige `User-Agent` identificado) | Boa em alimentos e bebidas de marca; fraca em limpeza, bazar e marcas regionais | Segunda consulta |
| 3 | **Cosmos (Bluesoft)** | **Só plano pago.** Pelos Termos de Uso, o acesso gratuito à API foi desativado em 01/10/2026 e o período de teste não inclui consultas. Cada requisição (e cada página) conta na franquia diária do plano. Preços e franquias: `cosmos.bluesoft.com.br/api-pricings` (conferir no navegador) | A mais completa do varejo brasileiro | Reserva, só quando 1 e 2 falham |
| — | GS1 Brasil | Contrato | Oficial | Avaliar depois, se a qualidade de 2 e 3 não bastar |

O resultado de qualquer fonte externa é gravado no catálogo próprio. Assim cada código é pago no máximo uma vez.

## 4. Arquitetura (App e Desktop iguais)

- **`GET /catalogo/ean/:ean`** na API: valida o dígito verificador, consulta as fontes na ordem acima e devolve `{ ean, nome, marca, conteudo, imagemUrl, fonte, confianca }` ou 404. Timeout total de 2 s no servidor.
- **`POST /catalogo/ean/:ean/confirmacao`**: chamado quando o lojista salva o produto. Registra o nome confirmado. Um nome só vira sugestão padrão depois de confirmado por **2 lojas diferentes**, para evitar erro ou abuso.
- **Cliente**: `catalogoEan.ts` passa a chamar a API, mantendo a mesma interface de hoje. Cache local dos últimos 500 códigos consultados.
- **Limites**: rate limit por loja (ex.: 300 consultas/hora). Chave do Cosmos só no servidor, nunca no app.
- **Contrato** em `packages/shared/contrato.ts` (`ProdutoCatalogoSchema`), como todo o resto.

## 5. Critérios de pronto (pré-produção)

- Em uma amostra de **100 produtos reais** de mercadinho (alimentos, bebidas, limpeza, higiene, bazar): ≥ 70% reconhecidos com nome correto. Medir por fonte.
- p95 da consulta ≤ 1,5 s em 4G.
- Offline e fonte fora do ar não bloqueiam o cadastro (teste automatizado).
- Custo do Cosmos por loja ativa dentro do orçamento do plano Essencial (ver risco 3 em `produto-planos-e-cobranca.md`).

## 6. Garantia do leitor (vale para toda build)

Toda build Android, de teste ou de produção, só é liberada se passar no **teste de fumaça do leitor** num aparelho real:

1. Abrir "Cadastrar bipando" e bipar um produto qualquer fora da base de demonstração. Tem que bipar e abrir o cadastro com o código preenchido.
2. No log (`adb logcat`), não pode aparecer `Failed to initialize BarcodeAnalyzer` nem erros de ML Kit.

Origem da regra: o APK 0.1.0 saiu com a minificação (R8) ligada, que quebrou a inicialização do ML Kit. A câmera abria, mas nada era lido. Desde a 0.1.1, o APK de testes sai sem minificação e já tem regras de proteção (keep) do ML Kit para quando a minificação for religada em produção. Religar exige repetir este teste.
