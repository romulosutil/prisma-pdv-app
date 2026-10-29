# Sessões e revogação

A sessão de API vence 30 dias após sua criação; no instante de expiração é necessário autenticar novamente. Logout revoga apenas o token atual. O dono pode listar aparelhos da loja e revogar um deles, inclusive o atual: todas as sessões desse aparelho são revogadas e o histórico permanece. Um aparelho revogado não pode ser reativado pelo login; um substituto pode ocupar o limite liberado. A operação de revogação é idempotente enquanto o dono usar outro aparelho válido.

A migração define a expiração de sessões antigas como criação mais 30 dias. A revogação afeta acesso à API e não apaga dados locais nem altera a validade offline da licença. A entrega de códigos por e-mail, limitação de tentativas distribuída, armazenamento protegido de credenciais e validação em PostgreSQL externo permanecem pendentes.

Login, emissão de código e revogação travam a linha da conta antes de alterar o estado. O relógio é consultado depois de adquirir a trava para não aceitar código vencido durante a espera. A revogação continua sendo verificada no hook de cada chamada protegida.

## Verificação local reproduzível

O helper de testes aceita `PDV_TEST_POSTGRES_URL` somente para loopback e banco chamado `pdv_test`. Ele executa TRUNCATE e requer `--maxWorkers=1`, pois os arquivos compartilham o banco dedicado. Nunca usar DATABASE_URL de homologação ou produção como banco de testes.

```powershell
rtk proxy docker run --detach --name pdv-pg-teste --publish 127.0.0.1:55437:5432 --env POSTGRES_PASSWORD=pdv-local-test --env POSTGRES_DB=pdv_test postgres:17-alpine
$env:PDV_TEST_POSTGRES_URL = 'postgresql://postgres:pdv-local-test@127.0.0.1:55437/pdv_test'
rtk proxy npm run test --workspace=@pdv/api -- --maxWorkers=1
```

A senha acima é exclusiva do container local descartável. Remover a variável ao terminar o terminal de testes. `docker exec pdv-pg-teste pg_isready -U postgres -d pdv_test` permite conferir a inicialização antes da suíte. Os testes de espera por trava consultam `pg_stat_activity` para controlar a intercalação no PostgreSQL; o ramo PGlite documenta sua limitação.

## Migração e retorno de versão

A migração 0002 é local e aditiva, com backfill de expiração e datas de revogação. Ela não foi aplicada em infraestrutura externa. O código anterior não preenche `expira_em` nem verifica revogação: não é uma versão segura para retorno. Antes de implantar, preparar e ensaiar uma versão de retorno que mantenha essas invariantes. Reverter código não apaga nem desfaz a migração, e apagar as datas de revogação reativaria acessos indevidamente.
