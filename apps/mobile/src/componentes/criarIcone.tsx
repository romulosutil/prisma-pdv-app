import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { cores } from '@/tema';

export type Forma =
  | { d: string }
  | { rect: readonly [x: number, y: number, w: number, h: number, rx: number] }
  | { circulo: readonly [cx: number, cy: number, r: number] };

export interface IconeDaTelaProps<N extends string> {
  nome: N;
  tamanho?: number;
  cor?: string;
  espessura?: number;
}

/** Cria um componente de ícone de traço (24×24, linha arredondada) com o mesmo desenho do `Icone` do app. */
export function criarIcone<N extends string>(formasPorNome: Record<N, readonly Forma[]>) {
  return function IconeDaTela({ nome, tamanho = 24, cor = cores.ink, espessura = 2 }: IconeDaTelaProps<N>) {
    return (
      <View aria-hidden>
        <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeLinejoin="round">
          {formasPorNome[nome].map((forma, i) => {
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
  };
}
