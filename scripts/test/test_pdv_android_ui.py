"""Testes offline (sem aparelho, sem adb) do driver scripts/pdv-android-ui.py e dos fluxos versionados.

Executar: python -m unittest discover -s scripts/test -p "test_*.py"
"""
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
FLUXOS = SCRIPTS / 'fluxos'
spec = importlib.util.spec_from_file_location('pdv_android_ui', SCRIPTS / 'pdv-android-ui.py')
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)

NORMAL = {'airplane': False, 'wifi': True, 'dados': True}


class AirplaneTest(unittest.TestCase):
    def test_parse_estado(self):
        self.assertEqual(d.parse_estado_rede('0\n', '1\n', '1\n'), NORMAL)
        self.assertEqual(d.parse_estado_rede('1', '0', 'null'), {'airplane': True, 'wifi': False, 'dados': False})

    def test_on_desliga_aviao_wifi_e_dados(self):
        self.assertEqual(d.planejar_airplane('on', NORMAL), [
            ['cmd', 'connectivity', 'airplane-mode', 'enable'], ['svc', 'wifi', 'disable'], ['svc', 'data', 'disable']])

    def test_off_restaura_tudo_ligado(self):
        self.assertEqual(d.planejar_airplane('off', NORMAL), [
            ['cmd', 'connectivity', 'airplane-mode', 'disable'], ['svc', 'wifi', 'enable'], ['svc', 'data', 'enable']])

    def test_off_nao_liga_wifi_que_estava_desligado(self):
        cmds = d.planejar_airplane('off', {'airplane': False, 'wifi': False, 'dados': True})
        self.assertNotIn(['svc', 'wifi', 'enable'], cmds)
        self.assertIn(['svc', 'data', 'enable'], cmds)

    def test_off_nao_liga_dados_que_estavam_desligados(self):
        cmds = d.planejar_airplane('off', {'airplane': False, 'wifi': True, 'dados': False})
        self.assertIn(['svc', 'wifi', 'enable'], cmds)
        self.assertNotIn(['svc', 'data', 'enable'], cmds)

    def test_off_mantem_aviao_se_ja_estava_ligado(self):
        cmds = d.planejar_airplane('off', {'airplane': True, 'wifi': False, 'dados': False})
        self.assertEqual(cmds, [])

    def test_off_sem_original_so_desliga_aviao(self):
        self.assertEqual(d.planejar_airplane('off', None), [['cmd', 'connectivity', 'airplane-mode', 'disable']])

    def test_acao_invalida(self):
        with self.assertRaises(ValueError):
            d.planejar_airplane('talvez', NORMAL)

    def test_original_nao_e_sobrescrito_por_estado_ja_alterado(self):
        alterado = {'airplane': True, 'wifi': False, 'dados': False}
        self.assertEqual(d.escolher_original(NORMAL, alterado), NORMAL)

    def test_estado_salvo_obsoleto_e_ignorado(self):
        self.assertEqual(d.escolher_original({'airplane': False, 'wifi': False, 'dados': True}, NORMAL), NORMAL)

    def test_sem_salvo_vale_o_lido(self):
        self.assertEqual(d.escolher_original(None, {'airplane': False, 'wifi': False, 'dados': True}),
                         {'airplane': False, 'wifi': False, 'dados': True})

    def test_online_esperado_apos_off(self):
        self.assertTrue(d.esperado_online_apos_off(NORMAL))
        self.assertTrue(d.esperado_online_apos_off({'airplane': False, 'wifi': False, 'dados': True}))
        self.assertFalse(d.esperado_online_apos_off({'airplane': False, 'wifi': False, 'dados': False}))
        self.assertFalse(d.esperado_online_apos_off({'airplane': True, 'wifi': True, 'dados': True}))
        self.assertIsNone(d.esperado_online_apos_off(None))

    def test_dumpsys_e_offline(self):
        self.assertTrue(d.rede_ativa_no_dumpsys('Active default network: 100\n'))
        self.assertFalse(d.rede_ativa_no_dumpsys('Active default network: none\n'))
        self.assertIsNone(d.rede_ativa_no_dumpsys('sem a linha'))
        self.assertTrue(d.avaliar_offline(False, False))
        self.assertTrue(d.avaliar_offline(False, None))
        self.assertFalse(d.avaliar_offline(True, False))
        self.assertFalse(d.avaliar_offline(False, True))


