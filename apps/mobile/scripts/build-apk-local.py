#!/usr/bin/env python3
"""Build the isolated Android test APK without installing dependencies."""
import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlsplit

MOBILE = Path(__file__).resolve().parents[1]
ROOT = MOBILE.parents[1]
PACKAGE = 'br.com.pdv.homologacao'


def api_url(value):
    try:
        url = urlsplit(value)
        host = url.hostname
        port = url.port
        if (url.scheme != 'https' or not host or url.username is not None or
                url.password is not None or url.query or url.fragment or
                '?' in value or '#' in value or any(c.isspace() for c in value)):
            raise ValueError()
        if host.lower() == 'localhost' or host.lower().endswith(('.localhost', '.local')):
            raise ValueError()
        try:
            if not ipaddress.ip_address(host).is_global:
                raise ValueError()
        except ValueError:
            if re.fullmatch(r'[0-9.]+', host) or ':' in host:
                raise
            if '.' not in host or not re.fullmatch(r'[a-zA-Z0-9.-]+', host):
                raise ValueError()
        return value
    except ValueError:
        raise argparse.ArgumentTypeError('Use uma URL HTTPS pública sem credenciais, query ou fragmento.')


def fingerprint(directory):
    digest = hashlib.sha256()
    excluded = {'node_modules', 'android', 'ios', '.expo', 'builds', 'coverage', 'dist', '.git'}
    extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.mjs', '.cjs', '.py', '.png', '.jpg', '.jpeg', '.svg', '.ttf', '.otf'}
    paths = []
    for base, dirs, files in os.walk(directory):
        dirs[:] = sorted(d for d in dirs if d not in excluded and not d.startswith('.env'))
        paths.extend(Path(base) / name for name in files)
    for path in sorted(paths):
        rel = path.relative_to(directory)
        if (not path.is_file() or path.is_symlink() or any(part in excluded or part.startswith('.env') for part in rel.parts)
                or path.suffix.lower() not in extensions):
            continue
        digest.update(rel.as_posix().encode() + b'\0')
        digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def check_android():
    android = MOBILE / 'android'
    if not android.exists():
        return
    gradle = android / 'app' / 'build.gradle'
    if not gradle.is_file():
        raise ValueError('Projeto Android existente não reconhecido; nenhum arquivo foi apagado.')
    content = gradle.read_text(encoding='utf-8')
    ids = re.findall(r'\bapplicationId\s+["\']([^"\']+)["\']', content)
    if ids != [PACKAGE]:
        raise ValueError('Projeto Android existente não tem a identidade isolada; nenhum arquivo foi apagado.')


def run(command, env):
    print('Executando:', subprocess.list2cmdline([str(x) for x in command]), flush=True)
    subprocess.run([str(x) for x in command], cwd=MOBILE, env=env, check=True)


