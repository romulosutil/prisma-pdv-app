# Auditoria estática Android — candidato 0.1.8 com diagnóstico

Data: 03/11/2026, America/Sao_Paulo. Repositório: `C:/Users/sutil/dev/Pessoal/prisma pdv app`. HEAD observado: `559df39`; fontes do candidato têm alterações locais sobre a base da API `a987c31`. Esta entrega analisa e recomenda; não aplica correções ao aplicativo.

**Parecer: não liberar a 0.1.8 para piloto aberto com usuários reais ou operação comercial. Ela pode servir ao reteste técnico supervisionado em homologação, com dados de teste, para coletar o defeito visual anterior.** Há defeitos de fluxo demonstráveis por leitura do código e riscos ainda dependentes do Android físico. Nenhum crash, vazamento de memória ou conformidade WCAG foi certificado por execução nesta auditoria.

## Escopo, evidência e classificação

- Censo estático de 326 arquivos de fontes próprios (23.461 linhas) em mobile, API e shared; 57 arquivos de rotas/layouts Expo Router. Busca AST em todos os TSX identificou 26 arquivos com entradas de texto, componentes que as encapsulam ou scanners; os caminhos e ancestrais JSX estão no inventário de evidências. Revisão manual dos componentes compartilhados, telas, serviços de rede, persistência, sessão, sincronização, API e configuração que sustentam os achados abaixo. O censo não significa inspeção manual linha a linha de dependências ou prova de ausência de outros defeitos.
- APK `builds/pdv-homologacao-0.1.8.apk`: 74.711.651 bytes; SHA-256 recalculado `339620752c4a8f25d2d1c2a2ac6814ae424a3695719551fa1921b3f16f1fd02e`. Os 297 arquivos do inventário de build foram recalculados: **zero divergências**. O mapa do bundle contém 1.889 módulos e a telemetria própria de homologação; não contém as implementações de backend/catálogo/captura de demonstração pesquisadas.
- Manifesto binário e regras de backup extraídos novamente com `aapt`; assinatura v2 verificada novamente; certificado de teste interno, sem atributo `debuggable=true`. `zipalign -c -P 16 4` aprovado. Inspeção dos segmentos ELF: 29/29 bibliotecas ARM64 têm alinhamento de pelo menos 16 KB; há também 29 ARM32. As bibliotecas ARM32 com alinhamento de 4 KB não foram tratadas como falha dos dispositivos ARM64 de 16 KB. Isso é evidência estrutural, sem teste de execução em aparelho com páginas de 16 KB.
- **Executado nesta auditoria:** typecheck de API, mobile e shared, PASS. **Evidência anterior consultada, sem reexecutar:** CP 039 e logs com 562 testes mobile/65 arquivos e duas ferramentas PASS; CI/HTTP da API do CP 032/033. Esses testes não cobrem todos os defeitos abaixo e não equivalem a teste físico da 0.1.8.
- Evidências novas: `builds/auditoria-estatica-018-evidencias.json`, coletor `builds/auditoria-estatica-018.mjs`, `builds/auditoria-018-{manifesto-apk.txt,backup-apk.txt,assinatura.txt,binario.json,typecheck.log}`. Os arquivos em `builds/` são locais e ignorados pelo Git. Relatório e checkpoint ficam versionáveis em `docs/`.
- **P1:** corrigir antes de ampliar o piloto, ou resolver o risco e registrar evidência específica. **P2:** corrigir/validar antes da homologação da área afetada. “Confirmado estático” significa contradição ou ausência demonstrável no código; “risco” não afirma que já ocorreu no aparelho. Snippets são propostas e alguns são pseudocódigo, explicitamente indicados.

São **18 achados: 5 P1 e 13 P2**. Distribuição: acessibilidade/usabilidade 3; rede/exceções 3; estabilidade/desempenho 3; segurança/privacidade 5; negócio 4.

## 1. WCAG, acessibilidade e usabilidade

### Inventário completo de telas com texto editável

`CampoDinheiro`, `EntradaDeValor` e `CampoPreco` mostram valores e usam teclado numérico próprio; não são `TextInput` nem abrem o IME. Foram verificados separadamente para não criar falsos positivos. Os componentes `Campo` e `FormularioCartao` também não são telas independentes. O inventário inclui caminhos de demo/assinatura presentes nos fontes, mas identifica o que o conectado substitui.

