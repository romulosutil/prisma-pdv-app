# Fluxos do driver Android

Sequencias versionadas para `scripts/pdv-android-ui.py` (app de homologacao, sem credenciais).

## Regressao num comando

    python scripts/regressao-aparelho.py --fisico          # no aparelho
    python scripts/regressao-aparelho.py --simular         # valida e imprime os comandos ADB, sem aparelho

Ordem: abrir-caixa, vender, entrada, sangria, retirada, venda-offline, fechar-caixa. Para no primeiro
erro; no final (try/finally) restaura modo aviao, Wi-Fi e dados ao estado original. Relatorio PASS/FAIL
por passo (com fabricante, modelo e Android, sem numero de serie) em `builds/regressao-regressao-<data>.json`.
Pre-condicao: app logado como dono/gerente, caixa fechado, aparelho com `adb` autorizado.

## Um fluxo avulso

    python scripts/pdv-android-ui.py --fisico fluxo scripts/fluxos/vender.json --param venda_centavos=7000

`--param nome=inteiro` (centavos) sobrepoe parametros. Fluxos avulsos usam esperados padrao coerentes
com a regressao; informe `esperado_antes_*`/`dinheiro_vendido_*` se o caixa estiver diferente.

## Fluxos sob demanda (F16 e F17, CP 153)

Fora da `regressao.json` (nao fazem parte da regressao do caixa). Pre-condicao: app logado em conta conectada
(HTTP), aparelho com `adb` autorizado. Sem e-mail, codigo ou token; nada pessoal e digitado.

    python scripts/pdv-android-ui.py --fisico fluxo scripts/fluxos/suporte.json
    python scripts/pdv-android-ui.py --fisico fluxo scripts/fluxos/suporte-envio.json [--param incluir_resumo=1]
    python scripts/pdv-android-ui.py --fisico fluxo scripts/fluxos/exportar-json.json

- `suporte`: Ajustes > "Suporte e privacidade"; confere as quatro politicas, a secao Contato (inclui os botoes
  "Abrir politica de privacidade no site" e "Abrir exclusao de conta no site", que so aparecem com a URL da API
  configurada), abre a aba "Exclusao", confere o aviso "exclusao nao acontece ao tocar em enviar" e volta sem enviar.
  Nao digita nada.
- `suporte-envio`: aba Suporte, digita uma mensagem de teste sem acento, `incluir_resumo=1` liga o interruptor
  "Incluir resumo tecnico sem credenciais" (padrao 0), envia e confere "Protocolo:" e "Aguardando analise da equipe.".
  **Cria um protocolo real** na conta logada (precisa de nenhuma solicitacao pendente e menos de 10 abertas).
- `exportar-json`: toca em "Exportar dados confirmados desta loja", grava o layout do seletor do sistema
  (`builds/pdv-ui-exportar-json-seletor-layout.json`), fecha o seletor com `back_sistema` (nenhum destino escolhido)
  e confere o aviso "Arquivo entregue ao compartilhamento". O fluxo nao le o arquivo no destino (isso e `adb pull`/humano).
- Acao nova `back_sistema`: keyevent 4 sem exigir o app em primeiro plano (o `back` comum falha com o seletor aberto);
  depois do toque confere que o app voltou ao primeiro plano.
- Passo opcional: `"se": "<expressao>"` no passo; ele so entra quando a expressao vale diferente de 0 (use um parametro, ex.
  `incluir_resumo`).
- Execucao offline registrada em 17/11/2026 (sem aparelho): `--simular fluxo` dos tres arquivos termina em "Simulacao OK"
  (suporte 14 passos, suporte-envio 10 passos com `incluir_resumo=0` e 11 com `=1`, exportar-json 11 passos) e
  `python -m unittest discover -s scripts/test -p "test_*.py"` passa (53 testes). Execucao no aparelho: PENDENTE.

## Formato (JSON)

    {"nome": "...", "descricao": "...",
     "parametros": {"venda_centavos": 5000},            // inteiros ou expressoes (+ - * //)
     "derivados":  {"total": "troco_centavos + venda_centavos"},
     "passos": [
       {"nome": "...", "acao": ["tap", "Vender"]},      // qualquer acao do driver (ver docstring)
       {"nome": "...", "acao": ["assert", "Esperado na gaveta: {total:falado}"]},
       {"nome": "...", "incluir": "vender.json", "com": {"venda_centavos": "venda_offline_centavos"}}
     ]}

- `{nome}` vira o valor; `{nome:falado}` vira o texto acessivel do app ("160 reais", "10 reais e 50 centavos").
- `assert`/`assert_ausente` sao as verificacoes: o passo falha (e o fluxo para) se o texto nao aparecer em 12 s.
- Regressao: `"tipo": "regressao"` com `"fluxos": [...]`; seus `parametros`/`derivados` sobrepoem os padroes dos fluxos.
- Acoes novas do driver: `tap_inicia` (rotulo que comeca com, ex. "Cobrar R$ 50,00") e `tap_ultimo` (o botao mais abaixo, para rotulos repetidos).
- `tap`, `assert` e `text` rolam a lista (para baixo e de volta ao topo) quando o alvo esta abaixo da dobra.
  `text` toca o campo pelo rotulo exato (acentos ok) e fecha o teclado do sistema; o valor nao pode ter acento.
- Validado no Samsung SM-S938B/Android 17 (CP 151): a aba Caixa lembra a ultima secao (sempre tocar "Resumo"),
  "Nova venda" abre o leitor sem abas (tocar "Fechar") e o caixa auditado exige origem/destino e motivo.
- Nada de e-mail, codigo de acesso ou token nos fluxos (os testes recusam).

## Testes offline

    python -m unittest discover -s scripts/test -p "test_*.py"
