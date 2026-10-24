import { LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/** Parada de gradiente: [offset, cor, opacidade opcional]. */
export type Parada = readonly [offset: number, cor: string, opacidade?: number];

/** `p` é o prefixo único desta instância (kind + useId), usado em todos os ids de `defs`. */
export interface ConteudoIlustraProps {
  p: string;
}

interface RadialProps {
  id: string;
  paradas: readonly Parada[];
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
}

/** radialGradient em unidades de caixa (padrão SVG). Foco padrão no centro. */
export function Radial({ id, paradas, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy }: RadialProps) {
  return (
    <RadialGradient id={id} cx={cx} cy={cy} r={r} fx={fx} fy={fy}>
      {paradas.map(([offset, cor, opacidade = 1], i) => (
        <Stop key={i} offset={offset} stopColor={cor} stopOpacity={opacidade} />
      ))}
    </RadialGradient>
  );
}

interface LinearProps {
  id: string;
  paradas: readonly Parada[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  unidades?: 'userSpaceOnUse' | 'objectBoundingBox';
}

/** linearGradient (padrão horizontal, em unidades de caixa). */
export function Linear({ id, paradas, x1 = 0, y1 = 0, x2 = 1, y2 = 0, unidades }: LinearProps) {
  return (
    <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits={unidades}>
      {paradas.map(([offset, cor, opacidade = 1], i) => (
        <Stop key={i} offset={offset} stopColor={cor} stopOpacity={opacidade} />
      ))}
    </LinearGradient>
  );
}

/** Realce de luz interna: a cor desvanece até a borda. Substitui o feGaussianBlur (use dentro de ClipPath). */
export const brilho = (cor = '#FFFFFF', opacidade = 0.6): Parada[] => [
  [0, cor, opacidade],
  [1, cor, 0],
];

/** Sombra de contato colorida: opacidade .18 no centro, 0 na borda. Substitui a elipse desfocada. */
export const sombra = (cor: string): Parada[] => [
  [0, cor, 0.18],
  [1, cor, 0],
];
