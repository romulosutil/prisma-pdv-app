/* ==========================================================================
   Prisma PDV — Studio Editorial & Protótipo Interativo v2.2 (Balcão Autêntico)
   5 Vistas: Protótipo Navegável (32 telas) | Marca & Play Store (3 dir. + Mask)
             Fundamentos & Tokens (WCAG Claro/Noturno) | Componentes & Aquarelas
             Antes × Depois & Ondas (/impeccable + /ui-ux-pro-max + CP 159/161)
   ========================================================================== */
(function (global) {
  'use strict';

  var JORNADAS = [
    {
      grupo: 'J1 · Onboarding e Acesso (7)',
      telas: [
        { id: 'boas-vindas', nome: 'Boas-vindas + Marca', tag: 'J1' },
        { id: 'criar-conta-dados', nome: '1/5 · Nome e E-mail', tag: 'J1' },
        { id: 'criar-conta-otp', nome: '2/5 · Código OTP', tag: 'Fix' },
        { id: 'loja', nome: '3/5 · Nome da Loja', tag: 'J1' },
        { id: 'recebimentos', nome: '4/5 · Recebimentos', tag: 'CP159' },
        { id: 'camera', nome: '5/5 · Permissão Câmera', tag: 'J1' },
        { id: 'entrar', nome: 'Entrar na Conta', tag: 'J1' }
      ]
    },
    {
      grupo: 'J2 · Início, Vender & Busca (3)',
      telas: [
        { id: 'inicio', nome: 'Início (Balcão)', tag: 'Home' },
        { id: 'vender', nome: 'Vender (Visor + Sacola)', tag: '2-Col' },
        { id: 'vender-busca', nome: 'Busca Rápida & EAN', tag: 'Novo' }
      ]
    },
    {
      grupo: 'J3 · Pagamento & Recibo (8)',
      telas: [
        { id: 'checkout', nome: 'Cobrar (Checkout)', tag: 'P3' },
        { id: 'pagar-dividir', nome: 'Dividir Pagamento', tag: 'Novo' },
        { id: 'pagar-tap', nome: 'Cartão / Tap / Stone', tag: 'CP159' },
        { id: 'pagar-dinheiro', nome: 'Dinheiro & Troco', tag: 'F18' },
        { id: 'pagar-pix', nome: 'Pix na Hora', tag: 'J3' },
        { id: 'pagar-pix-pago', nome: 'Pix Recebido (Tela)', tag: 'Delight' },
        { id: 'pagar-fiado', nome: 'Anotar no Fiado', tag: 'P3' },
        { id: 'sucesso', nome: 'Comprovante & QR', tag: 'Folha' }
      ]
    },
    {
      grupo: 'J4 · Caixa & Turno (5)',
      telas: [
        { id: 'caixa-resumo', nome: 'Resumo & Gaveta', tag: 'F18' },
        { id: 'caixa-vendas', nome: 'Vendas (Acordeão)', tag: 'Novo' },
        { id: 'caixa-movimento', nome: 'Entrada / Sangria', tag: 'Gloss' },
        { id: 'caixa-fechar', nome: 'Fechar Caixa', tag: 'Mask' },
        { id: 'caixa-turnos', nome: 'Turnos Anteriores', tag: 'UUID' }
      ]
    },
    {
      grupo: 'J5 · Produtos & Estoque (3)',
      telas: [
        { id: 'produtos', nome: 'Catálogo & Bipando', tag: 'J5' },
        { id: 'produto-novo', nome: 'Novo Produto + ODbL', tag: 'CP161' },
        { id: 'estoque', nome: 'Gestão de Estoque', tag: 'R2' }
      ]
    },
    {
      grupo: 'J6 · Fiado, Relatórios & Equipe (3)',
      telas: [
        { id: 'fiado', nome: 'Fiado (Clientes)', tag: 'R3' },
        { id: 'relatorios', nome: 'Relatórios + Gráfico 7d', tag: 'R4' },
        { id: 'equipe-usuarios', nome: 'Equipe, Perfis & Lojas', tag: 'Gap' }
      ]
    },
    {
      grupo: 'J7 · Sync, Ajustes & Suporte (3)',
      telas: [
        { id: 'caixa-sync', nome: 'Sync Offline Animado', tag: 'J7' },
        { id: 'ajustes', nome: 'Ajustes, Noturno & Harden', tag: 'Pro' },
        { id: 'suporte', nome: 'Suporte, Políticas e Dados', tag: '3-Tab' }
      ]
    }
  ];

  var DEFAULT_PRODUTOS = [
    { nome: 'Arroz tipo 1 5kg', ean: '7890000000017', preco: 2790, unidade: 'un', estoque: 14, atalho: false },
    { nome: 'Feijão carioca 1kg', ean: '7890000000024', preco: 849, unidade: 'un', estoque: 19, atalho: false },
    { nome: 'Leite integral 1L', ean: '7890000000031', preco: 529, unidade: 'un', estoque: 28, atalho: false },
    { nome: 'Café torrado 500g', ean: '7890000000048', preco: 1990, unidade: 'un', estoque: 3, atalho: false },
    { nome: 'Biscoito recheado 130g', ean: '7890000000055', preco: 379, unidade: 'un', estoque: 22, atalho: false },
    { nome: 'Refrigerante cola 2L', ean: '7890000000062', preco: 999, unidade: 'un', estoque: 11, atalho: false },
    { nome: 'Pão francês', ean: '', preco: 1690, unidade: 'kg', estoque: 2, atalho: true },
    { nome: 'Banana prata', ean: '', preco: 699, unidade: 'kg', estoque: 9, atalho: true },
    { nome: 'Saco de gelo 5kg', ean: '', preco: 1200, unidade: 'un', estoque: 8, atalho: true }
  ];

  var DEFAULT_CARRINHO = [
    { nome: 'Arroz tipo 1 5kg', preco: 2790, qtd: 1, unidade: 'un' },
    { nome: 'Feijão carioca 1kg', preco: 849, qtd: 1, unidade: 'un' },
    { nome: 'Leite integral 1L', preco: 529, qtd: 2, unidade: 'un' },
    { nome: 'Biscoito recheado 130g', preco: 379, qtd: 1, unidade: 'un' },
    { nome: 'Pão francês (0,313 kg)', preco: 1690, qtd: 0.313, unidade: 'kg' }
  ];

  var DEFAULT_VENDAS_TURNO = [
    {
      id: 'v231', num: '#000231', hora: '18:45', qtdTxt: '2 itens',
      meioKey: 'dinheiro', meioTxt: 'Dinheiro', meioIcone: 'dinheiro', val: 1490, status: 'fila',
      itens: [{ nome: '2× Leite integral 1L', val: 1058 }, { nome: '1× Pão francês', val: 432 }]
    },
    {
      id: 'v230', num: '#000230', hora: '18:41', qtdTxt: '3 itens',
      meioKey: 'pix', meioTxt: 'Pix · Mercado Pago', meioIcone: 'pix', val: 2340, status: 'pago',
      itens: [{ nome: '1× Café torrado 500g', val: 1990 }, { nome: '1× Biscoito recheado 130g', val: 350 }]
    },
    {
      id: 'v229', num: '#000229', hora: '18:37', qtdTxt: '1 item',
      meioKey: 'dinheiro', meioTxt: 'Dinheiro', meioIcone: 'dinheiro', val: 849, status: 'pago',
      itens: [{ nome: '1× Feijão carioca 1kg', val: 849 }]
    },
    {
      id: 'v227', num: '#000227', hora: '18:19', qtdTxt: '2 itens',
      meioKey: 'pix', meioTxt: 'Pix', meioIcone: 'pix', val: 1200, status: 'cancelada',
      itens: [{ nome: '1× Saco de gelo 5kg', val: 1200 }]
    }
  ];

  var DEFAULT_PARCELAS = [{ meio: 'Dinheiro', ic: 'dinheiro', val: 2000 }];

  var state = {
    vista: 'prototipo',
    viewport: 'padrao',
    tema: 'claro',
    direcao: 'noite',
    maskForma: 'squircle',
    tela: 'vender',
    animarTela: false,
    harden: false,
    offline: false,
    contaPausada: false,
    permissaoCamera: 'concedida',
    lanterna: false,
    leitorPausado: false,
    bipFlash: false,
    itensCheckoutAbertos: false,
    nomeOperadora: 'Ana',
    emailConta: 'ana@mercadinhobompreco.com.br',
    otpCodigo: '482910',
    otpReenviado: false,
    nomeLoja: 'Mercadinho Bom Preço',
    segmentoLoja: 'Mercadinho',
    aparelho: 'Celular do balcão',
    meiosAtivos: ['mp', 'ip', 'fiado'],
    provedorPix: 'mercadopago',
    qrReciboAberto: false,
    tapModo: 'esperando',
    tapConsultado: false,
    parcelasDivididas: DEFAULT_PARCELAS.map(function (p) { return Object.assign({}, p); }),
    ultimoBip: '7890000000017',
    buscaVender: '',
    buscaProdutos: '',
    filtroProdutos: 'todos',
    filtroVendas: 'todas',
    vendaAbertaId: 'v230',
    vendasTurno: DEFAULT_VENDAS_TURNO.map(function (v) { return Object.assign({}, v); }),
    produtos: DEFAULT_PRODUTOS.map(function (p) { return Object.assign({}, p); }),
    carrinho: DEFAULT_CARRINHO.map(function (c) { return Object.assign({}, c); }),
    avulsoCat: 'Pão',
    avulsoCentavos: 1250,
    dinheiroRecebido: 10000,
    ultimaVenda: { valor: 5605, meio: 'Pix · Mercado Pago', troco: 0, codigo: '#000231' },
    caixaTrocoInicial: 10000,
    caixaDinheiro: 41230,
    caixaPix: 59870,
    caixaCartao: 27350,
    caixaVendasCentavos: 128450,
    caixaQtdVendas: 47,
    caixaEntradas: 0,
    caixaSangrias: 0,
    movTipo: 'entrada',
    movValorCentavos: 5000,
    movMotivo: 'Troco em cédulas',
    fechamentoContado: 51230,
    trocoProximoTurno: 10000,
    cadBuscando: false,
    novoNome: 'Achocolatado em pó 400g',
    novoCusto: 619,
    novoVenda: 949,
    novoEstoque: 12,
    clientesFiado: [
      { nome: 'Maria Oliveira', iniciais: 'MO', saldo: 4800, codigo: '#CL-014' },
      { nome: 'João Carlos', iniciais: 'JC', saldo: 8450, codigo: '#CL-029' },
      { nome: 'Dona Lúcia', iniciais: 'DL', saldo: 0, codigo: '#CL-042' }
    ],
    clienteFiadoIdx: 0,
    periodoRelatorio: 'hoje',
    relDiaIdx: 6,
    abaEquipe: 'equipe',
    abaSuporte: 'ajuda',
    filaSync: 3,
    syncEmAndamento: false,
    sheet: null,
    sheetIdx: 0,
    toast: null,
    toastUndo: false,
    ultimoRemovido: null,
    demoSwitch: true
  };

  var toastTimer = null;
  var flashTimer = null;
  var syncTimer = null;

  function showToast(msg, withUndo) {
    state.toast = msg;
    state.toastUndo = !!withUndo;
    if (!withUndo) state.ultimoRemovido = null;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      state.toast = null;
      state.toastUndo = false;
      state.ultimoRemovido = null;
      render();
    }, withUndo ? 4200 : 2500);
  }

  function triggerBipFlash() {
    state.bipFlash = true;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      state.bipFlash = false;
      render();
    }, 520);
  }

  function navigateTo(telaId) {
    if (state.tela !== telaId) {
      state.tela = telaId;
      state.animarTela = true;
    }
    state.sheet = null;
  }

  function dirNome(dir) {
    if (dir === 'solar') return 'Dir. B Solar';
    if (dir === 'aquarela') return 'Dir. C Aquarela';
    return 'Dir. A Noite';
  }

  function renderVistaMarca() {
    var ic = global.PDVIcones;
    var il = global.PDVIlustra;
    var maskCls = 'mask-' + state.maskForma;
    var maskRotulo = state.maskForma === 'circle' ? 'Circular (Pixel)' : state.maskForma === 'teardrop' ? 'Gota (Teardrop)' : 'Squircle (Samsung/MIUI)';

    return (
      '<div class="studio-section">' +
      '  <div class="studio-hero">' +
      '    <div style="display:flex;flex-direction:column;gap:12px;">' +
      ic.wordmarkHtml({ size: 32 }) +
      '      <h1 class="ds-display" style="font-size:48px;">Identidade Prisma PDV · 3 Direções</h1>' +
      '      <p class="ds-corpo-l" style="max-width:640px;">Ícone esculpido com traços vetoriais contínuos (&lt;=5 caminhos por SVG), linguagem aquarela 3D e formas orgânicas do Design System Balcão, pronto para substituir o placeholder do Expo.</p>' +
      '    </div>' +
      il.svg('cesta', 160) +
      '  </div>' +
      '  <div class="studio-grid-3">' +
      '    <div class="ds-surface-lg" style="' + (state.direcao === 'noite' ? 'box-shadow:inset 0 0 0 2px #14112B;' : '') + '">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><strong class="ds-titulo-m">Dir. A · Noite &amp; Manga</strong><span class="ds-pill ds-pill-manga">Recomendada</span></div>' +
      '      <div style="display:flex;align-items:center;gap:16px;padding:6px 0;">' +
      ic.marcaSvg('noite', 96) +
      '        <div><strong class="ds-corpo">Fundo #14112B</strong><p class="ds-legenda">Prisma aquarela dourada #FFC933 &rarr; anil #3346F0 e feixe EAN brilhante.</p></div>' +
      '      </div>' +
      '      <button type="button" class="ds-btn ds-btn-m ' + (state.direcao === 'noite' ? 'ds-btn-secundario' : 'ds-btn-branco') + '" data-wb-direcao="noite">' + (state.direcao === 'noite' ? 'Direção ativa' : 'Ativar Direção A') + '</button>' +
      '    </div>' +
      '    <div class="ds-surface-lg" style="' + (state.direcao === 'solar' ? 'box-shadow:inset 0 0 0 2px #F2B200;' : '') + '">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><strong class="ds-titulo-m">Dir. B · Solar Balcão</strong><span class="ds-pill ds-pill-neutro" style="background:#FFFFFF;">Alternativa</span></div>' +
      '      <div style="display:flex;align-items:center;gap:16px;padding:6px 0;">' +
      ic.marcaSvg('solar', 96) +
      '        <div><strong class="ds-corpo">Fundo #FFC933</strong><p class="ds-legenda">Prisma ink profundo sobre amarelo solar. Máximo destaque sob luz do dia.</p></div>' +
      '      </div>' +
      '      <button type="button" class="ds-btn ds-btn-m ' + (state.direcao === 'solar' ? 'ds-btn-primario' : 'ds-btn-branco') + '" data-wb-direcao="solar">' + (state.direcao === 'solar' ? 'Direção ativa' : 'Ativar Direção B') + '</button>' +
      '    </div>' +
      '    <div class="ds-surface-lg" style="' + (state.direcao === 'aquarela' ? 'box-shadow:inset 0 0 0 2px #3346F0;' : '') + '">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><strong class="ds-titulo-m">Dir. C · Aquarela Editorial</strong><span class="ds-pill ds-pill-anil">Leve &amp; Clara</span></div>' +
      '      <div style="display:flex;align-items:center;gap:16px;padding:6px 0;">' +
      ic.marcaSvg('aquarela', 96) +
      '        <div><strong class="ds-corpo">Fundo #FFF3CC &rarr; Pêssego</strong><p class="ds-legenda">Luz de papel quente com prisma manga + violeta e feixe hortelã #2EC4B6.</p></div>' +
      '      </div>' +
      '      <button type="button" class="ds-btn ds-btn-m ' + (state.direcao === 'aquarela' ? 'ds-btn-secundario' : 'ds-btn-branco') + '" data-wb-direcao="aquarela">' + (state.direcao === 'aquarela' ? 'Direção ativa' : 'Ativar Direção C') + '</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="studio-grid-2">' +
      '    <div class="ds-surface-lg">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
      '        <div><strong class="ds-titulo-l">Simulador de Máscara Android</strong><div class="ds-legenda">Safe-zone 66dp testada em launchers reais · ' + maskRotulo + '</div></div>' +
      '        <div class="wb-seg" aria-label="Formato da máscara Android">' +
      '          <button type="button" class="wb-seg-btn' + (state.maskForma === 'squircle' ? ' is-active' : '') + '" data-wb-mask="squircle">Squircle</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.maskForma === 'circle' ? ' is-active' : '') + '" data-wb-mask="circle">Circular</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.maskForma === 'teardrop' ? ' is-active' : '') + '" data-wb-mask="teardrop">Gota</button>' +
      '        </div>' +
      '      </div>' +
      '      <div class="android-home-mock">' +
      '        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#14112B;"><span>18:42 · Tela inicial Android</span><span>' + dirNome(state.direcao) + '</span></div>' +
      '        <div class="home-app-grid">' +
      '          <div class="home-app-tile"><div class="' + maskCls + '" style="width:60px;height:60px;box-shadow:0 6px 14px rgba(20,17,43,0.18);">' + ic.marcaSvg(state.direcao, 60) + '</div><span style="font-size:12px;font-weight:700;color:#14112B;">Prisma PDV</span></div>' +
      '          <div class="home-app-tile"><div class="home-app-icon-dummy ' + maskCls + '" style="background:#0E7A40;color:#FFFFFF;">WA</div><span style="font-size:12px;color:#4A4766;">WhatsApp</span></div>' +
      '          <div class="home-app-tile"><div class="home-app-icon-dummy ' + maskCls + '" style="background:#3346F0;color:#FFFFFF;">Pix</div><span style="font-size:12px;color:#4A4766;">Banco</span></div>' +
      '          <div class="home-app-tile"><div class="home-app-icon-dummy ' + maskCls + '" style="background:#FFFFFF;color:#14112B;">Cam</div><span style="font-size:12px;color:#4A4766;">Câmera</span></div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="ds-surface-lg">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;"><strong class="ds-titulo-l">Android 13+ Adaptive Mono</strong><span class="ds-pill ds-pill-folha">Material You (even-odd)</span></div>' +
      '      <div style="display:flex;align-items:center;gap:18px;padding:6px 0;">' +
      '        <div class="' + maskCls + '" style="flex-shrink:0;">' + ic.marcaMonocromaticaSvg(88) + '</div>' +
      '        <div style="display:flex;flex-direction:column;gap:6px;">' +
      '          <strong class="ds-corpo">Recorte limpo sem degradê nem borda</strong>' +
      '          <p class="ds-legenda">Usa fill-rule="evenodd" para manter prisma e barras EAN legíveis em qualquer papel de parede no Android 13/14/15.</p>' +
      '        </div>' +
      '      </div>' +
      '      <div style="background:#14112B;color:#FFFFFF;border-radius:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">' +
      '        <div>' + ic.wordmarkHtml({ size: 20, corTexto: '#FFFFFF', corPonto: '#FFC933' }) + '<div class="ds-legenda" style="color:#C8C5DE;margin-top:4px;">Banner Google Play (1024×500) · Offline-first</div></div>' +
      il.svg('scanner', 84) +
      '      </div>' +
      '      <div style="background:#FFFFFF;border-radius:16px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">' +
      ic.wordmarkHtml({ size: 18 }) +
      '        <span class="ds-pill ds-pill-folha">paginasPublicas.ts · LGPD</span>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderVistaTokens() {
    var swatches = [
      { nome: 'ink', hex: '#14112B', desc: 'Títulos e ícones (18.3:1)', bg: '#14112B', borda: false },
      { nome: 'ink-2', hex: '#4A4766', desc: 'Texto secundário (7.9:1)', bg: '#4A4766', borda: false },
      { nome: 'ink-3 (AA)', hex: '#5C5973', desc: '5.4:1 em #EAE7E1', bg: '#5C5973', borda: false },
      { nome: 'bg', hex: '#FFFFFF', desc: 'Fundo principal (Claro)', bg: '#FFFFFF', borda: true },
      { nome: 'surface', hex: '#F4F2EE', desc: 'Cards e inputs planos', bg: '#F4F2EE', borda: false },
      { nome: 'surface-2', hex: '#EAE7E1', desc: 'Trilhos e pressed', bg: '#EAE7E1', borda: false },
      { nome: 'surface-elev', hex: '#FFF / #252142', desc: 'Elevado em Claro e Noturno', bg: '#252142', borda: false },
      { nome: 'manga', hex: '#FFC933', desc: 'CTA primário único (11.9:1)', bg: '#FFC933', borda: false },
      { nome: 'manga-soft', hex: '#FFF3CC', desc: 'Último item / destaque', bg: '#FFF3CC', borda: false },
      { nome: 'anil', hex: '#3346F0', desc: 'Foco e progresso', bg: '#3346F0', borda: false },
      { nome: 'folha', hex: '#0E7A40', desc: 'Pago e sucesso (5.4:1)', bg: '#0E7A40', borda: false },
      { nome: 'ambar', hex: '#A65400', desc: 'Offline e estoque baixo', bg: '#A65400', borda: false },
      { nome: 'pitanga', hex: '#C8102E', desc: 'Remover e perigo (5.9:1)', bg: '#C8102E', borda: false },
      { nome: 'noite', hex: '#0D0B1A', desc: 'Visor e Modo Noturno', bg: '#0D0B1A', borda: false }
    ];
    var paresWcag = [
      { modo: 'Claro', par: 'ink (#14112B) sobre bg (#FFFFFF)', razao: '18.3:1', nivel: 'AAA' },
      { modo: 'Claro', par: 'ink (#14112B) sobre surface (#F4F2EE)', razao: '16.4:1', nivel: 'AAA' },
      { modo: 'Claro', par: 'ink-2 (#4A4766) sobre surface (#F4F2EE)', razao: '7.9:1', nivel: 'AAA' },
      { modo: 'Claro', par: 'ink-3 (#5C5973) sobre surface-2 (#EAE7E1)', razao: '5.4:1', nivel: 'AA' },
      { modo: 'Claro', par: 'ink (#14112B) sobre manga (#FFC933)', razao: '11.9:1', nivel: 'AAA' },
      { modo: 'Claro', par: 'branco (#FFFFFF) sobre folha (#0E7A40)', razao: '5.4:1', nivel: 'AA' },
      { modo: 'Noturno', par: 'ink (#F7F6FC) sobre bg (#0D0B1A)', razao: '18.1:1', nivel: 'AAA' },
      { modo: 'Noturno', par: 'ink (#F7F6FC) sobre surface (#18152E)', razao: '16.5:1', nivel: 'AAA' },
      { modo: 'Noturno', par: 'ink-2 (#C8C5DE) sobre surface-elev (#252142)', razao: '9.1:1', nivel: 'AAA' },
      { modo: 'Noturno', par: 'ink-3 (#9D99B8) sobre surface-elev (#252142)', razao: '5.6:1', nivel: 'AA' },
      { modo: 'Noturno', par: 'folha (#4ADE80) sobre folha-soft (#0F2E1E)', razao: '8.4:1', nivel: 'AAA' },
      { modo: 'Noturno', par: 'anil (#8492FF) sobre anil-soft (#1D2354)', razao: '5.3:1', nivel: 'AA' }
    ];
    var tipos = [
      { nome: 'Display', uso: 'Totais de venda, hero', exemplo: '<span style="font-family:var(--f-display);font-weight:800;font-size:44px;line-height:44px;letter-spacing:-0.02em;" class="tabular">R$ 1.284,50</span>', spec: 'Bricolage Grotesque · 44/44 · 800' },
      { nome: 'Título XL', uso: 'Título de tela', exemplo: '<span style="font-family:var(--f-display);font-weight:800;font-size:32px;line-height:34px;">Vender</span>', spec: 'Bricolage Grotesque · 32/34 · 800' },
      { nome: 'Título L', uso: 'Seções e sheets', exemplo: '<span style="font-family:var(--f-display);font-weight:700;font-size:24px;line-height:28px;">Valor avulso</span>', spec: 'Bricolage Grotesque · 24/28 · 700' },
      { nome: 'Título M', uso: 'Card e destaque', exemplo: '<span style="font-size:18px;font-weight:700;">Café torrado 500g</span>', spec: 'Inter · 18/24 · 700' },
      { nome: 'Corpo L', uso: 'Texto principal', exemplo: '<span style="font-size:17px;">Toque no visor para simular.</span>', spec: 'Inter · 17/24 · 400' },
      { nome: 'Corpo', uso: 'Listas e itens', exemplo: '<span style="font-size:15px;">Arroz tipo 1 5kg · Feijão carioca 1kg</span>', spec: 'Inter · 15/22 · 400/500' },
      { nome: 'Label', uso: 'Rótulos e chips', exemplo: '<span style="font-size:13px;font-weight:600;">Código de barras</span>', spec: 'Inter · 13/18 · 600' },
      { nome: 'Legenda', uso: 'Metadados', exemplo: '<span style="font-size:12px;color:#5C5973;" class="tabular">7890000000017 · Mercadinho Bom Preço</span>', spec: 'Inter · 12/16 · 500' }
    ];
    return (
      '<div class="studio-section">' +
      '  <div>' +
      '    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:20px;">' +
      '      <div><h1 class="ds-display" style="font-size:48px;">Cores, 3 Camadas &amp; WCAG AA/AAA</h1><p class="ds-corpo-l" style="margin-top:6px;">Tinta escura #14112B, papel quente #F4F2EE, acento único Manga (#FFC933) e superfície elevada #252142 no Noturno.</p></div>' +
      '      <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" data-wb-tema-toggle="1">Alternar para ' + (state.tema === 'claro' ? 'Noturno' : 'Claro') + '</button>' +
      '    </div>' +
      '    <div class="swatch-row">' +
      swatches.map(function (s) {
        return (
          '<div class="swatch-item">' +
          '  <div class="swatch-chip" style="background:' + s.bg + ';' + (s.borda ? 'border:1px solid #E2DED6;' : '') + '"></div>' +
          '  <strong style="margin-top:10px;font-size:15px;">' + s.nome + '</strong>' +
          '  <span class="mono" style="font-size:13px;color:#4A4766;">' + s.hex + '</span>' +
          '  <span style="font-size:12px;color:#5C5973;margin-top:2px;">' + s.desc + '</span>' +
          '</div>'
        );
      }).join('') +
      '    </div>' +
      '  </div>' +
      '  <div>' +
      '    <h2 class="ds-titulo-xl" style="margin-bottom:8px;">Matriz de Contraste WCAG (Claro &amp; Noturno)</h2>' +
      '    <p class="ds-corpo-sub" style="margin-bottom:14px;">Todos os 12 pares críticos verificados acima do piso 4.5:1 (inclusive ink-3 e badges no Tema Noturno).</p>' +
      '    <div class="typo-table">' +
      paresWcag.map(function (p) {
        return (
          '<div class="typo-row" style="grid-template-columns:110px 1fr 120px;">' +
          '  <div><span class="ds-pill ' + (p.modo === 'Noturno' ? 'ds-pill-anil' : 'ds-pill-neutro') + '">' + p.modo + '</span></div>' +
          '  <div class="mono" style="font-size:13px;font-weight:600;color:#14112B;">' + p.par + '</div>' +
          '  <div style="display:flex;justify-content:flex-end;gap:6px;align-items:center;"><strong class="tabular">' + p.razao + '</strong><span class="ds-pill ds-pill-folha">' + p.nivel + '</span></div>' +
          '</div>'
        );
      }).join('') +
      '    </div>' +
      '  </div>' +
      '  <div>' +
      '    <h2 class="ds-titulo-xl" style="margin-bottom:8px;">Tipografia Balcão</h2>' +
      '    <p class="ds-corpo-sub" style="margin-bottom:16px;">Bricolage Grotesque para títulos e dinheiro; Inter para interface e leitura longa.</p>' +
      '    <div class="typo-table">' +
      tipos.map(function (t) {
        return '<div class="typo-row"><div><strong>' + t.nome + '</strong><div class="ds-legenda">' + t.uso + '</div></div><div>' + t.exemplo + '</div><div class="ds-label">' + t.spec + '</div></div>';
      }).join('') +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderVistaComponentes() {
    var ic = global.PDVIcones;
    var il = global.PDVIlustra;
    var tipos = il.listarTipos();
    var icones = Object.keys(ic.PATHS);
    return (
      '<div class="studio-section app-tema-' + state.tema + '" data-tema="' + state.tema + '" style="padding:20px;border-radius:24px;">' +
      '  <div class="studio-grid-2">' +
      '    <div class="ds-surface-lg" style="background:var(--bg);border:1px solid var(--line);">' +
      '      <h2 class="ds-titulo-l">Botões, Elevação &amp; Toast com Desfazer</h2>' +
      '      <div style="display:flex;flex-wrap:wrap;gap:10px;">' +
      '        <button type="button" class="ds-btn ds-btn-m ds-btn-primario">Primário Manga</button>' +
      '        <button type="button" class="ds-btn ds-btn-m ds-btn-secundario">Secundário Ink</button>' +
      '        <button type="button" class="ds-btn ds-btn-m ds-btn-terciario">Terciário</button>' +
      '        <button type="button" class="ds-btn ds-btn-m ds-btn-elev">Elevado (--surface-elev)</button>' +
      '        <button type="button" class="ds-btn ds-btn-m ds-btn-perigo">Perigo</button>' +
      '      </div>' +
      '      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">' +
      '        <span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Pago</span>' +
      '        <span class="ds-pill ds-pill-ambar">' + ic.svg('offline', 14) + ' Fila offline</span>' +
      '        <span class="ds-pill ds-pill-pitanga">' + ic.svg('alerta', 14) + ' Cancelada</span>' +
      '        <span class="ds-pill ds-pill-elev">' + ic.svg('pix', 14) + ' Elevado Noturno</span>' +
      '        <span class="ds-codigo-curto">#T-1711-01</span>' +
      '      </div>' +
      '      <div style="background:#14112B;color:#FFFFFF;border-radius:16px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
      '        <span style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;">' + ic.svg('check', 16, '#FFC933', 2.5) + ' Item removido da venda</span>' +
      '        <span class="app-toast-undo-btn" style="display:inline-flex;align-items:center;gap:5px;padding:0 12px;">' + ic.svg('desfazer', 13) + ' Desfazer</span>' +
      '      </div>' +
      '      <div class="ds-surface-md" style="padding:0;">' +
      '        <div class="ds-switch-row"><div><strong class="ds-corpo">Interruptor acessível</strong><div class="ds-legenda">Toque >= 48dp e estado claro</div></div><button type="button" class="ds-switch' + (state.demoSwitch ? ' is-on' : '') + '" data-wb-demo-switch="1" aria-label="Exemplo de interruptor"><div class="ds-switch-thumb"></div></button></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="ds-surface-lg" style="background:var(--bg);border:1px solid var(--line);">' +
      '      <h2 class="ds-titulo-l">BarraInferior, Shimmer &amp; Gráfico</h2>' +
      '      <div class="ds-seg"><button type="button" class="ds-seg-item is-active">Resumo</button><button type="button" class="ds-seg-item">Vendas</button><button type="button" class="ds-seg-item">Movimento</button><button type="button" class="ds-seg-item">Turnos</button></div>' +
      '      <label class="ds-busca">' + ic.svg('lupa', 20) + '<input placeholder="CampoBusca único (consolida 3 versões)"></label>' +
      '      <div class="ds-surface-md" style="gap:8px;"><div class="ds-skel" style="height:18px;width:58%;"></div><div class="ds-skel" style="height:14px;width:36%;"></div></div>' +
      '      <div style="border:1px solid var(--line);border-radius:16px;overflow:hidden;">' +
      '        <div class="ds-bottom-bar">' +
      '          <button type="button" class="ds-tab-btn is-active">' + ic.svg('inicio', 20) + '<span class="ds-tab-label">Início</span><span class="ds-tab-dot"></span></button>' +
      '          <button type="button" class="ds-tab-btn">' + ic.svg('produtos', 20) + '<span class="ds-tab-label">Produtos</span></button>' +
      '          <button type="button" class="ds-fab-vender">' + ic.svg('codigoBarras', 20) + '<span>Vender</span></button>' +
      '          <button type="button" class="ds-tab-btn">' + ic.svg('caixa', 20) + '<span class="ds-tab-label">Caixa</span></button>' +
      '          <button type="button" class="ds-tab-btn">' + ic.svg('ajustes', 20) + '<span class="ds-tab-label">Ajustes</span></button>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <div>' +
      '    <h2 class="ds-titulo-xl" style="margin-bottom:8px;">14 Ilustrações Aquarela 3D (Ilustra.dc.html)</h2>' +
      '    <p class="ds-corpo-sub" style="margin-bottom:16px;">Vetores orgânicos originais do projeto com gradientes radiais e prefixação segura de IDs SVG.</p>' +
      '    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:14px;">' +
      tipos.map(function (k) {
        return '<div class="ds-surface-md" style="align-items:center;text-align:center;">' + il.svg(k, 108) + '<strong class="ds-label" style="color:var(--ink);">' + k + '</strong></div>';
      }).join('') +
      '    </div>' +
      '  </div>' +
      '  <div>' +
      '    <h2 class="ds-titulo-l" style="margin-bottom:14px;">Catálogo de Ícones (' + icones.length + ' · 24×24 stroke-2)</h2>' +
      '    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px;">' +
      icones.map(function (nome) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surface);color:var(--ink);border-radius:12px;font-size:12px;font-weight:600;">' + ic.svg(nome, 18) + '<span>' + nome + '</span></div>';
      }).join('') +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderVistaPrototipo() {
    var core = global.PDVTelasCore;
    var gestao = global.PDVTelasGestao;
    var ic = global.PDVIcones;
    var telaHtml = core.renderTela(state.tela, state) || gestao.renderTela(state.tela, state);
    var insp = core.INSPECTOR[state.tela] || gestao.INSPECTOR[state.tela] || (state.tela === 'caixa-fechar'
      ? {
          jornada: 'J4 · Fechar Caixa (Conferência)',
          arquivo: 'src/telas/caixa/FecharCaixa.tsx',
          mudancas: [
            'CampoPreco mascarado substituindo decimal-pad solto + StatusPill Bateu certinho / Sobra / Falta.',
            'Superfície --surface-elev preserva contraste dos botões e input contado no Tema Noturno.'
          ]
        }
      : { jornada: 'Prisma PDV', arquivo: 'app/', mudancas: [] });

    var navHtml = JORNADAS.map(function (g) {
      return (
        '<div class="proto-group-title">' + g.grupo + '</div>' +
        g.telas.map(function (t) {
          return (
            '<button type="button" class="proto-nav-btn' + (state.tela === t.id ? ' is-active' : '') + '" data-nav="' + t.id + '">' +
            '<span>' + t.nome + '</span>' +
            '<span class="proto-nav-tag">' + t.tag + '</span>' +
            '</button>'
          );
        }).join('')
      );
    }).join('');

    var viewportLabel = state.viewport === 'f18' ? '360×640 · Fonte Ampliada (F18)' : state.viewport === 'tablet' ? '960×676 · Tablet NavigationRail' : '390×844 · Android Balcão';
    var statusCls = state.tela === 'vender' ? ' is-immersive' : state.tela === 'pagar-pix-pago' ? ' is-folha' : '';

    return (
      '<div class="proto-workspace">' +
      '  <aside class="proto-sidebar" aria-label="Jornadas e telas">' + navHtml + '</aside>' +
      '  <section class="proto-stage">' +
      '    <div class="proto-stage-meta">' +
      '      <span class="proto-meta-chip">' + ic.svg(state.viewport === 'tablet' ? 'tablet' : 'celular', 14) + ' ' + viewportLabel + '</span>' +
      '      <span class="proto-meta-chip">' + ic.svg(state.tema === 'escuro' ? 'lua' : 'sol', 14) + ' Tema ' + (state.tema === 'escuro' ? 'Noturno' : 'Claro') + '</span>' +
      '      <span class="proto-meta-chip">Marca: ' + dirNome(state.direcao) + '</span>' +
      (state.harden ? '<span class="proto-meta-chip" style="background:var(--manga-soft);color:#14112B;">Harden: Dados Extremos</span>' : '') +
      '    </div>' +
      '    <div class="device-bezel" data-viewport="' + state.viewport + '">' +
      '      <div class="app-screen-frame" data-tema="' + state.tema + '">' +
      '        <div class="android-statusbar' + statusCls + '"><span>18:42</span><span>' + (state.offline ? 'Sem rede' : '4G') + ' · 89%</span></div>' +
      telaHtml +
      gestao.renderSheet(state) +
      (state.toast
        ? '<div class="app-toast" role="status" aria-live="polite">' +
          '  <span style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">' + ic.svg('check', 16, '#FFC933', 2.5) + '<span class="ds-truncate">' + core.esc(state.toast) + '</span></span>' +
          (state.toastUndo && state.ultimoRemovido
            ? '<button type="button" class="app-toast-undo-btn" data-action="desfazer-remocao">' + ic.svg('desfazer', 13) + ' Desfazer</button>'
            : '') +
          '</div>'
        : '') +
      '      </div>' +
      '    </div>' +
      '  </section>' +
      '  <aside class="proto-inspector">' +
      '    <div><span class="ds-pill ds-pill-anil">v0.1 &rarr; v2.2 Balcão</span></div>' +
      '    <div><h3 class="ds-titulo-m">' + insp.jornada + '</h3><div class="ds-legenda mono">' + insp.arquivo + '</div></div>' +
      '    <div class="inspector-card">' +
      '      <strong class="ds-label" style="color:var(--ink);">Melhorias nesta tela</strong>' +
      '      <ul class="inspector-list">' + insp.mudancas.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>' +
      '    </div>' +
      '    <div class="inspector-card">' +
      '      <strong class="ds-label" style="color:var(--ink);">Testar cenários rápidos</strong>' +
      '      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">' +
      '        <button type="button" class="ds-chip' + (state.viewport === 'padrao' ? ' is-active' : '') + '" data-wb-viewport="padrao">390×844</button>' +
      '        <button type="button" class="ds-chip' + (state.viewport === 'f18' ? ' is-active' : '') + '" data-wb-viewport="f18">F18 (Fonte 2x)</button>' +
      '        <button type="button" class="ds-chip' + (state.viewport === 'tablet' ? ' is-active' : '') + '" data-wb-viewport="tablet">Tablet Rail</button>' +
      '        <button type="button" class="ds-chip' + (state.harden ? ' is-active' : '') + '" data-action="toggle-harden">Dados Extremos</button>' +
      '        <button type="button" class="ds-chip' + (state.offline ? ' is-active' : '') + '" data-action="toggle-offline">' + (state.offline ? 'Voltar Online' : 'Simular Offline') + '</button>' +
      '        <button type="button" class="ds-chip' + (state.contaPausada ? ' is-active' : '') + '" data-action="toggle-pausa">' + (state.contaPausada ? 'Remover Pausa' : 'AvisoDePausa') + '</button>' +
      '        <button type="button" class="ds-chip" data-nav="pagar-dividir">Dividir</button>' +
      '        <button type="button" class="ds-chip" data-nav="pagar-tap">Tap &amp; Stone</button>' +
      '        <button type="button" class="ds-chip" data-nav="produto-novo">Novo + ODbL</button>' +
      '        <button type="button" class="ds-chip" data-nav="relatorios">Gráfico 7d</button>' +
      '      </div>' +
      '    </div>' +
      '  </aside>' +
      '</div>'
    );
  }

  function renderVistaOndas() {
    var diffs = [
      {
        titulo: 'J1 · Onboarding OTP & Recebimentos Alinhados ao MVP (CP 159)',
        antes: 'Salto de contagem ("2/6 -> 5/6"), reenvio zerava formulário e recebimentos citavam provedores genéricos fora do escopo.',
        depois: 'Passos "1 de 5" a "5 de 5" com barra anil, OTP preserva dados e Recebimentos reflete MP (Pix), InfinitePay (Pix/Tap), Stone (manual) e Dinheiro/Fiado.'
      },
      {
        titulo: 'Harden + F18 · Dados Extremos, Nomes Longos & Botões em 360dp',
        antes: 'Totais de 8 dígitos ("R$ 148.920,50"), nomes extensos de loja/produto e telas fixas quebravam cards e sobrepunham o TecladoNumerico em 360dp (fontScale 2.0).',
        depois: 'Modo Harden valida clamp/truncate seguro, `.is-compact-num` evita estouro de display e scroll fluido + teclado 44px mantêm troco e CTA sempre clicáveis.'
      },
      {
        titulo: 'Clarify & Operate · Lacunas Críticas de Balcão (+6 Novas Telas)',
        antes: 'Faltavam busca manual + EAN no Vender, dividir pagamento, recuperação anti-cobrança dupla no Tap, celebração #0E7A40 de Pix, lista de vendas expansível e cascata ODbL-1.0.',
        depois: '32 telas completas cobrindo Vender-Busca, Dividir, Tap/Recovery/Stone manual, Pix Pago tela cheia, Recibo + QR/WhatsApp, Caixa-Vendas acordeão e Novo Produto ODbL+Margem.'
      },
      {
        titulo: 'Dark Surface & Motion · Superfície Elevada (--surface-elev) & Undo',
        antes: 'Chips/botões claros hardcoded (#FFFFFF) estouravam no Tema Noturno; remover item da sacola não tinha reversão e sync finalizava instantaneamente.',
        depois: '`--surface-elev` (#252142 no Noturno) corrige 100% dos cards aninhados; remover item aciona Toast com botão Desfazer e Sync anima progresso antes de concluir.'
      }
    ];
    var ondas = [
      { w: 'W0 · Marca & Play Store', escopo: 'Ícone Prisma em 3 direções (Noite/Solar/Aquarela), Adaptive Mono even-odd, máscara Android, Banner 1024×500 e paginasPublicas.ts.' },
      { w: 'W1 · Tokens, Dark Surface & F18', escopo: 'Tokens 3 camadas em @pdv/shared, --surface-elev, ink3 AA (5.4:1), Harden overflow/clamp e fixes TelaDinheiro/BarraInferior/ResumoCaixa.' },
      { w: 'W2 · Átomos, Undo & Motion', escopo: 'CampoBusca único, Toast com Desfazer, shimmer/skeleton com prefers-reduced-motion, ODbL-1.0 >=44dp e calc. margem Custo/Venda.' },
      { w: 'W3 · Jornadas Completas (32 telas)', escopo: 'Busca rápida, Dividir pagamento, Tap + Stone manual + recovery, Caixa Vendas acordeão, Relatórios c/ gráfico 7d e Tablet Rail.' },
      { w: 'W4 · Integrações & Campo Android', escopo: 'Plug-in E2–E4 com telas validadas + inspeção física em Theme Light/Dark e fontScale 2.0 no Samsung F18 e Motorola G24.' }
    ];
    return (
      '<div class="studio-section">' +
      '  <div>' +
      '    <h1 class="ds-display" style="font-size:48px;">Antes &times; Depois &amp; Ondas (v2.2)</h1>' +
      '    <p class="ds-corpo-l" style="margin-top:6px;">Evolução completa com /impeccable (Harden, Delight, Animate, Clarify) e /ui-ux-pro-max (Dark Surface, WCAG, Gráficos 7d) + alinhamento CP 159/161.</p>' +
      '  </div>' +
      '  <div style="display:flex;flex-direction:column;gap:14px;">' +
      diffs.map(function (d) {
        return (
          '<div class="ds-surface-lg">' +
          '  <strong class="ds-titulo-m">' + d.titulo + '</strong>' +
          '  <div class="studio-grid-2">' +
          '    <div class="compare-box" style="background:#FDE3E6;"><strong class="ds-label" style="color:#C8102E;">Antes (0.1.18 / v2.0)</strong><p class="ds-corpo" style="margin-top:4px;">' + d.antes + '</p></div>' +
          '    <div class="compare-box" style="background:#DDF5E7;"><strong class="ds-label" style="color:#0E7A40;">Proposto (v2.2 Balcão)</strong><p class="ds-corpo" style="margin-top:4px;">' + d.depois + '</p></div>' +
          '  </div>' +
          '</div>'
        );
      }).join('') +
      '  </div>' +
      '  <div>' +
      '    <h2 class="ds-titulo-xl" style="margin-bottom:14px;">Ondas de Execução (W0–W4)</h2>' +
      '    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;">' +
      ondas.map(function (o) {
        return '<div class="ds-surface-md"><strong class="ds-titulo-m">' + o.w + '</strong><p class="ds-corpo-sub">' + o.escopo + '</p></div>';
      }).join('') +
      '    </div>' +
      '  </div>' +
      '</div>'
    );
  }

  function renderTopShell() {
    var ic = global.PDVIcones;
    var abas = [
      { id: 'prototipo', num: '1', nome: 'Protótipo Interativo (32 telas)' },
      { id: 'marca', num: '2', nome: 'Marca & Play Store' },
      { id: 'tokens', num: '3', nome: 'Fundamentos & Tokens' },
      { id: 'componentes', num: '4', nome: 'Componentes & Aquarelas' },
      { id: 'ondas', num: '5', nome: 'Antes × Depois & Ondas' }
    ];
    return (
      '<div class="wb-shell">' +
      '  <header class="wb-header">' +
      '    <div class="wb-header-top">' +
      '      <div class="wb-brand">' +
      ic.marcaSvg(state.direcao, 42) +
      '        <div class="wb-brand-meta">' +
      '          <div class="wb-brand-row">' +
      ic.wordmarkHtml({ size: 24 }) +
      '            <span class="wb-badge">Balcão v2.2</span>' +
      '          </div>' +
      '          <div class="wb-sub">32 telas + 7 sheets + 14 aquarelas 3D · /impeccable + /ui-ux-pro-max · Produção intacta</div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="wb-controls">' +
      '        <div class="wb-seg" aria-label="Viewport">' +
      '          <button type="button" class="wb-seg-btn' + (state.viewport === 'padrao' ? ' is-active' : '') + '" data-wb-viewport="padrao">390×844</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.viewport === 'f18' ? ' is-active' : '') + '" data-wb-viewport="f18">F18 · 360+2x</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.viewport === 'tablet' ? ' is-active' : '') + '" data-wb-viewport="tablet">Tablet · 960</button>' +
      '        </div>' +
      '        <div class="wb-seg" aria-label="Tema">' +
      '          <button type="button" class="wb-seg-btn' + (state.tema === 'claro' ? ' is-active' : '') + '" data-wb-tema="claro">' + ic.svg('sol', 14) + ' Claro</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.tema === 'escuro' ? ' is-active' : '') + '" data-wb-tema="escuro">' + ic.svg('lua', 14) + ' Noturno</button>' +
      '        </div>' +
      '        <div class="wb-seg" aria-label="Direção da Marca">' +
      '          <button type="button" class="wb-seg-btn' + (state.direcao === 'noite' ? ' is-active-manga' : '') + '" data-wb-direcao="noite">Dir. A Noite</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.direcao === 'solar' ? ' is-active-manga' : '') + '" data-wb-direcao="solar">Dir. B Solar</button>' +
      '          <button type="button" class="wb-seg-btn' + (state.direcao === 'aquarela' ? ' is-active-manga' : '') + '" data-wb-direcao="aquarela">Dir. C Aquarela</button>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <nav class="wb-tabs-wrap" aria-label="Áreas do estúdio">' +
      abas.map(function (a) {
        return '<button type="button" class="wb-tab' + (state.vista === a.id ? ' is-active' : '') + '" data-wb-vista="' + a.id + '"><span class="wb-tab-num">' + a.num + '</span> ' + a.nome + '</button>';
      }).join('') +
      '    </nav>' +
      '  </header>' +
      '  <main class="wb-main">' +
      (state.vista === 'marca' ? renderVistaMarca() :
       state.vista === 'tokens' ? renderVistaTokens() :
       state.vista === 'componentes' ? renderVistaComponentes() :
       state.vista === 'ondas' ? renderVistaOndas() :
       renderVistaPrototipo()) +
      '  </main>' +
      '</div>'
    );
  }

  function concluirVenda(meio, destTela) {
    var total = state.carrinho.reduce(function (acc, item) { return acc + Math.round(item.preco * item.qtd); }, 0);
    var troco = meio === 'Dinheiro' ? Math.max(0, state.dinheiroRecebido - total) : 0;
    state.caixaQtdVendas += 1;
    state.caixaVendasCentavos += total;
    if (meio === 'Dinheiro') state.caixaDinheiro += total;
    else if (meio.indexOf('Pix') === 0) state.caixaPix += total;
    else if (meio.indexOf('Cartão') === 0 || meio.indexOf('Stone') !== -1 || meio === 'Dividido') state.caixaCartao += total;
    else if (meio === 'Fiado' && state.clientesFiado[state.clienteFiadoIdx]) {
      state.clientesFiado[state.clienteFiadoIdx].saldo += total;
    }
    var numStr = '#000' + (231 + state.caixaQtdVendas - 47);
    state.ultimaVenda = { valor: total, meio: meio, troco: troco, codigo: numStr };
    state.qrReciboAberto = false;
    state.parcelasDivididas = DEFAULT_PARCELAS.map(function (p) { return Object.assign({}, p); });
    navigateTo(destTela || 'sucesso');
  }

  function removeItemComUndo(idx) {
    if (idx < 0 || idx >= state.carrinho.length) return;
    var removed = state.carrinho.splice(idx, 1)[0];
    state.ultimoRemovido = { item: Object.assign({}, removed), idx: idx };
    showToast('Removido: ' + removed.nome, true);
  }

  function handleAction(el) {
    var action = el.getAttribute('data-action');
    var valor = el.getAttribute('data-valor');
    var idx = Number(el.getAttribute('data-idx'));

    if (action === 'reenviar-otp') {
      state.otpReenviado = true;
      showToast('Novo código enviado sem perder seus dados!');
    } else if (action === 'set-segmento') {
      state.segmentoLoja = valor;
    } else if (action === 'toggle-meio') {
      var pos = state.meiosAtivos.indexOf(valor);
      if (pos === -1) state.meiosAtivos.push(valor);
      else state.meiosAtivos.splice(pos, 1);
    } else if (action === 'finalizar-onboarding') {
      state.permissaoCamera = 'concedida';
      navigateTo('inicio');
      showToast('7 dias grátis do Plano Pro liberados!');
    } else if (action === 'bipar-arroz') {
      state.ultimoBip = '7890000000048';
      var achado = state.carrinho.filter(function (c) { return c.nome.indexOf('Café') === 0; })[0];
      if (achado) achado.qtd += 1;
      else state.carrinho.unshift({ nome: 'Café torrado 500g', preco: 1990, qtd: 1, unidade: 'un' });
      triggerBipFlash();
      showToast('Bip! Café torrado 500g adicionado');
    } else if (action === 'bipar-gelo') {
      var gelo = state.carrinho.filter(function (c) { return c.nome.indexOf('Saco de gelo') === 0; })[0];
      if (gelo) gelo.qtd += 1;
      else state.carrinho.unshift({ nome: 'Saco de gelo 5kg', preco: 1200, qtd: 1, unidade: 'un' });
      showToast('Saco de gelo 5kg adicionado');
    } else if (action === 'toggle-lanterna') {
      state.lanterna = !state.lanterna;
    } else if (action === 'toggle-leitor-pausa') {
      state.leitorPausado = !state.leitorPausado;
    } else if (action === 'cart-inc') {
      var itInc = state.carrinho[idx];
      if (itInc) itInc.qtd = Math.round((itInc.qtd + (itInc.unidade === 'kg' ? 0.1 : 1)) * 1000) / 1000;
    } else if (action === 'cart-plus5') {
      var it5 = state.carrinho[idx];
      if (it5) it5.qtd = Math.round((it5.qtd + (it5.unidade === 'kg' ? 0.5 : 5)) * 1000) / 1000;
    } else if (action === 'cart-dec') {
      var itDec = state.carrinho[idx];
      if (itDec) {
        itDec.qtd = Math.round((itDec.qtd - (itDec.unidade === 'kg' ? 0.1 : 1)) * 1000) / 1000;
        if (itDec.qtd <= 0.01) removeItemComUndo(idx);
      }
    } else if (action === 'cart-del') {
      removeItemComUndo(idx);
    } else if (action === 'desfazer-remocao') {
      if (state.ultimoRemovido) {
        var posIns = Math.min(state.ultimoRemovido.idx, state.carrinho.length);
        state.carrinho.splice(posIns, 0, state.ultimoRemovido.item);
        state.ultimoRemovido = null;
      }
      state.toastUndo = false;
      state.toast = null;
      if (toastTimer) clearTimeout(toastTimer);
    } else if (action === 'limpar-busca-vender') {
      state.buscaVender = '';
    } else if (action === 'add-prod-busca') {
      var pNome = el.getAttribute('data-nome');
      var pPreco = Number(el.getAttribute('data-preco'));
      var pUni = el.getAttribute('data-unidade') || 'un';
      var exist = state.carrinho.filter(function (c) { return c.nome === pNome; })[0];
      if (exist) exist.qtd += exist.unidade === 'kg' ? 0.25 : 1;
      else state.carrinho.unshift({ nome: pNome, preco: pPreco, qtd: 1, unidade: pUni });
      navigateTo('vender');
      showToast(pNome + ' adicionado à venda');
    } else if (action === 'abrir-sheet') {
      state.sheet = el.getAttribute('data-sheet');
    } else if (action === 'fechar-sheet' || action === 'fechar-sheet-bg') {
      state.sheet = null;
    } else if (action === 'set-avulso-cat') {
      state.avulsoCat = valor;
    } else if (action === 'keypad-avulso') {
      var ka = el.getAttribute('data-key');
      var ca = String(state.avulsoCentavos);
      if (ka === 'apagar') ca = ca.length > 1 ? ca.slice(0, -1) : '0';
      else ca = (ca === '0' ? '' : ca) + ka;
      state.avulsoCentavos = Math.min(9999999, Number(ca) || 0);
    } else if (action === 'add-avulso-valor') {
      state.carrinho.unshift({ nome: state.avulsoCat + ' (avulso)', preco: state.avulsoCentavos, qtd: 1, unidade: 'un' });
      state.sheet = null;
      showToast('Item avulso adicionado!');
    } else if (action === 'add-peso') {
      var kg = Number(el.getAttribute('data-kg'));
      state.carrinho.unshift({ nome: 'Pão francês (' + kg.toFixed(3).replace('.', ',') + ' kg)', preco: 1690, qtd: kg, unidade: 'kg' });
      state.sheet = null;
      showToast('Item por peso adicionado!');
    } else if (action === 'salvar-cadastro-rapido') {
      var novoRap = { nome: 'Achocolatado 400g', ean: '7891000315507', preco: 949, unidade: 'un', estoque: 12, atalho: false };
      state.produtos.unshift(novoRap);
      state.carrinho.unshift({ nome: novoRap.nome, preco: novoRap.preco, qtd: 1, unidade: 'un' });
      state.sheet = null;
      showToast('Achocolatado 400g salvo e bipado!');
    } else if (action === 'toggle-itens-checkout') {
      state.itensCheckoutAbertos = !state.itensCheckoutAbertos;
    } else if (action === 'set-prov-pix') {
      state.provedorPix = valor;
    } else if (action === 'quitar-divisao') {
      var totalDiv = state.carrinho.reduce(function (acc, item) { return acc + Math.round(item.preco * item.qtd); }, 0);
      var pagoAte = state.parcelasDivididas.reduce(function (s, p) { return s + p.val; }, 0);
      var restoDiv = Math.max(0, totalDiv - pagoAte);
      if (restoDiv > 0) {
        state.parcelasDivididas.push({
          meio: el.getAttribute('data-meio') || 'Pix',
          ic: el.getAttribute('data-ic') || 'pix',
          val: restoDiv
        });
      }
      showToast('Parcela adicionada!');
    } else if (action === 'consultar-tap') {
      state.tapConsultado = true;
      showToast('Status verificado: sem duplicidade!');
    } else if (action === 'set-tap-modo') {
      state.tapModo = valor;
      if (valor === 'esperando') state.tapConsultado = false;
    } else if (action === 'pix-pago') {
      var provNome = state.provedorPix === 'mercadopago' ? 'Pix · Mercado Pago' : 'Pix · InfinitePay';
      concluirVenda(provNome, 'pagar-pix-pago');
    } else if (action === 'toggle-qr-recibo') {
      state.qrReciboAberto = !state.qrReciboAberto;
    } else if (action === 'select-fiado-cli') {
      state.clienteFiadoIdx = idx;
    } else if (action === 'dinheiro-preset') {
      state.dinheiroRecebido = Number(valor);
    } else if (action === 'keypad-dinheiro') {
      var k = el.getAttribute('data-key');
      var cur = String(state.dinheiroRecebido);
      if (k === 'apagar') cur = cur.length > 1 ? cur.slice(0, -1) : '0';
      else cur = (cur === '0' ? '' : cur) + k;
      state.dinheiroRecebido = Math.min(9999999, Number(cur) || 0);
    } else if (action === 'concluir-venda') {
      concluirVenda(el.getAttribute('data-meio') || 'Dinheiro', 'sucesso');
    } else if (action === 'nova-venda') {
      state.carrinho = DEFAULT_CARRINHO.map(function (c) { return Object.assign({}, c); });
      state.parcelasDivididas = DEFAULT_PARCELAS.map(function (p) { return Object.assign({}, p); });
      state.qrReciboAberto = false;
      state.tapModo = 'esperando';
      state.tapConsultado = false;
      navigateTo('vender');
    } else if (action === 'set-filtro-vendas') {
      state.filtroVendas = valor;
    } else if (action === 'toggle-venda-det') {
      var vid = el.getAttribute('data-id');
      state.vendaAbertaId = state.vendaAbertaId === vid ? null : vid;
    } else if (action === 'ir-sangria') {
      state.movTipo = 'sangria';
      state.movMotivo = 'Depósito no cofre';
      navigateTo('caixa-movimento');
    } else if (action === 'set-mov-tipo') {
      state.movTipo = valor;
      state.movMotivo = valor === 'entrada' ? 'Troco em cédulas' : 'Depósito no cofre';
    } else if (action === 'mov-preset') {
      state.movValorCentavos = Number(valor);
    } else if (action === 'salvar-movimento') {
      if (state.movTipo === 'entrada') state.caixaEntradas += state.movValorCentavos;
      else state.caixaSangrias += state.movValorCentavos;
      navigateTo('caixa-resumo');
      showToast('Movimento registrado no turno!');
    } else if (action === 'set-contado') {
      state.fechamentoContado = Number(valor);
    } else if (action === 'set-filtro-prod') {
      state.filtroProdutos = valor;
    } else if (action === 'simular-shimmer') {
      state.cadBuscando = !state.cadBuscando;
    } else if (action === 'set-novo-venda') {
      state.novoVenda = Number(valor);
    } else if (action === 'add-novo-est') {
      state.novoEstoque = Math.max(0, state.novoEstoque + Number(el.getAttribute('data-delta')));
    } else if (action === 'salvar-produto-novo') {
      var np = {
        nome: state.novoNome || 'Novo produto',
        ean: '7891000315507',
        preco: state.novoVenda,
        unidade: 'un',
        estoque: state.novoEstoque,
        atalho: false
      };
      state.produtos.unshift(np);
      navigateTo('produtos');
      showToast(np.nome + ' salvo no catálogo!');
    } else if (action === 'abrir-estoque-mov') {
      state.sheetIdx = idx;
      state.sheet = 'estoque-mov';
    } else if (action === 'ajustar-estoque-delta') {
      var prod = state.produtos[state.sheetIdx];
      if (prod) prod.estoque = Math.max(0, prod.estoque + Number(el.getAttribute('data-delta')));
      state.sheet = null;
      showToast('Estoque atualizado!');
    } else if (action === 'abrir-fiado-receber') {
      state.sheetIdx = idx;
      state.sheet = 'fiado-receber';
    } else if (action === 'quitar-fiado') {
      var cli = state.clientesFiado[state.sheetIdx];
      if (cli) cli.saldo = el.getAttribute('data-modo') === 'total' ? 0 : Math.floor(cli.saldo / 2);
      state.sheet = null;
      showToast('Recebimento registrado no fiado!');
    } else if (action === 'set-periodo-rel') {
      state.periodoRelatorio = valor;
    } else if (action === 'set-periodo-sheet') {
      state.periodoRelatorio = valor;
      state.sheet = null;
    } else if (action === 'select-rel-dia') {
      state.relDiaIdx = idx;
    } else if (action === 'set-aba-equipe') {
      state.abaEquipe = valor;
    } else if (action === 'set-aba-suporte') {
      state.abaSuporte = valor;
    } else if (action === 'sincronizar-agora') {
      state.syncEmAndamento = true;
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        state.syncEmAndamento = false;
        state.filaSync = 0;
        state.offline = false;
        showToast('Tudo sincronizado na nuvem!');
        render();
      }, 900);
    } else if (action === 'toggle-tema') {
      state.tema = state.tema === 'claro' ? 'escuro' : 'claro';
    } else if (action === 'toggle-harden') {
      state.harden = !state.harden;
      showToast(state.harden ? 'Harden ON: textos e totais extremos' : 'Harden OFF: dados padrão');
    } else if (action === 'toggle-offline') {
      state.offline = !state.offline;
      if (state.offline && state.filaSync === 0) state.filaSync = 3;
    } else if (action === 'toggle-pausa') {
      state.contaPausada = !state.contaPausada;
    } else if (action === 'copiar') {
      showToast('Código Pix copiado!');
    } else if (action === 'toast') {
      showToast(el.getAttribute('data-msg') || 'Concluído!');
    }
  }

  function render() {
    var root = document.getElementById('studio-root');
    if (!root) return;
    var active = document.activeElement;
    var focusKey = active && active.getAttribute ? active.getAttribute('data-input') : null;
    var caret = focusKey && typeof active.selectionStart === 'number' ? active.selectionStart : null;

    var prevSidebar = root.querySelector('.proto-sidebar');
    var sidebarTop = prevSidebar ? prevSidebar.scrollTop : 0;
    var prevAppScroll = root.querySelector('[data-scroll-area="app"]');
    var appTop = state.animarTela ? 0 : (prevAppScroll ? prevAppScroll.scrollTop : 0);

    root.innerHTML = renderTopShell();
    state.animarTela = false;

    var nextSidebar = root.querySelector('.proto-sidebar');
    if (nextSidebar && sidebarTop > 0) nextSidebar.scrollTop = sidebarTop;
    var nextAppScroll = root.querySelector('[data-scroll-area="app"]');
    if (nextAppScroll && appTop > 0) nextAppScroll.scrollTop = appTop;

    if (focusKey) {
      var restored = root.querySelector('[data-input="' + focusKey + '"]');
      if (restored) {
        restored.focus();
        if (caret !== null && typeof restored.setSelectionRange === 'function') {
          try { restored.setSelectionRange(caret, caret); } catch (e) {}
        }
      }
    }
  }

  function init() {
    var root = document.getElementById('studio-root');
    if (!root) return;

    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-wb-vista],[data-wb-viewport],[data-wb-tema],[data-wb-tema-toggle],[data-wb-direcao],[data-wb-mask],[data-wb-demo-switch],[data-nav],[data-action]');
      if (!el) return;

      if (el.hasAttribute('data-wb-vista')) {
        state.vista = el.getAttribute('data-wb-vista');
      } else if (el.hasAttribute('data-wb-viewport')) {
        state.viewport = el.getAttribute('data-wb-viewport');
        state.vista = 'prototipo';
      } else if (el.hasAttribute('data-wb-tema')) {
        state.tema = el.getAttribute('data-wb-tema');
      } else if (el.hasAttribute('data-wb-tema-toggle')) {
        state.tema = state.tema === 'claro' ? 'escuro' : 'claro';
      } else if (el.hasAttribute('data-wb-direcao')) {
        state.direcao = el.getAttribute('data-wb-direcao');
      } else if (el.hasAttribute('data-wb-mask')) {
        state.maskForma = el.getAttribute('data-wb-mask');
      } else if (el.hasAttribute('data-wb-demo-switch')) {
        state.demoSwitch = !state.demoSwitch;
      } else if (el.hasAttribute('data-nav')) {
        navigateTo(el.getAttribute('data-nav'));
        state.vista = 'prototipo';
      } else if (el.hasAttribute('data-action')) {
        handleAction(el);
      }
      render();
    });

    root.addEventListener('input', function (e) {
      var key = e.target.getAttribute('data-input');
      if (!key) return;
      state[key] = e.target.value;
      if (key === 'buscaProdutos' || key === 'buscaVender' || key === 'novoNome') render();
    });

    render();
  }

  global.PDVWorkbench = {
    init: init,
    render: render,
    state: state
  };
})(window);
