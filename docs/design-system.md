# PDV Mobile — Design System "Balcão" (v0.1, protótipo)

Produto novo, **mobile-first** (Android primeiro), depois portado para desktop. Sem nome ainda: o wordmark usa o placeholder `[nome]`. Sem whitelabel.
Inspiração de *princípios* do Wise Design System (não copiar a marca deles): tipografia display pesada e grande, alto contraste tinta/branco, **um** acento vivo, botões pill, superfícies planas, muito branco, linguagem simples e direta. Ilustrações em **aquarela digital abstrata com volume 3D suave**.

Idioma da UI: **pt-BR**. Tom: direto, amigável, frases curtas, verbos de ação ("Bipar", "Cobrar R$ 56,05", "Toque para ativar o leitor").

---

## 1. Tokens

### Cores
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#14112B` | Texto principal, botão secundário (fundo), ícones |
| `ink-2` | `#4A4766` | Texto secundário |
| `ink-3` | `#6B6883` | Labels, legendas, placeholders (passa 4.5:1 no branco) |
| `bg` | `#FFFFFF` | Fundo de tela |
| `surface` | `#F4F2EE` | Cards, inputs, linhas de lista agrupadas |
| `surface-2` | `#EAE7E1` | Pressed / trilhos / divisores fortes |
| `line` | `#E2DED6` | Bordas 1px, divisores |
| `manga` | `#FFC933` | **Acento único**: CTA primário (texto `ink`), destaque do último item bipado |
| `manga-strong` | `#F2B200` | Pressed do primário |
| `manga-soft` | `#FFF3CC` | Fundo de destaque suave |
| `anil` | `#3346F0` | Foco (anel 2px), links, seleção (chip/segmento ativo), progresso |
| `anil-soft` | `#E6E9FF` | Fundo de seleção |
| `folha` | `#0E7A40` | Sucesso / "Pago" / tela cheia do Pix pago (texto branco) |
| `folha-soft` | `#DDF5E7` | Fundo de status positivo |
| `ambar` | `#A65400` | Atenção (texto) — offline, pendente |
| `ambar-soft` | `#FFEFD9` | Fundo atenção |
| `pitanga` | `#C8102E` | Erro / remover / cancelado |
| `pitanga-soft` | `#FDE3E6` | Fundo erro |
| `noite` | `#0D0B1A` | Fundo do visor da câmera |

Regra: `manga` nunca carrega texto branco. Cores de status sempre acompanhadas de ícone ou texto (nunca só cor).

### Tipografia (Google Fonts)
`<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`

| Estilo | Fonte | Tamanho/altura | Peso | Uso |
|---|---|---|---|---|
| Display | Bricolage Grotesque | 44/44, tracking -0.02em | 800 | Totais de venda, hero |
| Título XL | Bricolage Grotesque | 32/34 | 800 | Título de tela |
| Título L | Bricolage Grotesque | 24/28 | 700 | Seções, sheets |
| Título M | Inter | 18/24 | 700 | Card, item em destaque |
| Corpo L | Inter | 17/24 | 400 | Texto principal |
| Corpo | Inter | 15/22 | 400/500 | Listas |
| Label | Inter | 13/18 | 600 | Labels de campo, chips |
| Legenda | Inter | 12/16 | 500 | Metadados |
Valores monetários: `font-variant-numeric: tabular-nums`. Formato BR: `R$ 1.284,50`.

### Espaço, raio, elevação
- Espaçamento (base 4): 4, 8, 12, 16, 24, 32, 48, 64. Margem lateral de tela: **20px**.
- Raios: `r-sm` 8 (tags) · `r-md` 16 (inputs, cards, linhas) · `r-lg` 24 (sheets, cards grandes) · `r-pill` 999 (botões, chips).
- Elevação quase plana. Sheet: `0 -8px 32px rgba(20,17,43,.12)`. Toast: `0 8px 24px rgba(20,17,43,.24)`. Nada de sombras em cards comuns.
- Toque mínimo 48px (44 absoluto). Ícones: SVG inline traço 2px, `stroke-linecap: round`, 24px, cor `currentColor`. Nunca emoji.
- Acessibilidade: foco visível obrigatório (anel `anil` 2px), respeitar `prefers-reduced-motion`, nome acessível = texto visível, textos escaláveis até 200% sem cortar.

