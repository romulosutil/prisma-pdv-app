"""Chave local de release: nenhum segredo em argumentos, saída ou repositório."""
import csv
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]


def _auditar_acl(path: Path, sid: str):
    literal = str(path).replace("'", "''")
    # .NET Framework direto evita depender do autoload de módulos PowerShell do host.
    code = "$ErrorActionPreference='Stop'; $p='" + literal + "'; $acl=if([System.IO.Directory]::Exists($p)){[System.IO.DirectoryInfo]::new($p).GetAccessControl()}else{[System.IO.FileInfo]::new($p).GetAccessControl()}; 'OWNER:'+$acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value; foreach($entry in $acl.Access){if($entry.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow){$entry.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value}}"
    encoded = base64.b64encode(code.encode('utf-16le')).decode('ascii')
    result = subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('Não foi possível auditar as permissões da assinatura.')
    lines = result.stdout.strip().splitlines()
    # OWNER RIGHTS (S-1-3-4) refere-se somente ao proprietário verificado acima.
    allowed = lines[1:]
    if not lines or lines[0] != 'OWNER:' + sid or not allowed or any(entry not in {sid, 'S-1-5-18', 'S-1-3-4'} for entry in allowed):
        raise ValueError('Assinatura com permissão explícita para terceiros; preservar os arquivos e revisar a ACL.')


def _diretorio_privado(path: Path):
    path.mkdir(parents=True, exist_ok=True)
    if os.name != 'nt':
        path.chmod(0o700)
        return
    identity = subprocess.run(['whoami', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, check=True)
    sid = next((field for row in csv.reader(io.StringIO(identity.stdout)) for field in row if re.fullmatch(r'S-\d-(?:\d+-)+\d+', field)), None)
    if not sid:
        raise RuntimeError('Não foi possível identificar o usuário para proteger a assinatura.')
    permission = subprocess.run(['icacls', str(path), '/inheritance:r', '/grant:r',
                                 f'*{sid}:(OI)(CI)F', '*S-1-5-18:(OI)(CI)F', '/remove:g', '*S-1-5-32-544'], capture_output=True)
    if permission.returncode:
        raise RuntimeError('Não foi possível proteger o diretório da assinatura; geração interrompida.')
    for item in [path, *(p for p in [path / 'production.p12', path / 'credentials.json'] if p.exists())]:
        if item != path:
            permission = subprocess.run(['icacls', str(item), '/inheritance:r', '/grant:r',
                                         f'*{sid}:F', '*S-1-5-18:F', '/remove:g', '*S-1-5-32-544'], capture_output=True)
            if permission.returncode:
                raise RuntimeError('Não foi possível proteger o arquivo de assinatura.')
        _auditar_acl(item, sid)


def _keytool(java_home: Path, args: list[str], password: str) -> bytes:
    binary = java_home / 'bin' / ('keytool.exe' if os.name == 'nt' else 'keytool')
    if not binary.is_file():
        raise ValueError('keytool não encontrado no JDK informado.')
    env = dict(os.environ, PDV_RELEASE_STORE_PASSWORD=password, PDV_RELEASE_KEY_PASSWORD=password)
    result = subprocess.run([str(binary), *args], env=env, capture_output=True)
    if result.returncode:
        raise RuntimeError('keytool recusou a chave ou sua configuração; nenhum segredo foi exibido.')
    return result.stdout


def _certificado(java_home: Path, key: Path, alias: str, password: str) -> str:
    der = _keytool(java_home, ['-exportcert', '-keystore', str(key), '-alias', alias,
                              '-storepass:env', 'PDV_RELEASE_STORE_PASSWORD'], password)
    return hashlib.sha256(der).hexdigest()


def preparar_assinatura(java_home: Path, diretorio: Path | None = None, *, permitir_criacao: bool = False) -> dict[str, str]:
    candidate = (diretorio or Path.home() / '.pdv-signing' / 'prisma-pdv').absolute()
    if any(p.is_symlink() or (p.exists() and getattr(p, 'is_junction', lambda: False)()) for p in [candidate, *candidate.parents]):
        raise ValueError('O diretório da assinatura não pode conter links ou junctions.')
    directory = candidate.resolve()
    if directory.is_relative_to(ROOT):
        raise ValueError('A assinatura definitiva deve ficar fora do repositório e sem links.')
    key = directory / 'production.p12'
    credentials = directory / 'credentials.json'
    if key.exists() != credentials.exists():
        raise ValueError('Assinatura incompleta. Preservar os arquivos existentes e recuperar o backup; nada foi sobrescrito.')
    if key.is_symlink() or credentials.is_symlink():
        raise ValueError('Arquivos de assinatura não podem ser links.')
    if not key.exists() and not permitir_criacao:
        raise ValueError('Chave de produção ausente. Restaurar production.p12 e credentials.json do backup privado; não gerar outra chave.')
    _diretorio_privado(directory)
    if key.exists():
        saved = json.loads(credentials.read_text(encoding='utf-8'))
        if (not isinstance(saved, dict) or saved.get('keyStoreFile') != key.name or saved.get('alias') != 'pdv-release'
                or not isinstance(saved.get('password'), str) or len(saved['password']) < 32
                or not re.fullmatch(r'[a-f0-9]{64}', str(saved.get('certificateSha256', '')))):
            raise ValueError('Metadados da assinatura inválidos; não gerar outra chave.')
        actual = _certificado(java_home, key, saved['alias'], saved['password'])
        if not secrets.compare_digest(actual, saved['certificateSha256']):
            raise ValueError('Certificado difere do registro local; preservar e revisar a assinatura.')
    else:
        lock = directory / 'creation.lock'
        try:
            descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            raise ValueError('Outra geração de assinatura está em andamento; nenhum arquivo foi substituído.') from None
        try:
            os.close(descriptor)
            if key.exists() or credentials.exists():
                raise ValueError('A assinatura mudou durante a preparação; operação interrompida.')
            password = secrets.token_urlsafe(48)
            _keytool(java_home, ['-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', str(key),
                                '-alias', 'pdv-release', '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000',
                                '-dname', 'CN=PDV Release, O=Prisma PDV, C=BR',
                                '-storepass:env', 'PDV_RELEASE_STORE_PASSWORD',
                                '-keypass:env', 'PDV_RELEASE_KEY_PASSWORD'], password)
            saved = {'keyStoreFile': key.name, 'alias': 'pdv-release', 'password': password,
                     'certificateSha256': _certificado(java_home, key, 'pdv-release', password),
                     'createdAt': datetime.now(timezone.utc).isoformat()}
            # Arquivo exclusivo: jamais substituir uma senha anterior.
            with credentials.open('x', encoding='utf-8') as output:
                json.dump(saved, output, indent=2)
                output.write('\n')
            if os.name != 'nt':
                key.chmod(0o600)
                credentials.chmod(0o600)
        finally:
            lock.unlink(missing_ok=True)  # Somente o arquivo individual criado por esta operação.
    return {'PDV_RELEASE_STORE_FILE': str(key), 'PDV_RELEASE_STORE_PASSWORD': saved['password'],
            'PDV_RELEASE_KEY_ALIAS': saved['alias'], 'PDV_RELEASE_KEY_PASSWORD': saved['password'],
            'PDV_RELEASE_CERT_SHA256': saved['certificateSha256']}
