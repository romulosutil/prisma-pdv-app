import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { cores } from '@/tema';

type Forma =
  | { d: string }
  | { rect: readonly [x: number, y: number, w: number, h: number, rx: number] }
  | { circulo: readonly [cx: number, cy: number, r: number] };

const ICONES = {
  voltar: [{ d: 'M15 18l-6-6 6-6' }],
  chevronDireita: [{ d: 'M9 18l6-6-6-6' }],
  fechar: [{ d: 'M18 6L6 18M6 6l12 12' }],
  check: [{ d: 'M20 6L9 17l-5-5' }],
  mais: [{ d: 'M12 5v14M5 12h14' }],
  menos: [{ d: 'M5 12h14' }],
  apagar: [{ d: 'M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z' }, { d: 'M16 9.5l-5 5M11 9.5l5 5' }],
  inicio: [{ d: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' }],
  produtos: [{ d: 'M21 8l-9-5-9 5 9 5 9-5z' }, { d: 'M3 8v8l9 5 9-5V8M12 13v8' }],
  caixa: [{ rect: [3, 11, 18, 9, 2] }, { d: 'M7 11V5h10v6M10 15.5h4' }],
  ajustes: [
    { d: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1' },
    { circulo: [15, 6, 2] },
    { circulo: [9, 12, 2] },
    { circulo: [17, 18, 2] },
  ],
  codigoBarras: [{ d: 'M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14' }],
  moldura: [{ d: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10' }],
  cadastrarBipando: [{ d: 'M3 5v10M6 5v10M10 5v10M13 5v10M17 5v4M18 14v7M14.5 17.5h7' }],
  calculadora: [{ rect: [5, 3, 14, 18, 2] }, { d: 'M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01' }],
  fecharCaixa: [{ rect: [5, 4, 14, 17, 2] }, { d: 'M9 4V3h6v1M9 13l2 2 4-4' }],
  pix: [{ d: 'M12 3l9 9-9 9-9-9z' }, { d: 'M9 12h6' }],
  dinheiro: [{ rect: [2, 6, 20, 12, 2] }, { circulo: [12, 12, 2.5] }, { d: 'M6 12h.01M18 12h.01' }],
  cartao: [{ rect: [2, 5, 20, 14, 2] }, { d: 'M2 10h20' }],
  online: [{ d: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' }, { d: 'M9.5 14.5l2 2 3.5-3.5' }],
  offline: [{ d: 'M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3' }, { d: 'M1 1l22 22' }],
  sincronizar: [{ d: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5' }],
  relogio: [{ circulo: [12, 12, 10] }, { d: 'M12 6v6l4 2' }],
  lua: [{ d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' }],
  vibrar: [{ rect: [8, 3, 8, 18, 2] }, { d: 'M4 9v6M20 9v6' }],
  alerta: [{ d: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' }, { d: 'M12 9v4M12 17h.01' }],
  info: [{ circulo: [12, 12, 10] }, { d: 'M12 16v-4M12 8h.01' }],
  erro: [{ circulo: [12, 12, 10] }, { d: 'M12 8v4M12 16h.01' }],
  lupa: [{ circulo: [11, 11, 7] }, { d: 'M21 21l-4.3-4.3' }],
  lixeira: [{ d: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6' }],
  cadeado: [{ rect: [5, 11, 14, 10, 2] }, { d: 'M8 11V7a4 4 0 0 1 8 0v4' }],
  copiar: [{ rect: [9, 9, 11, 11, 2] }, { d: 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1' }],
  chevronBaixo: [{ d: 'M6 9l6 6 6-6' }],
  chevronCima: [{ d: 'M18 15l-6-6-6 6' }],
  lanterna: [{ d: 'M9 2h6v4l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V2z' }, { d: 'M12 12v3' }],
  lanternaDesligada: [{ d: 'M9 2h6v4l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V2z' }, { d: 'M12 12v3M3 3l18 18' }],
  dividir: [{ d: 'M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3M15 9l6-6' }],
  recibo: [{ d: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z' }, { d: 'M9 8h6M9 12h6' }],
} as const satisfies Record<string, readonly Forma[]>;

export type NomeIcone = keyof typeof ICONES;

export interface IconeProps {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
  espessura?: number;
}

/** Ícone de traço (24×24, linha arredondada). Decorativo: o rótulo acessível fica no elemento que o contém. */
export function Icone({ nome, tamanho = 24, cor = cores.ink, espessura = 2 }: IconeProps) {
  const formas: readonly Forma[] = ICONES[nome];
  return (
    <View aria-hidden>
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeLinejoin="round">
      {formas.map((forma, i) => {
        if ('d' in forma) return <Path key={i} d={forma.d} />;
        if ('rect' in forma) {
          const [x, y, width, height, rx] = forma.rect;
          return <Rect key={i} x={x} y={y} width={width} height={height} rx={rx} />;
        }
        const [cx, cy, r] = forma.circulo;
        return <Circle key={i} cx={cx} cy={cy} r={r} />;
      })}
    </Svg>
    </View>
  );
}
