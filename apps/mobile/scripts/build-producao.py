#!/usr/bin/env python3
"""Prepara e verifica um APK local de produção, sem publicar."""
import argparse
from contextlib import contextmanager
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

import perfil_nativo

MOBILE = Path(__file__).resolve().parents[1]
ROOT = MOBILE.parents[1]
RELEASE = MOBILE / 'release.json'
API = 'https://aladdin-pdv-api.jicnzg.easypanel.host'
PACKAGE = 'br.com.pdv.mobile'
BEGIN = '// BEGIN PDV PRODUCTION SIGNING'
END = '// END PDV PRODUCTION SIGNING'
spec = importlib.util.spec_from_file_location('build_apk_local', MOBILE / 'scripts' / 'build-apk-local.py')
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


@contextmanager
def lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise RuntimeError(f'Operação concorrente ou lock pendente: {path}')
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        path.unlink()


def read_release(path):
    raw = path.read_bytes()
    config = json.loads(raw)
    if not isinstance(config, dict) or set(config) != {'version', 'versionCode', 'apiUrl'}:
        raise ValueError('release.json deve conter exatamente version, versionCode e apiUrl.')
    version = config['version']
    if not isinstance(version, str) or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', version):
        raise ValueError('Versão inválida.')
    if type(config['versionCode']) is not int or not 7 <= config['versionCode'] <= 2100000000:
        raise ValueError('versionCode inválido.')
    if tuple(map(int, version.split('.'))) < (1, 0, 0):
        raise ValueError('Versão anterior à primeira versão de produção.')
    if config['apiUrl'] != API or local.api_url(config['apiUrl']) != API:
        raise ValueError('API de produção inválida ou divergente.')
    return raw, config


def bump_release(path, kind):
    with lock(path.parent / '.release-version.lock'):
        raw, config = read_release(path)
        parts = list(map(int, config['version'].split('.')))
        index = {'major': 0, 'minor': 1, 'patch': 2}[kind]
        parts[index] += 1
        parts[index + 1:] = [0] * (2 - index)
        config['version'] = '.'.join(map(str, parts))
        config['versionCode'] += 1
        if config['versionCode'] > 2100000000:
            raise ValueError('versionCode excede o limite Android.')
        data = (json.dumps(config, ensure_ascii=False, indent=2) + '\n').encode()
        fd, name = tempfile.mkstemp(prefix='.release-', suffix='.tmp', dir=path.parent)
        try:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            if path.read_bytes() != raw:
                raise RuntimeError('release.json alterado concorrentemente.')
            os.replace(name, path)
        finally:
            if os.path.exists(name):
                os.unlink(name)
        return config


def signing_patch(text):
    if text.count(BEGIN) != text.count(END) or text.count(BEGIN) > 1:
        raise ValueError('Bloco próprio de assinatura inválido.')
    if BEGIN in text:
        start, finish = text.index(BEGIN), text.index(END) + len(END)
        if finish <= start:
            raise ValueError('Bloco próprio de assinatura inválido.')
        text = text[:start] + text[finish:]
    block = """// BEGIN PDV PRODUCTION SIGNING
android {
    signingConfigs {
        create('pdvRelease') {
            storeFile file(System.getenv('PDV_RELEASE_STORE_FILE'))
            storePassword System.getenv('PDV_RELEASE_STORE_PASSWORD')
            keyAlias System.getenv('PDV_RELEASE_KEY_ALIAS')
            keyPassword System.getenv('PDV_RELEASE_KEY_PASSWORD')
        }
    }
    buildTypes.release.signingConfig signingConfigs.pdvRelease
}
// END PDV PRODUCTION SIGNING"""
    return text.rstrip() + '\n\n' + block + '\n'


def verificar_certificado_publico(path, cert):
    public = json.loads(path.read_text(encoding='utf-8'))
    if (not isinstance(public, dict) or set(public) != {'package', 'alias', 'certificateSha256'}
            or public['package'] != PACKAGE or public['alias'] != 'pdv-release'
            or public['certificateSha256'] != cert):
        raise ValueError('A chave local não corresponde ao certificado público definitivo. Restaurar a chave correta.')


