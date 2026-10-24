import { useCallback, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { cores } from '@pdv/shared';

/** Anel de foco do design system (anil 2px) para teclado/D-pad e para a revisão no navegador. */
export function useFoco(deslocamento = 2): {
  focado: boolean;
  aoFocar: () => void;
  aoDesfocar: () => void;
  anel: ViewStyle | undefined;
} {
  const [focado, setFocado] = useState(false);
  const aoFocar = useCallback(() => setFocado(true), []);
  const aoDesfocar = useCallback(() => setFocado(false), []);
  return {
    focado,
    aoFocar,
    aoDesfocar,
    anel: focado ? { outlineWidth: 2, outlineColor: cores.anil, outlineStyle: 'solid', outlineOffset: deslocamento } : undefined,
  };
}
