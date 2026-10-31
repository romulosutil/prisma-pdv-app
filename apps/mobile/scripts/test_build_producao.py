import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('build_producao', HERE / 'build-producao.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class ProductionRunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.release = self.root / 'release.json'
        self.release.write_text(json.dumps({'version': '1.0.0', 'versionCode': 7, 'apiUrl': runner.API}), encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def native(self, path, package):
        (path / 'app').mkdir(parents=True)
        (path / 'app' / 'build.gradle').write_text(f'android {{ defaultConfig {{ applicationId "{package}" }} }}', encoding='utf-8')

    def test_bump_and_default_read(self):
        before, config = runner.read_release(self.release)
        self.assertEqual(config['version'], '1.0.0')
        self.assertEqual(self.release.read_bytes(), before)
        self.assertEqual(runner.bump_release(self.release, 'minor')['version'], '1.1.0')
        self.assertEqual(runner.bump_release(self.release, 'patch')['versionCode'], 9)
        self.assertEqual(runner.bump_release(self.release, 'major')['version'], '2.0.0')

    def test_invalid_version_and_concurrent_lock(self):
        self.release.write_text(json.dumps({'version': '0.9.0', 'versionCode': 7, 'apiUrl': runner.API}))
        with self.assertRaises(ValueError):
            runner.read_release(self.release)
        with runner.lock(self.root / 'lock'):
            with self.assertRaises(RuntimeError):
                with runner.lock(self.root / 'lock'):
                    pass

    def test_api_divergente_ou_http_impede_incremento_sem_mudar_release(self):
        for url in ('https://outra-api.example.com', 'http://aladdin-pdv-api.jicnzg.easypanel.host'):
            self.release.write_text(json.dumps({'version': '1.0.0', 'versionCode': 7, 'apiUrl': url}), encoding='utf-8')
            before = self.release.read_bytes()
            with self.subTest(url=url), self.assertRaisesRegex(ValueError, 'API'):
                runner.bump_release(self.release, 'patch')
            self.assertEqual(self.release.read_bytes(), before)

    def test_bump_refuses_occupied_lock_without_modifying_release(self):
        original = self.release.read_bytes()
        with runner.lock(self.root / '.release-version.lock'):
            with self.assertRaises(RuntimeError):
                runner.bump_release(self.release, 'patch')
            self.assertEqual(self.release.read_bytes(), original)
        result = runner.bump_release(self.release, 'patch')
        self.assertEqual(result['apiUrl'], runner.API)
        self.assertEqual(result['versionCode'], 8)

    def test_invalid_schema_does_not_write(self):
        self.release.write_text(json.dumps({'version': '1.0.0', 'versionCode': 7, 'apiUrl': 'https://example.com', 'extra': True}))
        original = self.release.read_bytes()
        with self.assertRaises(ValueError):
            runner.bump_release(self.release, 'patch')
        self.assertEqual(self.release.read_bytes(), original)

    def test_native_switch_and_refusal(self):
        mobile = self.root / 'apps' / 'mobile'
        android = mobile / 'android'
        self.native(android, 'br.com.pdv.homologacao')
        runner.perfil_nativo.selecionar(self.root, mobile)
        self.assertFalse(android.exists())
        self.assertTrue((self.root / 'builds' / 'native-cache' / 'homologacao').is_dir())
        self.native(android, 'com.example.unknown')
        with self.assertRaises(ValueError):
            runner.perfil_nativo.selecionar(self.root, mobile)
        self.assertTrue(android.exists())

    def test_trava_compartilhada_impede_outro_build_android(self):
        with runner.perfil_nativo.build_lock(self.root):
            with self.assertRaisesRegex(RuntimeError, 'Outro build Android'):
                with runner.perfil_nativo.build_lock(self.root):
                    self.fail('Não pode adquirir duas vezes a pasta Android compartilhada.')
        self.assertFalse((self.root / 'builds/.android-build.lock').exists())

    def test_signing_patch_idempotent_and_no_fallback(self):
        original = 'android { buildTypes { release { signingConfig signingConfigs.debug } } }'
        result = runner.signing_patch(original)
        self.assertEqual(result, runner.signing_patch(result))
        self.assertIn('buildTypes.release.signingConfig signingConfigs.pdvRelease', result)
        self.assertIn("System.getenv('PDV_RELEASE_STORE_PASSWORD')", result)
        self.assertEqual(result.count(runner.BEGIN), 1)
        with self.assertRaises(ValueError):
            runner.signing_patch(runner.BEGIN)

    def test_certificado_diferente_do_registro_publico_e_recusado(self):
        public = self.root / 'signing-public.json'
        public.write_text(json.dumps({'package': runner.PACKAGE, 'alias': 'pdv-release', 'certificateSha256': 'a' * 64}), encoding='utf-8')
        runner.verificar_certificado_publico(public, 'a' * 64)
        with self.assertRaisesRegex(ValueError, 'certificado público'):
            runner.verificar_certificado_publico(public, 'b' * 64)


if __name__ == '__main__':
    unittest.main()
