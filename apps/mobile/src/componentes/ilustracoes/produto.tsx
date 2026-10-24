import { ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Radial, sombra } from './comum';

/** Caixa de produto aberta. */
export function ConteudoProduto({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g2')} cx={0.3} cy={0.25} r={0.95} fx={0.18} fy={0.14} paradas={[[0, '#FFE08A'], [0.45, '#FFC933'], [1, '#FF7A59']]} />
        <Radial id={id('g3')} cx={0.3} cy={0.25} r={0.95} fx={0.18} fy={0.14} paradas={[[0, '#FF9E80'], [0.5, '#FF7A59'], [1, '#E8407A']]} />
        <Radial id={id('g4')} cx={0.6} cy={0.6} r={0.8} paradas={[[0, '#E8407A'], [1, '#7B5CFF']]} />
        <Radial id={id('g5')} cx={0.3} cy={0.3} r={0.9} fx={0.2} fy={0.2} paradas={[[0, '#CFF7F2'], [0.55, '#2EC4B6'], [1, '#3346F0']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-fraco')} paradas={brilho('#FFFFFF', 0.3)} />
        <Radial id={id('sombra')} paradas={sombra('#FF7A59')} />
        <ClipPath id={id('c1')}>
          <Path d="M44 88 L104 104 L104 166 L44 150 Z" />
        </ClipPath>
        <ClipPath id={id('c2')}>
          <Path d="M104 104 L158 86 L158 148 L104 166 Z" />
        </ClipPath>
      </Defs>
      <Ellipse cx={104} cy={170} rx={64} ry={8} fill={`url(#${id('sombra')})`} />
      <G strokeLinejoin="round" strokeWidth={6}>
        <Path d="M98 72 L158 86 L164 56 L106 44 Z" fill={`url(#${id('g3')})`} stroke={`url(#${id('g3')})`} />
        <Path d="M44 88 L98 72 L80 54 L28 68 Z" fill={`url(#${id('g2')})`} stroke={`url(#${id('g2')})`} />
        <Path d="M44 88 L98 72 L158 86 L104 104 Z" fill={`url(#${id('g4')})`} stroke={`url(#${id('g4')})`} />
        <Path d="M44 88 L104 104 L104 166 L44 150 Z" fill={`url(#${id('g2')})`} stroke={`url(#${id('g2')})`} />
        <Path d="M104 104 L158 86 L158 148 L104 166 Z" fill={`url(#${id('g3')})`} stroke={`url(#${id('g3')})`} />
        <G stroke="none">
          <G clipPath={`url(#${id('c1')})`}>
            <Ellipse cx={62} cy={104} rx={30} ry={20} fill={`url(#${id('brilho')})`} />
          </G>
          <G clipPath={`url(#${id('c2')})`}>
            <Ellipse cx={118} cy={108} rx={18} ry={16} fill={`url(#${id('brilho-fraco')})`} />
          </G>
          <Path d="M58 116 L92 125 L92 142 L58 133 Z" fill={`url(#${id('g5')})`} opacity={0.9} />
          <Ellipse cx={66} cy={122} rx={4} ry={2} fill="#FFFFFF" opacity={0.8} />
          <Ellipse cx={70} cy={95} rx={14} ry={2} transform="rotate(15 70 95)" fill="#FFFFFF" opacity={0.85} />
          <Ellipse cx={48} cy={72} rx={9} ry={2} transform="rotate(-16 48 72)" fill="#FFFFFF" opacity={0.7} />
        </G>
      </G>
    </>
  );
}
