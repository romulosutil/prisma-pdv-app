"""Android UI driver for any device (physical or emulator). Homologation app only.

No credentials, database access or auth bypass. Pass a JSON array of actions:
tap/tap_inicia/tap_ultimo/tap_sistema/text/money/scroll/assert/assert_ausente/row/
snapshot/screenshot/stop/launch/key/back/back_sistema/airplane/wait. Snapshots are sanitized and
saved under builds.

Uso:
  python scripts/pdv-android-ui.py --listar
  python scripts/pdv-android-ui.py acoes.json [--dispositivo SERIAL] [--fisico]
  python scripts/pdv-android-ui.py --fisico fluxo scripts/fluxos/vender.json [--param venda_centavos=7000]
  python scripts/pdv-android-ui.py --fisico fluxo scripts/fluxos/regressao.json     (regressao completa)
  python scripts/pdv-android-ui.py --simular fluxo scripts/fluxos/regressao.json    (valida e imprime os comandos ADB, sem aparelho)
  python scripts/regressao-aparelho.py --fisico                                     (atalho da regressao)

Acoes (argumentos entre colchetes sao opcionais):
  tap R           toca o elemento cujo rotulo e exatamente R (content-desc clicavel ou texto)
  tap_inicia P    idem, mas o rotulo apenas comeca com P (ex.: "Cobrar R$ 50,00" -> "Cobrar")
  tap_ultimo R    idem a tap, mas escolhe o elemento mais abaixo na tela (botao com o mesmo
                  rotulo do titulo, ou botao do dialogo de confirmacao)
  tap_sistema R   idem a tap, sem exigir o app em primeiro plano (permissoes, chooser)
  text D V        digita V no campo EditText com descricao D
  money C         digita C (centavos, inteiro) no teclado numerico do app
  assert T...     espera ate 12 s que todos os textos T apareçam na tela; falha se faltar
  assert_ausente T...  falha se algum texto T estiver na tela
  row D V         confere o texto V dentro da linha de descricao D
  snapshot N      salva layout sanitizado em builds/pdv-ui-N-layout.json e imprime os textos
  snapshot_sistema N  como snapshot, mas grava so a contagem de nos (nunca textos): para telas do sistema
                  (seletor de compartilhamento) que listam contatos do usuario
  screenshot N    salva builds/pdv-ui-N.png
  stop/launch     force-stop / abre o app de homologacao
  key K / back    keyevent do Android / voltar
  back_sistema    voltar (keyevent 4) sem exigir o app em primeiro plano: fecha o seletor de
                  compartilhamento do sistema e devolve o foco ao app
  scroll up|down  rola a primeira lista rolavel
  wait S          espera S segundos (maximo 30)
  airplane on|off
      on:  guarda o estado original (modo aviao, Wi-Fi, dados moveis) em
           builds/pdv-airplane-estado.json, liga o aviao e desliga Wi-Fi e dados, e confirma
           que ficou offline (ping ao host da API e rede ativa em dumpsys connectivity);
           falha se o aparelho continuar conectado.
      off: restaura exatamente o estado original (nao liga o que estava desligado) e
           confirma o retorno da conectividade. Host do ping: variavel PDV_API_HOST.

Fluxos (scripts/fluxos/*.json, ver README.md ali): sequencias de acoes com nome, parametros
({nome} ou {nome:falado} nas strings) e verificacoes. `fluxo` para no primeiro erro e sempre
restaura aviao/Wi-Fi/dados ao final. Execucoes de fluxo gravam relatorio PASS/FAIL por passo
em builds/regressao-<nome>-<data>.json (fabricante/modelo/Android, sem numero de serie).

Sem --fisico, apenas emuladores sao aceitos. Toda acao que toca/digita/rola exige
o app de homologacao em primeiro plano (tap_sistema e a excecao, para dialogos
do sistema como permissoes e chooser de compartilhamento).
"""
import argparse
import ast
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SDK = Path(os.environ.get('LOCALAPPDATA', '')) / 'Android/Sdk'
ANDROID = SDK / 'cmdline-tools/latest/bin/android.exe'
ADB = SDK / 'platform-tools/adb.exe'
PACKAGE = 'br.com.pdv.mobile.homologacao'
DEVICE = None  # serial resolvido em runtime
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def run(args):
    p = subprocess.run([str(a) for a in args], capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('cp1252', errors='replace') or p.stdout.decode('cp1252', errors='replace'))
    return p.stdout.decode('cp1252', errors='replace')


def adb(*args):
    return run([ADB, '-s', DEVICE, *args])


def cli(*args):
    return run([ANDROID, '--no-metrics', *args])


def require_tools():
    missing = [str(p) for p in (ADB, ANDROID) if not p.exists()]
    if missing:
        raise RuntimeError('Ferramenta ausente: ' + ', '.join(missing))


def connected_devices():
    """Retorna lista de (serial, estado) conforme `adb devices`."""
    out = run([ADB, 'devices'])
    result = []
    for line in out.splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2:
            result.append((parts[0], parts[1]))
    return result


def getprop(serial, prop):
    return run([ADB, '-s', serial, 'shell', 'getprop', prop]).strip()


def is_emulator(serial):
    return getprop(serial, 'ro.kernel.qemu') == '1'


def package_version(serial):
    try:
        out = run([ADB, '-s', serial, 'shell', 'dumpsys', 'package', PACKAGE])
    except RuntimeError:
        return None
    name = re.search(r'versionName=(\S+)', out)
    code = re.search(r'versionCode=(\d+)', out)
    if not name and not code:
        return None
    return (name.group(1) if name else '?', code.group(1) if code else '?')


def listar():
    devices = connected_devices()
    if not devices:
        print('Nenhum aparelho conectado (adb devices vazio).')
        return
    for serial, state in devices:
        print('Serial: ' + serial + '  estado: ' + state)
        if state != 'device':
            print('  (aparelho nao esta em estado "device"; autorize a depuracao USB ou reconecte)')
            continue
        try:
            print('  Modelo: ' + getprop(serial, 'ro.product.model'))
            print('  Fabricante: ' + getprop(serial, 'ro.product.manufacturer'))
            print('  Android: ' + getprop(serial, 'ro.build.version.release') + ' (SDK ' + getprop(serial, 'ro.build.version.sdk') + ')')
            print('  Emulador: ' + ('sim' if is_emulator(serial) else 'nao'))
            version = package_version(serial)
            print('  ' + PACKAGE + ': ' + (('versionName=' + version[0] + ' versionCode=' + version[1]) if version else 'nao instalado'))
        except RuntimeError as exc:
            print('  Falha ao consultar aparelho: ' + str(exc).strip())