def toolchain(java_arg, android_arg):
    base = Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local') / 'pdv-build'
    jdkroot = base / 'jdk'
    candidates = [jdkroot] + (list(jdkroot.iterdir()) if jdkroot.is_dir() else [])
    valid = [p for p in candidates if (p / 'bin' / ('java.exe' if os.name == 'nt' else 'java')).is_file()]
    java = Path(java_arg) if java_arg else (max(valid, key=lambda p: tuple(int(x) for x in re.findall(r'\d+', p.name)) or (0,)) if valid else jdkroot)
    android = Path(android_arg) if android_arg else base / 'android-sdk'
    java, android = java.resolve(), android.resolve()
    exe = '.exe' if os.name == 'nt' else ''
    if not (java / 'bin' / ('java' + exe)).is_file() or not (java / 'bin' / ('keytool' + exe)).is_file():
        raise ValueError('JDK inválido ou incompleto.')
    if not (android / 'cmake' / '3.31.6' / 'bin' / ('cmake' + exe)).is_file():
        raise ValueError('CMake 3.31.6 não encontrado no SDK.')
    versions = sorted((android / 'build-tools').iterdir(), key=lambda p: tuple(int(x) for x in re.findall(r'\d+', p.name)), reverse=True) if (android / 'build-tools').is_dir() else []
    suffix = '.bat' if os.name == 'nt' else ''
    tools = next(((v / (('aapt2' if (v / ('aapt2' + exe)).is_file() else 'aapt') + exe), v / ('apksigner' + suffix)) for v in versions if ((v / ('aapt2' + exe)).is_file() or (v / ('aapt' + exe)).is_file()) and (v / ('apksigner' + suffix)).is_file()), None)
    if not tools:
        raise ValueError('aapt e apksigner não encontrados no SDK.')
    return java, android, tools


