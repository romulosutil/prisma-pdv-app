/* ==========================================================================
   Prisma PDV — Telas de Gestão & BottomSheets v2.2 (Jornadas J4 a J7: 14 Telas)
   J4: Caixa (5) | J5: Produtos, Novo ODbL+Margem & Estoque (3)
   J6: Fiado, Relatórios c/ Gráfico & Equipe (3) | J7: Sync Animado, Ajustes & Suporte (3)
   ========================================================================== */
(function (global) {
  'use strict';

  var INSPECTOR = {
    'caixa-resumo': {
      jornada: 'J4 · Caixa (Resumo & Gaveta)',
      arquivo: 'src/telas/caixa/ResumoCaixa.tsx',
      mudancas: [
        'Segmentado completo Resumo | Vendas | Movimento | Turnos fiel a AppCaixa.dc.html.',
        'Botões Entrada de troco e Sangria quebram em F18; valor contado usa --surface-elev seguro no Modo Noturno.'
      ]
    },
    'caixa-vendas': {
      jornada: 'J4 · Lista & Acordeão de Vendas (Novo)',
      arquivo: 'src/telas/caixa/ListaVendas.tsx + DetalheVenda.tsx',
      mudancas: [
        'Filtros rápidos (Todas | Pix | Dinheiro | Na fila) + linhas expansíveis mostrando itens da venda e reenvio de cupom.'
      ]
    },
    'caixa-movimento': {
      jornada: 'J4 · Entrada de Troco & Sangria',
      arquivo: 'src/telas/caixa/MovimentoDeCaixa.tsx',
      mudancas: [
        'Glossário unificado ("Entrada de troco" / "Sangria") ocultando slugs internos.'
      ]
    },
    'caixa-fechar': {
      jornada: 'J4 · Conferência & Fechamento',
      arquivo: 'src/telas/caixa/FecharCaixa.tsx',
      mudancas: [
        'CampoPreco mascarado substituindo decimal-pad solto + StatusPill Bateu certinho / Sobra / Falta.'
      ]
    },
    'caixa-turnos': {
      jornada: 'J4 · Histórico de Turnos',
      arquivo: 'src/telas/caixa/TurnosCaixa.tsx',
      mudancas: [
        'CodigoCurto (#T-1711-01) no lugar de UUIDs longos com superfícies #F4F2EE.'
      ]
    },
    produtos: {
      jornada: 'J5 · Catálogo de Produtos',
      arquivo: 'src/telas/produtos/ListaProdutos.tsx',
      mudancas: [
        'Fiel a AppCadastro.dc.html com busca 48px, chips, ilustra Produto, monogramas e atalho para Novo Produto (cascata).'
      ]
    },
    'produto-novo': {
      jornada: 'J5 · Novo Produto (Cascata ODbL + Margem)',
      arquivo: 'src/telas/produtos/FormularioProduto.tsx',
      mudancas: [
        'Alinhado ao CP 161: shimmer durante consulta gratuita (OFF/OBF/OPF) e selo tocável >= 44dp de atribuição ODbL-1.0.',
        'Dupla Custo/Venda em Bricolage 28px calculando margem de lucro em % e R$/un ao vivo, + fardos (+6/+12/+24).'
      ]
    },
    estoque: {
      jornada: 'J5 · Gestão de Estoque (R2 elevado)',
      arquivo: 'src/telas/gestao/Estoque.tsx',
      mudancas: [
        'Tiles #F4F2EE + StatusPill + BottomSheet de entrada/perda com --surface-elev no Noturno.'
      ]
    },
    fiado: {
      jornada: 'J6 · Fiado (R3 elevado)',
      arquivo: 'src/telas/gestao/Fiado.tsx',
      mudancas: [
        'Hero manga-soft com ilustra Moedas 3D e folha direta de recebimento total ou parcial.'
      ]
    },
    relatorios: {
      jornada: 'J6 · Relatórios + Gráfico 7d (R4 elevado)',
      arquivo: 'src/telas/gestao/Relatorios.tsx',
      mudancas: [
        'Gráfico interativo de colunas (Seg–Dom) com rótulo direto de valor, linha de média e destaque ao tocar.',
        'Ranking Top 4 produtos e distribuição por meio (Pix, Dinheiro, Cartão, Fiado).'
      ]
    },
    'equipe-usuarios': {
      jornada: 'J6 · Equipe, Perfis e Lojas (Fix gap)',
      arquivo: 'app/(tabs)/ajustes/equipe.tsx + usuarios.tsx + Lojas.tsx',
      mudancas: [
        'Corrige bug gap: 0 no TelaBase, capitaliza papéis ("Dono", "Gerente", "Caixa") e integra Plano Pro (3 lojas).'
      ]
    },
    'caixa-sync': {
      jornada: 'J7 · Sincronização com Progresso (Fix)',
      arquivo: 'src/telas/caixa/StatusSincronizacao.tsx',
      mudancas: [
        'Ao sincronizar, exibe barra progressiva real antes de celebrar "Tudo sincronizado" com ilustra Check 3D.'
      ]
    },
    ajustes: {
      jornada: 'J7 · Ajustes, Modo Noturno & Harden',
      arquivo: 'app/(tabs)/ajustes/index.tsx + assinatura.tsx',
      mudancas: [
        'Plano Único Pro (R$ 49,90/mês · VITALICIO50), Modo Noturno sem estouro branco e alternador Dados Extremos (Harden).'
      ]
    },
    suporte: {
      jornada: 'J7 · Suporte, Políticas e Dados',
      arquivo: 'src/telas/Suporte.tsx',
      mudancas: [
        'Organizado em 3 abas pílula com ilustra Recibo 3D e fluxo claro de exportação/exclusão.'
      ]
    }
  };

  function iniciais(nome) {
    var parts = String(nome || '').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(nome || 'PR').slice(0, 2).toUpperCase();
  }

  function caixaSegmented(active) {
    return (
      '<div class="ds-seg" role="group" aria-label="Seções do caixa">' +
      '  <button type="button" class="ds-seg-item' + (active === 'resumo' ? ' is-active' : '') + '" data-nav="caixa-resumo">Resumo</button>' +
      '  <button type="button" class="ds-seg-item' + (active === 'vendas' ? ' is-active' : '') + '" data-nav="caixa-vendas">Vendas</button>' +
      '  <button type="button" class="ds-seg-item' + (active === 'movimento' ? ' is-active' : '') + '" data-nav="caixa-movimento">Movimento</button>' +
      '  <button type="button" class="ds-seg-item' + (active === 'turnos' ? ' is-active' : '') + '" data-nav="caixa-turnos">Turnos</button>' +
      '</div>'
    );
  }

  function renderTela(id, state) {
    var core = global.PDVTelasCore;
    var ic = global.PDVIcones;
    var il = global.PDVIlustra;
    var money = core.money;
    var moneyRaw = core.moneyRaw;
    var esc = core.esc;

    if (id === 'caixa-resumo' || id === 'caixa-fechar') {
      var esperado = state.caixaTrocoInicial + state.caixaDinheiro + state.caixaEntradas - state.caixaSangrias;
      var dif = state.fechamentoContado - esperado;
      return core.appFrameWrapper({
        state: state,
        activeTab: 'caixa-resumo',
        body:
          '<header style="display:flex;flex-direction:column;gap:14px;">' +
          '  <h1 class="ds-titulo-xl">Caixa</h1>' +
          caixaSegmented('resumo') +
          '</header>' +
          '<div style="display:flex;flex-direction:column;gap:6px;">' +
          '  <span class="ds-legenda">Aberto às 07:30 por ' + esc(state.nomeOperadora) + ' · ' + esc(state.aparelho) + '</span>' +
          '  <div class="ds-display">' + money(state.caixaVendasCentavos) + '</div>' +
          '  <span class="ds-corpo-sub" style="font-weight:500;">' + state.caixaQtdVendas + ' vendas hoje</span>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;">' +
          [
            { n: 'Dinheiro', ic: 'dinheiro', v: state.caixaDinheiro, cor: 'var(--folha)', pct: Math.round((state.caixaDinheiro / state.caixaVendasCentavos) * 100) },
            { n: 'Pix', ic: 'pix', v: state.caixaPix, cor: 'var(--manga)', pct: Math.round((state.caixaPix / state.caixaVendasCentavos) * 100) },
            { n: 'Cartão', ic: 'cartao', v: state.caixaCartao, cor: 'var(--ink)', pct: Math.round((state.caixaCartao / state.caixaVendasCentavos) * 100) }
          ].map(function (m) {
            return (
              '<div style="display:flex;align-items:center;gap:12px;">' +
              '  <span class="ds-mono" style="width:40px;height:40px;min-width:40px;border-radius:999px;">' + ic.svg(m.ic, 19) + '</span>' +
              '  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;">' +
              '    <div style="display:flex;justify-content:space-between;"><span class="ds-corpo">' + m.n + '</span><strong class="ds-corpo tabular">' + money(m.v) + '</strong></div>' +
              '    <div style="height:8px;border-radius:999px;background:var(--surface);overflow:hidden;"><div style="height:8px;border-radius:999px;background:' + m.cor + ';width:' + m.pct + '%;"></div></div>' +
              '  </div>' +
              '</div>'
            );
          }).join('') +
          '</div>' +
          '<section class="ds-surface-lg">' +
          '  <h2 class="ds-titulo-m">Conferir gaveta</h2>' +
          '  <div style="display:flex;justify-content:space-between;" class="ds-corpo-sub"><span>Troco inicial</span><strong class="tabular" style="color:var(--ink);">' + money(state.caixaTrocoInicial) + '</strong></div>' +
          '  <div style="display:flex;justify-content:space-between;" class="ds-corpo-sub"><span>Dinheiro vendido</span><strong class="tabular" style="color:var(--ink);">' + money(state.caixaDinheiro) + '</strong></div>' +
          '  <div style="height:1px;background:var(--line);"></div>' +
          '  <div style="display:flex;justify-content:space-between;align-items:baseline;"><strong class="ds-titulo-m">Esperado na gaveta</strong><strong class="ds-titulo-m tabular">' + money(esperado) + '</strong></div>' +
          '  <div style="display:flex;flex-direction:column;gap:6px;">' +
          '    <span class="ds-label">Valor contado (CampoPreco com máscara)</span>' +
          '    <div style="height:68px;border-radius:16px;background:var(--surface-elev);padding:0 16px;display:flex;align-items:center;gap:8px;">' +
          '      <span class="ds-titulo-l" style="color:var(--ink-2);">R$</span>' +
          '      <span class="ds-titulo-xl tabular" style="font-size:36px;">' + moneyRaw(state.fechamentoContado) + '</span>' +
          '    </div>' +
          '    <div class="ds-chip-row">' +
          '      <button type="button" class="ds-chip ds-chip-elev" data-action="set-contado" data-valor="' + esperado + '">Exato</button>' +
          '      <button type="button" class="ds-chip ds-chip-elev" data-action="set-contado" data-valor="' + (esperado - 500) + '">- R$ 5,00</button>' +
          '      <button type="button" class="ds-chip ds-chip-elev" data-action="set-contado" data-valor="' + (esperado + 500) + '">+ R$ 5,00</button>' +
          '    </div>' +
          '  </div>' +
          '  <div><span class="ds-pill ' + (dif === 0 ? 'ds-pill-folha' : dif > 0 ? 'ds-pill-ambar' : 'ds-pill-pitanga') + '">' +
          ic.svg(dif === 0 ? 'check' : 'alerta', 15, null, 2.5) +
          (dif === 0 ? 'Bateu certinho' : (dif > 0 ? 'Sobrando ' : 'Faltando ') + money(Math.abs(dif))) +
          '  </span></div>' +
          '</section>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" style="flex:1 1 140px;" data-nav="caixa-movimento">' + ic.svg('mais', 18) + ' Entrada de troco</button>' +
          '  <button type="button" class="ds-btn ds-btn-m ds-btn-terciario" style="flex:1 1 140px;" data-action="ir-sangria">' + ic.svg('menos', 18) + ' Sangria</button>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="toast" data-msg="Caixa fechado e resumo enviado!">Fechar caixa</button>'
      });
    }

    if (id === 'caixa-vendas') {
      var filtrosVendas = [
        { k: 'todas', rot: 'Todas (47)' },
        { k: 'pix', rot: 'Pix' },
        { k: 'dinheiro', rot: 'Dinheiro' },
        { k: 'fila', rot: 'Na fila (1)' },
        { k: 'cancelada', rot: 'Canceladas' }
      ];
      var vendasLista = state.vendasTurno.filter(function (v) {
        if (state.filtroVendas === 'todas') return true;
        if (state.filtroVendas === 'fila') return v.status === 'fila';
        if (state.filtroVendas === 'cancelada') return v.status === 'cancelada';
        return v.meioKey === state.filtroVendas;
      });
      return core.appFrameWrapper({
        state: state,
        activeTab: 'caixa-resumo',
        body:
          '<header style="display:flex;flex-direction:column;gap:14px;">' +
          '  <h1 class="ds-titulo-xl">Caixa</h1>' +
          caixaSegmented('vendas') +
          '</header>' +
          '<div class="ds-chip-row">' +
          filtrosVendas.map(function (f) {
            return '<button type="button" class="ds-chip' + (state.filtroVendas === f.k ? ' is-active' : '') + '" data-action="set-filtro-vendas" data-valor="' + f.k + '">' + f.rot + '</button>';
          }).join('') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
          vendasLista.map(function (v) {
            var aberta = state.vendaAbertaId === v.id;
            var statusBadge = v.status === 'pago'
              ? '<span class="ds-pill ds-pill-folha">' + ic.svg('check', 13, null, 2.5) + ' Pago</span>'
              : v.status === 'fila'
              ? '<span class="ds-pill ds-pill-ambar">' + ic.svg('offline', 13) + ' Na fila</span>'
              : '<span class="ds-pill ds-pill-pitanga">' + ic.svg('fechar', 13) + ' Cancelada</span>';
            return (
              '<div class="ds-surface-md" style="padding:0;gap:0;">' +
              '  <button type="button" class="ds-tile" style="background:transparent;" data-action="toggle-venda-det" data-id="' + v.id + '" aria-expanded="' + (aberta ? 'true' : 'false') + '">' +
              '    <span style="flex:1;min-width:0;">' +
              '      <span class="ds-corpo tabular" style="font-weight:600;display:block;">' + v.num + ' <span class="ds-legenda">· ' + v.hora + ' · ' + v.qtdTxt + '</span></span>' +
              '      <span style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">' +
              '        <span class="ds-pill ds-pill-elev">' + ic.svg(v.meioIcone, 13) + ' ' + v.meioTxt + '</span>' +
              statusBadge +
              '      </span>' +
              '    </span>' +
              '    <strong class="ds-corpo tabular" style="' + (v.status === 'cancelada' ? 'text-decoration:line-through;color:var(--ink-3);' : '') + '">' + money(v.val) + '</strong>' +
              ic.svg(aberta ? 'chevronCima' : 'chevronBaixo', 19) +
              '  </button>' +
              (aberta
                ? '<div style="padding:0 16px 14px;">' +
                  '  <div style="border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:6px;">' +
                  v.itens.map(function (it) {
                    return '<div style="display:flex;justify-content:space-between;font-size:13px;"><span class="ds-corpo-sub">' + esc(it.nome) + '</span><span class="tabular" style="font-weight:600;">' + money(it.val) + '</span></div>';
                  }).join('') +
                  '  </div>' +
                  '  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">' +
                  '    <button type="button" class="ds-btn ds-btn-s ds-btn-elev" data-action="toast" data-msg="Comprovante reenviado no WhatsApp!">' + ic.svg('whatsapp', 15) + ' Reenviar</button>' +
                  (v.status === 'fila' ? '<button type="button" class="ds-btn ds-btn-s ds-btn-secundario" data-nav="caixa-sync">Ver fila offline</button>' : '') +
                  '  </div>' +
                  '</div>'
                : '') +
              '</div>'
            );
          }).join('') +
          '</div>'
      });
    }

    if (id === 'caixa-movimento') {
      return core.appFrameWrapper({
        state: state,
        activeTab: 'caixa-resumo',
        body:
          '<header style="display:flex;flex-direction:column;gap:14px;">' +
          '  <h1 class="ds-titulo-xl">Caixa</h1>' +
          caixaSegmented('movimento') +
          '</header>' +
          '<div class="ds-seg">' +
          '  <button type="button" class="ds-seg-item' + (state.movTipo === 'entrada' ? ' is-active' : '') + '" data-action="set-mov-tipo" data-valor="entrada">Entrada de troco</button>' +
          '  <button type="button" class="ds-seg-item' + (state.movTipo === 'sangria' ? ' is-active' : '') + '" data-action="set-mov-tipo" data-valor="sangria">Sangria / Retirada</button>' +
          '</div>' +
          '<div class="ds-surface-lg">' +
          '  <span class="ds-label">Valor em dinheiro</span>' +
          '  <div class="ds-display">' + money(state.movValorCentavos) + '</div>' +
          '  <div class="ds-chip-row">' +
          '    <button type="button" class="ds-chip ds-chip-elev" data-action="mov-preset" data-valor="5000">R$ 50,00</button>' +
          '    <button type="button" class="ds-chip ds-chip-elev" data-action="mov-preset" data-valor="10000">R$ 100,00</button>' +
          '    <button type="button" class="ds-chip ds-chip-elev" data-action="mov-preset" data-valor="20000">R$ 200,00</button>' +
          '  </div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;flex:1;">' +
          '  <label class="ds-campo-label">Motivo</label>' +
          '  <input class="ds-input" value="' + esc(state.movMotivo) + '" data-input="movMotivo">' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="salvar-movimento">Registrar ' + (state.movTipo === 'entrada' ? 'entrada de troco' : 'sangria') + '</button>'
      });
    }

    if (id === 'caixa-turnos') {
      var turnos = [
        { cod: '#T-1711-01', data: 'Hoje · 07:30 – aberto', op: 'Ana', total: 128450, status: 'Aberto', pill: 'ds-pill-folha' },
        { cod: '#T-1611-02', data: 'Ontem · 13:10 – 21:00', op: 'Lucas', total: 96420, status: 'Bateu certinho', pill: 'ds-pill-elev' },
        { cod: '#T-1611-01', data: 'Ontem · 07:25 – 13:10', op: 'Ana', total: 112080, status: 'Sobra R$ 2,00', pill: 'ds-pill-anil' }
      ];
      return core.appFrameWrapper({
        state: state,
        activeTab: 'caixa-resumo',
        body:
          '<header style="display:flex;flex-direction:column;gap:14px;">' +
          '  <h1 class="ds-titulo-xl">Caixa</h1>' +
          caixaSegmented('turnos') +
          '</header>' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' +
          turnos.map(function (t) {
            return (
              '<div class="ds-surface-md">' +
              '  <div style="display:flex;justify-content:space-between;align-items:center;">' +
              '    <span class="ds-codigo-curto">' + t.cod + '</span>' +
              '    <span class="ds-pill ' + t.pill + '">' + t.status + '</span>' +
              '  </div>' +
              '  <div style="display:flex;justify-content:space-between;align-items:baseline;">' +
              '    <div><div class="ds-corpo" style="font-weight:600;">' + t.data + '</div><div class="ds-legenda">Operador: ' + t.op + '</div></div>' +
              '    <strong class="ds-titulo-m tabular">' + money(t.total) + '</strong>' +
              '  </div>' +
              '</div>'
            );
          }).join('') +
          '</div>'
      });
    }

    if (id === 'produtos') {
      var lista = state.produtos.filter(function (p) {
        if (state.filtroProdutos === 'kg' && p.unidade !== 'kg') return false;
        if (state.filtroProdutos === 'atalho' && !p.atalho) return false;
        if (state.buscaProdutos && p.nome.toLowerCase().indexOf(state.buscaProdutos.toLowerCase()) === -1) return false;
        return true;
      });
      return core.appFrameWrapper({
        state: state,
        activeTab: 'produtos',
        body:
          '<header style="display:flex;flex-direction:column;gap:4px;">' +
          '  <h1 class="ds-titulo-xl">Produtos</h1>' +
          '  <p class="ds-legenda">' + state.produtos.length + ' cadastrados · toque para editar ou bipe um novo</p>' +
          '  <label class="ds-busca" style="margin-top:10px;">' +
          ic.svg('lupa', 20) +
          '    <input placeholder="Buscar por nome ou código" value="' + esc(state.buscaProdutos) + '" data-input="buscaProdutos">' +
          '  </label>' +
          '</header>' +
          '<div class="ds-chip-row">' +
          '  <button type="button" class="ds-chip' + (state.filtroProdutos === 'todos' ? ' is-active' : '') + '" data-action="set-filtro-prod" data-valor="todos">Todos</button>' +
          '  <button type="button" class="ds-chip' + (state.filtroProdutos === 'kg' ? ' is-active' : '') + '" data-action="set-filtro-prod" data-valor="kg">Por peso (kg)</button>' +
          '  <button type="button" class="ds-chip' + (state.filtroProdutos === 'atalho' ? ' is-active' : '') + '" data-action="set-filtro-prod" data-valor="atalho">Atalhos</button>' +
          '</div>' +
          '<div class="ds-surface-md" style="flex-direction:row;align-items:center;gap:12px;">' +
          il.svg('produto', 48) +
          '  <div style="flex:1;min-width:0;">' +
          '    <div class="ds-corpo" style="font-weight:600;">Cadastro com busca automática</div>' +
          '    <div class="ds-legenda">Bipe o EAN para puxar nome no Open Food Facts + calcular margem.</div>' +
          '  </div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;">' +
          (lista.length
            ? lista.map(function (p) {
                var pNome = state.harden && p.nome.indexOf('Arroz') === 0
                  ? 'Arroz Agulhinha Tipo 1 Tio João Pacote Econômico 5kg Seleção Especial'
                  : p.nome;
                return (
                  '<div class="ds-linha">' +
                  '  <span class="ds-mono" style="background:' + (p.estoque <= 5 ? 'var(--ambar-soft)' : 'var(--surface)') + ';color:' + (p.estoque <= 5 ? 'var(--ambar)' : 'var(--ink-2)') + ';">' + esc(iniciais(p.nome)) + '</span>' +
                  '  <div style="flex:1;min-width:0;">' +
                  '    <div class="ds-corpo ds-clamp-2" style="font-weight:500;">' + esc(pNome) + '</div>' +
                  '    <div class="ds-legenda" style="color:' + (p.estoque <= 5 ? 'var(--ambar)' : 'var(--ink-3)') + ';">' +
                  (p.ean ? '<span class="mono">' + p.ean + '</span> · ' : 'Atalho · ') +
                  (p.estoque <= 5 ? 'Estoque baixo: ' + p.estoque + ' ' + p.unidade : 'Saldo: ' + p.estoque + ' ' + p.unidade) +
                  '    </div>' +
                  '  </div>' +
                  '  <div style="text-align:right;flex-shrink:0;">' +
                  '    <strong class="ds-corpo tabular" style="font-weight:600;">' + money(p.preco) + '</strong>' +
                  (p.unidade === 'kg' ? '<span class="ds-legenda" style="display:block;">/kg</span>' : '') +
                  '  </div>' +
                  '</div>'
                );
              }).join('')
            : '<div style="padding:28px 0;text-align:center;" class="ds-corpo-sub">Nenhum produto encontrado para essa busca.</div>') +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-nav="produto-novo">' + ic.svg('codigoBarras', 22) + ' Cadastrar bipando (novo)</button>'
      });
    }

    if (id === 'produto-novo') {
      var lucro = state.novoVenda - state.novoCusto;
      var margemPct = state.novoCusto > 0 ? Math.round((lucro / state.novoCusto) * 1000) / 10 : 0;
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Novo produto', 'produtos', '<button type="button" class="ds-chip" data-action="simular-shimmer">' + (state.cadBuscando ? 'Parar busca' : 'Simular busca EAN') + '</button>') +
          (state.cadBuscando
            ? '<div class="ds-surface-lg">' +
              '  <div style="display:flex;align-items:center;gap:12px;">' +
              '    <span class="ds-mono" style="border-radius:999px;background:var(--anil-soft);color:var(--anil);">' + ic.svg('lupa', 22) + '</span>' +
              '    <div style="flex:1;"><div class="ds-titulo-m">Procurando no catálogo nacional…</div><div class="ds-legenda">Cascata gratuita Open Food / Beauty / Products Facts</div></div>' +
              '    <span style="width:22px;height:22px;border-radius:999px;border:3px solid var(--anil-soft);border-top-color:var(--anil);animation:dsGirar .8s linear infinite;"></span>' +
              '  </div>' +
              '  <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface-elev);border-radius:16px;">' +
              '    <div class="ds-skel" style="width:56px;height:56px;border-radius:12px;flex-shrink:0;"></div>' +
              '    <div style="flex:1;display:flex;flex-direction:column;gap:8px;"><div class="ds-skel" style="height:14px;width:78%;border-radius:999px;"></div><div class="ds-skel" style="height:12px;width:48%;border-radius:999px;"></div></div>' +
              '  </div>' +
              '</div>'
            : '<div class="ds-surface-lg" style="gap:12px;">' +
              '  <div style="display:flex;align-items:center;gap:14px;">' +
              il.svg('produto', 84) +
              '    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;">' +
              '      <span class="ds-pill ds-pill-folha">' + ic.svg('check', 13, null, 2.5) + ' Encontrado no catálogo</span>' +
              '      <span class="ds-legenda">Nome e categoria preenchidos automaticamente pelo código EAN.</span>' +
              '    </div>' +
              '  </div>' +
              '  <button type="button" class="ds-attr-link" data-action="toast" data-msg="Abre página do produto no Open Food Facts (ODbL-1.0).">' +
              '    <span>Dados do Open Food Facts, sob a Open Database License (ODbL-1.0)</span>' +
              ic.svg('linkExterno', 16) +
              '  </button>' +
              '</div>' +
              '<div style="display:flex;flex-direction:column;gap:8px;">' +
              '  <label class="ds-campo-label">Nome do produto</label>' +
              '  <input class="ds-input" value="' + esc(state.novoNome) + '" data-input="novoNome">' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
              '  <div>' +
              '    <span class="ds-campo-label">Custo</span>' +
              '    <div class="ds-surface-md" style="flex-direction:row;align-items:baseline;gap:6px;margin-top:6px;">' +
              '      <span class="ds-label">R$</span><strong style="font-family:var(--f-display);font-size:26px;" class="tabular">' + moneyRaw(state.novoCusto) + '</strong>' +
              '    </div>' +
              '  </div>' +
              '  <div>' +
              '    <span class="ds-campo-label">Venda</span>' +
              '    <div class="ds-surface-md" style="flex-direction:row;align-items:baseline;gap:6px;margin-top:6px;box-shadow:inset 0 0 0 2px var(--anil);">' +
              '      <span class="ds-label">R$</span><strong style="font-family:var(--f-display);font-size:26px;" class="tabular">' + moneyRaw(state.novoVenda) + '</strong>' +
              '    </div>' +
              '  </div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
              (lucro > 0
                ? ic.svg('margem', 18, 'var(--folha)') + '<span class="ds-label" style="color:var(--folha);">Margem +' + margemPct.toFixed(1).replace('.', ',') + '% · Lucro ' + money(lucro) + '/un</span>'
                : ic.svg('alerta', 18, 'var(--ambar)') + '<span class="ds-label" style="color:var(--ambar);">Atenção: venda abaixo ou igual ao custo</span>') +
              '</div>' +
              '<div class="ds-chip-row">' +
              '  <button type="button" class="ds-chip" data-action="set-novo-venda" data-valor="949">Venda R$ 9,49</button>' +
              '  <button type="button" class="ds-chip" data-action="set-novo-venda" data-valor="1190">Venda R$ 11,90</button>' +
              '  <button type="button" class="ds-chip" data-action="set-novo-venda" data-valor="590">Abaixo custo R$ 5,90</button>' +
              '</div>' +
              '<div>' +
              '  <span class="ds-campo-label">Estoque inicial (' + state.novoEstoque + ' un)</span>' +
              '  <div class="ds-chip-row" style="margin-top:8px;">' +
              '    <button type="button" class="ds-chip" data-action="add-novo-est" data-delta="-1">-1</button>' +
              '    <button type="button" class="ds-chip" data-action="add-novo-est" data-delta="6">+6</button>' +
              '    <button type="button" class="ds-chip" data-action="add-novo-est" data-delta="12">+12 (fardo)</button>' +
              '    <button type="button" class="ds-chip" data-action="add-novo-est" data-delta="24">+24</button>' +
              '  </div>' +
              '</div>' +
              '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="salvar-produto-novo">' + ic.svg('codigoBarras', 20) + ' Salvar e bipar o próximo</button>')
      });
    }

    if (id === 'estoque') {
      var baixos = state.produtos.filter(function (p) { return p.estoque <= 5; });
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Estoque', 'inicio') +
          '<div class="ds-surface-md" style="background:var(--ambar-soft);flex-direction:row;align-items:center;gap:14px;">' +
          il.svg('produto', 56) +
          '  <div style="flex:1;min-width:0;">' +
          '    <div class="ds-titulo-m" style="color:var(--ink);">' + baixos.length + ' itens para repor</div>' +
          '    <div class="ds-legenda" style="color:var(--ink-2);">Abaixo de 5 unidades ou kg no balcão.</div>' +
          '  </div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' +
          state.produtos.map(function (p, i) {
            var pill = p.estoque <= 0 ? { cls: 'ds-pill-pitanga', txt: 'Zerado' } : p.estoque <= 5 ? { cls: 'ds-pill-ambar', txt: 'Baixo' } : { cls: 'ds-pill-folha', txt: 'OK' };
            return (
              '<div class="ds-surface-md">' +
              '  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
              '    <div style="min-width:0;flex:1;">' +
              '      <div class="ds-corpo ds-clamp-2" style="font-weight:600;">' + esc(p.nome) + '</div>' +
              '      <div class="ds-legenda tabular">Saldo atual: <strong style="color:var(--ink);">' + p.estoque + ' ' + p.unidade + '</strong></div>' +
              '    </div>' +
              '    <span class="ds-pill ' + pill.cls + '">' + pill.txt + '</span>' +
              '    <button type="button" class="ds-btn ds-btn-s ds-btn-elev" data-action="abrir-estoque-mov" data-idx="' + i + '">Ajustar</button>' +
              '  </div>' +
              '</div>'
            );
          }).join('') +
          '</div>'
      });
    }

    if (id === 'fiado') {
      var totalFiado = state.clientesFiado.reduce(function (s, c) { return s + c.saldo; }, 0);
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Fiado', 'inicio') +
          '<section class="ds-surface-manga" style="flex-direction:row;align-items:center;gap:14px;">' +
          '  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">' +
          '    <span class="ds-label">Total a receber</span>' +
          '    <div class="ds-display">' + money(totalFiado) + '</div>' +
          '    <span class="ds-legenda" style="color:var(--ink-2);">Caderno digital · clientes confiáveis</span>' +
          '  </div>' +
          il.svg('moedas', 80) +
          '</section>' +
          '<div style="display:flex;flex-direction:column;gap:10px;">' +
          state.clientesFiado.map(function (c, i) {
            return (
              '<div class="ds-surface-md">' +
              '  <div style="display:flex;align-items:center;gap:12px;">' +
              '    <span class="ds-mono ds-mono-elev">' + esc(c.iniciais) + '</span>' +
              '    <div style="flex:1;min-width:0;">' +
              '      <div class="ds-corpo ds-clamp-2" style="font-weight:600;">' + esc(c.nome) + '</div>' +
              '      <div class="ds-legenda">' + esc(c.codigo) + ' · Vence dia 5</div>' +
              '    </div>' +
              '    <span class="ds-titulo-m tabular">' + money(c.saldo) + '</span>' +
              '  </div>' +
              '  <div style="display:flex;justify-content:flex-end;">' +
              '    <button type="button" class="ds-btn ds-btn-s ' + (c.saldo > 0 ? 'ds-btn-primario' : 'ds-btn-elev') + '" ' + (c.saldo <= 0 ? 'disabled' : 'data-action="abrir-fiado-receber" data-idx="' + i + '"') + '>' +
              (c.saldo > 0 ? 'Receber pagamento' : 'Quitado') +
              '    </button>' +
              '  </div>' +
              '</div>'
            );
          }).join('') +
          '</div>'
      });
    }

    if (id === 'relatorios') {
      var nomes = { hoje: 'Hoje (17/11)', '7dias': 'Últimos 7 dias', mes: 'Novembro' };
      var mult = state.periodoRelatorio === 'hoje' ? 1 : state.periodoRelatorio === '7dias' ? 6 : 19;
      var fat = (state.harden ? 14892050 : 128450) * (state.harden ? 1 : mult);
      var qtd = 47 * mult;
      var dias = [
        { dia: 'Seg', val: 94000, vnd: 34, h: 48 },
        { dia: 'Ter', val: 149000, vnd: 53, h: 76 },
        { dia: 'Qua', val: 112000, vnd: 41, h: 58 },
        { dia: 'Qui', val: 131000, vnd: 46, h: 68 },
        { dia: 'Sex', val: 176000, vnd: 62, h: 90 },
        { dia: 'Sáb', val: 184000, vnd: 66, h: 94 },
        { dia: 'Dom', val: 128450, vnd: 47, h: 66 }
      ];
      var selDia = dias[state.relDiaIdx] || dias[6];
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Relatórios', 'inicio', '<button type="button" class="ds-icon-btn" data-action="abrir-sheet" data-sheet="filtro-relatorio" aria-label="Filtrar período">' + ic.svg('calendario', 20) + '</button>') +
          '<div class="ds-chip-row">' +
          ['hoje', '7dias', 'mes'].map(function (k) {
            return '<button type="button" class="ds-chip' + (state.periodoRelatorio === k ? ' is-active' : '') + '" data-action="set-periodo-rel" data-valor="' + k + '">' + nomes[k] + '</button>';
          }).join('') +
          '</div>' +
          '<section class="ds-surface-lg" style="flex-direction:row;align-items:center;gap:14px;">' +
          '  <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">' +
          '    <span class="ds-label">Faturamento</span>' +
          '    <div class="ds-display' + (fat >= 10000000 ? ' is-compact-num' : '') + '">' + money(fat) + '</div>' +
          '    <span class="ds-legenda tabular">' + qtd + ' vendas · Ticket médio ' + money(Math.round(fat / qtd)) + '</span>' +
          '  </div>' +
          il.svg('grafico', 84) +
          '</section>' +
          '<section class="ds-surface-lg">' +
          '  <div style="display:flex;justify-content:space-between;align-items:baseline;">' +
          '    <h2 class="ds-titulo-m">Ritmo da semana</h2>' +
          '    <span class="ds-legenda tabular">Média ' + money(139200) + '</span>' +
          '  </div>' +
          '  <div class="rel-bar-grid">' +
          '    <div class="rel-avg-line" aria-hidden="true"></div>' +
          dias.map(function (d, idx) {
            var ativo = state.relDiaIdx === idx;
            return (
              '<button type="button" class="rel-bar-col' + (ativo ? ' is-selected' : '') + '" data-action="select-rel-dia" data-idx="' + idx + '" aria-label="' + d.dia + ': ' + money(d.val) + '">' +
              '  <span class="rel-bar-val">' + Math.round(d.val / 10000) * 100 / 10 + 'k</span>' +
              '  <span class="rel-bar-fill" style="height:' + d.h + 'px;"></span>' +
              '  <span class="ds-legenda" style="' + (ativo ? 'color:var(--ink);font-weight:700;' : '') + '">' + d.dia + '</span>' +
              '</button>'
            );
          }).join('') +
          '  </div>' +
          '  <div class="ds-surface-md" style="background:var(--surface-elev);padding:10px 14px;flex-direction:row;justify-content:space-between;">' +
          '    <span class="ds-label" style="color:var(--ink);">' + selDia.dia + ' · ' + selDia.vnd + ' vendas</span>' +
          '    <strong class="ds-label tabular" style="color:var(--ink);">' + money(selDia.val) + '</strong>' +
          '  </div>' +
          '</section>' +
          '<div class="ds-surface-lg">' +
          '  <h2 class="ds-titulo-m">Top 4 produtos no período</h2>' +
          '  <div class="ds-linha" style="min-height:48px;"><span class="ds-corpo">1. Arroz tipo 1 5kg</span><strong class="tabular">42 un</strong></div>' +
          '  <div class="ds-linha" style="min-height:48px;"><span class="ds-corpo">2. Leite integral 1L</span><strong class="tabular">118 un</strong></div>' +
          '  <div class="ds-linha" style="min-height:48px;"><span class="ds-corpo">3. Pão francês</span><strong class="tabular">24,5 kg</strong></div>' +
          '  <div class="ds-linha" style="min-height:48px;"><span class="ds-corpo">4. Café torrado 500g</span><strong class="tabular">31 un</strong></div>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-secundario" data-action="toast" data-msg="CSV contábil exportado!">' + ic.svg('compartilhar', 18) + ' Exportar CSV contábil</button>'
      });
    }

    if (id === 'equipe-usuarios') {
      var aba = state.abaEquipe;
      var inner = '';
      if (aba === 'equipe') {
        inner =
          '<div class="ds-banner ds-banner-anil">' + ic.svg('info', 20, 'var(--anil)') + '<span>Plano Pro inclui <strong>operadores ilimitados</strong> com permissões por papel.</span></div>' +
          '<div style="display:flex;flex-direction:column;gap:12px;">' +
          '  <div class="ds-surface-md" style="flex-direction:row;align-items:center;"><span class="ds-mono ds-mono-elev">AP</span><div style="flex:1;min-width:0;"><div class="ds-corpo ds-truncate" style="font-weight:600;">Ana Paula</div><div class="ds-legenda ds-truncate">ana@mercadinhobompreco.com.br</div></div><span class="ds-pill ds-pill-manga">Dono</span></div>' +
          '  <div class="ds-surface-md" style="flex-direction:row;align-items:center;"><span class="ds-mono ds-mono-elev">LF</span><div style="flex:1;min-width:0;"><div class="ds-corpo ds-truncate" style="font-weight:600;">Lucas Ferreira</div><div class="ds-legenda ds-truncate">lucas.balcao@mercadinho.com.br</div></div><span class="ds-pill ds-pill-folha">Caixa</span></div>' +
          '  <div class="ds-surface-md" style="flex-direction:row;align-items:center;"><span class="ds-mono ds-mono-elev">CS</span><div style="flex:1;min-width:0;"><div class="ds-corpo ds-truncate" style="font-weight:600;">Carla Souza</div><div class="ds-legenda">Convite #CV-8821</div></div><span class="ds-pill ds-pill-anil">Gerente</span></div>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="toast" data-msg="Convite enviado!">Convidar membro da equipe</button>';
      } else if (aba === 'perfis') {
        inner =
          '<div style="display:flex;flex-direction:column;gap:12px;">' +
          '  <div class="ds-surface-md"><strong class="ds-titulo-m">Dono</strong><p class="ds-corpo-sub">Acesso total a lojas, assinatura Pro, relatórios, cancelamentos e equipe.</p></div>' +
          '  <div class="ds-surface-md"><strong class="ds-titulo-m">Gerente</strong><p class="ds-corpo-sub">Gerencia produtos, estoque, fiado e fechamento de caixa. Não altera cobrança.</p></div>' +
          '  <div class="ds-surface-md"><strong class="ds-titulo-m">Caixa</strong><p class="ds-corpo-sub">Foca em Vender, consultar preços e operar seu turno.</p></div>' +
          '</div>';
      } else {
        inner =
          '<div style="display:flex;flex-direction:column;align-items:center;gap:14px;">' +
          il.svg('loja', 110) +
          '  <div class="ds-surface-md" style="width:100%;flex-direction:row;align-items:center;justify-content:space-between;">' +
          '    <div><div class="ds-corpo" style="font-weight:600;">Mercadinho Bom Preço</div><div class="ds-legenda">Principal · #LJ-01</div></div>' +
          '    <span class="ds-pill ds-pill-folha">Ativa</span>' +
          '  </div>' +
          '  <button type="button" class="ds-btn ds-btn-l ds-btn-terciario" style="width:100%;" data-action="toast" data-msg="Plano Pro inclui até 3 lojas!">+ Nova loja (1 de 3 no Plano Pro)</button>' +
          '</div>';
      }
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Equipe e lojas', 'ajustes') +
          '<div class="ds-seg">' +
          '  <button type="button" class="ds-seg-item' + (aba === 'equipe' ? ' is-active' : '') + '" data-action="set-aba-equipe" data-valor="equipe">Equipe</button>' +
          '  <button type="button" class="ds-seg-item' + (aba === 'perfis' ? ' is-active' : '') + '" data-action="set-aba-equipe" data-valor="perfis">Perfis</button>' +
          '  <button type="button" class="ds-seg-item' + (aba === 'lojas' ? ' is-active' : '') + '" data-action="set-aba-equipe" data-valor="lojas">Lojas</button>' +
          '</div>' +
          inner
      });
    }

    if (id === 'caixa-sync') {
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Sincronização', 'ajustes') +
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;">' +
          (state.syncEmAndamento
            ? '<div class="ds-banner ds-banner-anil" style="width:100%;flex-direction:column;align-items:stretch;">' +
              '  <div style="display:flex;align-items:center;gap:10px;">' +
              ic.svg('sincronizar', 20, 'var(--anil)') +
              '    <strong>Sincronizando… enviando ' + state.filaSync + ' vendas</strong>' +
              '  </div>' +
              '  <div class="ds-progress-track" style="height:8px;background:var(--bg);"><div class="ds-progress-fill ds-sync-bar-anim"></div></div>' +
              '</div>'
            : il.svg(state.filaSync > 0 ? 'offline' : 'check', 164)) +
          '  <h2 class="ds-titulo-l">' + (state.syncEmAndamento ? 'Enviando registros seguros…' : state.filaSync > 0 ? state.filaSync + ' registros na fila local' : 'Tudo sincronizado na nuvem') + '</h2>' +
          '  <p class="ds-corpo-sub">' + esc(state.aparelho) + ' · #AP-01</p>' +
          '  <div class="ds-surface-md" style="width:100%;text-align:left;">' +
          '    <div style="display:flex;justify-content:space-between;"><span class="ds-label">Catálogo</span><strong class="ds-label" style="color:var(--ink);">312 produtos · Open Food Facts</strong></div>' +
          '    <div style="display:flex;justify-content:space-between;"><span class="ds-label">Modo offline</span><strong class="ds-label" style="color:var(--ink);">Vendas funcionam sem rede</strong></div>' +
          '  </div>' +
          '</div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" ' + (state.syncEmAndamento ? 'disabled' : 'data-action="sincronizar-agora"') + '>' + ic.svg('sincronizar', 20) + (state.syncEmAndamento ? 'Sincronizando…' : ' Sincronizar agora') + '</button>'
      });
    }

    if (id === 'ajustes') {
      return core.appFrameWrapper({
        state: state,
        activeTab: 'ajustes',
        body:
          '<h1 class="ds-titulo-xl">Ajustes</h1>' +
          '<div class="ds-surface-manga">' +
          '  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><strong class="ds-titulo-m">Plano Pro · Teste dia 3/7</strong><span class="ds-pill ds-pill-elev">R$ 49,90/mês</span></div>' +
          '  <p class="ds-legenda" style="color:var(--ink-2);">Vendas ilimitadas · 10 aparelhos · 3 lojas · Cupom VITALICIO50 = R$ 24,95/mês.</p>' +
          '</div>' +
          '<div class="ds-surface-md" style="padding:4px 16px;gap:0;">' +
          '  <button type="button" class="ds-linha" style="background:transparent;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;cursor:pointer;" data-nav="equipe-usuarios"><div style="flex:1;"><div class="ds-corpo" style="font-weight:600;">Equipe, perfis e lojas</div><div class="ds-legenda">Operadores, convites e filiais</div></div>' + ic.svg('chevronDireita', 20) + '</button>' +
          '  <button type="button" class="ds-linha" style="background:transparent;border-left:0;border-right:0;border-top:0;width:100%;text-align:left;cursor:pointer;" data-nav="caixa-sync"><div style="flex:1;"><div class="ds-corpo" style="font-weight:600;">Sincronização e aparelhos</div><div class="ds-legenda">Fila local e status da rede</div></div>' + ic.svg('chevronDireita', 20) + '</button>' +
          '  <button type="button" class="ds-linha" style="background:transparent;border:0;width:100%;text-align:left;cursor:pointer;" data-nav="suporte"><div style="flex:1;"><div class="ds-corpo" style="font-weight:600;">Suporte, políticas e dados</div><div class="ds-legenda">Atendimento, exportação e conta</div></div>' + ic.svg('chevronDireita', 20) + '</button>' +
          '</div>' +
          '<div class="ds-surface-md" style="padding:0;gap:0;">' +
          '  <div class="ds-switch-row" style="border-bottom:1px solid var(--line);"><div><div class="ds-corpo" style="font-weight:600;">Tema escuro (Noturno)</div><div class="ds-legenda">Paleta adaptada sem estouro branco</div></div><button type="button" class="ds-switch' + (state.tema === 'escuro' ? ' is-on' : '') + '" data-action="toggle-tema" aria-label="Alternar tema escuro"><div class="ds-switch-thumb"></div></button></div>' +
          '  <div class="ds-switch-row" style="border-bottom:1px solid var(--line);"><div><div class="ds-corpo" style="font-weight:600;">Dados extremos (Harden)</div><div class="ds-legenda">Testa nomes longos e totais R$ 148 mil</div></div><button type="button" class="ds-switch' + (state.harden ? ' is-on' : '') + '" data-action="toggle-harden" aria-label="Ativar dados extremos"><div class="ds-switch-thumb"></div></button></div>' +
          '  <div class="ds-switch-row" style="border-bottom:1px solid var(--line);"><div><div class="ds-corpo" style="font-weight:600;">Simular modo offline</div><div class="ds-legenda">Testa fila de vendas sem internet</div></div><button type="button" class="ds-switch' + (state.offline ? ' is-on' : '') + '" data-action="toggle-offline" aria-label="Simular offline"><div class="ds-switch-thumb"></div></button></div>' +
          '  <div class="ds-switch-row"><div><div class="ds-corpo" style="font-weight:600;">Simular conta pausada</div><div class="ds-legenda">Banner discreto após período grátis</div></div><button type="button" class="ds-switch' + (state.contaPausada ? ' is-on' : '') + '" data-action="toggle-pausa" aria-label="Simular pausa"><div class="ds-switch-thumb"></div></button></div>' +
          '</div>'
      });
    }

    if (id === 'suporte') {
      var tab = state.abaSuporte;
      var bodyTab = '';
      if (tab === 'ajuda') {
        bodyTab =
          '<div style="display:flex;justify-content:center;">' + il.svg('recibo', 100) + '</div>' +
          '<div class="ds-surface-md"><strong class="ds-titulo-m">Atendimento humano no WhatsApp</strong><p class="ds-corpo-sub">Segunda a sábado, 08h às 18h.</p><button type="button" class="ds-btn ds-btn-m ds-btn-primario" data-action="toast" data-msg="Chamado aberto!">Conversar com suporte</button></div>' +
          '<div class="ds-surface-md"><div class="ds-corpo" style="font-weight:600;">Diagnóstico do aparelho</div><div class="ds-legenda">Banco local íntegro · #DG-1711</div></div>';
      } else if (tab === 'politicas') {
        bodyTab =
          '<div class="ds-surface-md"><strong class="ds-titulo-m">Privacidade e LGPD</strong><p class="ds-corpo-sub">Dados salvos no aparelho e sincronizados com segurança apenas para sua loja.</p></div>' +
          '<div class="ds-surface-md"><strong class="ds-titulo-m">Cobrança e cancelamento</strong><p class="ds-corpo-sub">7 dias grátis sem cartão. Cancele quando quiser mantendo acesso de leitura.</p></div>';
      } else {
        bodyTab =
          '<div class="ds-surface-md"><strong class="ds-titulo-m">Exportar meus dados</strong><p class="ds-corpo-sub">Baixe produtos, clientes e vendas em CSV ou JSON.</p><button type="button" class="ds-btn ds-btn-m ds-btn-elev" data-action="toast" data-msg="Backup exportado!">Gerar cópia agora</button></div>' +
          '<div class="ds-banner ds-banner-pitanga">' + ic.svg('alerta', 18) + '<span>A exclusão remove a conta após confirmação em 2 passos.</span></div>' +
          '<button type="button" class="ds-btn ds-btn-l ds-btn-perigo" data-action="toast" data-msg="Solicitação protegida aberta.">Solicitar exclusão da conta</button>';
      }
      return core.appFrameWrapper({
        state: state,
        body:
          core.topBarVoltar('Suporte e dados', 'ajustes') +
          '<div class="ds-seg">' +
          '  <button type="button" class="ds-seg-item' + (tab === 'ajuda' ? ' is-active' : '') + '" data-action="set-aba-suporte" data-valor="ajuda">Atendimento</button>' +
          '  <button type="button" class="ds-seg-item' + (tab === 'politicas' ? ' is-active' : '') + '" data-action="set-aba-suporte" data-valor="politicas">Políticas</button>' +
          '  <button type="button" class="ds-seg-item' + (tab === 'dados' ? ' is-active' : '') + '" data-action="set-aba-suporte" data-valor="dados">Dados</button>' +
          '</div>' +
          bodyTab
      });
    }

    return null;
  }

  function renderSheet(state) {
    if (!state.sheet) return '';
    var core = global.PDVTelasCore;
    var ic = global.PDVIcones;
    var il = global.PDVIlustra;
    var money = core.money;
    var moneyRaw = core.moneyRaw;
    var esc = core.esc;
    var sheet = state.sheet;
    var inner = '';

    if (sheet === 'avulso') {
      var teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'apagar'];
      inner =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h2 class="ds-titulo-l">Valor avulso</h2><button type="button" class="ds-icon-btn" data-action="fechar-sheet" aria-label="Fechar">' + ic.svg('fechar', 20) + '</button></div>' +
        '<div class="ds-chip-row">' +
        ['Pão', 'Hortifruti', 'Diversos'].map(function (c) {
          return '<button type="button" class="ds-chip' + (state.avulsoCat === c ? ' is-active' : '') + '" data-action="set-avulso-cat" data-valor="' + c + '">' + c + '</button>';
        }).join('') +
        '</div>' +
        '<div style="display:flex;align-items:baseline;justify-content:center;gap:8px;padding:4px 0;">' +
        '  <span class="ds-titulo-l" style="color:var(--ink-2);">R$</span>' +
        '  <span class="ds-display">' + moneyRaw(state.avulsoCentavos) + '</span>' +
        '</div>' +
        '<div class="ds-keypad">' +
        teclas.map(function (t) {
          return '<button type="button" class="ds-tecla" data-action="keypad-avulso" data-key="' + t + '">' + (t === 'apagar' ? ic.svg('apagar', 22) : t) + '</button>';
        }).join('') +
        '</div>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" ' + (state.avulsoCentavos <= 0 ? 'disabled' : 'data-action="add-avulso-valor"') + '>Adicionar ' + money(state.avulsoCentavos) + '</button>';
    } else if (sheet === 'peso') {
      inner =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h2 class="ds-titulo-l">Pão francês (R$ 16,90/kg)</h2><button type="button" class="ds-icon-btn" data-action="fechar-sheet" aria-label="Fechar">' + ic.svg('fechar', 20) + '</button></div>' +
        '<p class="ds-corpo-sub">Escolha o peso medido na balança:</p>' +
        '<div class="ds-chip-row">' +
        '  <button type="button" class="ds-chip" data-action="add-peso" data-kg="0.250">250g (' + money(423) + ')</button>' +
        '  <button type="button" class="ds-chip" data-action="add-peso" data-kg="0.500">500g (' + money(845) + ')</button>' +
        '  <button type="button" class="ds-chip" data-action="add-peso" data-kg="1.000">1 kg (' + money(1690) + ')</button>' +
        '</div>';
    } else if (sheet === 'nao-encontrado' || sheet === 'cadastro-rapido') {
      inner =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h2 class="ds-titulo-l">' + (sheet === 'nao-encontrado' ? 'Novo produto pelo código' : 'Cadastrar bipando') + '</h2><button type="button" class="ds-icon-btn" data-action="fechar-sheet" aria-label="Fechar">' + ic.svg('fechar', 20) + '</button></div>' +
        '<div class="ds-surface-md" style="flex-direction:row;align-items:center;gap:14px;">' +
        il.svg('produto', 80) +
        '  <div style="flex:1;min-width:0;">' +
        '    <span class="ds-pill ds-pill-folha">' + ic.svg('check', 13, null, 2.5) + ' Open Food Facts</span>' +
        '    <div class="ds-titulo-m" style="margin-top:6px;">Achocolatado em pó 400g</div>' +
        '    <div class="ds-legenda mono">EAN 7891000315507 · R$ 9,49</div>' +
        '  </div>' +
        '</div>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="salvar-cadastro-rapido">Salvar e adicionar ao carrinho</button>' +
        '<button type="button" class="ds-btn ds-btn-m ds-btn-terciario" data-nav="produto-novo">Abrir formulário completo (custo e margem)</button>';
    } else if (sheet === 'estoque-mov') {
      var prod = state.produtos[state.sheetIdx] || state.produtos[0];
      inner =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h2 class="ds-titulo-l">Ajustar estoque</h2><button type="button" class="ds-icon-btn" data-action="fechar-sheet" aria-label="Fechar">' + ic.svg('fechar', 20) + '</button></div>' +
        '<p class="ds-corpo"><strong>' + esc(prod.nome) + '</strong> · Saldo atual: ' + prod.estoque + ' ' + prod.unidade + '</p>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="ajustar-estoque-delta" data-delta="10">+ 10 (Entrada de mercadoria)</button>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-terciario" data-action="ajustar-estoque-delta" data-delta="-1">- 1 (Perda ou ajuste)</button>';
    } else if (sheet === 'fiado-receber') {
      var cli = state.clientesFiado[state.sheetIdx] || state.clientesFiado[0];
      inner =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h2 class="ds-titulo-l">Receber fiado</h2><button type="button" class="ds-icon-btn" data-action="fechar-sheet" aria-label="Fechar">' + ic.svg('fechar', 20) + '</button></div>' +
        '<div class="ds-surface-md"><strong>' + esc(cli.nome) + '</strong><div class="ds-display">' + money(cli.saldo) + '</div></div>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-primario" data-action="quitar-fiado" data-modo="total">Receber valor total</button>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-terciario" data-action="quitar-fiado" data-modo="metade">Receber metade (' + money(Math.round(cli.saldo / 2)) + ')</button>';
    } else if (sheet === 'filtro-relatorio') {
      inner =
        '<div style="display:flex;justify-content:space-between;align-items:center;"><h2 class="ds-titulo-l">Escolher período</h2><button type="button" class="ds-icon-btn" data-action="fechar-sheet" aria-label="Fechar">' + ic.svg('fechar', 20) + '</button></div>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-terciario" data-action="set-periodo-sheet" data-valor="hoje">Hoje (17/11/2026)</button>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-terciario" data-action="set-periodo-sheet" data-valor="7dias">Últimos 7 dias</button>' +
        '<button type="button" class="ds-btn ds-btn-l ds-btn-terciario" data-action="set-periodo-sheet" data-valor="mes">Novembro completo</button>';
    }

    return (
      '<div class="app-sheet-backdrop" data-action="fechar-sheet-bg">' +
      '  <div class="app-sheet" onclick="event.stopPropagation()">' +
      '    <div class="app-sheet-handle"></div>' +
      inner +
      '  </div>' +
      '</div>'
    );
  }

  global.PDVTelasGestao = {
    INSPECTOR: INSPECTOR,
    renderTela: renderTela,
    renderSheet: renderSheet
  };
})(window);
