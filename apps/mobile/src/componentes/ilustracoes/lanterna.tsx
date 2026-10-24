import { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Corpo da cabeça da lanterna (forma e recorte). */
const CABECA = 'M86 84 Q86 80 90 79 L112 72 Q120 70 120 78 V124 Q120 132 112 130 L90 123 Q86 122 86 118 Z';

/** Lanterna acesa com facho de luz. */
export function ConteudoLanterna({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.2} r={0.9} fx={0.2} fy={0.1} paradas={[[0, '#C9B8FF'], [0.5, '#7B5CFF'], [1, '#3346F0']]} />
        <Radial id={id('g2')} cx={0.3} cy={0.22} r={0.9} fx={0.2} fy={0.12} paradas={[[0, '#FFC2A8'], [0.5, '#FF7A59'], [1, '#E8407A']]} />
        <Linear
          id={id('g3')}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          paradas={[[0, '#FFE58A', 0.95], [0.5, '#FFC933', 0.6], [1, '#FF7A59', 0]]}
        />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-facho')} paradas={brilho('#FFC933', 0.45)} />
        <Radial id={id('sombra')} paradas={sombra('#7B5CFF')} />
        <ClipPath id={id('c1')}>
          <Rect x={30} y={88} width={62} height={26} rx={13} />
        </ClipPath>
        <ClipPath id={id('c2')}>
          <Path d={CABECA} />
        </ClipPath>
      </Defs>
      <Ellipse cx={72} cy={168} rx={52} ry={7} fill={`url(#${id('sombra')})`} />
      <G transform="translate(-6 12) rotate(-28 100 100)">
        <Ellipse cx={152} cy={101} rx={46} ry={64} fill={`url(#${id('brilho-facho')})`} />
        <Path d="M116 80 L186 52 Q196 101 186 150 L116 122 Z" fill={`url(#${id('g3')})`} />
        <Rect x={30} y={88} width={62} height={26} rx={13} fill={`url(#${id('g1')})`} />
        <G clipPath={`url(#${id('c1')})`}>
          <Ellipse cx={56} cy={92} rx={28} ry={7} fill={`url(#${id('brilho')})`} />
        </G>
        <Rect x={70} y={89} width={3} height={24} rx={1.5} fill="#FFFFFF" opacity={0.25} />
        <Rect x={77} y={89} width={3} height={24} rx={1.5} fill="#FFFFFF" opacity={0.25} />
        <Rect x={50} y={83} width={16} height={8} rx={4} fill="#FFC933" />
        <Path d={CABECA} fill={`url(#${id('g2')})`} />
        <G clipPath={`url(#${id('c2')})`}>
          <Ellipse cx={98} cy={84} rx={14} ry={10} fill={`url(#${id('brilho')})`} />
        </G>
        <Ellipse cx={119} cy={101} rx={5} ry={24} fill="#FFF6D0" />
        <Ellipse cx={48} cy={93} rx={12} ry={2} fill="#FFFFFF" opacity={0.85} />
      </G>
    </>
  );
}
