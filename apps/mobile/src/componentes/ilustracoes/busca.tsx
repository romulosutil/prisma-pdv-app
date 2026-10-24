import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Lupa sobre embalagem: anel de vidro e cabo rotacionado. */
export function ConteudoBusca({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#FFF1B8'], [0.45, '#FFC933'], [1, '#FF7A59']]} />
        <Linear id={id('g2')} x1={0} y1={0} x2={1} y2={0} paradas={[[0, '#FFB39A'], [1, '#E8407A']]} />
        <Radial id={id('g3')} cx={0.3} cy={0.25} r={0.9} fx={0.2} fy={0.15} paradas={[[0, '#C9B8FF'], [0.5, '#7B5CFF'], [1, '#3346F0']]} />
        <Radial id={id('g4')} cx={0.35} cy={0.3} r={0.8} fx={0.25} fy={0.2} paradas={[[0, '#FFFFFF'], [0.6, '#BFF1EC'], [1, '#2EC4B6']]} />
        <Linear id={id('g5')} x1={0} y1={0} x2={1} y2={0} paradas={[[0, '#FFB39A'], [0.6, '#E8407A'], [1, '#7B5CFF']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#7B5CFF')} />
        <ClipPath id={id('c1')}>
          <Rect x={34} y={62} width={82} height={102} rx={14} />
        </ClipPath>
        <ClipPath id={id('c2')}>
          <Circle cx={122} cy={92} r={27} />
        </ClipPath>
      </Defs>
      <Ellipse cx={104} cy={172} rx={66} ry={7} fill={`url(#${id('sombra')})`} />
      <Rect x={34} y={62} width={82} height={102} rx={14} fill={`url(#${id('g1')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Rect x={34} y={62} width={82} height={22} fill={`url(#${id('g2')})`} />
        <Ellipse cx={56} cy={96} rx={24} ry={28} fill={`url(#${id('brilho')})`} />
      </G>
      <Circle cx={66} cy={124} r={16} fill="#B6E83A" opacity={0.9} />
      <Ellipse cx={61} cy={118} rx={5} ry={3} fill="#FFFFFF" opacity={0.7} />
      <Rect x={52} y={146} width={40} height={5} rx={2.5} fill="#FFFFFF" opacity={0.5} />
      <Ellipse cx={50} cy={68} rx={10} ry={2} fill="#FFFFFF" opacity={0.8} />
      <Rect x={146} y={110} width={44} height={16} rx={8} transform="rotate(45 146 118)" fill={`url(#${id('g5')})`} />
      <Circle cx={122} cy={92} r={27} fill={`url(#${id('g4')})`} opacity={0.6} />
      <G clipPath={`url(#${id('c2')})`}>
        <Ellipse cx={112} cy={80} rx={14} ry={10} fill={`url(#${id('brilho')})`} />
      </G>
      <Path
        d="M86 92 A36 36 0 1 0 158 92 A36 36 0 1 0 86 92 Z M95 92 A27 27 0 1 1 149 92 A27 27 0 1 1 95 92 Z"
        fillRule="evenodd"
        fill={`url(#${id('g3')})`}
      />
      <Ellipse cx={100} cy={68} rx={9} ry={3} transform="rotate(-40 100 68)" fill="#FFFFFF" opacity={0.85} />
    </>
  );
}
