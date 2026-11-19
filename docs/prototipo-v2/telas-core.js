/* ==========================================================================
   Prisma PDV — Telas Core v2.2 (Jornadas J1 a J3: 18 Telas)
   J1: Onboarding (7) | J2: Início, Vender & Busca (3) | J3: Cobrar, Dividir, Tap, Pix Pago & Recibo (8)
   ========================================================================== */
(function (global) {
  'use strict';

  function money(centavos) {
    var v = (Number(centavos || 0) / 100).toFixed(2).replace('.', ',');
    var partes = v.split(',');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  }

  function moneyRaw(centavos) {
    var v = (Number(centavos || 0) / 100).toFixed(2).replace('.', ',');
    var partes = v.split(',');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.join(',');
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var INSPECTOR = {
    'boas-vindas': {
      jornada: 'J1 · Boas-vindas & Marca',
      arquivo: 'app/(auth)/boas-vindas.tsx',
      mudancas: [
        'Restaura layout Balcão: ilustra aquarela 3D Cesta, Bricolage Grotesque 44px e CTA manga 56px.',
        'Wordmark Prisma. e promessa do Plano Único Pro (7 dias grátis, depois R$ 49,90/mês).'
      ]
    },
    'criar-conta-dados': {
      jornada: 'J1 · Criar Conta (1 de 5)',
      arquivo: 'app/(auth)/criar-conta.tsx',
      mudancas: [
        'Passos sequenciais reais ("1 de 5" até "5 de 5") eliminando salto "2 de 6 -> 5 de 6".',
        'Inputs #F4F2EE 56px planos com foco anil #3346F0.'
      ]
    },
    'criar-conta-otp': {
      jornada: 'J1 · Código OTP (2 de 5)',
      arquivo: 'app/(auth)/criar-conta.tsx',
      mudancas: [
        'Solicitar outro código não apaga nome nem e-mail; preserva formulário e anuncia via status.'
      ]
    },
    loja: {
      jornada: 'J1 · Nome da Loja (3 de 5)',
      arquivo: 'app/(auth)/loja.tsx',
      mudancas: [
        'Chips pílula acessíveis para ramo de comércio e barra de progresso anil contínua.'
      ]
    },
    recebimentos: {
      jornada: 'J1 · Provedores & Recebimentos (4 de 5)',
      arquivo: 'app/(auth)/pagamentos.tsx',
      mudancas: [
        'Alinhado ao CP 159/N2-N3: Mercado Pago (Pix webhook + Point), InfinitePay (Checkout + Tap), Stone / Maquininha (confirmação manual identificada), Dinheiro e Fiado.'
      ]
    },
    camera: {
      jornada: 'J1 · Câmera (5 de 5)',
      arquivo: 'app/(auth)/camera.tsx',
      mudancas: [
        'Ilustração Scanner 3D 184px + 3 benefícios com ícones circulares 44px antes da permissão nativa.'
      ]
    },
    entrar: {
      jornada: 'J1 · Acesso rápido',
      arquivo: 'app/(auth)/entrar.tsx',
      mudancas: [
        'Reconhecimento da loja local no aparelho com entrada em 1 toque.'
      ]
    },
    inicio: {
      jornada: 'J2 · Início (Home Balcão)',
      arquivo: 'app/(tabs)/index.tsx',
      mudancas: [
        'Sem CTA duplicado de Vender; usa .ds-clamp-2 e display responsivo no modo Dados Extremos (Harden).',
        'Atalhos para Estoque, Fiado, Relatórios e Cadastro bipando; NavigationRail ativo em Tablet >= 840dp.'
      ]
    },
    vender: {
      jornada: 'J2 · Vender (Visor + Sacola)',
      arquivo: 'src/telas/vender/TelaVender.tsx',
      mudancas: [
        'Remover item aciona Toast com botão Desfazer (Undo) de 1 toque.',
        'Card #FFF3CC pulsa ao bipar; toques na busca abrem tela dedicada vender-busca.',
        'Botões internos usam token --surface-elev sem estouro branco no Modo Noturno.'
      ]
    },
    'vender-busca': {
      jornada: 'J2 · Busca Rápida & EAN Direto',
      arquivo: 'src/telas/vender/TelaBusca.tsx',
      mudancas: [
        'Campo em foco anil #3346F0, sugestão imediata de consulta por EAN quando digita números e adição em 1 toque.',
        'Estado vazio orientado pela ilustra aquarela Busca e botão para cadastrar produto.'
      ]
    },
    checkout: {
      jornada: 'J3 · Cobrar (Checkout)',
      arquivo: 'src/telas/pagar/TelaCheckout.tsx',
      mudancas: [
        'Lista unificada: Pix (Mercado Pago / InfinitePay), Cartão / Aproximação, Dinheiro, Dividir pagamento e Fiado (P3).'
      ]
    },
    'pagar-dividir': {
      jornada: 'J3 · Dividir Pagamento (Novo)',
      arquivo: 'src/telas/pagar/TelaDividir.tsx',
      mudancas: [
        'Progresso #3346F0 mostra valor já pago vs restante em tempo real e permite compor parcelas entre meios (incluindo entrada + Fiado).'
      ]
    },
    'pagar-tap': {
      jornada: 'J3 · Cartão / Tap & Recuperação (Novo)',
      arquivo: 'src/telas/pagar/TelaCartao.tsx',
      mudancas: [
        'Passos transparentes durante InfiniteTap/MP Tap + fluxo de recuperação ("Voltei sem confirmação") exigindo consulta de status antes de cobrar duas vezes.',
        'Inclui registro manual identificado (ex.: Stone / maquininha avulsa) conforme CP 159.'
      ]
    },
    'pagar-dinheiro': {
      jornada: 'J3 · Dinheiro & Troco (Fix F18)',
      arquivo: 'src/telas/pagar/TelaDinheiro.tsx',
      mudancas: [
        'Banner verde Folha com troco em Bricolage 24px sempre legível + teclado 44px em F18.'
      ]
    },
    'pagar-pix': {
      jornada: 'J3 · Pix na Hora',
      arquivo: 'src/telas/pagar/TelaPix.tsx',
      mudancas: [
        'QR Code de alta legibilidade, cópia rápida com feedback e simulação de webhook confirmado -> tela Pix Pago.'
      ]
    },
    'pagar-pix-pago': {
      jornada: 'J3 · Celebração Pix Recebido (Novo)',
      arquivo: 'src/telas/pagar/TelaPix.tsx',
      mudancas: [
        'Tela cheia verde #0E7A40 com ilustra Check 3D confirmando autorização bancária sem precisar conferir celular do cliente.'
      ]
    },
    'pagar-fiado': {
      jornada: 'J3 · Anotar no Fiado',
      arquivo: 'src/telas/pagar/TelaCheckout.tsx + Fiado.tsx',
      mudancas: [
        'Vínculo com saldo atual do cliente em #F4F2EE 16px sem UUIDs expostos.'
      ]
    },
    sucesso: {
      jornada: 'J3 · Comprovante Completo & QR',
      arquivo: 'src/telas/pagar/TelaSucesso.tsx',
      mudancas: [
        'Cupom digital estilo balcão com itens, linhas pontilhadas, QR expansível para o cliente, Enviar no WhatsApp e Nova venda manga.'
      ]
    }
  };

  function topBarVoltar(titulo, rotaVoltar, direitaHtml) {
    var ic = global.PDVIcones;
    return (
      '<div class="ds-topbar">' +
      '  <div class="ds-topbar-left">' +
      (rotaVoltar
        ? '<button type="button" class="ds-icon-btn ds-icon-btn-clear" data-nav="' + rotaVoltar + '" aria-label="Voltar">' + ic.svg('voltarLinha', 22) + '</button>'
        : '') +
      '    <h1 class="ds-titulo-m ds-truncate">' + esc(titulo) + '</h1>' +
      '  </div>' +
      (direitaHtml || '') +
      '</div>'
    );
  }

  function onboardingHeader(passo, voltaPara) {
    var ic = global.PDVIcones;
    var pct = Math.round((passo / 5) * 100);
    return (
      '<div style="height:52px;display:flex;align-items:center;gap:14px;flex-shrink:0;">' +
      '  <button type="button" class="ds-icon-btn" data-nav="' + voltaPara + '" aria-label="Voltar">' + ic.svg('voltar', 22) + '</button>' +
      '  <div class="ds-progress-track" role="progressbar" aria-valuemin="1" aria-valuemax="5" aria-valuenow="' + passo + '"><div class="ds-progress-fill" style="width:' + pct + '%;"></div></div>' +
      '  <span class="ds-label tabular">' + passo + ' de 5</span>' +
      '</div>'
    );
  }

  function miniQrSvg(size) {
    var s = size || 136;
    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 120 120" aria-label="QR Code">' +
      '<rect x="6" y="6" width="32" height="32" rx="5" fill="#14112B"/><rect x="12" y="12" width="20" height="20" rx="2" fill="#FFF"/><rect x="17" y="17" width="10" height="10" rx="2" fill="#14112B"/>' +
      '<rect x="82" y="6" width="32" height="32" rx="5" fill="#14112B"/><rect x="88" y="12" width="20" height="20" rx="2" fill="#FFF"/><rect x="93" y="17" width="10" height="10" rx="2" fill="#14112B"/>' +
      '<rect x="6" y="82" width="32" height="32" rx="5" fill="#14112B"/><rect x="12" y="88" width="20" height="20" rx="2" fill="#FFF"/><rect x="17" y="93" width="10" height="10" rx="2" fill="#14112B"/>' +
      '<rect x="46" y="10" width="8" height="22" rx="2" fill="#14112B"/><rect x="60" y="10" width="14" height="8" rx="2" fill="#14112B"/>' +
      '<rect x="48" y="48" width="24" height="24" rx="5" fill="#3346F0"/><rect x="55" y="55" width="10" height="10" rx="2" fill="#FFFFFF"/>' +
      '<rect x="82" y="48" width="28" height="9" rx="2" fill="#14112B"/><rect x="12" y="48" width="24" height="9" rx="2" fill="#14112B"/>' +
      '<rect x="46" y="84" width="12" height="24" rx="2" fill="#14112B"/><rect x="68" y="80" width="38" height="10" rx="2" fill="#14112B"/><rect x="76" y="98" width="28" height="10" rx="2" fill="#14112B"/>' +
      '</svg>'
    );
  }

  function appFrameWrapper(opts) {
    var ic = global.PDVIcones;
    var activeTab = opts.activeTab;
    var hasNav = !!activeTab;
    var state = opts.state;

    var railHtml = '';
    var bottomHtml = '';
    if (hasNav) {
      var railTabs = [
        { id: 'inicio', label: 'Início', icon: 'inicio' },
        { id: 'produtos', label: 'Produtos', icon: 'produtos' },
        { id: 'caixa-resumo', label: 'Caixa', icon: 'caixa' },
        { id: 'ajustes', label: 'Ajustes', icon: 'ajustes' }
      ];
      railHtml =
        '<aside class="app-nav-rail" aria-label="Navegação lateral">' +
        '<button type="button" class="rail-fab-vender" data-nav="vender">' +
        ic.svg('codigoBarras', 20) +
        '<span>Vender</span>' +
        '</button>';
      railTabs.forEach(function (t) {
        railHtml +=
          '<button type="button" class="rail-btn' + (activeTab === t.id ? ' is-active' : '') + '" data-nav="' + t.id + '">' +
          ic.svg(t.icon, 22) +
          '<span>' + t.label + '</span>' +
          '</button>';
      });
      railHtml += '</aside>';

      function tabBtn(id, label, icon) {
        var ativo = activeTab === id;
        return (
          '<button type="button" class="ds-tab-btn' + (ativo ? ' is-active' : '') + '" data-nav="' + id + '" aria-current="' + (ativo ? 'page' : 'false') + '">' +
          ic.svg(icon, 22) +
          '<span class="ds-tab-label">' + label + '</span>' +
          (ativo ? '<span class="ds-tab-dot" aria-hidden="true"></span>' : '') +
          '</button>'
        );
      }

      bottomHtml =
        '<nav class="ds-bottom-bar" aria-label="Navegação principal">' +
        tabBtn('inicio', 'Início', 'inicio') +
        tabBtn('produtos', 'Produtos', 'produtos') +
        '<button type="button" class="ds-fab-vender" data-nav="vender">' +
        ic.svg('codigoBarras', 22) +
        '<span>Vender</span>' +
        '</button>' +
        tabBtn('caixa-resumo', 'Caixa', 'caixa') +
        tabBtn('ajustes', 'Ajustes', 'ajustes') +
        '</nav>';
    }

    var pauseBanner = '';
    if (state.contaPausada && hasNav) {
      pauseBanner =
        '<div class="ds-banner ds-banner-ambar">' +
        ic.svg('alerta', 18) +
        '<div style="flex:1;min-width:0;"><strong>Teste Pro encerrado.</strong> Suas vendas ficam salvas. <button type="button" class="ds-btn ds-btn-s ds-btn-elev" data-nav="ajustes" style="margin-top:6px;">Ver plano Pro</button></div>' +
        '</div>';
    }

    var enteringCls = state.animarTela ? ' is-entering' : '';

    return (
      '<div class="app-shell' + (hasNav ? ' has-rail' : '') + '">' +
      railHtml +
      '<div class="app-scroll' + (opts.noPad ? ' no-pad' : '') + enteringCls + '" data-scroll-area="app" style="' + (opts.bgStyle || '') + '">' +
      (opts.noPad ? '' : pauseBanner) +
      opts.body +
      '</div>' +
      bottomHtml +
      '</div>'
    );
  }

  function renderTela(id, state) {
    var ic = global.PDVIcones;
    var il = global.PDVIlustra;
    var lojaExibida = state.harden ? 'Supermercado e Panificadora Bom Preço Ltda. · Filial Centro' : state.nomeLoja;
    var operadoraExibida = state.harden ? 'Ana Carolina de Albuquerque' : state.nomeOperadora;

    var totalCarrinho = state.carrinho.reduce(function (acc, item) {
      return acc + Math.round(item.preco * item.qtd);
    }, 0);
    var qtdItens = state.carrinho.reduce(function (acc, item) {
      return acc + (item.unidade === 'kg' ? 1 : item.qtd);
    }, 0);

    if (id === 'boas-vindas') {
      return appFrameWrapper({
        state: state,
        body:
          '<div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:14px;">' +
          '  <div style="height:40px;display:flex;align-items:center;justify-content:space-between;">' +
          ic.wordmarkHtml({ size: 24 }) +
          '    <span class="ds-pill ds-pill-manga">7 dias grátis · Pro</span>' +
          '  </div>' +
          '  <div style="flex:1;min-height:170px;display:flex;align-items:center;justify-content:center;">' +
          il.svg('cesta', state.viewport === 'f18' ? 156 : 228) +
          '  </div>' +
          '  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:8px;">' +
          '    <h1 class="ds-display">Seu balcão inteiro no celular.</h1>' +
          '    <p class="ds-corpo-l">Cadastre bipando, venda sem internet e receba no Pix, dinheiro ou fiado. Depois R$ 49,90/mês.</p>' +
          '  </div>' +
          '  <div style="display:flex;flex-direction:column;gap:8px;">' +
          '    <button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="criar-conta-dados">Começar agora</button>' +
          '    <button type="button" class="ds-btn ds-btn-m ds-btn-ghost" data-nav="entrar" style="width:100%;">Já tenho conta</button>' +
          '  </div>' +
          '</div>'
      });
    }

    if (id === 'criar-conta-dados') {
      return appFrameWrapper({
        state: state,
        body:
          onboardingHeader(1, 'boas-vindas') +
          '<div style="display:flex;flex-direction:column;gap:22px;flex:1;">' +
          '  <h1 class="ds-titulo-xl">Vamos abrir sua loja</h1>' +
          '  <p class="ds-corpo-l">Sem senha difícil. Enviamos um código rápido para confirmar seu e-mail.</p>' +
          '  <div style="display:flex;flex-direction:column;gap:8px;">' +
          '    <label class="ds-campo-label">Seu nome</label>' +
          '    <input class="ds-input" type="text" data-input="nomeOperadora" value="' + esc(state.nomeOperadora) + '">' +
          '  </div>' +
          '  <div style="display:flex;flex-direction:column;gap:8px;">' +
          '    <label class="ds-campo-label">E-mail de acesso</label>' +
          '    <input class="ds-input" type="email" inputmode="email" data-input="emailConta" value="' + esc(state.emailConta) + '">' +
          '  </div>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="criar-conta-otp">Enviar código</button>'
      });
    }

    if (id === 'criar-conta-otp') {
      return appFrameWrapper({
        state: state,
        body:
          onboardingHeader(2, 'criar-conta-dados') +
          '<div style="display:flex;flex-direction:column;gap:20px;flex:1;">' +
          '  <h1 class="ds-titulo-xl">Digite o código enviado</h1>' +
          '  <div class="ds-banner ds-banner-anil">' +
          ic.svg('info', 20) +
          '    <div>Enviado para <strong>' + esc(state.emailConta) + '</strong>. Pedir outro código não apaga seus dados.</div>' +
          '  </div>' +
          '  <div style="display:flex;flex-direction:column;gap:8px;">' +
          '    <label class="ds-campo-label">Código de 6 dígitos</label>' +
          '    <input class="ds-input mono" inputmode="numeric" style="height:64px;text-align:center;font-size:28px;font-weight:700;letter-spacing:0.25em;" value="' + esc(state.otpCodigo) + '" data-input="otpCodigo">' +
          '  </div>' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" data-action="reenviar-otp">' +
          ic.svg('sincronizar', 18) +
          (state.otpReenviado ? 'Novo código reenviado agora' : 'Solicitar outro código (mantém formulário)') +
          '  </button>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="loja">Confirmar código</button>'
      });
    }

    if (id === 'loja') {
      var tipos = ['Mercadinho', 'Padaria', 'Adega', 'Banca', 'Conveniência'];
      return appFrameWrapper({
        state: state,
        body:
          onboardingHeader(3, 'criar-conta-otp') +
          '<div style="display:flex;flex-direction:column;gap:24px;flex:1;">' +
          '  <h1 class="ds-titulo-xl">Como se chama sua loja?</h1>' +
          '  <div style="display:flex;flex-direction:column;gap:8px;">' +
          '    <label class="ds-campo-label">Nome da loja</label>' +
          '    <input class="ds-input" type="text" data-input="nomeLoja" value="' + esc(state.nomeLoja) + '">' +
          '  </div>' +
          '  <div style="display:flex;flex-direction:column;gap:12px;">' +
          '    <span class="ds-campo-label">Tipo de comércio</span>' +
          '    <div class="ds-chip-row">' +
          tipos.map(function (t) {
            return '<button type="button" class="ds-chip' + (state.segmentoLoja === t ? ' is-active' : '') + '" data-action="set-segmento" data-valor="' + esc(t) + '">' + esc(t) + '</button>';
          }).join('') +
          '    </div>' +
          '  </div>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="recebimentos">Continuar</button>'
      });
    }

    if (id === 'recebimentos') {
      var mpAtivo = state.meiosAtivos.indexOf('mp') !== -1;
      var ipAtivo = state.meiosAtivos.indexOf('ip') !== -1;
      var stoneAtivo = state.meiosAtivos.indexOf('stone') !== -1;
      var fiadoAtivo = state.meiosAtivos.indexOf('fiado') !== -1;
      return appFrameWrapper({
        state: state,
        body:
          onboardingHeader(4, 'loja') +
          '<div style="display:flex;flex-direction:column;gap:12px;flex:1;">' +
          '  <h1 class="ds-titulo-xl">Como você quer receber?</h1>' +
          '  <button type="button" class="ds-tile" data-action="toggle-meio" data-valor="mp">' +
          '    <span class="ds-mono-sm" style="background:#E6E9FF;color:#3346F0;">MP</span>' +
          '    <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;display:block;">Mercado Pago</span><span class="ds-legenda">Pix automático na hora (OAuth)</span></span>' +
          (mpAtivo ? '<span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Conectado</span>' : '<span class="ds-btn ds-btn-s ds-btn-elev">Conectar</span>') +
          '  </button>' +
          '  <button type="button" class="ds-tile" data-action="toggle-meio" data-valor="ip">' +
          '    <span class="ds-mono-sm" style="background:#14112B;color:#FFFFFF;">IP</span>' +
          '    <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;display:block;">InfinitePay</span><span class="ds-legenda">Pix na tela + InfiniteTap</span></span>' +
          (ipAtivo ? '<span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Conectado</span>' : '<span class="ds-btn ds-btn-s ds-btn-elev">Conectar</span>') +
          '  </button>' +
          '  <button type="button" class="ds-tile" data-action="toggle-meio" data-valor="stone">' +
          '    <span class="ds-mono-sm" style="background:#DDF5E7;color:#0E7A40;">ST</span>' +
          '    <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;display:block;">Stone / Maquininha</span><span class="ds-legenda">Registro manual com NSU</span></span>' +
          (stoneAtivo ? '<span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Ativa</span>' : '<span class="ds-pill ds-pill-elev">Opcional</span>') +
          '  </button>' +
          '  <div class="ds-tile" style="cursor:default;">' +
          '    <span class="ds-mono-sm" style="background:var(--folha-soft);color:var(--folha);">' + ic.svg('dinheiro', 20) + '</span>' +
          '    <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;display:block;">Dinheiro</span><span class="ds-legenda">Com calculadora de troco</span></span>' +
          '    <span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Sempre ativo</span>' +
          '  </div>' +
          '  <button type="button" class="ds-tile" data-action="toggle-meio" data-valor="fiado">' +
          '    <span class="ds-mono-sm" style="background:var(--manga-soft);color:var(--ink);">' + ic.svg('pessoa', 20) + '</span>' +
          '    <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;display:block;">Fiado digital</span><span class="ds-legenda">Caderno de clientes</span></span>' +
          (fiadoAtivo ? '<span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Ativo</span>' : '<span class="ds-pill ds-pill-elev">Opcional</span>') +
          '  </button>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="camera">Continuar</button>'
      });
    }

    if (id === 'camera') {
      var beneficios = [
        { ic: 'moldura', txt: 'Lê só o que está dentro da moldura' },
        { ic: 'vibrar', txt: 'Apita e vibra a cada produto' },
        { ic: 'lua', txt: 'Pausa sozinho para poupar bateria' }
      ];
      return appFrameWrapper({
        state: state,
        body:
          onboardingHeader(5, 'recebimentos') +
          '<div style="flex:1;display:flex;flex-direction:column;gap:18px;">' +
          '  <div style="display:flex;justify-content:center;padding-top:4px;">' + il.svg('scanner', state.viewport === 'f18' ? 140 : 188) + '</div>' +
          '  <h1 class="ds-titulo-xl">Seu celular vira um leitor de código de barras</h1>' +
          '  <div style="display:flex;flex-direction:column;gap:14px;">' +
          beneficios.map(function (b) {
            return (
              '<div style="display:flex;align-items:center;gap:14px;">' +
              '  <span class="ds-mono" style="border-radius:999px;">' + ic.svg(b.ic, 22) + '</span>' +
              '  <span class="ds-corpo" style="font-weight:500;">' + b.txt + '</span>' +
              '</div>'
            );
          }).join('') +
          '  </div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '  <button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="finalizar-onboarding">Permitir câmera</button>' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-ghost" data-nav="inicio" style="width:100%;">Agora não</button>' +
          '</div>'
      });
    }

    if (id === 'entrar') {
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Entrar na conta', 'boas-vindas') +
          '<div class="ds-surface-md">' +
          '  <span class="ds-legenda">Conta encontrada neste aparelho</span>' +
          '  <strong class="ds-titulo-m">' + esc(state.nomeLoja) + '</strong>' +
          '  <span class="ds-label">' + esc(state.nomeOperadora) + ' · ' + esc(state.emailConta) + '</span>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;flex:1;">' +
          '  <label class="ds-campo-label">E-mail de acesso</label>' +
          '  <input class="ds-input" inputmode="email" value="' + esc(state.emailConta) + '" data-input="emailConta">' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="inicio">Entrar como ' + esc(state.nomeOperadora) + '</button>'
      });
    }

    if (id === 'inicio') {
      var totalDia = state.harden ? 14892050 : state.caixaVendasCentavos;
      var dinDia = state.harden ? 4765450 : state.caixaDinheiro;
      var pixDia = state.harden ? 6999260 : state.caixaPix;
      var carDia = state.harden ? 3127340 : state.caixaCartao;
      var qtdDia = state.harden ? 842 : state.caixaQtdVendas;
      var isHuge = totalDia >= 10000000;
      var meiosResumo = [
        { nome: 'Dinheiro', val: dinDia, pct: Math.round((dinDia / totalDia) * 100) },
        { nome: 'Pix', val: pixDia, pct: Math.round((pixDia / totalDia) * 100) },
        { nome: 'Cartão', val: carDia, pct: Math.round((carDia / totalDia) * 100) }
      ];
      var ultimas = [
        { num: '#000230', meio: 'Pix · Mercado Pago', hora: '18:41', val: 2340, icone: 'pix' },
        { num: '#000229', meio: 'Dinheiro', hora: '18:37', val: 849, icone: 'dinheiro' },
        { num: '#000228', meio: 'Stone manual', hora: '18:30', val: 5605, icone: 'cartao' }
      ];
      return appFrameWrapper({
        state: state,
        activeTab: 'inicio',
        body:
          '<header style="display:flex;flex-direction:column;gap:4px;min-width:0;">' +
          '  <h1 class="ds-titulo-xl ds-clamp-2">Olá, ' + esc(operadoraExibida) + '</h1>' +
          '  <p class="ds-corpo-sub ds-clamp-2" style="font-weight:500;">' + esc(lojaExibida) + '</p>' +
          '  <div style="margin-top:8px;">' +
          '    <button type="button" class="ds-pill ' + (state.offline ? 'ds-pill-ambar' : 'ds-pill-folha') + '" style="border:0;cursor:pointer;min-height:36px;padding:0 14px;" data-action="toggle-offline">' +
          ic.svg(state.offline ? 'offline' : 'online', 16) +
          '      <span>' + (state.offline ? 'Offline · ' + state.filaSync + ' vendas na fila' : 'Online · sincronizado') + '</span>' +
          '    </button>' +
          '  </div>' +
          '</header>' +
          '<section class="ds-surface-lg">' +
          '  <div style="display:flex;flex-direction:column;gap:4px;">' +
          '    <span class="ds-label">Vendido hoje</span>' +
          '    <div class="ds-display' + (isHuge ? ' is-compact-num' : '') + '">' + money(totalDia) + '</div>' +
          '    <span class="ds-corpo-sub" style="font-weight:500;">' + qtdDia + ' vendas</span>' +
          '  </div>' +
          '  <div style="display:flex;flex-direction:column;gap:10px;">' +
          meiosResumo.map(function (m) {
            return (
              '<div style="display:flex;align-items:center;gap:10px;">' +
              '  <span class="ds-label" style="width:62px;flex-shrink:0;">' + m.nome + '</span>' +
              '  <span style="flex:1;height:8px;border-radius:999px;background:var(--surface-2);overflow:hidden;">' +
              '    <span style="display:block;height:100%;border-radius:999px;background:var(--ink);width:' + m.pct + '%;"></span>' +
              '  </span>' +
              '  <span class="ds-label tabular" style="min-width:86px;text-align:right;color:var(--ink);">' + money(m.val) + '</span>' +
              '</div>'
            );
          }).join('') +
          '  </div>' +
          '</section>' +
          '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">' +
          '  <button type="button" class="ds-tile" style="min-height:92px;flex-direction:column;align-items:flex-start;justify-content:space-between;" data-nav="produto-novo">' + ic.svg('cadastrarBipando', 24) + '<span class="ds-corpo" style="font-weight:600;">Cadastrar bipando</span></button>' +
          '  <button type="button" class="ds-tile" style="min-height:92px;flex-direction:column;align-items:flex-start;justify-content:space-between;" data-nav="estoque">' + ic.svg('estoque', 24) + '<span class="ds-corpo" style="font-weight:600;">Estoque · 2 baixos</span></button>' +
          '  <button type="button" class="ds-tile" style="min-height:92px;flex-direction:column;align-items:flex-start;justify-content:space-between;" data-nav="fiado">' + ic.svg('pessoa', 24) + '<span class="ds-corpo" style="font-weight:600;">Fiado · R$ 132,50</span></button>' +
          '  <button type="button" class="ds-tile" style="min-height:92px;flex-direction:column;align-items:flex-start;justify-content:space-between;" data-nav="relatorios">' + ic.svg('relatorio', 24) + '<span class="ds-corpo" style="font-weight:600;">Relatórios</span></button>' +
          '</div>' +
          '<section style="display:flex;flex-direction:column;gap:4px;">' +
          '  <div style="display:flex;align-items:center;justify-content:space-between;">' +
          '    <h2 class="ds-titulo-m">Últimas vendas</h2>' +
          '    <button type="button" class="ds-btn ds-btn-s ds-btn-ghost" style="color:var(--anil);" data-nav="caixa-vendas">Ver todas</button>' +
          '  </div>' +
          ultimas.map(function (u) {
            return (
              '<div class="ds-linha">' +
              '  <span class="ds-mono">' + ic.svg(u.icone, 22) + '</span>' +
              '  <div style="flex:1;min-width:0;">' +
              '    <div class="ds-corpo ds-truncate tabular" style="font-weight:500;">' + u.num + ' · ' + u.meio + '</div>' +
              '    <div class="ds-legenda tabular">' + u.hora + '</div>' +
              '  </div>' +
              '  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">' +
              '    <span class="ds-corpo tabular" style="font-weight:600;">' + money(u.val) + '</span>' +
              '    <span class="ds-pill ds-pill-folha">' + ic.svg('check', 13, null, 2.5) + ' Pago</span>' +
              '  </div>' +
              '</div>'
            );
          }).join('') +
          '</section>'
      });
    }

    if (id === 'vender') {
      var ultimo = state.carrinho[0] || null;
      var demais = state.carrinho.slice(1);
      var pausado = state.leitorPausado;

      var visor =
        '<div class="visor-stage" ' + (pausado ? '' : 'data-action="bipar-arroz"') + '>' +
        '  <div class="visor-bokeh" style="opacity:' + (pausado ? '0.35' : '1') + ';">' +
        '    <div style="position:absolute;left:-30px;top:24px;width:190px;height:120px;border-radius:50%;background:#FF7A59;opacity:.42;filter:blur(38px);"></div>' +
        '    <div style="position:absolute;left:220px;top:6px;width:200px;height:140px;border-radius:50%;background:#2EC4B6;opacity:.34;filter:blur(42px);"></div>' +
        '    <div style="position:absolute;left:120px;top:130px;width:180px;height:110px;border-radius:50%;background:#FFC933;opacity:.28;filter:blur(40px);"></div>' +
        '    <div style="position:absolute;left:-24px;top:170px;width:160px;height:110px;border-radius:50%;background:#7B5CFF;opacity:.42;filter:blur(36px);"></div>' +
        '  </div>' +
        (state.lanterna
          ? '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 48%, rgba(255,238,196,.42) 0%, rgba(255,238,196,.10) 45%, rgba(255,238,196,0) 72%);pointer-events:none;"></div>'
          : '') +
        (pausado
          ? '<div style="position:absolute;inset:0;background:rgba(13,11,26,.64);z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding-bottom:14px;" onclick="event.stopPropagation()">' +
            '  <div style="width:76px;height:76px;border-radius:999px;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:center;">' + il.svg('pausa', 64) + '</div>' +
            '  <span class="ds-label" style="color:#FFFFFF;">Leitor em pausa para poupar bateria</span>' +
            '  <button type="button" class="ds-btn ds-btn-m ds-btn-primario" data-action="toggle-leitor-pausa">Toque para ativar o leitor</button>' +
            '</div>'
          : '<div class="visor-roi" style="background:' + (state.bipFlash ? 'rgba(31,175,95,.32)' : 'transparent') + ';">' +
            '  <div class="visor-corner visor-corner-tl"></div><div class="visor-corner visor-corner-tr"></div>' +
            '  <div class="visor-corner visor-corner-bl"></div><div class="visor-corner visor-corner-br"></div>' +
            (state.bipFlash
              ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;color:#FFFFFF;">' + ic.svg('check', 28, '#FFFFFF', 2.5) + '<span style="font-family:var(--f-display);font-weight:800;font-size:32px;">Bip!</span></div>'
              : '<div class="ds-laser-beam"></div>') +
            '</div>' +
            '<div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;font-size:12px;font-weight:500;color:#FFFFFF;pointer-events:none;">Toque no visor para simular uma leitura · <span class="mono">' + esc(state.ultimoBip) + '</span></div>') +
        '  <div style="position:absolute;left:16px;right:16px;top:12px;display:flex;align-items:center;justify-content:space-between;z-index:6;" onclick="event.stopPropagation()">' +
        '    <button type="button" class="visor-glass-btn" data-nav="inicio" aria-label="Fechar venda">' + ic.svg('fechar', 22) + '</button>' +
        '    <button type="button" class="visor-status-pill" data-action="toggle-leitor-pausa" style="cursor:pointer;">' +
        '      <span style="width:8px;height:8px;border-radius:999px;background:' + (pausado ? '#A9A6BD' : '#1FAF5F') + ';' + (pausado ? '' : 'animation:dsPulso 1.8s infinite;') + '"></span>' +
        (pausado ? 'Leitor em pausa' : 'Leitor ativo') +
        '    </button>' +
        '    <button type="button" class="visor-glass-btn" style="' + (state.lanterna ? 'color:#FFC933;background:rgba(255,201,51,0.22);' : '') + '" data-action="toggle-lanterna" aria-label="Lanterna">' + ic.svg(state.lanterna ? 'lanterna' : 'lanternaDesligada', 22) + '</button>' +
        '  </div>' +
        '</div>';

      var cartCardUltimo = '';
      if (ultimo) {
        var nomeUlt = state.harden && ultimo.nome.indexOf('Arroz') === 0
          ? 'Arroz Agulhinha Tipo 1 Tio João Pacote Econômico 5kg Seleção Especial'
          : ultimo.nome;
        cartCardUltimo =
          '<div class="ds-card-ultimo' + (state.bipFlash ? ' is-pulsing' : '') + '">' +
          '  <div style="display:flex;gap:12px;align-items:flex-start;">' +
          '    <div style="flex:1;min-width:0;">' +
          '      <div class="ds-titulo-m ds-clamp-2">' + esc(nomeUlt) + '</div>' +
          '      <div class="ds-legenda tabular" style="color:var(--ink-2);">Último lido · ' + (ultimo.unidade === 'kg' ? ultimo.qtd.toFixed(3).replace('.', ',') + ' kg × ' : '') + money(ultimo.preco) + '</div>' +
          '    </div>' +
          '    <div class="ds-titulo-l tabular" style="flex-shrink:0;">' + money(Math.round(ultimo.preco * ultimo.qtd)) + '</div>' +
          '  </div>' +
          '  <div style="display:flex;align-items:center;gap:8px;">' +
          '    <button type="button" class="ds-icon-btn ds-icon-btn-elev" data-action="cart-dec" data-idx="0" aria-label="Diminuir">' +
          (ultimo.qtd <= 1 && ultimo.unidade !== 'kg' ? ic.svg('lixeira', 20, 'var(--pitanga)') : ic.svg('menos', 22)) +
          '    </button>' +
          '    <span class="ds-titulo-m tabular" style="min-width:44px;text-align:center;">' + (ultimo.unidade === 'kg' ? ultimo.qtd.toFixed(3).replace('.', ',') : ultimo.qtd) + '</span>' +
          '    <button type="button" class="ds-icon-btn ds-icon-btn-elev" data-action="cart-inc" data-idx="0" aria-label="Aumentar">' + ic.svg('mais', 22) + '</button>' +
          '    <button type="button" class="ds-btn ds-btn-m ds-btn-elev" data-action="cart-plus5" data-idx="0">+5</button>' +
          '  </div>' +
          '</div>';
      }

      var painel =
        '<div class="vender-painel">' +
        '  <div style="padding:16px 20px 8px;display:flex;flex-direction:column;gap:10px;">' +
        '    <div style="display:flex;gap:8px;align-items:center;">' +
        '      <button type="button" class="ds-busca" style="flex:1;border:0;cursor:pointer;text-align:left;" data-nav="vender-busca">' +
        ic.svg('lupa', 20) +
        '        <span class="ds-corpo-sub ds-truncate">Buscar produto ou código</span>' +
        '      </button>' +
        '      <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" data-action="abrir-sheet" data-sheet="avulso">' + ic.svg('avulso', 20) + ' Avulso</button>' +
        '    </div>' +
        '    <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;">' +
        '      <button type="button" class="ds-chip" data-action="abrir-sheet" data-sheet="peso">Pão francês (kg)</button>' +
        '      <button type="button" class="ds-chip" data-action="bipar-gelo">Saco de gelo</button>' +
        '      <button type="button" class="ds-chip" data-action="abrir-sheet" data-sheet="nao-encontrado">EAN desconhecido</button>' +
        '    </div>' +
        '  </div>' +
        '  <div class="app-scroll" data-scroll-area="app" style="padding:4px 20px 12px;gap:8px;">' +
        (state.carrinho.length === 0
          ? '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;text-align:center;">' +
            il.svg('scanner', 96) +
            '<div class="ds-titulo-m">Aponte para o código de barras</div>' +
            '<p class="ds-corpo-sub">Ou toque na busca e atalhos acima.</p>' +
            '</div>'
          : cartCardUltimo +
            demais.map(function (it, i) {
              var realIdx = i + 1;
              return (
                '<div class="ds-linha" style="min-height:54px;">' +
                '  <div class="ds-corpo ds-clamp-2" style="flex:1;min-width:0;font-weight:500;">' + (it.unidade === 'kg' ? '' : it.qtd + '× ') + esc(it.nome) + '</div>' +
                '  <div class="ds-corpo tabular" style="font-weight:600;flex-shrink:0;">' + money(Math.round(it.preco * it.qtd)) + '</div>' +
                '  <button type="button" class="ds-icon-btn ds-icon-btn-clear" style="width:44px;height:44px;min-width:44px;" data-action="cart-del" data-idx="' + realIdx + '" aria-label="Remover item">' + ic.svg('lixeira', 18, 'var(--pitanga)') + '</button>' +
                '</div>'
              );
            }).join('')) +
        '  </div>' +
        '  <div style="padding:12px 20px 18px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px;background:var(--bg);">' +
        '    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;">' +
        '      <span class="ds-label">' + qtdItens + (qtdItens === 1 ? ' item' : ' itens') + '</span>' +
        '      <span class="ds-display' + (totalCarrinho >= 10000000 ? ' is-compact-num' : '') + '">' + money(totalCarrinho) + '</span>' +
        '    </div>' +
        '    <button type="button" class="ds-btn ds-btn-l ds-btn-primario" ' + (totalCarrinho <= 0 ? 'disabled' : 'data-nav="checkout"') + '>Cobrar ' + money(totalCarrinho) + '</button>' +
        '  </div>' +
        '</div>';

      return appFrameWrapper({
        state: state,
        noPad: true,
        body: '<div class="vender-wrap">' + visor + painel + '</div>'
      });
    }

    if (id === 'vender-busca') {
      var q = (state.buscaVender || '').trim();
      var pareceEan = /^\d{4,}$/.test(q);
      var resultados = state.produtos.filter(function (p) {
        if (!q) return true;
        return p.nome.toLowerCase().indexOf(q.toLowerCase()) !== -1 || (p.ean && p.ean.indexOf(q) !== -1);
      });
      return appFrameWrapper({
        state: state,
        body:
          '<div style="display:flex;align-items:center;gap:8px;">' +
          '  <label class="ds-busca is-focused" style="flex:1;height:54px;">' +
          ic.svg('lupa', 20, 'var(--anil)') +
          '    <input placeholder="Nome do produto ou EAN" value="' + esc(state.buscaVender) + '" data-input="buscaVender">' +
          (q ? '<button type="button" class="ds-icon-btn ds-icon-btn-clear" style="width:40px;height:40px;min-width:40px;" data-action="limpar-busca-vender" aria-label="Limpar">' + ic.svg('fechar', 18) + '</button>' : '') +
          '  </label>' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-ghost" style="padding:0 10px;" data-nav="vender">Cancelar</button>' +
          '</div>' +
          (pareceEan
            ? '<button type="button" class="ds-tile" style="background:var(--anil-soft);" data-nav="produto-novo">' +
              '  <span class="ds-mono-sm" style="background:var(--anil);color:#FFFFFF;">' + ic.svg('codigoBarras', 18) + '</span>' +
              '  <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;color:var(--anil);display:block;" class="mono">Buscar EAN ' + esc(q) + '</span><span class="ds-legenda">Consultar Open Food Facts e cadastrar</span></span>' +
              ic.svg('chevronDireita', 20) +
              '</button>'
            : '') +
          '<div style="display:flex;flex-direction:column;">' +
          (resultados.length
            ? resultados.map(function (p, idx) {
                return (
                  '<button type="button" class="ds-linha" style="background:transparent;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;cursor:pointer;" data-action="add-prod-busca" data-nome="' + esc(p.nome) + '" data-preco="' + p.preco + '" data-unidade="' + p.unidade + '">' +
                  '  <span class="ds-mono">' + ic.svg(p.unidade === 'kg' ? 'calculadora' : 'codigoBarras', 19) + '</span>' +
                  '  <span style="flex:1;min-width:0;"><span class="ds-corpo ds-truncate" style="font-weight:500;display:block;">' + esc(p.nome) + '</span><span class="ds-legenda">' + (p.ean || 'Atalho rápido') + '</span></span>' +
                  '  <strong class="ds-corpo tabular" style="font-weight:700;">' + money(p.preco) + (p.unidade === 'kg' ? '/kg' : '') + '</strong>' +
                  '  <span class="ds-pill ds-pill-manga" style="margin-left:4px;">+</span>' +
                  '</button>'
                );
              }).join('')
            : '<div style="padding:28px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;">' +
              il.svg('busca', 112) +
              '  <div class="ds-titulo-m">Nada encontrado para "' + esc(q) + '"</div>' +
              '  <p class="ds-corpo-sub">Você pode buscar no catálogo ou cadastrar rapidinho para esta venda.</p>' +
              '  <button type="button" class="ds-btn ds-btn-m ds-btn-primario" data-nav="produto-novo">Cadastrar novo produto</button>' +
              '</div>') +
          '</div>'
      });
    }

    if (id === 'checkout') {
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Cobrar', 'vender') +
          '<section style="display:flex;flex-direction:column;gap:4px;">' +
          '  <span class="ds-legenda">Total da venda</span>' +
          '  <div class="ds-display">' + money(totalCarrinho) + '</div>' +
          '  <button type="button" class="ds-btn ds-btn-s ds-btn-ghost" style="align-self:flex-start;padding:0;color:var(--anil);margin-top:4px;" data-action="toggle-itens-checkout">' +
          qtdItens + ' itens ' + ic.svg(state.itensCheckoutAbertos ? 'chevronCima' : 'chevronBaixo', 18) +
          '  </button>' +
          (state.itensCheckoutAbertos
            ? '<div class="ds-surface-md" style="gap:6px;">' +
              state.carrinho.map(function (it) {
                return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;"><span><span style="color:var(--ink-3);">' + (it.unidade === 'kg' ? '' : it.qtd + '× ') + '</span>' + esc(it.nome) + '</span><strong class="tabular">' + money(Math.round(it.preco * it.qtd)) + '</strong></div>';
              }).join('') +
              '</div>'
            : '') +
          '</section>' +
          '<section style="display:flex;flex-direction:column;gap:12px;">' +
          '  <h2 class="ds-titulo-l">Como o cliente vai pagar?</h2>' +
          '  <div class="ds-surface-md" style="padding:0;gap:0;">' +
          '    <button type="button" class="ds-tile" style="background:transparent;" data-nav="pagar-pix">' +
          '      <span class="ds-mono-sm" style="background:#E6E9FF;color:#3346F0;">' + (state.provedorPix === 'mercadopago' ? 'MP' : 'IP') + '</span>' +
          '      <span style="flex:1;"><span class="ds-corpo" style="font-weight:600;display:block;">Pix</span><span class="ds-legenda">QR Code na tela, confirma sozinho</span></span>' +
          ic.svg('chevronDireita', 22) +
          '    </button>' +
          '    <div style="padding:0 16px 12px 68px;">' +
          '      <div class="ds-seg" style="background:var(--surface-2);">' +
          '        <button type="button" class="ds-seg-item' + (state.provedorPix === 'mercadopago' ? ' is-active' : '') + '" data-action="set-prov-pix" data-valor="mercadopago">Mercado Pago</button>' +
          '        <button type="button" class="ds-seg-item' + (state.provedorPix === 'infinitepay' ? ' is-active' : '') + '" data-action="set-prov-pix" data-valor="infinitepay">InfinitePay</button>' +
          '      </div>' +
          '    </div>' +
          '  </div>' +
          '  <button type="button" class="ds-tile" data-nav="pagar-tap">' +
          '    <span class="ds-mono-sm" style="background:#14112B;color:#FFC933;">' + ic.svg('aproximacao', 20) + '</span>' +
          '    <span style="flex:1;"><span class="ds-corpo" style="font-weight:600;display:block;">Cartão / Tap / Maquininha</span><span class="ds-legenda">Aproximação no celular ou Stone manual</span></span>' +
          ic.svg('chevronDireita', 22) +
          '  </button>' +
          '  <button type="button" class="ds-tile" data-nav="pagar-dinheiro">' +
          '    <span class="ds-mono-sm" style="background:var(--surface-elev);color:var(--ink);">' + ic.svg('dinheiro', 20) + '</span>' +
          '    <span style="flex:1;"><span class="ds-corpo" style="font-weight:600;display:block;">Dinheiro</span><span class="ds-legenda">Calcula o troco</span></span>' +
          ic.svg('chevronDireita', 22) +
          '  </button>' +
          '  <button type="button" class="ds-tile" data-nav="pagar-dividir">' +
          '    <span class="ds-mono-sm" style="background:var(--surface-elev);color:var(--ink);">' + ic.svg('dividir', 20) + '</span>' +
          '    <span style="flex:1;"><span class="ds-corpo" style="font-weight:600;display:block;">Dividir pagamento</span><span class="ds-legenda">Parte em dinheiro, resto no Pix ou fiado</span></span>' +
          ic.svg('chevronDireita', 22) +
          '  </button>' +
          '  <button type="button" class="ds-tile" data-nav="pagar-fiado">' +
          '    <span class="ds-mono-sm" style="background:var(--manga-soft);color:var(--ink);">' + ic.svg('pessoa', 20) + '</span>' +
          '    <span style="flex:1;"><span class="ds-corpo" style="font-weight:600;display:flex;align-items:center;gap:8px;">Fiado <span class="ds-pill ds-pill-manga">Proposta P3</span></span><span class="ds-legenda">Anotar na conta do cliente</span></span>' +
          ic.svg('chevronDireita', 22) +
          '  </button>' +
          '</section>'
      });
    }

    if (id === 'pagar-dividir') {
      var pagoDiv = state.parcelasDivididas.reduce(function (s, p) { return s + p.val; }, 0);
      var faltaDiv = Math.max(0, totalCarrinho - pagoDiv);
      var pctDiv = totalCarrinho > 0 ? Math.min(100, Math.round((pagoDiv / totalCarrinho) * 100)) : 0;
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Dividir pagamento', 'checkout') +
          '<section style="display:flex;flex-direction:column;gap:8px;">' +
          '  <div style="display:flex;justify-content:space-between;align-items:baseline;" class="tabular">' +
          '    <span class="ds-corpo" style="font-weight:600;">Pago ' + money(pagoDiv) + '</span>' +
          '    <span class="ds-legenda">de ' + money(totalCarrinho) + '</span>' +
          '  </div>' +
          '  <div class="ds-progress-track" style="height:10px;"><div class="ds-progress-fill" style="width:' + pctDiv + '%;"></div></div>' +
          '</section>' +
          '<section style="display:flex;flex-direction:column;gap:8px;">' +
          '  <span class="ds-label">Parcelas recebidas</span>' +
          state.parcelasDivididas.map(function (p) {
            return (
              '<div class="ds-surface-md" style="flex-direction:row;align-items:center;">' +
              '  <span class="ds-mono-sm" style="background:var(--surface-elev);color:var(--ink);">' + ic.svg(p.ic, 19) + '</span>' +
              '  <div style="flex:1;"><div class="ds-corpo" style="font-weight:500;">' + esc(p.meio) + '</div><div class="ds-legenda" style="color:var(--folha);font-weight:600;">Recebido</div></div>' +
              '  <strong class="ds-corpo tabular">' + money(p.val) + '</strong>' +
              '</div>'
            );
          }).join('') +
          '</section>' +
          '<section style="display:flex;flex-direction:column;gap:12px;">' +
          '  <h2 class="ds-titulo-l tabular">' + (faltaDiv > 0 ? 'Falta ' + money(faltaDiv) : 'Valor completo recebido!') + '</h2>' +
          (faltaDiv > 0
            ? '<p class="ds-corpo-sub">Cobrar o restante (' + money(faltaDiv) + ') com:</p>' +
              '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">' +
              '  <button type="button" class="ds-tile" style="min-height:84px;flex-direction:column;justify-content:center;align-items:center;text-align:center;" data-action="quitar-divisao" data-meio="Pix" data-ic="pix">' + ic.svg('pix', 24) + '<strong class="ds-corpo">Pix</strong></button>' +
              '  <button type="button" class="ds-tile" style="min-height:84px;flex-direction:column;justify-content:center;align-items:center;text-align:center;" data-action="quitar-divisao" data-meio="Cartão" data-ic="cartao">' + ic.svg('cartao', 24) + '<strong class="ds-corpo">Cartão</strong></button>' +
              '  <button type="button" class="ds-tile" style="min-height:84px;flex-direction:column;justify-content:center;align-items:center;text-align:center;" data-action="quitar-divisao" data-meio="Dinheiro" data-ic="dinheiro">' + ic.svg('dinheiro', 24) + '<strong class="ds-corpo">Dinheiro</strong></button>' +
              '  <button type="button" class="ds-tile" style="min-height:84px;flex-direction:column;justify-content:center;align-items:center;text-align:center;" data-action="quitar-divisao" data-meio="Fiado" data-ic="pessoa">' + ic.svg('pessoa', 24) + '<strong class="ds-corpo">Fiado</strong></button>' +
              '</div>'
            : '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="concluir-venda" data-meio="Dividido">Concluir venda dividida</button>') +
          '</section>'
      });
    }

    if (id === 'pagar-tap') {
      var modoFalha = state.tapModo === 'falha';
      if (modoFalha) {
        return appFrameWrapper({
          state: state,
          body:
            '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding-top:12px;">' +
            '  <span class="ds-pill ds-pill-ambar">' + ic.svg('relogio', 14) + ' Pendente · evitar cobrança dupla</span>' +
            il.svg('recibo', 124) +
            '  <h1 class="ds-titulo-xl">Não recebemos a confirmação</h1>' +
            '  <p class="ds-corpo-sub">Você voltou sem resultado automático. Consulte antes de passar de novo.</p>' +
            (state.tapConsultado
              ? '<div class="ds-banner ds-banner-anil" style="width:100%;text-align:left;">' + ic.svg('info', 20, 'var(--anil)') + '<span>Nenhum pagamento aprovado encontrado para #000231. Pode tentar novamente com segurança.</span></div>'
              : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px;">' +
            '  <button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="consultar-tap">Consultar status antes</button>' +
            '  <button type="button" class="ds-btn ds-btn-l ds-btn-secundario" ' + (state.tapConsultado ? '' : 'disabled ') + 'data-action="set-tap-modo" data-valor="esperando">Tentar de novo</button>' +
            '  <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" data-nav="checkout">Trocar forma de pagamento</button>' +
            '</div>'
        });
      }
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Cartão / Tap', 'checkout') +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">' +
          il.svg('tap', 164) +
          '  <h2 class="ds-titulo-l">Aproxime o cartão ou passe na Stone</h2>' +
          '  <div class="ds-display">' + money(totalCarrinho) + '</div>' +
          '</div>' +
          '<div class="ds-surface-md" style="gap:0;padding:4px 16px;">' +
          '  <div class="ds-linha" style="min-height:50px;"><span class="ds-pill ds-pill-folha">' + ic.svg('check', 13, null, 2.5) + '</span><span class="ds-corpo">Enviamos ' + money(totalCarrinho) + ' · ref. #000231</span></div>' +
          '  <div class="ds-linha" style="min-height:50px;"><span style="width:22px;height:22px;border-radius:999px;border:2.5px solid var(--anil-soft);border-top-color:var(--anil);animation:dsGirar .9s linear infinite;flex-shrink:0;"></span><span class="ds-corpo" style="font-weight:600;">Cliente encosta o cartão atrás do celular</span></div>' +
          '  <div class="ds-linha" style="min-height:50px;"><span class="ds-pill ds-pill-elev">3</span><span class="ds-corpo-sub">Você volta para cá com o recibo</span></div>' +
          '</div>' +
          '<div class="ds-surface-md">' +
          '  <span class="ds-label">Passou na maquininha externa (Stone / outra)?</span>' +
          '  <div class="ds-chip-row">' +
          '    <button type="button" class="ds-chip ds-chip-elev" data-action="concluir-venda" data-meio="Débito Stone (manual)">Confirmar Débito</button>' +
          '    <button type="button" class="ds-chip ds-chip-elev" data-action="concluir-venda" data-meio="Crédito Stone (manual)">Confirmar Crédito</button>' +
          '  </div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-primario" style="flex:1;" data-action="concluir-venda" data-meio="Cartão (Tap)">Simular Tap aprovado</button>' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" data-action="set-tap-modo" data-valor="falha">Voltou sem aviso</button>' +
          '</div>'
      });
    }

    if (id === 'pagar-fiado') {
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Vender no fiado', 'checkout') +
          '<div><span class="ds-legenda">Valor a anotar</span><div class="ds-display">' + money(totalCarrinho) + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;flex:1;">' +
          '  <h2 class="ds-titulo-m">Cliente da loja</h2>' +
          state.clientesFiado.map(function (c, i) {
            var sel = state.clienteFiadoIdx === i;
            return (
              '<button type="button" class="ds-tile' + (sel ? ' is-selected' : '') + '" data-action="select-fiado-cli" data-idx="' + i + '">' +
              '  <span class="ds-mono ds-mono-elev">' + esc(c.iniciais) + '</span>' +
              '  <span style="flex:1;min-width:0;"><span class="ds-corpo" style="font-weight:600;display:block;">' + esc(c.nome) + '</span><span class="ds-legenda tabular">Em aberto: ' + money(c.saldo) + ' · ' + esc(c.codigo) + '</span></span>' +
              (sel ? ic.svg('check', 20, 'var(--ink)', 2.5) : ic.svg('chevronDireita', 20)) +
              '</button>'
            );
          }).join('') +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="concluir-venda" data-meio="Fiado">Anotar ' + money(totalCarrinho) + ' no fiado</button>'
      });
    }

    if (id === 'pagar-dinheiro') {
      var rec = state.dinheiroRecebido;
      var troco = Math.max(0, rec - totalCarrinho);
      var falta = Math.max(0, totalCarrinho - rec);
      var teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'apagar'];
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Dinheiro', 'checkout') +
          '<p class="ds-corpo-l">A cobrar <strong class="tabular" style="color:var(--ink);">' + money(totalCarrinho) + '</strong></p>' +
          '<div>' +
          '  <div class="ds-label">Valor recebido</div>' +
          '  <div style="display:flex;align-items:baseline;gap:8px;margin-top:4px;">' +
          '    <span class="ds-titulo-l" style="color:var(--ink-2);">R$</span>' +
          '    <span class="ds-display">' + moneyRaw(rec) + '</span>' +
          '  </div>' +
          '</div>' +
          '<div class="ds-chip-row">' +
          '  <button type="button" class="ds-chip' + (rec === totalCarrinho ? ' is-active' : '') + '" data-action="dinheiro-preset" data-valor="' + totalCarrinho + '">Exato (' + money(totalCarrinho) + ')</button>' +
          '  <button type="button" class="ds-chip' + (rec === 6000 ? ' is-active' : '') + '" data-action="dinheiro-preset" data-valor="6000">R$ 60,00</button>' +
          '  <button type="button" class="ds-chip' + (rec === 10000 ? ' is-active' : '') + '" data-action="dinheiro-preset" data-valor="10000">R$ 100,00</button>' +
          '</div>' +
          (rec >= totalCarrinho
            ? '<div class="ds-banner ds-banner-folha" style="min-height:56px;align-items:center;font-family:var(--f-display);font-size:24px;font-weight:700;">' + ic.svg('check', 24, null, 2.5) + '<span class="tabular">Troco ' + money(troco) + '</span></div>'
            : '<div class="ds-banner ds-banner-ambar" style="min-height:56px;align-items:center;font-family:var(--f-display);font-size:24px;font-weight:700;color:var(--ambar);">' + ic.svg('alerta', 24) + '<span class="tabular">Faltam ' + money(falta) + '</span></div>') +
          '<div class="ds-keypad" style="margin-top:auto;">' +
          teclas.map(function (t) {
            return '<button type="button" class="ds-tecla" data-action="keypad-dinheiro" data-key="' + t + '">' + (t === 'apagar' ? ic.svg('apagar', 24) : t) + '</button>';
          }).join('') +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" ' + (rec < totalCarrinho ? 'disabled' : 'data-action="concluir-venda" data-meio="Dinheiro"') + '>Confirmar recebimento</button>'
      });
    }

    if (id === 'pagar-pix') {
      var provLabel = state.provedorPix === 'mercadopago' ? 'Mercado Pago' : 'InfinitePay';
      return appFrameWrapper({
        state: state,
        body:
          topBarVoltar('Pix · ' + provLabel, 'checkout') +
          '<div class="ds-banner ds-banner-anil">' + ic.svg('sol', 20, 'var(--anil)') + '<span>Brilho da tela no máximo para facilitar a leitura</span></div>' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:6px 0;">' +
          '  <div style="padding:18px;background:#FFFFFF;border:1px solid #E2DED6;border-radius:24px;">' +
          miniQrSvg(196) +
          '  </div>' +
          '  <div class="ds-display">' + money(totalCarrinho) + '</div>' +
          '  <span class="ds-label" style="display:flex;align-items:center;gap:6px;">' + ic.svg('relogio', 16) + ' Expira em 09:45</span>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-m ds-btn-secundario" style="width:100%;" data-action="copiar" data-texto="mercadinho@pix.com.br">' + ic.svg('copiar', 18) + ' Copiar código Pix</button>' +
          '<div style="display:flex;align-items:center;gap:10px;" class="ds-corpo-sub">' +
          '  <span style="width:10px;height:10px;border-radius:999px;background:var(--anil);animation:dsPulso 1.6s infinite;flex-shrink:0;"></span>' +
          '  <span><strong>Aguardando webhook…</strong> a tela muda sozinha quando cair.</span>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="pix-pago">Simular Pix recebido (' + provLabel + ')</button>'
      });
    }

    if (id === 'pagar-pix-pago') {
      return appFrameWrapper({
        state: state,
        bgStyle: 'background:#0E7A40;color:#FFFFFF;',
        body:
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;">' +
          il.svg('check', state.viewport === 'f18' ? 140 : 190) +
          '  <h1 class="ds-display" style="color:#FFFFFF;">Pix recebido!</h1>' +
          '  <div style="font-size:18px;font-weight:700;color:#FFFFFF;" class="tabular">' + money(state.ultimaVenda.valor) + ' · ' + esc(state.ultimaVenda.meio) + ' · 18:42</div>' +
          '  <p style="margin:0;max-width:290px;font-size:16px;color:rgba(255,255,255,.92);">Confirmado pelo banco. Não precisa conferir o comprovante do cliente.</p>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '  <button type="button" class="ds-btn ds-btn-l ds-btn-branco" data-nav="sucesso">Abrir comprovante e próxima venda</button>' +
          '</div>'
      });
    }

    if (id === 'sucesso') {
      var itensRecibo = state.carrinho.length ? state.carrinho : DEFAULT_RECIBO_ITENS;
      return appFrameWrapper({
        state: state,
        body:
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">' +
          il.svg('check', 132) +
          '  <h1 class="ds-titulo-xl">Venda concluída</h1>' +
          '  <div class="ds-display">' + money(state.ultimaVenda.valor) + '</div>' +
          '  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">' +
          '    <span class="ds-pill ds-pill-neutro">' + ic.svg('recibo', 14) + ' ' + esc(state.ultimaVenda.meio) + '</span>' +
          '    <span class="ds-pill ds-pill-folha">' + ic.svg('check', 14, null, 2.5) + ' Sincronizado</span>' +
          '  </div>' +
          '</div>' +
          '<section class="ds-surface-lg">' +
          '  <div><div class="ds-titulo-m">' + esc(state.nomeLoja) + '</div><div class="ds-legenda tabular">' + esc(state.ultimaVenda.codigo) + ' · 17/11/2026 18:42</div></div>' +
          '  <div style="padding:10px 0;border-top:1px dashed var(--line);border-bottom:1px dashed var(--line);display:flex;flex-direction:column;gap:6px;">' +
          itensRecibo.slice(0, 4).map(function (it) {
            return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;"><span><span style="color:var(--ink-3);">' + (it.unidade === 'kg' ? '' : it.qtd + '× ') + '</span>' + esc(it.nome) + '</span><span class="tabular" style="font-weight:600;">' + money(Math.round(it.preco * it.qtd)) + '</span></div>';
          }).join('') +
          '  </div>' +
          '  <div style="display:flex;justify-content:space-between;" class="ds-titulo-m"><span>Total (' + itensRecibo.length + ' linhas)</span><span class="tabular">' + money(state.ultimaVenda.valor) + '</span></div>' +
          (state.ultimaVenda.troco > 0
            ? '<div style="display:flex;justify-content:space-between;" class="ds-corpo-sub"><span>Troco devolvido</span><strong class="tabular" style="color:var(--folha);">' + money(state.ultimaVenda.troco) + '</strong></div>'
            : '') +
          (state.qrReciboAberto
            ? '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding-top:6px;"><div style="padding:10px;background:#FFFFFF;border-radius:16px;">' + miniQrSvg(124) + '</div><span class="ds-legenda">Cliente aponta a câmera para abrir o comprovante</span></div>'
            : '') +
          '</section>' +
          '<button type="button" class="ds-btn ds-btn-m ds-btn-secundario" style="width:100%;" data-action="toast" data-msg="Abrindo WhatsApp com o cupom!">' + ic.svg('whatsapp', 18) + ' Enviar no WhatsApp</button>' +
          '<button type="button" class="ds-btn ds-btn-m ds-btn-terciario" style="width:100%;" data-action="toggle-qr-recibo">' + ic.svg('qrCode', 18) + ' ' + (state.qrReciboAberto ? 'Esconder QR do comprovante' : 'Mostrar QR do comprovante') + '</button>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="nova-venda">Nova venda</button>'
      });
    }

    return null;
  }

  var DEFAULT_RECIBO_ITENS = [
    { nome: 'Arroz tipo 1 5kg', preco: 2790, qtd: 1, unidade: 'un' },
    { nome: 'Feijão carioca 1kg', preco: 849, qtd: 1, unidade: 'un' }
  ];

  global.PDVTelasCore = {
    money: money,
    moneyRaw: moneyRaw,
    esc: esc,
    topBarVoltar: topBarVoltar,
    appFrameWrapper: appFrameWrapper,
    INSPECTOR: INSPECTOR,
    renderTela: renderTela
  };
})(window);
