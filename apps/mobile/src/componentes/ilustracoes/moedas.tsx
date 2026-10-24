import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Frente da cédula dobrada (forma e recorte). */
const CEDULA = 'M92 58 Q92 52 98 51 L140 44 L146 120 L104 130 Q98 131 97 125 Z';

/** Pilha de moedas e cédula dobrada. */
export function ConteudoMoedas({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.34} cy={0.3} r={0.8} fx={0.22} fy={0.18} paradas={[[0, '#FFF4C2'], [0.5, '#FFC933'], [1, '#FF7A59']]} />
        <Linear id={id('g2')} x1={0} y1={0} x2={1} y2={0} paradas={[[0, '#FF9A6B'], [0.5, '#FF7A59'], [1, '#E8407A']]} />
        <Radial id={id('g3')} cx={0.3} cy={0.25} r={0.9} fx={0.2} fy={0.15} paradas={[[0, '#F0FFC2'], [0.5, '#B6E83A'], [1, '#1FAF5F']]} />
        <Radial id={id('g4')} cx={0.3} cy={0.25} r={0.9} fx={0.2} fy={0.15} paradas={[[0, '#BFF5E4'], [0.5, '#2EC4B6'], [1, '#1FAF5F']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#1FAF5F')} />
        <ClipPath id={id('c1')}>
          <Path d={CEDULA} />
        </ClipPath>
        <ClipPath id={id('c2')}>
          <Ellipse cx={75} cy={106} rx={34} ry={11} />
        </ClipPath>
      </Defs>
      <Ellipse cx={104} cy={164} rx={74} ry={8} fill={`url(#${id('sombra')})`} />
      <Path d="M140 44 L176 54 Q182 56 182 62 L182 124 Q182 130 176 129 L146 120 Z" fill={`url(#${id('g4')})`} />
      <Rect x={152} y={66} width={22} height={5} rx={2.5} fill="#FFFFFF" opacity={0.4} />
      <Path d={CEDULA} fill={`url(#${id('g3')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Ellipse cx={108} cy={66} rx={26} ry={16} fill={`url(#${id('brilho')})`} />
      </G>
      <Circle cx={120} cy={88} r={13} fill="#FFFFFF" opacity={0.45} />
      <Circle cx={120} cy={88} r={6} fill="#1FAF5F" opacity={0.5} />
      <Path d="M38 142 V152 A34 11 0 0 0 106 152 V142 Z" fill={`url(#${id('g2')})`} />
      <Ellipse cx={72} cy={142} rx={34} ry={11} fill={`url(#${id('g1')})`} />
      <Path d="M40 130 V140 A34 11 0 0 0 108 140 V130 Z" fill={`url(#${id('g2')})`} />
      <Ellipse cx={74} cy={130} rx={34} ry={11} fill={`url(#${id('g1')})`} />
      <Path d="M37 118 V128 A34 11 0 0 0 105 128 V118 Z" fill={`url(#${id('g2')})`} />
      <Ellipse cx={71} cy={118} rx={34} ry={11} fill={`url(#${id('g1')})`} />
      <Path d="M41 106 V116 A34 11 0 0 0 109 116 V106 Z" fill={`url(#${id('g2')})`} />
      <Ellipse cx={75} cy={106} rx={34} ry={11} fill={`url(#${id('g1')})`} />
      <G clipPath={`url(#${id('c2')})`}>
        <Ellipse cx={62} cy={102} rx={24} ry={8} fill={`url(#${id('brilho')})`} />
      </G>
      <Ellipse cx={75} cy={106} rx={23} ry={7} fill="#FFE58A" opacity={0.7} />
      <Ellipse cx={60} cy={102} rx={10} ry={2.4} fill="#FFFFFF" opacity={0.85} />
    </>
  );
}
