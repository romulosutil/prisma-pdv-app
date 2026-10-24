import { ClipPath, Defs, Ellipse, G, Path, Polygon } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Radial, sombra } from './comum';

/** Nuvem (forma inteira e recorte). */
const NUVEM =
  'M54 138 C36 138 24 125 26 110 C28 95 41 86 56 89 C59 67 77 53 98 55 C115 57 127 68 131 82 C137 76 147 74 156 78 C170 84 177 99 172 114 C176 128 165 139 150 139 Z';

/** Nuvem partida, sem conexão: metade azul-turquesa e metade violeta deslocada. */
export function ConteudoOffline({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.3} cy={0.25} r={0.9} fx={0.2} fy={0.14} paradas={[[0, '#FFFFFF'], [0.4, '#BDEFEA'], [0.75, '#6FD3CB'], [1, '#7B8CFF']]} />
        <Radial id={id('g2')} cx={0.3} cy={0.25} r={0.9} fx={0.2} fy={0.14} paradas={[[0, '#F3F0FF'], [0.45, '#C2B5FF'], [1, '#7B5CFF']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('sombra')} paradas={sombra('#3346F0')} />
        <ClipPath id={id('c1')}>
          <Path d={NUVEM} />
        </ClipPath>
        <ClipPath id={id('cl')}>
          <Polygon points="0,0 118,0 74,200 0,200" />
        </ClipPath>
        <ClipPath id={id('cr')}>
          <Polygon points="128,0 200,0 200,200 84,200" />
        </ClipPath>
      </Defs>
      <Ellipse cx={100} cy={166} rx={62} ry={7} fill={`url(#${id('sombra')})`} />
      <G>
        <G clipPath={`url(#${id('cl')})`}>
          <Path d={NUVEM} fill={`url(#${id('g1')})`} />
          <G clipPath={`url(#${id('c1')})`}>
            <Ellipse cx={72} cy={84} rx={36} ry={22} fill={`url(#${id('brilho')})`} />
          </G>
          <Ellipse cx={80} cy={66} rx={12} ry={3.5} transform="rotate(-20 80 66)" fill="#FFFFFF" opacity={0.9} />
        </G>
        <G transform="translate(5 7) rotate(5 140 110)">
          <G clipPath={`url(#${id('cr')})`}>
            <Path d={NUVEM} fill={`url(#${id('g2')})`} />
            <G clipPath={`url(#${id('c1')})`}>
              <Ellipse cx={142} cy={92} rx={24} ry={14} fill={`url(#${id('brilho')})`} />
            </G>
            <Ellipse cx={146} cy={83} rx={8} ry={2.6} transform="rotate(-10 146 83)" fill="#FFFFFF" opacity={0.85} />
          </G>
        </G>
      </G>
    </>
  );
}