## 2. Componentes
- **Botão** pill. Alturas: L 56 (padrão de CTA, largura total), M 48, S 36. Variantes: `primário` (manga / texto ink), `secundário` (ink / texto branco), `terciário` (surface / texto ink), `ghost` (transparente / texto ink, sublinhado ao focar), `perigo` (pitanga-soft / texto pitanga). Estados: pressed, desabilitado (opacity .4), carregando (spinner).
- **Botão-ícone** redondo 48 (surface ou translúcido sobre câmera `rgba(255,255,255,.16)`).
- **Campo**: label Label acima, caixa 56h, `surface`, r-md, sem borda; foco = anel 2px `anil`; erro = anel `pitanga` + mensagem.
- **Campo de dinheiro**: valor em Display, prefixo "R$" menor; teclado numérico próprio.
- **Teclado numérico**: grade 3×4, teclas 64h, `surface`, r-md, dígitos Inter 24/600; tecla "00" e apagar.
- **Chip / filtro**: pill 36h, `surface`; ativo = `ink` com texto branco.
- **Controle segmentado**: trilho `surface`, segmento ativo branco com sombra mínima.
- **Linha de lista**: 64–72h, miniatura 44 (ilustração ou monograma em r-md), título Corpo 500, subtítulo Legenda ink-3, valor à direita tabular.
- **Stepper de quantidade**: `−` e `+` 48×48 redondos + número Título M; atalho "+5".
- **Status pill**: 24h, Legenda 600, ícone 14 + texto: Pago (folha), Pendente (ambar), Offline (ambar), Sincronizando (anil), Cancelado (pitanga).
- **Toast**: `ink`, texto branco, r-md, ícone à esquerda, ação opcional em manga.
- **Bottom sheet**: r-lg no topo, alça 36×4 `line`, título Título L.
- **Barra inferior**: 88h + safe area; grade `1fr 1fr 128px 1fr 1fr`. 4 abas (Início, Produtos, Caixa, Ajustes) com toque mínimo 48×56, rótulo 12/16 600, inativa `ink-2`, ativa `ink` + ponto `manga` e `aria-current="page"`. **Botão central "Vender"**: pill mín. 104×56 (padding 14) `manga` com ícone de código de barras 24 + texto "Vender" 16/700 dentro (o texto visível é o nome acessível), borda branca 4px, elevado 22px, pressed `manga-strong`. Foco: anel 2px `anil` com offset 2–3px em todos os itens.
- **Visor do scanner**: fundo `noite` com "feed" simulado (gradientes escuros desfocados); **ROI** = retângulo central 260×120 com cantos em colchete brancos 4px r 12; fora do ROI escurecido 55%; linha laser `manga` animada dentro do ROI; botões translúcidos: lanterna, fechar. Ao bipar: flash do ROI em `folha`, pulso, rótulo "Bip!".
- **Tile de meio de pagamento**: linha 72h `surface` r-md, monograma do provedor (quadrado 40 r-sm: "IP" para InfinitePay, "MP" para Mercado Pago — **sem logos reais**), título + legenda ("Pix na tela", "Aproximação no celular").
- **Banner**: info (anil-soft), atenção (ambar-soft), erro (pitanga-soft), r-md, ícone + texto + ação.

