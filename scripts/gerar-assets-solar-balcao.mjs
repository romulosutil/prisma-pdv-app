import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = resolve(import.meta.dirname, '..');
const PLAY_DIR = join(RAIZ, 'builds', 'play-store');
const ASSETS_DIR = join(RAIZ, 'apps', 'mobile', 'assets');
const TEMP_DIR = join(RAIZ, 'builds', '.tmp-assets');

const EDGE_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function encontrarNavegador() {
  for (const p of EDGE_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  throw new Error('Nenhum navegador Chromium (Chrome/Edge) encontrado para rasterizar os ativos.');
}

function carregarFonteBase64(pesoDir, nomeArquivo) {
  const caminho = join(RAIZ, 'node_modules', '@expo-google-fonts', 'bricolage-grotesque', pesoDir, nomeArquivo);
  if (!existsSync(caminho)) return null;
  return readFileSync(caminho).toString('base64');
}

function extrairIlustracaoScanner() {
  const caminho = join(RAIZ, 'docs', 'prototipo-v2', 'ilustracoes.js');
  const conteudo = readFileSync(caminho, 'utf8');
  const match = /"scanner":\s*"((?:[^"\\]|\\.)*)"/.exec(conteudo);
  if (!match) return '';
  return JSON.parse(`"${match[1]}"`);
}

function svgSolarBalcao({ tamanho, bordaArredondada = false, margemInterna = false }) {
  const fundo = bordaArredondada
    ? '<path d="M56 12 H144 Q188 12 188 56 V144 Q188 188 144 188 H56 Q12 188 12 144 V56 Q12 12 56 12 Z" fill="url(#bg)"/>'
    : '<rect x="0" y="0" width="200" height="200" fill="url(#bg)"/>';

  const grupoTransform = margemInterna ? ' transform="translate(100 100) scale(0.78) translate(-100 -100)"' : '';

  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="0.32" cy="0.24" r="0.92" fx="0.2" fy="0.14">
      <stop offset="0" stop-color="#FFF5C4"/>
      <stop offset="0.52" stop-color="#FFC933"/>
      <stop offset="1" stop-color="#FF8C42"/>
    </radialGradient>
    <radialGradient id="pr" cx="0.35" cy="0.28" r="0.88">
      <stop offset="0" stop-color="#352F6E"/>
      <stop offset="0.6" stop-color="#1D1942"/>
      <stop offset="1" stop-color="#0D0B1A"/>
    </radialGradient>
    <linearGradient id="bm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FF7A59" stop-opacity="0"/>
      <stop offset="0.25" stop-color="#FF7A59"/>
      <stop offset="0.5" stop-color="#FFFFFF"/>
      <stop offset="0.78" stop-color="#3346F0"/>
      <stop offset="1" stop-color="#3346F0" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${fundo}
  <g${grupoTransform}>
    <path d="M91 48 Q100 34 109 48 L152 134 Q158 146 144 146 H56 Q42 146 48 134 Z" fill="url(#pr)"/>
    <path d="M74 87 a3.5 3.5 0 0 1 7 0 v32 a3.5 3.5 0 0 1 -7 0 Z M86 76 a4.5 4.5 0 0 1 9 0 v42 a4.5 4.5 0 0 1 -9 0 Z M101 84 a3 3 0 0 1 6 0 v35 a3 3 0 0 1 -6 0 Z M113 88 a4 4 0 0 1 8 0 v31 a4 4 0 0 1 -8 0 Z" fill="#FFF4C2"/>
    <path d="M33 103 H167 a3.5 3.5 0 0 1 0 7 H33 a3.5 3.5 0 0 1 0 -7 Z" fill="url(#bm)"/>
  </g>
</svg>`;
}

function svgSolarForeground({ tamanho }) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="pr" cx="0.35" cy="0.28" r="0.88">
      <stop offset="0" stop-color="#352F6E"/>
      <stop offset="0.6" stop-color="#1D1942"/>
      <stop offset="1" stop-color="#0D0B1A"/>
    </radialGradient>
    <linearGradient id="bm" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FF7A59" stop-opacity="0"/>
      <stop offset="0.25" stop-color="#FF7A59"/>
      <stop offset="0.5" stop-color="#FFFFFF"/>
      <stop offset="0.78" stop-color="#3346F0"/>
      <stop offset="1" stop-color="#3346F0" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g transform="translate(100 100) scale(0.72) translate(-100 -100)">
    <path d="M91 48 Q100 34 109 48 L152 134 Q158 146 144 146 H56 Q42 146 48 134 Z" fill="url(#pr)"/>
    <path d="M74 87 a3.5 3.5 0 0 1 7 0 v32 a3.5 3.5 0 0 1 -7 0 Z M86 76 a4.5 4.5 0 0 1 9 0 v42 a4.5 4.5 0 0 1 -9 0 Z M101 84 a3 3 0 0 1 6 0 v35 a3 3 0 0 1 -6 0 Z M113 88 a4 4 0 0 1 8 0 v31 a4 4 0 0 1 -8 0 Z" fill="#FFF4C2"/>
    <path d="M33 103 H167 a3.5 3.5 0 0 1 0 7 H33 a3.5 3.5 0 0 1 0 -7 Z" fill="url(#bm)"/>
  </g>
</svg>`;
}