| Tela/rota ou fluxo | Arquivo e linha aproximada | Campo e contêiner efetivo | Resultado estrutural |
|---|---|---|---|
| Criar conta | `apps/mobile/app/(onboarding)/criar-conta.tsx:59,70,84` | Nome, e-mail, documento; `TelaBase rolavel`, CTA fora do scroll | Tem scroll; IME/CTA exige A03 |
| Nome da loja | `apps/mobile/app/(onboarding)/loja.tsx:58` | Nome; `TelaBase rolavel`, CTA fixo | Tem scroll; A03 |
| Login, OTP, recuperação e escolha de vínculo | `apps/mobile/app/(onboarding)/entrar.tsx:176–177` | E-mail/código; `TelaBase rolavel`; confirmação em `BottomSheet` | Tem scroll; A03 |
| Assinatura/cartão | `apps/mobile/app/(onboarding)/cartao.tsx:42,72` | Cupom e `FormularioCartao`; `TelaBase rolavel` | Tem scroll; campos de cartão substituídos no release conectado |
| Atualizar cartão | `apps/mobile/app/atualizar-cartao.tsx:34` | `FormularioCartao`; `TelaBase rolavel` | Formulário substituído por aviso no conectado |
| Equipe/convite | `apps/mobile/app/ajustes/equipe.tsx:63` | Nome/e-mail em `BottomSheet` com `ScrollView` | Tem scroll; A03 |
| Novo/editar produto | `apps/mobile/src/telas/produtos/FormularioProduto.tsx:198,212,251,264` | Nome, EAN, estoque inicial e mínimo; `TelaBase rolavel`, rodapé fixo | Tem scroll; A03 |
| Cadastro rápido | `apps/mobile/src/telas/produtos/CadastroRapido.tsx:155` | Nome no `BottomSheet`; scanner também oferece texto manual | Nome tem scroll; alternativa de scanner A01 |
| Lista de produtos | `apps/mobile/src/telas/produtos/ListaProdutos.tsx:105`; `CampoBusca.tsx:21` | Busca em cabeçalho `View`, irmão da `FlatList` | Campo fora do scroll; A02 |
| Buscar produto na venda | `apps/mobile/src/telas/vender/TelaBusca.tsx:75` | `TextInput` no cabeçalho; resultados em `FlatList` irmã | Campo fora do scroll; A02 |
| Scanner de cadastro | `apps/mobile/src/telas/produtos/CadastroPorCamera.tsx:48` | `Scanner` → `FormularioCodigo` | Sheet tem scroll; alternativa sem câmera A01 |
| Scanner da venda | `apps/mobile/src/telas/vender/TelaVender.tsx:140` | Mesmo `Scanner`, visor de altura fixa | Sheet tem scroll; alternativa sem câmera A01 |
| Código manual compartilhado | `apps/mobile/src/componentes/Scanner.tsx:263,320,354` | Mesmo `TextInput` em dois ramos: `BottomSheet` ou `SemCamera`/`View` absoluto | Falta scroll no segundo ramo; A01 |
| Item avulso | `apps/mobile/src/telas/vender/FolhaAvulso.tsx:35` | Descrição; `BottomSheet`/`ScrollView` | Tem scroll; A03 |
| Configurar chave Pix | `apps/mobile/src/telas/pagar/PixEstatico.tsx:132` | Chave; `TelaBase rolavel` | Tem scroll; A03 e N01 |
| Fechar caixa | `apps/mobile/src/telas/caixa/FecharCaixa.tsx:92` | Troco restante; `TelaDeValor` → `TelaBase rolavel`, CTA fixo | Tem scroll; A03 |
| Movimento local de caixa | `apps/mobile/src/telas/caixa/MovimentoDeCaixa.tsx:120–122` | Categoria/destino/motivo; `TelaDeValor` → `TelaBase rolavel` | Tem scroll; A03 |
| Turnos/conferência/transferência/troca de aparelho | `apps/mobile/src/telas/caixa/TurnosCaixa.tsx:72–89` | Valores, motivos, origem, autorização e evento; `TelaBase rolavel` | Tem scroll; A03 |
| Gestão de estoque | `apps/mobile/src/telas/gestao/Estoque.tsx:36–38` | Quantidade/motivo/item; `TelaGestao` → `TelaBase rolavel` | Tem scroll; A03 |
| Clientes/fiado | `apps/mobile/src/telas/gestao/Fiado.tsx:51,52,56,64,78` | Nome/contato/quantidade/data/motivo; `TelaGestao` rolável; valores em teclado próprio | Tem scroll; A03 |
| Relatórios | `apps/mobile/src/telas/gestao/Relatorios.tsx:33–34` | Datas; `TelaGestao` rolável | Tem scroll; A03 |
| Lojas | `apps/mobile/src/telas/gestao/Lojas.tsx:25` | Nome; `TelaGestao` rolável | Tem scroll; A03 |
| Suporte/exclusão | `apps/mobile/src/telas/suporte/Suporte.tsx:61` | Mensagem; `TelaBase rolavel` | Tem scroll; A03 |
| Componente básico | `apps/mobile/src/componentes/Campo.tsx:52` | `TextInput`; rótulo, hint e erro acessíveis | Depende do contêiner da tela |
| Cartão legado/demo | `apps/mobile/src/componentes/FormularioCartao.tsx:84,105,120,135` | Número, validade, CVV e nome | Fora da coleta de cartão no conectado por substituição Metro |

Abrir caixa, peso, dinheiro recebido e divisão de pagamento usam teclado próprio e não acrescentam campos de texto do sistema. Suas folhas/telas usam `BottomSheet` ou `TelaDeValor`/`TelaBase rolavel`. A numeração de linhas descreve os fontes atuais que conferem com o inventário do APK.

### A01 — P2 — Alternativa manual sem câmera não tem rolagem

**Arquivos:** `apps/mobile/src/componentes/Scanner.tsx:305–320,354,447–450`; consumidores `CadastroPorCamera.tsx:48`, `CadastroRapido.tsx:71`, `TelaVender.tsx:140`.

**Confirmado estático:** `SemCamera` renderiza o formulário dentro de um `View` absoluto, e o visor tem `overflow: hidden`. Permissão negada/erro de câmera leva a esse ramo; apenas o outro ramo, “Digitar código”, usa `BottomSheet` com scroll. Teclado e fonte ampliada podem cortar instruções e botão Adicionar. A ocorrência visual depende da altura disponível.

**Proposta:** disponibilizar o formulário manual no mesmo sheet rolável em todos os estados, deixando uma ação para abri-lo no visor. Evitar `ScrollView` sobre a câmera como correção geral.

```tsx
// No estado sem câmera, abrir o mesmo formulário manual já usado no sheet.
<Botao rotulo="Digitar código" onPress={() => setDigitando(true)} />
// Remover o FormularioCodigo inserido diretamente no View absoluto de SemCamera.
```

Validar permissão negada definitiva, falha de montagem, menor aparelho suportado e fonte a 200%, com TalkBack e teclado aberto. Relaciona-se a reflow e foco não encoberto; não é certificação automática de critérios WCAG.

### A02 — P2 — Campos de busca ficam fora da região rolável

**Arquivos:** `apps/mobile/src/telas/produtos/ListaProdutos.tsx:92–122`; `apps/mobile/src/telas/produtos/CampoBusca.tsx:21`; `apps/mobile/src/telas/vender/TelaBusca.tsx:71–98`.

**Confirmado estático:** busca/filtros ficam em `View` irmão da `FlatList`, dentro de `TelaBase` sem `rolavel`. A lista rola, o campo não. Em tela pequena/fonte grande/IME aberto o cabeçalho e rodapé podem consumir toda a área útil. Não se afirma que toda busca fixa seja inválida: falta a validação dessas combinações.

**Proposta:** mover o conjunto de cabeçalho/campo/filtros para `ListHeaderComponent`; manter uma única lista vertical, sem aninhar `FlatList` num `ScrollView` vertical.

```tsx
<FlatList
  ListHeaderComponent={cabecalhoComCampoEFiltros}
  data={resultados}
  keyboardShouldPersistTaps="handled"
  renderItem={renderizarProduto}
/>
```

### A03 — P2 — Scroll existe, mas a política de teclado não garante foco/CTA visível

**Arquivos:** `apps/mobile/src/componentes/TelaBase.tsx:21–37`; `apps/mobile/src/componentes/BottomSheet.tsx:25–50`; `apps/mobile/app.json:16–30`. Manifesto exato: `builds/auditoria-018-manifesto-apk.txt`, `MainActivity.windowSoftInputMode=0x10` (`adjustResize`).

**Risco:** não falta `adjustResize`: ele está no APK. Porém `TelaBase` não trata explicitamente a altura do IME e mantém rodapé fora do scroll; `BottomSheet` define `KeyboardAvoidingView.behavior` somente para iOS. A build usa edge-to-edge. `keyboardShouldPersistTaps` controla toques, não garante foco ou espaço para o teclado. Também não há `scrollTo` associado ao foco em `Campo`. Isso afeta as telas roláveis da matriz, sobretudo inputs finais e CTAs fixos; não prova que todas estejam quebradas. O Modal do RN instalado também define `SOFT_INPUT_ADJUST_RESIZE`, portanto não foi classificado como completamente sem tratamento nativo.