## 3. Ilustrações — receita "aquarela 3D"
Componente `Ilustra.dc.html` (prop `kind`, prop `size` px). SVG `viewBox="0 0 200 200"`.
- Formas orgânicas arredondadas, lúdicas e estilizadas; **sem contorno preto, sem traço de contorno**.
- Volume: `radialGradient` por forma com ponto focal no alto-esquerda (luz global suave), 2–3 paradas de cor vibrante com transição fluida (ex.: manga→coral→magenta; turquesa→anil→violeta; lima→folha).
- Bordas molhadas de guache: filtro `feTurbulence(fractalNoise, baseFrequency .035, numOctaves 2)` + `feDisplacementMap scale≈5`.
- Textura de guache: segunda `feTurbulence` alta frequência (≈.9) convertida em alpha baixo e composta com `in="SourceGraphic"` (grão sutil, ~8–12%).
- Inner glow translúcido: elipse branca com `feGaussianBlur` (stdDev 6–10) e opacidade .5–.7 dentro da forma (clip-path), mais um realce pequeno nítido.
- Sombra de contato: elipse colorida (não cinza) desfocada, opacidade .18, sob o objeto.
- Fundo sempre **branco puro** (transparente sobre branco). IDs de `<defs>` sufixados por `kind` para não colidir.
- Paleta de ilustração: manga `#FFC933`, coral `#FF7A59`, magenta `#E8407A`, turquesa `#2EC4B6`, anil `#3346F0`, violeta `#7B5CFF`, lima `#B6E83A`, folha `#1FAF5F`.

`kind` disponíveis (contrato fixo): `scanner` (etiqueta de código de barras com feixe de luz), `cesta` (cesta com mercadorias), `moedas` (moedas + cédula), `tap` (celular com ondas NFC e cartão), `pix` (bloco de QR com losango), `produto` (caixa/embalagem), `check` (gota de sucesso com check), `offline` (nuvem com corte), `recibo` (recibo curvado), `lanterna` (lanterna com facho), `loja` (fachada com toldo), `pausa` (lua/sono — modo economia), `busca` (lupa sobre embalagem), `grafico` (barras subindo).
Uso: `<dc-import name="Ilustra" kind="cesta" size="160" hint-size="160px,160px"></dc-import>`.

## 4. Dados fictícios (consistentes em todas as telas)
Loja: **Mercadinho Bom Preço** · Operadora: **Ana** · Aparelho: "Celular do balcão".
| Produto | EAN | Preço |
|---|---|---|
| Arroz tipo 1 5kg | 7890000000017 | R$ 27,90 |
| Feijão carioca 1kg | 7890000000024 | R$ 8,49 |
| Leite integral 1L | 7890000000031 | R$ 5,29 |
| Café torrado 500g | 7890000000048 | R$ 19,90 |
| Biscoito recheado 130g | 7890000000055 | R$ 3,79 |
| Refrigerante cola 2L | 7890000000062 | R$ 9,99 |
| Pão francês | (sem código, kg) | R$ 16,90/kg |
| Banana prata | (sem código, kg) | R$ 6,99/kg |
| Saco de gelo 5kg | (atalho) | R$ 12,00 |
Carrinho de demonstração do checkout: Arroz 1× 27,90 · Feijão 1× 8,49 · Leite 3× 15,87 · Biscoito 1× 3,79 → **6 itens, R$ 56,05**.
Resumo do dia: **R$ 1.284,50**, 47 vendas — Dinheiro R$ 412,30 · Pix R$ 598,70 · Cartão R$ 273,50. Troco inicial R$ 100,00 → esperado na gaveta **R$ 512,30**.

## 5. Mapa de telas (artboards do protótipo, 390×844, interativos)
Cada artboard tem prop `tela` (enum) que define a tela inicial — usada pelo mapa de telas.
- `AppInicio.dc.html` — `boasvindas`, `loja`, `pagamentos`, `camera`, `home`
- `AppVender.dc.html` — `scanner`, `avulso`, `busca`, `pausado`
- `AppPagar.dc.html` — `checkout`, `dinheiro`, `dividir`, `pix`, `pixpago`, `tap`, `tapfalha`, `sucesso`
- `AppCadastro.dc.html` — `lista`, `scanner`, `buscando`, `novo`, `rapido`, `atalhos`
- `AppCaixa.dc.html` — `resumo`, `vendas`, `sync`, `ajustes`
Navegação entre artboards por `<a href="AppVender.dc.html">` (barra inferior e CTAs).