function svgSolarBackground({ tamanho }) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="0.32" cy="0.24" r="0.92" fx="0.2" fy="0.14">
      <stop offset="0" stop-color="#FFF5C4"/>
      <stop offset="0.52" stop-color="#FFC933"/>
      <stop offset="1" stop-color="#FF8C42"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="200" height="200" fill="url(#bg)"/>
</svg>`;
}

function svgMonocromatico({ tamanho }) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(100 100) scale(0.72) translate(-100 -100)">
    <path d="M92 50 Q100 38 108 50 L147 130 Q152 140 140 140 H60 Q48 140 53 130 Z M76 89 a3.5 3.5 0 0 1 7 0 v31 a3.5 3.5 0 0 1 -7 0 Z M88 79 a4 4 0 0 1 8 0 v41 a4 4 0 0 1 -8 0 Z M103 85 a3 3 0 0 1 6 0 v35 a3 3 0 0 1 -6 0 Z M114 89 a3.5 3.5 0 0 1 7 0 v31 a3.5 3.5 0 0 1 -7 0 Z" fill="#000000" fill-rule="evenodd"/>
  </g>
</svg>`;
}

function htmlFeatureGraphic() {
  const b700 = carregarFonteBase64('700Bold', 'BricolageGrotesque_700Bold.ttf');
  const b800 = carregarFonteBase64('800ExtraBold', 'BricolageGrotesque_800ExtraBold.ttf');
  const fontCss = [
    b700 ? `@font-face { font-family: 'Bricolage'; font-weight: 700; src: url(data:font/ttf;base64,${b700}) format('truetype'); }` : '',
    b800 ? `@font-face { font-family: 'Bricolage'; font-weight: 800; src: url(data:font/ttf;base64,${b800}) format('truetype'); }` : '',
  ].join('\n');
  const scannerSvg = extrairIlustracaoScanner();
  const marca = svgSolarBalcao({ tamanho: 72, bordaArredondada: true });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
${fontCss}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1024px;
  height: 500px;
  overflow: hidden;
  background: radial-gradient(circle at 82% 28%, #282254 0%, #14112B 58%, #0D0B1A 100%);
  color: #FFFFFF;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}
.wrap {
  width: 1024px;
  height: 500px;
  padding: 52px 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
}
.left {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.wordmark {
  font-family: 'Bricolage', 'Segoe UI', sans-serif;
  font-weight: 800;
  font-size: 38px;
  letter-spacing: -0.025em;
  display: inline-flex;
  align-items: baseline;
}
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #FFC933;
  margin-left: 4px;
}
.headline {
  font-family: 'Bricolage', 'Segoe UI', sans-serif;
  font-weight: 800;
  font-size: 54px;
  line-height: 1.04;
  letter-spacing: -0.025em;
}
.sub {
  font-size: 21px;
  line-height: 1.4;
  color: #C8C5DE;
  font-weight: 500;
}
.pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.pill {
  background: rgba(255, 201, 51, 0.16);
  border: 1.5px solid rgba(255, 201, 51, 0.45);
  color: #FFF3CC;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
}
.right {
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
</head>
<body>
  <div class="wrap">
    <div class="left">
      <div class="brand-row">
        ${marca}
        <span class="wordmark">Prisma PDV<span class="dot"></span></span>
      </div>
      <h1 class="headline">Seu balcão inteiro<br/>no celular</h1>
      <p class="sub">Venda em segundos mesmo sem internet. Pix, cartão, dinheiro, estoque e caixa por operador.</p>
      <div class="pills">
        <span class="pill">Funciona offline</span>
        <span class="pill">Leitor pela câmera</span>
        <span class="pill">Caixa separado</span>
      </div>
    </div>
    <div class="right">${scannerSvg}</div>
  </div>
</body>
</html>`;
}

function renderizarHtmlParaPng(navegador, html, destino, largura, altura, transparente = false) {
  const htmlPath = join(TEMP_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}.html`);
  writeFileSync(htmlPath, html, 'utf8');
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--window-size=${largura},${altura}`,
    `--screenshot=${destino}`,
    ...(transparente ? ['--default-background-color=00000000'] : []),
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ];
  execFileSync(navegador, args, { stdio: 'pipe' });
  // Garante dimensões exatas e remove canal alfa quando opaco (exigência Play Store).
  execFileSync('python', [
    '-c',
    `from PIL import Image; im = Image.open(r"${destino}"); im = im.crop((0, 0, ${largura}, ${altura})); ${transparente ? 'im = im.convert("RGBA")' : 'im = im.convert("RGB")'}; im.save(r"${destino}", format="PNG")`,
  ], { stdio: 'pipe' });
}

function main() {
  const apenasPlayStore = process.argv.includes('--apenas-play-store');
  const navegador = encontrarNavegador();
  mkdirSync(PLAY_DIR, { recursive: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  try {
    // 1. Ativos da Google Play Store (sempre gerados em builds/play-store/)
    const htmlIconPlay = `<!DOCTYPE html><html><body style="margin:0;padding:0;width:512px;height:512px;overflow:hidden;">${svgSolarBalcao({ tamanho: 512, bordaArredondada: false })}</body></html>`;
    renderizarHtmlParaPng(navegador, htmlIconPlay, join(PLAY_DIR, 'icon-play-512.png'), 512, 512, false);
    renderizarHtmlParaPng(navegador, htmlFeatureGraphic(), join(PLAY_DIR, 'feature-graphic-1024x500.png'), 1024, 500, false);

    const cap1 = join(RAIZ, 'docs', 'capturas', 'inicio-barra-vender.png');
    const cap2 = join(RAIZ, 'docs', 'capturas', 'vender-carrinho.png');
    if (existsSync(cap1)) copyFileSync(cap1, join(PLAY_DIR, 'captura-01-inicio.png'));
    if (existsSync(cap2)) copyFileSync(cap2, join(PLAY_DIR, 'captura-02-vender.png'));

    if (!apenasPlayStore) {
      mkdirSync(ASSETS_DIR, { recursive: true });
      const wrapHtml = (svg, size, bg = '#FFFFFF') =>
        `<!DOCTYPE html><html><body style="margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:${bg};">${svg}</body></html>`;

      renderizarHtmlParaPng(navegador, wrapHtml(svgSolarBalcao({ tamanho: 1024, bordaArredondada: false }), 1024, '#FFC933'), join(ASSETS_DIR, 'icon.png'), 1024, 1024, false);
      renderizarHtmlParaPng(navegador, wrapHtml(svgSolarForeground({ tamanho: 1024 }), 1024, 'transparent'), join(ASSETS_DIR, 'android-icon-foreground.png'), 1024, 1024, true);
      renderizarHtmlParaPng(navegador, wrapHtml(svgSolarBackground({ tamanho: 1024 }), 1024, '#FFC933'), join(ASSETS_DIR, 'android-icon-background.png'), 1024, 1024, false);
      renderizarHtmlParaPng(navegador, wrapHtml(svgMonocromatico({ tamanho: 1024 }), 1024, 'transparent'), join(ASSETS_DIR, 'android-icon-monochrome.png'), 1024, 1024, true);
      renderizarHtmlParaPng(navegador, wrapHtml(svgSolarBalcao({ tamanho: 1024, bordaArredondada: true }), 1024, 'transparent'), join(ASSETS_DIR, 'splash-icon.png'), 1024, 1024, true);
      renderizarHtmlParaPng(navegador, wrapHtml(svgSolarBalcao({ tamanho: 48, bordaArredondada: true }), 48, 'transparent'), join(ASSETS_DIR, 'favicon.png'), 48, 48, true);
    }
  } finally {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

main();
