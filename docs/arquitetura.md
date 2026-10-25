# Arquitetura — App, Desktop e API compartilhados (v0.1)

**Uma base de dados, uma API e um pacote de domínio**, usados pelo App (Android primeiro) e, depois, pelo Desktop.

```
prisma pdv app/
├─ apps/
│  ├─ mobile/      Expo (React Native + TypeScript, expo-router) — Android primeiro
│  ├─ api/         Node + Fastify + TypeScript + Drizzle ORM
│  └─ desktop/     (futuro) Tauri + React, reutilizando packages/*
├─ packages/
│  └─ shared/      Domínio puro em TS: dinheiro, planos/limites, máquina de estados
│                  da assinatura, tipos e schemas (zod) do contrato da API
└─ docs/           Design system, protótipo, produto e esta arquitetura
```

Monorepo com **npm workspaces** (sem ferramenta extra).

## Princípios
1. **Contrato único**: tipos e schemas zod da API ficam em `packages/shared`. API, App e Desktop importam dali. Se mudar o contrato, quebra a compilação dos três.
2. **Offline-first no cliente**: cada aparelho tem um banco local (SQLite: `expo-sqlite` no App, o mesmo modelo no Desktop) e uma **fila de sincronização** (outbox). A venda nunca espera a rede.
3. **Servidor é a fonte da verdade** para conta, loja, catálogo, vendas consolidadas e **assinatura/licença**.
4. **Dinheiro em centavos inteiros** (`number` inteiro, nunca float). A formatação `R$ 1.284,50` fica só na borda (UI).
5. **IDs gerados no cliente** (UUID v7) para permitir criar offline sem conflito.
6. **Limites de plano vêm do catálogo `PLANOS`** em `packages/shared`. O cliente usa para UX, e o servidor revalida.

## Banco (Postgres em produção)
Em dev e nos testes da API usa **PGlite** (Postgres embutido, sem Docker), com o mesmo dialeto e as mesmas migrações do Drizzle.

Tabelas principais: `contas`, `lojas`, `operadores`, `aparelhos`, `produtos`, `vendas`, `itens_venda`, `pagamentos_venda`, `caixas` (abertura/fechamento/sangria/suprimento), `assinaturas`, `faturas`, `eventos_cobranca`.
Toda linha de negócio tem `loja_id`, `criado_em`, `atualizado_em`, `excluido_em` (soft delete para a sincronização) e `versao`.

## Sincronização
- `POST /sync/push`: o aparelho envia mutações da outbox (idempotente por `id` da mutação).
- `GET /sync/pull?desde=<cursor>`: o aparelho recebe mudanças desde o cursor.
- Conflito: *last-write-wins* por campo de catálogo. Vendas são imutáveis (só cancelamento gera evento novo).

## Assinatura / licença
- `GET /planos` · `POST /assinatura` (plano + token do cartão) · `GET /assinatura` · `POST /assinatura/cancelar` · `POST /assinatura/trocar-plano` · `PUT /assinatura/cartao`.
- `BillingProvider` (interface) → `MockBillingProvider` (testes) | Stripe/Asaas (produção) | `GooglePlayBillingProvider` (se a política exigir).
- Um job diário processa fim de teste, cobrança, retentativas e suspensão. Tudo usa um `Relogio` injetável, para os testes avançarem o tempo.
- O aparelho guarda a **licença** (`plano`, `status`, `validaAte`, `limites`) e decide offline com as mesmas funções puras de `packages/shared`.

## Modo demo (versão de testes)
Sem `EXPO_PUBLIC_API_URL`, o App roda **100% local**, com `MockBillingProvider` embutido e a mesma máquina de estados. Assim dá para testar no Android pelo Expo Go sem servidor. Com a variável definida, o App sincroniza com a API.

Na versão de testes, o armazenamento local é `AsyncStorage` atrás da interface `Armazenamento`, porque funciona no Expo Go e no navegador, onde fazemos a revisão visual. A troca para SQLite (`expo-sqlite`) acontece antes do beta, sem mudar as telas.

## Catálogo de produtos por código de barras (pré-produção)
`GET /catalogo/ean/:ean` consulta, nesta ordem: catálogo próprio, Open Food Facts e Cosmos. O resultado fica em cache no catálogo próprio, e a chave do Cosmos só existe no servidor. App e Desktop usam a mesma rota. Regras, fontes e critérios de pronto em [produto-catalogo-ean.md](produto-catalogo-ean.md).

## Desktop (futuro)
Tauri + React (web), importando `packages/shared` e o mesmo cliente da API. Componentes visuais seguem os tokens do design system "Balcão" (`docs/design-system.md`). Os tokens ficam exportados em `packages/shared/src/tokens.ts` para servir os dois.