**Proposta inicial para avaliação física:** envolver corpo e rodapé em uma política única de IME; aplicar tratamento equivalente dentro do Modal, ajustando offset conforme cabeçalho e barras. Não somar altura de IME duas vezes se o contêiner nativo já redimensionar.

```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={offsetMedido}
>
  {corpoRolavel}
  {rodape}
</KeyboardAvoidingView>
```

O snippet é uma alternativa a validar, não garantia para todos os aparelhos. [RN recomenda configurar o behavior em ambas as plataformas](https://reactnative.dev/docs/keyboardavoidingview); [Android exige considerar insets em edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge). Se necessário, usar insets IME nativos e rolagem ao foco. Validar Android 7/API 24, Android 15–17, navegação por gestos/3 botões, fonte ampliada e TalkBack antes de encerrar o achado.

**Pontos positivos:** `Campo` tem rótulo, hint, indicação de erro e anúncio acessível; há redução de movimento e alternativas à câmera. Não foram encontrados bloqueios globais de escala de fonte. Contraste, ordem/foco efetivos do TalkBack e tamanho final dos alvos dependem da composição renderizada; não se declarou conformidade WCAG apenas pela presença dessas props.

## 2. Endpoints, API, exceções e rede

### O que já está protegido

`apps/mobile/src/servicos/backendHttp.ts:190–269` centraliza as chamadas: timeout de 15 s com `AbortController` e `Promise.race`, limpeza do timer no `finally`, captura de falha de transporte, invalidação de sessão em 401, tratamento de status não 2xx, JSON inválido e schemas Zod. 5xx vira `ErroBackend` com status preservado; não escapa simplesmente como exceção nativa do fetch. 403 de permissão é distinguido; 409/429 recebem classificação. O timeout e a perda de rede usam a mesma mensagem; isso limita o diagnóstico do usuário, mas não é ausência de tratamento.

`catalogoEan.ts:119–180` limita consulta a 2,5 s e confirmação a 8 s, cancela trabalho e degrada a cadastro manual; `sincronizacao.ts:75–169` trata falhas, mantém IDs e aplica backoff. `apps/api/src/servidor.ts:66–81` tem handler global para domínio, Zod, Fastify e 500 sanitizado. `dados.ts:215–249,272–323` preserva comando pendente em rede/5xx para reenvio idempotente. Não se recomenda retry automático indiscriminado de POST.

### H01 — P1 — Promise rejeitada ao consultar pendência pode escapar do tratamento da gestão

**Arquivo:** `apps/mobile/src/telas/gestao/comum.tsx:16–26`.

**Confirmado estático:** `useEffect` chama `void atualizarPendente()` sem `catch`. A leitura pode rejeitar por armazenamento indisponível/JSON inválido, como implementado em `dados/armazenamento.ts:25–36`. Além disso, `executar()` aguarda a mesma leitura no `finally`, fora do seu `catch`; uma falha ali rejeita a Promise que os botões/effects descartam com `void`. Afeta estoque, fiado, lojas e relatórios.

**Risco:** rejeição JS não tratada e estado de operação incerto na tela; pode alimentar handler fatal/erro global conforme runtime. Isso não prova encerramento nativo do processo. Colocar um `try/catch` só no fetch não resolve esse caminho.

```tsx
const atualizarPendente = useCallback(async () => {
  try {
    const p = !!await dados.armazenamentoDaLoja.obter('operacaoGestaoPendente');
    if (mesmoPerfil()) setPendente(p);
  } catch {
    if (mesmoPerfil()) setMensagem('Não foi possível consultar a operação local. Preserve os dados e tente novamente.');
  }
}, [dados, mesmoPerfil]);
// Com a falha consumida aqui, effect e finally deixam de propagar essa rejeição.
```

Validar rejeição tanto na montagem quanto após uma operação confirmada; não trocar falha de leitura por “não existe pendência”.

### H02 — P2 — Promises nativas descartadas sem catch

**Arquivos:** `apps/mobile/src/tema/useReducaoMovimento.ts:9–11`; `apps/mobile/app/(onboarding)/camera.tsx:22–25`; `apps/mobile/src/componentes/Scanner.tsx:212`; `apps/mobile/src/telas/pagar/PixEstatico.tsx:43–46,94`; `apps/mobile/src/telas/caixa/TurnosCaixa.tsx:66`.

**Confirmado estático:** leitura de preferência de acessibilidade, solicitação de câmera e alguns botões de clipboard não tratam rejeições do bridge nativo. Negar permissão normalmente resolve a Promise e já tem alternativa manual; o problema é rejeição excepcional do módulo. `Botao.tsx:67` chama o callback e descarta o retorno; o registrador de diagnóstico não converte isso em operação bem-sucedida.

**Proposta:** tratar erro na origem, preservar tela e informar falha no caso das ações do usuário. Para a preferência, usar fallback seguro. Aplicar o padrão a **todos os locais listados**, não apenas a um deles.

```tsx
// Dentro do effect de redução de movimento, manter o guard ativo já existente:
AccessibilityInfo.isReduceMotionEnabled()
  .then(v => { if (ativo) setReduzir(v); })
  .catch(() => { if (ativo) setReduzir(true); });

// Em solicitar câmera/copiar código: exemplo de wrapper de ação (pseudocódigo).
async function acaoNativa(tarefa: () => Promise<unknown>) {
  try { await tarefa(); }
  catch { toast.mostrar('Não foi possível concluir. Tente novamente.', { tipo: 'erro' }); }
}
```

O handler em `telemetria/captura.tsx:24` registra e delega ao handler anterior; não é um Error Boundary nem proteção contra crashes nativos. A captura de `unhandledrejection` é opcional no global e não certifica que todas as rejeições do RN sejam capturadas.

### H03 — P2 — Erros de cadastro conhecidos chegam com orientação de assinatura

**Arquivos:** `apps/mobile/src/servicos/backendHttp.ts:48–57,258–269`; `apps/mobile/src/servicos/backend.ts:60–67,88–90`; `apps/api/src/rotas/conta.ts:41–48`.

**Confirmado estático:** API devolve 409 com `email_ja_cadastrado`/`documento_ja_cadastrado`; esses códigos não estão na whitelist mobile. Não são `erro === 'conflito'`, então a mensagem específica não passa. Viram `conflito` genérico cuja orientação manda conferir assinatura. Pode impedir o usuário de entender que deve entrar com OTP, particularmente no novo teste sem limpeza da base.

```ts
// Acrescentar os códigos ao contrato CodigoErroBackend, whitelist e MENSAGENS:
email_ja_cadastrado: 'Este e-mail já tem acesso. Entre com seu código pessoal.',
documento_ja_cadastrado: 'Já existe uma conta com este CPF/CNPJ. Entre na conta ou procure o suporte.',
```

Não exibir indiscriminadamente mensagens livres de servidor. Manter mensagens locais autorizadas e testar 409 de e-mail/documento separadamente de conflito financeiro, 401, 403, 429 e 500.

## 3. Estabilidade, desempenho, ciclo de vida e Android

### Build e compatibilidade encontrados

`apps/mobile/package.json:15–43`: Expo 58, React Native 0.88, React 19.3, Hermes no build nativo. O projeto próprio não implementa ViewModels, Coroutines ou RxJava; a verificação relevante é effects, listeners, timers, requisições, câmera e persistência.

O **APK** declara minSdk 24 (Android 7), targetSdk 36 (Android 16), compileSdk 37 (Android 17), ARM32/ARM64. Não suporta Android abaixo da API 24 nem emulador x86/x86_64 com esta seleção de ABIs. Target 36 não impede instalação na API 37, mas também não comprova compatibilidade física. `scripts/build-android.ps1:80–84` seleciona as ABIs; os níveis são herdados do toolchain gerado, não fixados explicitamente em `app.json`. Usar o manifesto binário como evidência da 0.1.8, e reavaliar a matriz se atualizar Expo/RN.

Não foi demonstrada chamada própria não protegida a método Android inexistente na API 24. O `MainActivity.kt` gerado diferencia o comportamento de voltar até Android R, e a configuração desativa o gesto preditivo; isso reduz uma funcionalidade moderna, sem provar crash por API depreciada. Há uma incompatibilidade funcional de plataforma concreta em C01.

Os listeners/timers principais do layout são removidos (`app/_layout.tsx:119,133`); busca de catálogo tem abort no unmount (`BuscandoNoCatalogo.tsx:19–30`, `CadastroRapido.tsx:43`); scanner limpa timer/loop (`Scanner.tsx:79–88,102–113`). A telemetria é singleton com limite de 500 eventos. O BackendHttp não recebe cancelamento por tela, mas tem prazo de 15 s; requests finitos e callbacks tardios não foram rotulados automaticamente como vazamento permanente. O player singleton de bipe vive durante o processo; avaliar seu descarte se o ciclo for alterado, sem afirmar leak crescente por essa instância única. Não houve profiler/heap dump.

### C01 — P1 — Pausa de câmera usa propriedade apenas iOS no Android

**Arquivos:** `apps/mobile/src/componentes/Scanner.tsx:160–168`; `apps/mobile/src/telas/vender/TelaVender.tsx:85–92,140`; `apps/mobile/src/telas/produtos/CadastroPorCamera.tsx:48`; `CadastroRapido.tsx:71`. Evidência da dependência instalada: `node_modules/expo-camera/src/Camera.types.ts:438–443`; Android implementa `pausePreview`/`resumePreview` em `CameraViewModule.kt:524–529`, sem prop `active` equivalente pesquisada.

**Confirmado estático:** `active={!pausado}` é `@platform ios` na versão instalada. No Android, `pausado` remove o callback e cobre a imagem, porém não garante parar a captura. Tela anterior mantida na stack, overlay, inatividade e lanterna podem continuar usando câmera/bateria. Há proteção pelo lifecycle nativo ao fundo do aplicativo; não se afirma captura contínua após o sistema suspender a Activity. A [documentação da câmera](https://docs.expo.dev/versions/latest/sdk/camera/) também orienta liberar câmeras fora de uso.

**Proposta simples:** desmontar a câmera quando pausada e preservar a digitação manual fora desse ramo; alternativamente usar `pausePreview/resumePreview` com ref, catch e coordenação de foco/AppState.

```tsx
{cameraLiberada && !pausado ? (
  <CameraView
    enableTorch={lanterna && !pausado}
    barcodeScannerSettings={CONFIGURACAO_DO_LEITOR}
    onBarcodeScanned={({ data, type }) => entregar(data, 'camera', type)}
  />
) : null}
```

Validar navegação venda→busca→pagamento, scanner→cadastro, 45 s sem interação, lanterna, negar permissão, ir ao fundo/voltar e ausência de duas sessões concorrentes. O snippet exige retestar latência de remontagem.

### C02 — P2 — Listas de gestão crescem sem virtualização

**Arquivos:** `apps/mobile/src/telas/gestao/comum.tsx:33`; `Estoque.tsx:29,42`; `Fiado.tsx:54,57,72,83`; `Relatorios.tsx:37,40,42,52`; `apps/mobile/src/telas/caixa/TurnosCaixa.tsx:57,68–69`.

**Confirmado estático; impacto não medido:** coleções de produtos, clientes, títulos, movimentos, turnos e linhas de relatório são renderizadas com `.map` dentro de `ScrollView`. Fiado cria um botão para cada produto antes dos demais campos. Com catálogo/histórico grandes, isso eleva montagem, memória e trabalho do JS, podendo produzir congelamento perceptível em aparelhos modestos. Não é evidência de ANR já ocorrido nem memory leak.

```tsx
// Exemplo de estrutura; requer paginação/limites também no endpoint (pseudocódigo).
<SectionList
  sections={secoesDaPagina}
  ListHeaderComponent={formulario}
  renderItem={renderizarLinha}
  onEndReached={carregarProximaPagina}
  keyboardShouldPersistTaps="handled"
/>
```

Usar busca/paginação para selecionar produto/cliente; não trocar todos os `.map` por listas aninhadas. Medir tempo de abrir, responder ao toque e memória com 100 produtos e depois histórico volumoso. O p95 de catálogo em 4G já pendente no roadmap continua pendente.

### C03 — P1 — JSON exportado pode ser apagado antes de o destino terminar a leitura

**Arquivo:** `apps/mobile/src/telas/suporte/compartilhar.ts:12–16`; consumidores `src/telemetria/TelaDiagnostico.tsx:27` e `src/telas/suporte/Suporte.tsx:78–84`. Evidência nativa instalada: `node_modules/expo-sharing/android/src/main/java/expo/modules/sharing/SharingModule.kt:48–68,84–88`.

**Risco concreto de integração:** a função apaga o arquivo no `finally` logo após `shareAsync`. No Android instalado, a Promise resolve no resultado da Activity do chooser; isso não é contrato de que todo destinatário terminou de consumir o `content://`. A remoção imediata pode gerar arquivo indisponível para o destinatário, prejudicando justamente a coleta de diagnóstico. Não foi reproduzido no Samsung; testes JS com Sharing mockado não provam a entrega do arquivo real.

**Proposta:** arquivo temporário com nome único, retenção curta e limpeza por expiração em próxima abertura/rotina local, removendo o `delete` imediato. Conciliar com S05; não manter exportações indefinidamente.

```ts
// Pseudocódigo: criarExportacaoTemporaria/limparExportacoesExpiradas são novos helpers.
await limparExportacoesExpiradas();
const arquivo = criarExportacaoTemporariaUnica(nome, conteudo);
await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: titulo });
// O helper de expiração remove depois; não apagar neste finally.
```

Receber efetivamente JSON em pelo menos um destino externo autorizado e conferir conteúdo/bytes. Cancelar chooser não deve exibir confirmação de envio. A função de copiar histórico pode auxiliar o reteste técnico enquanto esse risco não for resolvido.

## 4. Segurança e privacidade

### O que foi encontrado no artefato e nas configurações

Não foi encontrada chave privada de produção, API key de serviço ou senha literal nos fontes/configurações mobile pesquisados. Os testes possuem credenciais fictícias e `apps/api/test/fixtures/email/key.pem` é fixture de TLS, não foi confundida com segredo de produção. A busca cobre o checkout atual, sem certificar histórico Git, painel remoto ou cofres externos.

As URLs de produção/homologação estão explicitamente em `apps/mobile/eas.json:23,31` e no bundle conectado: são endereços públicos, **não segredos**. Ocultá-las não implementa autorização. `config/ambiente.js:13–17` exige HTTPS e recusa credenciais na URL; o bundle usa o host de homologação. Sessões são guardadas em SecureStore (`cofre.native.ts:4–9`, `armazenamentoSessaoSegura.ts`), e o registro de homologação limita campos/rotas em uma whitelist. Não há base para alegar token hardcoded ou envio automático de texto digitado pelo diagnóstico.

Manifesto exato: CAMERA, INTERNET, MODIFY_AUDIO_SETTINGS, READ/WRITE_EXTERNAL_STORAGE com `maxSdkVersion=32`, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, USE_BIOMETRIC, USE_FINGERPRINT e permissão interna signature do receiver. Sem localização, contatos, SMS ou RECORD_AUDIO. A Activity launcher/deep link é exportada como esperado; providers de arquivo estão `exported=false` com grants de URI. Receiver de perfil exportado é protegido por DUMP, não classificado como endpoint público sem proteção. Nenhuma alteração remota de segurança foi feita.

### S01 — P2 — Ofuscação/otimização nativa desativada na homologação

**Arquivo:** `apps/mobile/app.json:61–67`. Cópia gerada consultada: `C:/p/apps/mobile/android/gradle.properties:32` e `app/build.gradle:69,116–120`.

**Confirmado estático:** `enableMinifyInReleaseBuilds=false` e `enableShrinkResourcesInReleaseBuilds=false`. As regras ProGuard existem, mas não tornam R8 ativo. Hermes/minificação JS não substituem ofuscação Java/Kotlin; R8 também não serve como cofre de segredos. Isso não invalida o APK interno para diagnóstico, porém a homologação atual não exercita comportamento com otimização de distribuição.

```json
{
  "android": {
    "enableMinifyInReleaseBuilds": true,
    "enableShrinkResourcesInReleaseBuilds": true
  }
}
```

Aplicar no objeto de `expo-build-properties`, gerar novo candidato, testar MLKit/câmera/SecureStore/SQLite e guardar mapping para diagnóstico. Revisar os `-keep` amplos após validar o necessário. [Android recomenda habilitar R8 nas builds de release](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization). Não ativar e declarar pronto sem repetir regressão/Android físico. Assinatura Android Debug é a assinatura interna documentada, não autorização para publicar a 0.1.8 como distribuição definitiva.

### S02 — P2 — Permissões herdadas excedem as funções demonstradas do MVP

**Arquivos:** `apps/mobile/app.json:23–29,38,43–57`; `builds/pdv-homologacao-0.1.8-metadados.txt:4–15`; manifesto binário nas evidências novas.

**Confirmado estático:** READ/WRITE_EXTERNAL_STORAGE até API 32, biometria e fingerprint não correspondem a uso direto encontrado: o MVP usa cache privado e Sharesheet para exportar, e não exige autenticação biométrica no SecureStore. CAMERA, INTERNET e VIBRATE têm uso claro; network/audio/wake lock podem vir de dependências, devendo ser justificados pelo uso real de áudio/câmera. Declaração não equivale a permissão concedida nem a coleta já realizada.

**Proposta:** bloquear ao menos armazenamento amplo e biometria enquanto não houver fluxo que precise deles; auditar as demais sem remover às cegas recursos exigidos por módulos.

```json
"blockedPermissions": [
  "android.permission.RECORD_AUDIO",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.USE_BIOMETRIC",
  "android.permission.USE_FINGERPRINT"
]
```

Conferir o manifesto resultante e testar API 24/32/33+ com câmera, bipe, SecureStore e exportação antes de distribuir.

### S03 — P2 — Auto Backup habilitado não inclui os bancos com dados/pendências locais

**Arquivos:** `apps/mobile/app.json:38`; `apps/mobile/src/dados/armazenamentoPlataforma.native.ts:9–13`; regras embarcadas `res/-K.xml`/`res/Hq.xml` obtidas do APK. Fontes dessas regras: `node_modules/expo-secure-store/android/src/main/res/xml/secure_store_backup_rules.xml:4–7` e `secure_store_data_extraction_rules.xml:4–13`.

**Limitação confirmada:** `allowBackup=true`, mas as regras fazem `include` somente de shared preferences, excluindo SecureStore. Com include explícito, demais domínios não são incluídos automaticamente. `pdv.sqlite` e o banco do AsyncStorage não são compartilhados por essa regra. Logo, Auto Backup não comprova recuperação de vendas/outbox sem sync, chave Pix e metadados locais. SecureStore é corretamente excluído, pois suas chaves de proteção não devem ser restauradas como credenciais utilizáveis.

Não se observou vazamento automático dos bancos para backup Google; a preocupação aqui é **expectativa incorreta de recuperação**. A política R3 já prevê recuperação do confirmado no servidor, sem prometer recuperar o que nunca foi enviado. [As regras de include/exclude e os limites estão documentados pelo Android](https://developer.android.com/identity/data/autobackup).

**Proposta mínima de UX**, preservando a política atual:

```tsx
<Texto accessibilityRole="alert">
  Operações ainda não sincronizadas ficam somente neste aparelho.
  Sincronize antes de trocar, reinstalar ou limpar o aplicativo.
</Texto>
```

Se futuramente for necessário restaurar pendências locais, projetar snapshot consistente, cifrado e testado com IDs/outbox; não adicionar cegamente `<include domain="database" path="."/>`, pois isso não valida cofre, concorrência nem restauração. Concluir F15/F19. Este achado **não reabre o backlog de cópia externa/alertas do servidor**, adiado pelo usuário.

### S04 — P1 — Cadastro emite sessão sem comprovar posse do e-mail

**Arquivo:** `apps/api/src/rotas/conta.ts:34–81`; explicação na UI `apps/mobile/app/(onboarding)/criar-conta.tsx` e CP 036/037.

**Confirmado estático, comportamento já documentado:** `/contas` aceita nome/e-mail/documento/aparelho, cria identidade de dono e retorna sessão sem verificar código. Login de uma identidade já existente exige OTP; não foi encontrado bypass desse OTP. O risco é cadastrar a identidade de outra pessoa antes dela, reservar e-mail/CPF/CNPJ e gerar registros atribuídos a dados declarados sem prova. Não comprova acesso a uma empresa já existente. A rota de criação também não chama `limitarAuth` como as rotas OTP, aumentando risco de cadastros abusivos.

**Proposta de contrato** (pseudocódigo; requer migração/API/UI e testes): conta/identidade pendente até verificar e-mail; validar rate limit antes de emitir desafio e só emitir sessão operacional após consumir prova vinculada ao cadastro.

```ts
// /cadastros/confirmar — pseudocódigo, não são helpers existentes:
await limitarCriacaoPorIp(request.ip);
const prova = await validarEConsumirDesafioDeCadastro(req.desafioId, req.codigo);
if (prova.email !== normalizarEmail(req.email)) throw new ErroApi(401, 'codigo_invalido', 'Confirme o e-mail.');
return criarContaESessaoTransacionalmente(req, prova);
```

A decisão anterior de explicar o acesso imediato no cadastro não valida a posse do e-mail. Para dados e usuários reais, resolver esse modelo de identidade e validá-lo externamente; não apresentar alteração de texto como correção de autenticação.

### S05 — P2 — CSV financeiro fica no cache sem política de remoção

**Arquivo:** `apps/mobile/src/telas/caixa/compartilhar.ts:29–39`; consumidores de relatórios/vendas. Contrasta com remoção imediata do JSON em C03.

**Confirmado estático:** escreve CSV em `Paths.cache` com nome previsível e não remove nem estabelece validade. Cache é privado ao app e pode ser limpo pelo sistema; não é evidência de leitura pública, mas acumula cópias financeiras sem política explícita e pode manter grants/arquivos por mais tempo do que o necessário.

**Proposta:** unificar exportações com o helper de C03: nome único, diretório exclusivo, prazo definido, limpeza somente dos arquivos desse diretório após expiração. Não apagar arquivo recém-compartilhado imediatamente.

```ts
// Pseudocódigo do contrato de armazenamento de exportação:
const arquivo = await exportacoes.criar({ nome, conteudo, expiraEm: prazoLocal });
await Sharing.shareAsync(arquivo.uri, { mimeType: 'text/csv' });
// Na próxima abertura: await exportacoes.removerExpiradas();
```

A triagem histórica de dependências em `docs/triagem-dependencias.md` e `builds/r5-audit-*` contém advisories e ressalvas. Esta auditoria não rodou `npm audit` atualizado nem certificou ausência de vulnerabilidades nativas/transitivas. O typecheck atual aprovado não resolve advisories. A remediação e a avaliação de alcance já abertas em R5 permanecem abertas, sem `audit fix` automático ou troca de versões nesta análise.

## 5. Negócio e QA/UAT

### Fluxos efetivamente presentes

1. Cadastro novo → loja → sessão/acesso gratuito → início; ou login → OTP → escolha/aceite de vínculo → início. Há perfis locais, logout, reautenticação e recuperação/substituição de aparelho.
2. Início → abrir turno → scanner/busca/avulso/peso → carrinho durável → dinheiro/Pix estático/cartão manual ou divisão → conclusão local transacional → sync → comprovante/histórico.
3. Caixa → suprimento/sangria/retirada → sincronização → transferência autorizada entre operadores → fechamento/destinação → conferência/relatório.
4. Produtos → câmera/digitação → catálogo real com fallback manual → cadastro/edição → estoque por eventos; gestão → clientes/fiado → recebimento/devolução/cancelamento → relatórios/CSV.
5. Ajustes → equipe/lojas/aparelhos → alternância/isolamento; suporte → solicitação/exportação/exclusão em análise; diagnóstico → copiar/compartilhar histórico local de homologação.

Pagamento integrado/Tap/Pix dinâmico e formulário real de assinatura não são capacidades homologadas deste release conectado. A presença de rotas/código legado não os torna meios reais de cobrança. Registro manual de Pix/cartão exige confirmação externa do operador, conforme a UI.

### N01 — P1 — Salvar chave Pix falha para operador/gerente por comparação de escopos diferentes

**Arquivos:** `apps/mobile/src/telas/pagar/chavePix.ts:11–12,36–42`; `apps/mobile/src/dados/estadoConta.ts:7–8`; `apps/mobile/src/dados/armazenamentoEscopo.ts:13–15,22`.

**Confirmado estático:** o hook fixa `escopo=JSON.stringify([contaId,lojaId])`. Para operador/gerente, `obterEscopo()` devolve `[contaId,lojaId,operadorId]`. Após gravar uma chave válida, a comparação sempre diverge para esses papéis e lança “A conta mudou”. O dado pode já ter sido salvo, mas a tela apresenta erro e não avança. Para dono, os dois formatos coincidem, mascarando o defeito no teste só com proprietário.

**Proposta:** comparar a identidade real da loja antes/depois; conservar a chave compartilhada da loja, sem remover o operador do escopo financeiro global. Se a regra exigir que só o dono configure Pix, implementar essa permissão explicitamente nos dados e na UI.

```ts
// Capturado pelo render; acrescentar dados às dependências do callback.
const escopoLoja = (i: typeof identidade) =>
  i ? JSON.stringify([i.contaId, i.lojaId]) : null;
const esperado = escopoLoja(identidade);
const conferirLoja = () => {
  if (escopoLoja(dados.conta.obter().identidade) !== esperado)
    throw new Error('A loja mudou. Confira a chave Pix antes de receber.');
};
conferirLoja();
await armazenamento.gravar(CHAVE_NO_ARMAZENAMENTO, interpretada);
conferirLoja();
setChave(interpretada);
```

Validar dono, gerente, operador, operador trocado na mesma loja e troca para outra empresa/loja durante a gravação. Não alterar `escopoDoPerfil` global para fazer essa comparação passar.

### N02 — P2 — Cadastro rápido oferece entrada de estoque que o domínio rejeita

**Arquivos:** `apps/mobile/src/telas/produtos/CadastroRapido.tsx:99–114,178–188`; `apps/mobile/src/dados/produtos.ts:105–111`; `apps/mobile/src/dados/dados.ts:113`.

**Confirmado estático:** o conectado configura `estoquePorMovimentos=true`. Ao bipar produto existente e informar entrada > 0, CadastroRapido envia `editar(...,{estoque:estoqueDepois})`; ProdutosRepo lança “Use os movimentos de estoque para alterar o saldo”. A operação de preço junto com a entrada não é salva, embora o formulário ofereça o fluxo.

**Proposta mínima:** remover entrada de estoque para produto existente no conectado, salvar apenas preço e direcionar à gestão para um movimento com motivo. Não contornar a validação do domínio nem gravar saldo absoluto.

```tsx
// Obter dados pelo hook useDados neste componente.
const podeInformarSaldoAqui = comEstoque && (!produto || dados.backend.modo === 'demo');
// Só renderizar o Stepper de estoque quando podeInformarSaldoAqui.
if (produto) {
  await editar(produto.id, { precoCentavos: preco });
  // Exibir ação "Registrar entrada na gestão" para o conectado.
}
```

Caso se queira entrada rápida real, implementar comando durável/idempotente de movimento e tratar preço/entrada parciais explicitamente.

### N03 — P2 — Busca navega de volta antes de confirmar inclusão durável do item

**Arquivos:** `apps/mobile/src/telas/vender/TelaBusca.tsx:50–56,152–155`; `apps/mobile/src/telas/vender/useAdicionar.ts:13–20`.

**Confirmado estático:** `adicionar()` retorna `Promise<boolean>` e retorna false quando a gravação falha. `escolher` e a confirmação de peso não aguardam nem avaliam o resultado; fecham busca/folha e navegam mesmo sem adicionar. O toast informa falha, mas o contexto de correção já foi fechado. Não há prova de perda de venda confirmada; o risco é item omitido e falsa expectativa na montagem do carrinho.

```tsx
const escolher = async (produto: Produto) => {
  if (produto.unidade === 'kg') { setPesando(produto); return; }
  if (await adicionar(produto)) router.back();
};
const confirmarPeso = async (gramas: number) => {
  if (!pesando || !await adicionar(pesando, gramas)) return;
  setPesando(null);
  router.back();
};
```

Acrescentar trava por ref enquanto aguarda. Testar falha de disco e trava temporária de sync/troca de perfil; manter consulta e peso editável após erro.

### N04 — P2 — Moldura do scanner é visual e não limita o código aceito

**Arquivos:** `apps/mobile/src/componentes/Scanner.tsx:151–167,175–204`; promessa da interface `apps/mobile/app/(onboarding)/camera.tsx:13`.

**Confirmado estático:** ROI é desenhada como overlay, mas `onBarcodeScanned` entrega qualquer `data/type` recebido; descarta bounding box/corner points. A interface afirma “Lê só o que está dentro da moldura”. Com embalagens lado a lado, um código fora do retângulo pode gerar cadastro/item diferente do que o operador aponta. Não foi executado teste de câmera para medir o comportamento em Samsung.

**Proposta:** remover a promessa de restrição até implementá-la; ou filtrar resultado na coordenada do visor, considerando rotação, espelhamento e crop. Não comparar bounding box nativa diretamente com pixels do layout sem transformação.

```tsx
// Pseudocódigo: a função exige transformação câmera→viewport e teste físico.
onBarcodeScanned={evento => {
  const caixaNoVisor = converterParaCoordenadasDoVisor(evento, tamanhoPreview, medida);
  if (!contidoNaRoi(caixaNoVisor, roi)) return;
  entregar(evento.data, 'camera', evento.type);
}}
```

### Matriz de cenários críticos de aceitação

Os cenários abaixo complementam F01–F19 de `docs/roteiro-piloto-android.md`; **nenhum foi marcado como executado fisicamente nesta auditoria**. Para registrar aceite, guardar APK/hash, API/versão, aparelho/Android, papel/perfil, passos, horário e resultado.

| Cenário | Arquivos orientadores | Resultado a exigir / bug que pode passar |
|---|---|---|
| U01 Cadastro novo, e-mail/documento existente, resposta perdida após 201 | `rotas/conta.ts:34–81`, `backendHttp.ts:142,258` | Diferenciar cadastro/login; não recriar empresa nem atribuir posse de e-mail sem prova; N/A reset da base não pode mascarar H03/S04 |
| U02 OTP errado, expirado, reutilizado, 429, e-mail atrasado; convite expirado | `app/(onboarding)/entrar.tsx:75–165`, `rotas/conta.ts:85–220` | Sessão somente após prova válida; rate limit sem perda dos dados locais |
| U03 Dono/gerente/dois operadores; troca de empresa/loja durante resposta lenta | `dados.ts:151–166,618–634`, `estadoConta.ts:7–8` | Nenhum callback aplica dados no perfil novo; nenhum caixa/carrinho de outro operador aparece |
| U04 Abrir mesmo turno em dois aparelhos e retentar após timeout | `dados/caixa.ts`, `dados.ts:257–270`, `rotas/caixa.ts` | Uma reserva confirmada; mesmo ID no reenvio; nenhuma abertura duplicada |
| U05 Scanner com dois códigos, repetição, fora da ROI, sem câmera, lanterna e retorno | `Scanner.tsx:115–168,305–320` | Código correto, pausa efetiva, alternativa manual usável; A01/C01/N04 |
| U06 Catálogo 404/500/offline/2,5 s, EAN repetido, sugestão tardia após digitação | `catalogoEan.ts:90–150`, `FormularioProduto.tsx`, `CadastroRapido.tsx:45–63` | Sem substituir nome digitado nem impedir cadastro manual; cobertura do catálogo não implica erro de leitura |
| U07 Produto existente no cadastro rápido, preço + entrada; produto novo | `CadastroRapido.tsx:101–124`, `produtos.ts:105–111` | Preço e estoque seguem contrato de movimentos; N02 |
| U08 Buscar/adicionar unidade ou kg durante falha de armazenamento/trava | `TelaBusca.tsx:50–56,152–155`, `useAdicionar.ts:13–20` | Não voltar nem perder peso/consulta após false; N03 |
| U09 Venda R$ 10,00, dinheiro R$ 20,00, troco R$ 10,00; dividir dinheiro/Pix/cartão | `useCobranca.ts:44–111`, `dados/carrinhoDuravel.ts`, `checkoutSqlite.ts` | Valores em centavos; só dinheiro líquido entra na gaveta; parcelas somam venda uma vez |
| U10 Duplo toque, encerramento entre parcela e conclusão, disco cheio antes/depois do commit | `carrinhoDuravel.ts`, `checkoutSqlite.ts`, `TelaSucesso.tsx` | Mesmo ID, nenhum segundo recebimento, rascunho/parcelas preservados e retentativa segura |
| U11 Configurar Pix como dono/gerente/operador; trocar loja durante gravação | `chavePix.ts:11–42`, `armazenamentoEscopo.ts:22` | Chave correta da loja sem falso erro; N01 |
| U12 Pix/cartão manual “recebido” sem crédito externo | `PixEstatico.tsx:83–99`, `TelaCartao.tsx:27–45` | Operador entende que o app só registra, não comprova liquidação; confirmar no banco/maquininha |
| U13 Queda antes/depois do ACK; 401/403/409/422/429/500, corpo inválido e body lento | `backendHttp.ts:190–269`, `sincronizacao.ts:75–169` | Sem crash por rejeição; IDs/payload originais preservados; erro acionável; H01–H03 |
| U14 Venda offline, reinício, relógio alterado e >7 dias; pendência antiga de turno | `acessoOffline.ts:27–46`, `release/relogio.ts`, `revisao-pendencias-sync.md` | Respeitar janela, não alterar payload para obter aceite, não prometer resolver pendência apenas exportando |
| U15 Suprimento/sangria/retirada e transferência entre Ana/Bruno; autorização expirada | `dados.ts:272–323`, `TurnosCaixa.tsx:40–89`, `rotas/caixa.ts` | Débito/crédito vinculados e idempotentes; autoria preservada; autorização de 5 min; isolamento dos saldos |
| U16 Fechar com venda pendente, contado diferente, troco preservado/recolhido; conferir depois | `FecharCaixa.tsx`, `servicos/sync.ts:314–317` | Esperado não inclui Pix/cartão; diferença correta; fechamento histórico imutável e destinação não descontada duas vezes |
| U17 Cancelar após fechar; devolver dinheiro/produto separadamente | `vendas.ts:137–147`, `DetalheVenda.tsx:78–88`, `gestao/Estoque.tsx:26` | Cancelamento comercial não realiza estorno bancário nem retorno físico automático |
| U18 Dois celulares vendem última unidade; retorno parcial; sincronização concorrente | `servicos/estoque.ts`, `servicos/sync.ts:96–125`, `gestao/Estoque.tsx` | Baixas sem duplicação; negativo explícito, ajuste por diferença e histórico/autoria |
| U19 Fiado com entrada em dinheiro/Pix, dois recebimentos concorrentes e devolução | `gestao/Fiado.tsx:30–47,77–92`, `rotas/gestao.ts` | Venda e recebimento separados, não receber acima do saldo, dinheiro no turno atual, correção reabre saldo sem duplicar receita |
| U20 Relatórios de período/filial/papel, limite de dia em Brasília e CSV após editar filtro | `gestao/Relatorios.tsx:18–52`, `gestao/datas.ts:8–18` | Resultado/CSV usam o mesmo snapshot; operador não recebe registros alheios; meia-noite e vendas divididas corretas |
| U21 Revogar/reduzir permissão, logout offline e recuperação em aparelho substituto | `armazenamentoSessaoSegura.ts`, `dados.ts`, `acessoOffline.ts` | Cofre e perfis isolados, prazo offline limitado, recuperar só o confirmado; nenhum descarte silencioso de filas |
| U22 Exportar JSON/CSV/diagnóstico, cancelar chooser, destino lê após voltar ao PDV | `suporte/compartilhar.ts:12–16`, `caixa/compartilhar.ts:29–39`, `telemetria/nucleo.ts:84–90` | Arquivo recebido legível, sem outro perfil/credenciais; expiração segura; C03/S05 |
| U23 Todos os campos com teclado aberto, fonte 200%, TalkBack, Back/gestos | Matriz de entradas; `TelaBase.tsx`, `BottomSheet.tsx` | Campo/erro/CTA alcançáveis; nenhum bloqueio de rolagem/foco; A01–A03 |
| U24 Gestão com muitos produtos/clientes/eventos e falha de leitura local | `gestao/comum.tsx:16–26`, coleções C02 | Ações responsivas, erros preservam contexto; sem rejeição não tratada nem falso “sem pendência” |

## Parecer específico sobre o APK 0.1.8

| Uso proposto | Decisão desta análise | Motivo |
|---|---|---|
| Verificação estática/instalação interna como candidato | Artefato íntegro e rastreável | Hash, 297 fontes, manifesto, assinatura e alinhamentos conferidos |
| Reteste técnico supervisionado do problema de tela branca | Pode ser usado em homologação com dados de teste | Finalidade do diagnóstico; copiar histórico como alternativa à exportação; não pressupõe correção física |
| UAT controlado com usuários representativos e transações fictícias | Preparar após corrigir P1 e os P2 dos fluxos incluídos | Precisa executar a matriz, registrar resultados e consentir no escopo do piloto; o APK atual não foi aprovado para essa fase |
| Piloto aberto/caixa real/dados comerciais reais | **Não apto** | H01/C01/C03/N01 e identidade S04, mais ausência de evidência física e de recuperação/aceite |
| Produção/loja de aplicativos | **Não aprovado** | Assinatura interna, R8 desativado, homologação operacional/física pendente |

**Ordem sugerida:** corrigir H01, N01, C01 e C03; resolver o modelo S04 antes de novos usuários/dados reais; ajustar A01–A03, N02/N03/N04, mensagens e hardening conforme o escopo incluído. Criar testes de regressão orientados a falhas reais (armazenamento, operador, plataforma Android e arquivos recebidos), repetir checks afetados e gerar **novo** APK com inventário/hash. Mudança de fontes não corrige o APK 0.1.8 que já existe.

Depois, executar o reteste físico no Samsung do relato anterior e a matriz mínima API 24/Android 15–17, com dois operadores e dois aparelhos. Concluir restauração do schema atual, recuperação, ciclo financeiro/offline e atendimento já pendentes em R5, registrar aceite humano e estabilidade observada. A limpeza de homologação permanece pendente conforme CP 039: não foi executada nesta auditoria e não deve ser presumida para testar cadastro novo. Não desinstalar/limpar dados de aparelho com pendências como atalho de QA. Backups locais existentes ficam preservados; cópia externa/alertas continuam no backlog autorizado.

Registro: [CP 040](checkpoints-roadmap.md#cp-20261103-040-auditoria-estatica-android-018-e-parecer-de-uat). Complementa CP 039 e não invalida os testes anteriores: eles passaram no seu escopo, mas não demonstraram as condições específicas encontradas aqui. **Construído/documentado:** auditoria e recomendações. **Validado localmente nesta rodada:** tipos e inspeções estáticas/binárias descritas. **Validado externamente/fisicamente nesta rodada:** nada. **Aprovado pelo usuário:** nenhum piloto/fluxo novo.
