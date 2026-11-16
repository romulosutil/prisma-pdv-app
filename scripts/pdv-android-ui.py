"""Android UI driver for any device (physical or emulator). Homologation app only.

No credentials, database access or auth bypass. Pass a JSON array of actions:
tap/tap_sistema/text/money/scroll/assert/assert_ausente/row/snapshot/screenshot/
stop/launch/key/back/airplane/wait. Snapshots are sanitized and saved under builds.

Uso:
  python scripts/pdv-android-ui.py --listar
  python scripts/pdv-android-ui.py acoes.json [--dispositivo SERIAL] [--fisico]

Sem --fisico, apenas emuladores sao aceitos. Toda acao que toca/digita/rola exige
o app de homologacao em primeiro plano (tap_sistema e a excecao, para dialogos
do sistema como permissoes e chooser de compartilhamento).
"""
import argparse
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


def tap(label, sistema=False):
    if not sistema:
        guard()
    deadline = time.monotonic() + 12
    while True:
        data = layout()
        all_nodes = list(nodes(data))
        candidates = [n for n in all_nodes if n.get('content-desc') == label and 'CLICKABLE' in n.get('interactions', [])]
        if not candidates:
            candidates = [n for n in all_nodes if n.get('text') == label]
        if candidates:
            break
        if time.monotonic() >= deadline:
            raise RuntimeError('UI label absent: ' + label)
        time.sleep(.5)
    # Prefer the tab view over a shortcut button with the same label.
    candidates.sort(key=lambda n: n.get('class') != 'android.view.View')
    target = candidates[0]
    # Toque por coordenada (centro do elemento): independe do seletor do `android input`,
    # que falha com rotulos acentuados/virgulas e em telas sem ociosidade (camera).
    x, y = map(int, re.findall(r'\d+', target['center']))
    adb('shell', 'input', 'tap', x, y)
    # Accessibility exposes the destination during the native stack animation;
    # allow it to settle before another tap (do not retry a payment blindly).
    time.sleep(1)


def money(value):
    guard()
    labels = dict(zip('0123456789', ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']))
    current = list(nodes(layout()))
    for digit in str(value):
        target = next(n for n in current if n.get('content-desc') == labels[digit] and 'CLICKABLE' in n.get('interactions', []))
        x, y = map(int, re.findall(r'\d+', target['center']))
        adb('shell', 'input', 'tap', x, y)
        time.sleep(.15)


def snapshot(name):
    data = layout()
    path = ROOT / 'builds' / ('pdv-ui-' + name + '-layout.json')
    path.write_text(sanitize(json.dumps(data, ensure_ascii=False, indent=2)), encoding='utf-8')
    values = [n.get('content-desc') or n.get('text') for n in nodes(data)]
    print(sanitize('\n'.join(str(v) for v in values if v)), flush=True)


def airplane(state):
    if state not in ('on', 'off'):
        raise ValueError('airplane espera "on" ou "off"')
    try:
        adb('shell', 'cmd', 'connectivity', 'airplane-mode', 'enable' if state == 'on' else 'disable')
    except RuntimeError as exc:
        raise RuntimeError('Aparelho nao suporta "cmd connectivity airplane-mode" (comum em Android < 11 ou sem permissao): ' + str(exc).strip())
    time.sleep(2)


def main(actions):
    for a in actions:
        if a[0] == 'tap':
            tap(a[1])
        elif a[0] == 'tap_sistema':
            tap(a[1], sistema=True)
        elif a[0] == 'text':
            guard()
            cli('input', '--device', DEVICE, 'text', a[2], 'desc=' + a[1] + ',class=EditText')
        elif a[0] == 'money':
            money(a[1])
        elif a[0] == 'snapshot':
            snapshot(a[1])
        elif a[0] == 'assert':
            deadline = time.monotonic() + 12
            while True:
                raw = json.dumps(layout(), ensure_ascii=False)
                missing = [expected for expected in a[1:] if expected not in raw]
                if not missing:
                    break
                if time.monotonic() >= deadline:
                    raise AssertionError('UI text absent: ' + ', '.join(missing))
                time.sleep(.5)
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
        elif a[0] == 'airplane':
            airplane(a[1])
        elif a[0] == 'wait':
            time.sleep(min(float(a[1]), 30))
        elif a[0] == 'scroll':
            guard()
            scroll = next(n for n in nodes(layout()) if 'SCROLLABLE' in n.get('interactions', []) and n.get('class') in ('android.widget.ScrollView', 'androidx.recyclerview.widget.RecyclerView'))
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', scroll['bounds']))
            x = (x1 + x2) // 2
            start, end = int(y1 + (y2-y1)*.8), int(y1 + (y2-y1)*.25)
            if a[1] == 'up':
                start, end = end, start
            adb('shell', 'input', 'swipe', x, start, x, end, 400)
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


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description='Driver de UI Android (somente app de homologacao ' + PACKAGE + ').')
    ap.add_argument('acoes', nargs='?', help='caminho do JSON de acoes (opcional com --listar)')
    ap.add_argument('--dispositivo', metavar='SERIAL', help='serial do aparelho; se omitido, usa o unico aparelho conectado')
    ap.add_argument('--fisico', action='store_true', help='permite aparelho fisico (sem isso, so emulador)')
    ap.add_argument('--listar', action='store_true', help='lista aparelhos conectados e sai')
    args = ap.parse_args(argv)
    if not args.listar and not args.acoes:
        ap.error('informe o JSON de acoes ou use --listar')
    return args


def entry(argv=None):
    global DEVICE
    args = parse_args(argv)
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
