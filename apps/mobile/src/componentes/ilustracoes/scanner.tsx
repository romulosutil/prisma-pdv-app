import { ClipPath, Defs, Ellipse, G, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Barras do código: [x, largura, rx]. */
const BARRAS: readonly (readonly [number, number, number])[] = [
  [72, 4, 1.6], [79, 2, 1], [84, 6, 1.6], [93, 3, 1.4], [99, 2, 1], [104, 5, 1.6],
  [112, 2, 1], [117, 4, 1.6], [124, 6, 1.6], [133, 2, 1], [138, 3, 1.4], [144, 4, 1.6],
];

/** Etiqueta de código de barras com feixe de luz. */
export function ConteudoScanner({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.36} cy={0.3} r={0.85} fx={0.24} fy={0.18} paradas={[[0, '#FFFFFF'], [0.45, '#FFF3CC'], [1, '#FFB79E']]} />
        <Radial id={id('g2')} cx={0.36} cy={0.3} r={0.85} fx={0.24} fy={0.18} paradas={[[0, '#FFB08F'], [0.6, '#FF7A59'], [1, '#E8407A']]} />
        <Linear id={id('g3')} x1={0} y1={0} x2={0} y2={1} paradas={[[0, '#3346F0'], [1, '#7B5CFF']]} />
        <Linear
          id={id('g4')}
          paradas={[[0, '#FFC933', 0], [0.2, '#FFC933'], [0.5, '#FFE58A'], [0.8, '#FF7A59'], [1, '#FF7A59', 0]]}
        />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-amarelo')} paradas={brilho('#FFC933', 0.55)} />
        <Radial id={id('sombra')} paradas={sombra('#3346F0')} />
        <ClipPath id={id('c1')}>
          <Rect x={40} y={56} width={120} height={88} rx={20} />
        </ClipPath>
      </Defs>
      <Ellipse cx={102} cy={166} rx={58} ry={7} fill={`url(#${id('sombra')})`} />
      <G transform="rotate(-8 100 100)">
        <Rect x={45} y={62} width={120} height={88} rx={20} fill={`url(#${id('g2')})`} />
        <Rect x={40} y={56} width={120} height={88} rx={20} fill={`url(#${id('g1')})`} />
        <G clipPath={`url(#${id('c1')})`}>
          <Ellipse cx={82} cy={74} rx={48} ry={24} fill={`url(#${id('brilho')})`} />
        </G>
        <Ellipse cx={57} cy={74} rx={6} ry={6} fill="#FF9B7F" opacity={0.55} />
        <G fill={`url(#${id('g3')})`} opacity={0.72}>
          {BARRAS.map(([x, largura, rx], i) => (
            <Rect key={i} x={x} y={84} width={largura} height={42} rx={rx} />
          ))}
        </G>
        <Ellipse cx={80} cy={63} rx={14} ry={3.2} fill="#FFFFFF" opacity={0.9} />
      </G>
      <Ellipse cx={100} cy={106} rx={84} ry={9} fill={`url(#${id('brilho-amarelo')})`} />
      <Rect x={14} y={103} width={172} height={6} rx={3} fill={`url(#${id('g4')})`} />
      <Rect x={44} y={105} width={112} height={2} rx={1} fill="#FFFFFF" opacity={0.8} />
    </>
  );
}
