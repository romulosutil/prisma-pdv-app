import { criarCifradorCodigo } from '../src/email/cifrador';
import type { EmissaoCodigo } from '../src/email/tiposEntrega';

export const emissaoTeste: EmissaoCodigo = { modo: 'email', dominioRemetente: 'example.com', chaves: { ativaId: 'teste', cifradores: new Map([['teste', criarCifradorCodigo(Buffer.alloc(32, 7).toString('base64'))]]) } };
