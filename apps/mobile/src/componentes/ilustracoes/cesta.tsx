import { ClipPath, Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Radial, sombra } from './comum';

/** Corpo da cesta (usado como forma e como recorte). */
const CORPO = 'M36 98 H164 Q171 98 169 106 L155 158 Q152 168 142 168 H58 Q48 168 45 158 L31 106 Q29 98 36 98 Z';

/** Cesta de compras com pão, garrafa e fruta. */
export function ConteudoCesta({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.34} cy={0.25} r={0.9} fx={0.22} fy={0.14} paradas={[[0, '#FFC2A8'], [0.5, '#FF7A59'], [1, '#E8407A']]} />
        <Radial id={id('g2')} cx={0.3} cy={0.2} r={0.9} fx={0.2} fy={0.1} paradas={[[0, '#C9B8FF'], [0.55, '#7B5CFF'], [1, '#3346F0']]} />
        <Radial id={id('g3')} cx={0.35} cy={0.3} r={0.85} fx={0.25} fy={0.2} paradas={[[0, '#FFF1B8'], [0.5, '#FFC933'], [1, '#FF7A59']]} />
        <Radial id={id('g4')} cx={0.32} cy={0.28} r={0.85} fx={0.2} fy={0.18} paradas={[[0, '#C8F7F1'], [0.5, '#2EC4B6'], [1, '#3346F0']]} />
        <Radial id={id('g5')} cx={0.35} cy={0.3} r={0.8} fx={0.24} fy={0.2} paradas={[[0, '#F0FFC2'], [0.45, '#B6E83A'], [1, '#1FAF5F']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#E8407A')} />
        <ClipPath id={id('c1')}>
          <Path d={CORPO} />
        </ClipPath>
      </Defs>
      <Ellipse cx={100} cy={174} rx={62} ry={7} fill={`url(#${id('sombra')})`} />
      <Path d="M56 102 C56 44 144 44 144 102 L132 102 C132 60 68 60 68 102 Z" fill={`url(#${id('g2')})`} />
      <G transform="rotate(-24 74 76)">
        <Ellipse cx={74} cy={76} rx={14} ry={36} fill={`url(#${id('g3')})`} />
        <Ellipse cx={74} cy={58} rx={6} ry={2.2} fill="#FFF6D6" opacity={0.75} />
        <Ellipse cx={74} cy={74} rx={6} ry={2.2} fill="#FFF6D6" opacity={0.75} />
        <Ellipse cx={70} cy={52} rx={4} ry={9} fill={`url(#${id('brilho')})`} />
      </G>
      <G transform="rotate(10 128 70)">
        <Rect x={119.5} y={26} width={17} height={9} rx={3.5} fill="#E8407A" />
        <Rect x={121} y={32} width={14} height={24} rx={5} fill={`url(#${id('g4')})`} />
        <Rect x={114} y={50} width={28} height={58} rx={12} fill={`url(#${id('g4')})`} />
        <Rect x={114} y={70} width={28} height={13} fill="#FFC933" opacity={0.9} />
        <Ellipse cx={121} cy={62} rx={3} ry={6} fill="#FFFFFF" opacity={0.8} />
      </G>
      <Circle cx={100} cy={86} r={20} fill={`url(#${id('g5')})`} />
      <Ellipse cx={93} cy={78} rx={7} ry={5} fill="#FFFFFF" opacity={0.7} />
      <Ellipse cx={108} cy={64} rx={8} ry={3.6} transform="rotate(-30 108 64)" fill="#1FAF5F" />
      <Path d={CORPO} fill={`url(#${id('g1')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Ellipse cx={70} cy={118} rx={42} ry={18} fill={`url(#${id('brilho')})`} />
        <Rect x={30} y={120} width={140} height={6} rx={3} fill="#FFFFFF" opacity={0.22} />
        <Rect x={30} y={137} width={140} height={6} rx={3} fill="#FFFFFF" opacity={0.2} />
        <Rect x={30} y={153} width={140} height={6} rx={3} fill="#FFFFFF" opacity={0.16} />
      </G>
      <Rect x={28} y={94} width={144} height={14} rx={7} fill="#FF8A6B" />
      <Ellipse cx={62} cy={98} rx={20} ry={2.5} fill="#FFFFFF" opacity={0.85} />
    </>
  );
}