def resolve_device(requested):
    devices = connected_devices()
    ready = [s for s, st in devices if st == 'device']
    if requested:
        if requested not in ready:
            raise RuntimeError('Aparelho ' + requested + ' nao esta em estado device. Conectados: ' + (', '.join(f'{s}({st})' for s, st in devices) or 'nenhum'))
        return requested
    if len(ready) == 1:
        return ready[0]
    if not ready:
        raise RuntimeError('Nenhum aparelho em estado device. Conectados: ' + (', '.join(f'{s}({st})' for s, st in devices) or 'nenhum'))
    raise RuntimeError('Mais de um aparelho conectado; use --dispositivo SERIAL. Seriais: ' + ', '.join(ready))


def foreground_package():
    """Pacote em primeiro plano via dumpsys window, com fallback para activity."""
    out = adb('shell', 'dumpsys', 'window')
    for key in ('mCurrentFocus', 'mFocusedApp'):
        for line in out.splitlines():
            if key in line and 'null' not in line.split(key, 1)[1][:8]:
                m = re.search(r'([A-Za-z][\w.]*)/[\w.$]+', line)
                if m:
                    return m.group(1)
    out = adb('shell', 'dumpsys', 'activity', 'activities')
    for key in ('topResumedActivity', 'mResumedActivity'):
        for line in out.splitlines():
            if key in line:
                m = re.search(r'([A-Za-z][\w.]*)/[\w.$]+', line)
                if m:
                    return m.group(1)
    return None


def guard():
    """Aborta sem tocar se o app de homologacao nao estiver em primeiro plano."""
    pkg = None
    for _ in range(4):
        pkg = foreground_package()
        if pkg == PACKAGE:
            return
        time.sleep(.5)
    raise RuntimeError('Primeiro plano nao e ' + PACKAGE + ' (encontrado: ' + str(pkg) + '); nenhuma acao executada')


def nodes(value):
    if isinstance(value, list):
        for item in value:
            yield from nodes(item)
    elif isinstance(value, dict):
        yield value
        for field in ('content', 'children'):
            yield from nodes(value.get(field))


def layout():
    try:
        return json.loads(cli('layout', '--device', DEVICE, '--pretty'))
    except RuntimeError as exc:
        # Telas com camera/animacao continua nunca ficam ociosas; le mesmo assim.
        if 'idle' not in str(exc):
            raise
        return json.loads(cli('layout', '--device', DEVICE, '--pretty', '--no-idle'))


