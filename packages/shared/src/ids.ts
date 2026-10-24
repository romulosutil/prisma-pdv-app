type FonteDeBytes = (quantidade: number) => Uint8Array;

export interface OpcoesGerarId {
  /** Fonte de bytes aleatórios; por padrão `crypto.getRandomValues`. */
  bytesAleatorios?: FonteDeBytes;
  /** Instante em ms desde a época Unix; por padrão `Date.now()`. */
  agoraMs?: number;
}

interface CryptoMinimo {
  getRandomValues(buffer: Uint8Array): Uint8Array;
}

const bytesDoSistema: FonteDeBytes = (quantidade) => {
  const c = (globalThis as { crypto?: CryptoMinimo }).crypto;
  if (!c) throw new Error('crypto.getRandomValues indisponível neste ambiente');
  return c.getRandomValues(new Uint8Array(quantidade));
};

/** UUID v7 (RFC 9562): 48 bits de timestamp + aleatório, ordenável por criação. */
export function gerarId(opcoes: OpcoesGerarId = {}): string {
  const agoraMs = opcoes.agoraMs ?? Date.now();
  const aleatorios = (opcoes.bytesAleatorios ?? bytesDoSistema)(10);
  if (aleatorios.length < 10) throw new Error('A fonte de bytes precisa fornecer 10 bytes');

  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, Math.floor(agoraMs / 2 ** 32));
  view.setUint32(2, agoraMs % 2 ** 32);
  bytes.set(aleatorios.subarray(0, 10), 6);
  view.setUint8(6, (view.getUint8(6) & 0x0f) | 0x70);
  view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80);

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