class ExpressoesTest(unittest.TestCase):
    def test_falar_reais(self):
        self.assertEqual(d.falar_reais(16000), '160 reais')
        self.assertEqual(d.falar_reais(100), '1 real')
        self.assertEqual(d.falar_reais(0), '0 reais')
        self.assertEqual(d.falar_reais(1050), '10 reais e 50 centavos')
        self.assertEqual(d.falar_reais(1), '1 centavo')

    def test_expressao(self):
        self.assertEqual(d.avaliar_expressao('a + b - 5', {'a': 10, 'b': 2}), 7)
        with self.assertRaises(ValueError):
            d.avaliar_expressao('__import__("os")', {})
        with self.assertRaises(ValueError):
            d.avaliar_expressao('x', {})

    def test_substituir(self):
        self.assertEqual(d.substituir('Troco: {t:falado} / {t}', {'t': 10000}), 'Troco: 100 reais / 10000')
        with self.assertRaises(ValueError):
            d.substituir('{nao}', {})

    def test_escolher_alvo(self):
        nos = [{'content-desc': 'Cobrar R$ 50,00', 'interactions': ['CLICKABLE'], 'center': '[10,100]', 'class': 'x'},
               {'content-desc': 'Cobrar', 'interactions': ['CLICKABLE'], 'center': '[10,900]', 'class': 'x'},
               {'text': 'Cobrar', 'center': '[10,50]', 'class': 'x'}]
        self.assertEqual(d.escolher_alvo(nos, 'Cobrar')['center'], '[10,900]')
        self.assertEqual(d.escolher_alvo(nos, 'Cobrar', 'inicia')['center'], '[10,100]')
        self.assertEqual(d.escolher_alvo(nos, 'Cobrar', 'ultimo')['center'], '[10,900]')
        self.assertIsNone(d.escolher_alvo(nos, 'Outro'))


