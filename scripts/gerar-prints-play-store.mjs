import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import QRCode from 'qrcode';

const RAIZ = resolve(import.meta.dirname, '..');
const PLAY_DIR_PADRAO = join(RAIZ, 'builds', 'play-store');
const TEMP_DIR = join(RAIZ, 'builds', '.tmp-prints');

const LARGURA_PX = 1080;
const ALTURA_PX = 1920;
// 1080 / 2.6666667 = 405dp de largura × 720dp de altura (proporção exata 9:16).
const DP = LARGURA_PX / 405;

const EDGE_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

export function encontrarNavegador() {
  for (const p of EDGE_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  throw new Error('Nenhum navegador Chromium (Chrome/Edge) encontrado para rasterizar os prints.');
}

function carregarFonteBase64(caminhoRelativo) {
  const caminho = join(RAIZ, 'node_modules', '@expo-google-fonts', ...caminhoRelativo);
  if (!existsSync(caminho)) {
    throw new Error(`Fonte obrigatória não encontrada: ${caminho}`);
  }
  return readFileSync(caminho).toString('base64');
}

function extrairIlustracao(chave) {
  const caminho = join(RAIZ, 'docs', 'prototipo-v2', 'ilustracoes.js');
  const conteudo = readFileSync(caminho, 'utf8');
  const match = new RegExp(`"${chave}":\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(conteudo);
  if (!match) {
    throw new Error(`Ilustração "${chave}" não encontrada em ${caminho}`);
  }
  return JSON.parse(`"${match[1]}"`);
}

function esc(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ICONES = {
  voltar: '<path d="M15 18l-6-6 6-6"/>',
  chevronDireita: '<path d="M9 18l6-6-6-6"/>',
  chevronCima: '<path d="M18 15l-6-6-6 6"/>',
  chevronBaixo: '<path d="M6 9l6 6 6-6"/>',
  fechar: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  inicio: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  produtos: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  caixa: '<rect x="3" y="11" width="18" height="9" rx="2"/><path d="M7 11V5h10v6M10 15.5h4"/>',
  ajustes: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  codigoBarras: '<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>',
  cadastrarBipando: '<path d="M3 5v10M6 5v10M10 5v10M13 5v10M17 5v4M18 14v7M14.5 17.5h7"/>',
  calculadora: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  fecharCaixa: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
  pix: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M9 12h6"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  online: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M9.5 14.5l2 2 3.5-3.5"/>',
  sincronizar: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  alerta: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  lixeira: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  lanternaDesligada: '<path d="M9 2h6v4l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V2z"/><path d="M12 12v3M3 3l18 18"/>',
  dividir: '<path d="M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3M15 9l6-6"/>',
  apagar: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M16 9.5l-5 5M11 9.5l5 5"/>',
  raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  suprimento: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  sangria: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
};

function icone(nome, tamanhoDp = 24, cor = '#14112B', espessura = 2) {
  const corpo = ICONES[nome];
  if (!corpo) throw new Error(`Ícone desconhecido: ${nome}`);
  const px = `calc(${tamanhoDp} * var(--dp))`;
  return `<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${espessura}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;display:block;">${corpo}</svg>`;
}

function statusBar(claro = false) {
  const cor = claro ? '#FFFFFF' : '#14112B';
  const fundo = claro ? 'transparent' : 'transparent';
  return `<div class="status-bar" style="color:${cor};background:${fundo};">
    <span class="status-hora">14:28</span>
    <div class="status-icones">
      <svg class="st-svg" viewBox="0 0 18 14" fill="${cor}">
        <rect x="1" y="9" width="2.6" height="4" rx="1"/>
        <rect x="5" y="6.5" width="2.6" height="6.5" rx="1"/>
        <rect x="9" y="4" width="2.6" height="9" rx="1"/>
        <rect x="13" y="1.5" width="2.6" height="11.5" rx="1"/>
      </svg>
      <span class="st-5g">5G</span>
      <svg class="st-svg" viewBox="0 0 18 14" fill="none" stroke="${cor}" stroke-width="1.8" stroke-linecap="round">
        <path d="M1.8 4.8a10.2 10.2 0 0 1 14.4 0"/>
        <path d="M4.6 7.8a6.2 6.2 0 0 1 8.8 0"/>
        <circle cx="9" cy="11.2" r="1.2" fill="${cor}" stroke="none"/>
      </svg>
      <svg class="st-bat" viewBox="0 0 24 13" fill="none">
        <rect x="1" y="1.5" width="19" height="10" rx="2.8" stroke="${cor}" stroke-width="1.5"/>
        <rect x="2.8" y="3.3" width="14" height="6.4" rx="1.4" fill="${cor}"/>
        <path d="M21.5 4.8v3.4" stroke="${cor}" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    </div>
  </div>`;
}

function gestureBar() {
  return `<div class="gesture-wrap"><div class="gesture-pill"></div></div>`;
}

function barraInferior(ativa) {
  const abas = [
    { id: 'inicio', rotulo: 'Início', icone: 'inicio' },
    { id: 'produtos', rotulo: 'Produtos', icone: 'produtos' },
    { id: 'caixa', rotulo: 'Caixa', icone: 'caixa' },
    { id: 'ajustes', rotulo: 'Ajustes', icone: 'ajustes' },
  ];
  const renderAba = (a) => {
    const isAtiva = a.id === ativa;
    const cor = isAtiva ? '#14112B' : '#4A4766';
    return `<div class="tab-item">
      ${icone(a.icone, 22, cor, isAtiva ? 2.2 : 1.9)}
      <span class="tab-label" style="color:${cor};">${esc(a.rotulo)}</span>
      <span class="tab-dot" style="background:${isAtiva ? '#FFC933' : 'transparent'};"></span>
    </div>`;
  };
  return `<div class="barra-inferior-wrap">
    <div class="barra-inferior">
      <div class="tab-lateral">${renderAba(abas[0])}${renderAba(abas[1])}</div>
      <div class="tab-central">
        <div class="btn-vender-fab">
          ${icone('codigoBarras', 22, '#14112B', 2.2)}
          <span>Vender</span>
        </div>
      </div>
      <div class="tab-lateral">${renderAba(abas[2])}${renderAba(abas[3])}</div>
    </div>
    ${gestureBar()}
  </div>`;
}

function statusPill(rotulo, tipo = 'pago', iconeNome = 'check') {
  const coresPill = {
    pago: { bg: '#DDF5E7', fg: '#0E7A40' },
    aberto: { bg: '#DDF5E7', fg: '#0E7A40' },
    atencao: { bg: '#FFEFD9', fg: '#A65400' },
  }[tipo];
  return `<span class="status-pill" style="background:${coresPill.bg};color:${coresPill.fg};">
    ${icone(iconeNome, 13, coresPill.fg, 2.5)}
    <span>${esc(rotulo)}</span>
  </span>`;
}

function cabecalhoPagamento(titulo, adornoHtml = '') {
  return `<div class="cab-pag">
    <div class="btn-icone-round">${icone('voltar', 22, '#14112B', 2.1)}</div>
    ${adornoHtml}
    <span class="t-titulo-m" style="flex:1;">${esc(titulo)}</span>
  </div>`;
}

function cabecalhoCaixa(secaoAtiva) {
  const opcoes = [
    { id: 'resumo', rotulo: 'Resumo' },
    { id: 'vendas', rotulo: 'Vendas' },
    { id: 'sync', rotulo: 'Sincronização' },
  ];
  return `<div class="cab-caixa">
    <h1 class="t-titulo-xl">Caixa</h1>
    <div class="segmentado">
      ${opcoes
        .map(
          (o) => `<div class="seg-item ${o.id === secaoAtiva ? 'is-active' : ''}">${esc(o.rotulo)}</div>`,
        )
        .join('')}
    </div>
  </div>`;
}

function monogramaProduto(nome) {
  const palavras = nome.split(/\s+/).filter((p) => p.length > 2 && !/^\d/.test(p));
  const [primeira = nome, segunda = ''] = palavras;
  return `${primeira.charAt(0)}${segunda.charAt(0)}`.toUpperCase();
}

function fundoDoMonograma(nome) {
  const FUNDOS = ['#FFF3CC', '#FFEFD9', '#E6E9FF', '#FDE3E6', '#DDF5E7'];
  let soma = 0;
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i);
  return FUNDOS[soma % FUNDOS.length];
}

function estilosBaseCss(fontesCss) {
  return `
${fontesCss}
:root {
  --dp: ${DP.toFixed(7)}px;
  --ink: #14112B;
  --ink2: #4A4766;
  --ink3: #5C5973;
  --bg: #FFFFFF;
  --surface: #F4F2EE;
  --surface2: #EAE7E1;
  --line: #E2DED6;
  --manga: #FFC933;
  --manga-strong: #F2B200;
  --manga-soft: #FFF3CC;
  --anil: #3346F0;
  --anil-soft: #E6E9FF;
  --folha: #0E7A40;
  --folha-soft: #DDF5E7;
  --ambar: #A65400;
  --ambar-soft: #FFEFD9;
  --noite: #0D0B1A;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${LARGURA_PX}px;
  height: ${ALTURA_PX}px;
  overflow: hidden;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.phone {
  width: ${LARGURA_PX}px;
  height: ${ALTURA_PX}px;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
  position: relative;
}
.status-bar {
  height: calc(28 * var(--dp));
  padding: 0 calc(20 * var(--dp));
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  z-index: 20;
}
.status-hora {
  font-size: calc(13 * var(--dp));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.status-icones {
  display: flex;
  align-items: center;
  gap: calc(6 * var(--dp));
}
.st-svg { width: calc(15 * var(--dp)); height: calc(12 * var(--dp)); display: block; }
.st-5g { font-size: calc(10.5 * var(--dp)); font-weight: 700; letter-spacing: -0.02em; }
.st-bat { width: calc(22 * var(--dp)); height: calc(12 * var(--dp)); display: block; }

.gesture-wrap {
  height: calc(18 * var(--dp));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: transparent;
}
.gesture-pill {
  width: calc(112 * var(--dp));
  height: calc(4 * var(--dp));
  border-radius: 999px;
  background: rgba(20, 17, 43, 0.22);
}

.tela-scroll {
  flex: 1;
  min-height: 0;
  padding: calc(12 * var(--dp)) calc(20 * var(--dp)) calc(12 * var(--dp));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tipografia */
.num { font-variant-numeric: tabular-nums; }
.t-display {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: calc(44 * var(--dp));
  line-height: calc(44 * var(--dp));
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.t-titulo-xl {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: calc(32 * var(--dp));
  line-height: calc(34 * var(--dp));
  font-weight: 800;
  letter-spacing: -0.015em;
}
.t-titulo-l {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: calc(24 * var(--dp));
  line-height: calc(28 * var(--dp));
  font-weight: 700;
  letter-spacing: -0.01em;
}
.t-titulo-m {
  font-family: 'Inter', sans-serif;
  font-size: calc(18 * var(--dp));
  line-height: calc(24 * var(--dp));
  font-weight: 700;
}
.t-corpo-l {
  font-size: calc(17 * var(--dp));
  line-height: calc(24 * var(--dp));
  font-weight: 400;
}
.t-corpo {
  font-size: calc(15 * var(--dp));
  line-height: calc(22 * var(--dp));
  font-weight: 400;
}
.t-corpo-m {
  font-size: calc(15 * var(--dp));
  line-height: calc(21 * var(--dp));
  font-weight: 500;
}
.t-label {
  font-size: calc(13 * var(--dp));
  line-height: calc(18 * var(--dp));
  font-weight: 600;
}
.t-legenda {
  font-size: calc(12 * var(--dp));
  line-height: calc(16 * var(--dp));
  font-weight: 500;
}
.t-legenda-forte {
  font-size: calc(12 * var(--dp));
  line-height: calc(16 * var(--dp));
  font-weight: 600;
}

/* Botões e controles */
.btn {
  width: 100%;
  min-height: calc(52 * var(--dp));
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(8 * var(--dp));
  padding: 0 calc(20 * var(--dp));
  font-weight: 700;
  font-size: calc(16.5 * var(--dp));
}
.btn-m {
  min-height: calc(46 * var(--dp));
  font-size: calc(15 * var(--dp));
  font-weight: 600;
}
.btn-s {
  width: auto;
  min-height: calc(36 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  font-size: calc(13 * var(--dp));
  font-weight: 600;
}
.btn-primario { background: var(--manga); color: var(--ink); }
.btn-secundario { background: var(--ink); color: var(--bg); }
.btn-terciario { background: var(--surface); color: var(--ink); }
.btn-terciario-elev { background: var(--bg); color: var(--ink); border: 1px solid var(--line); }
.btn-ghost { background: transparent; color: var(--ink); }

.btn-icone-round {
  width: calc(44 * var(--dp));
  height: calc(44 * var(--dp));
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-pill {
  min-height: calc(24 * var(--dp));
  display: inline-flex;
  align-items: center;
  gap: calc(4 * var(--dp));
  padding: 0 calc(8 * var(--dp)) 0 calc(6 * var(--dp));
  border-radius: 999px;
  font-size: calc(12 * var(--dp));
  font-weight: 600;
  white-space: nowrap;
}

.chip {
  min-height: calc(34 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  font-size: calc(13 * var(--dp));
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  flex-shrink: 0;
}
.chip.is-active {
  background: var(--ink);
  color: var(--bg);
}

.banner {
  display: flex;
  align-items: flex-start;
  gap: calc(12 * var(--dp));
  padding: calc(13 * var(--dp)) calc(15 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--anil-soft);
}

.cab-pag {
  min-height: calc(50 * var(--dp));
  display: flex;
  align-items: center;
  gap: calc(10 * var(--dp));
  margin-left: calc(-10 * var(--dp));
}

.cab-caixa {
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--dp));
}
.segmentado {
  display: flex;
  gap: calc(4 * var(--dp));
  padding: calc(4 * var(--dp));
  border-radius: 999px;
  background: var(--surface);
}
.seg-item {
  flex: 1;
  min-height: calc(38 * var(--dp));
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(14.5 * var(--dp));
  font-weight: 600;
  color: var(--ink2);
}
.seg-item.is-active {
  background: var(--bg);
  color: var(--ink);
  box-shadow: 0 calc(1 * var(--dp)) calc(3 * var(--dp)) rgba(20, 17, 43, 0.12);
}

/* Barra inferior */
.barra-inferior-wrap {
  flex-shrink: 0;
  background: var(--bg);
  border-top: 1px solid var(--line);
}
.barra-inferior {
  height: calc(68 * var(--dp));
  padding-top: calc(7 * var(--dp));
  display: flex;
  align-items: flex-start;
}
.tab-lateral {
  flex: 2;
  display: flex;
}
.tab-central {
  width: calc(114 * var(--dp));
  display: flex;
  justify-content: center;
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(3 * var(--dp));
}
.tab-label {
  font-size: calc(12 * var(--dp));
  line-height: calc(15 * var(--dp));
  font-weight: 600;
}
.tab-dot {
  width: calc(6 * var(--dp));
  height: calc(6 * var(--dp));
  border-radius: 999px;
}
.btn-vender-fab {
  min-width: calc(106 * var(--dp));
  height: calc(54 * var(--dp));
  margin-top: calc(-20 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  border-radius: 999px;
  background: var(--manga);
  border: calc(4 * var(--dp)) solid var(--bg);
  box-shadow: 0 calc(6 * var(--dp)) calc(16 * var(--dp)) rgba(20, 17, 43, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(6 * var(--dp));
  font-size: calc(15.5 * var(--dp));
  font-weight: 700;
  color: var(--ink);
}
`;
}

function envolverDocumento(titulo, fontesCss, cssExtra, conteudo) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(titulo)}</title>
<style>
${estilosBaseCss(fontesCss)}
${cssExtra}
</style>
</head>
<body>
  <div class="phone">
    ${conteudo}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Início (Home Balcão)
