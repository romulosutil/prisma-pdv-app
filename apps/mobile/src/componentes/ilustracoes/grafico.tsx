import { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Gráfico de barras subindo com seta. */
export function ConteudoGrafico({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#F0FFC2'], [0.45, '#B6E83A'], [1, '#1FAF5F']]} />
        <Radial id={id('g2')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#C8F7F1'], [0.45, '#2EC4B6'], [1, '#3346F0']]} />
        <Radial id={id('g3')} cx={0.3} cy={0.2} r={0.95} fx={0.2} fy={0.1} paradas={[[0, '#E3DBFF'], [0.45, '#7B5CFF'], [1, '#E8407A']]} />
        <Linear
          id={id('g4')}
          x1={30}
          y1={112}
          x2={156}
          y2={35}
          unidades="userSpaceOnUse"
          paradas={[[0, '#FFC933'], [1, '#FF7A59']]}
        />
        <Radial id={id('g5')} cx={0.35} cy={0.3} r={0.85} fx={0.25} fy={0.2} paradas={[[0, '#FFD3A8'], [0.5, '#FF7A59'], [1, '#E8407A']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#3346F0')} />
        <ClipPath id={id('c1')}>
          <Rect x={36} y={124} width={32} height={44} rx={11} />
          <Rect x={84} y={98} width={32} height={70} rx={11} />
          <Rect x={132} y={68} width={32} height={100} rx={11} />
        </ClipPath>
      </Defs>
      <Ellipse cx={100} cy={174} rx={72} ry={7} fill={`url(#${id('sombra')})`} />
      <Rect x={36} y={124} width={32} height={44} rx={11} fill={`url(#${id('g1')})`} />
      <Rect x={84} y={98} width={32} height={70} rx={11} fill={`url(#${id('g2')})`} />
      <Rect x={132} y={68} width={32} height={100} rx={11} fill={`url(#${id('g3')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Ellipse cx={48} cy={136} rx={11} ry={18} fill={`url(#${id('brilho')})`} />
        <Ellipse cx={96} cy={114} rx={11} ry={26} fill={`url(#${id('brilho')})`} />
        <Ellipse cx={144} cy={88} rx={11} ry={34} fill={`url(#${id('brilho')})`} />
      </G>
      <Ellipse cx={47} cy={130} rx={6} ry={2.2} fill="#FFFFFF" opacity={0.85} />
      <Ellipse cx={95} cy={104} rx={6} ry={2.2} fill="#FFFFFF" opacity={0.85} />
      <Ellipse cx={143} cy={74} rx={6} ry={2.2} fill="#FFFFFF" opacity={0.85} />
      <Path
        d="M30 112 C64 106 92 88 116 68 C126 60 134 52 142 46"
        fill="none"
        stroke={`url(#${id('g4')})`}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <Path
        d="M156 35 L148.2 57.6 L132.6 36.8 Z"
        fill={`url(#${id('g5')})`}
        stroke="#FF7A59"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <Ellipse cx={144} cy={40} rx={4} ry={1.6} transform="rotate(-37 144 40)" fill="#FFFFFF" opacity={0.8} />
    </>
  );
}
