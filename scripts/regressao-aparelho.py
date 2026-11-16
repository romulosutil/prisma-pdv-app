"""Regressao no aparelho: um comando que roda scripts/fluxos/regressao.json.

  python scripts/regressao-aparelho.py --fisico            # roda no aparelho conectado
  python scripts/regressao-aparelho.py --simular           # valida e imprime os comandos ADB, sem aparelho
  python scripts/regressao-aparelho.py --fisico --param venda_centavos=7000

Equivale a `python scripts/pdv-android-ui.py [opcoes] fluxo scripts/fluxos/regressao.json`.
Ordem: abrir caixa, vender, entrada, sangria, retirada, venda offline, fechar caixa. Para no primeiro
erro, restaura modo aviao/Wi-Fi/dados ao final e grava builds/regressao-regressao-<data>.json.
"""
import importlib.util
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('pdv_android_ui', AQUI / 'pdv-android-ui.py')
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)

if __name__ == '__main__':
    sys.exit(driver.entry([*sys.argv[1:], 'fluxo', str(AQUI / 'fluxos' / 'regressao.json')]))
