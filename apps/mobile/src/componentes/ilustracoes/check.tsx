import { ClipPath, Defs, Ellipse, G, Path } from 'react-native-svg';
import { brilho, type ConteudoIlustraProps, Radial, sombra } from './comum';

/** Gota verde com sinal de confirmação. */
const GOTA = 'M104 30 C142 31 170 62 167 101 C164 141 134 169 95 167 C57 165 31 136 34 97 C37 59 66 29 104 30 Z';

/** Sinal de confirmação (check) sobre gota verde. */
export function ConteudoCheck({ p }: ConteudoIlustraProps) {
  const id = (nome: string) => `${p}-${nome}`;
  return (
    <>
      <Defs>
        <Radial id={id('g1')} cx={0.36} cy={0.3} r={0.8} fx={0.28} fy={0.22} paradas={[[0, '#E9FFB0'], [0.35, '#B6E83A'], [0.75, '#1FAF5F'], [1, '#138A4B']]} />
        <Radial id={id('brilho')} paradas={brilho()} />
        <Radial id={id('brilho-lima')} paradas={brilho('#DFFF9A', 0.35)} />
        <Radial id={id('sombra')} paradas={sombra('#1FAF5F')} />
        <ClipPath id={id('c1')}>
          <Path d={GOTA} />
        </ClipPath>
      </Defs>
      <Ellipse cx={100} cy={176} rx={52} ry={7} fill={`url(#${id('sombra')})`} />
      <Path d={GOTA} fill={`url(#${id('g1')})`} />
      <G clipPath={`url(#${id('c1')})`}>
        <Ellipse cx={74} cy={66} rx={42} ry={28} fill={`url(#${id('brilho')})`} />
        <Ellipse cx={138} cy={142} rx={28} ry={14} fill={`url(#${id('brilho-lima')})`} />
        <Path
          d="M66 105 C72 99 80 101 86 108 L97 121 C110 99 124 83 139 70 C145 65 153 72 148 79 C133 97 118 118 104 140 C100 146 93 146 89 141 L64 114 C60 109 61 107 66 105 Z"
          fill="#138A4B"
          opacity={0.3}
        />
      </G>
      <Path
        d="M64 102 C70 96 78 98 84 105 L95 118 C108 96 122 80 137 67 C143 62 151 69 146 76 C131 94 116 115 102 137 C98 143 91 143 87 138 L62 111 C58 106 59 104 64 102 Z"
        fill="#FFFFFF"
        opacity={0.96}
      />
      <Ellipse cx={70} cy={52} rx={12} ry={4} transform="rotate(-28 70 52)" fill="#FFFFFF" opacity={0.85} />
    </>
  );
}