def inspect_apk(apk, config, tools, cert, env):
    aapt, signer = tools
    def output(command):
        return subprocess.check_output([str(x) for x in command], cwd=MOBILE, env=env, text=True, stderr=subprocess.STDOUT)
    signed = output([signer, 'verify', '--verbose', '--print-certs', apk])
    matches = re.findall(r'certificate SHA-256 digest:\s*([0-9a-fA-F:]+)', signed, re.I)
    certificates = {value.replace(':', '').lower() for value in matches}
    count = re.search(r'Number of signers:\s*(\d+)', signed, re.I)
    if certificates != {cert.replace(':', '').lower()} or (count and int(count.group(1)) != 1) or re.search(r'Signer #(?:[2-9]|\d{2,})\b', signed, re.I):
        raise ValueError('Certificado do APK não corresponde à chave de produção.')
    badging = output([aapt, 'dump', 'badging', apk])
    expected = f"package: name='{PACKAGE}' versionCode='{config['versionCode']}' versionName='{config['version']}'"
    if expected not in badging or not re.search(r"(?:minSdkVersion|sdkVersion):'24'", badging) or 'application-debuggable' in badging:
        raise ValueError('Identidade, versão, minSdk ou debuggable divergente no APK.')
    with zipfile.ZipFile(apk) as archive:
        names = archive.namelist()
        if 'assets/index.android.bundle' not in names:
            raise ValueError('Bundle JS ausente no APK.')
        bundle = archive.read('assets/index.android.bundle')
        if config['apiUrl'].encode() not in bundle:
            raise ValueError('API não verificável no bundle JS.')
        forbidden = re.compile(r'(^|/)(?:\.env(?:\.[^/]*)?|[^/]+\.(?:p12|jks|keystore)|credentials\.json)$', re.I)
        if any(forbidden.search(name) for name in names):
            raise ValueError('APK contém arquivo de credenciais proibido.')
        secrets = [env.get(name, '').encode() for name in ('PDV_RELEASE_STORE_PASSWORD', 'PDV_RELEASE_KEY_PASSWORD')]
        for name in names:
            if name.startswith('assets/') and not name.endswith('/'):
                data = archive.read(name)
                if any(secret and secret in data for secret in secrets):
                    raise ValueError('APK contém segredo de assinatura em assets.')
        expected_build = {'profile': 'production', 'apiUrl': config['apiUrl'], 'toolsEnabled': False, 'versionCode': config['versionCode']}
        verified = False
        for name in names:
            if not (name.startswith('assets/') and name.endswith('app.config') and archive.getinfo(name).file_size < 10_000_000):
                continue
            try:
                embedded = json.loads(archive.read(name))
            except (ValueError, UnicodeDecodeError):
                continue
            if isinstance(embedded, dict):
                embedded = embedded.get('expo', embedded)
                extra = embedded.get('extra', {}) if isinstance(embedded, dict) else {}
                if isinstance(extra, dict) and extra.get('pdvBuild') == expected_build:
                    verified = True
        if not verified:
            raise ValueError('Configuração pública de produção não verificável no app.config do APK.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bump', choices=['patch', 'minor', 'major'])
    parser.add_argument('--version-only', action='store_true')
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--java-home', default=os.environ.get('JAVA_HOME'))
    parser.add_argument('--android-home', default=os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT'))
    args = parser.parse_args()
    if args.version_only and (not args.bump or args.prepare_only):
        parser.error('--version-only requer --bump e não pode combinar com --prepare-only.')
    with perfil_nativo.build_lock(ROOT):
        config = bump_release(RELEASE, args.bump) if args.bump else read_release(RELEASE)[1]
        if args.version_only:
            print(f"Versão atualizada: {config['version']} ({config['versionCode']}).")
            return
        java, android, build_tools = toolchain(args.java_home, args.android_home)
        env = os.environ.copy()
        env.pop('PDV_APK_HOMOLOGACAO', None)
        for key in list(env):
            if key.startswith('PDV_RELEASE_'):
                env.pop(key)
        env.update(CI='1', NO_TELEMETRY='1', EXPO_NO_TELEMETRY='1', EXPO_NO_DOTENV='1', NODE_ENV='production', PDV_BUILD_PROFILE='production', EXPO_PUBLIC_FERRAMENTAS_TESTE='0', EXPO_PUBLIC_API_URL=config['apiUrl'], JAVA_HOME=str(java), ANDROID_HOME=str(android), ANDROID_SDK_ROOT=str(android))
        env['PATH'] = str(java / 'bin') + os.pathsep + env.get('PATH', '')
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())
        fingerprints = {'mobile': local.fingerprint(MOBILE), 'shared': local.fingerprint(ROOT / 'packages' / 'shared')}
        lockfile = ROOT / 'package-lock.json'
        lockhash = hashlib.sha256(lockfile.read_bytes()).hexdigest()
        release_raw = RELEASE.read_bytes()
        perfil_nativo.selecionar(ROOT, MOBILE)
        local.prebuild(env)
        if perfil_nativo.identificar(MOBILE / 'android', ROOT) != 'production':
            raise ValueError('Prebuild não gerou identidade production.')
        if args.prepare_only:
            print('Projeto Android preparado; nenhum APK gerado ou validado.')
            return
        import assinatura_producao
        signing = assinatura_producao.preparar_assinatura(java)
        required = {'PDV_RELEASE_STORE_FILE', 'PDV_RELEASE_STORE_PASSWORD', 'PDV_RELEASE_KEY_ALIAS', 'PDV_RELEASE_KEY_PASSWORD', 'PDV_RELEASE_CERT_SHA256'}
        if set(signing) != required or not Path(signing['PDV_RELEASE_STORE_FILE']).is_absolute() or signing['PDV_RELEASE_KEY_ALIAS'] != 'pdv-release' or not re.fullmatch(r'[0-9a-fA-F:]{64,95}', signing['PDV_RELEASE_CERT_SHA256']) or any(not signing[k] for k in required):
            raise ValueError('Configuração da assinatura inválida.')
        cert = signing.pop('PDV_RELEASE_CERT_SHA256')
        verificar_certificado_publico(MOBILE / 'signing-public.json', cert)
        env.update(signing)
        gradle = MOBILE / 'android' / 'app' / 'build.gradle'
        gradle.write_text(signing_patch(gradle.read_text(encoding='utf-8')), encoding='utf-8')
        wrapper = MOBILE / 'android' / ('gradlew.bat' if os.name == 'nt' else 'gradlew')
        local.run([wrapper, '-p', MOBILE / 'android', ':app:createBundleReleaseJsAndAssets', '--rerun', ':app:assembleRelease', '--no-daemon', '--max-workers=1', '-Dorg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m', '-Dorg.gradle.parallel=false', '-Pandroid.cmakeVersion=3.31.6', '-Pexpo.android.cmakeObjectPathMax=2048', '-Pkotlin.compiler.execution.strategy=in-process', '-PreactNativeArchitectures=arm64-v8a'], env)
        apk = MOBILE / 'android' / 'app' / 'build' / 'outputs' / 'apk' / 'release' / 'app-release.apk'
        inspect_apk(apk, config, build_tools, cert, env)
        if fingerprints != {'mobile': local.fingerprint(MOBILE), 'shared': local.fingerprint(ROOT / 'packages' / 'shared')} or lockhash != hashlib.sha256(lockfile.read_bytes()).hexdigest() or release_raw != RELEASE.read_bytes():
            raise RuntimeError('Fontes, lockfile ou release mudaram durante o build; APK não entregue.')
        destination = ROOT / 'builds' / f"pdv-{config['version']}-{config['versionCode']}.apk"
        metadata = {'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(), 'package': PACKAGE, 'version': config['version'], 'versionCode': config['versionCode'], 'apiUrl': config['apiUrl'], 'certificateSha256': cert, 'commit': commit, 'dirty': dirty, 'sourceFingerprintsSha256': fingerprints, 'lockfileSha256': lockhash, 'architecture': 'arm64-v8a'}
        # A reconstrução da mesma versão substitui somente os artefatos finais,
        # depois da inspeção completa, usando arquivos temporários no mesmo volume.
        staged = []
        try:
            for target, data in ((destination, None), (destination.with_suffix('.json'), (json.dumps(metadata, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))):
                fd, name = tempfile.mkstemp(prefix='.pdv-release-', dir=destination.parent)
                staged.append(name)
                with os.fdopen(fd, 'wb') as output:
                    if data is None:
                        with apk.open('rb') as source:
                            shutil.copyfileobj(source, output)
                    else:
                        output.write(data)
                    output.flush()
                    os.fsync(output.fileno())
            os.replace(staged[0], destination)
            os.replace(staged[1], destination.with_suffix('.json'))
        finally:
            for name in staged:
                if os.path.exists(name):
                    os.unlink(name)
        print(f"APK verificado: {destination}\nSHA256: {metadata['sha256']}")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f'Erro: {error}', file=sys.stderr)
        sys.exit(1)
