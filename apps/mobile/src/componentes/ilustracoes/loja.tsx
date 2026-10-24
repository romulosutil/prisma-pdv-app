import { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Toldo listrado (forma e recorte). */
const TOLDO =
  'M34 62 Q34 52 44 52 H156 Q166 52 166 62 V84 Q155 98 144 84 Q133 98 122 84 Q111 98 100 84 Q89 98 78 84 Q67 98 56 84 Q45 98 34 84 Z';

/** Fachada de loja com toldo listrado. */
export function ConteudoLoja({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#FFFFFF'], [0.45, '#FFF3CC'], [1, '#FFC9A8']]} />
        <Linear id={id('g2')} x1={0} y1={0} x2={0} y2={1} paradas={[[0, '#FF9E80'], [1, '#E8407A']]} />
        <Linear id={id('g3')} x1={0} y1={0} x2={0} y2={1} paradas={[[0, '#FFFFFF'], [1, '#FFE9B0']]} />
        <Radial id={id('g4')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#B9B0FF'], [0.5, '#7B5CFF'], [1, '#3346F0']]} />
        <Radial id={id('g5')} cx={0.3} cy={0.25} r={0.9} fx={0.2} fy={0.15} paradas={[[0, '#E6FFFB'], [0.55, '#8FE3DA'], [1, '#2EC4B6']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#FF7A59')} />
        <ClipPath id={id('c1')}>
          <Rect x={42} y={66} width={116} height={98} rx={12} />
        </ClipPath>
        <ClipPath id={id('c2')}>
          <Path d={TOLDO} />
        </ClipPath>
      </Defs>
      <Ellipse cx={100} cy={174} rx={66} ry={7} fill={`url(#${id('sombra')})`} />
      <Rect x={38} y={40} width={124} height={16} rx={8} fill={`url(#${id('g4')})`} />
      <Rect x={42} y={66} width={116} height={98} rx={12} fill={`url(#${id('g1')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Ellipse cx={66} cy={96} rx={32} ry={26} fill={`url(#${id('brilho')})`} />
      </G>
      <Rect x={52} y={106} width={30} height={28} rx={7} fill={`url(#${id('g5')})`} />
      <Rect x={118} y={106} width={30} height={28} rx={7} fill={`url(#${id('g5')})`} />
      <Ellipse cx={60} cy={112} rx={5} ry={2} fill="#FFFFFF" opacity={0.8} />
      <Ellipse cx={126} cy={112} rx={5} ry={2} fill="#FFFFFF" opacity={0.8} />
      <Path d="M86 164 V122 Q86 110 98 110 H102 Q114 110 114 122 V164 Z" fill={`url(#${id('g4')})`} />
      <Ellipse cx={108} cy={140} rx={2.6} ry={2.6} fill="#FFC933" />
      <Rect x={36} y={158} width={128} height={10} rx={5} fill="#FF9E80" />
      <Path d={TOLDO} fill={`url(#${id('g3')})`} />
      <G clipPath={`url(#${id('c2')})`}>
        <Rect x={34} y={50} width={22} height={50} fill={`url(#${id('g2')})`} />
        <Rect x={78} y={50} width={22} height={50} fill={`url(#${id('g2')})`} />
        <Rect x={122} y={50} width={22} height={50} fill={`url(#${id('g2')})`} />
        <Ellipse cx={66} cy={62} rx={32} ry={9} fill={`url(#${id('brilho')})`} />
      </G>
      <Ellipse cx={62} cy={44} rx={14} ry={2.4} fill="#FFFFFF" opacity={0.8} />
    </>
  );
}