def prebuild(env):
    package = MOBILE / 'package.json'
    before = package.read_bytes().decode('utf-8')
    expo_package = subprocess.check_output(['node', '-p', "require.resolve('expo/package.json')"], cwd=MOBILE, text=True).strip()
    cli = Path(expo_package).parent / 'bin' / 'cli'
    try:
        run(['node', cli, 'prebuild', '--platform', 'android', '--no-install', '--no-clean', '--skip-dependency-update', 'expo,react-native,react,react-dom'], env)
    finally:
        after = package.read_bytes().decode('utf-8')
        # Expo changes only these known script values on this project. Preserve
        # unrelated concurrent edits, and never overwrite the entire manifest.
        for name in ('android', 'ios'):
            old = json.loads(before).get('scripts', {}).get(name)
            new = json.loads(after).get('scripts', {}).get(name)
            if old in (f'expo start --{name}', f'react-native run-{name}') and new == f'expo run:{name}':
                pattern = r'("' + name + r'"\s*:\s*)"expo run:' + name + r'"'
                after = re.sub(pattern, lambda m: m.group(1) + json.dumps(old), after, count=1)
        if json.loads(after) == json.loads(before):
            package.write_bytes(before.encode('utf-8'))
        else:
            package.write_bytes(after.encode('utf-8'))
            print('Aviso: package.json contém outras alterações; confira antes de continuar.', file=sys.stderr)
            raise RuntimeError('Alteração inesperada em package.json durante prebuild.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--offline', action='store_true')
    mode.add_argument('--api-url', type=api_url)
    parser.add_argument('--java-home', default=os.environ.get('JAVA_HOME'))
    parser.add_argument('--android-home', default=os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT'))
    parser.add_argument('--cmake-version', default='3.31.6')
    parser.add_argument('--prepare-only', action='store_true')
    args = parser.parse_args()
    env = os.environ.copy()
    env.update(CI='1', EXPO_NO_TELEMETRY='1', EXPO_NO_DOTENV='1', NODE_ENV='production',
               EXPO_PUBLIC_FERRAMENTAS_TESTE='1' if args.offline else '0',
               EXPO_PUBLIC_API_URL='' if args.offline else args.api_url, PDV_APK_HOMOLOGACAO='1')
    version_code = env.get('PDV_APK_VERSION_CODE', '5')
    if not re.fullmatch(r'[0-9]+', version_code) or not 5 <= int(version_code) <= 2100000000:
        parser.error('PDV_APK_VERSION_CODE deve ser decimal entre 5 e 2100000000.')
    if not args.prepare_only:
        for label, value in [('JAVA_HOME', args.java_home), ('ANDROID_HOME', args.android_home)]:
            if not value or not Path(value).is_dir():
                parser.error(f'{label} deve apontar para um diretório existente.')
        env.update(JAVA_HOME=str(Path(args.java_home).resolve()), ANDROID_HOME=str(Path(args.android_home).resolve()), ANDROID_SDK_ROOT=str(Path(args.android_home).resolve()))
        if not re.fullmatch(r'[0-9]+(?:\.[0-9]+)+', args.cmake_version):
            parser.error('--cmake-version deve conter somente números separados por pontos.')
        cmake = Path(env['ANDROID_HOME']) / 'cmake' / args.cmake_version / 'bin' / ('cmake.exe' if os.name == 'nt' else 'cmake')
        if not cmake.is_file():
            parser.error(f'CMake {args.cmake_version} não encontrado no SDK Android.')
        env['PATH'] = str(Path(env['JAVA_HOME']) / 'bin') + os.pathsep + env.get('PATH', '')
    check_android()
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
    fingerprints = {'mobile': fingerprint(MOBILE), 'shared': fingerprint(ROOT / 'packages' / 'shared')}
    prebuild(env)
    check_android()
    if args.prepare_only:
        print('Projeto Android preparado; build não executado.')
        return
    gradle = MOBILE / 'android' / 'app' / 'build.gradle'
    content = gradle.read_text(encoding='utf-8')
    if not re.search(r'release\s*\{[^}]*signingConfig\s+signingConfigs\.debug', content, re.S):
        raise ValueError('A assinatura de teste do template não foi confirmada no build release.')
    wrapper = MOBILE / 'android' / ('gradlew.bat' if os.name == 'nt' else 'gradlew')
    run([wrapper, '-p', MOBILE / 'android', 'assembleRelease', '--no-daemon', '--max-workers=1',
         '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m', '-Dorg.gradle.parallel=false',
         f'-Pandroid.cmakeVersion={args.cmake_version}', '-Pexpo.android.cmakeObjectPathMax=2048',
         '-Pkotlin.compiler.execution.strategy=in-process', '-PreactNativeArchitectures=arm64-v8a'], env)
    if fingerprints != {'mobile': fingerprint(MOBILE), 'shared': fingerprint(ROOT / 'packages' / 'shared')}:
        raise RuntimeError('Arquivos de origem mudaram durante o build; APK não entregue.')
    source = MOBILE / 'android' / 'app' / 'build' / 'outputs' / 'apk' / 'release' / 'app-release.apk'
    destination = ROOT / 'builds' / f'pdv-teste-{version_code}.apk'
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    metadata = {'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'package': PACKAGE,
                'version': '0.1.4', 'versionCode': int(version_code), 'mode': 'offline' if args.offline else 'conectado',
                'apiUrl': '' if args.offline else args.api_url, 'commit': commit, 'dirty': dirty,
                'sourceFingerprintsSha256': fingerprints, 'architecture': 'arm64-v8a'}
    destination.with_suffix('.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'APK arm64-v8a: {destination}\nSHA256: {metadata["sha256"]}')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, subprocess.CalledProcessError, OSError) as error:
        print(f'Erro: {error}', file=sys.stderr)
        sys.exit(1)
