import { iniciarApi } from './iniciarApi';

const { parar } = await iniciarApi();
const encerrar = () => { void parar().then(() => process.exit(0), () => process.exit(1)); };
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
