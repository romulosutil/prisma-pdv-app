import { ClipPath, Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Radial, sombra } from './comum';

/** Celular recebendo cartão por aproximação (ondas NFC e cartão). */
export function ConteudoTap({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.22} r={0.95} fx={0.2} fy={0.12} paradas={[[0, '#B9B0FF'], [0.5, '#7B5CFF'], [1, '#3346F0']]} />
        <Radial id={id('g2')} cx={0.3} cy={0.22} r={0.95} fx={0.2} fy={0.12} paradas={[[0, '#FFFFFF'], [0.5, '#CFF7F2'], [1, '#7FDCD2']]} />
        <Radial id={id('g3')} cx={0.3} cy={0.25} r={0.95} fx={0.18} fy={0.14} paradas={[[0, '#FFE7A3'], [0.4, '#FFC933'], [0.8, '#FF7A59'], [1, '#E8407A']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#7B5CFF')} />
        <ClipPath id={id('c1')}>
          <Rect x={48} y={28} width={76} height={136} rx={20} />
        </ClipPath>
        <ClipPath id={id('c2')}>
          <Rect x={56} y={40} width={60} height={112} rx={13} />
        </ClipPath>
        <ClipPath id={id('c3')}>
          <Rect x={98} y={102} width={80} height={52} rx={10} />
        </ClipPath>
      </Defs>
      <Ellipse cx={106} cy={174} rx={62} ry={7} fill={`url(#${id('sombra')})`} />
      <G transform="rotate(-8 86 96)">
        <Rect x={48} y={28} width={76} height={136} rx={20} fill={`url(#${id('g1')})`} />
        <G clipPath={`url(#${id('c1')})`}>
          <Ellipse cx={62} cy={54} rx={22} ry={42} fill={`url(#${id('brilho')})`} />
        </G>
        <Rect x={56} y={40} width={60} height={112} rx={13} fill={`url(#${id('g2')})`} />
        <G clipPath={`url(#${id('c2')})`}>
          <Ellipse cx={72} cy={60} rx={26} ry={22} fill={`url(#${id('brilho')})`} />
        </G>
        <Rect x={76} y={32.5} width={20} height={3.5} rx={1.75} fill="#FFFFFF" opacity={0.5} />
        <Circle cx={86} cy={92} r={15} fill="#2EC4B6" opacity={0.35} />
        <Circle cx={86} cy={92} r={6} fill="#3346F0" opacity={0.6} />
        <Ellipse cx={58} cy={44} rx={3} ry={9} fill="#FFFFFF" opacity={0.8} />
      </G>
      <G fill="none" strokeLinecap="round" strokeWidth={7}>
        <Path d="M131.5 70.3 A20 20 0 0 1 147.7 86.5" stroke="#2EC4B6" opacity={0.95} />
        <Path d="M133.7 57.5 A33 33 0 0 1 160.5 84.3" stroke="#3346F0" opacity={0.72} />
        <Path d="M136 44.7 A46 46 0 0 1 173.3 82" stroke="#7B5CFF" opacity={0.5} />
      </G>
      <G transform="rotate(-16 138 128)">
        <Rect x={98} y={102} width={80} height={52} rx={10} fill={`url(#${id('g3')})`} />
        <G clipPath={`url(#${id('c3')})`}>
          <Ellipse cx={118} cy={110} rx={32} ry={13} fill={`url(#${id('brilho')})`} />
        </G>
        <Rect x={108} y={116} width={16} height={12} rx={3} fill="#FFF3CC" opacity={0.9} />
        <Rect x={108} y={138} width={46} height={5} rx={2.5} fill="#FFFFFF" opacity={0.55} />
        <Ellipse cx={114} cy={106} rx={10} ry={2.2} fill="#FFFFFF" opacity={0.85} />
      </G>
    </>
  );
}
