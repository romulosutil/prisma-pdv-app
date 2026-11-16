"""LEGADO: shim de compatibilidade para scripts/pdv-android-ui.py.

Mantem o comportamento antigo (somente emulador-5586, sem --fisico) quando
nenhum --dispositivo e informado. Use pdv-android-ui.py diretamente.
"""
import subprocess
import sys
from pathlib import Path

args = sys.argv[1:]
if not any(a == '--dispositivo' or a.startswith('--dispositivo=') for a in args):
    args += ['--dispositivo', 'emulator-5586']
sys.exit(subprocess.call([sys.executable, str(Path(__file__).with_name('pdv-android-ui.py')), *args]))
