import { StyleSheet, View } from 'react-native';
import { cores } from '@/tema';
import { BotaoIcone } from './BotaoIcone';
import { Texto } from './Texto';

export interface CabecalhoEtapaProps {
  etapa: number;
  total: number;
  onVoltar: () => void;
}

/** Voltar + barra de progresso (anil) + "2 de 6", como nas telas de cadastro do protótipo. */
export function CabecalhoEtapa({ etapa, total, onVoltar }: CabecalhoEtapaProps) {
  return (
    <View style={estilos.linha}>
      <BotaoIcone icone="voltar" rotulo="Voltar" onPress={onVoltar} />
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`Etapa ${etapa} de ${total}`}
        accessibilityValue={{ min: 1, max: total, now: etapa }}
        style={estilos.trilho}
      >
        <View style={[estilos.progresso, { width: `${(etapa / total) * 100}%` }]} />
      </View>
      <Texto estilo="label" numerico cor={cores.ink3} aria-hidden>
        {etapa} de {total}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16 },
  trilho: { flex: 1, height: 6, borderRadius: 999, backgroundColor: cores.surface2, overflow: 'hidden' },
  progresso: { height: '100%', borderRadius: 999, backgroundColor: cores.anil },
});
