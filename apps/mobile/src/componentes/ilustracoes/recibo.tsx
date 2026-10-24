import { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Recibo com borda serrilhada (forma e recorte). */
const RECIBO =
  'M58 46 H142 Q148 98 142 150 L135 158 L128 150 L121 158 L114 150 L107 158 L100 150 L93 158 L86 150 L79 158 L72 150 L65 158 L58 150 Q52 98 58 46 Z';

/** Recibo curvado com borda serrilhada. */
export function ConteudoRecibo({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#FFFFFF'], [0.5, '#FFF3CC'], [1, '#FFC9A8']]} />
        <Radial id={id('g2')} cx={0.3} cy={0.25} r={0.95} fx={0.2} fy={0.15} paradas={[[0, '#FFC2A8'], [0.5, '#FF7A59'], [1, '#E8407A']]} />
        <Linear id={id('g3')} x1={0} y1={0} x2={1} y2={0} paradas={[[0, '#3346F0'], [1, '#7B5CFF']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-coral')} paradas={brilho('#FF7A59', 0.2)} />
        <Radial id={id('sombra')} paradas={sombra('#FF7A59')} />
        <ClipPath id={id('c1')}>
          <Path d={RECIBO} />
        </ClipPath>
      </Defs>
      <Ellipse cx={104} cy={172} rx={52} ry={7} fill={`url(#${id('sombra')})`} />
      <G transform="rotate(6 100 100)">
        <Path d={RECIBO} fill={`url(#${id('g1')})`} />
        <G clipPath={`url(#${id('c1')})`}>
          <Ellipse cx={80} cy={74} rx={30} ry={32} fill={`url(#${id('brilho')})`} />
          <Ellipse cx={141} cy={105} rx={18} ry={68} fill={`url(#${id('brilho-coral')})`} />
        </G>
        <Rect x={68} y={64} width={48} height={6} rx={3} fill={`url(#${id('g3')})`} opacity={0.5} />
        <Rect x={68} y={78} width={64} height={6} rx={3} fill={`url(#${id('g3')})`} opacity={0.5} />
        <Rect x={68} y={92} width={40} height={6} rx={3} fill={`url(#${id('g3')})`} opacity={0.5} />
        <Rect x={68} y={114} width={64} height={10} rx={5} fill="#E8407A" opacity={0.75} />
        <Rect x={50} y={32} width={100} height={20} rx={10} fill={`url(#${id('g2')})`} />
        <Ellipse cx={82} cy={37} rx={22} ry={2.5} fill="#FFFFFF" opacity={0.8} />
      </G>
    </>
  );
}
