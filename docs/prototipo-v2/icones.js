/* ==========================================================================
   Prisma PDV — Catálogo de Ícones SVG 24x24 (Stroke 2) & Marca Prisma Aquarela 3D
   Fidelidade aos traços de AppVender/AppInicio/Main.dc.html + 3 Direções de Marca.
   ========================================================================== */
(function (global) {
  'use strict';

  var brandSeq = 0;

  var PATHS = {
    voltar: '<path d="M15 18l-6-6 6-6"/>',
    voltarLinha: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    chevronDireita: '<path d="M9 18l6-6-6-6"/>',
    chevronBaixo: '<path d="M6 9l6 6 6-6"/>',
    chevronCima: '<path d="M18 15l-6-6-6 6"/>',
    fechar: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    apagar: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-5 6M12 9l5 6"/>',
    inicio: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    produtos: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
    caixa: '<rect x="3" y="11" width="18" height="9" rx="2"/><path d="M7 11V5h10v6M10 15.5h4"/>',
    ajustes: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    codigoBarras: '<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>',
    moldura: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/>',
    cadastrarBipando: '<path d="M3 5v10M6 5v10M10 5v10M13 5v10M17 5v4M18 14v7M14.5 17.5h7"/>',
    calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
    fecharCaixa: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
    pix: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M9 12h6"/>',
    dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    online: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M9.5 14.5l2 2 3.5-3.5"/>',
    offline: '<path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><path d="M1 1l22 22"/>',
    sincronizar: '<path d="M21 12a9 9 0 0 0-15.5-6.36L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.36L21 16"/><path d="M21 21v-5h-5"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lua: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    vibrar: '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M4 9v6M20 9v6"/>',
    alerta: '<path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    erro: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    lixeira: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    lanterna: '<path d="M7 3h10v4l-2 3v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V10L7 7z"/><path d="M12 13v2"/>',
    lanternaDesligada: '<path d="M7 3h10v4l-2 3v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V10L7 7z"/><path d="M7 7h10"/><path d="M12 13v2"/>',
    dividir: '<path d="M6 3v5a6 6 0 0 0 6 6v7M18 3v5a6 6 0 0 1-6 6"/>',
    recibo: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    estoque: '<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10M8 5l8 4"/>',
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M18 14a5 5 0 0 1 4 6"/>',
    relatorio: '<path d="M4 20h16"/><rect x="6" y="12" width="3" height="5" rx="1"/><rect x="11" y="8" width="3" height="9" rx="1"/><rect x="16" y="5" width="3" height="12" rx="1"/>',
    loja: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
    transferir: '<path d="M7 16l-4-4 4-4M3 12h13M17 8l4 4-4 4M21 12H8"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    compartilhar: '<path d="M21 3 10 14"/><path d="M21 3 14 21l-4-7-7-4 18-7Z"/>',
    filtro: '<path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/>',
    olho: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>',
    olhoFechado: '<path d="M2 2l20 20M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-3.3 4.4M6.6 6.6A16.5 16.5 0 0 0 2 12s3.5 6 10 6a9.8 9.8 0 0 0 4.3-1"/>',
    celular: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18h3"/>',
    tablet: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M17 10v4"/>',
    avulso: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h1"/><path d="M10.5 10h1"/><path d="M14.5 10h1"/><path d="M7 14h10"/>',
    aproximacao: '<path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17"/><path d="M5 12h.01"/>',
    qrCode: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h7v-4"/>',
    whatsapp: '<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/><path d="M9.5 9.5c.3-.5.8-.5 1.2 0l.8 1.2c.2.4.1.9-.3 1.2.4.7 1.1 1.4 1.8 1.8.3-.4.8-.5 1.2-.3l1.2.8c.5.4.5.9 0 1.2-.8.7-2.2.8-3.7 0-1.6-.9-3-2.3-3.9-3.9-.8-1.5-.7-2.9 0-3.7z"/>',
    desfazer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    margem: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    linkExterno: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
    maquininha: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8v4H8zM9 14h2M13 14h2M9 17h2M13 17h2"/>'
  };

  function svg(nome, size, cor, strokeWidth) {
    var s = size || 24;
    var sw = strokeWidth || 2;
    var path = PATHS[nome] || PATHS.info;
    var colorAttr = cor ? ' style="color:' + cor + '"' : '';
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + colorAttr + '>' + path + '</svg>';
  }

  function wordmarkHtml(opts) {
    var o = opts || {};
    var fs = o.size || 24;
    var lh = Math.round(fs * 1.2);
    var dot = Math.max(7, Math.round(fs * 0.34));
    var corTexto = o.corTexto || 'var(--ink)';
    var corPonto = o.corPonto || 'var(--manga)';
    return (
      '<span style="display:inline-flex;align-items:baseline;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:800;font-size:' +
      fs +
      'px;line-height:' +
      lh +
      'px;letter-spacing:-0.025em;color:' +
      corTexto +
      ';">' +
      'Prisma' +
      '<span aria-hidden="true" style="display:inline-block;width:' +
      dot +
      'px;height:' +
      dot +
      'px;border-radius:999px;background:' +
      corPonto +
      ';margin-left:3px;flex-shrink:0;"></span>' +
      '</span>'
    );
  }

  /* Marca Prisma PDV esculpida com caminhos vetoriais orgânicos (<=5 paths/SVG) */
  function marcaSvg(direcao, size) {
    var s = size || 64;
    brandSeq += 1;
    var p = 'bm' + brandSeq + '_';

    var SQUIRCLE = 'M56 12 H144 Q188 12 188 56 V144 Q188 188 144 188 H56 Q12 188 12 144 V56 Q12 12 56 12 Z';
    var PRISMA_ALL = 'M91 48 Q100 34 109 48 L152 134 Q158 146 144 146 H56 Q42 146 48 134 Z';
    var PRISMA_SIDE = 'M100 41 Q105 41 109 48 L152 134 Q158 146 144 146 H112 L96 42 Z';
    var EAN_BARS =
      'M74 87 a3.5 3.5 0 0 1 7 0 v32 a3.5 3.5 0 0 1 -7 0 Z ' +
      'M86 76 a4.5 4.5 0 0 1 9 0 v42 a4.5 4.5 0 0 1 -9 0 Z ' +
      'M101 84 a3 3 0 0 1 6 0 v35 a3 3 0 0 1 -6 0 Z ' +
      'M113 88 a4 4 0 0 1 8 0 v31 a4 4 0 0 1 -8 0 Z';
    var BEAM = 'M33 103 H167 a3.5 3.5 0 0 1 0 7 H33 a3.5 3.5 0 0 1 0 -7 Z';

    if (direcao === 'solar') {
      return (
        '<svg width="' + s + '" height="' + s + '" viewBox="0 0 200 200" fill="none" role="img" aria-label="Marca Prisma PDV Direção B Solar" style="display:block;flex-shrink:0;">' +
        '<defs>' +
        '<radialGradient id="' + p + 'bg" cx="0.32" cy="0.24" r="0.92" fx="0.2" fy="0.14"><stop offset="0" stop-color="#FFF5C4"/><stop offset="0.52" stop-color="#FFC933"/><stop offset="1" stop-color="#FF8C42"/></radialGradient>' +
        '<radialGradient id="' + p + 'pr" cx="0.35" cy="0.28" r="0.88"><stop offset="0" stop-color="#352F6E"/><stop offset="0.6" stop-color="#1D1942"/><stop offset="1" stop-color="#0D0B1A"/></radialGradient>' +
        '<linearGradient id="' + p + 'bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF7A59" stop-opacity="0"/><stop offset="0.25" stop-color="#FF7A59"/><stop offset="0.5" stop-color="#FFFFFF"/><stop offset="0.78" stop-color="#3346F0"/><stop offset="1" stop-color="#3346F0" stop-opacity="0"/></linearGradient>' +
        '</defs>' +
        '<path d="' + SQUIRCLE + '" fill="url(#' + p + 'bg)"/>' +
        '<path d="' + PRISMA_ALL + '" fill="url(#' + p + 'pr)"/>' +
        '<path d="' + EAN_BARS + '" fill="#FFF4C2"/>' +
        '<path d="' + BEAM + '" fill="url(#' + p + 'bm)"/>' +
        '</svg>'
      );
    }

    if (direcao === 'aquarela') {
      return (
        '<svg width="' + s + '" height="' + s + '" viewBox="0 0 200 200" fill="none" role="img" aria-label="Marca Prisma PDV Direção C Aquarela" style="display:block;flex-shrink:0;">' +
        '<defs>' +
        '<radialGradient id="' + p + 'bg" cx="0.32" cy="0.24" r="0.95" fx="0.2" fy="0.14"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="#FFF3CC"/><stop offset="1" stop-color="#FFC7AE"/></radialGradient>' +
        '<radialGradient id="' + p + 'pr" cx="0.35" cy="0.28" r="0.88"><stop offset="0" stop-color="#FFE08A"/><stop offset="0.48" stop-color="#FFC933"/><stop offset="1" stop-color="#FF7A59"/></radialGradient>' +
        '<radialGradient id="' + p + 'sd" cx="0.3" cy="0.25" r="0.9"><stop offset="0" stop-color="#C9B8FF"/><stop offset="0.55" stop-color="#7B5CFF"/><stop offset="1" stop-color="#3346F0"/></radialGradient>' +
        '<linearGradient id="' + p + 'bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF7A59" stop-opacity="0"/><stop offset="0.25" stop-color="#FFC933"/><stop offset="0.52" stop-color="#FFFFFF"/><stop offset="0.8" stop-color="#2EC4B6"/><stop offset="1" stop-color="#2EC4B6" stop-opacity="0"/></linearGradient>' +
        '</defs>' +
        '<path d="' + SQUIRCLE + '" fill="url(#' + p + 'bg)"/>' +
        '<path d="' + PRISMA_ALL + '" fill="url(#' + p + 'pr)"/>' +
        '<path d="' + PRISMA_SIDE + '" fill="url(#' + p + 'sd)" opacity="0.92"/>' +
        '<path d="' + EAN_BARS + '" fill="#14112B"/>' +
        '<path d="' + BEAM + '" fill="url(#' + p + 'bm)"/>' +
        '</svg>'
      );
    }

    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 200 200" fill="none" role="img" aria-label="Marca Prisma PDV Direção A Noite e Manga" style="display:block;flex-shrink:0;">' +
      '<defs>' +
      '<radialGradient id="' + p + 'bg" cx="0.3" cy="0.22" r="0.95" fx="0.2" fy="0.14"><stop offset="0" stop-color="#2D275C"/><stop offset="0.55" stop-color="#14112B"/><stop offset="1" stop-color="#0D0B1A"/></radialGradient>' +
      '<radialGradient id="' + p + 'pr" cx="0.34" cy="0.28" r="0.88"><stop offset="0" stop-color="#FFF5C4"/><stop offset="0.48" stop-color="#FFC933"/><stop offset="1" stop-color="#FF7A59"/></radialGradient>' +
      '<radialGradient id="' + p + 'sd" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="#9A8CFF"/><stop offset="0.55" stop-color="#3346F0"/><stop offset="1" stop-color="#2EC4B6"/></radialGradient>' +
      '<linearGradient id="' + p + 'bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFC933" stop-opacity="0"/><stop offset="0.22" stop-color="#FFC933"/><stop offset="0.5" stop-color="#FFFFFF"/><stop offset="0.78" stop-color="#2EC4B6"/><stop offset="1" stop-color="#2EC4B6" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      '<path d="' + SQUIRCLE + '" fill="url(#' + p + 'bg)"/>' +
      '<path d="' + PRISMA_ALL + '" fill="url(#' + p + 'pr)"/>' +
      '<path d="' + PRISMA_SIDE + '" fill="url(#' + p + 'sd)" opacity="0.92"/>' +
      '<path d="' + EAN_BARS + '" fill="#14112B"/>' +
      '<path d="' + BEAM + '" fill="url(#' + p + 'bm)"/>' +
      '</svg>'
    );
  }

  function marcaMonocromaticaSvg(size) {
    var s = size || 64;
    var SQUIRCLE = 'M56 12 H144 Q188 12 188 56 V144 Q188 188 144 188 H56 Q12 188 12 144 V56 Q12 12 56 12 Z';
    var PRISMA_EVENODD =
      'M92 50 Q100 38 108 50 L147 130 Q152 140 140 140 H60 Q48 140 53 130 Z ' +
      'M76 89 a3.5 3.5 0 0 1 7 0 v31 a3.5 3.5 0 0 1 -7 0 Z ' +
      'M88 79 a4 4 0 0 1 8 0 v41 a4 4 0 0 1 -8 0 Z ' +
      'M103 85 a3 3 0 0 1 6 0 v35 a3 3 0 0 1 -6 0 Z ' +
      'M114 89 a3.5 3.5 0 0 1 7 0 v31 a3.5 3.5 0 0 1 -7 0 Z';
    return (
      '<svg width="' + s + '" height="' + s + '" viewBox="0 0 200 200" fill="none" role="img" aria-label="Ícone monocromático Android 13+" style="display:block;flex-shrink:0;">' +
      '<path d="' + SQUIRCLE + '" fill="#EAE7E1"/>' +
      '<path d="' + PRISMA_EVENODD + '" fill="#14112B" fill-rule="evenodd"/>' +
      '</svg>'
    );
  }

  function ilustraSvg(tipo, size) {
    if (global.PDVIlustra && typeof global.PDVIlustra.svg === 'function') {
      return global.PDVIlustra.svg(tipo, size || 160);
    }
    return '';
  }

  global.PDVIcones = {
    PATHS: PATHS,
    svg: svg,
    wordmarkHtml: wordmarkHtml,
    marcaSvg: marcaSvg,
    marcaMonocromaticaSvg: marcaMonocromaticaSvg,
    ilustraSvg: ilustraSvg
  };
})(window);
