import { Circle, ClipPath, Defs, Ellipse, G, Mask, Path, Polygon, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Lua dormindo, modo economia: lua com recorte (mascara) e "zzz" em tons de violeta. */
export function ConteudoPausa({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.35} r={0.85} fx={0.2} fy={0.25} paradas={[[0, '#FFF6D0'], [0.5, '#FFC933'], [1, '#FF7A59']]} />
        <Linear id={id('g2')} x1={0} y1={0} x2={1} y2={1} paradas={[[0, '#7B5CFF'], [1, '#3346F0']]} />
        <Mask id={id('mascara')} maskUnits="userSpaceOnUse" x={0} y={0} width={200} height={200}>
          <Rect x={0} y={0} width={200} height={200} fill="#FFFFFF" />
          <Circle cx={124} cy={84} r={50} fill="#000000" />
        </Mask>
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-rosa')} paradas={brilho('#E8407A', 0.3)} />
        <Radial id={id('sombra')} paradas={sombra('#7B5CFF')} />
        <ClipPath id={id('c1')}>
          <Circle cx={92} cy={106} r={60} />
        </ClipPath>
      </Defs>
      <Ellipse cx={92} cy={176} rx={50} ry={7} fill={`url(#${id('sombra')})`} />
      <G mask={`url(#${id('mascara')})`}>
        <Circle cx={92} cy={106} r={60} fill={`url(#${id('g1')})`} />
        <G clipPath={`url(#${id('c1')})`}>
          <Ellipse cx={60} cy={96} rx={22} ry={38} fill={`url(#${id('brilho')})`} />
          <Ellipse cx={100} cy={156} rx={42} ry={12} fill={`url(#${id('brilho-rosa')})`} />
        </G>
        <Path d="M52 110 Q61 119 70 110 Q61 114 52 110 Z" fill="#7B5CFF" opacity={0.75} />
        <Ellipse cx={66} cy={128} rx={7} ry={4} fill="#E8407A" opacity={0.4} />
        <Ellipse cx={50} cy={82} rx={4} ry={10} transform="rotate(25 50 82)" fill="#FFFFFF" opacity={0.85} />
      </G>
      <G fill={`url(#${id('g2')})`} stroke={`url(#${id('g2')})`} strokeWidth={3} strokeLinejoin="round">
        <Polygon
          points="126,108 144,108 144,113 133.6,121 144,121 144,126 126,126 126,121 136.4,113 126,113"
          opacity={0.6}
        />
        <Polygon
          points="146,78 170,78 170,84.7 156.1,95.3 170,95.3 170,102 146,102 146,95.3 159.9,84.7 146,84.7"
          opacity={0.78}
        />
        <Polygon
          points="160,38 188,38 188,45.8 171.8,58.2 188,58.2 188,66 160,66 160,58.2 176.2,45.8 160,45.8"
          opacity={0.95}
        />
      </G>
    </>
  );
}
