"""Move only recognized native projects between workspace-owned profiles."""
import re
import os
from contextlib import contextmanager
from pathlib import Path

PACKAGES = {'production': 'br.com.pdv.mobile', 'homologacao': 'br.com.pdv.homologacao'}


@contextmanager
def build_lock(root):
    path = _safe(Path(root) / 'builds' / '.android-build.lock', root)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise RuntimeError('Outro build Android está ativo ou deixou lock pendente; não alterar os perfis.') from None
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        path.unlink()


def _safe(path, root):
    root = root.resolve(strict=True)
    path = Path(path).absolute()
    try:
        relative = path.relative_to(root)
    except ValueError:
        raise ValueError('Caminho fora do workspace.')
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink() or (current.exists() and getattr(current, 'is_junction', lambda: False)()):
            raise ValueError('Link ou junction em caminho nativo.')
    if not path.resolve().is_relative_to(root):
        raise ValueError('Caminho resolvido fora do workspace.')
    return path


def identificar(path, root):
    path = _safe(path, root)
    gradle = _safe(path / 'app' / 'build.gradle', root)
    if not path.is_dir() or not gradle.is_file():
        raise ValueError('Projeto Android desconhecido; nenhum diretório foi movido.')
    ids = re.findall(r'\bapplicationId\s+["\']([^"\']+)["\']', gradle.read_text(encoding='utf-8'))
    matches = [profile for profile, package in PACKAGES.items() if ids == [package]]
    if len(matches) != 1:
        raise ValueError('Identidade Android desconhecida; nenhum diretório foi movido.')
    return matches[0]


def selecionar(root, mobile, profile='production'):
    if profile not in PACKAGES:
        raise ValueError('Perfil nativo desconhecido.')
    root = Path(root).resolve(strict=True)
    android = _safe(Path(mobile) / 'android', root)
    cache = _safe(root / 'builds' / 'native-cache', root)
    target = _safe(cache / profile, root)
    if android.exists():
        existing = identificar(android, root)
        if existing == profile:
            return
        destination = _safe(cache / existing, root)
        if destination.exists():
            raise ValueError('Cache do perfil existente já ocupado; nenhum diretório foi movido.')
        if target.exists() and identificar(target, root) != profile:
            raise ValueError('Cache de destino não corresponde ao perfil.')
        cache.mkdir(parents=True, exist_ok=True)
        android.rename(destination)
    if target.exists():
        if identificar(target, root) != profile:
            raise ValueError('Cache de destino não corresponde ao perfil.')
        if android.exists():
            raise ValueError('Destino Android ocupado.')
        target.rename(android)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('profile', choices=PACKAGES)
    args = parser.parse_args()
    workspace = Path(__file__).resolve().parents[3]
    with build_lock(workspace):
        selecionar(workspace, workspace / 'apps/mobile', args.profile)
    print('Perfil Android selecionado:', args.profile)
