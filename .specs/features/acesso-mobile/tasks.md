# Acesso mobile

## Test Coverage Matrix

| Camada | Requisitos | Prova |
|---|---|---|
| Cofre/metadata | ACCESS-01 | Falhas, migração, tokens ausentes/corruptos e escrita sanitizada, cofre fake explícito |
| HTTP | ACCESS-02/04 transporte | Endpoints/schema/status, callback só401atual, timeout de corpo; fetch fake explícito |
| Conta/escopo/SQLite | ACCESS-02/03 | 401/logout/reativar, partições, respostas tardias, checkout 2500/1000/1500 em SQLite real |
| UI/rotas | ACCESS-02/04 | Estado de reauth e conta carregando, confirmação de revogação; inspeção e testes de fluxo, Android pendente |

## Gate Check Commands

- quick: `rtk proxy npm run test --workspace=@pdv/mobile -- --maxWorkers=1`.
- build: `rtk proxy npm run typecheck` e testes dos três workspaces (API com um worker).
- Validação: spec/tasks/state via scripts da skill tlc-spec-driven; revisores novos por entrega relevante.

## Execution Plan

```text
T1 -> T3
T2 -> T3
T3 -> T4
T3 -> T5
T4 -> T5
```

T1 e T2 independentes, executores Terra Médio em arquivos separados. Gestor integra T3 e T4, revisa persistência/autenticação diretamente e centraliza commits.

## Task Breakdown

### T1: Cofre nativo e migração
Depends on: none
Where: estadoConta e adapter seguro/cofre/plugin, teste sessaoSegura.
Tests: critérios1/2 com falhas, journal, valores inválidos e ausência da credencial.
Gate: build
Done when: token nunca é enviado à base comum, migração e rotação recuperáveis, missingcofre requer login preservando identidade, erros sanitizados; revisão aprova o contrato local.
Status: aceita no contrato local após16 testes e revisao-cofre.md; Android físico permanece pendente globalmente. Reset de desenvolvimento tem janela documentada entre dois armazenamentos.

### T2: Adaptadores dos endpoints reais de acesso
Depends on: none
Where: serviço Backend/Http/Local e teste backendAcesso.
Tests: status/DTO, novo token de perfil,401privado vs403/público, deadline de corpo e erros.
Gate: build
Done when: endpoints e schemas reais conectados, callbacks corretos e timeout de toda resposta; adapter demo identificado e sem simular revogação real; revisão aprova.
Status: aceita no recorte de transporte após16 testes de acesso/assinatura e revisao-adapters.md. Endpoints ainda serão verificados com API local pelo gestor; Android pendente.

### T3: Identidade local, recuperação de sessão e isolamento
Depends on: T1, T2
Where: ContaRepo/Dados, escopo, observável, assinatura e checkout SQLite; novos testes de acesso e isolamento.
Tests: critérios3a7, inclusive respostas tardias e falhas de armazenamento com SQLite real.
Gate: build
Done when: localidentity sobrevive a 401/cofre ausente, novo perfil validado antes de trocar sessão, dados e licença particionados, pendências bloqueiam troca e reauth mesma conta recupera venda.
Status: contrato local aceito após revisão-dados, 15 testes controller, 6 de escopo e 3 com API local/PGlite+SQLite. Falta comprovação de troca de duas contas na API real, tratada em T5; não aprovar P0-03-E global.

### T4: UI de reauth e aparelhos
Depends on: T3
Where: hooks/fluxo/raiz, login, chave Pix e ajustes/aparelhos.
Tests: critérios3/4/8, regras de navegação e falha sem falso sucesso; Android pendente explicitamente.
Gate: build
Done when: login recuperável preserva checkout, aparelhos usam endpoints verdadeiros e só apresentam sucesso após resposta; revisão nova aceita recorte local e identifica homologação física pendente.
Status: recorte Node/código aceito após revisão-ui e 9 testes com hooks React reais e hosts simulados; UI/Android físicos permanecem pendentes no plano global.

### T5: Vincular identidade da instalação ao aparelho lógico de cada conta
Depends on: T3, T4
Where: identidade da instalação, integração Dados e testes API local de duas contas.
Tests: ACCESS-03 com duas contas autenticadas na API real, mesma instalação, sem pendências; origem e retorno preservados, um aparelho ativo por conta.
Gate: build
Done when: o ID da instalação é estável e seus aparelhos lógicos respeitam a vinculação por conta existente na API; logins repetidos não consomem novos aparelhos; pendências impedem troca antes de criar sessão/conta; revisão independente aprova sem fingir API real a partir do controller simulado.
Status: aceita localmente após correção de corrida mantendo freeze durante rede; 43 testes focados e revisao-vinculo.md PASS. API real em processo/PGlite e SQLite comprovam duas contas e IDs por conta estáveis; SecureStore e Android físicos pendentes globalmente.
