# PDV mobile (pt-BR)

Monorepo com npm workspaces. Documentação em `docs/`.

```
apps/        mobile (Expo), api (Fastify) e, no futuro, desktop
packages/
  shared/    @pdv/shared: domínio puro em TypeScript (dinheiro, planos,
             assinatura, licença, cartão, billing mock, tokens, contrato zod)
docs/        arquitetura, produto e design system
```

## Comandos

```
npm install        instala todos os workspaces
npm run test       roda os testes de todos os workspaces
npm run typecheck  checa os tipos de todos os workspaces
```

## Rodar a versão de testes

```
npm run start -w @pdv/mobile   abre o Expo; leia o QR com o app Expo Go no Android
npm run web -w @pdv/mobile     mesma coisa no navegador (sem câmera: digite o código ou use "Simular bip")
npm run dev -w @pdv/api        API em http://localhost:3333 (opcional)
```

Sem `EXPO_PUBLIC_API_URL` o app roda em **modo de testes**, 100% no aparelho, com cobrança simulada.
Cartões de teste: `4242 4242 4242 4242` aprova; `4000 0000 0000 0002` recusa no cadastro; `4000 0000 0000 0341` recusa as cobranças.
Em Ajustes → Assinatura, o "Relógio de teste" avança os dias para ver o fim do teste, a cobrança e a falha de pagamento.

`@pdv/shared` é consumido como TypeScript fonte (sem build): `import { formatarBRL } from '@pdv/shared'`.

## APK de testes

O APK de testes é um build de release (`__DEV__` falso) gerado com `EXPO_PUBLIC_FERRAMENTAS_TESTE=1`, definida no perfil `teste` do `apps/mobile/eas.json`:

```
eas build --profile teste --platform android
```

Essa variável liga as ferramentas de teste mesmo fora de desenvolvimento (código em `apps/mobile/src/util/ferramentasTeste.ts`). Aparecem no APK:
- cartões de teste no cadastro de cartão (botão "Usar");
- "Relógio de teste" em Ajustes → Assinatura (no modo de testes);
- "Simular bip" no leitor de código de barras;
- "Simular pagamento recebido" na cobrança Pix e "Simular falha" na tela do Tap;
- "Zerar dados do app" em Ajustes.

O cadastro não vem pré-preenchido no APK: o testador digita os dados de verdade. O preenchimento automático com dados de teste continua só em desenvolvimento.
