# Triagem local das dependências

Data: 29/10/2026. Inspeção somente leitura durante a execução do Goal. Não foram alterados package.json, lockfile ou versões por esta triagem, nem executado audit fix. Ela classifica trabalho pendente, sem certificar segurança ou produção.

## Evidências

- `rtk proxy npm audit --json`: 13 entradas afetadas, 5 baixas, 4 moderadas e 4 altas; nenhuma crítica; exit1 por vulnerabilidades.
- `rtk proxy npm audit --omit=dev --json`: 9 entradas, 5 baixas e 4 altas; nenhuma moderada ou crítica; exit1. A contagem9 registrada anteriormente coincide com a árvore sem dev; não comparar os dois comandos como se fossem a mesma seleção.
- `rtk proxy npm ls node-forge zod esbuild deepmerge --all`: versões e caminhos abaixo. O audit agrega dependentes afetados;13 entradas não significam13 falhas distintas.

| Origem | Versão/caminho instalado | Condição e encaminhamento |
|---|---|---|
| esbuild, moderada | drizzle-kit0.31.11 -> @esbuild-kit/esm-loader2.6.5 -> core-utils3.3.2 -> esbuild0.18.20 | O advisory trata do servidor de desenvolvimento `serve`, corrigido em0.25.0. Não foi iniciada essa API nesta execução. A ferramenta de migração é devDependency; atualizar a cadeia com teste de geração/migração. O esbuild do tsx4.23.15 é0.28.2, e o direto do drizzle-kit é0.25.12. [Advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99). |
| Zod, alta | expo58.0.19 -> @expo/cli58.1.15 -> zod3.25.76 | O advisory inclui versões anteriores a4.6.6 e consumo de memória com coleções grandes. API/mobile/shared usam zod4.6.7, mas isso não elimina a cópia do CLI. Exigir atualização compatível do CLI ou correção compatível comprovada; não forçar Zod4 sobre contrato Zod3 sem teste. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |
| node-forge, alta | @expo/cli58.1.15 e @expo/code-signing-certificates0.0.7 -> node-forge1.4.0 | Afeta verificação de assinatura RSA PKCS#1v1.5 com certos parâmetros. O advisory consultado não lista versão corrigida, apesar de npm indicar fixAvailable=true. Verificar versão/patch upstream e o uso de certificados/assinaturas do toolchain antes da remediação; não declarar resolvido só pelo campo do audit. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv). |
| deepmerge, baixa | expo58.0.19 -> @expo/config58.0.8 -> deepmerge4.3.1 | Afeta objetos recebidos por mergeObject. O advisory não lista versão corrigida. Revisar upstream e exposição de configuração ao aplicar atualização compatível; dependentes Expo propagam a contagem baixa. [Advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). |

Os caminhos observados apontam principalmente para ferramentas de desenvolvimento/build/configuração do Expo e Drizzle. Isso é uma **inferência de alcance a partir da árvore**, não prova de ausência no bundle Android, nas ferramentas de assinatura ou em serviços iniciados pelo usuário. Não foi feita análise de alcançabilidade do artefato final nem exploração de vulnerabilidades.

## Lote de remediação a executar

1. Confirmar versões corrigidas e compatibilidade na data da alteração. O audit sugeriu Expo54.0.38 e drizzle-kit0.18.1 como fixes fora da faixa; são versões anteriores às instaladas e não serão aplicadas automaticamente.
2. Atualizar cada cadeia em lote independente, preservando SDK/arquitetura e migrations já versionadas. Se não houver correção compatível, registrar a condição concreta e preparar mitigação/atualização upstream; não apenas silenciar o audit.
3. Repetir os dois comandos de audit com as mesmas flags, comparar as mesmas seleções e registrar as entradas remanescentes. Não somar vulnerabilidades propagadas como CVEs distintos.
4. Validar typecheck/testes dos workspaces, CLI Expo, geração de migração em scratch sem modificar o histórico, build Android do perfil final e função de assinatura/certificados afetada. Testes do domínio não comprovam essas ferramentas.
5. Auditar o artefato distribuído e a configuração implantada antes de remover o bloqueio de produção. Essa homologação permanece pendente.

Esta triagem não libera assinatura real, e-mail, Android, backups ou outros critérios P0. Nenhum serviço externo foi contratado ou alterado.
