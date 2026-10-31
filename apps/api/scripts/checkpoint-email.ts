import { iniciarHomologacaoEmail } from '../src/homologacaoEmail';

try {
  const { parar } = await iniciarHomologacaoEmail();
  const encerrar = () => { void parar().then(() => process.exit(0), () => process.exit(1)); };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : 'Falha na homologação de e-mail.');
  process.exitCode = 1;
}