// ---------------------------------------------------------------------------
function htmlTelaInicio(fontesCss) {
  const meios = [
    { nome: 'Dinheiro', valor: 'R$ 412,30', pct: '32.1%' },
    { nome: 'Pix', valor: 'R$ 598,70', pct: '46.6%' },
    { nome: 'Cartão', valor: 'R$ 273,50', pct: '21.3%' },
  ];
  const atalhos = [
    { icone: 'fecharCaixa', rotulo: 'Fechar caixa' },
    { icone: 'cadastrarBipando', rotulo: 'Cadastrar bipando' },
    { icone: 'produtos', rotulo: 'Produtos' },
    { icone: 'calculadora', rotulo: 'Valor avulso' },
  ];
  const vendas = [
    { num: '#000047', meio: 'Pix', icone: 'pix', hora: '14:22', valor: 'R$ 41,68' },
  ];

  const css = `
.tela-inicio { gap: calc(7 * var(--dp)); padding-top: calc(8 * var(--dp)); padding-bottom: calc(16 * var(--dp)); }
.inicio-cab { display: flex; flex-direction: column; gap: calc(1 * var(--dp)); }
.status-online { display: flex; align-items: center; gap: calc(6 * var(--dp)); margin-top: calc(2 * var(--dp)); color: var(--folha); }
.resumo-card {
  padding: calc(11 * var(--dp)) calc(15 * var(--dp));
  border-radius: calc(20 * var(--dp));
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: calc(7 * var(--dp));
}
.meios-list { display: flex; flex-direction: column; gap: calc(5 * var(--dp)); }
.meio-row { display: flex; align-items: center; gap: calc(10 * var(--dp)); }
.meio-nome { width: calc(62 * var(--dp)); color: var(--ink2); }
.trilho { flex: 1; height: calc(7.5 * var(--dp)); border-radius: 999px; background: var(--surface2); overflow: hidden; }
.barra { height: 100%; border-radius: 999px; background: var(--ink); }
.meio-val { min-width: calc(80 * var(--dp)); text-align: right; font-variant-numeric: tabular-nums; }
.turno-card {
  padding: calc(10 * var(--dp)) calc(14 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: calc(6 * var(--dp));
}
.turno-topo { display: flex; align-items: center; justify-content: space-between; gap: calc(10 * var(--dp)); }
.atalhos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: calc(8 * var(--dp)); }
.atalho-tile {
  min-height: calc(56 * var(--dp));
  padding: calc(9 * var(--dp)) calc(13 * var(--dp));
  border-radius: calc(15 * var(--dp));
  background: var(--surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: calc(4 * var(--dp));
}
.ultimas-wrap { display: flex; flex-direction: column; gap: calc(2 * var(--dp)); }
.ultimas-head { display: flex; align-items: center; justify-content: space-between; }
.venda-row {
  min-height: calc(46 * var(--dp));
  display: flex;
  align-items: center;
  gap: calc(12 * var(--dp));
  padding: calc(3 * var(--dp)) 0;
}
.venda-row.has-div { border-bottom: 1px solid var(--line); }
.venda-mini {
  width: calc(38 * var(--dp));
  height: calc(38 * var(--dp));
  border-radius: calc(12 * var(--dp));
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.venda-val { display: flex; flex-direction: column; align-items: flex-end; gap: calc(3 * var(--dp)); }
`;

  const body = `
${statusBar(false)}
<div class="tela-scroll tela-inicio">
  <div class="inicio-cab">
    <h1 class="t-titulo-xl">Olá, Ana</h1>
    <div class="t-corpo-m" style="color:var(--ink2);">Mercadinho Bom Preço</div>
    <div class="status-online">
      ${icone('online', 16, '#0E7A40', 2.1)}
      <span class="t-label" style="color:#0E7A40;">Online · sincronizado</span>
    </div>
  </div>

  <div class="resumo-card">
    <div style="display:flex;flex-direction:column;gap:calc(2 * var(--dp));">
      <span class="t-label" style="color:var(--ink2);">Vendido hoje</span>
      <div class="t-display" style="font-size:calc(38 * var(--dp));line-height:calc(40 * var(--dp));">R$ 1.284,50</div>
      <span class="t-corpo-m" style="color:var(--ink2);">47 vendas</span>
    </div>
    <div class="meios-list">
      ${meios
        .map(
          (m) => `<div class="meio-row">
            <span class="t-label meio-nome">${esc(m.nome)}</span>
            <div class="trilho"><div class="barra" style="width:${m.pct};"></div></div>
            <span class="t-label meio-val">${esc(m.valor)}</span>
          </div>`,
        )
        .join('')}
    </div>
  </div>

  <div class="turno-card">
    <div class="turno-topo">
      <span class="t-label" style="color:var(--ink2);">Turno aberto neste aparelho</span>
      ${statusPill('Em operação', 'aberto', 'check')}
    </div>
    <div class="btn btn-m btn-terciario-elev" style="min-height:calc(38 * var(--dp));font-size:calc(14 * var(--dp));">
      ${icone('caixa', 18, '#14112B', 2)}
      <span>Ver gaveta e movimentos</span>
    </div>
  </div>

  <div class="atalhos-grid">
    ${atalhos
      .map(
        (a) => `<div class="atalho-tile">
          ${icone(a.icone, 20, '#14112B', 2)}
          <span class="t-corpo-m" style="font-weight:600;font-size:calc(14.5 * var(--dp));">${esc(a.rotulo)}</span>
        </div>`,
      )
      .join('')}
  </div>

  <div class="ultimas-wrap">
    <div class="ultimas-head">
      <span class="t-titulo-m">Últimas vendas</span>
      <span class="t-label" style="color:var(--ink2);">Ver todas</span>
    </div>
    ${vendas
      .map(
        (v) => `<div class="venda-row">
          <div class="venda-mini">${icone(v.icone, 19, '#14112B', 2)}</div>
          <div style="flex:1;min-width:0;">
            <div class="t-corpo-m num">${esc(`${v.num} · ${v.meio}`)}</div>
            <div class="t-legenda num" style="color:var(--ink3);">${esc(v.hora)}</div>
          </div>
          <div class="venda-val">
            <span class="t-corpo-m num">${esc(v.valor)}</span>
            ${statusPill('Pago', 'pago', 'check')}
          </div>
        </div>`,
      )
      .join('')}
  </div>
</div>
${barraInferior('inicio')}
`;
  return envolverDocumento('Captura 01 — Início', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 2. Vender (Visor com câmera + Carrinho)
// ---------------------------------------------------------------------------
function htmlTelaVender(fontesCss) {
  const css = `
.visor {
  height: calc(226 * var(--dp));
  background: radial-gradient(circle at 50% 56%, #29234D 0%, #15112E 58%, #0D0B1A 100%);
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.visor-scene {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
/* Embalagem / caixa de leite desfocada suavemente no visor da câmera */
.pacote-fundo {
  width: calc(268 * var(--dp));
  height: calc(134 * var(--dp));
  margin-top: calc(12 * var(--dp));
  border-radius: calc(20 * var(--dp));
  background: linear-gradient(135deg, #273775 0%, #1C2756 48%, #151D40 100%);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 calc(16 * var(--dp)) calc(36 * var(--dp)) rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.etiqueta-ean {
  width: calc(166 * var(--dp));
  height: calc(68 * var(--dp));
  border-radius: calc(10 * var(--dp));
  background: rgba(255, 253, 247, 0.96);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(3 * var(--dp));
  padding: calc(7 * var(--dp)) calc(14 * var(--dp));
  box-shadow: 0 calc(4 * var(--dp)) calc(16 * var(--dp)) rgba(0,0,0,0.3);
}
.ean-barras {
  width: 100%;
  height: calc(36 * var(--dp));
  display: flex;
  align-items: stretch;
  justify-content: space-between;
}
.ean-bar { background: #14112B; border-radius: 1px; }
.ean-num {
  font-size: calc(10 * var(--dp));
  font-weight: 700;
  letter-spacing: calc(1.6 * var(--dp));
  color: #14112B;
  font-variant-numeric: tabular-nums;
}
.visor-scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse calc(130 * var(--dp)) calc(58 * var(--dp)) at 50% 53%, transparent 66%, rgba(13,11,26,0.52) 100%);
}
.roi-box {
  position: absolute;
  left: 50%;
  top: 53%;
  transform: translate(-50%, -50%);
  width: calc(228 * var(--dp));
  height: calc(96 * var(--dp));
}
.canto {
  position: absolute;
  width: calc(24 * var(--dp));
  height: calc(24 * var(--dp));
}
.canto-tl { top: 0; left: 0; border-top: calc(3.5 * var(--dp)) solid var(--manga); border-left: calc(3.5 * var(--dp)) solid var(--manga); border-top-left-radius: calc(12 * var(--dp)); }
.canto-tr { top: 0; right: 0; border-top: calc(3.5 * var(--dp)) solid var(--manga); border-right: calc(3.5 * var(--dp)) solid var(--manga); border-top-right-radius: calc(12 * var(--dp)); }
.canto-bl { bottom: 0; left: 0; border-bottom: calc(3.5 * var(--dp)) solid var(--manga); border-left: calc(3.5 * var(--dp)) solid var(--manga); border-bottom-left-radius: calc(12 * var(--dp)); }
.canto-br { bottom: 0; right: 0; border-bottom: calc(3.5 * var(--dp)) solid var(--manga); border-right: calc(3.5 * var(--dp)) solid var(--manga); border-bottom-right-radius: calc(12 * var(--dp)); }
.laser {
  position: absolute;
  left: calc(14 * var(--dp));
  right: calc(14 * var(--dp));
  top: 50%;
  height: calc(2.5 * var(--dp));
  border-radius: 999px;
  background: var(--manga);
  box-shadow: 0 0 calc(12 * var(--dp)) rgba(255, 201, 51, 0.9), 0 0 calc(24 * var(--dp)) rgba(255, 122, 89, 0.55);
}
.visor-topo {
  padding: calc(2 * var(--dp)) calc(16 * var(--dp)) 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
}
.btn-visor-icon {
  width: calc(38 * var(--dp));
  height: calc(38 * var(--dp));
  border-radius: 999px;
  background: rgba(255,255,255,0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}
.chip-leitor {
  height: calc(26 * var(--dp));
  padding: 0 calc(12 * var(--dp));
  border-radius: 999px;
  background: rgba(13,11,26,0.72);
  border: 1px solid rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  gap: calc(7 * var(--dp));
  color: #FFFFFF;
  font-size: calc(12 * var(--dp));
  font-weight: 600;
}
.ponto-verde { width: calc(8 * var(--dp)); height: calc(8 * var(--dp)); border-radius: 999px; background: #1FAF5F; }
.visor-baixo {
  margin-top: auto;
  padding-bottom: calc(24 * var(--dp));
  display: flex;
  justify-content: center;
  z-index: 10;
}
.btn-digitar-codigo {
  height: calc(34 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  border-radius: 999px;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.22);
  display: flex;
  align-items: center;
  gap: calc(7 * var(--dp));
  color: #FFFFFF;
  font-size: calc(13 * var(--dp));
  font-weight: 600;
}

.painel-venda {
  flex: 1;
  min-height: 0;
  margin-top: calc(-18 * var(--dp));
  background: var(--bg);
  border-top-left-radius: calc(24 * var(--dp));
  border-top-right-radius: calc(24 * var(--dp));
  box-shadow: 0 calc(-8 * var(--dp)) calc(28 * var(--dp)) rgba(13, 11, 26, 0.22);
  z-index: 15;
  display: flex;
  flex-direction: column;
}
.venda-cab {
  padding: calc(14 * var(--dp)) calc(20 * var(--dp)) calc(8 * var(--dp));
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--dp));
}
.busca-linha { display: flex; align-items: center; gap: calc(8 * var(--dp)); }
.campo-busca-falso {
  flex: 1;
  min-width: 0;
  height: calc(42 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: calc(8 * var(--dp));
  color: var(--ink3);
  font-size: calc(14.5 * var(--dp));
  font-weight: 500;
}
.btn-avulso {
  height: calc(42 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  border-radius: 999px;
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: calc(6 * var(--dp));
  font-size: calc(14.5 * var(--dp));
  font-weight: 600;
}
.chips-atalho { display: flex; gap: calc(8 * var(--dp)); overflow: hidden; }
.itens-wrap {
  flex: 1;
  min-height: 0;
  padding: calc(4 * var(--dp)) calc(20 * var(--dp)) 0;
  display: flex;
  flex-direction: column;
}
.item-destaque {
  padding: calc(12 * var(--dp)) calc(14 * var(--dp));
  border-radius: calc(18 * var(--dp));
  background: var(--manga-soft);
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--dp));
  margin-bottom: calc(4 * var(--dp));
}
.dest-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: calc(10 * var(--dp)); }
.dest-controles { display: flex; align-items: center; justify-content: space-between; }
.stepper { display: flex; align-items: center; gap: calc(8 * var(--dp)); }
.step-btn {
  width: calc(36 * var(--dp));
  height: calc(36 * var(--dp));
  border-radius: 999px;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-chip {
  height: calc(32 * var(--dp));
  padding: 0 calc(12 * var(--dp));
  border-radius: 999px;
  background: var(--surface);
  display: flex;
  align-items: center;
  font-size: calc(13 * var(--dp));
  font-weight: 600;
}
.item-linha {
  min-height: calc(42 * var(--dp));
  display: flex;
  align-items: center;
  gap: calc(10 * var(--dp));
  border-bottom: 1px solid var(--line);
}
.item-linha:last-child { border-bottom: none; }
.venda-rodape {
  margin-top: auto;
  padding: calc(10 * var(--dp)) calc(20 * var(--dp)) calc(4 * var(--dp));
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--dp));
  background: var(--bg);
}
.rodape-total-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
`;

  const barras = [3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2];
  const barrasHtml = barras
    .map((w) => `<div class="ean-bar" style="width:calc(${w * 1.45} * var(--dp));"></div>`)
    .join('');

  const demais = [
    { qtd: '1×', nome: 'Café torrado 500g', val: 'R$ 18,90' },
    { qtd: '1×', nome: 'Feijão carioca 1kg', val: 'R$ 8,50' },
    { qtd: '250 g', nome: 'Pão francês', val: 'R$ 3,70' },
  ];

  const body = `
<div class="visor">
  <div class="visor-scene">
    <div class="pacote-fundo">
      <div class="etiqueta-ean">
        <div class="ean-barras">${barrasHtml}</div>
        <div class="ean-num">7 891000 100103</div>
      </div>
    </div>
  </div>
  <div class="visor-scrim"></div>
  <div class="roi-box">
    <div class="canto canto-tl"></div>
    <div class="canto canto-tr"></div>
    <div class="canto canto-bl"></div>
    <div class="canto canto-br"></div>
    <div class="laser"></div>
  </div>
  ${statusBar(true)}
  <div class="visor-topo">
    <div class="btn-visor-icon">${icone('fechar', 20, '#FFFFFF', 2.2)}</div>
    <div class="chip-leitor"><span class="ponto-verde"></span><span>Leitor ativo</span></div>
    <div class="btn-visor-icon">${icone('lanternaDesligada', 20, '#FFFFFF', 2)}</div>
  </div>
  <div class="visor-baixo">
    <div class="btn-digitar-codigo">
      ${icone('calculadora', 18, '#FFFFFF', 2)}
      <span>Digitar código</span>
    </div>
  </div>
</div>

<div class="painel-venda">
  <div class="venda-cab">
    <div class="busca-linha">
      <div class="campo-busca-falso">
        ${icone('lupa', 18, '#4A4766', 2)}
        <span>Buscar produto ou código</span>
      </div>
      <div class="btn-avulso">
        ${icone('calculadora', 18, '#14112B', 2)}
        <span>Avulso</span>
      </div>
    </div>
    <div class="chips-atalho">
      <span class="chip">Banana prata</span>
      <span class="chip">Pão francês</span>
      <span class="chip">Saco de gelo 5kg</span>
    </div>
  </div>

  <div class="itens-wrap">
    <div class="item-destaque">
      <div class="dest-topo">
        <div style="display:flex;flex-direction:column;gap:calc(2 * var(--dp));">
          <div class="t-titulo-m">Leite integral 1L</div>
          <div class="t-legenda num" style="color:var(--ink2);">EAN 7891000100103</div>
          <div class="t-label num" style="color:var(--ink2);">R$ 5,29 cada</div>
        </div>
        <div class="t-titulo-l num">R$ 10,58</div>
      </div>
      <div class="dest-controles">
        <div class="stepper">
          <div class="step-btn">${icone('menos', 18, '#14112B', 2.2)}</div>
          <span class="t-titulo-m num" style="min-width:calc(28 * var(--dp));text-align:center;">2</span>
          <div class="step-btn">${icone('mais', 18, '#14112B', 2.2)}</div>
          <div class="step-chip">+5</div>
        </div>
        <div class="btn-icone-round" style="width:calc(40 * var(--dp));height:calc(40 * var(--dp));background:rgba(255,255,255,0.65);">
          ${icone('lixeira', 18, '#14112B', 2)}
        </div>
      </div>
    </div>

    ${demais
      .map(
        (it) => `<div class="item-linha">
          <span class="t-corpo-m num" style="flex:1;min-width:0;">${esc(`${it.qtd} ${it.nome}`)}</span>
          <span class="t-corpo-m num">${esc(it.val)}</span>
          <div style="width:calc(32 * var(--dp));display:flex;justify-content:flex-end;">
            ${icone('lixeira', 17, '#5C5973', 1.9)}
          </div>
        </div>`,
      )
      .join('')}
  </div>

  <div class="venda-rodape">
    <div class="rodape-total-row">
      <div style="display:flex;align-items:center;gap:calc(12 * var(--dp));padding-bottom:calc(3 * var(--dp));">
        <span class="t-label" style="color:var(--ink2);">4 itens</span>
        <span class="t-label" style="color:var(--ink);">Limpar venda</span>
      </div>
      <div class="t-display" style="font-size:calc(38 * var(--dp));line-height:calc(40 * var(--dp));">R$ 41,68</div>
    </div>
    <div class="btn btn-primario">Cobrar R$ 41,68</div>
  </div>
  ${gestureBar()}
</div>
`;
  return envolverDocumento('Captura 02 — Vender', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 3. Cobrar (Checkout)
// ---------------------------------------------------------------------------
function htmlTelaCobrar(fontesCss) {
  const itens = [
    { texto: '2× Leite integral 1L', valor: 'R$ 10,58' },
    { texto: '1× Café torrado 500g', valor: 'R$ 18,90' },
    { texto: '1× Feijão carioca 1kg', valor: 'R$ 8,50' },
    { texto: '250 g Pão francês', valor: 'R$ 3,70' },
  ];
  const meios = [
    { icone: 'pix', titulo: 'Pix', legenda: 'QR da sua chave Pix, você confirma' },
    { icone: 'cartao', titulo: 'Cartão', legenda: 'Registre o crédito ou débito da sua maquininha' },
    { icone: 'dinheiro', titulo: 'Dinheiro', legenda: 'Calcula o troco' },
    { icone: 'dividir', titulo: 'Dividir pagamento', legenda: 'Ex.: parte em dinheiro, resto no Pix' },
  ];

  const css = `
.tela-cobrar { gap: calc(10 * var(--dp)); padding-top: calc(8 * var(--dp)); padding-bottom: calc(10 * var(--dp)); }
.resumo-cobrar { display: flex; flex-direction: column; gap: calc(2 * var(--dp)); }
.link-itens {
  display: inline-flex;
  align-items: center;
  gap: calc(6 * var(--dp));
  color: var(--anil);
  font-size: calc(14 * var(--dp));
  font-weight: 600;
  padding: calc(2 * var(--dp)) 0;
}
.itens-box {
  padding: calc(2 * var(--dp)) calc(14 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
  margin-top: calc(2 * var(--dp));
}
.itens-box-row {
  min-height: calc(32 * var(--dp));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10 * var(--dp));
}
.itens-box-row.has-div { border-bottom: 1px solid var(--line); }
.meios-sec { display: flex; flex-direction: column; gap: calc(8 * var(--dp)); margin-top: calc(2 * var(--dp)); }
.tile-meio {
  min-height: calc(60 * var(--dp));
  padding: calc(9 * var(--dp)) calc(14 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: calc(12 * var(--dp));
}
.tile-ico {
  width: calc(38 * var(--dp));
  height: calc(38 * var(--dp));
  border-radius: calc(10 * var(--dp));
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
`;

  const body = `
${statusBar(false)}
<div class="tela-scroll tela-cobrar">
  ${cabecalhoPagamento('Cobrar')}

  <div class="resumo-cobrar">
    <span class="t-legenda" style="color:var(--ink3);">Total da venda</span>
    <div class="t-display">R$ 41,68</div>
    <div class="link-itens">
      <span>4 itens · ocultar itens</span>
      ${icone('chevronCima', 18, '#3346F0', 2.2)}
    </div>
    <div class="itens-box">
      ${itens
        .map(
          (it, idx) => `<div class="itens-box-row ${idx < itens.length - 1 ? 'has-div' : ''}">
            <span class="t-corpo num" style="font-size:calc(14 * var(--dp));">${esc(it.texto)}</span>
            <span class="t-corpo-m num" style="font-size:calc(14 * var(--dp));">${esc(it.valor)}</span>
          </div>`,
        )
        .join('')}
    </div>
  </div>

  <div class="meios-sec">
    <h2 class="t-titulo-l">Como o cliente vai pagar?</h2>
    ${meios
      .map(
        (m) => `<div class="tile-meio">
          <div class="tile-ico">${icone(m.icone, 22, '#14112B', 2)}</div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:calc(2 * var(--dp));">
            <span class="t-corpo-m" style="font-weight:600;">${esc(m.titulo)}</span>
            <span class="t-legenda" style="color:var(--ink3);">${esc(m.legenda)}</span>
          </div>
          ${icone('chevronDireita', 20, '#4A4766', 2)}
        </div>`,
      )
      .join('')}
  </div>
</div>
${gestureBar()}
`;
  return envolverDocumento('Captura 03 — Cobrar', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 4. Pix · Mercado Pago
// ---------------------------------------------------------------------------
async function htmlTelaPix(fontesCss) {
  const qrSvg = await QRCode.toString(
    'PRISMA-PDV-EXEMPLO-LOJA-DEMONSTRACAO-VALOR-41.68-NAO-PAGAVEL',
    {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 0,
      color: { dark: '#14112B', light: '#FFFFFF' },
    },
  );

  const css = `
.tela-pix { gap: calc(11 * var(--dp)); padding-bottom: calc(14 * var(--dp)); }
.monograma-mp {
  width: calc(32 * var(--dp));
  height: calc(32 * var(--dp));
  border-radius: calc(8 * var(--dp));
  background: var(--anil-soft);
  color: var(--anil);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(13.5 * var(--dp));
  font-weight: 700;
  flex-shrink: 0;
}
.qr-card {
  align-self: center;
  padding: calc(16 * var(--dp));
  border-radius: calc(24 * var(--dp));
  border: 1px solid var(--line);
  background: var(--bg);
}
.qr-box {
  width: calc(196 * var(--dp));
  height: calc(196 * var(--dp));
}
.qr-box svg { width: 100%; height: 100%; display: block; }
.pix-valor { display: flex; flex-direction: column; align-items: center; gap: calc(4 * var(--dp)); }
.pix-status {
  display: flex;
  align-items: flex-start;
  gap: calc(10 * var(--dp));
  padding: calc(2 * var(--dp)) calc(4 * var(--dp));
}
.ponto-anil {
  width: calc(10 * var(--dp));
  height: calc(10 * var(--dp));
  margin-top: calc(5 * var(--dp));
  border-radius: 999px;
  background: var(--anil);
  box-shadow: 0 0 0 calc(4 * var(--dp)) rgba(51, 70, 240, 0.16);
  flex-shrink: 0;
}
`;

  const adorno = `<div class="monograma-mp">MP</div>`;
  const body = `
${statusBar(false)}
<div class="tela-scroll tela-pix">
  ${cabecalhoPagamento('Pix · Mercado Pago', adorno)}

  <div class="banner">
    ${icone('info', 21, '#3346F0', 2.1)}
    <span class="t-corpo-m" style="flex:1;">Deixe o brilho da tela no máximo para facilitar a leitura.</span>
  </div>

  <div class="qr-card">
    <div class="qr-box">${qrSvg}</div>
  </div>

  <div class="pix-valor">
    <div class="t-display" style="font-size:calc(40 * var(--dp));line-height:calc(42 * var(--dp));">R$ 41,68</div>
    <span class="t-label num" style="color:var(--ink2);">Expira em 4:42</span>
  </div>

  <div class="btn btn-m btn-secundario">
    ${icone('copiar', 20, '#FFFFFF', 2)}
    <span>Copiar código Pix</span>
  </div>

  <div class="pix-status">
    <span class="ponto-anil"></span>
    <span class="t-corpo" style="color:var(--ink2);flex:1;">
      <strong style="color:var(--ink);font-weight:600;">Aguardando confirmação…</strong> consultando automaticamente.
    </span>
  </div>

  <div style="margin-top:auto;display:flex;flex-direction:column;gap:calc(6 * var(--dp));">
    <div class="btn btn-m btn-terciario">Confirmar manualmente (Pix já caiu)</div>
    <div class="btn btn-m btn-ghost" style="min-height:calc(40 * var(--dp));color:var(--ink2);">Cancelar cobrança</div>
  </div>
</div>
${gestureBar()}
`;
  return envolverDocumento('Captura 04 — Pix', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 5. Dinheiro & Troco
// ---------------------------------------------------------------------------
function htmlTelaDinheiro(fontesCss) {
  const teclas = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['00', '0', 'apagar'],
  ];

  const css = `
.tela-dinheiro { gap: calc(12 * var(--dp)); }
.a-cobrar { display: flex; align-items: baseline; gap: calc(6 * var(--dp)); }
.campo-dinheiro {
  padding: calc(14 * var(--dp)) calc(16 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: calc(4 * var(--dp));
}
.valor-dinheiro { display: flex; align-items: baseline; gap: calc(8 * var(--dp)); }
.chips-notas { display: flex; flex-wrap: wrap; gap: calc(8 * var(--dp)); }
.troco-box {
  min-height: calc(54 * var(--dp));
  padding: 0 calc(16 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--folha-soft);
  display: flex;
  align-items: center;
  gap: calc(10 * var(--dp));
}
.teclado {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: calc(6 * var(--dp));
}
.tec-linha { display: flex; gap: calc(6 * var(--dp)); }
.tec-btn {
  flex: 1;
  height: calc(50 * var(--dp));
  border-radius: calc(14 * var(--dp));
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(22 * var(--dp));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
`;

  const body = `
${statusBar(false)}
<div class="tela-scroll tela-dinheiro">
  ${cabecalhoPagamento('Dinheiro')}

  <div class="a-cobrar">
    <span class="t-corpo-l" style="color:var(--ink2);">A cobrar</span>
    <span class="t-titulo-m num">R$ 41,68</span>
  </div>

  <div class="campo-dinheiro">
    <span class="t-label" style="color:var(--ink2);">Valor recebido</span>
    <div class="valor-dinheiro">
      <span class="t-titulo-l" style="color:var(--ink2);">R$</span>
      <span class="t-display">50,00</span>
    </div>
  </div>

  <div class="chips-notas">
    <span class="chip">Valor exato</span>
    <span class="chip is-active num">R$ 50</span>
    <span class="chip num">R$ 100</span>
    <span class="chip num">R$ 200</span>
  </div>

  <div class="troco-box">
    ${icone('check', 22, '#0E7A40', 2.5)}
    <span class="t-titulo-l num" style="color:var(--folha);">Troco R$ 8,32</span>
  </div>

  <div class="teclado">
    ${teclas
      .map(
        (linha) => `<div class="tec-linha">
          ${linha
            .map((t) =>
              t === 'apagar'
                ? `<div class="tec-btn">${icone('apagar', 22, '#14112B', 2)}</div>`
                : `<div class="tec-btn">${esc(t)}</div>`,
            )
            .join('')}
        </div>`,
      )
      .join('')}
  </div>

  <div class="btn btn-primario">Confirmar recebimento</div>
</div>
${gestureBar()}
`;
  return envolverDocumento('Captura 05 — Dinheiro e Troco', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 6. Caixa (Resumo & Gaveta)
// ---------------------------------------------------------------------------
function htmlTelaCaixa(fontesCss) {
  const linhasGaveta = [
    { rotulo: 'Troco inicial', valor: 'R$ 150,00', div: false, dest: false },
    { rotulo: 'Dinheiro vendido', valor: 'R$ 412,30', div: true, dest: false },
    { rotulo: 'Suprimentos', valor: '+ R$ 50,00', div: true, dest: false },
    { rotulo: 'Sangrias', valor: '− R$ 150,00', div: true, dest: false },
    { rotulo: 'Esperado na gaveta', valor: 'R$ 462,30', div: true, dest: true },
  ];

  const css = `
.tela-caixa { gap: calc(8 * var(--dp)); padding-top: calc(8 * var(--dp)); padding-bottom: calc(14 * var(--dp)); }
.tela-caixa .cab-caixa { gap: calc(8 * var(--dp)); }
.caixa-totais {
  padding: calc(12 * var(--dp)) calc(16 * var(--dp));
  border-radius: calc(20 * var(--dp));
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--dp));
}
.gaveta-card {
  padding: calc(10 * var(--dp)) calc(16 * var(--dp)) calc(2 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
}
.linha-valor {
  min-height: calc(34 * var(--dp));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10 * var(--dp));
}
.linha-valor.has-div { border-top: 1px solid var(--line); }
.movs-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(8 * var(--dp)); }
.mov-btn {
  min-height: calc(40 * var(--dp));
  border-radius: 999px;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(14 * var(--dp));
  font-weight: 600;
  color: var(--ink);
}
`;

  const body = `
${statusBar(false)}
<div class="tela-scroll tela-caixa">
  ${cabecalhoCaixa('resumo')}

  <div class="btn btn-m btn-terciario" style="min-height:calc(40 * var(--dp));font-size:calc(14.5 * var(--dp));">Caixas da loja e conferência</div>

  <div class="caixa-totais">
    <span class="t-label" style="color:var(--ink2);">Aberto às 07:30 por Ana · Balcão 1</span>
    <div class="t-display" style="font-size:calc(36 * var(--dp));line-height:calc(38 * var(--dp));">R$ 1.284,50</div>
    <span class="t-corpo-m" style="color:var(--ink2);">47 vendas hoje</span>
  </div>

  <div class="gaveta-card">
    <div class="t-titulo-m" style="padding-bottom:calc(2 * var(--dp));">Conferir gaveta</div>
    ${linhasGaveta
      .map(
        (l) => `<div class="linha-valor ${l.div ? 'has-div' : ''}">
          <span class="${l.dest ? 't-titulo-m' : 't-corpo'}" style="color:${l.dest ? 'var(--ink)' : 'var(--ink2)'};">${esc(l.rotulo)}</span>
          <span class="${l.dest ? 't-titulo-m' : 't-corpo-m'} num">${esc(l.valor)}</span>
        </div>`,
      )
      .join('')}
  </div>

  <div style="margin-top:auto;display:flex;flex-direction:column;gap:calc(8 * var(--dp));padding-bottom:calc(6 * var(--dp));">
    <div class="btn btn-primario" style="min-height:calc(46 * var(--dp));">
      ${icone('fecharCaixa', 20, '#14112B', 2.1)}
      <span>Fechar caixa</span>
    </div>
    <div class="movs-row">
      <div class="mov-btn">Suprimento</div>
      <div class="mov-btn">Sangria</div>
      <div class="mov-btn">Retirada</div>
    </div>
  </div>
</div>
${barraInferior('caixa')}
`;
  return envolverDocumento('Captura 06 — Caixa', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 7. Produtos (Catálogo)
// ---------------------------------------------------------------------------
function htmlTelaProdutos(fontesCss) {
  const itens = [
    {
      nome: 'Leite integral 1L',
      sub: '7891000100103 · Estoque 24 un',
      preco: 'R$ 5,29',
      baixo: false,
    },
    {
      nome: 'Café torrado 500g',
      sub: '7891149103201 · Estoque 3 un',
      preco: 'R$ 18,90',
      baixo: true,
    },
    {
      nome: 'Pão francês',
      sub: 'Sem código · Atalho',
      preco: 'R$ 14,80/kg',
      baixo: false,
    },
    {
      nome: 'Feijão carioca 1kg',
      sub: '7893500024118 · Estoque 18 un',
      preco: 'R$ 8,50',
      baixo: false,
    },
  ];

  const css = `
.tela-produtos { gap: calc(8 * var(--dp)); padding-top: calc(10 * var(--dp)); padding-bottom: calc(16 * var(--dp)); }
.prod-head-row { display: flex; align-items: center; justify-content: space-between; gap: calc(10 * var(--dp)); }
.campo-busca-prod {
  min-height: calc(44 * var(--dp));
  padding: 0 calc(14 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: calc(10 * var(--dp));
  color: var(--ink3);
  font-size: calc(14.5 * var(--dp));
  font-weight: 500;
}
.chips-prod { display: flex; gap: calc(6 * var(--dp)); overflow: hidden; }
.chips-prod .chip { min-height: calc(32 * var(--dp)); padding: 0 calc(10 * var(--dp)); font-size: calc(12 * var(--dp)); }
.atalhos-prod-box {
  padding: 0 calc(14 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
}
.atalho-linha {
  min-height: calc(49 * var(--dp));
  display: flex;
  align-items: center;
  gap: calc(11 * var(--dp));
  padding: calc(4 * var(--dp)) 0;
}
.atalho-linha.has-div { border-bottom: 1px solid var(--line); }
.atalho-mini {
  width: calc(38 * var(--dp));
  height: calc(38 * var(--dp));
  border-radius: calc(12 * var(--dp));
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.prod-row {
  min-height: calc(54 * var(--dp));
  display: flex;
  align-items: center;
  gap: calc(11 * var(--dp));
  padding: calc(5 * var(--dp)) 0;
}
.prod-row.has-div { border-bottom: 1px solid var(--line); }
.prod-mono {
  width: calc(40 * var(--dp));
  height: calc(40 * var(--dp));
  border-radius: calc(13 * var(--dp));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(12 * var(--dp));
  font-weight: 600;
  color: var(--ink2);
  flex-shrink: 0;
}
`;

  const body = `
${statusBar(false)}
<div class="tela-scroll tela-produtos">
  <div>
    <div class="prod-head-row">
      <h1 class="t-titulo-xl">Produtos</h1>
      <div class="btn btn-s btn-terciario">
        ${icone('mais', 16, '#14112B', 2.2)}
        <span>Novo produto</span>
      </div>
    </div>
    <div class="t-legenda num" style="color:var(--ink3);margin-top:calc(2 * var(--dp));">148 de 500 produtos</div>
  </div>

  <div class="campo-busca-prod">
    ${icone('lupa', 19, '#5C5973', 2)}
    <span>Buscar por nome ou código</span>
  </div>

  <div class="chips-prod">
    <span class="chip is-active">Todos</span>
    <span class="chip">Com código</span>
    <span class="chip">Sem código/kg</span>
    <span class="chip">Atalhos · 6</span>
  </div>

  <div class="atalhos-prod-box">
    <div class="atalho-linha has-div">
      <div class="atalho-mini">${icone('raio', 18, '#14112B', 2)}</div>
      <div style="flex:1;min-width:0;">
        <div class="t-corpo-m">Atalhos de venda</div>
        <div class="t-legenda" style="color:var(--ink3);">Botões rápidos para pão, gelo e hortifruti</div>
      </div>
      ${icone('chevronDireita', 18, '#5C5973', 2)}
    </div>
    <div class="atalho-linha">
      <div class="atalho-mini">${icone('cadastrarBipando', 18, '#14112B', 2)}</div>
      <div style="flex:1;min-width:0;">
        <div class="t-corpo-m">Cadastro rápido</div>
        <div class="t-legenda" style="color:var(--ink3);">Bipe, dê o preço e passe ao próximo</div>
      </div>
      ${icone('chevronDireita', 18, '#5C5973', 2)}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;">
    ${itens
      .map((p, idx) => {
        const mono = monogramaProduto(p.nome);
        const fundo = fundoDoMonograma(p.nome);
        return `<div class="prod-row ${idx < itens.length - 1 ? 'has-div' : ''}">
          <div class="prod-mono" style="background:${fundo};">${esc(mono)}</div>
          <div style="flex:1;min-width:0;">
            <div class="t-corpo-m">${esc(p.nome)}</div>
            <div class="t-legenda num" style="color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.sub)}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:calc(2 * var(--dp));flex-shrink:0;">
            <span class="t-corpo-m num">${esc(p.preco)}</span>
            ${
              p.baixo
                ? `<span style="display:inline-flex;align-items:center;gap:calc(4 * var(--dp));font-size:calc(12 * var(--dp));font-weight:500;color:var(--ambar);">
                    ${icone('alerta', 13, '#A65400', 2.2)}
                    <span>Estoque baixo</span>
                  </span>`
                : ''
            }
          </div>
        </div>`;
      })
      .join('')}
  </div>

  <div style="margin-top:auto;padding-bottom:calc(8 * var(--dp));">
    <div class="btn btn-primario" style="min-height:calc(46 * var(--dp));">
      ${icone('cadastrarBipando', 20, '#14112B', 2)}
      <span>Cadastrar bipando</span>
    </div>
  </div>
</div>
${barraInferior('produtos')}
`;
  return envolverDocumento('Captura 07 — Produtos', fontesCss, css, body);
}

// ---------------------------------------------------------------------------
// 8. Sincronização (Status Confirmado)
// ---------------------------------------------------------------------------
function htmlTelaSincronizacao(fontesCss) {
  const checkIlustra = extrairIlustracao('check');
  const linhas = [
    { rotulo: 'Neste aparelho', valor: '148 produtos · 47 vendas', div: false },
    { rotulo: 'Aguardando confirmação', valor: '0', div: true },
    { rotulo: 'Preservados para revisão', valor: '0', div: true },
    { rotulo: 'Última sincronização', valor: '21/11/2026 14:25', div: true },
  ];

  const css = `
.tela-sync { gap: calc(11 * var(--dp)); padding-top: calc(8 * var(--dp)); padding-bottom: calc(16 * var(--dp)); }
.tela-sync .cab-caixa { gap: calc(8 * var(--dp)); }
.sync-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: calc(6 * var(--dp));
  padding-top: calc(2 * var(--dp));
}
.sync-ilustra {
  width: calc(96 * var(--dp));
  height: calc(96 * var(--dp));
}
.sync-card {
  padding: calc(2 * var(--dp)) calc(16 * var(--dp));
  border-radius: calc(16 * var(--dp));
  background: var(--surface);
}
.sync-row {
  min-height: calc(40 * var(--dp));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(10 * var(--dp));
}
.sync-row.has-div { border-top: 1px solid var(--line); }
`;

  const body = `
${statusBar(false)}
<div class="tela-scroll tela-sync">
  ${cabecalhoCaixa('sync')}

  <div class="sync-hero">
    <div class="sync-ilustra">${checkIlustra}</div>
    <h2 class="t-titulo-l">Dados confirmados no servidor</h2>
    <p class="t-corpo" style="color:var(--ink2);font-size:calc(14.5 * var(--dp));line-height:calc(20 * var(--dp));">
      Só retiramos um registro da fila quando o servidor confirma. Registros ainda pendentes permanecem neste aparelho.
    </p>
  </div>

  <div class="sync-card">
    ${linhas
      .map(
        (l) => `<div class="sync-row ${l.div ? 'has-div' : ''}">
          <span class="t-corpo" style="color:var(--ink2);font-size:calc(14.5 * var(--dp));">${esc(l.rotulo)}</span>
          <span class="t-corpo-m num" style="text-align:right;font-size:calc(14.5 * var(--dp));">${esc(l.valor)}</span>
        </div>`,
      )
      .join('')}
  </div>

  <div class="btn btn-primario" style="min-height:calc(48 * var(--dp));">
    ${icone('sincronizar', 20, '#14112B', 2.1)}
    <span>Sincronizar agora</span>
  </div>

  <p class="t-legenda" style="color:var(--ink3);line-height:calc(16 * var(--dp));padding-bottom:calc(6 * var(--dp));">
    Operações ainda não sincronizadas ficam somente neste aparelho. Sincronize antes de trocar, reinstalar ou limpar o aplicativo.
  </p>
</div>
${barraInferior('caixa')}
`;
  return envolverDocumento('Captura 08 — Sincronização', fontesCss, css, body);
}

function renderizarHtmlParaPng(navegador, html, destino) {
  const htmlPath = join(TEMP_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}.html`);
  writeFileSync(htmlPath, html, 'utf8');
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${LARGURA_PX},${ALTURA_PX}`,
    `--screenshot=${destino}`,
    pathToFileURL(htmlPath).href,
  ];
  execFileSync(navegador, args, { stdio: 'pipe' });
  // Garante 1080x1920 exato em PNG 24-bit RGB (sem transparência, exigência Play Store).
  execFileSync(
    'python',
    [
      '-c',
      `from PIL import Image; im = Image.open(r"${destino}"); im = im.crop((0, 0, ${LARGURA_PX}, ${ALTURA_PX})).convert("RGB"); im.save(r"${destino}", format="PNG")`,
    ],
    { stdio: 'pipe' },
  );
}

export async function gerarPrintsPlayStore({ navegador = encontrarNavegador(), playDir = PLAY_DIR_PADRAO } = {}) {
  const fontes = [
    ['Bricolage Grotesque', '700', ['bricolage-grotesque', '700Bold', 'BricolageGrotesque_700Bold.ttf']],
    ['Bricolage Grotesque', '800', ['bricolage-grotesque', '800ExtraBold', 'BricolageGrotesque_800ExtraBold.ttf']],
    ['Inter', '400', ['inter', '400Regular', 'Inter_400Regular.ttf']],
    ['Inter', '500', ['inter', '500Medium', 'Inter_500Medium.ttf']],
    ['Inter', '600', ['inter', '600SemiBold', 'Inter_600SemiBold.ttf']],
    ['Inter', '700', ['inter', '700Bold', 'Inter_700Bold.ttf']],
  ];

  const fontesCss = fontes
    .map(
      ([familia, peso, caminho]) =>
        `@font-face { font-family: '${familia}'; font-weight: ${peso}; src: url(data:font/ttf;base64,${carregarFonteBase64(caminho)}) format('truetype'); }`,
    )
    .join('\n');

  mkdirSync(playDir, { recursive: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  try {
    const telas = [
      ['captura-01-inicio.png', htmlTelaInicio(fontesCss)],
      ['captura-02-vender.png', htmlTelaVender(fontesCss)],
      ['captura-03-cobrar.png', htmlTelaCobrar(fontesCss)],
      ['captura-04-pix.png', await htmlTelaPix(fontesCss)],
      ['captura-05-dinheiro-troco.png', htmlTelaDinheiro(fontesCss)],
      ['captura-06-caixa.png', htmlTelaCaixa(fontesCss)],
      ['captura-07-produtos.png', htmlTelaProdutos(fontesCss)],
      ['captura-08-sincronizacao.png', htmlTelaSincronizacao(fontesCss)],
    ];

    const gerados = [];
    for (const [arquivo, html] of telas) {
      const destino = join(playDir, arquivo);
      renderizarHtmlParaPng(navegador, html, destino);
      gerados.push(destino);
    }
    return gerados;
  } finally {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

const ehExecucaoDireta = process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
if (ehExecucaoDireta) {
  const arquivos = await gerarPrintsPlayStore();
  console.log(`Gerados ${arquivos.length} prints em ${PLAY_DIR_PADRAO}`);
}
