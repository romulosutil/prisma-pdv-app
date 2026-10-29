# Checkpoint da execução do plano de produção

Referência: 28/10/2026. Goal persistente **ativo**. Este checkpoint não encerra o trabalho executável e não aprova produção.

## Entregas locais aceitas

| Commit | Entrega | Escopo no plano |
|---|---|---|
| 7c169d5 | Goal, decisões, contratos e critérios do primeiro lote | Coordenação |
| f0bd5a4 | Schema SQLite v1 com partição conta/loja, FKs e migração transacional | P0-01-A |
| 23ac272 | Publicação do estado somente depois de confirmar escrita, fila e erro de leitura | Parte P0-01-C |
| 62d1d6d | Migração idempotente de produtos/caixas/vendas, filhos normalizados e origem preservada; adapter nativo explícito | P0-01-B |
| fbd1a3c | Configuração da API validada antes de abrir banco/jobs/porta; mock bloqueado em produção | Parte P0-07-C |
| e9453f6 | Venda, itens, pagamentos, outbox e conclusão do rascunho no mesmo commit SQLite | Parte P0-01-D/E |
| e82d1b8 | Fachada durável, recuperação na carga, telas aguardando persistência e retry sem nova parcela | Parte P0-01-C/D |
| 9a122f2 | Identidade da instalação persistida antes do request, reutilizada em cadastro/login; migração de identidade legada | P0-03-C |
| a0be2d2 | Expiração de sessão em 30 dias, logout, perfil real, gestão/revogação de aparelhos, autorização e locks | Parte servidor P0-03-D/F |

O escopo de uma loja, operador e aparelho com dinheiro/cartão manual/Pix estático está registrado em AD-001 e P0-06-A. As capacidades e a oferta ainda precisam refletir essa decisão em P0-06-B/P1-10-A.

## Verificação executada

| Comando | Resultado final | Ambiente e limite |
|---|---|---|
| `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1` | 265 testes, 24 arquivos, passou | Node24; testes SQLite usam node:sqlite real com reabertura; UI usa adapters simulados explicitamente |
| `rtk proxy npm run test --workspace=@pdv/shared` | 136 testes, 9 arquivos, passou | Node |
| `rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1` com `PDV_TEST_POSTGRES_URL` local | 125 testes, 9 arquivos, passou | PostgreSQL17 local; o teste de backfill legado usa PGlite; há testes unitários sem banco |
| `rtk proxy npm run typecheck` | Passou nos três workspaces | TypeScript |
| `rtk git diff --check` | Passou | Árvore da entrega |
| Validadores da skill para spec/tasks/state aplicáveis | Passaram | Evidências em `.specs/` |

Total das suítes finais: **526 testes aprovados**. Não equivale a 526 integrações reais e não comprova Android, e-mail, Google Play ou produção.

O primeiro comando padrão da suíte API esgotou memória com workers paralelos. O mesmo conjunto passou com `--maxWorkers=1`. Dois cenários comerciais que avançam mais de 30 dias passaram a renovar explicitamente a sessão pelas rotas de autenticação; as expectativas financeiras foram preservadas.

PostgreSQL foi criado num container descartável com porta vinculada somente a loopback e banco dedicado `pdv_test`. O helper recusa URL fora de loopback ou com outro banco, pois executa TRUNCATE. O container exato criado para este Goal foi parado e removido com seus volumes ao fim da verificação. Não houve alteração em banco externo.

## Revisão independente e falhas corrigidas

Cada entrega relevante teve revisor que não escreveu a implementação. Os relatórios estão em `.specs/features/` e `.specs/reviews/`.

- A migração comparava a venda em JSON sem detectar um filho normalizado ausente. A conferência agora valida contagens, posições, IDs e conteúdo; triggers que removem item/pagamento causam rollback.
- A retentativa na tela de recebimento tentava inserir novamente a parcela final já salva. Saldo zerado agora retenta somente a conclusão; há testes do hook com fachada real e adapters de UI simulados.
- JSON literal `null` podia gerar uma nova identidade silenciosamente. Agora ele é corrupção, preserva a origem e bloqueia a chamada ao backend.
- Login, emissão e revogação concorriam sem coordenação comum. Agora travam a mesma conta antes de ler/alterar código, aparelho e limite; consultam o relógio depois da trava.

Sensores em cópias temporárias confirmaram detecção de publicação antecipada e versão futura, ausência de escrita de outbox e remoção da trava de login. O revisor repetiu 12 testes de sessões no PostgreSQL local. Sem a trava de login, três falharam, incluindo duas aprovações concorrentes para limite de um aparelho. A árvore real permaneceu intacta.

## Pendências externas e limites

- Android e artefato final: não houve execução em aparelho. `adb` não foi encontrado no PATH. Reinício forçado, atualização, scanner, câmera e pagamentos manuais precisam de roteiro no artefato exato.
- E-mail: provider, credenciais, domínio e entrega em homologação ainda não estão integrados/verificados. A emissão de códigos atual não é entrega real.
- Google Play: produtos, credenciais, compra/restauração/notificações e contas de teste ainda não foram integrados/homologados. Mock não conta como assinatura real.
- Infraestrutura: inventário Easypanel, domínio/HTTPS, backups/restauração, alertas, réplicas e retorno de versão ainda não foram exercitados externamente.
- Produção recusa billing mock. É um bloqueio intencional; não deve ser contornado para implantar.
- O audit após instalar expo-sqlite informou 9 vulnerabilidades (5 low, 4 high). A classificação/remediação ainda é trabalho local pendente; nenhum `audit fix --force` foi aplicado.
- Nenhum push, publicação, contratação, cobrança real ou mudança de produção foi executado.

## Próximos lotes executáveis

1. Completar P0-03 no mobile: armazenamento nativo de token, identidade local separada da credencial, 401/reauth sem perder rascunhos, perfil real e gestão de aparelhos. Isolar dados/licença/carrinho por conta e impedir troca com pendências. Projetar a recuperação quando SecureStore estiver ausente sem apagar dados financeiros.
2. Implementar entrega de e-mail e limites compartilhados de emissão/tentativas, deixando a homologação de entrega bloqueada enquanto faltarem configuração e acesso externos.
3. P0-04: consistência financeira e autorização no servidor, vínculo caixaId no contrato/bancos/checkout e ajustes posteriores ao fechamento. O vínculo de caixa atual é local; não concluir P0-01-E integral antes desse contrato.
4. P0-02: outbox para todas as mutações, envio/ack/retry, pull paginado/cursor transacional, conflitos e recuperação autenticada.
5. Capacidades de produção e oferta coerente, assinatura real, build/CI, operação e mínimos P1 obrigatórios. Continuar as partes independentes enquanto homologações externas estiverem bloqueadas.

O plano principal mantém os critérios globais sem marcação quando falta verificação exigida. O adapter browser é demonstrativo e não possui a atomicidade multi-chave do SQLite nativo. O projeto **não está pronto para produção**.

## Retomada e agentes

O gestor centralizou integração, revisão direta de persistência/autenticação, plano e commits. Subagentes foram solicitados como `gpt-6.1-terra` com esforço `medium`; a ferramenta aceitou os parâmetros, mas só devolveu task_name, sem confirmação independente do modelo efetivo. Essa limitação está registrada em AD-005. Nenhum executor criou outros agentes ou commits.

Ler `.specs/STATE.md`, conferir Git e seguir pelo primeiro lote pendente. O README modificado antes do trabalho foi preservado e continua fora dos commits desta execução.
