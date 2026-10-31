import importlib.util
from pathlib import Path
import unittest
import tempfile
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('build_apk_local', Path(__file__).with_name('build-apk-local.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ApiUrlTest(unittest.TestCase):
    def test_accepts_public_https(self):
        self.assertEqual(build.api_url('https://api.example.com/v1'), 'https://api.example.com/v1')

    def test_rejects_unsafe_or_local_urls(self):
        for url in ('http://example.com', 'https://localhost', 'https://127.0.0.1',
                    'https://192.168.1.1', 'https://[::1]', 'https://user:pass@example.com',
                    'https://example.com?x=1', 'https://example.com#x', 'https://printer.local'):
            with self.subTest(url=url), self.assertRaises(Exception):
                build.api_url(url)

    def test_modes_set_explicit_environment(self):
        for args, expected_flag, expected_url in [(['--offline'], '1', ''),
                                                  (['--api-url', 'https://api.example.com'], '0', 'https://api.example.com')]:
            captured = []
            with self.subTest(args=args), patch('sys.argv', ['build-apk-local.py', *args, '--prepare-only']), \
                    patch.object(build, 'check_android'), patch.object(build, 'fingerprint', return_value='hash'), \
                    patch.object(build.subprocess, 'check_output', side_effect=['commit', '']), \
                    patch.object(build, 'prebuild', side_effect=lambda env: captured.append(env)):
                build.main()
                self.assertEqual(captured[0]['EXPO_PUBLIC_FERRAMENTAS_TESTE'], expected_flag)
                self.assertEqual(captured[0]['EXPO_PUBLIC_API_URL'], expected_url)
                self.assertEqual(captured[0]['PDV_APK_HOMOLOGACAO'], '1')

    def test_missing_cmake_stops_before_prebuild(self):
        with tempfile.TemporaryDirectory() as sdk, \
                patch('sys.argv', ['build-apk-local.py', '--offline', '--java-home', sdk, '--android-home', sdk]), \
                patch.object(build, 'prebuild') as prebuild, self.assertRaises(SystemExit):
            build.main()
        prebuild.assert_not_called()


if __name__ == '__main__':
    unittest.main()
