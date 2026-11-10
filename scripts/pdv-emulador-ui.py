"""Small native Android CLI driver. No credentials, database access or auth bypass.

Pass a JSON array of actions: tap/text/snapshot/assert/key/money. Snapshots are
sanitized and saved under builds. Intended for the synthetic homologation AVD.
"""
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANDROID = Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/cmdline-tools/latest/bin/android.exe'
ADB = Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/platform-tools/adb.exe'
DEVICE = 'emulator-5586'
sys.stdout.reconfigure(encoding='utf-8')


def run(args):
    p = subprocess.run([str(a) for a in args], capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('cp1252', errors='replace'))
    return p.stdout.decode('cp1252', errors='replace')


def cli(*args):
    return run([ANDROID, '--no-metrics', *args])


def nodes(value):
    if isinstance(value, list):
        for item in value:
            yield from nodes(item)
    elif isinstance(value, dict):
        yield value
        for field in ('content', 'children'):
            yield from nodes(value.get(field))


def layout():
    return json.loads(cli('layout', '--device', DEVICE, '--pretty'))


def sanitize(text):
    text = re.sub(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[email de teste]', text)
    text = re.sub(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b', '[CPF sintetico]', text)
    # Preserve explicit sale references so before/after sync can be compared;
    # six-digit input values (including login codes) remain redacted.
    return re.sub(r'(?<!Venda )(?<!#)\b\d{6}\b', '[codigo redigido]', text)


def tap(label):
    deadline = time.monotonic() + 12
    while True:
        data = layout()
        # Modal windows may not carry a title; never tap the launcher/system UI.
        if any(n.get('text') == 'At a glance' for n in nodes(data)):
            raise RuntimeError('PDV is no longer in the foreground')
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
    field = 'desc' if target.get('content-desc') == label else 'text'
    selector = field + '=' + label.split(',')[0] + ',class=' + target['class']
    if 'CLICKABLE' in target.get('interactions', []):
        selector += ',clickable=true'
    options = ['--match=first'] if sum(n.get('class') == target['class'] for n in candidates) > 1 else []
    cli('input', '--device', DEVICE, 'tap', *options, selector)
    # Accessibility exposes the destination during the native stack animation;
    # allow it to settle before another tap (do not retry a payment blindly).
    time.sleep(1)


def money(value):
    labels = dict(zip('0123456789', ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']))
    current = list(nodes(layout()))
    for digit in str(value):
        target = next(n for n in current if n.get('content-desc') == labels[digit] and 'CLICKABLE' in n.get('interactions', []))
        x, y = map(int, re.findall(r'\d+', target['center']))
        run([ADB, '-s', DEVICE, 'shell', 'input', 'tap', x, y])
        time.sleep(.15)


def snapshot(name):
    data = layout()
    path = ROOT / 'builds' / ('pdv-ciclo-' + name + '-layout.json')
    path.write_text(sanitize(json.dumps(data, ensure_ascii=False, indent=2)), encoding='utf-8')
    values = [n.get('content-desc') or n.get('text') for n in nodes(data)]
    print(sanitize('\n'.join(str(v) for v in values if v)), flush=True)


def main(actions):
    if run([ADB, '-s', DEVICE, 'shell', 'getprop', 'ro.kernel.qemu']).strip() != '1':
        raise RuntimeError('Only the synthetic Android Emulator is permitted')
    for a in actions:
        if a[0] == 'tap':
            tap(a[1])
        elif a[0] == 'text':
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
        elif a[0] == 'row':
            row = next(n for n in nodes(layout()) if n.get('content-desc') == a[1])
            if a[2] not in [n.get('text') for n in nodes(row)]:
                raise AssertionError('UI row differs: ' + a[1] + ' expected ' + a[2])
            print('PASS: ' + a[1] + ' = ' + a[2], flush=True)
        elif a[0] == 'key':
            run([ADB, '-s', DEVICE, 'shell', 'input', 'keyevent', a[1]])
        elif a[0] == 'wait':
            time.sleep(min(float(a[1]), 30))
        elif a[0] == 'scroll':
            scroll = next(n for n in nodes(layout()) if 'SCROLLABLE' in n.get('interactions', []) and n.get('class') in ('android.widget.ScrollView', 'androidx.recyclerview.widget.RecyclerView'))
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', scroll['bounds']))
            x = (x1 + x2) // 2
            start, end = int(y1 + (y2-y1)*.8), int(y1 + (y2-y1)*.25)
            if a[1] == 'up':
                start, end = end, start
            run([ADB, '-s', DEVICE, 'shell', 'input', 'swipe', x, start, x, end, 400])
        elif a[0] == 'screenshot':
            p = subprocess.run([str(ADB), '-s', DEVICE, 'exec-out', 'screencap', '-p'], capture_output=True, check=True)
            (ROOT / 'builds' / ('pdv-ciclo-' + a[1] + '.png')).write_bytes(p.stdout)
        elif a[0] == 'stop':
            run([ADB, '-s', DEVICE, 'shell', 'am', 'force-stop', 'br.com.pdv.mobile.homologacao'])
        elif a[0] == 'launch':
            run([ADB, '-s', DEVICE, 'shell', 'am', 'start', '-n', 'br.com.pdv.mobile.homologacao/.MainActivity'])
            time.sleep(3)
        else:
            raise ValueError(a[0])


if __name__ == '__main__':
    actions = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
    execution = {'inicio': datetime.now(timezone.utc).isoformat(), 'acoes': actions, 'resultado': 'FAIL'}
    try:
        main(actions)
        execution['resultado'] = 'PASS'
    finally:
        execution['fim'] = datetime.now(timezone.utc).isoformat()
        with (ROOT / 'builds/pdv-ciclo-execucoes.jsonl').open('a', encoding='utf-8') as log:
            log.write(sanitize(json.dumps(execution, ensure_ascii=False)) + '\n')