def sanitize(text):
    text = re.sub(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[email de teste]', text)
    text = re.sub(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b', '[CPF sintetico]', text)
    # Preserve explicit sale references so before/after sync can be compared;
    # six-digit input values (including login codes) remain redacted.
    return re.sub(r'(?<!Venda )(?<!#)\b\d{6}\b', '[codigo redigido]', text)


def escolher_alvo(all_nodes, label, modo='exato'):
    """Funcao pura: escolhe o elemento a tocar. modo: exato | inicia | ultimo."""
    if modo == 'inicia':
        casa = lambda v: isinstance(v, str) and v.startswith(label)
    else:
        casa = lambda v: v == label
    candidates = [n for n in all_nodes if casa(n.get('content-desc')) and 'CLICKABLE' in n.get('interactions', [])]
    if not candidates:
        candidates = [n for n in all_nodes if casa(n.get('text'))]
    if not candidates:
        return None
    if modo == 'ultimo':
        return max(candidates, key=lambda n: int(re.findall(r'\d+', n['center'])[1]))
    # Prefer the tab view over a shortcut button with the same label.
    candidates.sort(key=lambda n: n.get('class') != 'android.view.View')
    return candidates[0]


def area_rolavel(all_nodes):
    """Funcao pura: bounds (x1, y1, x2, y2) da primeira lista rolavel, ou None."""
    for n in all_nodes:
        if 'SCROLLABLE' in n.get('interactions', []) and n.get('class') in ('android.widget.ScrollView', 'androidx.recyclerview.widget.RecyclerView'):
            return tuple(map(int, re.findall(r'\d+', n['bounds'])))
    return None


def rolar(direcao, all_nodes=None):
    guard()
    area =area_rolavel(list(nodes(layout())) if all_nodes is None else all_nodes)
    if area is None:
        return False
    x1, y1, x2, y2 = area
    x = (x1 + x2) // 2
    start, end = int(y1 + (y2-y1)*.8), int(y1 + (y2-y1)*.25)
    if direcao == 'up':
        start, end = end, start
    adb('shell', 'input', 'swipe', x, start, x, end, 400)
    # Espera a inercia parar: um toque durante a rolagem so a interrompe e nao aciona o botao.
    time.sleep(1.5)
    return True


def tap(label, sistema=False, modo='exato'):
    """Toca o rotulo. Se ele nao aparecer em 4 s, rola a lista para baixo e depois para cima
    procurando (telas grandes ou fontes maiores deixam botoes abaixo da dobra)."""
    if not sistema:
        guard()
    deadline = time.monotonic() + 4
    rolagens = ['down'] * 6 + ['up'] * 12
    while True:
        atual = list(nodes(layout()))
        target = escolher_alvo(atual, label, modo)
        if target:
            break
        if time.monotonic() < deadline:
            time.sleep(.5)
            continue
        if sistema or not rolagens or not rolar(rolagens.pop(0), atual):
            raise RuntimeError('UI label absent: ' + label)
    # Toque por coordenada (centro do elemento): independe do seletor do `android input`,
    # que falha com rotulos acentuados/virgulas e em telas sem ociosidade (camera).
    x, y = map(int, re.findall(r'\d+', target['center']))
    adb('shell', 'input', 'tap', x, y)
    # Accessibility exposes the destination during the native stack animation;
    # allow it to settle before another tap (do not retry a payment blindly).
    time.sleep(1)


def campo_de_texto(all_nodes, descricao):
    """Funcao pura: o EditText cujo content-desc e exatamente `descricao`, ou None."""
    return next((n for n in all_nodes if n.get('class') == 'android.widget.EditText' and n.get('content-desc') == descricao), None)


def digitar(descricao, valor):
    """Digita no campo de descricao exata. Rola a lista ate o campo aparecer (campos abaixo do
    teclado numerico em telas grandes). Toca o centro do campo e usa `input text`, que aceita
    rotulos acentuados (o seletor do `android input` nao aceita)."""
    # '@' e '+' para e-mail de teste (CP 152: login na reinstalacao limpa).
    if not re.fullmatch(r'[A-Za-z0-9 .,_@+-]+', valor):
        raise ValueError('text aceita apenas letras sem acento, digitos, espaco e . , _ - @ +')
    guard()
    rolagens = ['down'] * 6 + ['up'] * 12
    while True:
        atual = list(nodes(layout()))
        campo = campo_de_texto(atual, descricao)
        if campo:
            break
        if not rolagens or not rolar(rolagens.pop(0), atual):
            raise RuntimeError('Campo ausente: ' + descricao)
    x, y = map(int, re.findall(r'\d+', campo['center']))
    adb('shell', 'input', 'tap', x, y)
    time.sleep(.6)
    adb('shell', 'input', 'text', valor.replace(' ', '%s'))
    time.sleep(.4)
    esconder_teclado()


def teclado_visivel():
    return 'mInputShown=true' in run([ADB, '-s', DEVICE, 'shell', 'dumpsys', 'input_method'])


def esconder_teclado():
    """Fecha o teclado do sistema (ele cobre o botao do rodape). Voltar so e enviado com o teclado
    aberto: nesse caso o teclado consome o evento e a tela nao muda."""
    if not teclado_visivel():
        return
    adb('shell', 'input', 'keyevent', 4)
    time.sleep(.8)
    if teclado_visivel():
        raise RuntimeError('Teclado do sistema continua aberto')


def money(value):
    guard()
    labels = dict(zip('0123456789', ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']))
    current = list(nodes(layout()))
    for digit in str(value):
        target = next(n for n in current if n.get('content-desc') == labels[digit] and 'CLICKABLE' in n.get('interactions', []))
        x, y = map(int, re.findall(r'\d+', target['center']))
        adb('shell', 'input', 'tap', x, y)
        time.sleep(.15)


def snapshot_sistema(name):
    """Registra uma tela do sistema sem gravar nem imprimir textos (o seletor de compartilhamento mostra contatos)."""
    total = len(list(nodes(layout())))
    path = ROOT / 'builds' / ('pdv-ui-' + name + '-layout.json')
    path.write_text(json.dumps({'nome': name, 'total_nos': total,
                                'aviso': 'conteudo da tela do sistema nao gravado: pode listar contatos do usuario'},
                               ensure_ascii=False, indent=2), encoding='utf-8')
    print('tela do sistema registrada: ' + str(total) + ' nos, textos nao gravados', flush=True)


def snapshot(name):
    data = layout()
    path = ROOT / 'builds' / ('pdv-ui-' + name + '-layout.json')
    path.write_text(sanitize(json.dumps(data, ensure_ascii=False, indent=2)), encoding='utf-8')
    values = [n.get('content-desc') or n.get('text') for n in nodes(data)]
    print(sanitize('\n'.join(str(v) for v in values if v)), flush=True)




# ---------------------------------------------------------------------------
# Modo aviao + Wi-Fi + dados moveis (funcoes puras testaveis + efeitos no aparelho)
# ---------------------------------------------------------------------------
ESTADO_REDE_ARQUIVO = ROOT / 'builds' / 'pdv-airplane-estado.json'
HOST_API_PADRAO = 'aladdin-pdv-api-homologacao.jicnzg.easypanel.host'


def parse_estado_rede(airplane_raw, wifi_raw, dados_raw):
    """Funcao pura: converte a saida de `settings get global ...` em {airplane, wifi, dados} booleanos."""
    def ligado(v):
        return str(v).strip() in ('1', '2')
    return {'airplane': ligado(airplane_raw), 'wifi': ligado(wifi_raw), 'dados': ligado(dados_raw)}


def escolher_original(salvo, lido):
    """Funcao pura: qual e o estado ORIGINAL a restaurar.

    Se ja ha um estado salvo (um `airplane on` anterior nao foi revertido) e o aparelho ainda
    parece alterado, o salvo vale (nao sobrescrever o original com o estado ja alterado).
    Se o aparelho esta com tudo normal, o salvo e obsoleto e vale o lido."""
    if salvo and (lido['airplane'] or not lido['wifi'] or not lido['dados']):
        return dict(salvo)
    return dict(lido)


def planejar_airplane(acao, original):
    """Funcao pura: lista de comandos (argumentos apos `adb shell`) para `airplane on|off`.

    on:  liga o aviao e desliga Wi-Fi e dados (o Samsung/Android 17 mantem os dois ligados em aviao).
    off: restaura exatamente `original`; nao liga o que estava desligado. Sem original conhecido,
         apenas desliga o aviao (nao adivinha Wi-Fi/dados)."""
    if acao == 'on':
        return [['cmd', 'connectivity', 'airplane-mode', 'enable'], ['svc', 'wifi', 'disable'], ['svc', 'data', 'disable']]
    if acao != 'off':
        raise ValueError('airplane espera "on" ou "off"')
    if not original:
        return [['cmd', 'connectivity', 'airplane-mode', 'disable']]
    comandos = []
    if not original.get('airplane'):
        comandos.append(['cmd', 'connectivity', 'airplane-mode', 'disable'])
    if original.get('wifi'):
        comandos.append(['svc', 'wifi', 'enable'])
    if original.get('dados'):
        comandos.append(['svc', 'data', 'enable'])
    return comandos


def esperado_online_apos_off(original):
    """Funcao pura: True se, restaurado `original`, o aparelho deve voltar a ter rede; None se nao da para afirmar."""
    if not original:
        return None
    if original.get('airplane'):
        return False
    return bool(original.get('wifi') or original.get('dados'))


def rede_ativa_no_dumpsys(texto):
    """Funcao pura: True/False se `dumpsys connectivity` indica rede padrao ativa; None se nao deu para ler."""
    m = re.search(r'Active default network:\s*(\S+)', texto or '')
    if not m:
        return None
    return m.group(1).strip().lower() not in ('none', 'null', '-1')


def avaliar_offline(ping_ok, rede_ativa):
    """Funcao pura: True se ha evidencia de offline (ping falhou e nenhuma rede ativa conhecida)."""
    return (not ping_ok) and rede_ativa is not True


def adb_rc(*args):
    p = subprocess.run([str(ADB), '-s', DEVICE, *[str(a) for a in args]], capture_output=True)
    return p.returncode, p.stdout.decode('cp1252', errors='replace')


def ler_estado_rede():
    def cfg(chave):
        return adb('shell', 'settings', 'get', 'global', chave).strip()
    return parse_estado_rede(cfg('airplane_mode_on'), cfg('wifi_on'), cfg('mobile_data'))


def carregar_estados_salvos():
    try:
        return json.loads(ESTADO_REDE_ARQUIVO.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def gravar_estados_salvos(estados):
    ESTADO_REDE_ARQUIVO.parent.mkdir(exist_ok=True)
    ESTADO_REDE_ARQUIVO.write_text(json.dumps(estados, indent=2), encoding='utf-8')


def chave_dispositivo():
    return hashlib.sha256(DEVICE.encode()).hexdigest()[:16]


def sondar_conectividade():
    """Evidencia de conectividade do aparelho: ping ao host da API e rede padrao ativa."""
    host = os.environ.get('PDV_API_HOST', HOST_API_PADRAO)
    rc, _ = adb_rc('shell', 'ping', '-c', '1', '-W', '3', host)
    try:
        rede = rede_ativa_no_dumpsys(adb('shell', 'dumpsys', 'connectivity'))
    except RuntimeError:
        rede = None
    return {'host': host, 'ping_ok': rc == 0, 'rede_ativa': rede}


def esperar_conectividade(online, tentativas=8):
    ultima = None
    for _ in range(tentativas):
        ultima = sondar_conectividade()
        if online and ultima['ping_ok']:
            return ultima
        if not online and avaliar_offline(ultima['ping_ok'], ultima['rede_ativa']):
            return ultima
        time.sleep(2)
    raise RuntimeError(('Aparelho continua OFFLINE apos restaurar: ' if online else 'Aparelho continua CONECTADO apos airplane on: ') + json.dumps(ultima))


def airplane(state):
    if state not in ('on', 'off'):
        raise ValueError('airplane espera "on" ou "off"')
    salvos = carregar_estados_salvos()
    chave = chave_dispositivo()
    if state == 'on':
        original = escolher_original(salvos.get(chave), ler_estado_rede())
        salvos[chave] = original  # grava ANTES de alterar, para o finally conseguir restaurar
        gravar_estados_salvos(salvos)
        print('Estado original (aviao/wifi/dados): ' + json.dumps(original), flush=True)
    else:
        original = salvos.get(chave)
        if not original:
            print('AVISO: estado original desconhecido; so o modo aviao sera desligado (Wi-Fi/dados intocados).', flush=True)
    for comando in planejar_airplane(state, original):
        try:
            adb('shell', *comando)
        except RuntimeError as exc:
            raise RuntimeError('Falha em "' + ' '.join(comando) + '" (Android sem suporte ou sem permissao): ' + str(exc).strip())
    time.sleep(2)
    if state == 'on':
        evidencia = esperar_conectividade(online=False)
    else:
        esperado = esperado_online_apos_off(original)
        evidencia = esperar_conectividade(online=True) if esperado else sondar_conectividade()
        salvos = carregar_estados_salvos()
        salvos.pop(chave, None)
        gravar_estados_salvos(salvos)
    print('airplane ' + state + ': conectividade ' + json.dumps(evidencia), flush=True)
    return evidencia


def restaurar_conectividade():
    """Usado no finally dos fluxos: se houver estado salvo, executa `airplane off`; nunca levanta."""
    try:
        if chave_dispositivo() in carregar_estados_salvos():
            airplane('off')
            return {'restaurado': True}
    except Exception as exc:  # noqa: BLE001 - restauracao e melhor esforco; o erro vai para o relatorio
        return {'restaurado': False, 'erro': str(exc).strip()[:300]}
    # Nenhum estado salvo: o proprio fluxo ja restaurou (ou nunca ficou offline).
    return {'restaurado': False, 'pendente': False, 'motivo': 'nada a restaurar'}


# ---------------------------------------------------------------------------
# Acoes
# ---------------------------------------------------------------------------
# nome -> (minimo de argumentos, maximo ou None). Usado na validacao dos fluxos.
ACOES = {
    'tap': (1, 1), 'tap_inicia': (1, 1), 'tap_ultimo': (1, 1), 'tap_sistema': (1, 1),
    'text': (2, 2), 'money': (1, 1), 'snapshot': (1, 1), 'snapshot_sistema': (1, 1), 'screenshot': (1, 1),
    'assert': (1, None), 'assert_ausente': (1, None), 'row': (2, 2),
    'key': (1, 1), 'back': (0, 0), 'back_sistema': (0, 0), 'airplane': (1, 1), 'wait': (1, 1), 'scroll': (1, 1),
    'stop': (0, 0), 'launch': (0, 0),
}


def executar_acao(a):
    if a[0] == 'tap':
        tap(a[1])
    elif a[0] == 'tap_inicia':
        tap(a[1], modo='inicia')
    elif a[0] == 'tap_ultimo':
        tap(a[1], modo='ultimo')
    elif a[0] == 'tap_sistema':
        tap(a[1], sistema=True)
    elif a[0] == 'text':
        digitar(a[1], a[2])
    elif a[0] == 'money':
        money(a[1])
    elif a[0] == 'snapshot':
        snapshot(a[1])
    elif a[0] == 'snapshot_sistema':
        snapshot_sistema(a[1])
    elif a[0] == 'assert':
        # Espera ate 6 s parado; depois rola a lista (para baixo e de volta ao topo) somando o que
        # ja apareceu: cada texto precisa estar na tela em alguma posicao da rolagem.
        deadline = time.monotonic() + 6
        rolagens = ['down'] * 6 + ['up'] * 12
        missing = list(a[1:])
        while True:
            atual = layout()
            raw = json.dumps(atual, ensure_ascii=False)
            missing = [expected for expected in missing if expected not in raw]
            if not missing:
                break
            if time.monotonic() < deadline:
                time.sleep(.5)
                continue
            if not rolagens or not rolar(rolagens.pop(0), list(nodes(atual))):
                raise AssertionError('UI text absent: ' + ', '.join(missing))
        print('PASS: ' + ' / '.join(a[1:]), flush=True)
    elif a[0] == 'assert_ausente':
        raw = json.dumps(layout(), ensure_ascii=False)
        present = [t for t in a[1:] if t in raw]
        if present:
            raise AssertionError('UI text present: ' + ', '.join(present))
        print('PASS ausente: ' + ' / '.join(a[1:]), flush=True)
    elif a[0] == 'row':
        row = next(n for n in nodes(layout()) if n.get('content-desc') == a[1])
        if a[2] not in [n.get('text') for n in nodes(row)]:
            raise AssertionError('UI row differs: ' + a[1] + ' expected ' + a[2])
        print('PASS: ' + a[1] + ' = ' + a[2], flush=True)
    elif a[0] == 'key':
        guard()
        adb('shell', 'input', 'keyevent', a[1])
    elif a[0] == 'back':
        guard()
        adb('shell', 'input', 'keyevent', 4)
    elif a[0] == 'back_sistema':
        # Sem guard(): o primeiro plano e o chooser do sistema, nao o app. Confere que o app voltou.
        adb('shell', 'input', 'keyevent', 4)
        time.sleep(1)
        guard()
    elif a[0] == 'airplane':
        airplane(a[1])
    elif a[0] == 'wait':
        time.sleep(min(float(a[1]), 30))
    elif a[0] == 'scroll':
        guard()
        if not rolar(a[1]):
            raise RuntimeError('Nenhuma lista rolavel na tela')
    elif a[0] == 'screenshot':
        p = subprocess.run([str(ADB), '-s', DEVICE, 'exec-out', 'screencap', '-p'], capture_output=True, check=True)
        (ROOT / 'builds' / ('pdv-ui-' + a[1] + '.png')).write_bytes(p.stdout)
    elif a[0] == 'stop':
        adb('shell', 'am', 'force-stop', PACKAGE)
    elif a[0] == 'launch':
        adb('shell', 'am', 'start', '-n', PACKAGE + '/.MainActivity')
        time.sleep(3)
    else:
        raise ValueError(a[0])


def main(actions):
    for a in actions:
        executar_acao(a)


def comandos_da_acao(a):
    """Funcao pura: descricao dos comandos ADB que a acao executaria (usada por --simular)."""
    n = a[0]
    q = lambda v: '"' + str(v) + '"'
    if n in ('tap', 'tap_inicia', 'tap_ultimo', 'tap_sistema'):
        modo = {'tap': 'exato', 'tap_inicia': 'comeca com', 'tap_ultimo': 'o mais abaixo', 'tap_sistema': 'exato, sem exigir o app'}[n]
        return ['android layout --device SERIAL --pretty  # localizar ' + q(a[1]) + ' (' + modo + ')', 'adb shell input tap <x> <y>  # centro do elemento']
    if n == 'text':
        return ['android layout --device SERIAL --pretty  # localizar EditText ' + q(a[1]) + ' (rola se preciso)',
                'adb shell input tap <x> <y>  # foco no campo',
                'adb shell input text ' + q(a[2].replace(' ', '%s')),
                'adb shell input keyevent 4  # so se o teclado do sistema estiver aberto']
    if n == 'money':
        return ['android layout --device SERIAL --pretty  # teclado numerico'] + ['adb shell input tap <x> <y>  # tecla ' + d for d in str(a[1])]
    if n in ('assert', 'assert_ausente'):
        return ['android layout --device SERIAL --pretty  # ' + ('esperar ate 12 s' if n == 'assert' else 'conferir ausencia') + ': ' + ' / '.join(q(t) for t in a[1:])]
    if n == 'row':
        return ['android layout --device SERIAL --pretty  # linha ' + q(a[1]) + ' contem ' + q(a[2])]
    if n == 'snapshot':
        return ['android layout --device SERIAL --pretty  # grava builds/pdv-ui-' + a[1] + '-layout.json']
    if n == 'snapshot_sistema':
        return ['android layout --device SERIAL --pretty  # grava so a contagem de nos em builds/pdv-ui-' + a[1] + '-layout.json']
    if n == 'screenshot':
        return ['adb exec-out screencap -p  # grava builds/pdv-ui-' + a[1] + '.png']
    if n == 'key':
        return ['adb shell input keyevent ' + a[1]]
    if n == 'back':
        return ['adb shell input keyevent 4']
    if n == 'back_sistema':
        return ['adb shell input keyevent 4  # sem exigir o app em primeiro plano (fecha o seletor do sistema)', 'adb shell dumpsys window | grep mCurrentFocus  # confere que o app voltou']
    if n == 'wait':
        return ['sleep ' + str(min(float(a[1]), 30)) + ' s']
    if n == 'scroll':
        return ['adb shell input swipe <x> <y1> <x> <y2> 400  # ' + a[1]]
    if n == 'stop':
        return ['adb shell am force-stop ' + PACKAGE]
    if n == 'launch':
        return ['adb shell am start -n ' + PACKAGE + '/.MainActivity']
    if n == 'airplane':
        original = {'airplane': False, 'wifi': True, 'dados': True}  # suposicao do dry-run
        cmds = ['adb shell ' + ' '.join(c) for c in planejar_airplane(a[1], original)]
        extra = ['adb shell ping -c 1 -W 3 ' + HOST_API_PADRAO + '  # evidencia de ' + ('offline' if a[1] == 'on' else 'online'), 'adb shell dumpsys connectivity']
        return (['adb shell settings get global airplane_mode_on|wifi_on|mobile_data  # guarda o original'] if a[1] == 'on' else []) + cmds + extra
    raise ValueError(n)


# ---------------------------------------------------------------------------
# Fluxos versionados (scripts/fluxos/*.json)
# ---------------------------------------------------------------------------
PLACEHOLDER = re.compile(r'\{([A-Za-z_]\w*)(?::(falado|centavos))?\}')
MAX_PROFUNDIDADE = 3
PADROES_SEGREDO = [re.compile(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}'), re.compile(r'\b\d{6}\b'),
                   re.compile(r'(?i)\b(token|senha|password|bearer)\b\s*[:=]')]


def falar_reais(centavos):
    """Funcao pura: igual a falarDinheiro do app ("1 real", "160 reais", "10 reais e 50 centavos")."""
    c = int(centavos)
    abs_c = abs(c)
    reais, cent = divmod(abs_c, 100)
    partes = []
    if reais > 0 or cent == 0:
        partes.append('1 real' if reais == 1 else str(reais) + ' reais')
    if cent > 0:
        partes.append('1 centavo' if cent == 1 else str(cent) + ' centavos')
    return ('menos ' if c < 0 else '') + ' e '.join(partes)


def avaliar_expressao(expr, scope):
    """Funcao pura: avalia soma/subtracao/multiplicacao/divisao inteira de nomes e inteiros."""
    if isinstance(expr, bool):
        raise ValueError('expressao invalida: ' + repr(expr))
    if isinstance(expr, int):
        return expr

    def ev(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, int) and not isinstance(node.value, bool):
            return node.value
        if isinstance(node, ast.Name):
            if node.id not in scope:
                raise ValueError('parametro desconhecido: ' + node.id)
            return scope[node.id]
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            v = ev(node.operand)
            return -v if isinstance(node.op, ast.USub) else v
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.FloorDiv)):
            a, b = ev(node.left), ev(node.right)
            return a + b if isinstance(node.op, ast.Add) else a - b if isinstance(node.op, ast.Sub) else a * b if isinstance(node.op, ast.Mult) else a // b
        raise ValueError('expressao nao permitida: ' + str(expr))
    try:
        return ev(ast.parse(str(expr), mode='eval').body)
    except SyntaxError as exc:
        raise ValueError('expressao invalida: ' + str(expr)) from exc


def substituir(texto, scope):
    """Funcao pura: troca {nome}, {nome:falado} (ex.: "160 reais") e {nome:centavos} pelos valores."""
    def troca(m):
        nome, fmt = m.group(1), m.group(2)
        if nome not in scope:
            raise ValueError('parametro desconhecido: {' + nome + '}')
        return falar_reais(scope[nome]) if fmt == 'falado' else str(scope[nome])
    return PLACEHOLDER.sub(troca, texto)


def montar_escopo(dados, overrides):
    """Funcao pura: parametros (padrao < overrides) e derivados (expressoes; override vence)."""
    scope = {}
    for nome, valor in (dados.get('parametros') or {}).items():
        scope[nome] = overrides[nome] if nome in overrides else avaliar_expressao(valor, scope)
    for nome, valor in overrides.items():
        scope.setdefault(nome, valor)
    for nome, expr in (dados.get('derivados') or {}).items():
        if nome not in overrides:
            scope[nome] = avaliar_expressao(expr, scope)
    return scope


def carregar_json(caminho):
    return json.loads(Path(caminho).read_text(encoding='utf-8-sig'))


def validar_acao(a):
    """Funcao pura: lista de erros de uma acao [nome, args...] (sem resolver parametros)."""
    if not isinstance(a, list) or not a or not isinstance(a[0], str):
        return ['acao deve ser uma lista [nome, ...]']
    if a[0] not in ACOES:
        return ['acao desconhecida: ' + a[0]]
    lo, hi = ACOES[a[0]]
    n = len(a) - 1
    erros = []
    if n < lo or (hi is not None and n > hi):
        erros.append(a[0] + ': esperava ' + (str(lo) if lo == hi else str(lo) + '+') + ' argumento(s), recebeu ' + str(n))
    if not all(isinstance(v, str) for v in a[1:]):
        erros.append(a[0] + ': argumentos devem ser strings')
    elif a[0] == 'airplane' and a[1:] not in (['on'], ['off']):
        erros.append('airplane espera "on" ou "off"')
    elif a[0] == 'scroll' and a[1:] not in (['up'], ['down']):
        erros.append('scroll espera "up" ou "down"')
    elif a[0] == 'wait' and not re.fullmatch(r'\d+(\.\d+)?', a[1] if len(a) > 1 else ''):
        erros.append('wait espera segundos numericos')
    for v in a[1:]:
        if isinstance(v, str):
            for padrao in PADROES_SEGREDO:
                if padrao.search(PLACEHOLDER.sub('', v)):
                    erros.append('possivel credencial/e-mail/codigo em "' + v + '"')
    return erros


def validar_fluxo(dados, caminho, _profundidade=0):
    """Funcao pura (le apenas arquivos incluidos): lista de erros do esquema de um fluxo ou regressao."""
    base = Path(caminho).parent
    erros = []
    if not isinstance(dados, dict):
        return ['raiz deve ser um objeto']
    if not isinstance(dados.get('nome'), str) or not dados['nome']:
        erros.append('"nome" obrigatorio')
    for campo in ('parametros', 'derivados'):
        if campo in dados and not isinstance(dados[campo], dict):
            erros.append('"' + campo + '" deve ser objeto')
            return erros
    for nome, valor in (dados.get('parametros') or {}).items():
        if isinstance(valor, bool) or not isinstance(valor, (int, str)):
            erros.append('parametro ' + nome + ': use inteiro ou expressao')
    try:
        # Resolve com todos os nomes de "com"/regressao ausentes: o escopo vazio exige defaults completos.
        scope = montar_escopo(dados, {})
    except ValueError as exc:
        return erros + ['parametros/derivados: ' + str(exc)]
    if dados.get('tipo') == 'regressao':
        fluxos = dados.get('fluxos')
        if not isinstance(fluxos, list) or not fluxos:
            return erros + ['"fluxos" deve ser lista nao vazia']
        for nome in fluxos:
            alvo = base / str(nome)
            if not alvo.is_file():
                erros.append('fluxo inexistente: ' + str(nome))
                continue
            try:
                sub = carregar_json(alvo)
            except ValueError as exc:
                erros.append(str(nome) + ': JSON invalido (' + str(exc) + ')')
                continue
            if sub.get('tipo') == 'regressao':
                erros.append(str(nome) + ': regressao nao pode incluir regressao')
                continue
            erros += [str(nome) + ': ' + e for e in validar_fluxo(sub, alvo, _profundidade)]
            try:
                montar_escopo(sub, scope)
            except ValueError as exc:
                erros.append(str(nome) + ' (no escopo da regressao): ' + str(exc))
        return erros
    passos = dados.get('passos')
    if not isinstance(passos, list) or not passos:
        return erros + ['"passos" deve ser lista nao vazia']
    for i, passo in enumerate(passos, 1):
        rot = 'passo ' + str(i)
        if not isinstance(passo, dict) or not isinstance(passo.get('nome'), str) or not passo['nome']:
            erros.append(rot + ': objeto com "nome" obrigatorio')
            continue
        rot += ' (' + passo['nome'] + ')'
        if 'se' in passo:
            try:
                avaliar_expressao(passo['se'], scope)
            except ValueError as exc:
                erros.append(rot + ': "se" ' + str(exc))
        if ('acao' in passo) == ('incluir' in passo):
            erros.append(rot + ': informe exatamente um entre "acao" e "incluir"')
        elif 'acao' in passo:
            erros += [rot + ': ' + e for e in validar_acao(passo['acao'])]
            for v in passo['acao'][1:] if isinstance(passo['acao'], list) else []:
                if isinstance(v, str):
                    for m in PLACEHOLDER.finditer(v):
                        if m.group(1) not in scope:
                            erros.append(rot + ': parametro nao definido {' + m.group(1) + '}')
        else:
            if _profundidade >= MAX_PROFUNDIDADE:
                erros.append(rot + ': inclusoes muito profundas')
                continue
            alvo = base / str(passo['incluir'])
            if not alvo.is_file():
                erros.append(rot + ': arquivo incluido inexistente: ' + str(passo['incluir']))
                continue
            sub = carregar_json(alvo)
            erros += [rot + ' > ' + e for e in validar_fluxo(sub, alvo, _profundidade + 1)]
            overrides = {}
            for k, expr in (passo.get('com') or {}).items():
                try:
                    overrides[k] = avaliar_expressao(expr, scope)
                except ValueError as exc:
                    erros.append(rot + ': "com" ' + k + ': ' + str(exc))
            try:
                montar_escopo(sub, overrides)
            except ValueError as exc:
                erros.append(rot + ': ' + str(exc))
    return erros


def expandir_fluxo(caminho, overrides=None, _profundidade=0):
    """Funcao pura (le arquivos): lista de {fluxo, passo, acao} com parametros ja substituidos.

    Para uma regressao, concatena os fluxos em ordem; parametros/derivados da regressao
    sobrepoem os padroes de cada fluxo."""
    dados = carregar_json(caminho)
    base = Path(caminho).parent
    overrides = dict(overrides or {})
    if dados.get('tipo') == 'regressao':
        scope = montar_escopo(dados, overrides)
        itens = []
        for nome in dados['fluxos']:
            itens += expandir_fluxo(base / nome, scope, _profundidade)
        return itens
    scope = montar_escopo(dados, overrides)
    itens = []
    for passo in dados['passos']:
        if 'se' in passo and avaliar_expressao(passo['se'], scope) == 0:
            continue  # passo opcional: "se" vale 0 (parametro desligado)
        if 'incluir' in passo:
            filhos = {k: avaliar_expressao(v, scope) for k, v in (passo.get('com') or {}).items()}
            for item in expandir_fluxo(base / passo['incluir'], filhos, _profundidade + 1):
                itens.append({'fluxo': dados['nome'] + ' > ' + item['fluxo'], 'passo': passo['nome'] + ' > ' + item['passo'], 'acao': item['acao']})
        else:
            acao = [passo['acao'][0]] + [substituir(v, scope) for v in passo['acao'][1:]]
            itens.append({'fluxo': dados['nome'], 'passo': passo['nome'], 'acao': acao})
    return itens


def parse_params(pares):
    """Funcao pura: ['nome=valor', ...] -> {nome: int}."""
    resultado = {}
    for par in pares or []:
        nome, sep, valor = par.partition('=')
        if not sep or not re.fullmatch(r'[A-Za-z_]\w*', nome) or not re.fullmatch(r'-?\d+', valor):
            raise ValueError('--param espera nome=inteiro, recebeu: ' + par)
        resultado[nome] = int(valor)
    return resultado


def simular_fluxo(caminho, overrides=None, saida=print):
    """Valida o fluxo e imprime os comandos ADB sem executar nada. Retorna a quantidade de passos."""
    dados = carregar_json(caminho)
    erros = validar_fluxo(dados, caminho)
    if erros:
        raise ValueError('Fluxo invalido (' + str(caminho) + '):\n  ' + '\n  '.join(erros))
    itens = expandir_fluxo(caminho, overrides)
    atual = None
    for i, item in enumerate(itens, 1):
        if item['fluxo'] != atual:
            atual = item['fluxo']
            saida('== ' + atual)
        saida('[' + str(i) + '] ' + item['passo'] + '  ' + json.dumps(item['acao'], ensure_ascii=False))
        for comando in comandos_da_acao(item['acao']):
            saida('      ' + comando)
    saida('Simulacao OK: ' + str(len(itens)) + ' passos, nenhum comando executado.')
    return len(itens)


def info_aparelho():
    """Fabricante/modelo/Android, sem numero de serie."""
    return {'fabricante': getprop(DEVICE, 'ro.product.manufacturer'), 'modelo': getprop(DEVICE, 'ro.product.model'),
            'android': getprop(DEVICE, 'ro.build.version.release'), 'sdk': getprop(DEVICE, 'ro.build.version.sdk'),
            'fisico': not is_emulator(DEVICE)}


def executar_fluxo(caminho, overrides=None):
    """Executa o fluxo/regressao no aparelho. Para no primeiro erro; sempre restaura rede; grava relatorio."""
    dados = carregar_json(caminho)
    erros = validar_fluxo(dados, caminho)
    if erros:
        raise ValueError('Fluxo invalido (' + str(caminho) + '):\n  ' + '\n  '.join(erros))
    itens = expandir_fluxo(caminho, overrides)
    relatorio = {'fluxo': dados['nome'], 'arquivo': str(Path(caminho).name), 'inicio': datetime.now(timezone.utc).isoformat(),
                 'aparelho': info_aparelho(), 'parametros': overrides or {}, 'passos': [], 'resultado': 'FAIL'}
    falhou = False
    try:
        for i, item in enumerate(itens, 1):
            t0 = time.monotonic()
            registro = {'n': i, 'fluxo': item['fluxo'], 'passo': item['passo'], 'acao': item['acao'], 'resultado': 'PASS'}
            print('[' + str(i) + '/' + str(len(itens)) + '] ' + item['fluxo'] + ' :: ' + item['passo'], flush=True)
            try:
                executar_acao(item['acao'])
            except Exception as exc:  # noqa: BLE001 - qualquer erro reprova o passo e interrompe o fluxo
                registro['resultado'] = 'FAIL'
                registro['erro'] = (type(exc).__name__ + ': ' + str(exc).strip())[:500]
                falhou = True
            registro['duracao_s'] = round(time.monotonic() - t0, 2)
            relatorio['passos'].append(registro)
            if falhou:
                print('FAIL: ' + registro['erro'], file=sys.stderr, flush=True)
                break
        else:
            relatorio['resultado'] = 'PASS'
        if falhou:
            relatorio['nao_executados'] = len(itens) - len(relatorio['passos'])
    finally:
        relatorio['conectividade_final'] = restaurar_conectividade()
        relatorio['fim'] = datetime.now(timezone.utc).isoformat()
        (ROOT / 'builds').mkdir(exist_ok=True)
        saida = ROOT / 'builds' / ('regressao-' + re.sub(r'[^\w-]', '_', dados['nome']) + '-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.json')
        saida.write_text(sanitize(json.dumps(relatorio, ensure_ascii=False, indent=2)), encoding='utf-8')
        print('Relatorio: ' + str(saida) + '  resultado: ' + relatorio['resultado'], flush=True)
    return relatorio['resultado'] == 'PASS'


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description='Driver de UI Android (somente app de homologacao ' + PACKAGE + ').')
    ap.add_argument('acoes', nargs='?', help='caminho do JSON de acoes, ou a palavra "fluxo" seguida do JSON do fluxo (opcional com --listar)')
    ap.add_argument('arquivo', nargs='?', help='com "fluxo": caminho do fluxo ou da regressao')
    ap.add_argument('--dispositivo', metavar='SERIAL', help='serial do aparelho; se omitido, usa o unico aparelho conectado')
    ap.add_argument('--fisico', action='store_true', help='permite aparelho fisico (sem isso, so emulador)')
    ap.add_argument('--listar', action='store_true', help='lista aparelhos conectados e sai')
    ap.add_argument('--param', action='append', default=[], metavar='NOME=VALOR', help='sobrepoe parametro inteiro do fluxo (repetivel)')
    ap.add_argument('--simular', '--dry-run', dest='simular', action='store_true', help='com "fluxo": valida e imprime os comandos ADB sem executar (nao usa aparelho)')
    args = ap.parse_args(argv)
    if not args.listar and not args.acoes:
        ap.error('informe o JSON de acoes, "fluxo ARQUIVO" ou use --listar')
    if args.acoes == 'fluxo' and not args.arquivo:
        ap.error('"fluxo" exige o caminho do arquivo')
    if args.acoes != 'fluxo' and args.arquivo:
        ap.error('argumento extra: ' + args.arquivo)
    if args.simular and args.acoes != 'fluxo':
        ap.error('--simular so vale com "fluxo ARQUIVO"')
    return args


def entry(argv=None):
    global DEVICE
    args = parse_args(argv)
    if args.simular:
        try:
            simular_fluxo(Path(args.arquivo), parse_params(args.param))
        except (ValueError, OSError) as exc:
            print('ERRO: ' + str(exc).strip(), file=sys.stderr)
            return 2
        return 0
    try:
        require_tools()
        if args.listar:
            listar()
            return 0
        DEVICE = resolve_device(args.dispositivo)
        emulator = is_emulator(DEVICE)
        if not emulator and not args.fisico:
            raise RuntimeError('Aparelho fisico recusado: use --fisico para permitir (somente app ' + PACKAGE + ')')
        model = getprop(DEVICE, 'ro.product.model')
    except RuntimeError as exc:
        print('ERRO: ' + str(exc).strip(), file=sys.stderr)
        return 2
    if args.acoes == 'fluxo':
        try:
            return 0 if executar_fluxo(Path(args.arquivo), parse_params(args.param)) else 1
        except (ValueError, OSError) as exc:
            print('ERRO: ' + str(exc).strip(), file=sys.stderr)
            return 2
    actions = json.loads(Path(args.acoes).read_text(encoding='utf-8-sig'))
    execution = {'inicio': datetime.now(timezone.utc).isoformat(), 'dispositivo': hashlib.sha256(DEVICE.encode()).hexdigest(), 'modelo': model,
                 'fisico': not emulator, 'acoes': actions, 'resultado': 'FAIL'}
    try:
        main(actions)
        execution['resultado'] = 'PASS'
    finally:
        execution['fim'] = datetime.now(timezone.utc).isoformat()
        (ROOT / 'builds').mkdir(exist_ok=True)
        with (ROOT / 'builds/pdv-ui-execucoes.jsonl').open('a', encoding='utf-8') as log:
            log.write(sanitize(json.dumps(execution, ensure_ascii=False)) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(entry())
