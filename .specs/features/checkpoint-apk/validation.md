# Revisão independente — checkpoint APK

Data: 30–31/10/2026. Veredito: PASS para preparação local de homologação offline. Testes físicos e aceite de produção permanecem pendentes.

## Critérios

- AC2 — PASS na preparação e inspeção estática. A identidade isolada está em apps/mobile/app.config.ts:21; a configuração normal e o isolamento são verificados em apps/mobile/test/configuracaoApk.test.ts:12 e apps/mobile/test/configuracaoApk.test.ts:24. Bundle e módulos SQLite, SecureStore e câmera estão registrados em .specs/features/checkpoint-apk/artefatos.json:24 e .specs/features/checkpoint-apk/artefatos.json:53. A abertura sem Metro e o funcionamento dos módulos no aparelho aguardam observação física.
- AC3 — PASS para as evidências da preparação. Os hashes e certificados constam em .specs/features/checkpoint-apk/artefatos.json:6, .specs/features/checkpoint-apk/artefatos.json:21, .specs/features/checkpoint-apk/artefatos.json:35 e .specs/features/checkpoint-apk/artefatos.json:50. Os comandos e limites de proveniência estão em docs/checkpoint-apk.md:53 e docs/checkpoint-apk.md:64. O certificado do roteiro foi conferido contra o manifesto público após correção de caractere de controle.
- AC4 — PASS para cobertura do roteiro em docs/checkpoint-apk.md:13; os resultados físicos permanecem pendentes conforme docs/checkpoint-apk.md:29. Não houve UAT físico.

## Evidência da revisão

Os testes direcionados passaram: 4/4 Vitest e 4/4 Python, em série. As asserções de rejeição de URL e de seleção explícita de modo estão em apps/mobile/scripts/test_build_apk_local.py:16 e apps/mobile/scripts/test_build_apk_local.py:23. Uma mutação somente em memória que aceitou HTTP provocou a falha esperada da asserção, com marcador SENSOR_ASSERTION_FAILURE_CONFIRMED. O runner desativa dotenv e fixa o modo em apps/mobile/scripts/build-apk-local.py:116; Metro limita workers apenas para homologação em apps/mobile/metro.config.cjs:5.

O hash do APK 5 foi conferido como c852363caa12dfd0d572d3127fb5083c0d47efd34ef7defad0a092b30b3b073f. A inspeção independente com aapt, apksigner e ZIP/DEX confirmou pacote, código 5, versão 0.1.4, mínimo 24, alvo 36, ARM64, assinatura v2, bundle e classes dos três módulos. O certificado debug SHA256 é fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.

O hash do APK 6 foi conferido como 173052b1c40c6dc2cf627c1cddeaa21374416bd9f801be6201cd82ef3be69506. Aapt confirmou o mesmo pacote, versão 0.1.4 e código 6; apksigner confirmou v2 e o mesmo certificado debug. A execução final registrou a tarefa de bundle executada e BUILD SUCCESSFUL; o runner força essa tarefa em apps/mobile/scripts/build-apk-local.py:149.

O JSON do APK 5 registra commit-base de8fc6f e dirty=true; o do APK 6 registra 2f8bff8 e dirty=true, incluindo o ajuste do runner ainda na árvore. Fingerprints abrangem extensões selecionadas em mobile/shared, excluem dependências e Android gerado e não comprovam todas as entradas nem reprodutibilidade bit a bit. A assinatura verifica integridade, não identidade comercial nem origem integral. A primeira tentativa de compilação falhou com CMake antigo; a correção e demais problemas estão documentados em docs/build-android-local.md:1. API HTTPS indisponível: sincronização, e-mail e recuperação conectada não foram comprovados.