class FluxosTest(unittest.TestCase):
    ESPERADOS = ['abrir-caixa', 'vender', 'entrada', 'sangria', 'retirada', 'venda-offline', 'fechar-caixa', 'regressao']
    SOB_DEMANDA = ['suporte', 'suporte-envio', 'exportar-json']  # F16/F17 (CP 153): fora da regressao

    def test_todos_os_fluxos_existem_e_sao_validos(self):
        for nome in self.ESPERADOS + self.SOB_DEMANDA:
            caminho = FLUXOS / (nome + '.json')
            self.assertTrue(caminho.is_file(), nome)
            with self.subTest(fluxo=nome):
                self.assertEqual(d.validar_fluxo(json.loads(caminho.read_text(encoding='utf-8')), caminho), [])

    def test_nenhum_arquivo_fora_da_lista(self):
        encontrados = sorted(p.stem for p in FLUXOS.glob('*.json'))
        self.assertEqual(encontrados, sorted(self.ESPERADOS + self.SOB_DEMANDA))

    def test_fluxos_sob_demanda_nao_entram_na_regressao(self):
        regressao = json.loads((FLUXOS / 'regressao.json').read_text(encoding='utf-8'))
        for nome in self.SOB_DEMANDA:
            self.assertNotIn(nome + '.json', regressao['fluxos'])

    def test_cada_fluxo_expande_sem_placeholder_restante(self):
        for nome in self.ESPERADOS + self.SOB_DEMANDA:
            with self.subTest(fluxo=nome):
                itens = d.expandir_fluxo(FLUXOS / (nome + '.json'))
                self.assertTrue(itens)
                for item in itens:
                    self.assertIn(item['acao'][0], d.ACOES)
                    self.assertFalse(any('{' in v for v in item['acao'][1:]), item)

    def test_regressao_ordem_e_esperados_encadeados(self):
        itens = d.expandir_fluxo(FLUXOS / 'regressao.json')
        ordem = []
        for item in itens:
            nome = item['fluxo'].split(' > ')[0]
            if not ordem or ordem[-1] != nome:
                ordem.append(nome)
        self.assertEqual(ordem, ['abrir-caixa', 'vender', 'entrada', 'sangria', 'retirada', 'venda-offline', 'fechar-caixa'])
        textos = [t for i in itens for t in i['acao'][1:]]
        # troco 100 + venda 50 = 150; +20 = 170; -15 = 155; -5 = 150; +30 offline = 180
        for esperado in ('Esperado na gaveta: 150 reais', 'Esperado na gaveta: 170 reais', 'Esperado na gaveta: 155 reais',
                         'Esperado na gaveta: 180 reais', 'Dinheiro vendido: 80 reais', 'Valor contado: 180 reais'):
            self.assertIn(esperado, textos)

    def test_venda_offline_tem_airplane_on_antes_e_off_depois_da_venda(self):
        itens = d.expandir_fluxo(FLUXOS / 'venda-offline.json')
        acoes = [i['acao'] for i in itens]
        on, off = acoes.index(['airplane', 'on']), acoes.index(['airplane', 'off'])
        venda = next(n for n, i in enumerate(itens) if i['passo'].startswith('Vender offline'))
        self.assertLess(on, venda)
        self.assertGreater(off, venda)
        self.assertIn('stop', [a[0] for a in acoes[on:off]])
        self.assertIn(['assert', 'Dados confirmados no servidor'], acoes[off:])

    def test_override_de_parametro(self):
        itens = d.expandir_fluxo(FLUXOS / 'vender.json', {'venda_centavos': 7000, 'dinheiro_vendido_vender': 7000})
        self.assertIn(['money', '7000'], [i['acao'] for i in itens])

    def test_rejeita_acao_desconhecida_arity_e_segredo(self):
        self.assertTrue(d.validar_acao(['voar']))
        self.assertTrue(d.validar_acao(['tap']))
        self.assertTrue(d.validar_acao(['airplane', 'talvez']))
        self.assertTrue(d.validar_acao(['text', 'Email', 'alguem@exemplo.com']))
        self.assertTrue(d.validar_acao(['text', 'Codigo', '123456']))
        self.assertEqual(d.validar_acao(['assert', 'a', 'b']), [])

    def test_rejeita_parametro_indefinido_e_esquema_ruim(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = Path(tmp) / 'x.json'
            dados = {'nome': 'x', 'parametros': {}, 'passos': [{'nome': 'p', 'acao': ['assert', '{falta}']}]}
            self.assertTrue(any('falta' in e for e in d.validar_fluxo(dados, caminho)))
            self.assertTrue(d.validar_fluxo({'nome': 'x', 'passos': []}, caminho))
            self.assertTrue(d.validar_fluxo({'passos': [{'nome': 'p', 'acao': ['back']}]}, caminho))
            self.assertTrue(d.validar_fluxo({'nome': 'x', 'passos': [{'nome': 'p', 'incluir': 'nao-existe.json'}]}, caminho))

    def test_fluxos_sem_credenciais(self):
        for p in FLUXOS.glob('*.json'):
            texto = p.read_text(encoding='utf-8')
            self.assertNotRegex(texto, r'[\w.+-]+@[\w-]+\.[\w.]+', p.name)
            self.assertNotRegex(texto, r'\b\d{6}\b', p.name)


class FluxosSuporteTest(unittest.TestCase):
    """F16/F17 (CP 153): fluxos sob demanda de suporte e exportacao JSON, validados offline."""

    def acoes(self, nome, overrides=None):
        return [i['acao'] for i in d.expandir_fluxo(FLUXOS / (nome + '.json'), overrides)]

    def test_suporte_confere_politicas_contato_e_exclusao_sem_digitar_nem_enviar(self):
        acoes = self.acoes('suporte')
        self.assertNotIn('text', [a[0] for a in acoes])
        self.assertNotIn(['tap', 'Enviar pedido de análise de exclusão'], acoes)
        self.assertNotIn(['tap', 'Enviar solicitação de suporte'], acoes)
        textos = [t for a in acoes for t in a[1:]]
        for esperado in ('Suporte do piloto', 'Privacidade', 'Retenção e exclusão', 'Termos do piloto', 'Contato',
                         'exclusão não acontece ao tocar em enviar', 'Abrir política de privacidade no site',
                         'Abrir exclusão de conta no site'):
            self.assertIn(esperado, textos)
        aviso = ['assert', 'exclusão não acontece ao tocar em enviar', 'Enviar pedido de análise de exclusão']
        self.assertLess(acoes.index(['tap', 'Exclusão']), acoes.index(aviso))
        self.assertIn(['back'], acoes)
        self.assertGreater(acoes.index(['back']), acoes.index(aviso))

    def test_suporte_envio_so_liga_o_resumo_com_parametro(self):
        liga = ['tap', 'Incluir resumo técnico sem credenciais']
        self.assertNotIn(liga, self.acoes('suporte-envio'))
        self.assertNotIn(liga, self.acoes('suporte-envio', {'incluir_resumo': 0}))
        com = self.acoes('suporte-envio', {'incluir_resumo': 1})
        self.assertIn(liga, com)
        self.assertLess(com.index(liga), com.index(['tap', 'Enviar solicitação de suporte']))

    def test_suporte_envio_digita_mensagem_sem_acento_e_confere_protocolo(self):
        acoes = self.acoes('suporte-envio')
        digitado = next(a for a in acoes if a[0] == 'text')
        self.assertEqual(digitado[1], 'Descreva o problema ou o pedido')
        self.assertGreaterEqual(len(digitado[2]), 10)
        self.assertTrue(digitado[2].isascii())
        self.assertEqual(d.validar_acao(digitado), [])
        self.assertIn(['assert', 'Protocolo:', 'Aguardando análise da equipe.'], acoes)
        self.assertLess(acoes.index(digitado), acoes.index(['tap', 'Enviar solicitação de suporte']))

    def test_suporte_envio_volta_para_ajustes_para_o_proximo_fluxo_comecar_na_aba(self):
        acoes = self.acoes('suporte-envio')
        protocolo = acoes.index(['assert', 'Protocolo:', 'Aguardando análise da equipe.'])
        self.assertIn(['back'], acoes)
        self.assertGreater(acoes.index(['back']), protocolo)
        self.assertEqual(acoes[-1], ['assert_ausente', 'Enviar solicitação de suporte'])

    def test_exportar_json_nao_grava_textos_do_seletor_do_sistema(self):
        acoes = self.acoes('exportar-json')
        self.assertNotIn(['snapshot', 'exportar-json-seletor'], acoes)
        self.assertIn(['snapshot_sistema', 'exportar-json-seletor'], acoes)
        self.assertEqual(d.validar_acao(['snapshot_sistema', 'x']), [])

    def test_exportar_json_fecha_o_seletor_do_sistema_antes_de_conferir_o_aviso(self):
        acoes = self.acoes('exportar-json')
        exportar = acoes.index(['tap', 'Exportar dados confirmados desta loja'])
        fechar = acoes.index(['back_sistema'])
        aviso = acoes.index(['assert', 'Arquivo entregue ao compartilhamento'])
        self.assertLess(exportar, fechar)
        self.assertLess(fechar, aviso)
        self.assertNotIn(['back'], acoes)  # `back` exige o app em primeiro plano e falharia com o seletor aberto

    def test_rotulos_de_botao_e_avisos_existem_em_suporte_tsx(self):
        raiz = SCRIPTS.parent
        fonte = ((raiz / 'apps' / 'mobile' / 'src' / 'telas' / 'suporte' / 'Suporte.tsx').read_text(encoding='utf-8')
                 + (raiz / 'packages' / 'shared' / 'src' / 'suporte.ts').read_text(encoding='utf-8'))  # titulos das politicas
        de_outras_telas = {'Ajustes', 'Suporte e privacidade'}
        dinamicos = {'Protocolo:', 'Aguardando análise da equipe.'}  # montados com {s.id} / s.resposta
        for nome in ('suporte', 'suporte-envio', 'exportar-json'):
            for a in self.acoes(nome, {'incluir_resumo': 1} if nome == 'suporte-envio' else None):
                if a[0] not in ('tap', 'tap_inicia', 'assert', 'assert_ausente'):
                    continue
                for texto in a[1:]:
                    if texto in de_outras_telas:
                        continue
                    self.assertIn(texto.rstrip(':') if texto in dinamicos else texto, fonte, nome + ': ' + texto)

    def test_back_sistema_valida_e_simula_sem_exigir_app(self):
        self.assertEqual(d.validar_acao(['back_sistema']), [])
        self.assertTrue(d.validar_acao(['back_sistema', 'x']))
        comandos = ' '.join(d.comandos_da_acao(['back_sistema']))
        self.assertIn('keyevent 4', comandos)
        self.assertIn('sem exigir o app', comandos)

    def test_passo_condicional_se_zero_pula_e_expressao_invalida_e_recusada(self):
        with tempfile.TemporaryDirectory() as tmp:
            caminho = Path(tmp) / 'cond.json'
            dados = {'nome': 'cond', 'parametros': {'ligar': 0}, 'passos': [
                {'nome': 'a', 'acao': ['assert', 'A']},
                {'nome': 'b', 'acao': ['assert', 'B'], 'se': 'ligar'},
                {'nome': 'c', 'acao': ['assert', 'C'], 'se': 'ligar - 1 + 1'}]}
            caminho.write_text(json.dumps(dados), encoding='utf-8')
            self.assertEqual(d.validar_fluxo(dados, caminho), [])
            self.assertEqual([i['acao'][1] for i in d.expandir_fluxo(caminho)], ['A'])
            self.assertEqual([i['acao'][1] for i in d.expandir_fluxo(caminho, {'ligar': 1})], ['A', 'B', 'C'])
            dados['passos'][1]['se'] = 'inexistente'
            self.assertTrue(any('"se"' in e for e in d.validar_fluxo(dados, caminho)))

    def test_dry_run_dos_tres_fluxos(self):
        for nome in ('suporte', 'suporte-envio', 'exportar-json'):
            saida, erro = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(saida), contextlib.redirect_stderr(erro):
                codigo = d.entry(['--simular', 'fluxo', str(FLUXOS / (nome + '.json'))])
            self.assertEqual(codigo, 0, erro.getvalue())
            self.assertIn('Simulacao OK', saida.getvalue())


class RegressaoDryRunTest(unittest.TestCase):
    def rodar(self, argv):
        saida, erro = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(saida), contextlib.redirect_stderr(erro):
            codigo = d.entry(argv)
        return codigo, saida.getvalue(), erro.getvalue()

    def test_dry_run_regressao(self):
        codigo, saida, _ = self.rodar(['--simular', 'fluxo', str(FLUXOS / 'regressao.json')])
        self.assertEqual(codigo, 0)
        self.assertIn('Simulacao OK', saida)
        self.assertIn('adb shell cmd connectivity airplane-mode enable', saida)
        self.assertIn('adb shell svc wifi disable', saida)
        self.assertIn('adb shell svc data disable', saida)
        self.assertIn('adb shell svc wifi enable', saida)
        self.assertIn('adb shell am force-stop br.com.pdv.mobile.homologacao', saida)
        for nome in ('abrir-caixa', 'vender', 'entrada', 'sangria', 'retirada', 'venda-offline', 'fechar-caixa'):
            self.assertIn('== ' + nome, saida)

    def test_dry_run_com_parametro(self):
        codigo, saida, _ = self.rodar(['--dry-run', 'fluxo', str(FLUXOS / 'vender.json'), '--param', 'venda_centavos=7000'])
        self.assertEqual(codigo, 0)
        self.assertIn('"money", "7000"', saida)

    def test_dry_run_fluxo_invalido_falha(self):
        with tempfile.TemporaryDirectory() as tmp:
            ruim = Path(tmp) / 'ruim.json'
            ruim.write_text(json.dumps({'nome': 'ruim', 'passos': [{'nome': 'p', 'acao': ['voar']}]}), encoding='utf-8')
            codigo, _, erro = self.rodar(['--simular', 'fluxo', str(ruim)])
        self.assertEqual(codigo, 2)
        self.assertIn('acao desconhecida', erro)

    def test_simular_exige_fluxo(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            d.parse_args(['--simular', 'acoes.json'])

    def test_producao_exige_fisico(self):
        with self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
            d.parse_args(['--producao', 'acoes.json'])
        self.assertTrue(d.parse_args(['--producao', '--fisico', 'acoes.json']).producao)
        self.assertEqual(d.PACOTE_PRODUCAO, 'br.com.pdv.mobile')
        self.assertEqual(d.PACKAGE, 'br.com.pdv.mobile.homologacao')

    def test_aviao_recusado_por_wifi(self):
        self.assertTrue(d.conexao_sem_fio('192.168.15.198:46265'))
        self.assertTrue(d.conexao_sem_fio('adb-XYZ-abc._adb-tls-connect._tcp'))
        self.assertFalse(d.conexao_sem_fio('emulator-5554'))
        self.assertFalse(d.conexao_sem_fio('R5CX123ABC'))
        anterior = d.DEVICE
        try:
            d.DEVICE = '192.168.15.198:46265'
            with self.assertRaises(RuntimeError):
                d.airplane('on')
        finally:
            d.DEVICE = anterior

    def test_param_invalido(self):
        with self.assertRaises(ValueError):
            d.parse_params(['x=abc'])
        self.assertEqual(d.parse_params(['a=1', 'b=-2']), {'a': 1, 'b': -2})

    def test_wrapper_regressao_aponta_para_regressao_json(self):
        spec2 = importlib.util.spec_from_file_location('regressao_aparelho', SCRIPTS / 'regressao-aparelho.py')
        wrapper = importlib.util.module_from_spec(spec2)
        spec2.loader.exec_module(wrapper)
        self.assertTrue((wrapper.AQUI / 'fluxos' / 'regressao.json').is_file())


def _no(desc, classe='android.widget.EditText', **kw):
    n = {'class': classe, 'content-desc': desc, 'center': '[10,20]', 'interactions': []}
    n.update(kw)
    return n


class AreaRolavelTest(unittest.TestCase):
    def test_primeira_lista_rolavel(self):
        ns = [_no('x', 'android.view.View'),
              _no('a', 'android.widget.ScrollView', interactions=['SCROLLABLE'], bounds='[0,100][1080,2000]'),
              _no('b', 'androidx.recyclerview.widget.RecyclerView', interactions=['SCROLLABLE'], bounds='[1,2][3,4]')]
        self.assertEqual(d.area_rolavel(ns), (0, 100, 1080, 2000))

    def test_recyclerview(self):
        ns = [_no('b', 'androidx.recyclerview.widget.RecyclerView', interactions=['SCROLLABLE'], bounds='[1,2][3,4]')]
        self.assertEqual(d.area_rolavel(ns), (1, 2, 3, 4))

    def test_ausente_ou_outra_classe(self):
        self.assertIsNone(d.area_rolavel([]))
        self.assertIsNone(d.area_rolavel([_no('v', 'android.view.View', interactions=['SCROLLABLE'], bounds='[0,0][1,1]')]))
        self.assertIsNone(d.area_rolavel([_no('s', 'android.widget.ScrollView', bounds='[0,0][1,1]')]))


class CampoDeTextoTest(unittest.TestCase):
    def test_exato_com_acentos(self):
        alvo = _no('Destino e responsável pelo recebimento')
        ns = [_no('Motivo'), alvo]
        self.assertIs(d.campo_de_texto(ns, 'Destino e responsável pelo recebimento'), alvo)

    def test_nao_edittext_ou_parcial(self):
        ns = [_no('Motivo', 'android.view.View'), _no('Motivo do ajuste')]
        self.assertIsNone(d.campo_de_texto(ns, 'Motivo'))
        self.assertIsNone(d.campo_de_texto(ns, 'Motivo do'))


class DigitarTest(unittest.TestCase):
    def _patch(self, nos, rolar_ret=False):
        from unittest import mock
        self.adb = mock.Mock()
        self.rolar = mock.Mock(return_value=rolar_ret)
        stack = contextlib.ExitStack()
        self.addCleanup(stack.close)
        stack.enter_context(mock.patch.object(d, 'guard'))
        stack.enter_context(mock.patch.object(d, 'layout', return_value=[]))
        stack.enter_context(mock.patch.object(d, 'nodes', return_value=iter(nos)))
        stack.enter_context(mock.patch.object(d, 'adb', self.adb))
        stack.enter_context(mock.patch.object(d, 'rolar', self.rolar))
        stack.enter_context(mock.patch.object(d, 'esconder_teclado'))
        stack.enter_context(mock.patch.object(d.time, 'sleep'))

    def test_valor_com_acento_levanta_valueerror_sem_digitar(self):
        self._patch([_no('Motivo')])
        with self.assertRaises(ValueError):
            d.digitar('Motivo', 'Café')
        for c in self.adb.call_args_list:
            self.assertNotIn('text', c.args)

    def test_valor_valido_envia_espacos_como_percent_s(self):
        self._patch([_no('Origem do dinheiro')])
        d.digitar('Origem do dinheiro', 'Cofre da loja')
        self.adb.assert_any_call('shell', 'input', 'text', 'Cofre%sda%sloja')

    def test_email_de_teste_com_arroba_e_digitado(self):
        # CP 152: o login da reinstalacao limpa precisa digitar e-mail.
        self._patch([_no('E-mail')])
        d.digitar('E-mail', 'teste+m2@exemplo.test')
        self.adb.assert_any_call('shell', 'input', 'text', 'teste+m2@exemplo.test')

    def test_campo_ausente(self):
        self._patch([_no('Outro')], rolar_ret=False)
        with self.assertRaisesRegex(RuntimeError, 'Campo ausente: Motivo'):
            d.digitar('Motivo', 'abc')


class ComandosTextoTest(unittest.TestCase):
    def test_text_tem_quatro_linhas_com_rotulo_e_percent_s(self):
        linhas = d.comandos_da_acao(['text', 'Origem do dinheiro', 'Cofre da loja'])
        self.assertEqual(len(linhas), 4)
        self.assertIn('Origem do dinheiro', linhas[0])
        self.assertIn('Cofre%sda%sloja', ' '.join(linhas))


def _passos(nome):
    return json.loads((FLUXOS / (nome + '.json')).read_text(encoding='utf-8'))['passos']


class FluxosEstruturaTest(unittest.TestCase):
    def test_registrar_precedido_de_motivo_e_campo_de_destino(self):
        esperado = {'entrada': 'Origem do dinheiro', 'sangria': 'Destino e responsável pelo recebimento',
                    'retirada': 'Destino e responsável pelo recebimento'}
        for nome, campo in esperado.items():
            acoes = [p['acao'] for p in _passos(nome)]
            idx = [i for i, a in enumerate(acoes) if a[0] == 'tap_ultimo' and a[1].startswith('Registrar')]
            self.assertTrue(idx, nome)
            for i in idx:
                self.assertGreaterEqual(i, 2, nome)
                self.assertEqual(acoes[i - 1][:2], ['text', 'Motivo'], nome)
                self.assertEqual(acoes[i - 2][:2], ['text', campo], nome)

    def test_caixa_seguido_de_resumo_e_nova_venda_de_fechar(self):
        vistos = {'Caixa': 0, 'Nova venda': 0}
        for f in sorted(FLUXOS.glob('*.json')):
            acoes = [p['acao'] for p in json.loads(f.read_text(encoding='utf-8')).get('passos', []) if 'acao' in p]
            for i, a in enumerate(acoes):
                for rotulo, seguinte in (('Caixa', 'Resumo'), ('Nova venda', 'Fechar')):
                    if a == ['tap', rotulo]:
                        vistos[rotulo] += 1
                        self.assertLess(i + 1, len(acoes), f.name)
                        self.assertEqual(acoes[i + 1], ['tap', seguinte], f.name)
        self.assertGreater(vistos['Caixa'], 0)
        self.assertGreater(vistos['Nova venda'], 0)


if __name__ == '__main__':
    unittest.main()
