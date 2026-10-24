import { ClipPath, Defs, Ellipse, G, Rect } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Linear, Radial, sombra } from './comum';

/** Bloco de QR code com losango (Pix). */
export function ConteudoPix({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.32} cy={0.26} r={0.9} fx={0.2} fy={0.14} paradas={[[0, '#FFFFFF'], [0.45, '#E6E9FF'], [1, '#A9B4FF']]} />
        <Radial id={id('g2')} cx={0.32} cy={0.26} r={0.9} fx={0.2} fy={0.14} paradas={[[0, '#8C98FF'], [0.6, '#3346F0'], [1, '#7B5CFF']]} />
        <Linear id={id('g3')} x1={0} y1={0} x2={1} y2={1} paradas={[[0, '#3346F0'], [1, '#7B5CFF']]} />
        <Radial id={id('g4')} cx={0.3} cy={0.3} r={0.85} fx={0.2} fy={0.2} paradas={[[0, '#D2FBF6'], [0.5, '#2EC4B6'], [1, '#3346F0']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-teal')} paradas={brilho('#2EC4B6', 0.35)} />
        <Radial id={id('sombra')} paradas={sombra('#3346F0')} />
        <ClipPath id={id('c1')}>
          <Rect x={44} y={40} width={110} height={110} rx={24} />
        </ClipPath>
      </Defs>
      <Ellipse cx={104} cy={170} rx={60} ry={7} fill={`url(#${id('sombra')})`} />
      <Rect x={50} y={48} width={110} height={110} rx={24} fill={`url(#${id('g2')})`} />
      <Rect x={44} y={40} width={110} height={110} rx={24} fill={`url(#${id('g1')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Ellipse cx={74} cy={60} rx={42} ry={22} fill={`url(#${id('brilho')})`} />
      </G>
      <G fill={`url(#${id('g3')})`} opacity={0.82}>
        <Rect x={56} y={52} width={26} height={26} rx={8} />
        <Rect x={116} y={52} width={26} height={26} rx={8} />
        <Rect x={56} y={112} width={26} height={26} rx={8} />
      </G>
      <G fill="#E6E9FF">
        <Rect x={63} y={59} width={12} height={12} rx={4} />
        <Rect x={123} y={59} width={12} height={12} rx={4} />
        <Rect x={63} y={119} width={12} height={12} rx={4} />
      </G>
      <G fill={`url(#${id('g3')})`} opacity={0.55}>
        <Rect x={88} y={52} width={8} height={8} rx={2.5} />
        <Rect x={100} y={54} width={8} height={8} rx={2.5} />
        <Rect x={58} y={84} width={8} height={8} rx={2.5} />
        <Rect x={58} y={98} width={8} height={8} rx={2.5} />
        <Rect x={118} y={124} width={8} height={8} rx={2.5} />
        <Rect x={130} y={116} width={8} height={8} rx={2.5} />
        <Rect x={140} y={128} width={8} height={8} rx={2.5} />
        <Rect x={124} y={136} width={8} height={8} rx={2.5} />
      </G>
      <Ellipse cx={99} cy={98} rx={34} ry={30} fill={`url(#${id('brilho-teal')})`} />
      <Rect x={81} y={77} width={36} height={36} rx={9} transform="rotate(45 99 95)" fill={`url(#${id('g4')})`} />
      <Ellipse cx={93} cy={84} rx={7} ry={2.6} transform="rotate(-45 93 84)" fill="#FFFFFF" opacity={0.9} />
      <Ellipse cx={66} cy={45} rx={14} ry={2.4} fill="#FFFFFF" opacity={0.85} />
    </>
  );
}
