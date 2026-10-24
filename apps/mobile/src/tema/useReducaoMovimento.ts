import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** true quando o usuário pediu menos animação no sistema. */
export function useReducaoMovimento(): boolean {
  const [reduzir, setReduzir] = useState(false);
  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (ativo) setReduzir(v);
    });
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzir);
    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, []);
  return reduzir;
}
