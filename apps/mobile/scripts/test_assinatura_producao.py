import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('assinatura_producao', Path(__file__).with_name('assinatura_producao.py'))
signing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signing)


class AssinaturaTest(unittest.TestCase):
    def test_acl_recusa_terceiros_e_proprietario_divergente(self):
        sid = 'S-1-5-21-1000'
        for metadata in [f'OWNER:{sid}\n{sid}\nS-1-1-0\n', f'OWNER:S-1-5-21-2000\nS-1-3-4\n']:
            with patch.object(signing.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=metadata)), self.assertRaisesRegex(ValueError, 'permissão'):
                signing._auditar_acl(Path('metadados-nao-lidos'), sid)

    def test_acl_owner_rights_corresponde_ao_proprietario_atual(self):
        sid = 'S-1-5-21-1000'
        metadata = f'OWNER:{sid}\n{sid}\nS-1-3-4\nS-1-5-18\n'
        with patch.object(signing.subprocess, 'run', return_value=SimpleNamespace(returncode=0, stdout=metadata)):
            signing._auditar_acl(Path('metadados-nao-lidos'), sid)

    def test_reusa_mesma_chave_sem_expor_senha_em_argumentos(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp) / 'assinatura'
            calls = []

            def keytool(java, args, password):
                calls.append(args)
                self.assertNotIn(password, args)
                self.assertIn('-storepass:env', args)
                if '-genkeypair' in args:
                    Path(args[args.index('-keystore') + 1]).write_bytes(b'keystore-cifrado-fixture')
                return b'certificado-der-fixture'

            with patch.object(signing, '_keytool', side_effect=keytool):
                first = signing.preparar_assinatura(Path(temp), directory, permitir_criacao=True)
                key_before = (directory / 'production.p12').read_bytes()
                credentials_before = (directory / 'credentials.json').read_bytes()
                second = signing.preparar_assinatura(Path(temp), directory)
            self.assertEqual(first, second)
            self.assertEqual(first['PDV_RELEASE_CERT_SHA256'], hashlib.sha256(b'certificado-der-fixture').hexdigest())
            self.assertEqual((directory / 'production.p12').read_bytes(), key_before)
            self.assertEqual((directory / 'credentials.json').read_bytes(), credentials_before)
            self.assertEqual(sum('-genkeypair' in c for c in calls), 1)

    def test_estado_parcial_nao_sobrescreve_chave(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            key = directory / 'production.p12'
            key.write_bytes(b'preservar')
            with self.assertRaisesRegex(ValueError, 'incompleta'), patch.object(signing, '_keytool') as tool:
                signing.preparar_assinatura(directory, directory)
            self.assertEqual(key.read_bytes(), b'preservar')
            tool.assert_not_called()

    def test_maquina_sem_backup_nao_gera_outra_chave_automaticamente(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(signing, '_keytool') as tool:
            directory = Path(temp) / 'nao-criada'
            with self.assertRaisesRegex(ValueError, 'Restaurar'):
                signing.preparar_assinatura(Path(temp), directory)
            self.assertFalse(directory.exists())
            tool.assert_not_called()

    def test_recusa_repositorio_antes_de_gravar(self):
        with self.assertRaisesRegex(ValueError, 'fora do repositório'), patch.object(signing, '_diretorio_privado') as create:
            signing.preparar_assinatura(Path('.'), signing.ROOT / 'builds/assinatura-invalida')
        create.assert_not_called()

    def test_certificado_divergente_recusa_sem_gerar_outra_chave(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            (directory / 'production.p12').write_bytes(b'preservar')
            saved = {'keyStoreFile': 'production.p12', 'alias': 'pdv-release', 'password': 'a' * 48,
                     'certificateSha256': '0' * 64}
            path = directory / 'credentials.json'
            path.write_text(json.dumps(saved), encoding='utf-8')
            before = path.read_bytes()
            with patch.object(signing, '_certificado', return_value='1' * 64), self.assertRaisesRegex(ValueError, 'difere'):
                signing.preparar_assinatura(directory, directory)
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual((directory / 'production.p12').read_bytes(), b'preservar')


if __name__ == '__main__':
    unittest.main()
